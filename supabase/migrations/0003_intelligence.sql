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
