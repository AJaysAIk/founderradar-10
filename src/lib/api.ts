// src/lib/api.ts
// Entity bridge — the equivalent of Base44's `base44.entities.*` surface.
// Live mode: Supabase (RLS does row scoping). Demo mode: in-memory store
// seeded with realistic fixtures, so every page works with no backend.

import { supabase, FUNCTIONS_BASE } from "@/lib/supabase";
import { DEMO_SIGNAL } from "@/hooks/useBuildSignal";
import type {
  BuildSignal,
  FounderContact,
  PainSignalInput,
  PilotFeedback,
  ProspectResult,
  Testimonial,
  TestimonialInput,
  WaitlistEntry,
  OwnerStats,
} from "@/lib/types";

export const demoMode = !supabase;

// ---------------------------------------------------------------------------
// Demo store
// ---------------------------------------------------------------------------

const now = () => new Date().toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString();
let seq = 0;
const did = (p: string) => `${p}-${++seq}`;

const demoContacts: FounderContact[] = [
  { full_name: "Gary Mott", company: "Mott & Sons Plumbing", role: "Owner", channel: "email", stage: "pilot", lead_metrics: { fit_score: 92, intent_score: 88, acv_estimate: 900 }, last_touch_at: daysAgo(2) },
  { full_name: "Priya Shah", company: "Shah Electrical", role: "Owner-operator", channel: "linkedin", stage: "call_booked", lead_metrics: { fit_score: 84, intent_score: 71, acv_estimate: 720 }, last_touch_at: daysAgo(1) },
  { full_name: "Dean Carver", company: "Carver Heating", role: "Director", channel: "x", stage: "replied", lead_metrics: { fit_score: 77, intent_score: 64, acv_estimate: 600 }, last_touch_at: daysAgo(3) },
  { full_name: "Lena Okon", company: "Okon Joinery", role: "Owner", channel: "email", stage: "contacted", lead_metrics: { fit_score: 69, intent_score: 40, acv_estimate: 540 }, last_touch_at: daysAgo(5) },
  { full_name: "Sam Whitlow", company: "Whitlow Roofing", role: "Owner", channel: "email", stage: "identified", lead_metrics: { fit_score: 61, intent_score: 22, acv_estimate: 480 }, last_touch_at: null },
  { full_name: "Ade Bakare", company: "AB Groundworks", role: "Owner", channel: "linkedin", stage: "churned", lead_metrics: { fit_score: 55, intent_score: 10, acv_estimate: 0 }, last_touch_at: daysAgo(21) },
].map((c) => ({
  ...c,
  id: did("contact"),
  user_id: "demo",
  build_signal_id: "demo-signal",
  milestones: [],
  next_touch_at: null,
  created_at: daysAgo(14),
  updated_at: now(),
})) as FounderContact[];

const demoFeedback: PilotFeedback[] = [
  { nps: 9, pmf_score: 4, scores: { accuracy: 5, speed: 4, citations_trust: 5 }, verbatim: "the citations are the bit i actually trust" },
  { nps: 8, pmf_score: 3, scores: { accuracy: 4, speed: 5, citations_trust: 4 }, verbatim: "scan is fast, graveyard saved me a month" },
  { nps: 10, pmf_score: 4, scores: { accuracy: 5, speed: 5, citations_trust: 5 }, verbatim: "boardroom CFO found the hole in my pricing before my real investor did" },
  { nps: 6, pmf_score: 2, scores: { accuracy: 3, speed: 4, citations_trust: 4 }, verbatim: "want to edit roadmap phases inline" },
  { nps: 7, pmf_score: 3, scores: { accuracy: 4, speed: 3, citations_trust: 4 }, verbatim: null },
  { nps: 9, pmf_score: 4, scores: { accuracy: 5, speed: 4, citations_trust: 5 }, verbatim: "outreach scripts opening with real quotes = replies" },
  { nps: 4, pmf_score: 2, scores: { accuracy: 3, speed: 3, citations_trust: 3 }, verbatim: "need mobile" },
  { nps: 8, pmf_score: 3, scores: { accuracy: 4, speed: 4, citations_trust: 5 }, verbatim: null },
].map((f, i) => ({
  ...f,
  id: did("fb"),
  user_id: "demo",
  build_signal_id: "demo-signal",
  contact_id: demoContacts[i % demoContacts.length].id,
  created_at: daysAgo(10 - i),
})) as PilotFeedback[];

const demoSignals: BuildSignal[] = [DEMO_SIGNAL];

const toDemo = (i: TestimonialInput): Testimonial => ({
  ...i, id: did("test"), created_at: now(), user_id: "demo",
  role_company: i.role_company ?? null, email: i.email ?? null,
  would_miss: i.would_miss ?? null, source: i.source ?? "in_app",
});
const demoWaitlist: WaitlistEntry[] = [
  { ref: "twitter", email: "alex@example.com" }, { ref: "twitter", email: "sam@example.com" },
  { ref: "reddit", email: "jordan@example.com" }, { ref: "reddit", email: "kai@example.com" },
  { ref: "reddit", email: "lee@example.com" }, { ref: "producthunt", email: "morgan@example.com" },
  { ref: "direct", email: "casey@example.com" }, { ref: "linkedin", email: "drew@example.com" },
].map((w, i) => ({ id: `wl-${i}`, created_at: new Date(Date.now() - i * 36e5 * 7).toISOString(), user_agent: "demo", note: null, ...w }));

const demoTestimonials: Testimonial[] = [
  toDemo({ full_name: "Gary Mott", role_company: "Owner, Mott & Sons Plumbing", rating: 9, would_miss: 3, quote: "The citations are the bit I actually trust — it quoted my own customers back at me. Changed how I pitched the pilot.", consent_quote: true, source: "in_app" }),
  toDemo({ full_name: "Priya Shah", role_company: "Founder, skincare DTC", rating: 8, would_miss: 3, quote: "The boardroom CFO found the hole in my pricing before my real investor did. Worth it for that alone.", consent_quote: true, source: "public" }),
  toDemo({ full_name: "Dean Carver", role_company: "Director, Carver Heating", rating: 8, would_miss: 2, quote: "Saved me a month of building the wrong thing. The kill criteria made me actually stop and test.", consent_quote: true, source: "public" }),
];

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

async function uid(): Promise<string> {
  if (!supabase) return "demo";
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("not_authenticated");
  return data.user.id;
}

/** Owner check — true only if the signed-in user is in the admins table. */
export async function checkIsAdmin(): Promise<boolean> {
  if (!supabase) return true; // demo mode: you are the owner locally
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
}

export const entities = {
  waitlist: {
    async join(email: string, ref: string, note?: string): Promise<"ok" | "exists"> {
      if (!supabase) {
        if (demoWaitlist.some((w) => w.email.toLowerCase() === email.toLowerCase())) return "exists";
        demoWaitlist.unshift({ id: did("wl"), created_at: now(), email, ref, user_agent: "demo", note: note ?? null });
        return "ok";
      }
      const { error } = await supabase.from("waitlist").insert({
        email, ref, note: note ?? null, user_agent: navigator.userAgent.slice(0, 300),
      });
      if (error) {
        if (error.code === "23505") return "exists"; // unique violation
        throw error;
      }
      return "ok";
    },
    async listForAdmin(): Promise<WaitlistEntry[]> {
      if (!supabase) return [...demoWaitlist];
      const { data, error } = await supabase.from("waitlist").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as WaitlistEntry[];
    },
  },

  stats: {
    async owner(): Promise<OwnerStats | null> {
      if (!supabase) return { waitlist_total: demoWaitlist.length, signals_total: 3, signals_completed: 2, scans_today: 4, contacts_total: 6, testimonials_total: 3, active_users: 5 };
      const { data, error } = await supabase.rpc("owner_stats");
      if (error) return null;
      return data as OwnerStats;
    },
  },

  testimonials: {
    async submit(input: TestimonialInput): Promise<void> {
      if (!supabase) { demoTestimonials.unshift(toDemo(input)); return; }
      let user_id: string | null = null;
      try { const { data } = await supabase.auth.getUser(); user_id = data.user?.id ?? null; } catch { /* anon */ }
      const { error } = await supabase.from("testimonials").insert({ ...input, user_id, source: input.source ?? "in_app" });
      if (error) throw error;
    },
    async listForAdmin(): Promise<Testimonial[]> {
      if (!supabase) return [...demoTestimonials];
      const { data, error } = await supabase.from("testimonials").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Testimonial[];
    },
  },

  buildSignals: {
    async list(): Promise<BuildSignal[]> {
      if (!supabase) return [...demoSignals];
      const { data, error } = await supabase
        .from("build_signals").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as BuildSignal[];
    },
    /** Re-run the pipeline on a failed (or stale) signal. */
    async rescan(id: string): Promise<void> {
      if (!supabase || !FUNCTIONS_BASE) {
        const sig = demoSignals.find((x) => x.id === id);
        if (!sig) return;
        sig.status = "scanning"; sig.status_detail = "queued"; sig.updated_at = now();
        setTimeout(() => {
          Object.assign(sig, { ...DEMO_SIGNAL, id: sig.id, problem_statement: sig.problem_statement, status: "completed", status_detail: "triangulated", updated_at: now() });
        }, 3500);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${FUNCTIONS_BASE}/triangulate`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ build_signal_id: id }),
      });
    },

    async get(id: string): Promise<BuildSignal | null> {
      if (!supabase) return demoSignals.find((s) => s.id === id) ?? null;
      const { data } = await supabase.from("build_signals").select("*").eq("id", id).single();
      return (data as BuildSignal) ?? null;
    },
  },

  painSignals: {
    /**
     * The full orchestration flow:
     * PainSignal insert → BuildSignal create (status 'scanning') → trigger
     * the triangulate worker. Returns the new BuildSignal id.
     */
    async submitAndScan(input: PainSignalInput): Promise<string> {
      if (!supabase || !FUNCTIONS_BASE) {
        const sig: BuildSignal = {
          ...DEMO_SIGNAL,
          id: did("signal"),
          problem_statement: input.raw_text.slice(0, 140),
          scan_mode: input.mode ?? "manual",
          status: "scanning",
          status_detail: "queued",
          validation_score: null,
          created_at: now(),
          updated_at: now(),
        };
        demoSignals.unshift(sig);
        // Simulate the pipeline landing.
        const stages = ["stage_1_cynic", "stage_2_anchor", "stage_3_editor"];
        stages.forEach((st, i) =>
          setTimeout(() => { sig.status_detail = st; sig.updated_at = now(); }, 1300 * (i + 1)),
        );
        setTimeout(() => {
          Object.assign(sig, {
            ...DEMO_SIGNAL, id: sig.id, problem_statement: DEMO_SIGNAL.problem_statement,
            status: "completed", status_detail: "triangulated", updated_at: now(),
          });
        }, 1300 * 4);
        return sig.id;
      }

      const user_id = await uid();

      // Quota gate — protects the AI budget. Returns false when over the daily cap.
      const { data: allowed, error: quotaErr } = await supabase.rpc("consume_scan", { p_limit: 25 });
      if (!quotaErr && allowed === false) {
        throw new Error("Daily scan limit reached (25/day). Resets at midnight UTC — this keeps costs sane during beta.");
      }

      const { data: pain, error: pErr } = await supabase
        .from("pain_signals")
        .insert({ user_id, raw_text: input.raw_text, source: input.source, source_url: input.source_url ?? null })
        .select("id").single();
      if (pErr) throw pErr;

      const { data: sig, error: sErr } = await supabase
        .from("build_signals")
        .insert({ user_id, pain_signal_id: pain.id, problem_statement: input.raw_text.slice(0, 200), scan_mode: input.mode ?? "manual", status: "scanning", status_detail: "queued" })
        .select("id").single();
      if (sErr) throw sErr;

      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${FUNCTIONS_BASE}/triangulate`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ build_signal_id: sig.id }),
      });
      return sig.id as string;
    },
  },

  prospects: {
    /** Live AI prospect discovery. Returns [] in demo mode (no fabricated people). */
    async find(buildSignalId: string): Promise<ProspectResult[]> {
      if (!supabase || !FUNCTIONS_BASE) return [];
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${FUNCTIONS_BASE}/prospect`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ build_signal_id: buildSignalId }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${res.status === 404 ? " — function not deployed?" : ""} · ${body.slice(0, 220)}`);
      }
      return ((await res.json()).prospects ?? []) as ProspectResult[];
    },
  },

  sprints: {
    /** Toggle a sprint task; persists the whole validation_plan jsonb. */
    async toggleTask(signalId: string, day: number): Promise<void> {
      const flip = (sig: BuildSignal) => {
        const plan = sig.validation_plan as { sprint?: Array<{ day: number; done: boolean }> };
        plan.sprint = (plan.sprint ?? []).map((t) =>
          t.day === day ? { ...t, done: !t.done } : t,
        ) as never;
        return plan;
      };
      if (!supabase) {
        const sig = demoSignals.find((x) => x.id === signalId);
        if (sig) { flip(sig); sig.updated_at = now(); }
        return;
      }
      const { data } = await supabase.from("build_signals")
        .select("validation_plan").eq("id", signalId).single();
      if (!data) return;
      const plan = flip({ validation_plan: data.validation_plan } as BuildSignal);
      const { error } = await supabase.from("build_signals")
        .update({ validation_plan: plan }).eq("id", signalId);
      if (error) throw error;
    },
  },

  contacts: {
    async list(): Promise<FounderContact[]> {
      if (!supabase) return [...demoContacts];
      const { data, error } = await supabase
        .from("founder_contacts").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as FounderContact[];
    },
    async create(input: Pick<FounderContact, "full_name" | "company" | "role" | "channel" | "build_signal_id">): Promise<void> {
      if (!supabase) {
        demoContacts.unshift({
          ...input, id: did("contact"), user_id: "demo", stage: "identified",
          lead_metrics: { fit_score: 50, intent_score: 10 }, milestones: [],
          last_touch_at: null, next_touch_at: null, created_at: now(), updated_at: now(),
        } as FounderContact);
        return;
      }
      const user_id = await uid();
      const { error } = await supabase.from("founder_contacts").insert({ ...input, user_id });
      if (error) throw error;
    },
    async setStage(id: string, stage: FounderContact["stage"]): Promise<void> {
      if (!supabase) {
        const c = demoContacts.find((x) => x.id === id);
        if (c) {
          c.stage = stage;
          c.milestones = [...c.milestones, { at: now(), kind: "stage", note: stage }];
          c.last_touch_at = now();
          c.updated_at = now();
        }
        return;
      }
      const { error } = await supabase
        .from("founder_contacts")
        .update({ stage, last_touch_at: now() })
        .eq("id", id);
      if (error) throw error;
    },
  },

  feedback: {
    async list(): Promise<PilotFeedback[]> {
      if (!supabase) return [...demoFeedback];
      const { data, error } = await supabase
        .from("pilot_feedback").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as PilotFeedback[];
    },
    async create(input: Pick<PilotFeedback, "nps" | "pmf_score" | "verbatim" | "build_signal_id">): Promise<void> {
      if (!supabase) {
        demoFeedback.unshift({
          ...input, id: did("fb"), user_id: "demo", contact_id: null,
          scores: {}, created_at: now(),
        } as PilotFeedback);
        return;
      }
      const user_id = await uid();
      const { error } = await supabase.from("pilot_feedback").insert({ ...input, user_id });
      if (error) throw error;
    },
  },
};
