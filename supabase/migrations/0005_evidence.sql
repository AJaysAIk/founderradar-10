-- FounderRadar · Evidence collection
-- Attributable, dated testimonials + ratings. Public can INSERT; only the
-- owner (allowlisted admin) can SELECT the full stream.

-- 1) Admin allowlist: put your own user id here after you sign up.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
-- (No policies = nobody can read/write via the API; you manage rows in the
--  Supabase Table Editor. That itself keeps the allowlist tamper-proof.)

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- 2) Testimonials / evidence entries.
create table if not exists public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  -- submitter (null when submitted via the public link)
  user_id      uuid references auth.users (id) on delete set null,
  full_name    text not null check (char_length(full_name) between 1 and 120),
  role_company text,                         -- "Owner, Mott & Sons Plumbing"
  email        text,                         -- optional, for follow-up/verification
  rating       smallint not null check (rating between 1 and 10),
  would_miss   smallint check (would_miss between 1 and 3),  -- PMF: 1 not / 2 somewhat / 3 very
  quote        text not null check (char_length(quote) between 3 and 2000),
  consent_quote boolean not null default false,  -- may we quote you in materials?
  source       text not null default 'public'    -- 'public' | 'in_app'
);

alter table public.testimonials enable row level security;

-- Anyone (even anonymous) may submit a testimonial.
create policy "testimonials: anyone insert" on public.testimonials
  for insert to anon, authenticated with check (true);

-- Only the owner/admin may read the full stream.
create policy "testimonials: admin read" on public.testimonials
  for select using (public.is_admin());

create index if not exists testimonials_created_idx on public.testimonials (created_at desc);
