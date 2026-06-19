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
