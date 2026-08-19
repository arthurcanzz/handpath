# landing/

Landing page de waitlist do Handpath — o ponto de entrada atual do projeto.
HTML + CSS + JS puro, sem build, sem framework (ver `../CLAUDE.md` para
convenções e decisões de produto).

- `index.html` — página, com atributos `data-i18n` para tradução
- `styles.css` — todo o CSS
- `script.js` — i18n engine, quiz de nível, seção de planos, motion (GSAP)
- `i18n.js` — dicionário de tradução PT/EN/ES
- `vendor/` — GSAP e ScrollTrigger baixados localmente (nunca via CDN)

Não confundir com `../trainer/` — aqui é só a página de captação, não o
produto de treino em si.
