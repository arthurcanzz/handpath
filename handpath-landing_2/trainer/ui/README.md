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
  (`animateNewHandStart`, reveal do board, `flyChipToPot`), atrás de
  `hasGsap()` + `prefers-reduced-motion` como na `landing/`. Stacks
  persistem entre mãos; dealer rotaciona só entre seats vivos; detecta bust
  do herói ou "só sobrou eu na mesa" e oferece "Novo Jogo".
- `vendor/gsap.min.js` — cópia local do GSAP core (mesmo arquivo de
  `landing/vendor/`, sem ScrollTrigger — não precisa de scroll aqui) por
  convenção do projeto (vendor local, nunca CDN).

**Garantia estrutural**: não existe (nem vai existir) uma ação de "pular
mão" em `legalActions` — o botão "Nova Mão" só aparece quando
`state.isOver`, que só acontece via fold-até-sobrar-1 ou showdown. Não é
uma checagem extra na UI, é uma propriedade do motor.

Validado com: simulação Node do motor + bots (milhares de mãos 6-max, 8
presets se revezando, side pots reais, conservação de chips) e um smoke
test via jsdom cobrindo lobby → escolha de nível → mesa com 6 seats →
ordem de turno correta (UTG age primeiro, não o dealer) → delay real de bot
→ timer de 30s aparecendo na vez do herói, sem erros de JS. **O visual em
si (posicionamento dos seats na mesa oval, timer ring, animações) não foi
confirmado por screenshot automatizado** — sem chromium-cli/Playwright
disponível neste ambiente — só aberto num navegador real pra conferência
manual.

Próximo passo natural: multi-table de verdade (várias mesas simultâneas —
o diferencial real do produto), o que provavelmente exige repensar esta UI
e não só estendê-la.
