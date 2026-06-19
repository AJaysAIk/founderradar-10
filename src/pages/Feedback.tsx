import { useMemo, useState, type FormEvent } from "react";
import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { GlassCard } from "@/components/GlassCard";
import { Kinetic } from "@/components/Shell";
import { useBuildSignals, useCreateFeedback, useFeedback } from "@/hooks/useEntities";
import { TestimonialForm } from "@/pages/Feedback2";

const PMF_LABELS = ["", "Not disappointed", "Mildly", "Somewhat", "Very disappointed"];

export default function Feedback() {
  const { data: feedback = [], isLoading } = useFeedback();
  const { data: signals = [] } = useBuildSignals();
  const create = useCreateFeedback();
  const [nps, setNps] = useState(8);
  const [pmf, setPmf] = useState(3);
  const [verbatim, setVerbatim] = useState("");

  const npsHist = useMemo(() => {
    const bins = Array.from({ length: 11 }, (_, i) => ({ score: i, count: 0 }));
    feedback.forEach((f) => { if (f.nps != null) bins[f.nps].count += 1; });
    return bins;
  }, [feedback]);

  const npsScore = useMemo(() => {
    const scored = feedback.filter((f) => f.nps != null);
    if (!scored.length) return null;
    const promoters = scored.filter((f) => (f.nps ?? 0) >= 9).length;
    const detractors = scored.filter((f) => (f.nps ?? 0) <= 6).length;
    return Math.round(((promoters - detractors) / scored.length) * 100);
  }, [feedback]);

  const pmfPct = useMemo(() => {
    const scored = feedback.filter((f) => f.pmf_score != null);
    if (!scored.length) return null;
    return Math.round((scored.filter((f) => f.pmf_score === 4).length / scored.length) * 100);
  }, [feedback]);

  const trust = useMemo(() => {
    const dims = ["accuracy", "speed", "citations_trust"] as const;
    return dims.map((d) => {
      const vals = feedback.map((f) => f.scores?.[d]).filter((v): v is number => v != null);
      return { dim: d.replace("_", " ").toUpperCase(), avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
    });
  }, [feedback]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate({
      nps, pmf_score: pmf, verbatim: verbatim.trim() || null,
      build_signal_id: signals[0]?.id ?? null,
    });
    setVerbatim("");
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="eyebrow mb-3">S-06 · PILOT TELEMETRY</p>
      <Kinetic text="Let the pilots score you." className="text-3xl sm:text-5xl font-bold tracking-tight mb-2" />
      <p className="text-mist max-w-xl mb-8">
        The same discipline the platform demands of your market, turned on the platform
        itself: NPS, the Sean Ellis PMF ladder, and trust-by-dimension.
      </p>

      {/* Headline metrics */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <GlassCard eyebrow="NET PROMOTER" className="p-4 pt-2" tone={npsScore != null && npsScore >= 30 ? "phosphor" : "neutral"}>
          <p className="font-mono text-3xl mt-1 text-phosphor text-glow">{npsScore ?? "—"}</p>
          <p className="font-mono text-[9px] tracking-widest text-dim mt-1">{feedback.length} RESPONSES</p>
        </GlassCard>
        <GlassCard eyebrow="PMF · VERY DISAPPOINTED" className="p-4 pt-2" delay={0.05} tone={pmfPct != null && pmfPct >= 40 ? "phosphor" : "flare"}>
          <p className={`font-mono text-3xl mt-1 ${pmfPct != null && pmfPct >= 40 ? "text-phosphor text-glow" : "text-flare"}`}>{pmfPct ?? "—"}%</p>
          <p className="font-mono text-[9px] tracking-widest text-dim mt-1">SEAN ELLIS THRESHOLD: 40%</p>
        </GlassCard>
        <GlassCard eyebrow="TRUST BY DIMENSION" className="p-4 pt-2" delay={0.1}>
          <div className="space-y-1.5 mt-1.5">
            {trust.map((t) => (
              <div key={t.dim} className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-dim w-[88px]">{t.dim}</span>
                <span className="flex-1 h-1.5 bg-raise rounded overflow-hidden">
                  <span className="block h-full bg-phosphor/80" style={{ width: `${(t.avg / 5) * 100}%` }} />
                </span>
                <span className="font-mono text-[10px] text-ink">{t.avg.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* NPS histogram */}
        <GlassCard eyebrow="NPS DISTRIBUTION" className="p-4 pt-2">
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={npsHist} margin={{ top: 10, right: 8, left: -26, bottom: 0 }}>
                <XAxis dataKey="score" tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#6E6390" }} axisLine={{ stroke: "#261A40" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#6E6390" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(38,26,64,0.4)" }} contentStyle={{ background: "#100A1F", border: "1px solid #261A40", borderRadius: 6, fontSize: 11, fontFamily: "JetBrains Mono" }} labelStyle={{ color: "#A99FC4" }} itemStyle={{ color: "#F2EEFF" }} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {npsHist.map((b) => (
                    <Cell key={b.score} fill={b.score >= 9 ? "#B16CFF" : b.score >= 7 ? "#A99FC4" : "#FF4D8D"} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Capture + verbatims */}
        <div className="space-y-4">
          <GlassCard eyebrow="LOG FEEDBACK" className="p-4 pt-2" delay={0.05}>
            <form onSubmit={submit} className="space-y-3 mt-1">
              <label className="block font-mono text-[10px] text-dim">
                NPS · <span className="text-ink">{nps}</span>
                <input type="range" min={0} max={10} value={nps} onChange={(e) => setNps(Number(e.target.value))}
                  className="w-full mt-1 accent-[#B16CFF]" />
              </label>
              <label className="block font-mono text-[10px] text-dim">
                IF THIS DISAPPEARED TOMORROW · <span className="text-ink">{PMF_LABELS[pmf]}</span>
                <input type="range" min={1} max={4} value={pmf} onChange={(e) => setPmf(Number(e.target.value))}
                  className="w-full mt-1 accent-[#FF9F6E]" />
              </label>
              <textarea value={verbatim} onChange={(e) => setVerbatim(e.target.value)} rows={2}
                placeholder="Verbatim (optional)" aria-label="Verbatim feedback"
                className="w-full bg-raise border border-seam rounded px-3 py-2 text-[12px] placeholder:text-dim focus:border-phosphor/60 outline-none resize-y" />
              <button type="submit" disabled={create.isPending}
                className="font-mono text-[10px] tracking-[0.2em] px-4 py-2 rounded btn-primary shadow-glow disabled:opacity-50">
                LOG ENTRY
              </button>
            </form>
          </GlassCard>

          <GlassCard eyebrow="VERBATIMS" className="p-4 pt-2 max-h-[220px] overflow-y-auto" delay={0.1}>
            <ul className="space-y-2 mt-1">
              {feedback.filter((f) => f.verbatim).map((f) => (
                <li key={f.id} className="text-[12px] text-mist leading-relaxed">
                  <span className="font-mono text-[9px] text-phosphor mr-2">NPS {f.nps}</span>
                  “{f.verbatim}”
                </li>
              ))}
              {isLoading && <li className="font-mono text-[10px] text-dim animate-blink">◉ HYDRATING…</li>}
              {!isLoading && feedback.every((f) => !f.verbatim) && (
                <li className="text-[12px] text-dim">No verbatims yet.</li>
              )}
            </ul>
          </GlassCard>
        </div>
      </div>

      <div className="mt-10">
        <p className="eyebrow mb-3">LEAVE A TESTIMONIAL</p>
        <p className="text-mist text-sm max-w-xl mb-5">
          Your named feedback (with consent) becomes part of the evidence record.
          Owner-visible only — see the EVIDENCE vault.
        </p>
        <TestimonialForm source="in_app" />
      </div>
    </div>
  );
}
