-- Handpath — Fase 5: resumo agregado da sessão (relatório pós-mesa).
--
-- Persistência HÍBRIDA, decidida com o Arthur: o histórico completo de
-- mãos (cartas de todos, ações, resultado) fica só em memória do browser —
-- é dele que o relatório e o replay são montados, na mesma sessão em que
-- foram jogados. Aqui vai só um resumo agregado e pequeno por sessão.
--
-- Por que persistir alguma coisa em vez de nada: rating/ELO de habilidade
-- e detecção de vazamento recorrente (ver handpath-retencao-monetizacao-
-- realismo.md) precisam comparar sessões ao longo do tempo. Guardar o
-- agregado desde já constrói essa base histórica sem o custo de uma tabela
-- de mãos completa no free tier de 500MB.
--
-- Por que NÃO estender cash_out com um terceiro parâmetro: cash_out é a
-- função do caminho de dinheiro. Mudar a assinatura dela exigiria
-- drop + recreate, e um erro ali afeta bankroll de verdade. Uma RPC
-- separada, que só escreve a coluna de resumo, deixa o caminho de saldo
-- intocado.

alter table public.sessions
  add column summary jsonb;

-- Grava (ou regrava) o resumo de uma sessão do próprio usuário.
-- Não mexe em bankroll, status nem cashout_amount — só na coluna summary.
create function public.save_session_summary(p_session_id uuid, p_summary jsonb)
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
