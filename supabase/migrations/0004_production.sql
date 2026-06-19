-- FounderRadar · v1.0 production hardening
-- Per-user daily scan quota (protects your AI bill from a runaway beta user).

create table if not exists public.usage_counters (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null default current_date,
  scans      integer not null default 0,
  primary key (user_id, day)
);

alter table public.usage_counters enable row level security;

create policy "usage: owner read" on public.usage_counters
  for select using ((select auth.uid()) = user_id);

-- Atomic increment + quota check. Returns true if allowed, false if over limit.
create or replace function public.consume_scan(p_limit int default 25)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
begin
  insert into public.usage_counters (user_id, day, scans)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day)
  do update set scans = usage_counters.scans + 1
  returning scans into current_count;

  return current_count <= p_limit;
end $$;

revoke all on function public.consume_scan(int) from public;
grant execute on function public.consume_scan(int) to authenticated;
