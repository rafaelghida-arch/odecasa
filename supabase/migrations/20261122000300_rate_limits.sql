-- Limites de uso da IA (contas e visitantes). Só o servidor (service_role) usa.
-- A chave é um hash (nunca o IP ou e-mail em claro).

create table public.rate_limits (
  bucket       text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
alter table public.rate_limits force row level security;
revoke all on public.rate_limits from anon, authenticated;
-- Sem políticas: anon e authenticated não leem nem escrevem.

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into public.rate_limits as r (bucket, window_start, count)
  values (p_bucket, v_window, 1)
  on conflict (bucket, window_start)
  do update set count = r.count + 1
  returning r.count into v_count;

  -- Limpeza oportunista de janelas antigas.
  delete from public.rate_limits where window_start < now() - interval '2 days';

  return query select v_count <= p_limit,
                      greatest(p_limit - v_count, 0),
                      v_window + make_interval(secs => p_window_seconds);
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
