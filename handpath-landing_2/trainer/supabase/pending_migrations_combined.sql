-- Handpath — catch-up combinado de 0003 + 0005 (0004/waitlist ficou de
-- fora de propósito: ver handpath-fluxo-integrado.md, decisão de tirar a
-- waitlist da landing — a tabela não vai ser criada).
--
-- NÃO é uma nova migration versionada (0001/0002/0003/0004/0005 em
-- trainer/supabase/migrations/ continuam sendo a fonte da verdade, uma por
-- fase). Este arquivo é só pra colar UMA VEZ no SQL Editor do Supabase e
-- "alcançar" o estado esperado, já que não dava pra confirmar com certeza
-- se a 0003 já tinha sido aplicada (sumiu do histórico do painel).
--
-- Por isso todo statement aqui é seguro de rodar de novo (idempotente):
-- se algo já existia com o valor certo, não muda nada; se não existia,
-- cria. Assume que as tabelas base (plans, stakes, profiles, sessions) já
-- existem — confirmado, app em produção rodando 0001/0002.

-- ============================================================
-- 0003 — revisão de stakes (idempotente por natureza: update + on conflict)
-- ============================================================

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

-- ============================================================
-- 0005 — resumo agregado de sessão (Fase 5)
-- ============================================================

alter table public.sessions
  add column if not exists summary jsonb;

create or replace function public.save_session_summary(p_session_id uuid, p_summary jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.sessions
    set summary = p_summary
    where id = p_session_id and user_id = auth.uid();

  if not found then
    raise exception 'sessão não encontrada';
  end if;
end;
$$;

revoke execute on function public.save_session_summary(uuid, jsonb) from public;
grant execute on function public.save_session_summary(uuid, jsonb) to authenticated;
