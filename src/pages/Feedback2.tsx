import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Kinetic } from "@/components/Shell";
import { entities } from "@/lib/api";
import type { TestimonialInput } from "@/lib/types";

const MISS = ["", "Not disappointed", "Somewhat disappointed", "Very disappointed"];

/**
 * Public + in-app testimonial capture. Reachable at /feedback (in-app) and
 * /share (public, no login). Strong-for-evidence: name, role, date, rating,
 * quote, and explicit consent to be quoted.
 */
export function TestimonialForm({ source }: { source: "public" | "in_app" }) {
  const [f, setF] = useState<TestimonialInput>({
    full_name: "", role_company: "", email: "", rating: 8, would_miss: 3, quote: "", consent_quote: false, source,
  });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.full_name.trim().length < 1 || f.quote.trim().length < 3) return;
    setBusy(true); setErr(null);
    try { await entities.testimonials.submit(f); setDone(true); }
    catch (e2) { setErr(e2 instanceof Error ? e2.message : "Could not submit. Try again."); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <GlassCard className="p-8 text-center max-w-lg mx-auto">
        <p className="text-3xl mb-2">✶</p>
        <h2 className="text-xl font-semibold mb-1">Thank you — logged.</h2>
        <p className="text-mist text-sm">Your feedback is in. It genuinely helps shape what gets built next.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5 max-w-lg mx-auto">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="font-mono text-[10px] tracking-[0.18em] text-dim">YOUR NAME *</span>
            <input required value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })}
              className="mt-1 w-full bg-raise border border-seam rounded px-3 py-2 text-[13px] outline-none focus:border-phosphor/60" />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] tracking-[0.18em] text-dim">ROLE / COMPANY</span>
            <input value={f.role_company ?? ""} onChange={(e) => setF({ ...f, role_company: e.target.value })}
              placeholder="Owner, Acme Ltd"
              className="mt-1 w-full bg-raise border border-seam rounded px-3 py-2 text-[13px] outline-none focus:border-phosphor/60 placeholder:text-dim" />
          </label>
        </div>

        <label className="block">
          <span className="font-mono text-[10px] tracking-[0.18em] text-dim">RATING · <span className="text-phosphor">{f.rating}</span>/10</span>
          <input type="range" min={1} max={10} value={f.rating} onChange={(e) => setF({ ...f, rating: Number(e.target.value) })}
            className="w-full mt-1 accent-[#B16CFF]" />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] tracking-[0.18em] text-dim">IF FOUNDERRADAR DISAPPEARED · <span className="text-flare">{MISS[f.would_miss ?? 3]}</span></span>
          <input type="range" min={1} max={3} value={f.would_miss ?? 3} onChange={(e) => setF({ ...f, would_miss: Number(e.target.value) })}
            className="w-full mt-1 accent-[#FF9F6E]" />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] tracking-[0.18em] text-dim">IN YOUR WORDS — WHAT DID IT DO FOR YOU? *</span>
          <textarea required rows={4} value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })}
            placeholder="It helped me realise…"
            className="mt-1 w-full bg-raise border border-seam rounded px-3 py-2 text-[13px] outline-none focus:border-phosphor/60 resize-y placeholder:text-dim" />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] tracking-[0.18em] text-dim">EMAIL (optional, for follow-up)</span>
          <input type="email" value={f.email ?? ""} onChange={(e) => setF({ ...f, email: e.target.value })}
            className="mt-1 w-full bg-raise border border-seam rounded px-3 py-2 text-[13px] outline-none focus:border-phosphor/60" />
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={f.consent_quote} onChange={(e) => setF({ ...f, consent_quote: e.target.checked })}
            className="mt-0.5 accent-[#B16CFF]" />
          <span className="text-[12px] text-mist">I'm happy for FounderRadar to quote this feedback (with my name and role) in its materials.</span>
        </label>

        {err && <p className="text-[12px] text-blood">{err}</p>}

        <motion.button type="submit" disabled={busy} whileTap={{ scale: 0.97 }}
          className="w-full font-mono text-[11px] tracking-[0.2em] px-4 py-2.5 rounded btn-primary shadow-glow disabled:opacity-50">
          {busy ? "SENDING…" : "SUBMIT FEEDBACK"}
        </motion.button>
      </form>
    </GlassCard>
  );
}

/** Public share page — no login, no nav chrome. */
export default function ShareFeedback() {
  return (
    <div className="min-h-screen px-5 py-14">
      <div className="text-center mb-8">
        <span className="font-wordmark text-sm tracking-[0.25em]">FOUNDER<span className="text-aurora">RADAR</span></span>
        <p className="eyebrow mt-4 mb-2">BETA FEEDBACK</p>
        <Kinetic text="Tell us how it landed." className="text-3xl sm:text-4xl font-bold tracking-tight" />
      </div>
      <TestimonialForm source="public" />
    </div>
  );
}
