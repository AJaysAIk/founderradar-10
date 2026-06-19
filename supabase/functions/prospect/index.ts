// supabase/functions/prospect/index.ts
// FounderRadar · AI Prospector
// POST { build_signal_id: uuid } → publicly-sourced outreach prospects for the
// selected opportunity, each with a source link and a suggested opener.
//
// Scope note: this researches PUBLIC business sources only (forums, company
// sites, public posts about the pain). It returns business prospects with the
// public source they were found in — standard sales prospecting, nothing more.

import { callModel, cors, parseStrictJson, scrubDeep, userClient } from "../_shared/intel.ts";

type Prospect = {
  name: string;            // person or business name as publicly listed
  role: string;
  company: string;
  region: string;
  why_relevant: string;    // ties to the signal's pain/persona
  source_url: string;      // the public page they were found on
  channel: "email" | "linkedin" | "x" | "reddit" | "web";
  opener: string;          // first-touch line referencing their public post/context
};

const PROSPECTOR_SYSTEM = `You are THE PROSPECTOR. Given a build brief (problem,
persona, citations), search the web for 4-6 outreach prospects: business owners,
operators, or companies that publicly match the target persona — ideally people
who have publicly posted about this exact pain (forum threads, reviews, public
posts) or run businesses squarely in the persona.

Hard rules:
- PUBLIC sources only. Every prospect MUST include the source_url where you
  found them. No source, no prospect.
- Prefer people already talking about the pain in public; second-best, companies
  that obviously live the persona.
- Never invent names. If the web gives you fewer than 4 genuine prospects,
  return fewer.
- openers must reference their actual public context, under 35 words, no flattery.

Output ONLY a JSON array of:
[{"name": str, "role": str, "company": str, "region": str, "why_relevant": str,
  "source_url": str, "channel": "email"|"linkedin"|"x"|"reddit"|"web", "opener": str}]`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const { build_signal_id } = await req.json().catch(() => ({}));
  if (!build_signal_id) {
    return new Response(JSON.stringify({ error: "build_signal_id_required" }), {
      status: 400, headers: { ...cors, "content-type": "application/json" },
    });
  }

  const db = userClient(req);
  const { data: brief, error } = await db
    .from("build_signals")
    .select("problem_statement, target_persona, citations, market_potential")
    .eq("id", build_signal_id)
    .single();
  if (error || !brief) {
    return new Response(JSON.stringify({ error: "not_found_or_forbidden" }), {
      status: 404, headers: { ...cors, "content-type": "application/json" },
    });
  }

  try {
    const ask = (reminder = "") =>
      callModel({
        system: PROSPECTOR_SYSTEM,
        user: JSON.stringify(brief) + reminder,
        maxTokens: 4000,
        temperature: 0.3,
        webSearch: true,
      });
    let parsed: Prospect[];
    try {
      parsed = parseStrictJson<Prospect[]>(await ask());
    } catch {
      parsed = parseStrictJson<Prospect[]>(
        await ask("\n\nREMINDER: reply with ONLY the JSON array. No prose before or after it."),
      );
    }
    const prospects = scrubDeep(parsed).filter((p) => p.source_url?.startsWith("http"));
    return new Response(JSON.stringify({ prospects }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err).slice(0, 300) }), {
      status: 500, headers: { ...cors, "content-type": "application/json" },
    });
  }
});
