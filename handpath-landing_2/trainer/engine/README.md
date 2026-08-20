# trainer/engine/

Lógica pura do jogo de poker, sem UI e sem dependência de bot específico.
Cada arquivo se registra em `window.HandpathEngine` (padrão IIFE + `var`/
`function`, igual `landing/script.js` — sem let/const/arrow/classes).

- **`deck.js`** — baralho de 52 cartas, `shuffle`, `draw`, helpers de label
  (`rankLabel`, `suitSymbol`, `suitColor`, `cardLabel`).
- **`handEval.js`** — `evaluateBest(cards)` recebe 5 a 7 cartas e retorna a
  melhor mão de 5 (`{ category, name, tiebreakers }`, category 0=High Card a
  8=Straight Flush); `compareEvals(a, b)` compara duas avaliações;
  `kickerBetween(winnerEval, loserEval)` diz se o que separou duas mãos da
  MESMA categoria foi o kicker (divergir no índice 0 dos `tiebreakers` é o
  rank principal — par de Ases vs par de Reis — e não conta);
  `potKicker(pot, evalsBySeat)` faz a mesma pergunta no nível de um pote de
  showdown, comparando o vencedor com o melhor perdedor elegível. Os dois
  últimos têm dois consumidores: a mensagem de resultado ao vivo na mesa e
  o relatório pós-mesa. Nomes de mão ficam em inglês (glossário do
  `CLAUDE.md`).
- **`table.js`** — `createHandState(config)` cria uma mão NLHE de 2 a N
  jogadores (`config.players`, `config.dealerIndex` precisa apontar pra um
  seat com stack > 0) já com blinds postados; `applyAction(state, seatIndex,
  action)` aplica fold/check/call/bet/raise/all-in e avança turno/street/
  showdown; `legalActions(state)` lista as ações válidas do jogador da vez
  (usado tanto pela UI quanto pelos bots); `buildSidePots(state)` reparte o
  pot entre pot principal + side pots quando há all-ins de tamanhos
  diferentes; `nextSeat`/`isActionable`/`isDealtIn` são os utilitários de
  navegação de mesa (pulam seat foldado/all-in/sem ficha conforme o
  predicado).

⚠️ **O campo `amount` do log tem semântica MISTA** — quem reconstruir o
pote a partir do log precisa saber disso: `call` grava o **incremento**
pago naquela ação (`amount: callAmount`), enquanto
`postBlind`/`bet`/`raise`/`allin` gravam o **total comprometido na street**
(`amount: player.committed`). Somar tudo dá pote errado. O replay da Fase 5
trata os dois casos separadamente numa única função (`applyLogEntry` em
`trainer/ui/report.js`), e há um teste que reconstrói milhares de mãos e
exige bater o pote gravado — é o que impede essa assimetria de virar bug
silencioso de novo.

**Heads-up é o caso especial real do poker**, não uma falha de generalização:
com 2 jogadores o button é o SB e age primeiro pré-flop; com 3+, SB/BB
postam e UTG age primeiro. Isso vive isolado em `assignBlindsAndFirstActor`.

**Side pots**: quando jogadores vão all-in por valores diferentes, o pot é
fatiado em camadas por `totalCommitted` — cada camada só é disputável por
quem não foldou e cobriu aquele nível (quem foldou ainda contribui pro
valor da camada como dinheiro morto, mas nunca ganha). Devolver aposta não
pareada sai de graça disso: é só a camada de cima com um único elegível.
`state.potResults = { evalsBySeat, pots: [{ amount, eligibleSeats, winners,
evalName }] }` fica populado só no caso de showdown; vitória por fold-out
(só sobra 1 jogador) usa `state.winnerIndex` direto, sem showdown nem
revelar cartas.

**Bug real corrigido**: `advanceTurnOrStreet` tinha um corte prematuro
(`countActionable(state) <= 1`) pensado só pra evitar `nextSeat` devolver
`null` quando o próprio raiser fica all-in sozinho (todo mundo mais já
folded/all-in — nesse caso `<= 1` e `=== 0` dão o mesmo resultado). O
problema: esse mesmo corte também disparava quando sobrava exatamente 1
jogador "isActionable" que **ainda não tinha pareado a aposta corrente**
— ex.: herói aposta, um bot folda, outro bot dá all-in; nesse ponto só o
herói continua "isActionable", e o corte pulava reto pro showdown/próxima
street sem dar a ele a chance de responder (call/fold/raise) ao all-in.
Reportado pelo Arthur depois de bater nisso numa mesa Avançada. Fix:
trocar a condição pra `=== 0` (só corta quando ninguém mais pode agir de
verdade) — o caso do jogador solo que ainda precisa responder cai
corretamente no branch de `nextSeat(...)` logo abaixo.

Testado isoladamente via simulação em Node (sem navegador, sem framework de
teste no projeto): avaliador de mão contra mãos conhecidas (royal flush,
wheel, quadra etc.); milhares de mãos heads-up e 6-max simuladas (stacks
parelhos e bem desiguais, forçando side pots de verdade) verificando
conservação de chips e ausência de loop infinito; um cenário de side pot
3-way construído à mão conferindo os valores e elegíveis de cada camada;
reprodução direta do cenário do bug acima (aposta → fold → all-in →
confirma que a vez volta pro apostador original) depois do fix. Rodar
`node --check arquivo.js` antes de qualquer entrega, como na `landing/`.
