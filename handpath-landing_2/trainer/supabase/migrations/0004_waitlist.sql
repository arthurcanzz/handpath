-- Handpath — waitlist da landing page (handpath-landing_2/landing/).
--
-- OBSOLETA — NÃO APLICAR. Mudança de decisão em
-- ../../handpath-fluxo-integrado.md: a landing não usa mais waitlist, os
-- CTAs linkam direto pro login/signup real em trainer/ui/. A landing não
-- fala mais com Supabase (supabase-config.js/supabase-client.js/
-- vendor/supabase.min.js foram removidos de landing/). Arquivo mantido só
-- como registro histórico de schema.
--
-- Reaproveita o MESMO projeto Supabase do trainer/ (só pra não introduzir
-- um serviço novo de e-mail/backend) em vez de ganhar uma tabela própria.
-- A landing chama isso sem login (client não autenticado, role `anon`),
-- então o único acesso concedido é INSERT — nenhuma policy/grant de
-- SELECT/UPDATE/DELETE pra `anon`, pra não expor a lista de e-mails via
-- anon key (ela é pública por design, ver landing/supabase-config.js).

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  lang text,
  created_at timestamptz not null default now()
);

-- Evita duplicata (mesmo e-mail em maiúsc./minúsc. diferentes) sem
-- precisar de policy de SELECT pro client checar antes de inserir.
create unique index waitlist_email_lower_key on public.waitlist (lower(email));

alter table public.waitlist enable row level security;

create policy "qualquer um pode entrar na waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

grant insert on public.waitlist to anon, authenticated;
