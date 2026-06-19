-- ============================================================
-- FounderRadar · Data Layer
-- Postgres 15 / Supabase
-- Four persistent collections, strict per-row ownership RLS.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------------------------------------------------------

create type public.signal_status as enum ('scanning', 'completed', 'failed');

create type public.contact_stage as enum (
  'identified', 'contacted', 'replied', 'call_booked', 'pilot', 'churned'
);

-- ---------- pain_signals ----------------------------------------------------
-- Raw, unstructured market pain captured from the wild.

create table public.pain_signals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  raw_text      text not null check (char_length(raw_text) between 3 and 20000),
  source        text not null default 'manual',          -- e.g. reddit, x, g2, interview
  source_url    text,
  platform_vec  jsonb not null default '{}'::jsonb,       -- {platform, subreddit, upvotes, ...}
  raw_log       text[] not null default '{}',             -- untouched string log lines
  captured_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index pain_signals_user_idx     on public.pain_signals (user_id, created_at desc);
create index pain_signals_platform_gin on public.pain_signals using gin (platform_vec);

-- ---------- build_signals ----------------------------------------------------
-- A validated build thesis derived from one or more pain signals.

create table public.build_signals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  pain_signal_id    uuid references public.pain_signals (id) on delete set null,
  problem_statement text not null,
  validation_score  numeric(5,2) check (validation_score between 0 and 100),
  target_persona    jsonb not null default '{}'::jsonb,    -- {role, company_size, budget, watering_holes[]}
  roadmap           jsonb not null default '[]'::jsonb,    -- [{phase, weeks, objective, kill_criteria}]
  risk_profile      jsonb not null default '{}'::jsonb,    -- Stage 1 (Cynic) output
  citations         jsonb not null default '[]'::jsonb,    -- Stage 2: [{quote, source, url, weight}]
  status            public.signal_status not null default 'scanning',
  status_detail     text,                                   -- last pipeline stage marker / error
  scan_started_at   timestamptz,
  scan_finished_at  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index build_signals_user_idx   on public.build_signals (user_id, updated_at desc);
create index build_signals_status_idx on public.build_signals (user_id, status);
create index build_signals_cite_gin   on public.build_signals using gin (citations);

-- ---------- founder_contacts -------------------------------------------------
-- CRM ledger: every lead is pinned to the build signal it validates.

create table public.founder_contacts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  build_signal_id  uuid not null references public.build_signals (id) on delete cascade,
  full_name        text not null,
  company          text,
  role             text,
  channel          text not null default 'email',           -- email | x | linkedin | warm-intro
  stage            public.contact_stage not null default 'identified',
  lead_metrics     jsonb not null default '{}'::jsonb,      -- {fit_score, intent_score, acv_estimate}
  milestones       jsonb not null default '[]'::jsonb,      -- [{at, kind, note}]
  last_touch_at    timestamptz,
  next_touch_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index founder_contacts_user_idx   on public.founder_contacts (user_id, updated_at desc);
create index founder_contacts_signal_idx on public.founder_contacts (build_signal_id);
create index founder_contacts_stage_idx  on public.founder_contacts (user_id, stage);

-- ---------- pilot_feedback ---------------------------------------------------
-- Platform scoring analytics from pilot users.

create table public.pilot_feedback (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  build_signal_id  uuid references public.build_signals (id) on delete set null,
  contact_id       uuid references public.founder_contacts (id) on delete set null,
  nps              smallint check (nps between 0 and 10),
  pmf_score        smallint check (pmf_score between 1 and 4),   -- "very disappointed" ladder
  scores           jsonb not null default '{}'::jsonb,           -- {accuracy, speed, citations_trust}
  verbatim         text,
  created_at       timestamptz not null default now()
);

create index pilot_feedback_user_idx   on public.pilot_feedback (user_id, created_at desc);
create index pilot_feedback_signal_idx on public.pilot_feedback (build_signal_id);

-- ---------- updated_at trigger ----------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger build_signals_touch    before update on public.build_signals
  for each row execute function public.touch_updated_at();
create trigger founder_contacts_touch before update on public.founder_contacts
  for each row execute function public.touch_updated_at();

-- ---------- Row-Level Security ------------------------------------------------
-- Strict ownership: every verb on every table requires auth.uid() = user_id.
-- (select auth.uid()) form lets the planner cache the call per-statement.

alter table public.pain_signals     enable row level security;
alter table public.build_signals    enable row level security;
alter table public.founder_contacts enable row level security;
alter table public.pilot_feedback   enable row level security;

-- pain_signals
create policy "pain_signals: owner select" on public.pain_signals
  for select using ((select auth.uid()) = user_id);
create policy "pain_signals: owner insert" on public.pain_signals
  for insert with check ((select auth.uid()) = user_id);
create policy "pain_signals: owner update" on public.pain_signals
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "pain_signals: owner delete" on public.pain_signals
  for delete using ((select auth.uid()) = user_id);

-- build_signals
create policy "build_signals: owner select" on public.build_signals
  for select using ((select auth.uid()) = user_id);
create policy "build_signals: owner insert" on public.build_signals
  for insert with check ((select auth.uid()) = user_id);
create policy "build_signals: owner update" on public.build_signals
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "build_signals: owner delete" on public.build_signals
  for delete using ((select auth.uid()) = user_id);

-- founder_contacts
create policy "founder_contacts: owner select" on public.founder_contacts
  for select using ((select auth.uid()) = user_id);
create policy "founder_contacts: owner insert" on public.founder_contacts
  for insert with check ((select auth.uid()) = user_id);
create policy "founder_contacts: owner update" on public.founder_contacts
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "founder_contacts: owner delete" on public.founder_contacts
  for delete using ((select auth.uid()) = user_id);

-- pilot_feedback
create policy "pilot_feedback: owner select" on public.pilot_feedback
  for select using ((select auth.uid()) = user_id);
create policy "pilot_feedback: owner insert" on public.pilot_feedback
  for insert with check ((select auth.uid()) = user_id);
create policy "pilot_feedback: owner update" on public.pilot_feedback
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "pilot_feedback: owner delete" on public.pilot_feedback
  for delete using ((select auth.uid()) = user_id);

-- ---------- Realtime ------------------------------------------------------------
-- The dashboard hydrates over websockets; only build_signals needs the firehose.

alter publication supabase_realtime add table public.build_signals;
-- FounderRadar · v0.2 "Advanced" migration
-- BuildSignal grows into the full opportunity object: outreach scripts,
-- market potential, MVP feature list, GTM strategy. Realtime widens to CRM
-- and feedback so React Query caches invalidate live.

alter table public.build_signals
  add column if not exists outreach_scripts jsonb not null default '[]'::jsonb,
  -- [{channel: 'email'|'x'|'linkedin', subject, body, persona_hook}]
  add column if not exists market_potential jsonb not null default '{}'::jsonb,
  -- {tam_note, sam_note, wedge, pricing_anchor}
  add column if not exists mvp_features jsonb not null default '[]'::jsonb,
  -- [{feature, why, effort: 'S'|'M'|'L'}]
  add column if not exists gtm jsonb not null default '{}'::jsonb;
  -- {motion, channels: [str], first_10_customers}

alter publication supabase_realtime add table public.founder_contacts;
alter publication supabase_realtime add table public.pilot_feedback;
-- FounderRadar · v0.4 "Intelligence" migration
-- Weighted scoring, validation planning, UK setup guidance, dual-mode scans.

alter table public.build_signals
  add column if not exists scan_mode text not null default 'manual',
  -- 'manual' | 'web'  (web = Stage 0 Scout researches the open web first)
  add column if not exists score_breakdown jsonb not null default '{}'::jsonb,
  -- {frequency, urgency, severity, willingness_to_pay, founder_fit: 0-100 each}
  add column if not exists validation_plan jsonb not null default '{}'::jsonb,
  -- {interview_questions: [str], assumptions: [{assumption, test, kill_threshold}],
  --  sprint: [{day, task, goal, done}]}
  add column if not exists uk_setup jsonb not null default '{}'::jsonb;
  -- {structure, companies_house, hmrc, vat, insurance, first_invoice}
