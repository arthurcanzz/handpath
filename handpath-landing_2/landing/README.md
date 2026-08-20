# landing/

Landing page de waitlist do Handpath — o ponto de entrada atual do projeto.
HTML + CSS + JS puro, sem build, sem framework (ver `../CLAUDE.md` para
convenções e decisões de produto).

- `index.html` — página, com atributos `data-i18n` para tradução
- `styles.css` — todo o CSS
- `script.js` — i18n engine, quiz de nível, seção de planos, motion (GSAP),
  formulário de waitlist (`submitEmail()` insere em `window.HandpathDB`)
- `i18n.js` — dicionário de tradução PT/EN/ES
- `supabase-config.js` / `supabase-client.js` — reaproveitam o MESMO
  projeto Supabase do `../trainer/` só pra tabela `waitlist` (ver
  `../trainer/supabase/README.md`), não é um backend novo. Cópias
  autocontidas do config/client do trainer (não uma referência
  `../trainer/...`) porque a landing é zipada/implantada como pacote
  separado.
- `vendor/` — GSAP, ScrollTrigger e o client `supabase-js` baixados
  localmente (nunca via CDN)

Não confundir com `../trainer/` — aqui é só a página de captação, não o
produto de treino em si.
