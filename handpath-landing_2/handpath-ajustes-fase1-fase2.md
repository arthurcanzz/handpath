# Handpath — Ajustes de Fase 1 e Fase 2 (baseado em teste real)

> Isso é um **adendo** ao `handpath-game-upgrade-prompt.md` — leia os dois
> antes de mexer em qualquer coisa. Este documento não substitui o
> original, só aprofunda e corrige pontos com base em testes reais
> jogando as mesas intermediária e avançada.

## Onde estamos agora

A Fase 2 (bots) está em andamento, mas ainda com os problemas de realismo
que ela mesma deveria resolver — os casos abaixo foram capturados jogando
de verdade. A Fase 4 (rodadas automáticas, sem botão "Nova Mão") ainda
não foi implementada — o botão manual ainda aparece. Isso não é bug, só
não chegou a vez ainda; não precisa corrigir agora, só não esquecer que
segue pendente.

---

## Aprofundamento da Fase 2 — bugs de realismo encontrados jogando

### Caso 1 — mesa intermediária: fold fácil demais depois de já ter investido

Um bot deu call de $100 pré-flop (limpou). O Arthur deu raise pra $200.
**Ninguém pagou** — ele ganhou só com um raise mínimo. Isso não é
realista: um bot que já colocou $100 no pote tem boas pot odds pra pagar
mais $100 e ver o flop, principalmente contra um raise pequeno. Bots que
já investiram fichas na mão estão foldando fácil demais pra raises
pequenos — não estão considerando o que já colocaram no pote na hora de
decidir.

### Caso 2 — mesa avançada: zero agressão pós-flop depois de 3-bet grande

"Casey" deu raise de 3.200 (16BB) no pré-flop. "Quinn" pagou. Depois
disso: zero blefe, zero aposta de valor, zero continuation bet entre os
dois — só check-check-check até o river. Pra bots do tier "Avançado",
isso é o oposto do esperado — um pote pré-flop desse tamanho normalmente
é seguido de continuation bet (blefe ou valor) em pelo menos uma street.
A lógica pós-flop parece desconectada do tamanho e do contexto da ação
pré-flop.

### Instrução geral pra corrigir os dois casos

A decisão do bot precisa considerar **o histórico da própria mão**
(quanto já foi investido, tamanho do pote atual, ação da street anterior)
— não só a força da carta na mão + o arquétipo isolado, como parece estar
hoje. Isso vale pra qualquer stake, mas o problema fica mais grave quanto
mais alta a stake: **Avançado precisa ser visivelmente mais dinâmico que
Iniciante**, e hoje os dois casos acima mostram o oposto disso.

---

## Duas features novas

- **(Encaixa na Fase 4, junto do delay de fim de mão)** — durante o
  intervalo antes da próxima rodada começar, revelar a mão de **todos os
  bots que chegaram ao showdown** — não só a do vencedor. Ajuda a estudar
  o que os outros fizeram.
  - ⚠️ Perguntar ao Arthur: revelar só quem chegou até o final, ou também
    quem foldou no meio do caminho?
- **(Encaixa na Fase 3, junto da revisão visual da mesa)** — mostrar
  quantos big blinds (BB) o usuário tem, do lado do saldo de fichas na
  mesa (ex: "$4.800 · 48 BB"). Vai ser referência importante já pro
  lançamento.

---

## Revisão da Fase 1 — reformulação do fluxo de mesas e economia

Fluxo completo (esse é o desenho final):
**Login → Escolher mesa → Escolher nível → Mesa (jogo) → Sair da mesa
(saldo volta pra conta)**

### Tela "Escolher mesa" — o que muda

- Fichas grátis **não são mais resgatadas automaticamente** ao entrar.
  Vira um botão no canto superior direito ("Suas fichas: $X") que abre um
  painel — só dali dá pra clicar em "Resgatar fichas grátis".
  - *Ideia pra registrar, não construir agora:* no mesmo painel, no
    futuro, adicionar opção de comprar "fichas de treino" com dinheiro
    real. Só anotar a ideia — não implementar nesta fase.
- Saldo de fichas do usuário aparece nesse mesmo canto superior direito,
  sempre visível.
- Stakes atualizadas — blinds mudam, buy-in dos 3 primeiros tiers
  continua igual ao que já estava definido no documento original; Alta é
  tier novo:

| Stake | Blinds | Buy-in |
|---|---|---|
| Micro | 50/100 | 500–2.000 |
| Baixa | 100/200 | 2.500–10.000 |
| Média | 250/500 | 5.000–20.000 |
| Alta *(nova)* | 500/1.000 | 10.000–50.000 |

  ⚠️ **Perguntar ao Arthur antes de travar:** no Micro, buy-in de
  500–2.000 com blinds 50/100 dá só 5–20 BB de stack efetivo — bem raso
  pra uma mesa de iniciante. Pode ser intencional (mão mais simples,
  decisão mais rápida pra quem está começando) — mas como é uma mudança
  grande em relação ao que estava especificado antes, vale confirmação
  explícita, não assumir.

### Tela "Escolher nível" (dentro de cada mesa) — o que muda

- Micro → só bots **Iniciante**
- Baixa → só bots **Intermediário**
- Média → só bots **Intermediário**
- Alta → só bots **Avançado**

  ⚠️ **Perguntar ao Arthur antes de implementar:** Baixa e Média estão
  com o mesmo pool de bots (Intermediário) — pode ser intencional (mesma
  dificuldade de bot, a diferença entre as duas mesas é só o
  comprometimento financeiro/variância, não a dificuldade), mas como está
  escrito idêntico nas duas, confirmar antes que não é erro de digitação.

- Essa tela também mostra o saldo de fichas do usuário no canto superior
  direito, mesmo padrão da tela anterior.

### Resto do fluxo

Sem mudança: joga, sai da mesa quando quiser, fichas restantes voltam pro
saldo da conta.

---

## Antes de implementar

Confirme com o Arthur os dois pontos marcados com ⚠️ acima, e a dúvida
sobre "revelar mão de todos" (showdown apenas, ou incluir quem foldou).
Depois disso, pode seguir.
