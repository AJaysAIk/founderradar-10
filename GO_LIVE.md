# FounderRadar — Beta → Production on the Internet

You're shipping a **public beta**: real strangers, a real URL, on a free hosting
tier. This guide takes you from localhost to live, then to running the test.

---

## Stage 0 · Apply the production database update (~1 min)
Supabase dashboard → SQL Editor → paste `supabase/migrations/0004_production.sql`
→ Run. This adds the per-user scan quota (25/day) that protects your AI bill from
one over-enthusiastic tester. Nothing existing is touched.

---

## Stage 1 · Put the code on GitHub (~5 min)
The easy way, no Git knowledge needed:
1. Install **GitHub Desktop** (desktop.github.com), sign in.
2. File → Add Local Repository → pick your `founderradar` folder → "create a repository".
3. **Important:** make sure `.env` is NOT included. There's a `.gitignore` in the
   project that already excludes it — confirm `.env` is not in the file list before
   you commit. Your keys must never go to GitHub.
4. Click "Publish repository". Keep it **Private**.

---

## Stage 2 · Deploy the frontend to Vercel (~5 min)
1. **vercel.com** → sign in with GitHub → Add New → Project → import your repo.
2. Framework preset: **Vite** (auto-detected). Leave build settings default.
3. Before deploying, open **Environment Variables** and add the two from your `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. You get a live URL like `founderradar.vercel.app`.

---

## Stage 3 · Tell Supabase about the new URL (~3 min)
Your auth emails and redirects need to know the public address.
1. Supabase → Authentication → **URL Configuration**.
2. Set **Site URL** to your Vercel URL (`https://founderradar.vercel.app`).
3. Add it to **Redirect URLs** too (and any custom domain later).
4. Authentication → Providers → Email: for a smoother beta, you can keep
   "Confirm email" ON (safer) — just tell testers to check their inbox.

The edge functions (triangulate, boardroom, coach, prospect) are already deployed
and work regardless of frontend URL — no change needed there.

---

## Stage 4 · Smoke test the live site (~5 min)
On the real URL, in an incognito window:
- [ ] Landing page loads at `/welcome`
- [ ] Sign up with a fresh email → confirm → sign in
- [ ] Run one scan on the SIGNALS page → it completes with a score + citations
- [ ] Refresh mid-scan → progress survives
- [ ] CRM → add a contact → it persists after refresh
- [ ] Try a 26th scan in a day → you get the friendly quota message (optional to verify)

If all green, you're live.

---

## Stage 5 · Run the beta (the actual quest)

### Pick your cohort
5–15 people is the sweet spot for a first beta. Best testers: actual early-stage
founders or wantrepreneurs — the people who feel the pain the app addresses.

### Give them a job, not a tour
Don't say "try my app." Say: **"Take a real idea you're chewing on, run it through
a scan, and tell me if the output would change what you do next week."** A specific
task surfaces real feedback; open-ended browsing doesn't.

### Capture feedback where it happens
The app already has the **TELEMETRY** page (NPS + the "very disappointed" PMF
question + verbatims). Ask every tester to log one entry after their first real
scan. That's your closed loop — watch the PMF number against the 40% line.

### The three questions that matter
1. "What did you expect to happen that didn't?" (finds broken mental models)
2. "Where did you get confused or stuck?" (finds UX bugs)
3. "Would you be disappointed if this went away? Why?" (finds product-market fit)

### Watch your costs
- Supabase free tier is generous; you'll likely stay inside it.
- Anthropic is the real meter. Each scan is a handful of model calls. The 25/day
  per-user quota caps exposure. Set a hard **spend limit** in console.anthropic.com
  → Billing so a surprise can't run away.

---

## Stage 6 · Before you call it "production" (the graduation checklist)
- [ ] Custom domain on Vercel (e.g. founderradar.io) + matching Supabase URLs
- [ ] An error reporter wired into the ErrorBoundary (Sentry free tier)
- [ ] A simple privacy note + terms (you're storing user data now)
- [ ] Email "from" name set in Supabase so confirmation mails look legit
- [ ] Decide the real per-user quota for paying vs free once you have usage data
- [ ] A way to contact you (support email on the landing page)

Alpha was "does it work for me?" Beta is "does it work for strangers?"
Production is "does it keep working for strangers while I sleep?" — that's the
checklist above.
