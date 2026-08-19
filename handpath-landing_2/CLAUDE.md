# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estrutura de pastas

```
handpath-landing_2/
├── landing/        → landing page de waitlist (produto atual, ver abaixo)
└── trainer/        → curso + simulador de poker (produto real)
    ├── engine/     → lógica pura de poker: deck.js, handEval.js, table.js (mesa N-max c/ side pots)
    ├── bots/       → botHelpers.js + paramBot.js (motor único, 8 presets) + callingStation.js (wrapper)
    ├── supabase/   → conta/bankroll persistente (Postgres + Auth via Supabase) — config.js, client.js, migrations/
    └── ui/         → auth + escolher mesa/nível + mesa 6-max (index.html/styles.css/script.js/session.js/vendor/)
```

Cada pasta tem seu próprio `README.md` explicando o que já mora ali. Estado
atual de `trainer/`: mesa 6-max NLHE jogável contra 5 bots (8 arquétipos
disponíveis via um motor parametrizado único, com variância de decisão e
continuation bet — ver Fase 2 no roadmap abaixo), conta de usuário e
bankroll persistente de verdade (Supabase — login, buy-in e cash-out reais,
não mais stack só na sessão do navegador). Sem multi-table (várias mesas
simultâneas) ainda — ver `trainer/README.md` e `trainer/supabase/README.md`.

## Comandos

Não há build system, bundler, package.json ou testes automatizados — é HTML/CSS/JS
puro servido estaticamente. Fluxo de trabalho:

- **Validar sintaxe JS antes de entregar** (obrigatório): `node --check landing/script.js`
  e `node --check landing/i18n.js`.
- **Rodar localmente**: abrir `landing/index.html` direto no navegador, ou servir a
  pasta com um servidor estático simples (ex.: `npx serve landing` ou a extensão
  Live Server do VS Code) — necessário para GSAP/ScrollTrigger e paths relativos
  funcionarem como em produção.
- **Empacotar entrega**: sempre como `.zip` preservando a pasta `vendor/` inteira
  (arquivos soltos já causaram dois bugs de caminho quebrado no passado).

## Arquitetura da landing page

Site estático de página única (`landing/index.html`), sem framework, sem módulos
ES — tudo carregado via `<script>` tags globais na ordem: `vendor/gsap.min.js` →
`vendor/ScrollTrigger.min.js` → `i18n.js` → `script.js` (todos relativos a
`landing/`).

- **`script.js`** é uma única IIFE (`(function(){ "use strict"; ... })()`) que
  contém todas as features do site como funções independentes, todas chamadas
  na seção "BOOT" no final do arquivo (linha ~570): `initForms()`, `initFaq()`,
  `initNavCta()`, `initHeroFloaters()`, `initScrollProgress()`,
  `buildLangSwitcher()`, `initQuiz()`, `initPlans()`, seguido de detecção/
  aplicação de idioma, e então motion (GSAP) só se `hasGsap()` for true e o
  usuário não tiver `prefers-reduced-motion`.
  - Módulos principais dentro do arquivo: engine de i18n (`t()`,
    `detectDefaultLang()`, `applyLanguage()`, `buildLangSwitcher()`), formulário
    de waitlist (`submitEmail()` — atualmente um **stub que não envia e-mail
    para lugar nenhum**, `initForms()`), quiz de nível (`cacheQuizDom()`,
    `renderQuizQuestion()`, `selectQuizAnswer()`, `finishQuiz()`,
    `levelKeyFromScore()`, `planFromScore()`), seção de planos
    (`setPlanPrices()`, `initPlans()`, `selectPlanById()`), e motion/GSAP
    (`initMagnetic()`, `initTilt()`, `initScrollProgress()`, `initPathDraw()`,
    `runHeroEntrance()`, `runScrollReveals()`).
- **`i18n.js`** define `HANDPATH_SUPPORTED_LANGS` (`['pt','en','es']`) e o
  dicionário global `HANDPATH_I18N`, com um objeto de chave→string por idioma.
  `script.js` lê `window.HANDPATH_I18N[currentLang]` via `t(key)`, com fallback
  para `en` se a chave não existir no idioma atual.
- **`index.html`** marca todo texto estático com `data-i18n="chave"` (ou
  `data-i18n-placeholder="chave"` em inputs) — `applyLanguage()` varre esses
  atributos e substitui o conteúdo pela tradução correspondente.
- **Glossário de poker fica em INGLÊS nas três línguas** (não traduzir
  literalmente): flop, turn, river, preflop, postflop, check, call, raise,
  fold, all-in, shove, limp, bluff, c-bet, 3-bet, value bet, button, blinds,
  stack, pot odds, equity, range, cash game, multi-table, GTO, e nomes de mãos
  (Flush, Full House, Straight, Royal Flush etc). Nomes de planos
  (Free/Starter/Pro/Elite) e o nome do produto (Handpath) também não se
  traduzem entre idiomas.

### Convenções de stack (importante seguir)

- **Sempre arquivos separados** — HTML, CSS e JS nunca ficam no mesmo arquivo.
  Preferência explícita do Arthur.
- **Sem frameworks** (nada de React/Vue) — HTML + CSS + JS puro.
- **GSAP + ScrollTrigger** para toda animação/motion, carregados como arquivos
  locais em `vendor/gsap.min.js` e `vendor/ScrollTrigger.min.js` (baixados via
  `npm install gsap` e copiados de `node_modules/gsap/dist/`) — **nunca via
  CDN**. Decisão deliberada depois de um problema real de caminho quebrado.
- Bandeiras de idioma são SVG inline em `script.js` (`FLAGS`), não emoji —
  emoji de bandeira não renderiza como imagem no Windows.

## Contexto de produto

Handpath é uma plataforma de treino de poker (curso estruturado por nível +
simulador de multi-table/multi-hand contra bots) que o Arthur está construindo
para escalar principalmente para os EUA, com Brasil e alguns países
latino-americanos como mercados secundários. É 100% educacional — sem dinheiro
real, sem apostas.

O ponto de entrada atual é a landing page de waitlist (`landing/`), com um
quiz de diagnóstico de nível que recomenda um plano de assinatura. O motor
técnico real do produto (curso + bots + simulador multi-table) mora em
`trainer/` — mesa 6-max jogável contra bots de 8 arquétipos diferentes (cada
stake define o nível/mistura de bots), com conta de usuário e bankroll
persistente de verdade (Supabase), ainda sem curso e sem multi-table de
verdade (várias mesas ao mesmo tempo) — ver `trainer/README.md` e
`trainer/supabase/README.md`.

Existe também um projeto anterior, separado, chamado "Full House"
(`fullhouse.html` / `fullhouse-site/`, fora deste repo) — era o piloto/
portfólio visual que deu origem à identidade do Handpath, mas NÃO é o produto
principal. Não confundir os dois nem misturar os arquivos.

### Decisões de produto (não reverter sem confirmar com o Arthur)

- **GUI de decisão só dentro do próprio simulador, nunca como overlay em mesa
  de dinheiro real.** Isso é RTA (Real-Time Assistance), banido por
  PokerStars, GGPoker e todo operador sério — decisão deliberada, não é
  esquecimento.
- **Escopo inicial do produto: apenas NLHE cash game 6-max.** Torneio/ICM fica
  para depois.
- **Visão de longuíssimo prazo (não é prioridade agora):** possível expansão
  futura para uma plataforma própria de apostas (fichas fictícias e dinheiro
  real) seguindo regras de cassino online legal — não implementar nada nessa
  linha sem o Arthur pedir explicitamente.

### Onde estamos no roadmap

Fase 0 (landing + waitlist) está funcionalmente pronta: motion (scroll
progress bar, magnetic buttons, tilt nos cards, SVG que desenha a trilha),
quiz de 8 perguntas que calcula nível e recomenda plano, seção de planos com
toggle mensal/anual, seletor de idioma com bandeiras SVG (PT/EN/ES).

**Pendências da landing (Fase 0):**
1. O formulário de waitlist **ainda não envia e-mail para lugar nenhum** — é
   um stub (`submitEmail()` em `landing/script.js`). Bloqueante antes de
   divulgar a página para qualquer pessoa fora do círculo do Arthur.
2. A página ainda não está no ar (sem domínio/hospedagem).
3. O currículo do curso por nível ainda não foi desenhado (conteúdo, não só a
   estrutura de níveis que já existe na landing page).

O simulador (`trainer/`) segue as fases de `handpath-game-upgrade-prompt.md`.
Estado atual:

- **Fase 1 (conta e fichas persistentes) — pronta, validada ponta a ponta.**
  Supabase (Postgres + Auth, região Americas): login e-mail/senha e Google
  OAuth, bankroll nunca gravável direto pelo client (só via RPC
  `SECURITY DEFINER` — `buy_in`, `cash_out`, `claim_refill`,
  `reclaim_abandoned_session`), 4 stakes (Micro/Baixa/Média/Alta, cada uma
  com nível de bot fixo — Baixa e Média intencionalmente com o mesmo pool
  Intermediário), refill periódico por plano com resgate manual (widget de
  saldo, não mais automático no login). Fluxo: Login → Escolher mesa →
  Escolher nível (derivado da stake) → Mesa → Sair da mesa (cash-out real)
  → quiz opcional "quem era quem" → volta pra escolher mesa. Detalhe e
  gaps conhecidos (cash-out confia no valor final do client — aceito pra
  fase de validação, sem dinheiro real envolvido) em
  `trainer/supabase/README.md`.
- **Fase 2 (bots com personalidade real) — em andamento.** Arquétipo não
  aparece mais na mesa (nomes neutros sorteados por sessão, revelados só no
  quiz pós-mesa). Motor de decisão (`paramBot.js`) já considera pot odds
  (não folda fácil demais depois de já ter investido fichas) e
  continuation bet do agressor pré-flop (não trava mais em zero agressão
  pós-flop depois de um 3-bet grande) — validado por simulação de 40 mil
  mãos em Node (conservação de fichas, sem exceções). Esses dois bugs de
  realismo e a reformulação de fluxo/stakes acima vieram de
  `handpath-ajustes-fase1-fase2.md`, que a partir de agora está incorporado
  aqui e pode ser considerado obsoleto.
- **Fase 3 (mesa e cartas, visual) — não iniciada:** cartas comunitárias
  ainda verticais, mesa pequena, sem animação de baralho, sem indicador de
  mão atual nem kicker explicado no showdown. Pendente também: mostrar BB
  junto do saldo do jogador na mesa.
- **Fase 4 (fluxo de rodada e mesa) — não iniciada:** botão "Nova Mão"
  manual ainda existe (rodadas não avançam sozinhas), sem delay/barra de
  tempo entre mãos. Quando entrar, também traz a revelação da mão de quem
  chegou ao showdown (não de quem foldou) no intervalo entre mãos.
- **Fase 5 (relatório pós-mesa) — não iniciada, depende da Fase 4.**
  Decisão já travada: vai incluir histórico completo de mãos (cartas de
  todos, ações, resultado de cada mão) + replay pós-mesa, reusando a mesma
  base de dados — não construir nada disso antes da Fase 4 estar pronta.
- Ainda fora de escopo em qualquer fase: bot "GTO-like" (deliberadamente
  tardio) e multi-table de verdade (várias mesas simultâneas).

## Preferências do Arthur

- Fala português; prefere que eu responda em português.
- Estudante de Engenharia de Software (FIAP, 2º semestre), interessado em
  front-end/3D/Creative Tech.
- Prefere entender o raciocínio por trás das decisões técnicas, não só
  receber o resultado pronto.
