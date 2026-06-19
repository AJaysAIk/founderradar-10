import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, FUNCTIONS_BASE } from "@/lib/supabase";
import type { BuildSignal, SignalStatus } from "@/lib/types";

const DEMO_STAGES = ["queued", "stage_1_cynic", "stage_2_anchor", "stage_3_editor"] as const;

/** Demo brief used when no backend is configured, so every page is explorable. */
export const DEMO_SIGNAL: BuildSignal = {
  id: "demo-signal",
  user_id: "demo",
  pain_signal_id: "demo-pain",
  problem_statement:
    "Owner-operated trades firms lose 6+ hours a week re-typing job details between quoting, invoicing, and their accountant's spreadsheet.",
  validation_score: 78,
  target_persona: {
    role: "Owner-operator, electrical & plumbing firms",
    company_size: "2–9 staff",
    budget_band: "£40–90 / month",
    watering_holes: ["r/electricians", "Screwfix forums", "local trade WhatsApp groups"],
  },
  roadmap: [
    { phase: "Signal lock", weeks: 2, objective: "15 problem interviews from trade WhatsApp groups; record exact words used for the re-typing pain.", kill_criteria: "Fewer than 8 of 15 describe the double-entry pain unprompted." },
    { phase: "Concierge pilot", weeks: 3, objective: "Manually run quote→invoice sync for 5 firms using their real jobs. Charge £25/mo from day one.", kill_criteria: "Fewer than 3 of 5 pay for month two." },
    { phase: "Thin wedge build", weeks: 6, objective: "One feature only: photo of a paper quote → structured invoice draft in their accounting tool.", kill_criteria: "Weekly active usage below 60% of pilot firms." },
    { phase: "Channel proof", weeks: 4, objective: "Test the merchant-counter referral loop: one branch, one stand, QR onboarding.", kill_criteria: "CAC over £120 per converted firm." },
  ],
  risk_profile: {
    failure_traps: [
      { trap: "Accountant veto", why_it_kills: "The accountant, not the tradesperson, often picks the tooling. If they push their own portal, the firm churns.", severity: 4 },
      { trap: "WhatsApp inertia", why_it_kills: "The current 'system' is free and already open all day. Anything with a login loses to a photo in a chat.", severity: 5 },
      { trap: "Seasonal cashflow", why_it_kills: "Subscriptions get culled every January when the work dries up.", severity: 3 },
    ],
    distribution_bottlenecks: [
      { channel: "Trade merchants", bottleneck: "Counter staff have zero incentive to pitch software." },
      { channel: "Facebook groups", bottleneck: "Admins ban anything that smells like a pitch within minutes." },
    ],
    kill_question: "Will a man in a van open a second app when WhatsApp already works?",
    survivability: 61,
  },
  citations: [
    { quote: "I spend my whole Sunday night typing jobs into the spreadsheet for the accountant", source: "r/electricians", url: "https://reddit.com/r/electricians", weight: 0.9, signal: "pain" },
    { quote: "paying the wife's mate £150 a month just to redo my invoices", source: "Screwfix forum", url: null, weight: 0.85, signal: "spend" },
    { quote: "I just photograph the paper quote and send it to myself on WhatsApp", source: "interview #7", url: null, weight: 0.7, signal: "workaround" },
    { quote: "tried Tradify, cancelled after a month, too many screens", source: "r/plumbing", url: null, weight: 0.75, signal: "churn" },
  ],
  outreach_scripts: [
    { channel: "email", subject: "Your Sunday night spreadsheet", persona_hook: "names the exact ritual", body: "\"I spend my whole Sunday night typing jobs into the spreadsheet for the accountant.\" A sparky in Hull said that last week. We're building the thing that kills that ritual: photo of the paper quote in, accountant-ready invoice out. 5 firms are piloting at £25/mo. Want slot 6? Reply 'yes' and I'll set you up Friday." },
    { channel: "x", subject: "", persona_hook: "workaround callout", body: "If your job system is 'photograph the paper quote and WhatsApp it to myself' — same. We turned that exact habit into the product: snap the quote, get the invoice, accountant gets their export. Piloting with 5 trade firms now. DM for the 6th seat." },
    { channel: "linkedin", subject: "", persona_hook: "spend anchor", body: "One owner-operator told us he pays £150/mo for someone to re-type his invoices. We do it for £25 with the photo he's already taking. No new app habits, no training your crew. Opening 3 pilot seats for electrical & plumbing firms this month — interested?", follow_up: "Still got 1 pilot seat for this month — want it or shall I pass it on?" },
    { channel: "reddit", subject: "How do you get quotes from the van into the books without losing Sunday night?", persona_hook: "value-first thread", body: "Owner-operator question: I keep meeting sparkies who photograph paper quotes and WhatsApp them to themselves, then re-type everything for the accountant. Genuinely curious what systems people here actually stick with — apps always seem to die after a month. (Researching this properly; happy to share the write-up of what works.)", follow_up: "Posted the write-up of what 15 firms told me — link in profile if useful." },
  ],
  market_potential: {
    tam_note: "~900k owner-operated trades firms in the UK; admin tooling spend is rising as MTD digital tax rules bite.",
    sam_note: "Electrical + plumbing firms of 2–9 staff who already run the business over WhatsApp: roughly 180k firms.",
    wedge: "WhatsApp-native quote capture with an accountant-grade export — the intersection no living competitor covers.",
    pricing_anchor: "£40–90/mo band, anchored against the £150/mo human workaround already being paid.",
  },
  mvp_features: [
    { feature: "Photo quote → structured invoice draft", why: "Converts the existing WhatsApp habit, zero behavior change", effort: "M" },
    { feature: "Accountant export (CSV + Xero)", why: "Kills the accountant veto, the #1 churn trap", effort: "M" },
    { feature: "WhatsApp share-in", why: "Meets the user inside the tool they already live in", effort: "S" },
    { feature: "Sunday digest", why: "Replaces the Sunday-night ritual with a 2-minute review", effort: "S" },
    { feature: "Job status board (read-only)", why: "Crew visibility without forcing crew logins", effort: "L" },
  ],
  gtm: {
    motion: "Concierge-first: manually run the sync for 5 paying firms, then automate what they actually use.",
    channels: ["Trade WhatsApp groups (warm intros)", "Merchant counter QR stands", "r/electricians + Screwfix forum presence"],
    first_10_customers: "Recruit directly from the cited threads — the people whose quotes power the citations array are the first outreach list.",
  },
  scan_mode: "manual",
  score_breakdown: { frequency: 84, urgency: 71, severity: 76, willingness_to_pay: 82, founder_fit: 68 },
  validation_plan: {
    interview_questions: [
      "Walk me through the last time you got a quote from the van to an invoice. What happened, step by step?",
      "What did Sunday night look like last week?",
      "What have you already tried to fix this? What made you stop?",
      "Who else touches this process — accountant, partner, staff?",
      "What did the last mistake in an invoice cost you?",
      "If this disappeared as a problem tomorrow, what would you do with the time?",
      "What would make you NOT switch from the WhatsApp photo trick?",
    ],
    assumptions: [
      { assumption: "The accountant will accept an automated export", test: "Show 3 accountants the CSV/Xero output; ask if they'd sign off month-end with it", kill_threshold: "2 of 3 reject it" },
      { assumption: "Owners will pay before the product exists", test: "Concierge offer at £25/mo to 10 firms", kill_threshold: "Fewer than 3 of 10 pay" },
      { assumption: "Photo capture works on real paper quotes", test: "Collect 30 real quote photos; hand-check extraction accuracy", kill_threshold: "Under 80% field accuracy" },
    ],
    sprint: [
      { day: 1, task: "Post in 2 trade WhatsApp groups asking for 10-min calls", goal: "5 calls booked", done: true },
      { day: 2, task: "Run first 3 problem interviews using the question set", goal: "Verbatim pain quotes captured", done: true },
      { day: 3, task: "Interview 2 accountants on the export assumption", goal: "Accept / reject signal", done: false },
      { day: 4, task: "Collect 30 paper-quote photos from interviewees", goal: "Extraction test corpus", done: false },
      { day: 5, task: "Make the concierge offer to every interviewee", goal: "3 paid commitments", done: false },
      { day: 6, task: "Run the manual quote→invoice sync for payers", goal: "First value delivered", done: false },
      { day: 7, task: "Score the week against kill thresholds", goal: "Go / pivot / kill decision", done: false },
    ],
  },
  uk_setup: {
    structure: "Start as a sole trader for the pilot (zero setup cost); switch to a Ltd company before taking outside money or hiring.",
    companies_house: "Ltd incorporation is £50 online and ~24h. Reserve the name early even if trading as sole trader first.",
    hmrc: "Register for Self Assessment within 3 months of first trading. Making Tax Digital rules make your accountant-export feature a selling point — use it in your own books.",
    vat: "Registration is mandatory past £90k turnover (12-month rolling). Below that, staying unregistered keeps pilot pricing simpler.",
    insurance: "Professional indemnity (~£15-25/mo) before handling customer financial data; cyber cover once you store invoices.",
    first_invoice: "You can invoice as sole trader from day one: name, address, UTR once registered, clear payment terms. Eat your own dog food — issue it through the product.",
  },
  status: "completed",
  status_detail: "triangulated",
  scan_started_at: null,
  scan_finished_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface UseBuildSignal {
  signal: BuildSignal | null;
  status: SignalStatus | "idle";
  stage: string | null;
  scan: (problemSeed?: string) => Promise<void>;
  demoMode: boolean;
}

/**
 * Single source of truth for one build signal.
 *
 * Refresh-proof by construction:
 *  - `scan()` flips the row to 'scanning' in Postgres FIRST (optimistically in
 *    the client at the same time), so a hard refresh re-reads 'scanning'.
 *  - A Postgres-changes websocket channel hydrates every later transition
 *    (stage markers, completed payload, failure detail) with zero polling.
 */
export function useBuildSignal(signalId: string | null): UseBuildSignal {
  const isTutorial = signalId === "demo-signal";
  const demoMode = !supabase || isTutorial;
  const [signal, setSignal] = useState<BuildSignal | null>(demoMode ? DEMO_SIGNAL : null);
  const demoTimer = useRef<number | null>(null);

  // Initial read — picks up an in-flight scan after a refresh.
  useEffect(() => {
    if (!supabase || !signalId || signalId === "demo-signal") return;
    supabase
      .from("build_signals")
      .select("*")
      .eq("id", signalId)
      .single()
      .then(({ data }) => data && setSignal(data as BuildSignal));
  }, [signalId]);

  // Realtime hydration over websockets.
  useEffect(() => {
    if (!supabase || !signalId || signalId === "demo-signal") return;
    const client = supabase;
    const channel = client
      .channel(`build_signal:${signalId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "build_signals", filter: `id=eq.${signalId}` },
        (payload) => setSignal(payload.new as BuildSignal),
      )
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [signalId]);

  useEffect(() => () => {
    if (demoTimer.current) window.clearInterval(demoTimer.current);
  }, []);

  const scan = useCallback(async (problemSeed?: string) => {
    // ---- Demo / tutorial mode: simulate the pipeline locally ---------------
    if (!supabase || !FUNCTIONS_BASE || !signalId || signalId === "demo-signal") {
      let i = 0;
      setSignal((s) => ({
        ...(s ?? DEMO_SIGNAL),
        problem_statement: problemSeed ?? (s ?? DEMO_SIGNAL).problem_statement,
        status: "scanning",
        status_detail: DEMO_STAGES[0],
      }));
      demoTimer.current = window.setInterval(() => {
        i += 1;
        if (i < DEMO_STAGES.length) {
          setSignal((s) => (s ? { ...s, status_detail: DEMO_STAGES[i] } : s));
        } else {
          if (demoTimer.current) window.clearInterval(demoTimer.current);
          setSignal((s) =>
            s ? { ...s, ...DEMO_SIGNAL, id: s.id, problem_statement: s.problem_statement, status: "completed", status_detail: "triangulated" } : s,
          );
        }
      }, 1400);
      return;
    }

    // ---- Live mode --------------------------------------------------------
    // Optimistic flip so the instrument reacts on the same frame as the click;
    // the worker performs the authoritative flip before it acks.
    setSignal((s) => (s ? { ...s, status: "scanning", status_detail: "queued" } : s));

    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${FUNCTIONS_BASE}/triangulate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ build_signal_id: signalId }),
    }).catch(() => {
      setSignal((s) => (s ? { ...s, status: "failed", status_detail: "dispatch_failed" } : s));
    });
  }, [signalId]);

  return {
    signal,
    status: signal?.status ?? "idle",
    stage: signal?.status_detail ?? null,
    scan,
    demoMode,
  };
}
