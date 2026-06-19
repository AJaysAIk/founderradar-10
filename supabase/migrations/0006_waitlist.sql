-- FounderRadar · Waitlist + analytics
-- Public can join the waitlist; only the owner (admins) can read it.

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null check (position('@' in email) > 1),
  ref         text not null default 'direct',   -- campaign / source from ?ref=
  user_agent  text,
  note        text                              -- optional "what would you use it for"
);

-- One email can only join once.
create unique index if not exists waitlist_email_uniq on public.waitlist (lower(email));
create index if not exists waitlist_created_idx on public.waitlist (created_at desc);
create index if not exists waitlist_ref_idx on public.waitlist (ref);

alter table public.waitlist enable row level security;

-- Anyone may join.
create policy "waitlist: anyone insert" on public.waitlist
  for insert to anon, authenticated with check (true);

-- Only the owner may read the list.
create policy "waitlist: admin read" on public.waitlist
  for select using (public.is_admin());

-- ---- Aggregate usage stats for the owner dashboard (security definer) ----
-- Returns global counts without exposing any individual user's rows.
create or replace function public.owner_stats()
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  select json_build_object(
    'waitlist_total',     (select count(*) from public.waitlist),
    'signals_total',      (select count(*) from public.build_signals),
    'signals_completed',  (select count(*) from public.build_signals where status = 'completed'),
    'scans_today',        (select coalesce(sum(scans),0) from public.usage_counters where day = current_date),
    'contacts_total',     (select count(*) from public.founder_contacts),
    'testimonials_total', (select count(*) from public.testimonials),
    'active_users',       (select count(distinct user_id) from public.build_signals)
  ) into result;
  return result;
end $$;

revoke all on function public.owner_stats() from public;
grant execute on function public.owner_stats() to authenticated;
