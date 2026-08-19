# Handpath — Retenção, Monetização e Realismo dos Bots
### Do "ferramenta legal" para "algo que eu pago todo mês"

---

## 1. O problema real que este documento resolve

Curso + simulador + bots por nível é a **fundação** do produto — mas
fundação não é o que faz alguém manter uma assinatura ativa por 6 meses.
O que já existe responde "isso ensina poker?". Falta responder "por que eu
continuo pagando no mês 4, quando já entendi o básico?".

Esse documento cobre duas frentes que vieram à tona conversando: o que
falta pra virar produto retentivo de verdade, e até onde dá pra levar o
realismo dos bots com uma equipe pequena.

---

## 2. O que separa "ferramenta" de "assinatura que as pessoas mantêm"

### 2.1 Prova de progresso mensurável

Hoje: joga uma sessão, ganha ou perde, acabou. Não sobra rastro.

Precisa: um **rating de habilidade** (estilo ELO/MMR) que sobe e desce com
o tempo — não só saldo de fichas, que já reseta a cada buy-in. Gráfico de
win-rate por stake. **Detecção de vazamento recorrente** («você foldou o
BB contra raise pequeno em 80% das últimas 50 mãos» — um alerta
específico, não genérico). É isso que faz a pessoa sentir que a
assinatura está *fazendo* alguma coisa por ela, mês a mês.

### 2.2 Curso amarrado à prática, não dois blocos soltos

Hoje: curso e simulador são duas coisas separadas que o usuário navega
por conta própria.

Precisa: cada lição termina te jogando direto num **drill específico
daquele conceito** (ex: aula sobre 3-bet → 10 mãos geradas só com spot de
3-bet). Isso fecha o loop ensino→prática→feedback na mesma sessão, em vez
de depender do usuário lembrar de praticar o que acabou de estudar.

### 2.3 Camada social/competitiva

Leaderboard (por stake, por semana), desafios semanais («jogue 200 mãos
sem foldar o BB contra steal»), comparação com amigos. As pessoas pagam
mais por status e comunidade do que por ferramenta pura isolada — é o
motivo do Duolingo ter streak e liga, não só lição.

### 2.4 Conteúdo largo, motivo pra voltar todo dia

- "Mão do dia" pra debater/comentar
- Review de mão da comunidade (usuário manda uma mão, outros comentam)
- Conteúdo de convidado/coach
- Artigos curtos ligados a conceitos do curso

Isso é o que traz alguém de volta em dias em que não estava nem pensando
em "treinar" — sem isso, o produto só é usado quando a pessoa já decidiu
ativamente estudar, o que é raro no dia a dia.

### 2.5 O ângulo que nenhum concorrente tem hoje

GTO Wizard, Upswing e PokerCoaching vendem teoria genérica. Você já tem
duas peças que ninguém mais tem juntas: **bots por arquétipo** +
**histórico de mão por usuário**. Isso permite construir um **bot
"nêmesis"** — montado especificamente pra explorar os vazamentos que
aquele usuário mostrou nas próprias sessões. Ninguém no mercado atual
personaliza o oponente a partir do histórico real do próprio jogador. Isso
é o tipo de diferencial que vira motivo de assinatura, não só feature a
mais numa lista.

---

## 3. Realismo dos bots — até onde dá, com honestidade

"Extremamente realista" tem dois níveis bem diferentes. Importa saber
qual está sendo mirado, porque o esforço entre um e outro é ordens de
grandeza diferente.

### Nível 1 — realista o suficiente pra treinar bem
**Alcançável agora, sem virar projeto de pesquisa.** É o caminho que já
está em andamento no adendo de Fase 2: bot considerando o histórico da
própria mão (quanto já investiu, tamanho do pote, ação da street
anterior) em vez de só carta + arquétipo isolado. Resolve os dois bugs
reais já identificados (fold fácil demais depois de já ter investido;
zero agressão pós-flop depois de 3-bet grande).

### Nível 2 — indistinguível de um profissional humano
Isso é um problema de IA genuinamente difícil, não um bug de lógica. Os
bots que chegaram nesse nível — Libratus e Pluribus, da Carnegie
Mellon/Meta — usaram treino por self-play com Counterfactual Regret
Minimization em escala industrial, anos de pesquisa dedicada. Não é meta
realista pra uma equipe pequena numa sprint, nem nos próximos meses.

### Caminho prático (meio-termo, pra quando o produto já tiver receita)
Em vez de construir um solver próprio do zero: usar **tabelas de
frequência pré-resolvidas** de solvers já existentes (dados públicos ou
licenciáveis) pros spots mais comuns, e deixar a variação/arquétipo
modular a frequência em cima dessa base — em vez de o arquétipo *ser* a
lógica inteira, como é hoje. O "nível Pluribus" fica como aspiração de
longo prazo, não meta de curto prazo — e não precisa dele pra ter um
produto que ensina bem: o Nível 1 já resolve isso.

---

## 4. Onde isso entra no roadmap

| Item | Fase sugerida |
|---|---|
| Corrigir contexto de decisão dos bots (Nível 1) | Fase 2 (já em andamento) |
| Rating/ELO de habilidade | Fase 5 (usa a mesma base de dados do relatório) |
| Detecção de vazamento recorrente | Fase 5, depois do rating básico |
| Curso → drill amarrado | Fase 6 (nova) |
| Leaderboard / desafios semanais | Fase 6 |
| Conteúdo largo (mão do dia, comunidade) | Fase 7 (nova, pós-lançamento) |
| Bot "nêmesis" personalizado | Fase 7 — maior diferencial, mas depende de já ter dado de vazamento confiável (Fase 5) |
| Tabelas de frequência pré-resolvidas (Nível 1.5) | Só depois de receita entrando — não é bloqueante pro lançamento |
