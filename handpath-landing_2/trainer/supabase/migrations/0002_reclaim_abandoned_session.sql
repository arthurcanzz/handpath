-- Handpath — Fase 1: resgate de sessão abandonada.
--
-- Bug descoberto em teste manual: se o usuário fecha a aba/navegador sem
-- clicar em "Sair da mesa", a sessão fica com status='active' pra sempre
-- (o índice único one_active_session_per_user existe assim de propósito,
-- ver 0001_init.sql) — e buy_in() corretamente recusa abrir uma segunda
-- mesa. Sem essa function, o usuário fica travado: bankroll já debitado,
-- sem sessão ativa jogável (o estado da mão só existe na memória do
-- browser que fechou) e sem conseguir comprar fichas de novo.
--
-- Resolução: ao logar, reclaim_abandoned_session() fecha a sessão órfã e
-- devolve exatamente o valor do buy-in original pro bankroll (net zero —
-- não perde, não ganha nada além do que já tinha antes de sentar). Não é
-- perfeitamente justo (se a pessoa estivesse ganhando quando a aba fechou,
-- perde esse ganho; se estivesse perdendo, "recupera" o prejuízo) — mas é
-- a única opção segura sem persistir histórico de mão a mão, e não cria
-- fichas do nada (sempre devolve exatamente o que foi debitado). Chamada
-- automaticamente no login, ver trainer/ui/session.js.

create function public.reclaim_abandoned_session()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.sessions%rowtype;
  v_new_bankroll bigint;
begin
  select * into v_session from public.sessions
    where user_id = auth.uid() and status = 'active'
    for update;

  if not found then
    return jsonb_build_object('reclaimed', false);
  end if;

  update public.sessions
    set status = 'completed', cashout_amount = v_session.buyin_amount, ended_at = now()
    where id = v_session.id;

  update public.profiles
    set bankroll = bankroll + v_session.buyin_amount
    where id = auth.uid()
    returning bankroll into v_new_bankroll;

  return jsonb_build_object(
    'reclaimed', true,
    'amount', v_session.buyin_amount,
    'bankroll', v_new_bankroll
  );
end;
$$;

revoke execute on function public.reclaim_abandoned_session() from public;
grant execute on function public.reclaim_abandoned_session() to authenticated;
