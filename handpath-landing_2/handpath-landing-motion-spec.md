# Handpath — Upgrade de Motion da Landing Page (Spec Técnico)

> Nota de numeração: isso é um refinamento da **Fase 0** (landing page),
> que já está "funcionalmente pronta" segundo o `CLAUDE.md`. Não é uma
> fase nova do `handpath-game-upgrade-prompt.md` — mexe só em `landing/`,
> não em `trainer/`.

## Por que este documento existe

O Arthur pediu mais motion na landing page, no estilo de um protótipo
anterior chamado "Full House" — mas esse arquivo não está neste
repositório, então não dá pra você abrir e copiar o padrão. Este
documento descreve a técnica em detalhe suficiente pra implementar do
zero, sem precisar do arquivo de referência.

---

## A técnica central: scroll-scrub com pin (GSAP ScrollTrigger)

Isso é diferente de reveal-on-scroll comum (fade-in quando o elemento
entra na viewport, que já existe em `runScrollReveals()`). Scroll-scrub
**trava a seção na tela** enquanto o usuário rola, e liga o **progresso**
de uma timeline de animação diretamente à posição do scroll — o scroll
vira o controle remoto da timeline, não um gatilho pontual.

Padrão de código:

```js
gsap.timeline({
  scrollTrigger: {
    trigger: '#secao',
    start: 'top top',      // gruda quando o topo da seção encosta no topo da tela
    end: '+=250%',         // distância de scroll (em % da altura da viewport) que a seção fica presa
    pin: true,              // trava a seção no lugar durante esse scroll
    scrub: 0.6               // liga a timeline ao scroll; número = suavização (delay), true = 1:1 exato
  }
})
  .to('.chapter-1', { opacity: 1 })
  .to('.chapter-1', { opacity: 0 })
  .to('.chapter-2', { opacity: 1 })
  // ...cada .to() é um "capítulo" disparado por uma fatia do scroll total
```

Cada chamada `.to()` na timeline consome uma fatia do scroll total
definido em `end`. Rolar pra frente avança a timeline; rolar pra trás
reverte — automático, não precisa código extra pra isso.

---

## Aplicação recomendada 1 — "Como funciona" vira demonstração scroll-scrub

Hoje (`pillars` em `landing/index.html`) são 3 cards estáticos lado a
lado, com reveal simples. Trocar por: seção pinada onde cada um dos 3
pilares (Curso / Simulador / GUI) **toma a tela inteira por vez**
conforme o usuário rola — texto grande, uma ilustração simples (ícone de
cartas pro Curso, grade de mesas pro Simulador, HUD pro GUI), e um
indicador de capítulo fixo na lateral (ex: "1/3", "2/3", "3/3", ou 3
pontinhos com o atual destacado).

Isso é o mesmo padrão estrutural de "escada de conteúdo que se revela
capítulo a capítulo com o scroll" — só que aplicado aos 3 pilares do
produto em vez de mãos de poker.

---

## Aplicação recomendada 2 — nova seção de prova de produto (fatos reais, não tração)

Adicionar uma seção nova (entre "Como funciona" e "Sua Trilha", por
exemplo) com:

- Elementos visuais estilo fichas de poker entrando com stagger (círculos
  coloridos, como os chips que já existem conceitualmente no domínio
  visual do produto).
- Números que **contam de 0 até o valor final** conforme a seção entra na
  tela (proxy object + `gsap.to()` atualizando `textContent` a cada
  frame — não é `CountUp.js` nem lib externa, dá pra fazer só com GSAP).

⚠️ **Importante:** os números aqui têm que ser **fatos do produto**, nunca
tração/uso inventado. Certo: "8 arquétipos de bot", "4 stakes diferentes",
"até 24 mesas simultâneas (em breve)", "3 níveis de curso". Errado:
qualquer coisa que pareça "X pessoas já treinaram" ou "Y mãos jogadas" —
isso seria estatística de uso fabricada antes do produto ter usuários de
verdade, e isso o Arthur não pediu e não deve aparecer.

---

## Aplicação recomendada 3 — hero ganha cartas

`landing/script.js` já tem um componente de carta (`buildCard()`, hoje
usado só nas cenas do quiz). Reaproveitar esse mesmo componente pra
adicionar uma pequena composição de cartas no hero, com entrada em flip
3D (`rotateY` de 90° até 0°) durante a animação de entrada que já existe
(`runHeroEntrance()`) — não é elemento novo, é o componente que já existe
aparecendo em mais um lugar.

---

## O que **não** fazer (por que a landing é mais contida que o trainer)

- **Não pinar a página inteira** — a landing existe pra converter
  (captura de e-mail na waitlist). Motion pesado demais pode atrapalhar
  isso. Usar pin+scrub em no máximo 1–2 momentos de assinatura (a seção
  "Como funciona" já cobre isso), não a página toda.
- **Não adicionar cursor customizado** — decisão já tomada quando a
  landing foi construída: cursor customizado atrapalha a clareza de
  clique numa página cujo objetivo é conversão, não é uma peça de
  portfólio.

---

## Onde mexer

- `landing/script.js` — novas funções: `initPillarsScrub()`,
  `initStatsSection()`, `initHeroCards()`. Chamar na seção "BOOT" do
  arquivo, junto das outras, só se `hasGsap()` for true (mesmo padrão já
  usado no resto do arquivo).
- `landing/styles.css` — estilos novos pra seção de stats e pro layout de
  capítulo da seção de pilares.
- `landing/index.html` — marcar o HTML novo com `data-i18n` nas 3
  línguas, seguindo o padrão que já existe (a seção de stats vai ter
  texto que precisa passar pelo `i18n.js`).

## Critério de aceite

Rolar "Como funciona" mostra cada pilar tomando a tela por vez, sem
quebrar o resto da página nem duplicar o `runScrollReveals()` já
existente nela. A seção de stats conta números reais do produto. O hero
ganha cartas na entrada. Nada disso pode piorar a velocidade de
carregamento nem atrapalhar o formulário de waitlist — que continua
sendo o objetivo #1 da página.
