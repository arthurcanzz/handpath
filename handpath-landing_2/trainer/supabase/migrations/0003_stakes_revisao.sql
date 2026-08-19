-- Handpath — Fase 1 (ajuste): revisão de stakes.
-- Ver handpath-ajustes-fase1-fase2.md. Blinds de Micro, Baixa e Média
-- mudam pros valores revisados; Alta é tier novo.
--
-- Micro também ganha buy-in mais profundo (1.000–4.000 em vez de
-- 500–2.000): com blinds 50/100 o buy-in original dava só 5–20BB de
-- stack efetivo, raso demais mesmo pra mesa de iniciante — confirmado
-- com o Arthur. Valor ajustado pra ficar na mesma proporção de BB das
-- outras stakes (10–40BB), não estava travado no documento original.

update public.stakes set
  small_blind = 50, big_blind = 100, min_buyin = 1000, max_buyin = 4000
  where id = 'micro';

update public.stakes set
  small_blind = 100, big_blind = 200, min_buyin = 2500, max_buyin = 10000
  where id = 'baixa';

update public.stakes set
  small_blind = 250, big_blind = 500, min_buyin = 5000, max_buyin = 20000
  where id = 'media';

insert into public.stakes (id, name, small_blind, big_blind, min_buyin, max_buyin)
  values ('alta', 'Alta', 500, 1000, 10000, 50000)
  on conflict (id) do nothing;
