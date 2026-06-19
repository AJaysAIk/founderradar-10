# Evidence Collection — Setup & Use

A private, owner-only system for collecting attributable user testimonials and
ratings — built for personal review and for Global Talent visa evidence.

## What it captures (and why it's strong evidence)
Each entry records: **name, role/company, date, a 1–10 rating, the PMF
"would you miss it" signal, a free-text quote, and explicit consent to be
quoted.** Named, dated, attributable testimonials from real users are far
stronger evidence than anonymous numbers — an assessor can weigh "Gary, owner
of a plumbing firm, said X on this date" in a way they can't weigh a bare
average.

## One-time setup (after deploying)
1. Apply the migrations in the SQL editor (if you haven't): `0004_production.sql`
   then `0005_evidence.sql`.
2. Sign up / sign in to your live app with YOUR email.
3. Find your user id: Supabase → Authentication → Users → click your row → copy
   the UUID.
4. Supabase → Table Editor → `admins` table → Insert row → paste your UUID →
   Save.
That's it — you are now the only person who can see the Evidence Vault. The
allowlist lives in a table with no API access, so it can't be tampered with
from the app.

## Collecting feedback
- **Public link (anyone, no login):** share `https://YOUR-APP.vercel.app/share`.
  Text it to testers, put it in your beta email, drop it after a demo call.
- **In-app:** logged-in testers can leave a testimonial at the bottom of the
  TELEMETRY page.

## Reviewing & exporting (owner only)
Open the **EVIDENCE** tab (S-09). You'll see:
- Headline stats: response count, average rating, NPS, PMF %, and how many are
  quotable (consented).
- Every testimonial with name, role, date, rating, and source.
- A "show only quotable" filter — use this when assembling material you intend
  to quote publicly.
- **↓ CSV** for your records / spreadsheets.
- **⎙ PDF** (print) for a clean evidence portfolio document — the print view
  includes emails for verification; the screen view hides them.

## Evidence tips for a Global Talent application
- Prioritise entries where `consent_quote` is true — only quote people who
  agreed.
- Variety helps: testimonials from different roles/companies read as broad
  traction, not one friend.
- The dated CSV is a contemporaneous record — keep exporting it periodically so
  you have a timeline, not just a snapshot.
- Pair the testimonials with your usage stats (signals created, scans run) for a
  fuller picture.

> Not legal/immigration advice — evidence requirements change and are assessed
> case by case. Check the current Tech Nation / endorsing body criteria, and
> consider an immigration adviser for how best to present it.
