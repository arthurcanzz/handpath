# trainer/ui/

Lobby de nível + mesa 6-max jogável contra bots — protótipo funcional.
HTML/CSS/JS puro, arquivos separados, mesma stack da `../../landing/`. CSS
próprio (`styles.css`, tokens de marca iguais aos de `landing/styles.css`
mas sem importar o arquivo), não compartilha estilo com a landing page.

- `index.html` — duas telas no mesmo documento (`#lobbyScreen` /
  `#tableScreen`, alternadas via `hidden`, sem router). Carrega
  `vendor/gsap.min.js` → `../engine/*.js` → `../bots/*.js` → `script.js`
  nessa ordem (globals via `<script>` tag, sem módulos ES/bundler).
- `script.js` — lobby (`startSession(level)` monta o roster de bots a
  partir de `LEVEL_ROSTERS`), constrói os 6 seats dinamicamente
  (`buildSeatElements`, hero sempre no seat 0/slot inferior), liga o motor
  + bots à mesa (renderiza cartas/pot/street/log, habilita as ações legais
  do jogador da vez via `HandpathEngine.legalActions`), timer de 30s pro
  herói (`startTurnTimer`, auto-check/fold no timeout), delay aleatório de
  2-6s pro bot (`maybeAdvanceTurn`), log conciso (pílulas coloridas por
  tipo de ação a partir das entradas estruturadas de `state.log`, não mais
  frases prontas — ver `../engine/README.md`), e animações GSAP opcionais
  (`animateNewHandStart`, `animateBoardDeal` — cartas do board "saem" do
  `#deckStack` e viram com `rotateY`, flop/turn/river em sequência —,
  `flyChipToPot`), atrás de `hasGsap()` + `prefers-reduced-motion` como na
  `landing/`. Stacks persistem entre mãos (BB equivalente mostrado junto
  do saldo em cada seat); dealer rotaciona só entre seats vivos; detecta
  bust do herói ou "só sobrou eu na mesa" e oferece "Novo Jogo". No início
  da sessão (`startSession`), cada bot recebe um stack aleatório dentro do
  min/max buy-in da stake (`randomBotStack`, arredondado pra dezena mais
  próxima — nunca todos com o mesmo valor do buy-in do herói, nem números
  "quebrados" tipo 17277) e o dealer inicial é calculado pra o herói
  sempre sentar como Big Blind na primeira mão (`dealerIndex = (HERO_SEAT
  - 2 + SEAT_COUNT) % SEAT_COUNT`) — pedido explícito do Arthur; mãos
  seguintes rotacionam normalmente. Indicador
  da mão atual do herói (`HandpathEngine.evaluateBest`, nome da categoria
  em inglês) aparece a partir do flop só nas mesas Iniciante/Intermediário
  — Avançado não vê, gateado por `currentLevel`. No showdown,
  `buildResultMessage`/`findKickerNote` apontam quando o kicker (não a
  categoria principal) decidiu o pote, comparando `tiebreakers` do
  vencedor com o melhor perdedor elegível daquele pote via
  `HandpathEngine.compareEvals`. Rodadas avançam sozinhas: quando a mão
  termina (`state.isOver`) e não é fim de jogo, `startNextHandCountdown`
  mostra uma barra regressiva de 5s (mesmo padrão do timer de turno —
  `setInterval` de 1s, sem depender de `canAnimate()` porque é mecânica de
  jogo, não decoração) antes de chamar `rotateDealer` + `startNewHand`
  automaticamente; botão "Pular" (`btnSkipNextHand`) adianta na hora. As
  cartas de quem chegou ao showdown continuam reveladas durante essa
  janela (o `state` só é substituído quando a próxima mão de fato começa).
- `report.js` — **relatório pós-mesa + replay (Fase 5)**. Consome o
  histórico que `script.js` grava em memória durante a sessão
  (`recordFinishedHand`, um registro por mão com cartas de todos, log de
  ações e resultado). Relatório e replay compartilham a mesma base de
  dados de propósito — não são duas features separadas (decisão travada,
  ver `../supabase/README.md`). Tudo é regra e estatística, **sem chamada
  de IA** (decisão travada: evita custo variável por sessão).
  - Estatísticas: resultado da sessão e BB/100, maiores potes ganhos/
    perdidos, VPIP/PFR, contagem de fold/check/call/bet/raise/all-in,
    mãos decididas por kicker (via `HandpathEngine.potKicker`), e as
    **mãos de azar**.
  - "Azar, não erro": pra cada derrota grande em showdown, acha a última
    vez que o herói pagou uma aposta e compara as **pot odds exigidas**
    (`pago / (pote + pago)`) com a **equity real** naquele ponto. A equity
    é enumerada de verdade — turn tem 44 runouts e flop tem C(45,2) = 990,
    ambos exatos; só o pré-flop (C(48,5) ≈ 1,7 milhão) usa amostragem.
    Num simulador as cartas dos oponentes são **conhecidas**, então isso é
    mais exato que a análise que um jogador real consegue fazer: não é
    estimativa de range, é a equity daquele spot.
  - A análise de equity é cara, então roda só nas 12 maiores derrotas em
    showdown — e o relatório **diz quantas analisou e quantas ficaram de
    fora**, porque um corte silencioso pareceria "não houve mão de azar"
    quando na verdade nem foram olhadas.
  - Replay: renderizador próprio e compacto, **não** reaproveita
    `#tableScreen` (dirigir o render ao vivo com um estado reconstruído
    brigaria com o `state` da mesa). Reusa as classes `.hp-card`/`.hp-cards`
    e caminha passo a passo pelas entradas de `log`. Cuidado com a
    semântica mista de `amount` — ver `../engine/README.md`.
- `vendor/gsap.min.js` — cópia local do GSAP core (mesmo arquivo de
  `landing/vendor/`, sem ScrollTrigger — não precisa de scroll aqui) por
  convenção do projeto (vendor local, nunca CDN).

**Garantia estrutural**: não existe (nem vai existir) uma ação de "pular
mão" em `legalActions` — a barra de próxima mão (e o botão "Pular" que a
adianta) só aparece quando `state.isOver`, que só acontece via
fold-até-sobrar-1 ou showdown. Não é uma checagem extra na UI, é uma
propriedade do motor.

Validado com: simulação Node do motor + bots (milhares de mãos 6-max, 8
presets se revezando, side pots reais, conservação de chips) e um smoke
test via jsdom cobrindo lobby → escolha de nível → mesa com 6 seats →
ordem de turno correta (UTG age primeiro, não o dealer) → delay real de bot
→ timer de 30s aparecendo na vez do herói, sem erros de JS. **O visual em
si (posicionamento dos seats na mesa oval, timer ring, animações) não foi
confirmado por screenshot automatizado** — sem chromium-cli/Playwright
disponível neste ambiente — só aberto num navegador real pra conferência
manual. Os itens visuais da Fase 3 (cartas do board horizontais, mesa/
cartas maiores, animação de baralho, indicador de mão, kicker no showdown,
BB no seat) e da Fase 4 (avanço automático de mão com barra regressiva +
botão "Pular") foram checados só por `node --check` + confirmação de que
os arquivos servem sem 404 a partir da raiz do repo — **ainda pendente de
conferência visual manual num navegador real**.

A Fase 5 (relatório + replay) tem validação de verdade da matemática, em
Node — `report.js` é carregável sem DOM de propósito (o wiring de botões é
guardado por uma checagem de `document`), e expõe `HandpathReport._internals`
pro teste. O que foi verificado:

- **Invariante forte do replay**: 6.000 mãos jogadas headless, cada uma
  reconstruída passo a passo a partir do `log` — o pote reconstruído tem
  que bater exatamente o pote gravado, e nunca pode diminuir ao avançar.
  Zero divergência. É esse teste que trava a semântica mista de `amount`.
- `heroNet` reconcilia com a variação de stack do herói em todas as mãos.
- Kicker: cenário construído à mão (A-K vs A-Q num board com Ás) detecta
  kicker K vs Q; par de Ases vs par de Reis corretamente **não** conta.
- Equity: `equityAt` conferido contra uma enumeração independente das 990
  runouts do mesmo flop — bateu com precisão de ponto flutuante.
- "Azar, não erro": cenário construído em que o herói paga 1.000 num pote
  de 5.000 (precisa de 16,7%) com 37,8% de equity e perde → classificado
  como variância, não erro.

O **visual** do relatório e do replay continua pendente de conferência
manual, como o resto da UI.

Próximo passo natural: multi-table de verdade (várias mesas simultâneas —
o diferencial real do produto), o que provavelmente exige repensar esta UI
e não só estendê-la.
