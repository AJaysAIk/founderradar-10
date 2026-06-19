import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer,
} from "recharts";
import { GlassCard } from "@/components/GlassCard";
import { Kinetic } from "@/components/Shell";
import { RadarSweep } from "@/components/RadarSweep";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuildSignals, useSubmitPainSignal, keys } from "@/hooks/useEntities";
import { entities } from "@/lib/api";
import type { BuildSignal, OutreachScript, ScanMode, ScoreBreakdown, UkSetup, ValidationPlan } from "@/lib/types";

const SOURCES = ["reddit", "interview", "forum", "x", "support-ticket", "manual"];
const EFFORT_CLS = { S: "text-phosphor", M: "text-flare", L: "text-blood" } as const;
const CHANNEL_TAG: Record<OutreachScript["channel"], string> = { email: "EMAIL", x: "X / DM", linkedin: "LINKEDIN", reddit: "REDDIT" };
const DIMS: Array<[keyof ScoreBreakdown, string]> = [
  ["frequency", "FREQ"], ["urgency", "URG"], ["severity", "SEV"],
  ["willingness_to_pay", "WTP"], ["founder_fit", "FIT"],
];
const heatColor = (v: number) =>
  v >= 80 ? "rgba(177,108,255,0.85)" : v >= 60 ? "rgba(177,108,255,0.5)"
  : v >= 40 ? "rgba(255,159,110,0.45)" : "rgba(255,77,141,0.4)";

function ScoreRing({ score }: { score: number }) {
  const r = 22, c = 2 * Math.PI * r;
  return (
    <svg width="58" height="58" viewBox="0 0 58 58" role="img" aria-label={`Validation ${score}/100`}>
      <circle cx="29" cy="29" r={r} fill="none" stroke="#261A40" strokeWidth="4" />
      <motion.circle
        cx="29" cy="29" r={r} fill="none" stroke="#B16CFF" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} transform="rotate(-90 29 29)"
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - score / 100) }}
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
      />
      <text x="29" y="33" textAnchor="middle" className="fill-[#F2EEFF]" fontSize="14" fontFamily="JetBrains Mono" fontWeight="600">
        {Math.round(score)}
      </text>
    </svg>
  );
}

function SignalDetail({ s }: { s: BuildSignal }) {
  const [tab, setTab] = useState<"score" | "roadmap" | "validate" | "mvp" | "gtm" | "outreach" | "market" | "uk">("score");
  const tabs = [
    ["score", "SCORE"], ["roadmap", "ROADMAP"], ["validate", "VALIDATE"], ["mvp", "MVP"],
    ["gtm", "GTM"], ["outreach", "OUTREACH"], ["market", "MARKET"], ["uk", "UK SETUP"],
  ] as const;
  const mp = "wedge" in s.market_potential ? s.market_potential : null;
  const gtm = "motion" in s.gtm ? s.gtm : null;
  const sb = ("frequency" in s.score_breakdown ? s.score_breakdown : null) as ScoreBreakdown | null;
  const plan = ("sprint" in s.validation_plan ? s.validation_plan : null) as ValidationPlan | null;
  const uk = ("hmrc" in s.uk_setup ? s.uk_setup : null) as UkSetup | null;

  return (
    <div className="border-t border-seam">
      <div className="flex gap-1 px-4 pt-3 flex-wrap">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`font-mono text-[10px] tracking-widest px-2.5 py-1.5 rounded-t border-b-2 transition-colors ${
              tab === id ? "text-phosphor border-phosphor" : "text-dim border-transparent hover:text-mist"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="px-4 py-4">
        {tab === "score" && (sb ? (
          <div className="grid sm:grid-cols-[260px_1fr] gap-4 items-center">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={DIMS.map(([k, label]) => ({ dim: label, v: sb[k] }))} outerRadius="78%">
                  <PolarGrid stroke="#261A40" />
                  <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#A99FC4" }} />
                  <Radar dataKey="v" stroke="#B16CFF" fill="#B16CFF" fillOpacity={0.32} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {DIMS.map(([k, label]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-dim w-10">{label}</span>
                  <span className="flex-1 h-1.5 bg-raise rounded overflow-hidden">
                    <motion.span className="block h-full" style={{ background: heatColor(sb[k]) }}
                      initial={{ width: 0 }} animate={{ width: `${sb[k]}%` }} transition={{ delay: 0.1 }} />
                  </span>
                  <span className="font-mono text-[11px] text-ink w-8 text-right">{sb[k]}</span>
                </div>
              ))}
              <p className="font-mono text-[9.5px] text-dim pt-1">WEIGHTED → VALIDATION {Math.round(s.validation_score ?? 0)}/100 · WTP ×.25, FIT ×.15, REST ×.20</p>
            </div>
          </div>
        ) : <p className="text-[12px] text-dim">Scores land after the scan completes.</p>)}
        {tab === "validate" && (plan ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="font-mono text-[9.5px] tracking-widest text-dim mb-2">INTERVIEW QUESTIONS</p>
              <ol className="space-y-1.5">
                {plan.interview_questions.slice(0, 6).map((q, i) => (
                  <li key={i} className="text-[12px] text-mist flex gap-2">
                    <span className="font-mono text-[9.5px] text-phosphor pt-0.5">{i + 1}</span>{q}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="font-mono text-[9.5px] tracking-widest text-dim mb-2">RISKIEST ASSUMPTIONS</p>
              <ul className="space-y-2">
                {plan.assumptions.map((a, i) => (
                  <li key={i} className="text-[12px] text-mist bg-raise/70 border border-seam rounded p-2.5">
                    {a.assumption}
                    <span className="block font-mono text-[9.5px] text-blood mt-1">KILL IF · {a.kill_threshold}</span>
                  </li>
                ))}
              </ul>
              <p className="font-mono text-[9.5px] text-dim mt-2">FULL 7-DAY SPRINT → S-08 SPRINT BOARD</p>
            </div>
          </div>
        ) : <p className="text-[12px] text-dim">The validation plan lands after the scan completes.</p>)}
        {tab === "uk" && (uk ? (
          <dl className="grid sm:grid-cols-2 gap-3 text-[12px]">
            {([["STRUCTURE", uk.structure], ["COMPANIES HOUSE", uk.companies_house], ["HMRC", uk.hmrc], ["VAT", uk.vat], ["INSURANCE", uk.insurance], ["FIRST INVOICE", uk.first_invoice]] as const).map(([k, v]) => (
              <div key={k} className="bg-raise/70 border border-seam rounded p-3">
                <dt className="font-mono text-[9px] tracking-widest text-dim mb-1">{k}</dt>
                <dd className="text-mist leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>
        ) : <p className="text-[12px] text-dim">UK setup guidance lands after the scan completes.</p>)}
        {tab === "roadmap" && (
          <ol className="space-y-3">
            {s.roadmap.map((p, i) => (
              <li key={i} className="grid sm:grid-cols-[110px_1fr] gap-1 sm:gap-4">
                <div className="font-mono text-[10px] text-dim pt-0.5">
                  <span className="text-phosphor">{String(i + 1).padStart(2, "0")}</span> · {p.weeks} WKS
                </div>
                <div>
                  <p className="text-[13px] font-medium">{p.phase}</p>
                  <p className="text-[12px] text-mist">{p.objective}</p>
                  <p className="text-[11px] text-blood/90 font-mono mt-0.5">KILL IF: {p.kill_criteria}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
        {tab === "mvp" && (
          <ul className="space-y-2.5">
            {s.mvp_features.map((f, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`font-mono text-[10px] border border-seam rounded px-1.5 py-px mt-0.5 ${EFFORT_CLS[f.effort]}`}>{f.effort}</span>
                <div>
                  <p className="text-[13px]">{f.feature}</p>
                  <p className="text-[11px] text-dim">{f.why}</p>
                </div>
              </li>
            ))}
            {s.mvp_features.length === 0 && <p className="text-[12px] text-dim">Run a scan to generate the MVP cut.</p>}
          </ul>
        )}
        {tab === "gtm" && (gtm ? (
          <div className="space-y-3 text-[13px]">
            <p><span className="font-mono text-[10px] text-dim mr-2">MOTION</span>{gtm.motion}</p>
            <div className="flex flex-wrap gap-1.5">
              {gtm.channels.map((c) => (
                <span key={c} className="font-mono text-[10px] border border-seam rounded px-2 py-0.5 text-mist">{c}</span>
              ))}
            </div>
            <p className="text-mist text-[12px]"><span className="font-mono text-[10px] text-dim mr-2">FIRST 10</span>{gtm.first_10_customers}</p>
          </div>
        ) : <p className="text-[12px] text-dim">GTM lands after the scan completes.</p>)}
        {tab === "outreach" && (
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
            {s.outreach_scripts.map((o, i) => (
              <div key={i} className="bg-raise/70 border border-seam rounded p-3">
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="font-mono text-[9px] tracking-widest text-phosphor">{CHANNEL_TAG[o.channel]}</span>
                  <span className="font-mono text-[9px] text-dim">{o.persona_hook}</span>
                </div>
                {o.subject && <p className="text-[12px] font-medium mb-1">{o.subject}</p>}
                <p className="text-[11.5px] text-mist leading-relaxed">{o.body}</p>
                {o.follow_up && (
                  <p className="font-mono text-[10px] text-pulse mt-2 border-t border-seam pt-2">↻ 3-DAY NUDGE: {o.follow_up}</p>
                )}
              </div>
            ))}
            {s.outreach_scripts.length === 0 && <p className="text-[12px] text-dim">Scripts generate from citations on scan.</p>}
          </div>
        )}
        {tab === "market" && (mp ? (
          <dl className="grid sm:grid-cols-2 gap-3 text-[12px]">
            {([["TAM", mp.tam_note], ["SAM", mp.sam_note], ["WEDGE", mp.wedge], ["PRICING", mp.pricing_anchor]] as const).map(([k, v]) => (
              <div key={k} className="bg-raise/70 border border-seam rounded p-3">
                <dt className="font-mono text-[9px] tracking-widest text-dim mb-1">{k}</dt>
                <dd className="text-mist leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>
        ) : <p className="text-[12px] text-dim">Market sizing lands after the scan completes.</p>)}
      </div>
    </div>
  );
}

export default function Signals() {
  const { data: signals = [], isLoading } = useBuildSignals();
  const submit = useSubmitPainSignal();
  const qc = useQueryClient();
  const rescan = useMutation({
    mutationFn: (id: string) => entities.buildSignals.rescan(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.signals }),
  });
  const [raw, setRaw] = useState("");
  const [source, setSource] = useState("reddit");
  const [mode, setMode] = useState<ScanMode>("manual");
  const [open, setOpen] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  // ⌘K handoff: omnibox text arrives as ?seed=
  useEffect(() => {
    const seed = params.get("seed");
    if (seed) { setRaw(seed); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const lifecycle = useMemo(() => {
    const c = { scanning: 0, completed: 0, failed: 0 };
    signals.forEach((s) => { c[s.status] += 1; });
    return c;
  }, [signals]);

  const fire = (e: FormEvent) => {
    e.preventDefault();
    if (raw.trim().length < 12) return;
    submit.mutate({ raw_text: raw.trim(), source, mode });
    setRaw("");
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="eyebrow mb-3">S-04 · SIGNAL COMMAND</p>
      <Kinetic text="Feed the radar." className="text-3xl sm:text-5xl font-bold tracking-tight mb-2" />
      <p className="text-mist max-w-xl mb-8">
        Paste raw pain — a Reddit thread, an interview note, a support ticket. The pipeline
        turns it into a scored opportunity with a roadmap, MVP cut, GTM plan, and outreach scripts.
      </p>

      <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start mb-8">
        {/* Intake */}
        <GlassCard eyebrow="RAW PAIN INTAKE" className="overflow-hidden">
          <form onSubmit={fire} className="p-4 pt-2 space-y-3">
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={4}
              placeholder={`"I spend my whole Sunday night typing jobs into the spreadsheet for the accountant…"`}
              aria-label="Raw pain signal text"
              className="w-full bg-raise border border-seam rounded px-3 py-2.5 text-[13px] placeholder:text-dim focus:border-phosphor/60 outline-none resize-y font-mono"
            />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex rounded border border-seam overflow-hidden font-mono text-[10px] tracking-widest" role="radiogroup" aria-label="Scan mode">
                {(["manual", "web"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={`px-3 py-1.5 transition-colors ${mode === m ? "bg-phosphor/15 text-phosphor" : "text-dim hover:text-mist"}`}>
                    {m === "manual" ? "MANUAL" : "◉ LIVE WEB SCAN"}
                  </button>
                ))}
              </div>
              <label className="font-mono text-[10px] text-dim flex items-center gap-2">
                SOURCE
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="bg-raise border border-seam rounded px-2 py-1.5 text-[11px] text-ink outline-none focus:border-phosphor/60"
                >
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <motion.button
                type="submit"
                disabled={raw.trim().length < 12 || submit.isPending}
                whileTap={{ scale: 0.96 }}
                className="font-mono text-[11px] tracking-[0.2em] px-4 py-2 rounded btn-primary shadow-glow disabled:bg-transparent disabled:text-dim disabled:border-seam disabled:shadow-none"
              >
                {submit.isPending ? "DISPATCHING…" : "▶ SUBMIT & SCAN"}
              </motion.button>
            </div>
            {submit.isError && (
              <p className="text-[12px] text-blood">{(submit.error as Error)?.message ?? "Scan failed to dispatch."}</p>
            )}
          </form>
        </GlassCard>

        {/* Lifecycle meter */}
        <GlassCard eyebrow="LIFECYCLE" className="p-4 pt-2">
          <div className="grid grid-cols-3 gap-2 font-mono text-center mt-2">
            <div><p className="text-xl text-phosphor">{lifecycle.completed}</p><p className="text-[9px] tracking-widest text-dim">LOCKED</p></div>
            <div><p className="text-xl text-pulse">{lifecycle.scanning}</p><p className="text-[9px] tracking-widest text-dim">SCANNING</p></div>
            <div><p className="text-xl text-flare">{lifecycle.failed}</p><p className="text-[9px] tracking-widest text-dim">FAILED</p></div>
          </div>
        </GlassCard>
      </div>

      {/* Validation heatmap */}
      {signals.some((s) => s.status === "completed") && (
        <GlassCard eyebrow="VALIDATION HEATMAP" className="mb-6 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr>
                <th className="text-left px-4 py-2 font-mono text-[9px] tracking-widest text-dim font-normal">SIGNAL</th>
                {DIMS.map(([, label]) => (
                  <th key={label} className="px-2 py-2 font-mono text-[9px] tracking-widest text-dim font-normal">{label}</th>
                ))}
                <th className="px-3 py-2 font-mono text-[9px] tracking-widest text-dim font-normal">Σ</th>
              </tr>
            </thead>
            <tbody>
              {signals.filter((s) => s.status === "completed").map((s) => {
                const b = ("frequency" in s.score_breakdown ? s.score_breakdown : null) as ScoreBreakdown | null;
                return (
                  <tr key={s.id} className="border-t border-seam/60">
                    <td className="px-4 py-2 text-[11.5px] text-mist max-w-[260px] truncate">{s.problem_statement}</td>
                    {DIMS.map(([k]) => (
                      <td key={k} className="px-2 py-2">
                        <div className="h-6 rounded grid place-items-center font-mono text-[10px] text-void"
                          style={{ background: b ? heatColor(b[k]) : "#170F2B", color: b && b[k] >= 40 ? "#08050F" : "#6E6390" }}>
                          {b ? b[k] : "—"}
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-2 font-mono text-[11px] text-aurora text-center">{Math.round(s.validation_score ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </GlassCard>
      )}

      {/* Signal ledger */}
      <div className="space-y-4">
        {isLoading && <p className="font-mono text-[11px] text-dim animate-blink">◉ HYDRATING SIGNALS…</p>}
        <AnimatePresence initial={false}>
          {signals.map((s, i) => (
            <GlassCard
              key={s.id}
              delay={Math.min(i * 0.05, 0.3)}
              tone={s.status === "completed" ? "phosphor" : s.status === "failed" ? "flare" : "neutral"}
            >
              <button
                className="w-full text-left p-4 flex items-center gap-4"
                onClick={() => setOpen(open === s.id ? null : s.id)}
                aria-expanded={open === s.id}
              >
                {s.status === "scanning" ? (
                  <div className="shrink-0"><RadarSweep status="scanning" stage={s.status_detail} size={58} /></div>
                ) : (
                  <div className="shrink-0"><ScoreRing score={s.validation_score ?? 0} /></div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-snug">{s.problem_statement}</p>
                  <p className="font-mono text-[10px] text-dim mt-1">
                    {s.status === "scanning"
                      ? `PIPELINE · ${(s.status_detail ?? "queued").toUpperCase().replace(/_/g, " ")}`
                      : s.status === "failed"
                        ? `FAILED · ${s.status_detail}`
                        : `${s.citations.length} CITATIONS · ${s.roadmap.length} PHASES · ${s.mvp_features.length} MVP FEATURES`}
                  </p>
                </div>
                {s.status === "failed" && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); rescan.mutate(s.id); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); rescan.mutate(s.id); } }}
                    className="font-mono text-[10px] tracking-widest px-2.5 py-1.5 rounded border border-flare/60 text-flare hover:bg-flare/10 shrink-0 cursor-pointer"
                  >
                    ↻ RETRY
                  </span>
                )}
                <span className="font-mono text-[10px] text-dim shrink-0">{open === s.id ? "▲" : "▼"}</span>
              </button>
              <AnimatePresence initial={false}>
                {open === s.id && s.status === "completed" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <SignalDetail s={s} />
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          ))}
        </AnimatePresence>
        {!isLoading && signals.length === 0 && (
          <p className="text-[13px] text-dim">No signals yet. Paste a pain above and run the first scan.</p>
        )}
      </div>
    </div>
  );
}
