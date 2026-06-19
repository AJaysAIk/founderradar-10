// supabase/functions/triangulate/index.ts
// FounderRadar · Intelligence Orchestration Layer
//
// POST { build_signal_id: uuid }
//
// Flow:
//   1. Verify the caller owns the row (RLS-scoped read with the user's JWT).
//   2. Flip status -> 'scanning' SYNCHRONOUSLY before returning 202, so a hard
//      page refresh re-hydrates straight into the live scanning state.
//   3. Run the 3-stage triangulation pipeline in the background
//      (EdgeRuntime.waitUntil) and persist each stage marker to status_detail.
//   4. Land on 'completed' with roadmap + citations, or 'failed' with a reason.

import {
  callModel,
  cors,
  parseStrictJson,
  scrubDeep,
  serviceClient,
  userClient,
} from "../_shared/intel.ts";

/** Call + parse with one retry on malformed JSON. */
async function callJson<T>(opts: Parameters<typeof callModel>[0]): Promise<T> {
  try {
    return parseStrictJson<T>(await callModel(opts));
  } catch (_e) {
    return parseStrictJson<T>(await callModel({
      ...opts,
      temperature: 0,
      user: opts.user + "\n\nREMINDER: output ONLY the complete, valid JSON. No prose. Be concise so the JSON fits.",
    }));
  }
}

// ---------------------------------------------------------------------------
// Pipeline types
// ---------------------------------------------------------------------------

type CynicReport = {
  failure_traps: Array<{ trap: string; why_it_kills: string; severity: 1 | 2 | 3 | 4 | 5 }>;
  distribution_bottlenecks: Array<{ channel: string; bottleneck: string }>;
  kill_question: string;
  survivability: number; // 0-100, the Cynic's grudging score
};

type Citation = {
  quote: string;        // verbatim evidence string, untouched
  source: string;       // platform / document name
  url: string | null;
  weight: number;       // 0-1 evidentiary weight
  signal: "pain" | "spend" | "workaround" | "churn";
};

type EditorBrief = {
  problem_statement: string;
  validation_score: number; // 0-100, triangulated from cynic + evidence density
  target_persona: {
    role: string;
    company_size: string;
    budget_band: string;
    watering_holes: string[];
  };
  roadmap: Array<{
    phase: string;
    weeks: number;
    objective: string;
    kill_criteria: string;
  }>;
  outreach_scripts: Array<{
    channel: "email" | "x" | "linkedin";
    subject: string;
    body: string;
    persona_hook: string;
  }>;
  market_potential: {
    tam_note: string;
    sam_note: string;
    wedge: string;
    pricing_anchor: string;
  };
  mvp_features: Array<{ feature: string; why: string; effort: "S" | "M" | "L" }>;
  gtm: { motion: string; channels: string[]; first_10_customers: string };
  score_breakdown: {
    frequency: number; urgency: number; severity: number;
    willingness_to_pay: number; founder_fit: number;
  };
  validation_plan: {
    interview_questions: string[];
    assumptions: Array<{ assumption: string; test: string; kill_threshold: string }>;
    sprint: Array<{ day: number; task: string; goal: string; done: boolean }>;
  };
  uk_setup: {
    structure: string; companies_house: string; hmrc: string;
    vat: string; insurance: string; first_invoice: string;
  };
};

// ---------------------------------------------------------------------------
// Stage prompts
// ---------------------------------------------------------------------------

const SCOUT_SYSTEM = `You are THE SCOUT, stage 0 of the pipeline. You research the
open web for live evidence of the market pain in the seed input. Search for real
complaints, prices paid for workarounds, churned-competitor stories, and forum
threads. Return PLAIN TEXT: a raw evidence log, one finding per line, in the form
"QUOTE-OR-FACT | source name | url". Verbatim quotes where possible. 6-14 lines.
No analysis, no recommendations — raw evidence only.`;

const CYNIC_SYSTEM = `You are THE CYNIC, stage 1 of a 3-stage market triangulation pipeline.
You have watched a thousand startups die. Your only job is to stress-test the raw
market input and name the precise ways this idea fails.

Output ONLY a JSON object with this exact shape, no prose around it:
{
  "failure_traps": [{"trap": str, "why_it_kills": str, "severity": 1-5}],
  "distribution_bottlenecks": [{"channel": str, "bottleneck": str}],
  "kill_question": str,
  "survivability": 0-100
}

Rules: be specific to THIS input, never generic. Name real channels, real buyer
objections, real switching costs. 3-6 failure traps. severity 5 = fatal.`;

const ANCHOR_SYSTEM = `You are THE DATA ANCHOR, stage 2 of the pipeline.
Your only job is extraction. From the raw payload, strip out verbatim evidence
strings: direct quotes, numbers, complaints, prices, workaround descriptions.

Output ONLY a JSON array of citation objects:
[{"quote": str, "source": str, "url": str|null, "weight": 0-1, "signal": "pain"|"spend"|"workaround"|"churn"}]

Hard rules:
- "quote" must be a VERBATIM substring of the raw payload, character for character.
- Never paraphrase, never invent, never embellish. If evidence is thin, return fewer items.
- weight reflects how directly the quote proves willingness to pay or depth of pain.
- 2-10 citations.`;

const EDITOR_SYSTEM = `You are THE HUMANIZED EDITOR, stage 3 of the pipeline.
You receive: the raw input, the Cynic's risk report, and the Anchor's citations.
Synthesize them into a build brief a founder can act on tomorrow morning.

Output ONLY a JSON object:
{
  "problem_statement": str,            // one punchy sentence, plain words
  "validation_score": 0-100,           // triangulate: evidence density vs cynic survivability
  "target_persona": {"role": str, "company_size": str, "budget_band": str, "watering_holes": [str]},
  "roadmap": [{"phase": str, "weeks": int, "objective": str, "kill_criteria": str}],  // 3-5 phases
  "outreach_scripts": [{"channel": "email"|"x"|"linkedin", "subject": str, "body": str, "persona_hook": str}],  // 3 scripts, one per channel, each under 90 words, each opening with a verbatim citation quote
  "market_potential": {"tam_note": str, "sam_note": str, "wedge": str, "pricing_anchor": str},
  "mvp_features": [{"feature": str, "why": str, "effort": "S"|"M"|"L"}],   // 4-6, ruthlessly scoped
  "gtm": {"motion": str, "channels": [str], "first_10_customers": str},
  "score_breakdown": {"frequency": 0-100, "urgency": 0-100, "severity": 0-100, "willingness_to_pay": 0-100, "founder_fit": 0-100},
  // validation_score = weighted: frequency .2, urgency .2, severity .2, willingness_to_pay .25, founder_fit .15
  "validation_plan": {
    "interview_questions": [str],            // 6-8, open, non-leading, past-behavior focused
    "assumptions": [{"assumption": str, "test": str, "kill_threshold": str}],  // 3-4 riskiest first
    "sprint": [{"day": 1-7, "task": str, "goal": str, "done": false}]          // exactly 7 days
  },
  "uk_setup": {"structure": str, "companies_house": str, "hmrc": str, "vat": str, "insurance": str, "first_invoice": str}
}
For outreach_scripts: include a 4th script with channel "reddit" (a value-first
forum post, no link begging) and give every script a "follow_up" field: the
3-day no-reply nudge, under 30 words.

Length rules: every string value under 220 characters. Be punchy, not thorough.
Voice rules — these are hard constraints:
- Short sentences. Concrete nouns. Active verbs.
- BANNED words and patterns (never use them in any form): delve, testament,
  leverage, comprehensive, seamless, robust, synergy, cutting-edge, holistic,
  paradigm, game-changer, empower, elevate, "in today's fast-paced world",
  "it's worth noting", furthermore, moreover.
- Every roadmap phase needs kill_criteria: the measurable result that means STOP.`;

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

async function runPipeline(buildSignalId: string) {
  const db = serviceClient();

  const mark = (detail: string) =>
    db.from("build_signals").update({ status_detail: detail }).eq("id", buildSignalId);

  try {
    const { data: signal, error } = await db
      .from("build_signals")
      .select("id, problem_statement, pain_signal_id, pain_signals(raw_text, source, source_url, raw_log, platform_vec)")
      .eq("id", buildSignalId)
      .single();
    if (error || !signal) throw new Error("signal_not_found");

    const pain = signal.pain_signals as unknown as {
      raw_text: string; source: string; source_url: string | null;
      raw_log: string[]; platform_vec: Record<string, unknown>;
    } | null;

    // ---- Stage 0 · The Scout (live web mode only) -------------------------
    let webEvidence = "";
    if ((signal as { scan_mode?: string }).scan_mode === "web") {
      await mark("stage_0_scout");
      try {
        webEvidence = await callModel({
          system: SCOUT_SYSTEM,
          user: `Seed: ${signal.problem_statement}\nContext: ${pain?.raw_text ?? ""}`,
          maxTokens: 2500,
          temperature: 0.2,
          webSearch: true,
        });
      } catch (_e) {
        webEvidence = ""; // degrade gracefully to manual evidence
      }
    }

    const payload = JSON.stringify({
      seed_statement: signal.problem_statement,
      raw_text: pain?.raw_text ?? "",
      web_evidence: webEvidence,
      source: pain?.source ?? "manual",
      source_url: pain?.source_url ?? null,
      raw_log: pain?.raw_log ?? [],
      platform_vec: pain?.platform_vec ?? {},
    });

    // ---- Stage 1 · The Cynic -------------------------------------------
    await mark("stage_1_cynic");
    const cynic = await callJson<CynicReport>({
      system: CYNIC_SYSTEM, user: payload, temperature: 0.5, maxTokens: 3000,
    });

    // ---- Stage 2 · The Data Anchor --------------------------------------
    await mark("stage_2_anchor");
    const rawCitations = await callJson<Citation[]>({
      system: ANCHOR_SYSTEM, user: payload, temperature: 0, maxTokens: 3000,
    });
    // Hard verification: a citation that is not a verbatim substring is dropped.
    const haystack = `${pain?.raw_text ?? ""}\n${(pain?.raw_log ?? []).join("\n")}\n${webEvidence}`;
    const citations = rawCitations.filter((c) => haystack.includes(c.quote));

    // ---- Stage 3 · The Humanized Editor ----------------------------------
    await mark("stage_3_editor");
    const brief = await callJson<EditorBrief>({
      system: EDITOR_SYSTEM,
      user: JSON.stringify({ raw: payload, cynic, citations }),
      temperature: 0.6,
      maxTokens: 8000, // the brief is large: roadmap+mvp+gtm+outreach+scores+sprint+uk
    });
    const clean = scrubDeep(brief); // deterministic anti-filler backstop

    // ---- Land ------------------------------------------------------------
    await db.from("build_signals").update({
      status: "completed",
      status_detail: "triangulated",
      problem_statement: clean.problem_statement,
      validation_score: Math.max(0, Math.min(100, clean.validation_score)),
      target_persona: clean.target_persona,
      roadmap: clean.roadmap,
      outreach_scripts: clean.outreach_scripts ?? [],
      market_potential: clean.market_potential ?? {},
      mvp_features: clean.mvp_features ?? [],
      gtm: clean.gtm ?? {},
      score_breakdown: clean.score_breakdown ?? {},
      validation_plan: clean.validation_plan ?? {},
      uk_setup: clean.uk_setup ?? {},
      risk_profile: cynic,
      citations,
      scan_finished_at: new Date().toISOString(),
    }).eq("id", buildSignalId);
  } catch (err) {
    await db.from("build_signals").update({
      status: "failed",
      status_detail: String(err instanceof Error ? err.message : err).slice(0, 500),
      scan_finished_at: new Date().toISOString(),
    }).eq("id", buildSignalId);
  }
}

// ---------------------------------------------------------------------------
// HTTP entrypoint
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...cors, "content-type": "application/json" },
    });
  }

  const { build_signal_id } = await req.json().catch(() => ({}));
  if (!build_signal_id) {
    return new Response(JSON.stringify({ error: "build_signal_id_required" }), {
      status: 400, headers: { ...cors, "content-type": "application/json" },
    });
  }

  // Ownership check through the caller's own JWT — RLS does the enforcement.
  const asUser = userClient(req);
  const { data: owned, error: ownErr } = await asUser
    .from("build_signals").select("id").eq("id", build_signal_id).single();
  if (ownErr || !owned) {
    return new Response(JSON.stringify({ error: "not_found_or_forbidden" }), {
      status: 404, headers: { ...cors, "content-type": "application/json" },
    });
  }

  // SYNCHRONOUS state flip before we ack: refresh-proof progress.
  const db = serviceClient();
  const { error: flipErr } = await db.from("build_signals").update({
    status: "scanning",
    status_detail: "queued",
    scan_started_at: new Date().toISOString(),
    scan_finished_at: null,
  }).eq("id", build_signal_id);
  if (flipErr) {
    return new Response(JSON.stringify({ error: "state_flip_failed" }), {
      status: 500, headers: { ...cors, "content-type": "application/json" },
    });
  }

  // Detach the heavy pipeline; the function instance stays alive until done.
  // @ts-ignore — EdgeRuntime is provided by the Supabase platform.
  EdgeRuntime.waitUntil(runPipeline(build_signal_id));

  return new Response(JSON.stringify({ accepted: true, status: "scanning" }), {
    status: 202, headers: { ...cors, "content-type": "application/json" },
  });
});
