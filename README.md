# Handpath

Plataforma de treino de poker: uma landing page animada e um simulador de mesa 6-max contra bots com estilos de jogo diferentes.

**Site:** [handpath.vercel.app](https://handpath.vercel.app)

## O que tem

**Landing page** (`handpath-landing_2/landing`)
- Animações de scroll com GSAP e ScrollTrigger.
- Quiz de nível com 8 situações reais de mesa, que indica o plano ideal no final.
- Troca de idioma entre português, inglês e espanhol.

**Simulador** (`handpath-landing_2/trainer`)
- Mesa 6-max de No-Limit Hold'em contra 5 bots.
- Motor de bots parametrizado com 8 estilos de jogo (Nit, LAG, Calling Station, Maniac e outros).
- Avaliação de mãos e divisão de side pots implementadas do zero, sem biblioteca de poker.
- Conta de usuário e saldo de fichas persistente com Supabase (Auth + Postgres com Row Level Security).
- Relatório da sessão e replay das mãos jogadas.

## Tecnologias

HTML, CSS e JavaScript puro, GSAP, Supabase e Vercel. Sem framework e sem etapa de build.

## Estrutura

```
handpath-landing_2/
├── landing/        landing page (index.html, styles.css, script.js, i18n.js)
└── trainer/
    ├── engine/     lógica do poker: baralho, avaliação de mãos, mesa e side pots
    ├── bots/       motor dos bots e os estilos de jogo
    ├── supabase/   conexão, autenticação e migrations do banco
    └── ui/         telas do simulador: login, escolha de mesa, mesa, relatório e replay
```

## Como rodar

```bash
npx serve handpath-landing_2
```

Depois abra `http://localhost:3000/landing/index.html`. O simulador usa a URL e a chave pública (anon) do Supabase em `trainer/supabase/config.js`. Os dados ficam protegidos pelas regras de Row Level Security das migrations.

## Autor

Arthur Canzian · [Portfólio](https://portfolio-arthur-canzian.vercel.app) · [LinkedIn](https://www.linkedin.com/in/arthur-canzian-1b489a398/)
