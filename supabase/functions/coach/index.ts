// supabase/functions/coach/index.ts
// FounderRadar · Idea Coach worker
// POST { message: string, history: [{role, text}], build_signal_id?: uuid }
// A deliberately critical coach: pushes on evidence, not enthusiasm.

import { callModel, cors, scrubDeep, userClient } from "../_shared/intel.ts";

const COACH_SYSTEM = `You are the FounderRadar IDEA COACH. You are warm but
ruthlessly evidence-driven. Rules:
- Never flatter. Never say an idea is great. Find the weakest load-bearing
  assumption and push on it with ONE pointed question or ONE concrete next test.
- Anchor to the brief context when provided (scores, citations, risks).
- Prefer "go talk to N people and ask X" over abstractions.
- 60 words max per reply. Plain words. No corporate filler.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const { message = "", history = [], build_signal_id = null } =
    await req.json().catch(() => ({}));
  if (!message.trim()) {
    return new Response(JSON.stringify({ error: "message_required" }), {
      status: 400, headers: { ...cors, "content-type": "application/json" },
    });
  }

  let brief: unknown = null;
  if (build_signal_id) {
    const db = userClient(req);
    const { data } = await db
      .from("build_signals")
      .select("problem_statement, validation_score, score_breakdown, risk_profile, citations")
      .eq("id", build_signal_id)
      .single();
    brief = data ?? null;
  }

  const reply = scrubDeep(await callModel({
    system: COACH_SYSTEM,
    user: JSON.stringify({ brief, history: (history as unknown[]).slice(-10), message }),
    maxTokens: 300,
    temperature: 0.7,
  }));

  return new Response(JSON.stringify({ reply }), {
    headers: { ...cors, "content-type": "application/json" },
  });
});
