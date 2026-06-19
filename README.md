# FounderRadar

Market pain, triangulated. Raw founder noise in → cited, risk-scored build briefs out.

## Stack

- **Frontend** — Vite + React 18 + TypeScript + Tailwind + Framer Motion (deployed on Vercel)
- **Data layer** — Supabase Postgres, four collections, strict per-row RLS (`auth.uid() = user_id`)
- **Intelligence layer** — Supabase Edge Functions (Deno) running a 3-stage triangulation pipeline against the Anthropic API

## Repo map

```
supabase/
  schema.sql                      # tables, enums, indexes, RLS, realtime publication
  migrations/0002_advanced.sql    # outreach_scripts, market_potential, mvp_features, gtm
  functions/
    _shared/intel.ts              # model wrapper, JSON guard, anti-filler scrubber, clients
    triangulate/index.ts          # Cynic → Data Anchor → Editor pipeline worker
    boardroom/index.ts            # persona debate worker (CFO / CTO / Target User)
src/
  lib/api.ts                      # entity bridge (Base44-style `entities.*` surface) + demo store
  hooks/useEntities.ts            # TanStack Query hooks + realtime cache invalidation
  hooks/useBuildSignal.ts         # optimistic scan + websocket hydration + demo fallback
  components/GlassCard.tsx        # aesthetic-consistency primitive for all data surfaces
  components/ProtectedRoute.tsx   # session gate (Supabase Auth; demo mode passes through)
  components/RadarSweep.tsx       # signature scope instrument (scan status)
  components/Shell.tsx            # nav shell + kinetic headline + sign-out
  pages/Auth.tsx                  # login / register / password-reset flows
  pages/Onboarding.tsx            # S-01: Dave's live chat console → structured signal
  pages/Graveyard.tsx             # S-02: competitor × pain coverage matrix + headstones
  pages/Boardroom.tsx             # S-03: live persona debate over the roadmap
  pages/Signals.tsx               # S-04: pain intake → scan → roadmap/MVP/GTM/outreach/market
  pages/CRM.tsx                   # S-05: network map, stage funnel, lead ledger
  pages/Feedback.tsx              # S-06: NPS, PMF ladder, trust dimensions, verbatims
```

## v0.2 architecture (Base44 parity on Supabase)

| Capability | Implementation |
| --- | --- |
| Entities + per-row RLS | Postgres tables, `auth.uid() = user_id` on all four verbs |
| `marketResearchScan` / `InvokeLLM` | `triangulate` edge worker (3-stage pipeline, structured JSON out) |
| State management | TanStack Query; websocket `postgres_changes` → cache invalidation |
| Auth + ProtectedRoute | Supabase Auth (login / register / reset), session-gated routes |
| GlassCard + recharts + framer-motion | `GlassCard` primitive, CRM network map, funnel + NPS charts |
| Orchestration flow | PainSignal insert → BuildSignal create ('scanning') → worker → realtime sync |

The full opportunity object on `build_signals` now carries: roadmap, citations,
risk profile, **outreach_scripts** (one per channel, each opening with a verbatim
citation), **market_potential** (TAM/SAM/wedge/pricing anchor), **mvp_features**
(effort-sized), and **gtm** (motion, channels, first-10 plan).

## How the scan stays refresh-proof

1. Click **Run scan** → client optimistically renders `scanning`, then calls the
   `triangulate` edge function.
2. The worker flips `build_signals.status = 'scanning'` **synchronously, before
   it acks 202**. A hard refresh re-reads that row and lands straight back in
   the live state — no progress loss.
3. The pipeline runs detached via `EdgeRuntime.waitUntil`, writing a stage
   marker (`stage_1_cynic` → `stage_2_anchor` → `stage_3_editor`) into
   `status_detail` as it goes.
4. The client never polls: a `postgres_changes` websocket channel on the row
   hydrates every transition, ending in `completed` (with `roadmap` +
   `citations`) or `failed` (with a reason).

Citations are hard-verified server-side: any quote that is not a verbatim
substring of the raw payload is dropped before persisting. Stage 3's voice
rules are backstopped by a deterministic scrubber (`scrubFiller`) so banned
filler never reaches the database even if the model slips.

## Local dev

```bash
npm install
cp .env.example .env        # add your Supabase URL + anon key (or skip for demo mode)
npm run dev
```

No env vars → **demo mode**: the pipeline is simulated locally with realistic
fixtures so all three pages are fully explorable.

## Deploy

> Non-technical path: follow **CONNECT_BACKEND.md** — click-by-click, ~15 minutes.


### 1 · Supabase

```bash
supabase db push --file supabase/schema.sql        # or paste into the SQL editor
# then apply: supabase/migrations/0002_advanced.sql
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy triangulate
supabase functions deploy boardroom
supabase functions deploy coach
supabase functions deploy prospect
```

Realtime must be enabled for `public.build_signals` (the schema script adds it
to the `supabase_realtime` publication).

### 2 · Vercel

```bash
vercel        # framework preset: Vite
```

Set project env vars:

| Var | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<project>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | project anon key |

`vercel.json` already rewrites all routes to `index.html` for the SPA router.

## Security notes

- Every table denies by default; all four verbs require `auth.uid() = user_id`.
- Edge workers do the ownership check **through the caller's JWT** (RLS-scoped
  read) before the service-role client touches anything.
- The anon key is safe to ship to the browser; the service-role key and
  Anthropic key live only in Supabase function secrets.
