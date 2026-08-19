# trainer/bots/

Arquétipos de oponente que jogam contra o usuário, consumindo o estado
exposto por `../engine/`.

**Um motor único, parametrizado** — não uma arquitetura por tier. A ideia
central: um bot de regras com limiares (força de mão estimada vs. limiares
de fold/raise, blefe ocasional, sizing de aposta) generaliza pra todos os
arquétipos que o Arthur pediu, de "iniciante previsível" a "population"
completo, trocando só os parâmetros — não o código de decisão.

- **`botHelpers.js`** — funções puras compartilhadas: `findAction`,
  `preflopStrength`/`estimateStrength` (heurística pré-flop; categoria do
  `evaluateBest` pós-flop, 0..1), `sizedBet`, `positionBucket` (early/
  middle/late/sb/bb, deriva de `state.sbIndex`/`state.bbIndex`/
  `state.dealerIndex` — funciona em qualquer N, degradando pra sb/bb em
  heads-up), `effectiveStackInBB` (stack efetivo em BBs, usado pra saber
  quando entrar em modo push/fold), `clampNum`.
- **`paramBot.js`** — `HandpathBots.paramBot.decide(state, seatIndex,
  params)`, o motor único, mais `HandpathBots.presets` com 8 arquétipos
  prontos: `nit`, `tag`, `lag`, `maniac`, `callingStation`,
  `shortStackShover`, `beginner`, `intermediate`. Cada preset é só um
  objeto com `openingRangeByPosition`, `foldThreshold`, `raiseThreshold`,
  `bluffFrequency`, `aggressionMultiplier`, `aggressionVariance`,
  `callDownTendency`, `shoveStackThreshold`, `positionAdjust` — valores
  ilustrativos (não são ranges reais de solver), ajustáveis sem tocar
  lógica.
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

**Fora de escopo por enquanto** (o próprio Arthur marcou como fase
tardia): um bot "GTO-like" via tabelas pré-resolvidas. Quando chegar a vez,
só precisa expor `decide(state, seatIndex)` — encaixa no loop da UI sem
mudar nada ao redor.

Testado com simulação em Node: 4000 mãos 6-max com os 8 presets se
revezando nos seats, sem violação de conservação de chips; checagem de
sanidade de personalidade (Nit folda mais e é bem menos agressivo que
Maniac).
