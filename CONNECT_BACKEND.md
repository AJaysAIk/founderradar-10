# Connect the Backend (≈15 minutes, click-by-click)

You'll do these in your own browser — they involve your accounts and keys,
which only you should hold. Free tiers are fine for everything except the
Anthropic API, which is pay-as-you-go (a few pence per scan).

## 1 · Create the Supabase project (~3 min)
1. Go to **supabase.com** → Sign up / sign in → **New project**.
2. Name it `founderradar`, set a database password (save it somewhere safe), pick the region closest to you (e.g. London), create.
3. Wait ~2 minutes for it to provision.

## 2 · Create the database (~2 min)

> Already ran an older setup_all.sql? Just run the new `supabase/migrations/0003_intelligence.sql` on its own — it only adds columns, nothing is lost.
1. In the left sidebar: **SQL Editor** → **New query**.
2. Open `supabase/setup_all.sql` from this project in a text editor, copy ALL of it, paste, press **Run**.
3. You should see "Success. No rows returned". That's the four tables, all security rules, and live-sync in one shot.

## 3 · Get your two frontend keys (~1 min)
1. Sidebar: **Project Settings → API**.
2. Copy **Project URL** and the **anon public** key.
3. In the project folder on your Mac, duplicate `.env.example`, rename it `.env`, and paste them in:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
4. Restart `npm run dev`. The app now shows the login screen — create your account there. (If sign-in says "email not confirmed", check your inbox, or turn off **Authentication → Providers → Email → Confirm email** while testing.)

At this point: accounts, signals, CRM, and feedback all persist for real.
Only the AI scan still needs steps 4–5.

## 4 · Get an Anthropic API key (~3 min)
1. Go to **console.anthropic.com** → sign up → **API Keys** → create one.
2. Add a small amount of credit (Billing). Keep the key secret — it's money.

## 5 · Deploy the two AI workers (~5 min, Terminal)
```bash
# one-time installs
brew install supabase/tap/supabase     # Supabase CLI
supabase login                          # opens browser, approve

# from the founderradar folder:
cd ~/path/to/founderradar
supabase link --project-ref XXXX        # XXXX = the id in your project URL
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
supabase functions deploy triangulate
supabase functions deploy boardroom
supabase functions deploy coach
supabase functions deploy prospect
```

Done. Submit a pain signal on the **SIGNALS** page and watch the real
pipeline run: Cynic → Data Anchor → Editor, landing with citations, roadmap,
MVP, GTM, and outreach scripts — and it survives page refreshes.

## 6 · Put it on the internet (optional, ~4 min)
1. Push the folder to a GitHub repo (GitHub Desktop is the easy way).
2. **vercel.com** → Add New Project → import the repo (framework: Vite).
3. Add the same two `VITE_...` env vars in Vercel's settings → Deploy.

## If something breaks
- **Login loop / blank after login** → check both values in `.env`, restart `npm run dev`.
- **Scan stuck on "scanning"** → Supabase dashboard → **Edge Functions → triangulate → Logs**; usually a missing/invalid `ANTHROPIC_API_KEY` secret.
- **Scan instantly "failed"** → open the signal row in **Table Editor → build_signals**; the `status_detail` column tells you why.
