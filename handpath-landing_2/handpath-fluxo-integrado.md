# Handpath — Fluxo Integrado (Landing → Login → Plano → Dashboard → Jogo)

> Nota de numeração: as "Fases" citadas aqui (1 a 5) são as do
> `handpath-game-upgrade-prompt.md`, não as do documento de estratégia de
> produto original. Este documento descreve a **estrutura de entrada** que
> antecede e conecta com a Fase 1 — não é uma fase nova numerada, é a
> ponte entre a landing page e o app.

## Contexto

Hoje a landing page (`handpath-landing/`, marketing + waitlist) e o app do
jogo (sendo construído no Claude Code) são **dois projetos desconectados**.
Este documento define como eles se conectam num fluxo único.

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
  - *(Assumi que "equidade explicada e exemplificada" pedia os dois —
    lição E calculadora. Se era só um dos dois, é só cortar o outro.)*
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

| Plano | Stakes liberadas |
|---|---|
| Free | Micro |
| Starter | Micro + Baixa |
| Pro | Micro + Baixa + Média |
| Elite | Todas (inclui Alta) |

Isso é **independente** do gating de bots por stake (já definido: Micro=
Iniciante, Baixa/Média=Intermediário, Alta=Avançado) — são dois filtros
diferentes, plano controla *onde* você pode jogar, stake controla *contra
quem*.

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
