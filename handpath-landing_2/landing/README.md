# landing/

Landing page de marketing do Handpath — o ponto de entrada atual do
projeto. HTML + CSS + JS puro, sem build, sem framework (ver `../CLAUDE.md`
para convenções e decisões de produto).

**Sem waitlist** — decisão em `../handpath-fluxo-integrado.md`: os CTAs
("Comece agora", cards de plano, seção final) linkam direto pro
login/signup real em `../trainer/ui/index.html`, sem captura de e-mail nem
lista de espera. A landing não fala mais com Supabase — a conta de
verdade é criada do lado do `trainer/`.

- `index.html` — página, com atributos `data-i18n` para tradução
- `styles.css` — todo o CSS
- `script.js` — i18n engine, quiz de nível, seção de planos, motion (GSAP)
- `i18n.js` — dicionário de tradução PT/EN/ES
- `vendor/` — GSAP e ScrollTrigger baixados localmente (nunca via CDN)

Não confundir com `../trainer/` — aqui é só a página de marketing, não o
produto de treino em si.
