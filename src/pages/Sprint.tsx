import { useMemo } from "react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { Kinetic } from "@/components/Shell";
import { DEMO_SIGNAL } from "@/hooks/useBuildSignal";
import { useBuildSignals, keys } from "@/hooks/useEntities";
import { SignalPicker, useSelectedSignal } from "@/components/SignalPicker";
import { entities } from "@/lib/api";
import type { SprintTask, ValidationPlan } from "@/lib/types";

export default function Sprint() {
  const { data: signals = [] } = useBuildSignals();
  const qc = useQueryClient();
  const { signal, select } = useSelectedSignal(signals, DEMO_SIGNAL);
  const plan = signal.validation_plan as ValidationPlan;
  const sprint: SprintTask[] = plan?.sprint ?? [];

  const toggle = useMutation({
    mutationFn: (day: number) => entities.sprints.toggleTask(signal.id, day),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.signals }),
  });

  const doneCount = sprint.filter((t) => t.done).length;
  const pct = sprint.length ? Math.round((doneCount / sprint.length) * 100) : 0;
  const today = useMemo(() => sprint.find((t) => !t.done)?.day ?? sprint.length, [sprint]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="eyebrow mb-3">S-08 · VALIDATION SPRINT</p>
      <Kinetic text="Seven days to a verdict." className="text-3xl sm:text-5xl font-bold tracking-tight mb-2" />
      <p className="text-mist max-w-xl mb-8">
        The pipeline wrote this week for you. Every day has one job and one measurable
        goal; day seven is the go / pivot / kill call. Tick them off — progress persists.
      </p>

      <div className="mb-4">
        <SignalPicker signals={signals} fallback={DEMO_SIGNAL} selectedId={signal.id} onSelect={select} className="w-full sm:max-w-md" />
      </div>

      {/* Progress strip */}
      <GlassCard className="p-4 mb-6 flex flex-wrap items-center gap-5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl text-aurora font-semibold">{pct}%</span>
          <span className="font-mono text-[10px] text-dim tracking-widest">COMPLETE</span>
        </div>
        <div className="flex-1 min-w-[160px] h-2 bg-raise rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #B16CFF, #FF4D8D, #38E1FF)" }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 22 }}
          />
        </div>
        <span className="font-mono text-[10px] text-dim">
          DAY <span className="text-ink">{today}</span> OF {sprint.length || 7} · {doneCount} TASKS DOWN
        </span>
      </GlassCard>

      {/* Day rail */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-8">
        {sprint.map((t, i) => (
          <GlassCard
            key={t.day}
            delay={i * 0.05}
            tone={t.done ? "phosphor" : t.day === today ? "flare" : "neutral"}
            className={`p-3.5 flex flex-col gap-2 ${t.done ? "opacity-80" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-mono text-[10px] tracking-widest ${t.day === today && !t.done ? "text-flare animate-blink" : "text-dim"}`}>
                DAY {t.day}{t.day === today && !t.done ? " · NOW" : ""}
              </span>
              <button
                onClick={() => toggle.mutate(t.day)}
                aria-label={`Mark day ${t.day} ${t.done ? "incomplete" : "complete"}`}
                className={`h-5 w-5 rounded grid place-items-center border transition-all ${
                  t.done ? "bg-phosphor border-phosphor text-void" : "border-seam text-transparent hover:border-phosphor/60"
                }`}
              >
                ✓
              </button>
            </div>
            <p className={`text-[12.5px] leading-snug ${t.done ? "line-through decoration-phosphor/50 text-mist" : ""}`}>
              {t.task}
            </p>
            <p className="font-mono text-[9.5px] text-dim mt-auto">GOAL: {t.goal}</p>
          </GlassCard>
        ))}
        {sprint.length === 0 && (
          <p className="col-span-full text-[13px] text-dim">No sprint yet — run a scan on the SIGNALS page and the pipeline writes one.</p>
        )}
      </div>

      {/* Interview kit + assumptions */}
      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard eyebrow="INTERVIEW QUESTION SET" className="p-4 pt-2">
          <ol className="space-y-2 mt-1.5">
            {(plan?.interview_questions ?? []).map((q, i) => (
              <li key={i} className="flex gap-3 text-[12.5px] text-mist leading-relaxed">
                <span className="font-mono text-[10px] text-phosphor shrink-0 pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                {q}
              </li>
            ))}
          </ol>
        </GlassCard>
        <GlassCard eyebrow="ASSUMPTIONS UNDER TEST" className="p-4 pt-2" delay={0.06}>
          <ul className="space-y-3 mt-1.5">
            {(plan?.assumptions ?? []).map((a, i) => (
              <li key={i} className="bg-raise/70 border border-seam rounded p-3">
                <p className="text-[12.5px] mb-1">{a.assumption}</p>
                <p className="font-mono text-[10px] text-dim">TEST · <span className="text-mist">{a.test}</span></p>
                <p className="font-mono text-[10px] text-blood mt-0.5">KILL IF · {a.kill_threshold}</p>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
