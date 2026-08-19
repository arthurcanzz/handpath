# Handpath — Upgrade do Simulador de Mesa (Prompt de Trabalho)

> Leia primeiro o `CLAUDE.md` do projeto pra contexto geral do Handpath.
> Este documento é o spec da próxima frente: o simulador de mesa em si
> (não a landing page).

## Como usar este documento

Isso é grande demais pra uma sessão só. Está dividido em fases. Regra:
**termine e valide uma fase com o Arthur antes de começar a próxima.**
Não tome decisão de arquitetura que trave o projeto no futuro (provedor de
auth, schema de banco, modelo de dados dos bots) sem confirmar antes — pare
e pergunte.

## Decisões já travadas (não reabrir sem motivo forte)

- **Persistência de fichas exige conta de usuário real** (login), não
  `localStorage` solto — o Arthur já escolheu isso conscientemente sabendo
  que dá mais trabalho.
- **Relatório pós-mesa é baseado em regras/estatísticas fixas**, sem
  chamada de IA — evita custo variável por sessão de jogo.
- **Já desenhar pensando em múltiplas stakes** (micro/baixo/médio) desde a
  estrutura de dados, mesmo que só uma stake seja lançada primeiro.

## Recomendação de arquitetura (proponha ao Arthur, não decida sozinho)

Hoje o jogo roda 100% no front-end, sem backend. Pra ter conta de usuário e
saldo de fichas persistente e confiável (não manipulável por F5 ou
DevTools), é necessário um backend com banco de dados.

Sugestão a validar com o Arthur: **Supabase** (Postgres + Auth + Realtime
prontos) — evita escrever um servidor Express do zero, mantém o front-end
em HTML/CSS/JS puro (sem forçar adoção de React), e tem tier gratuito
suficiente pra fase de validação. Se você (Claude Code) tiver argumento
melhor pro contexto atual do projeto, traga a alternativa — isso é
recomendação, não mandato.

**Ponto crítico de segurança:** a lógica que decide quem ganhou a mão, e
que credita/debita fichas, PRECISA rodar no servidor, nunca só no
navegador do jogador. Cliente manipulando `localStorage` ou o estado JS
não pode gerar fichas de graça.

---

## Hospedagem (de graça pra começar)

- **Frontend:** Netlify, plano free — permite uso comercial dentro dos
  limites de uso. **Não usar o Vercel Hobby**: o plano grátis dele proíbe
  explicitamente uso comercial, e o Handpath vai ter planos pagos — rodar
  ali violaria os termos deles assim que a plataforma começar a monetizar.
- **Backend/banco/auth:** Supabase, plano free — banco Postgres de 500MB,
  auth pronto, até 50 mil usuários ativos por mês, API sem limite dentro
  desses tetos. Suficiente pra fase de validação com fundadores.
- **⚠️ Configurar desde o início:** projetos free do Supabase **pausam
  automaticamente após 7 dias sem nenhuma requisição**. Sem tráfego
  suficiente no começo, isso pode deixar o backend fora do ar sem aviso.
  Mitigar com um ping periódico automático — um workflow do GitHub Actions
  rodando a cada poucos dias, ou um monitor gratuito tipo UptimeRobot
  batendo no endpoint do projeto. Não deixar isso pra depois: configurar
  já na Fase 1, junto com o setup do Supabase.
- Quando o produto crescer de verdade (banco passando de 500MB, tráfego
  maior), o próximo degrau é Supabase Pro (~US$25/mês) — primeiro custo
  real da infraestrutura, e só entra quando fizer sentido.

---

## Fase 1 — Fundação: conta e fichas persistentes

Cobre os pontos 2 e 7 do brief original do Arthur.

- Signup/login (e-mail+senha ou magic link — decidir com Supabase Auth).
- Saldo de fichas (bankroll) do usuário fica no banco, nunca só no client.
- Antes de sentar numa mesa: tela de buy-in — usuário escolhe quanto do
  bankroll leva, dentro de um min/max por stake (proposta de faixas
  abaixo). Sempre entra como big blind.
- Botão "Sair da mesa" sempre visível — fichas restantes voltam pro
  bankroll ao sair.
- Refill de fichas grátis por tempo, variando por plano (Free/Starter/
  Pro/Elite) — inspirado no modelo do PokerStars de fichas grátis
  periódicas. Proposta inicial de valores (ajustável, confirmar com
  Arthur):
  - Free: 5.000 fichas a cada 6h
  - Starter: 10.000 fichas a cada 4h
  - Pro: 20.000 fichas a cada 3h
  - Elite: 40.000 fichas a cada 2h
- Proposta de stakes (min/max buy-in), pra já nascer com múltiplas:
  - Micro: blinds 10/20, buy-in 500–2.000
  - Baixa: blinds 50/100, buy-in 2.500–10.000
  - Média: blinds 100/200, buy-in 5.000–20.000 (a stake que já existia)

**Critério de aceite da Fase 1:** um usuário consegue criar conta, receber
fichas grátis, escolher uma stake e buy-in, jogar, sair, e ver o saldo
persistir mesmo depois de fechar e reabrir o navegador (ou trocar de
dispositivo).

---

## Fase 2 — Bots com personalidade real

Cobre o ponto 1. Este é o mais delicado da lista.

- O arquétipo (Nit, LAG, Calling Station, Maniac, TAG, Short-Stack Shover
  etc.) continua existindo como dado interno do bot — só **para de
  aparecer na mesa durante o jogo**.
- A decisão do bot deve ser orientada a **maximizar fichas ganhas**, não a
  "seguir o rótulo" de forma determinística. Isso significa: mesmo um bot
  "tight" ocasionalmente blefa ou dá um raise fora do script; mesmo um
  "loose" ocasionally foldar uma mão boa perto de o pote ficar grande
  demais. O objetivo é que o comportamento não vire um padrão detectável
  ("esse aqui sempre faz X quando tem Y").
- Isso implica variância controlada na tomada de decisão — não aleatório
  puro (isso pareceria bot burro), mas também não 100% determinístico por
  arquétipo (isso é o que está errado hoje, como mostram os prints).
- **Proposta de abordagem** (você decide os detalhes de implementação):
  cada arquétipo define uma distribuição de frequências por ação (ex:
  Calling Station tem alta frequência de call mesmo com equity baixa, mas
  não 100% das vezes) em vez de regras fixas tipo "sempre check". A força
  da mão (equity estimada) ainda pesa na decisão — o arquétipo modula a
  frequência, não substitui a lógica de EV.
- **Camada de ensino pós-mesa:** quando o usuário sai da mesa, um quiz
  curto pergunta "quem você acha que era o Nit? o Calling Station?" e
  depois revela os arquétipos reais com uma explicação curta do padrão de
  cada um (isso substitui o rótulo que hoje aparece na mesa).

**Critério de aceite da Fase 2:** jogando várias mãos contra o mesmo bot,
o padrão de decisão dele não é imediatamente óbvio olhando só 3-4 mãos —
mas ainda é analisável estatisticamente depois de muitas mãos (isso é
realista: bots reais também têm tendências, só não são óbvias mão a mão).

---

## Fase 3 — Mesa e cartas (visual)

Cobre os pontos 3, 4 e 5.

- Cartas comunitárias na horizontal (hoje estão verticais, empilhadas).
- Mesa e cartas maiores — hoje está pequeno demais pra enxergar bem,
  segundo o Arthur.
- Animação de baralho: um baralho visível no centro da mesa, as cartas
  saem dele uma a uma — vira uma de lado (flop, 3 cartas em sequência),
  depois mais uma (turn), depois mais uma (river).
- Indicador da mão atual do jogador, atualizando por street (ex: "Par de
  Setes") — mostrar só para Iniciante e Intermediário (Avançado não vê,
  como já é o padrão do GUI de apoio no resto da plataforma).
- No showdown, mostrar o kicker quando ele for o fator decisivo (ex:
  "K-K com kicker Q venceu K-K com kicker 9") — hoje a mensagem de
  resultado não deixa isso claro, e iniciante perde sem entender por quê.

---

## Fase 4 — Fluxo de rodada e de mesa

Cobre os pontos 6 e a segunda metade do 7.

- Remover o botão "Nova Mão" — rodadas avançam automaticamente.
- Ao fim de cada mão: delay de ~5s com barra de tempo regressiva visível,
  mais um botão pra pular o delay (pra quem já entendeu o resultado e
  quer seguir rápido).

---

## Fase 5 — Relatório pós-mesa

Cobre o ponto 8. Só entra depois que a Fase 1 (fichas/conta) e a Fase 4
(fluxo de mesa) estiverem prontas, porque depende de ter histórico de mãos
armazenado por sessão.

- Gerado quando o usuário sai da mesa — baseado em regras e estatísticas
  da própria sessão, sem chamada de IA:
  - win rate da sessão, maiores potes ganhos/perdidos
  - mãos em que o kicker decidiu o resultado
  - frequência de fold/raise/call do usuário
  - identificar mãos onde a decisão do usuário tinha EV positivo mas o
    resultado foi ruim (variância) — e nesse caso, mostrar algo como
    "essa foi só azar, a decisão estava certa" em vez de sugerir erro
    onde não houve.
- Sempre pulável — nunca obrigatório ver o relatório pra sair.

---

## Perguntas que você (Claude Code) deve levar ao Arthur antes de decidir sozinho

- Confirmar provedor de auth/banco (Supabase ou alternativa).
- Confirmar os valores de refill de fichas por plano (propostos acima como
  ponto de partida, não como decisão final).
- Confirmar as faixas de buy-in por stake (propostas acima).
- Qualquer mudança de schema de banco que seria cara de reverter depois.
