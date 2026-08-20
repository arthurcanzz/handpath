# Handpath — Fluxo Integrado (Landing → Login → Plano → Dashboard → Jogo)

> Nota de numeração: as "Fases" citadas aqui (1 a 5) são as do
> `handpath-game-upgrade-prompt.md`, não as do documento de estratégia de
> produto original. Este documento descreve a **estrutura de entrada** que
> antecede e conecta com a Fase 1 — não é uma fase nova numerada, é a
> ponte entre a landing page e o app.

## Contexto

Hoje a landing page (`landing/` no mesmo repo `handpath-landing_2/`,
marketing) e o app do jogo (`trainer/`, mesmo repo) já são conectados por
estarem juntos — este documento define o fluxo de navegação entre eles,
que ainda não existe.

## ⚠️ Mudança de decisão: não existe mais waitlist

A landing tinha um formulário de captura de e-mail (waitlist) e uma seção
"Fundadores" com urgência de vagas — isso **sai por completo**. Motivo do
Arthur: confunde quem chega, e ninguém entra numa lista de espera pra um
produto que parece novo sem contexto nenhum. Como a Fase 1 do trainer já
tem login/signup real funcionando (Supabase, validado ponta a ponta), não
tem motivo pra fingir "lista de espera" quando dá pra simplesmente deixar
a pessoa criar conta na hora.

O que isso muda em `landing/`:

- **Remover** o formulário de e-mail do hero (`#heroForm`, `submitEmail()`
  e toda a lógica associada) — isso não é mais um item pendente, é
  trabalho que deixou de existir.
- **Remover ou reformular** a seção "Fundadores" (`founders` em
  `index.html`/`styles.css`) — hoje ela é 100% baseada em urgência de
  vaga/lista, que não existe mais. Se sobrar algo dessa seção, vira só
  mais um CTA de "crie sua conta grátis", sem mecânica de fila.
- CTA principal ("Comece agora") passa a apontar direto pro fluxo de
  login/signup real em `trainer/ui/`, não pra um formulário.
- O quiz de diagnóstico continua igual, só que o resultado leva pro
  signup em vez de pra uma lista de espera.

## Fluxo completo

```
Landing page (marketing)
   ↓ CTA "Comece agora" (primário) ou "Já tenho conta" (secundário)
Login / Signup
   ↓
Escolha de plano (Free / Starter / Pro / Elite — cobrança ainda fictícia)
   ↓
Dashboard (hub central)
   ↓
Jogar → Escolher mesa → Escolher nível → Mesa → Sair (fluxo já existente)
```

O quiz de diagnóstico de nível continua na landing page, **antes** do
login, do jeito que já está hoje — não muda de lugar.

## Dashboard — a peça que estava faltando

Depois de login + plano, o usuário cai num hub central com navegação
entre:

- **Jogar** → entra no fluxo já existente (Escolher mesa → Escolher nível
  → Mesa → Sair). É só mais um item de nav agora, não a tela inicial.
- **Curso** → lições por nível. Inclui um módulo de **equidade explicada**
  (conteúdo de lição — texto/exemplo do conceito).
- **Calculadora de Equity** → ferramenta interativa separada do curso —
  usuário digita mãos/board e vê o percentual calculado na hora. Item de
  nav próprio, não escondido dentro do curso.
  - _(Assumi que "equidade explicada e exemplificada" pedia os dois —
    lição E calculadora. Se era só um dos dois, é só cortar o outro.)_
- **Prática** → drills avulsos (fica mais robusto quando o item "curso
  amarrado à prática" do documento de retenção for implementado).
- **Dicas** → conteúdo (pode nascer como placeholder simples agora — a
  versão completa, tipo "mão do dia", é Fase 7 do documento de retenção).
- **Replay** → histórico de mãos da sessão. Só fica funcional depois que a
  camada de histórico (adiada pra Fase 4/5, ver adendo anterior) existir —
  até lá, item de nav presente mas vazio/"em breve".
- **Saldo de fichas** sempre visível, mesmo padrão já definido no adendo
  anterior (canto superior direito).

## Restrição por plano — recomendação

Restringir de verdade, não só visualmente — evita ter que reconstruir a
lógica de gating depois quando a cobrança real entrar. Proposta inicial de
mapeamento (ajustável):

| Plano   | Stakes liberadas      |
| ------- | --------------------- |
| Free    | Micro                 |
| Starter | Micro + Baixa         |
| Pro     | Micro + Baixa + Média |
| Elite   | Todas (inclui Alta)   |

Isso é **independente** do gating de bots por stake (já definido: Micro=
Iniciante, Baixa/Média=Intermediário, Alta=Avançado) — são dois filtros
diferentes, plano controla _onde_ você pode jogar, stake controla _contra
quem_.

⚠️ **Nota separada, não travar sem confirmar:** os planos originais
(Free/Starter/Pro/Elite) foram desenhados lá na landing page pensando em
**quantidade de mesas simultâneas** (multi-table), não em stake — e o
multi-table engine em si ainda não foi construído. Até lá, a tabela acima
(gating por stake) é o que faz sentido implementar. Quando o multi-table
chegar, os dois eixos (stakes liberadas + mesas simultâneas liberadas)
coexistem no mesmo plano.

## Fora de escopo deste documento

A landing page em si (`handpath-landing/`) ganhar mais recursos visuais
(motion com GSAP tipo o site Full House — cartas se movendo com o scroll,
etc.) é trabalho separado, no projeto da landing, não no app do jogo. Não
está detalhado aqui de propósito — ver observação final na resposta do
chat.
