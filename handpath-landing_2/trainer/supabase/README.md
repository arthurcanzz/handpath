# trainer/supabase/

Camada de conta/bankroll persistente da Fase 1 (ver
`../../handpath-game-upgrade-prompt.md`). Projeto Supabase (Postgres + Auth),
região Americas.

- **`config.js`** — Project URL + anon/publishable key, expostos como
  `window.HANDPATH_SUPABASE_URL` / `window.HANDPATH_SUPABASE_ANON_KEY`. A anon
  key é segura pra ir pro client — quem controla acesso de verdade são as RLS
  policies do banco, não essa chave.
- **`client.js`** — cria a instância única do client (`window.HandpathDB =
  supabase.createClient(...)`). Depende de `../ui/vendor/supabase.min.js`
  (build UMD de `@supabase/supabase-js`, vendorizado do mesmo jeito que o
  GSAP — `npm pack` + copiar `dist/umd/supabase.js`, nunca via CDN) e de
  `config.js` carregados antes.
- **`migrations/0001_init.sql`** — schema completo: `plans` e `stakes`
  (catálogos), `profiles` (bankroll do usuário, 1:1 com `auth.users`) e
  `sessions` (uma linha por sentada numa mesa, buy-in → cash-out). Sem build
  system/CLI no projeto ainda, então migrations são coladas manualmente no
  SQL Editor do painel Supabase — o arquivo aqui é a fonte da verdade
  versionada, não um script que roda sozinho.
- **`migrations/0002_reclaim_abandoned_session.sql`** —
  `reclaim_abandoned_session()`, chamada automaticamente no login
  (`session.js`). Fecha qualquer sessão `active` órfã (aba fechada sem
  clicar "Sair da mesa") e devolve o valor do buy-in original pro bankroll,
  destravando o usuário pra comprar fichas de novo — sem isso o índice
  único `one_active_session_per_user` deixa a conta permanentemente presa.
  Descoberto em teste manual, não estava no design original.
- **`migrations/0003_stakes_revisao.sql`** — atualiza blinds/buy-in de
  Micro/Baixa/Média e adiciona a stake Alta, ver
  `handpath-ajustes-fase1-fase2.md`.

## Modelo de segurança

Bankroll **nunca** é gravável direto pelo client — não há policy de
INSERT/UPDATE em `profiles` nem `sessions` pra `authenticated`. As três únicas
formas de mudar saldo são funções `SECURITY DEFINER`, chamadas via RPC:

- `claim_refill()` — credita o refill periódico do plano do usuário, se já
  passou o intervalo desde o último.
- `buy_in(stake_id, amount)` — valida faixa de buy-in da stake e saldo
  suficiente, debita do bankroll, abre uma `session` ativa. Um usuário só
  pode ter uma sessão ativa por vez (índice único parcial).
- `cash_out(session_id, final_chips)` — encerra a sessão e credita
  `final_chips` de volta no bankroll.
- `reclaim_abandoned_session()` — chamada no login; fecha sessão `active`
  órfã (aba fechada sem cash-out) e devolve o buy-in original. Ver
  `0002_reclaim_abandoned_session.sql`.

**Gap de segurança conhecido e aceito por decisão consciente:** o resultado
da mão (quem ganha o pote) continua calculado 100% no client
(`../engine/`) — `cash_out` confia no valor final que o client reporta,
só limitado por um teto de sanidade (`buyin * 1000`) contra bug óbvio, não
anti-cheat de verdade. Um usuário técnico consegue inflar o cash-out via
DevTools nesta fase. Aceito para a fase de validação (sem dinheiro real
envolvido, produto 100% educacional). Fechar isso de verdade exigiria portar
avaliação de mão/pote pro servidor (Edge Function) — fora de escopo da
Fase 1, decisão revisada explicitamente com o Arthur antes de implementar
este schema.

## Valores de partida (ajustáveis, não travados no schema)

- Refill por plano: Free 5.000/6h, Starter 10.000/4h, Pro 20.000/3h, Elite
  40.000/2h — linha `plans`, não hardcoded em função. Resgate agora é
  **manual** (botão no widget de saldo), não mais automático no login —
  ver `handpath-ajustes-fase1-fase2.md`.
- Bankroll inicial no signup = refill do plano Free (5.000), creditado pelo
  trigger `on_auth_user_created`.
- Stakes (pós-`0003_stakes_revisao.sql`), cada uma com um nível de bot fixo
  (`STAKE_LEVEL_MAP` em `../ui/session.js`):
  - Micro: 50/100, buy-in 1.000–4.000 → bots Iniciante
  - Baixa: 100/200, buy-in 2.500–10.000 → bots Intermediário
  - Média: 250/500, buy-in 5.000–20.000 → bots Intermediário
  - Alta: 500/1.000, buy-in 10.000–50.000 → bots Avançado
  - Baixa e Média com o mesmo pool de bot é intencional — a diferença
    entre elas é o comprometimento financeiro/variância, não a
    dificuldade do bot (confirmado com o Arthur).

## Ainda não decidido / não feito

- Ping anti-pause do projeto free (pausa após 7 dias sem requisição) —
  recomendado UptimeRobot batendo em `/auth/v1/health` a cada 5min (não
  exige GitHub, que este repo ainda não tem como remote). GitHub Actions
  fica como alternativa quando o repo for publicado, pro deploy no Netlify.
- Login com e-mail+senha e "Entrar com Google" testados manualmente e
  funcionando (Google OAuth já configurado no Google Cloud Console + painel
  Supabase), fluxo completo buy-in → jogar → "Sair da mesa" → persistência
  de saldo também validado manualmente.
- **Decisão travada, não construir ainda:** histórico completo de mãos
  (cartas de todos, ações, resultado de cada mão) + replay pós-mesa. Vai
  reusar a mesma base de dados que a Fase 5 (relatório pós-mesa) precisa —
  não é uma tabela/feature separada. Só entra junto da Fase 4/5, depois que
  as rodadas automáticas (sem botão "Nova Mão") estiverem prontas — decisão
  explícita do Arthur em `handpath-ajustes-fase1-fase2.md`, pra não abrir
  essa frente de schema fora de ordem.
