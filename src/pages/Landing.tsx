import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Kinetic } from "@/components/Shell";
import { Tilt } from "@/components/Tilt";
import { entities } from "@/lib/api";

function Waitlist() {
  const [params] = useSearchParams();
  const ref = params.get("ref") ?? "direct";
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "exists" | "err">("idle");

  const join = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setState("busy");
    try { setState(await entities.waitlist.join(email.trim(), ref)); }
    catch { setState("err"); }
  };

  if (state === "ok" || state === "exists") {
    return (
      <div className="max-w-md mx-auto text-center">
        <p className="text-2xl mb-2">✶</p>
        <p className="text-ink font-medium">{state === "ok" ? "You're on the list." : "You're already on the list."}</p>
        <p className="text-mist text-sm mt-1">We'll be in touch as spots open up.</p>
      </div>
    );
  }

  return (
    <form onSubmit={join} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2">
      <input
        type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com" aria-label="Email for waitlist"
        className="flex-1 bg-raise border border-seam rounded px-4 py-3 text-[14px] outline-none focus:border-phosphor/60 placeholder:text-dim"
      />
      <button type="submit" disabled={state === "busy"}
        className="font-mono text-[12px] tracking-[0.2em] px-6 py-3 rounded btn-primary shadow-glow disabled:opacity-50 whitespace-nowrap">
        {state === "busy" ? "JOINING…" : "JOIN WAITLIST"}
      </button>
      {state === "err" && <p className="text-blood text-[12px] sm:absolute mt-14">Something went wrong — try again.</p>}
    </form>
  );
}

const PILLARS = [
  { tag: "INGEST", title: "Raw pain in", body: "Paste a Reddit rant, an interview note, a support ticket — or let the live web scan find complaints for you." },
  { tag: "TRIANGULATE", title: "Three AI stages", body: "The Cynic stress-tests it, the Data Anchor keeps only verbatim proof, the Editor writes the plan." },
  { tag: "ACT", title: "A plan with exits", body: "Scored opportunity, roadmap with kill criteria, 7-day sprint, outreach scripts, and prospects to contact." },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <span className="font-wordmark text-sm tracking-[0.25em]">FOUNDER<span className="text-aurora">RADAR</span></span>
        <Link to="/auth" className="font-mono text-[11px] tracking-widest text-mist hover:text-phosphor">SIGN IN →</Link>
      </header>

      <section className="mx-auto max-w-4xl px-5 pt-16 pb-12 text-center">
        <p className="eyebrow mb-4">MARKET PAIN, TRIANGULATED</p>
        <Kinetic text="Find out you're wrong cheaply." className="text-4xl sm:text-6xl font-bold tracking-tight mb-5" />
        <p className="text-mist text-lg max-w-2xl mx-auto mb-8">
          FounderRadar turns raw market complaints into evidence-backed startup plans —
          so you build what people have already proven they'll pay for.
        </p>
        <Waitlist />
        <p className="font-mono text-[11px] text-dim mt-5">
          Building in public · join the waitlist for early access ·{" "}
          <Link to="/auth" className="text-mist hover:text-phosphor underline">already have access? sign in</Link>
        </p>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 pb-20 grid md:grid-cols-3 gap-4">
        {PILLARS.map((p, i) => (
          <Tilt key={p.tag} max={6}>
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 200, damping: 24 }}
              className="panel-card ticked p-5 h-full"
            >
              <p className="font-mono text-[10px] tracking-[0.2em] text-phosphor mb-2">{String(i + 1).padStart(2, "0")} · {p.tag}</p>
              <h3 className="text-lg font-semibold mb-1.5">{p.title}</h3>
              <p className="text-[13px] text-mist leading-relaxed">{p.body}</p>
            </motion.div>
          </Tilt>
        ))}
      </section>

      <footer className="border-t border-seam py-6">
        <div className="mx-auto max-w-6xl px-5 flex items-center justify-between font-mono text-[10px] text-dim">
          <span>FOUNDERRADAR · BETA</span>
          <Link to="/auth" className="hover:text-phosphor">SIGN IN</Link>
        </div>
      </footer>
    </div>
  );
}
