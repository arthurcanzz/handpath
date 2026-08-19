# trainer/

O produto de verdade do Handpath: curso estruturado por nível + simulador de
multi-table/multi-hand contra bots. **Protótipo rodando**: mesa 6-max NLHE
completa, com lobby de seleção de nível (Iniciante/Intermediário/Avançado)
que decide a mistura de bots, timer de 30s pro jogador, delay realista de
bot (2-6s) e animações — jogável em `ui/index.html`. Multi-table (várias
mesas simultâneas) e o curso em si ainda não existem.

Escopo inicial (não reverter sem confirmar com o Arthur): apenas NLHE cash
game 6-max. Torneio/ICM fica para depois. Ver `../CLAUDE.md` para as decisões
de produto completas (ex.: GUI de decisão só dentro do simulador, nunca como
overlay em mesa de dinheiro real — isso seria RTA, banido pelos operadores).

## Organização

- `engine/` — lógica pura de poker: baralho, avaliação de mãos, mesa NLHE
  de 2 a N jogadores com side pots (apostas, streets, all-in, showdown).
  Sem UI, sem bot — testado isoladamente (ver `engine/README.md`).
- `bots/` — um motor de decisão único e parametrizado (`paramBot.js`) com 8
  presets prontos (Nit, TAG, LAG, Maniac, Calling Station, Short-Stack
  Shover, Iniciante, Intermediário) — ver `bots/README.md`.
- `ui/` — lobby de nível + mesa 6-max jogável em HTML/CSS/JS puro
  (`ui/index.html`), consumindo `engine/` e `bots/` via `<script>` tags
  globais — mesma convenção da `landing/`. Ver `ui/README.md`.

## Como rodar o protótipo

Sem build. Servir a raiz do repo com qualquer servidor estático (os scripts
usam paths relativos `../engine/*.js` e `../bots/*.js`, então abrir
`ui/index.html` direto por `file://` também funciona) e navegar até
`trainer/ui/index.html`. Validar sintaxe com `node --check` nos arquivos de
`engine/`, `bots/` e `ui/` antes de entregar, como na `landing/`.

## Ainda não decidido

- **Persistência (contas de usuário, progresso, banco de dados)**: não faz
  sentido antes de validar que o motor + bots são divertidos/desafiadores.
  Entra quando precisarmos salvar progresso entre sessões ou multiplayer real
  — não criar pasta/infra de backend até essa decisão ser tomada com o
  Arthur.
- **Bot "GTO-like"** (tabelas pré-resolvidas): deliberadamente fora de
  escopo por enquanto — fase tardia, segundo o próprio Arthur. Só precisa
  expor `decide(state, seatIndex)` pra encaixar no motor sem retrabalho.
- **Multi-table de verdade** (jogar várias mesas simultâneas — o
  diferencial real do produto): ainda não começou, exige repensar a UI.
- Currículo do curso por nível (conteúdo, não a estrutura) ainda não foi
  desenhado.
- A mistura exata de arquétipos por nível pré-jogo (`LEVEL_ROSTERS` em
  `ui/script.js`) é um primeiro palpite, não uma curadoria final.
