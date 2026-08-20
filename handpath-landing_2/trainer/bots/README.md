# trainer/bots/

Arquétipos de oponente que jogam contra o usuário, consumindo o estado
exposto por `../engine/`.

**Um motor único, parametrizado** — não uma arquitetura por tier. A ideia
central: um bot de regras com limiares (força de mão estimada vs. limiares
de fold/raise, blefe ocasional, sizing de aposta) generaliza pra todos os
arquétipos que o Arthur pediu, de "iniciante previsível" a "population"
completo, trocando só os parâmetros — não o código de decisão.

- **`botHelpers.js`** — funções puras compartilhadas: `findAction`,
  `preflopStrength`/`estimateStrength` (pré-flop devolve o **percentil** da
  mão entre as 1326 iniciais possíveis, ver abaixo; categoria do
  `evaluateBest` pós-flop, 0..1), `positionBucket` (early/middle/late/
  **button**/sb/bb, deriva de `state.sbIndex`/`state.bbIndex`/
  `state.dealerIndex` — funciona em qualquer N, degradando pra sb/bb em
  heads-up), `countPreflopLimpers` e `hasRaiseAndCallerPreflop` (spots de
  isolamento e de squeeze), `effectiveStackInBB` (stack efetivo em BBs,
  usado pra saber quando entrar em modo push/fold), `clampNum`.
  - **Não existe mais um `sizedBet(action, fraction)` aqui** — era a causa
    raiz do bug de sizing descrito abaixo, e foi removido de propósito pra
    ninguém reintroduzi-lo.
- **`paramBot.js`** — `HandpathBots.paramBot.decide(state, seatIndex,
  params)`, o motor único, mais `HandpathBots.presets` com 8 arquétipos
  prontos: `nit`, `tag`, `lag`, `maniac`, `callingStation`,
  `shortStackShover`, `beginner`, `intermediate`. Cada preset é só um
  objeto com `openingRangeByPosition`, `foldThreshold`, `raiseThreshold`,
  `bluffFrequency`, `aggressionMultiplier`, `aggressionVariance`,
  `callDownTendency`, `shoveStackThreshold`, `positionAdjust`,
  `openRaiseFrequency`, `isolateFrequency`, `speculative3betFrequency`,
  `squeezeFrequency`, `rareShoveFrequency` — valores ilustrativos (não são
  ranges reais de solver), ajustáveis sem tocar lógica.
  - **Iniciante** = mesmo motor com `bluffFrequency=0` e
    `aggressionVariance=0` (zero aleatoriedade → decisões previsíveis,
    ranges fixas por posição). **Intermediário** = mesmos campos com
    variância/blefe moderados. Não são bots à parte.
  - **Único branch de código genuinamente diferente**: push/fold de stack
    curto (`shoveStackThreshold`) — quando o stack efetivo cai a esse
    limiar, a decisão vira binária (all-in ou fold), pulando o sizing
    contínuo. É isso que faz "Short-Stack Shover" ser só um preset com
    esse limiar mais alto, não um bot separado.
- **`callingStation.js`** — mantém a API pública
  (`HandpathBots.callingStation.decide`) que a UI já usa, mas agora é um
  wrapper fino chamando `paramBot.decide(state, seatIndex,
  presets.callingStation)`.

## Agressividade e sizing (handpath-fase2-agressividade.md)

Três bugs estruturais foram corrigidos juntos — todos alimentavam a mesma
sensação de "mesa parada", e nenhum era escolha de personalidade:

1. **Todo raise virava all-in.** O sizing antigo interpolava entre
   `betAction.min` e `betAction.max` — e `max` é o stack inteiro do bot.
   Com a fração padrão (~0.5) todo raise saía na metade do caminho até o
   all-in; Maniac ia a 0.8. Agora o alvo é **absoluto** (2–3.5BB de
   abertura, 2.5–3.5x pra 3-bet, 4–5.5x pra squeeze, 50–75% do pote
   pós-flop) e só depois é encaixado no `[min, max]` legal. All-in deixou
   de ser alcançável por acidente: só sai em push/fold real ou pela
   `rareShoveFrequency` (0 em quase todos, 0.05 no Maniac).
2. **`openingRangeByPosition` não significava nada.** O limiar era
   `1 - openSlice` comparado ao score cru de `preflopStrength`, que não é
   uniforme (AA = 1.00, mas AKs = 0.66) — um TAG com `early: 0.16` abria
   ~0.2% das mãos, não 16%. `preflopStrength` agora devolve o **percentil**
   real da mão (tabela das 1326 mãos iniciais, montada uma vez no load),
   então `openSlice` significa de fato "as X% melhores mãos".
3. **Todo mundo limpava.** Um gate de força extra + um `raiseChance` fixo
   de ~0.35 faziam os bots limparem ~65% das mãos que decidiam jogar.
   Estar dentro do range de abertura agora significa **abrir com raise**
   (`openRaiseFrequency`); limpar virou o que sempre deveria ter sido,
   leak de arquétipo passivo (Calling Station 0.25, Iniciante 0.55).

Também entraram: **posição própria pro button** (não fica mais junto do CO
em `late`), **raise de isolamento** sobre limpadores (com +1BB de sizing
por limpador), **3-bet especulativo** sem mão feita nos arquétipos soltos,
**squeeze** sobre raise+call, e **variação de tamanho** de aposta (item 5 —
tamanho fixo é padrão detectável, mesmo motivo que levou a esconder o
arquétipo na mesa).

**Arredondamento do valor** (`raiseToTotal`): o alvo sai de uma conta
contínua (2.82 BB, 64% do pote) e cairia em número quebrado tipo 282 ou
2837 — o Arthur reclamou disso na mesa. O valor final é encaixado num
múltiplo do **small blind**, a menor ficha em jogo, que é como toda aposta
de mesa real se parece. Mexe só no tamanho, no máximo meio small blind pra
cada lado — nenhuma frequência de decisão passa por ali, então a
agressividade calibrada acima fica intacta (validado: all-in em raise
pré-flop 4.0% antes e depois; TAG por posição 14.4/24.8/38.3/51.2 →
14.6/24.4/37.7/51.4, dentro do ruído). Sobram ~5% de valores fora do
múltiplo, e são **todos** borda legal exata: um all-in vale o stack exato
(que é quebrado por natureza) e um min-raise vale o mínimo exato —
arredondar por cima disso geraria ação inválida ou deixaria resto de fichas
pra trás.

Nota de calibragem: pré-flop a decisão usa a força **crua**, porque a
posição já está em `openingRangeByPosition` — aplicar `positionAdjust` por
cima contava posição duas vezes (TAG abria 0.9% em UTG e 69% no button,
nada a ver com o preset). `positionAdjust` continua valendo **pós-flop**,
onde não existe tabela por posição.

**Fora de escopo por enquanto** (o próprio Arthur marcou como fase
tardia): um bot "GTO-like" via tabelas pré-resolvidas. Quando chegar a vez,
só precisa expor `decide(state, seatIndex)` — encaixa no loop da UI sem
mudar nada ao redor.

## Validação

Simulação em Node (sem navegador, sem framework de teste no projeto):
40 mil mãos 6-max com os 8 presets sorteados por seat, sem violação de
conservação de chips e sem loop infinito. Métricas dos critérios de aceite
de `handpath-fase2-agressividade.md`:

- All-in em raise pré-flop: **4%** (era praticamente todo raise), e num
  teste com todos os stacks em 200BB — onde push/fold nunca dispara — a
  taxa por preset bate exatamente a `rareShoveFrequency` declarada
  (TAG/Nit/Station/Iniciante/Intermediário 0.0%, Maniac 4.9%).
- Abertura: 2.00–3.50BB (em passos de meio BB, por causa do arredondamento
  pro small blind — 2.00 / 2.50 / 3.00 / 3.50, que é como jogador de
  verdade dimensiona). C-bet: 51–75% do pote, mediana 0.64.
- Valores de aposta em todas as 4 stakes reais (Micro a Alta): ~95%
  múltiplos exatos do small blind, e os ~5% restantes 100% explicados por
  borda legal (all-in/min-raise), zero quebrado inexplicado.
- Abertura limpa por posição, com a mesa inteira usando o mesmo preset
  (única forma de isolar o efeito de posição): TAG 14.4% early → 24.8%
  middle → 38.3% late → 51.2% button; Nit 5.2% → 23.1%; Maniac 54.4% →
  89.1%. Gradiente monotônico em todos os presets, e bate com o que o
  preset declara (TAG early = 0.16 × 0.92 de `openRaiseFrequency` ≈ 14.7%).

⚠️ Se for medir posição de novo: **não** atribua os presets aos seats por
uma fórmula ligada ao índice da mão (ex.: `PRESETS[(hand + seat) % 8]` com
`dealerIndex = hand % 6`). Isso correlaciona preset com posição e produz um
gradiente falso — aconteceu de verdade durante esta validação e mostrou o
CO abrindo mais que o button.
