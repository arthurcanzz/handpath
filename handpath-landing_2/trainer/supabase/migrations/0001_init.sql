-- Handpath — Fase 1: contas e fichas (bankroll) persistentes.
--
-- Escopo desta migration: catálogo de planos e stakes, perfil do usuário
-- (bankroll), sessões de mesa (buy-in/cash-out), e as funções que são a
-- ÚNICA forma de alterar bankroll a partir do client. Nenhuma policy de
-- INSERT/UPDATE é concedida em profiles/sessions para authenticated —
-- toda escrita de fichas passa pelas functions SECURITY DEFINER abaixo.
--
-- Escopo que FICA DE FORA por decisão consciente (ver handpath-game-upgrade-
-- prompt.md): o resultado da mão (quem ganhou o pote) continua calculado
-- 100% no client (trainer/engine/). O servidor só valida buy-in e cash-out.
-- Um usuário técnico pode inflar o valor de cash-out via DevTools nesta
-- fase — gap conhecido e aceito para a fase de validação, não dinheiro
-- real. Fechar isso exigiria portar o motor de poker pro servidor.

-- ============================================================
-- 1. Catálogos: plans e stakes
-- ============================================================

create table public.plans (
  id text primary key,
  name text not null,
  refill_amount bigint not null check (refill_amount > 0),
  refill_interval interval not null
);

insert into public.plans (id, name, refill_amount, refill_interval) values
  ('free',    'Free',    5000,  interval '6 hours'),
  ('starter', 'Starter', 10000, interval '4 hours'),
  ('pro',     'Pro',     20000, interval '3 hours'),
  ('elite',   'Elite',   40000, interval '2 hours');

create table public.stakes (
  id text primary key,
  name text not null,
  small_blind bigint not null check (small_blind > 0),
  big_blind bigint not null check (big_blind > small_blind),
  min_buyin bigint not null check (min_buyin > 0),
  max_buyin bigint not null check (max_buyin >= min_buyin)
);

insert into public.stakes (id, name, small_blind, big_blind, min_buyin, max_buyin) values
  ('micro', 'Micro', 10,  20,  500,   2000),
  ('baixa', 'Baixa', 50,  100, 2500,  10000),
  ('media', 'Média', 100, 200, 5000,  20000);

alter table public.plans enable row level security;
alter table public.stakes enable row level security;

create policy "plans são visíveis para usuários autenticados"
  on public.plans for select
  to authenticated
  using (true);

create policy "stakes são visíveis para usuários autenticados"
  on public.stakes for select
  to authenticated
  using (true);

grant select on public.plans to authenticated;
grant select on public.stakes to authenticated;

-- ============================================================
-- 2. profiles — 1:1 com auth.users, dono do bankroll
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null references public.plans (id) default 'free',
  bankroll bigint not null default 0 check (bankroll >= 0),
  last_refill_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "usuário vê o próprio perfil"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

grant select on public.profiles to authenticated;

-- Cria o profile automaticamente no signup, já com o bankroll inicial
-- igual ao primeiro refill do plano Free (valor de partida, ajustável).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, plan, bankroll, last_refill_at)
  values (new.id, 'free', (select refill_amount from public.plans where id = 'free'), now());
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. sessions — uma linha por "sentada" numa mesa (buy-in → cash-out)
-- ============================================================

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stake_id text not null references public.stakes (id),
  buyin_amount bigint not null check (buyin_amount > 0),
  cashout_amount bigint check (cashout_amount >= 0),
  status text not null default 'active' check (status in ('active', 'completed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Só uma sessão ativa por usuário por vez (mesa única na Fase 1).
create unique index one_active_session_per_user
  on public.sessions (user_id)
  where status = 'active';

alter table public.sessions enable row level security;

create policy "usuário vê as próprias sessões"
  on public.sessions for select
  to authenticated
  using (user_id = auth.uid());

grant select on public.sessions to authenticated;

-- ============================================================
-- 4. Funções — única via de escrita em bankroll/sessions
-- ============================================================

-- Reivindica o refill periódico de fichas grátis, se já passou o
-- intervalo do plano do usuário desde o último refill.
create function public.claim_refill()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile public.profiles%rowtype;
  v_plan public.plans%rowtype;
  v_next_refill_at timestamptz;
begin
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found then
    raise exception 'perfil não encontrado';
  end if;

  select * into v_plan from public.plans where id = v_profile.plan;
  v_next_refill_at := v_profile.last_refill_at + v_plan.refill_interval;

  if now() < v_next_refill_at then
    return jsonb_build_object(
      'claimed', false,
      'next_refill_at', v_next_refill_at,
      'bankroll', v_profile.bankroll
    );
  end if;

  update public.profiles
    set bankroll = bankroll + v_plan.refill_amount,
        last_refill_at = now()
    where id = auth.uid()
    returning bankroll into v_profile.bankroll;

  return jsonb_build_object(
    'claimed', true,
    'amount', v_plan.refill_amount,
    'bankroll', v_profile.bankroll,
    'next_refill_at', now() + v_plan.refill_interval
  );
end;
$$;

-- Buy-in: debita do bankroll e abre uma sessão ativa na stake escolhida.
create function public.buy_in(p_stake_id text, p_amount bigint)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_stake public.stakes%rowtype;
  v_bankroll bigint;
  v_session_id uuid;
begin
  select * into v_stake from public.stakes where id = p_stake_id;
  if not found then
    raise exception 'stake inválida: %', p_stake_id;
  end if;

  if p_amount < v_stake.min_buyin or p_amount > v_stake.max_buyin then
    raise exception 'buy-in fora da faixa permitida (% a %)', v_stake.min_buyin, v_stake.max_buyin;
  end if;

  if exists (select 1 from public.sessions where user_id = auth.uid() and status = 'active') then
    raise exception 'já existe uma sessão ativa — saia da mesa atual antes de sentar em outra';
  end if;

  select bankroll into v_bankroll from public.profiles where id = auth.uid() for update;
  if v_bankroll < p_amount then
    raise exception 'saldo insuficiente';
  end if;

  update public.profiles set bankroll = bankroll - p_amount where id = auth.uid();

  insert into public.sessions (user_id, stake_id, buyin_amount, status)
    values (auth.uid(), p_stake_id, p_amount, 'active')
    returning id into v_session_id;

  return v_session_id;
end;
$$;

-- Cash-out: encerra a sessão e credita o saldo final de volta no bankroll.
-- p_final_chips vem do client (motor de poker roda no browser na Fase 1
-- — ver nota de escopo no topo do arquivo). O cap de segurança abaixo é
-- só uma rede contra bug óbvio, não anti-cheat de verdade.
create function public.cash_out(p_session_id uuid, p_final_chips bigint)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session public.sessions%rowtype;
  v_capped bigint;
  v_new_bankroll bigint;
begin
  if p_final_chips < 0 then
    raise exception 'valor de cash-out inválido';
  end if;

  select * into v_session from public.sessions
    where id = p_session_id and user_id = auth.uid()
    for update;
  if not found then
    raise exception 'sessão não encontrada';
  end if;
  if v_session.status <> 'active' then
    raise exception 'sessão já encerrada';
  end if;

  v_capped := least(p_final_chips, v_session.buyin_amount * 1000);

  update public.sessions
    set status = 'completed', cashout_amount = v_capped, ended_at = now()
    where id = p_session_id;

  update public.profiles
    set bankroll = bankroll + v_capped
    where id = auth.uid()
    returning bankroll into v_new_bankroll;

  return v_new_bankroll;
end;
$$;

revoke execute on function public.claim_refill() from public;
revoke execute on function public.buy_in(text, bigint) from public;
revoke execute on function public.cash_out(uuid, bigint) from public;

grant execute on function public.claim_refill() to authenticated;
grant execute on function public.buy_in(text, bigint) to authenticated;
grant execute on function public.cash_out(uuid, bigint) to authenticated;
