# Waitlist + Analytics — Setup & Distribution Playbook

## Setup (~2 min)
1. Apply `supabase/migrations/0006_waitlist.sql` in the SQL editor.
2. You must already be in the `admins` table (from the evidence setup) — the
   ANALYTICS page is owner-only and uses that same allowlist.

## How it works
- The **landing page** (`/welcome`) now leads with a waitlist email capture
  instead of a sign-in button.
- Every signup records the `?ref=` value from the URL. No ref = `direct`.
- The **ANALYTICS** page (S-10, owner-only) shows: total waitlist, active users,
  signals run/completed, scans today, testimonials — plus a growth curve, a
  signups-by-source chart, and the recent-signups list. Export the full list to
  CSV anytime.

## The distribution part (how you get to 1,000)
The whole point of `?ref=` is to learn which channel works so you can pour fuel
on it. Use a different ref per channel:

| Where you post | Link to share |
| --- | --- |
| Twitter/X | `https://YOUR-APP.vercel.app/welcome?ref=twitter` |
| A specific tweet | `?ref=tw_launch` |
| Reddit (r/startups) | `?ref=reddit_startups` |
| Product Hunt | `?ref=producthunt` |
| LinkedIn | `?ref=linkedin` |
| A newsletter | `?ref=somenewsletter` |
| IndieHackers | `?ref=indiehackers` |

Then watch SIGNUPS BY SOURCE. If `reddit_startups` is 60% of signups, that's
where you go deeper. If a channel converts to zero, stop spending time there.

### Tactics that actually fill a waitlist
- **Build in public**: post the thing you're building, screenshots, the
  Graveyard, the score that came back 8/100. People follow the story, then join.
- **Give before you ask**: share a genuinely useful teardown of a market using
  the app's own output, end with the link.
- **Launch surfaces**: Product Hunt, a Show IH post, relevant subreddits (read
  their self-promo rules first), Hacker News "Show HN" if it's polished.
- **One-to-one**: DM 20 founders who'd actually use it. Ten warm signups beat a
  hundred cold ones for early signal.

### A waitlist of 1,000 IS evidence
For your Global Talent application, a waitlist built by distribution is real
demand evidence. The CSV is your dated record; the source chart shows you
created the traction deliberately, not by luck. Keep periodic CSV exports so you
have a growth timeline.

> Don't buy signups or use fake emails — for visa evidence (and your own sanity)
> a smaller real list beats a big fake one. Assessors and investors both check.
