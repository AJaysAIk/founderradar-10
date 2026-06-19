import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Kinetic } from "@/components/Shell";
import { RadarSweep } from "@/components/RadarSweep";
import { useBuildSignal } from "@/hooks/useBuildSignal";
import { entities } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Citation } from "@/lib/types";

// A roster of real-feeling personas. One is chosen at random on each page load,
// so onboarding shows a different operator every refresh. In live mode the
// transcript becomes the actual pain_signal payload for the pipeline.
type Persona = {
  id: string; initials: string; node: string; seed: string;
  lines: string[]; closer: string;
};

const PERSONAS: Persona[] = [
  {
    id: "dave", initials: "DV", node: "DAVE · OWNER, DM ELECTRICAL (4 STAFF)",
    seed: "Owner-operated trades firms lose 6+ hours a week re-typing job details between quoting, invoicing, and their accountant's spreadsheet.",
    lines: [
      "i quote jobs on paper in the van. then sunday night i sit there re-typing everything into a spreadsheet for the accountant. every. single. week.",
      "tried one of those job apps last year — Tradify i think — cancelled after a month. too many screens, lads never opened it",
      "now i just photograph the paper quote and send it to myself on whatsapp like a caveman. and i'm STILL paying the wife's mate £150 a month to redo my invoices",
    ],
    closer: "...huh. that's actually my business. on one card.",
  },
  {
    id: "priya", initials: "PR", node: "PRIYA · FOUNDER, 2-PERSON SKINCARE BRAND",
    seed: "Small DTC brands waste hours every week manually reconciling orders, stock, and ad spend across Shopify, a spreadsheet, and Meta.",
    lines: [
      "every morning i export shopify orders, paste them into a spreadsheet, then check stock by literally counting boxes in the spare room",
      "i'm running meta ads but i genuinely can't tell which product is profitable after returns and shipping. i just... guess.",
      "tried a 'all-in-one' tool, it wanted £200/mo and still didn't connect to my supplier. cancelled in a week.",
    ],
    closer: "ok so it actually understood the order-to-stock mess. not bad.",
  },
  {
    id: "marcus", initials: "MK", node: "MARCUS · INDEPENDENT DRIVING INSTRUCTOR",
    seed: "Solo service providers lose income to no-shows and spend evenings manually texting to schedule and chase payment.",
    lines: [
      "half my evening is texting learners back and forth to book slots. 'you free tuesday' x40 people.",
      "no-shows kill me — someone cancels last minute and that hour's just gone, no fee, nothing.",
      "i take payment by bank transfer and chase the ones who forget. i'm a driving instructor, not a debt collector.",
    ],
    closer: "if it actually stops the no-shows i'd pay for that today.",
  },
  {
    id: "leah", initials: "LH", node: "LEAH · MANAGER, 3-CLINIC PHYSIO PRACTICE",
    seed: "Small clinics lose revenue to gaps in the schedule and have no quick way to fill last-minute cancellations.",
    lines: [
      "when a patient cancels at 9am we just... have an empty slot. nobody has time to ring the waitlist.",
      "our 'system' is a paper diary at each clinic plus a whatsapp group between reception. things get double booked constantly.",
      "i looked at the big clinic software but it's built for 20-room places, not three small rooms. overkill and overpriced.",
    ],
    closer: "filling cancellations automatically? that's literally money we lose every day.",
  },
];

function pickPersona(): Persona {
  return PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
}

// ---------------------------------------------------------------------------
// Dave's script: a real owner-operator dumping messy thoughts into the console.
// Each beat optionally arms an action for the user.
// ---------------------------------------------------------------------------

type Beat = {
  from: "dave" | "system";
  text: string;
  action?: "arm_scan";
};

function buildScript(p: Persona): Beat[] {
  return [
    { from: "system", text: `PERSONA NODE CONNECTED · ${p.node}` },
    { from: "dave", text: "right. someone said this thing turns my moaning into a plan, so here goes" },
    ...p.lines.map((text) => ({ from: "dave" as const, text })),
    { from: "system", text: `RAW PAIN SIGNAL BUFFERED · ${p.lines.length} FRAGMENTS · 0% STRUCTURED` },
    { from: "dave", text: "so... that's the mess. your turn. hit the scan thing and show me what you make of it", action: "arm_scan" },
  ];
}

const SIGNAL_BADGE: Record<Citation["signal"], { label: string; cls: string }> = {
  pain: { label: "PAIN", cls: "text-blood border-blood/40" },
  spend: { label: "SPEND", cls: "text-phosphor border-phosphor/40" },
  workaround: { label: "WORKAROUND", cls: "text-pulse border-pulse/40" },
  churn: { label: "CHURN", cls: "text-flare border-flare/40" },
};

function Typewriter({ text, onDone }: { text: string; onDone: () => void }) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (n >= text.length) {
      const t = window.setTimeout(onDone, 420);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setN((v) => v + 2), 16);
    return () => window.clearTimeout(t);
  }, [n, text, onDone]);
  return (
    <>
      {text.slice(0, n)}
      {n < text.length && <span className="text-phosphor animate-blink">▌</span>}
    </>
  );
}

export default function Onboarding() {
  const personaRef = useRef<Persona>(pickPersona());
  const persona = personaRef.current;
  const SCRIPT = useMemo(() => buildScript(persona), [persona]);
  const connected = !!supabase;
  const [liveId, setLiveId] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  // Connected: track the REAL signal we create. Not connected: local simulation.
  const tutorial = useBuildSignal(connected ? liveId : "demo-signal");
  const signal = tutorial.signal;
  const status = tutorial.status === "idle" && dispatching ? "scanning" : tutorial.status;
  const stage = tutorial.stage ?? (dispatching ? "queued" : null);
  const [beatIdx, setBeatIdx] = useState(0);
  const [armed, setArmed] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (signal && dispatching) setDispatching(false); }, [signal, dispatching]);

  const visible = SCRIPT.slice(0, beatIdx + 1);
  const scriptDone = beatIdx >= SCRIPT.length - 1;
  const completed = hasScanned && status === "completed" && armed === false && scriptDone;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [beatIdx, status]);

  const advance = () => {
    setBeatIdx((i) => {
      const next = Math.min(i + 1, SCRIPT.length - 1);
      if (SCRIPT[next]?.action === "arm_scan") setArmed(true);
      return next;
    });
  };

  const fire = () => {
    setArmed(false);
    setHasScanned(true);
    if (!connected) {
      void tutorial.scan(persona.seed);
      return;
    }
    // Live: Dave's transcript becomes a real pain_signal and the real pipeline runs.
    setDispatching(true);
    entities.painSignals
      .submitAndScan({ raw_text: persona.lines.join("\n"), source: "interview", mode: "manual" })
      .then(setLiveId)
      .catch(() => setDispatching(false));
  };

  const skip = () => {
    setBeatIdx(SCRIPT.length - 1);
    setArmed(true);
  };

  const structuredPct = useMemo(() => {
    if (status === "completed") return 100;
    if (status !== "scanning") return 0;
    return { queued: 8, stage_0_scout: 18, stage_1_cynic: 34, stage_2_anchor: 67, stage_3_editor: 91 }[stage ?? ""] ?? 8;
  }, [status, stage]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="eyebrow mb-3">S-01 · INTERACTIVE ONBOARDING</p>
      <Kinetic
        text="Messy thoughts in. Metrics out."
        className="text-3xl sm:text-5xl font-bold tracking-tight mb-2"
      />
      <p className="text-mist max-w-xl mb-8">
        A real operator is about to dump their week on you — a different one each time you land here.
        Your job: trigger one scan and watch the noise become a structured signal.
      </p>

      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-6 items-start">
        {/* ------------------------------------------------ Chat console */}
        <section className="panel-card ticked overflow-hidden" aria-label="Live chat console">
          <div className="flex items-center justify-between border-b border-seam px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-phosphor opacity-60 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-phosphor" />
              </span>
              <span className="font-mono text-[11px] tracking-widest text-mist">PERSONA NODE · {persona.initials}</span>
            </div>
            <div className="flex items-center gap-3">
              {!scriptDone && (
                <button onClick={skip} className="font-mono text-[10px] tracking-widest text-dim hover:text-phosphor">
                  SKIP →
                </button>
              )}
              <span className="font-mono text-[10px] text-dim">CHANNEL 01</span>
            </div>
          </div>

          <div ref={logRef} className="h-[420px] overflow-y-auto px-4 py-4 space-y-3">
            <AnimatePresence initial={false}>
              {visible.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 26 }}
                  className={b.from === "system" ? "" : "flex gap-3"}
                >
                  {b.from === "system" ? (
                    <p className="font-mono text-[10px] tracking-[0.18em] text-dim border-l-2 border-seam pl-3 py-0.5">
                      {b.text}
                    </p>
                  ) : (
                    <>
                      <div className="mt-0.5 h-7 w-7 shrink-0 rounded-sm bg-raise border border-seam grid place-items-center font-mono text-[10px] text-flare">
                        {persona.initials}
                      </div>
                      <p className="text-sm text-ink/90 leading-relaxed max-w-[46ch]">
                        {i === beatIdx ? <Typewriter text={b.text} onDone={advance} /> : b.text}
                      </p>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {status === "scanning" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-[10px] tracking-[0.18em] text-phosphor border-l-2 border-phosphor/50 pl-3 py-0.5"
              >
                TRIANGULATION PIPELINE ENGAGED · {stage?.toUpperCase().replace(/_/g, " ")}
              </motion.p>
            )}
            {completed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-ink/90"
              >
                <span className="font-mono text-[10px] text-flare mr-2">{persona.initials}</span>
                {persona.closer}
              </motion.p>
            )}
          </div>

          {/* Action bar */}
          <div className="border-t border-seam px-4 py-3 flex items-center justify-between gap-3">
            <div className="font-mono text-[10px] text-dim">
              STRUCTURED:{" "}
              <span className={structuredPct > 0 ? "text-phosphor" : ""}>{structuredPct}%</span>
              <span className="ml-2 inline-block h-1 w-28 align-middle bg-raise rounded overflow-hidden">
                <motion.span
                  className="block h-full bg-phosphor"
                  animate={{ width: `${structuredPct}%` }}
                  transition={{ type: "spring", stiffness: 80, damping: 20 }}
                />
              </span>
            </div>
            <motion.button
              onClick={fire}
              disabled={!armed || status === "scanning"}
              whileHover={armed ? { scale: 1.04 } : {}}
              whileTap={armed ? { scale: 0.96 } : {}}
              className={`font-mono text-[11px] tracking-[0.2em] px-4 py-2 rounded border transition-colors ${
                armed
                  ? "border-phosphor text-void bg-phosphor shadow-glow"
                  : "border-seam text-dim cursor-not-allowed"
              }`}
            >
              {status === "scanning" ? "SCANNING…" : "▶ RUN SCAN"}
            </motion.button>
          </div>
        </section>

        {/* ------------------------------------------------ Instrument + result */}
        <section className="space-y-5">
          <div className="panel-card p-6 grid place-items-center">
            <RadarSweep status={hasScanned ? status : "idle"} stage={stage} />
          </div>

          <AnimatePresence>
            {hasScanned && status === "completed" && signal && (
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
                className="panel-card ticked p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="eyebrow">BUILD SIGNAL · LOCKED</p>
                  <span className="font-mono text-2xl font-semibold text-phosphor text-glow leading-none">
                    {Math.round(signal.validation_score ?? 0)}
                    <span className="text-[10px] text-dim ml-1">/100</span>
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{signal.problem_statement}</p>

                {"role" in signal.target_persona && (
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="bg-raise rounded px-2.5 py-2">
                      <span className="text-dim block">PERSONA</span>
                      <span className="text-ink">{signal.target_persona.role}</span>
                    </div>
                    <div className="bg-raise rounded px-2.5 py-2">
                      <span className="text-dim block">BUDGET</span>
                      <span className="text-ink">{signal.target_persona.budget_band}</span>
                    </div>
                  </div>
                )}

                <div>
                  <p className="font-mono text-[10px] tracking-[0.18em] text-dim mb-2">
                    CITATIONS · VERBATIM EVIDENCE
                  </p>
                  <ul className="space-y-2">
                    {signal.citations.slice(0, 3).map((c, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 * i }}
                        className="flex items-start gap-2 text-[12px] text-mist"
                      >
                        <span className={`font-mono text-[9px] border rounded px-1 py-px shrink-0 ${SIGNAL_BADGE[c.signal].cls}`}>
                          {SIGNAL_BADGE[c.signal].label}
                        </span>
                        <span>
                          “{c.quote}” <span className="text-dim">— {c.source}</span>
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
