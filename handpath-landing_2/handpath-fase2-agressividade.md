# Handpath — Fase 2: Agressividade e Sizing dos Bots

> Isso é uma continuação da **Fase 2** (`handpath-game-upgrade-prompt.md`),
> que já está em andamento e validada nos dois pontos anteriores (pot odds
> e continuation bet — ver `CLAUDE.md`). Este documento **não reabre** o
> que já foi corrigido, só adiciona em cima.

## Contexto — o que foi descartado e por quê

Antes de chegar nesses 6 itens, foi cogitada uma abordagem de forçar
~95% das mãos a terem call/raise de algum bot **independente da força da
mão**, só pra manter a mesa "viva". Foi descartada deliberadamente: isso
desfaria o que a Fase 2 já validou (decisão orientada a pot odds/EV, não
a um gatilho fixo) e tornaria os bots **mais exploráveis**, não mais
realistas — o jogador aprenderia que "quase sempre tem call/raise não
importa o quê" e passaria a apostar por valor sem parar contra isso, o
oposto do que um produto de treino deve ensinar. Os itens abaixo resolvem
a mesma sensação de "mesa parada" sem abrir esse buraco.

---

## 1. Corrigir sizing de raise — hoje sempre vira all-in (bug, não personalidade)

Raise pré-flop hoje aparentemente sempre sai como all-in, mesmo fora de
situação de stack curto. Isso não é uma escolha de arquétipo, é sizing
errado.

- Raise de abertura pré-flop: ~2–3x BB (variar dentro dessa faixa, não
  fixo — ver item 5).
- 3-bet: proporcional ao pote/ação anterior, não all-in por padrão.
- All-in só em situação real de push/fold (stack efetivo curto, algo
  como abaixo de ~15BB) ou como jogada rara e específica de um arquétipo
  bem solto (ex: Maniac ocasionalmente) — nunca como o tamanho padrão de
  raise de qualquer bot.

**Prioridade mais alta dos 6** — é bug de sizing, não feature nova.

## 2. 3-bet especulativo dos arquétipos soltos

Hoje LAG/Maniac só dão call ou fold pré-flop com mão fraca. Adicionar
frequência (baixa, controlada) de 3-bet mesmo sem mão forte — cria a
dinâmica de "esse aqui re-raisou com o quê?" sem virar aleatório puro.

## 3. Isolar limpador

Hoje ninguém pune um bot que dá limp — outros só completam/call também.
Um bot (principalmente arquétipos mais agressivos) deveria dar raise de
isolamento sobre um limp, em vez de só igualar. É o mesmo tipo de bug do
Caso 1 já corrigido (fold fácil demais depois de investir), só que do
lado de quem deveria estar punindo a passividade alheia, não defendendo
a própria.

## 4. Abertura por posição

Bot em BTN/CO deve abrir um range bem mais largo que bot em UTG — isso
não é "personagem mais solto", é regra básica de posição que qualquer
jogador de nível segue. Cria variação natural de ação sem depender de
nenhum arquétipo específico.

## 5. Variar o tamanho da aposta, não só o valor fixo

Se hoje o raise pré-flop e o c-bet saem sempre com o mesmo tamanho
(ex: sempre 2.5BB, sempre 66% do pote), isso também é um padrão
detectável — o mesmo princípio que já motivou esconder o arquétipo na
Fase 2, só que aplicado ao tamanho da aposta:

- Raise pré-flop: variar dentro de ~2–3.5BB.
- C-bet: variar dentro de ~50–75% do pote.

## 6. Squeeze play

Quando já existe um raise e um call na mesa antes da vez de um bot solto
no blind, ele deve ocasionalmente dar um re-raise maior (squeeze) em vez
de só foldar ou pagar. É a jogada que mais surpreende quem está
aprendendo — boa candidata pra entrar no quiz pós-mesa ("por que ele deu
squeeze ali?").

---

## Ordem sugerida de implementação

1 (bug de sizing) → 4 (posição, mais barato/estrutural) → 3 (isolar
limp) → 2 (3-bet especulativo) → 5 (variar tamanho) → 6 (squeeze, mais
específico e o que mais depende dos outros já estarem funcionando).

## Critério de aceite

Jogando várias mãos: raises pré-flop não são mais quase sempre all-in;
dá pra notar bots de posição tardia abrindo mais que os de posição
inicial; pelo menos ocasionalmente aparece um 3-bet ou squeeze sem mão
óbvia; o tamanho de raise/c-bet varia entre mãos, não é sempre o mesmo
número. Tudo isso sem quebrar a conservação de fichas nem reabrir os
bugs já corrigidos (rodar a mesma simulação de 40 mil mãos em Node de
novo depois, como validação).
