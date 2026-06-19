// supabase/functions/boardroom/index.ts
// FounderRadar · AI Boardroom worker
//
// POST { build_signal_id: uuid, transcript: Turn[], founder_line?: string }
// Returns the next debate turn from whichever persona has the strongest
// objection to the current state of the table.
//
// The frontend also ships a deterministic local debate engine as a fallback,
// so the Boardroom page works in demo mode without this function deployed.

import { callModel, cors, parseStrictJson, scrubDeep, userClient } from "../_shared/intel.ts";

type Turn = { persona: "cfo" | "cto" | "user" | "founder"; line: string; metric?: string };

const PERSONAS: Record<string, string> = {
  cfo: `You are the SKEPTICAL CFO at the boardroom table. You attack unit economics:
CAC payback, gross margin, burn vs roadmap weeks, pricing vs budget_band. One
objection per turn, anchored to a number from the brief. Max 40 words.`,
  cto: `You are the HYPER-TECHNICAL CTO. You attack feasibility: data access,
integration surface, latency, build-vs-buy, what breaks at 100x. One objection
per turn, anchored to a roadmap phase. Max 40 words.`,
  user: `You are the TARGET USER described in target_persona. You speak from lived
workflow pain. You either confirm the problem_statement matches your day or call
out where it misses. Quote your own reality. Max 40 words.`,
};

const MODERATOR = `You are the boardroom moderator. Given the build brief, the
transcript so far, and the founder's latest line, decide which ONE persona
(cfo, cto, user) speaks next — pick whoever has the strongest unresolved
objection. Output ONLY JSON: {"persona": "cfo"|"cto"|"user"}.
Vary speakers; never let one persona take three turns in a row.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const { build_signal_id, transcript = [], founder_line = "" } =
    await req.json().catch(() => ({}));
  if (!build_signal_id) {
    return new Response(JSON.stringify({ error: "build_signal_id_required" }), {
      status: 400, headers: { ...cors, "content-type": "application/json" },
    });
  }

  // RLS-scoped read: the caller only sees their own brief.
  const db = userClient(req);
  const { data: brief, error } = await db
    .from("build_signals")
    .select("problem_statement, validation_score, target_persona, roadmap, risk_profile, citations")
    .eq("id", build_signal_id)
    .single();
  if (error || !brief) {
    return new Response(JSON.stringify({ error: "not_found_or_forbidden" }), {
      status: 404, headers: { ...cors, "content-type": "application/json" },
    });
  }

  const tableState = JSON.stringify({ brief, transcript: transcript.slice(-12), founder_line });

  const { persona } = parseStrictJson<{ persona: "cfo" | "cto" | "user" }>(
    await callModel({ system: MODERATOR, user: tableState, maxTokens: 100, temperature: 0 }),
  );

  const line = scrubDeep(await callModel({
    system: PERSONAS[persona],
    user: tableState,
    maxTokens: 200,
    temperature: 0.8,
  }));

  const turn: Turn = { persona, line };
  return new Response(JSON.stringify({ turn }), {
    headers: { ...cors, "content-type": "application/json" },
  });
});
