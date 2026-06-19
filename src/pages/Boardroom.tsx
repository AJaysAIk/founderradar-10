import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Kinetic } from "@/components/Shell";
import { DEMO_SIGNAL } from "@/hooks/useBuildSignal";
import { useBuildSignals } from "@/hooks/useEntities";
import { SignalPicker, useSelectedSignal } from "@/components/SignalPicker";
import { supabase, FUNCTIONS_BASE } from "@/lib/supabase";
import type { BoardTurn, BuildSignal, PersonaId } from "@/lib/types";

// ---------------------------------------------------------------------------
// Persona registry
// ---------------------------------------------------------------------------

const PERSONAS: Record<
  Exclude<PersonaId, "founder">,
  { name: string; role: string; tag: string; color: string; glow: string }
> = {
  cfo: { name: "M. Okafor", role: "Skeptical CFO", tag: "CFO", color: "#FF9F6E", glow: "shadow-glow-flare" },
  cto: { name: "R. Voss", role: "Hyper-Technical CTO", tag: "CTO", color: "#38E1FF", glow: "shadow-glow" },
  user: { name: "Dave", role: "Target User", tag: "USR", color: "#B16CFF", glow: "shadow-glow" },
};

// ---------------------------------------------------------------------------
// Local debate engine — deterministic fallback that reads REAL metrics from
// the build signal, so objections always anchor to the founder's own numbers.
// ---------------------------------------------------------------------------

function localEngine(signal: BuildSignal, transcript: BoardTurn[], founderLine: string): BoardTurn {
  const totalWeeks = signal.roadmap.reduce((s, p) => s + p.weeks, 0);
  const persona = (signal.target_persona ?? {}) as { budget_band?: string; role?: string };
  const survivability = (signal.risk_profile as { survivability?: number })?.survivability ?? 50;
  const killQ = (signal.risk_profile as { kill_question?: string })?.kill_question;
  const topTrap = (signal.risk_profile as { failure_traps?: Array<{ trap: string; why_it_kills: string }> })
    ?.failure_traps?.[0];

  const pool: BoardTurn[] = [
    { persona: "cfo", metric: `${totalWeeks} wks runway burn`, line: `Your roadmap is ${totalWeeks} weeks before channel proof. At ${persona.budget_band ?? "that price band"}, I need CAC payback under 6 months — show me the math or cut a phase.` },
    { persona: "cfo", metric: `score ${Math.round(signal.validation_score ?? 0)}/100`, line: `A ${Math.round(signal.validation_score ?? 0)} validation score with a ${survivability} survivability from your own Cynic stage? Those two numbers are arguing with each other. Reconcile them.` },
    { persona: "cto", metric: "integration surface", line: `Phase "${signal.roadmap[2]?.phase ?? "build"}" assumes a clean bridge into accounting tools. Which API, what auth, what happens when the export schema drifts mid-tax-season?` },
    { persona: "cto", metric: `${signal.roadmap[2]?.weeks ?? 6} wk build`, line: `${signal.roadmap[2]?.weeks ?? 6} weeks for OCR on hand-written quotes in a moving van's lighting? Double it, or descope to typed quotes and say so in the plan.` },
    { persona: "user", metric: "lived workflow", line: `Be honest with me. ${killQ ?? "Will I open a second app when WhatsApp already works?"} Because right now the photo-to-myself trick costs me nothing.` },
    { persona: "user", metric: "kill criteria", line: `I like that "${signal.roadmap[0]?.phase ?? "phase one"}" has a stop condition — "${signal.roadmap[0]?.kill_criteria ?? "a kill rule"}". Most people pitching me never say what would make them quit.` },
    { persona: "cfo", metric: topTrap?.trap ?? "risk ledger", line: topTrap ? `Your own risk ledger flags "${topTrap.trap}": ${topTrap.why_it_kills} What line item de-risks that, and what does it cost?` : "Where is the line item that de-risks your top trap?" },
  ];

  // React to founder input when present, otherwise rotate fairly.
  const last = transcript.filter((t) => t.persona !== "founder").slice(-2).map((t) => t.persona);
  const lower = founderLine.toLowerCase();
  let pick: BoardTurn | undefined;
  if (lower.match(/price|charg|revenue|cac|margin|cost/)) pick = pool.find((p) => p.persona === "cfo" && !transcript.some((t) => t.line === p.line));
  else if (lower.match(/build|api|tech|ocr|integrat|scale/)) pick = pool.find((p) => p.persona === "cto" && !transcript.some((t) => t.line === p.line));
  else if (lower.match(/user|customer|dave|whatsapp|workflow/)) pick = pool.find((p) => p.persona === "user" && !transcript.some((t) => t.line === p.line));
  pick ??= pool.find((p) => !last.includes(p.persona) && !transcript.some((t) => t.line === p.line));
  pick ??= pool[transcript.length % pool.length];
  return pick;
}

// ---------------------------------------------------------------------------

export default function Boardroom() {
  const { data: allSignals = [] } = useBuildSignals();
  const { signal, select } = useSelectedSignal(allSignals, DEMO_SIGNAL);
  const demoMode = !supabase || signal.id === "demo-signal";
  const [transcript, setTranscript] = useState<BoardTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [speaking, setSpeaking] = useState<PersonaId | null>(null);
  const [live, setLive] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, speaking]);

  useEffect(() => { setTranscript([]); setLive(false); }, [signal.id]);

  const heat = useMemo(() => {
    const h: Record<string, number> = { cfo: 0, cto: 0, user: 0 };
    transcript.forEach((t) => { if (t.persona in h) h[t.persona] += 1; });
    return h;
  }, [transcript]);

  const nextTurn = useCallback(
    async (founderLine: string) => {
      if (!signal) return;
      setSpeaking("cfo"); // provisional "table is thinking" state
      let turn: BoardTurn;
      if (!demoMode && supabase && FUNCTIONS_BASE) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch(`${FUNCTIONS_BASE}/boardroom`, {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token ?? ""}` },
            body: JSON.stringify({ build_signal_id: signal.id, transcript, founder_line: founderLine }),
          });
          turn = (await res.json()).turn as BoardTurn;
        } catch {
          turn = localEngine(signal, transcript, founderLine);
        }
      } else {
        turn = localEngine(signal, transcript, founderLine);
      }
      setSpeaking(turn.persona);
      await new Promise((r) => setTimeout(r, 700)); // beat before the line lands
      setTranscript((t) => [...t, turn]);
      setSpeaking(null);
    },
    [signal, transcript, demoMode],
  );

  const openSession = async () => {
    if (!signal) return;
    setLive(true);
    setTranscript([{ persona: "founder", line: signal.problem_statement, metric: "opening pitch" }]);
    await nextTurn(signal.problem_statement);
  };

  const submit = async () => {
    const line = draft.trim();
    if (!line || speaking) return;
    setDraft("");
    setTranscript((t) => [...t, { persona: "founder", line }]);
    await nextTurn(line);
  };

  if (!signal) return null;
  const totalWeeks = signal.roadmap.reduce((s, p) => s + p.weeks, 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="eyebrow mb-3">S-03 · AI BOARDROOM</p>
      <Kinetic
        text="Pitch the table. Survive the math."
        className="text-3xl sm:text-5xl font-bold tracking-tight mb-2"
      />
      <p className="text-mist max-w-xl mb-8">
        Three personas hold your roadmap to the light. They argue from your own metrics —
        weeks, scores, kill criteria — not from vibes. Hold the room or revise the plan.
      </p>

      <div className="grid lg:grid-cols-[300px_1fr] gap-6 items-start">
        {/* ------------------------------------------------ Persona grid + brief */}
        <aside className="space-y-4">
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
            {(Object.keys(PERSONAS) as Array<keyof typeof PERSONAS>).map((id) => {
              const p = PERSONAS[id];
              const active = speaking === id;
              return (
                <motion.div
                  key={id}
                  animate={active ? { scale: 1.04 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className={`panel-card p-3 flex lg:flex-row flex-col items-center gap-3 ${active ? `${p.glow} border-opacity-100` : ""}`}
                  style={active ? { borderColor: p.color } : {}}
                >
                  <div
                    className="h-10 w-10 shrink-0 rounded-sm grid place-items-center font-mono text-[11px] font-semibold border"
                    style={{ color: p.color, borderColor: `${p.color}55`, background: `${p.color}10` }}
                  >
                    {p.tag}
                  </div>
                  <div className="min-w-0 text-center lg:text-left">
                    <p className="text-[13px] font-medium truncate">{p.name}</p>
                    <p className="font-mono text-[10px] text-dim truncate">{p.role}</p>
                    <div className="hidden lg:flex gap-0.5 mt-1.5" aria-label={`${heat[id]} interventions`}>
                      {Array.from({ length: Math.min(heat[id], 8) }).map((_, i) => (
                        <span key={i} className="h-1 w-2.5 rounded-sm" style={{ background: `${p.color}99` }} />
                      ))}
                    </div>
                  </div>
                  {active && (
                    <span className="font-mono text-[9px] animate-blink ml-auto hidden lg:inline" style={{ color: p.color }}>
                      ◉ SPEAKING
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="panel-card ticked p-4 font-mono text-[11px] space-y-2">
            <p className="eyebrow !text-[9px]">ON THE TABLE</p>
            <div className="flex justify-between"><span className="text-dim">VALIDATION</span><span className="text-phosphor">{Math.round(signal.validation_score ?? 0)}/100</span></div>
            <div className="flex justify-between"><span className="text-dim">ROADMAP</span><span>{signal.roadmap.length} phases · {totalWeeks} wks</span></div>
            <div className="flex justify-between"><span className="text-dim">CITATIONS</span><span>{signal.citations.length} verbatim</span></div>
            <div className="flex justify-between"><span className="text-dim">SURVIVABILITY</span><span className="text-flare">{(signal.risk_profile as { survivability?: number })?.survivability ?? "—"}</span></div>
          </div>
        </aside>

        {/* ------------------------------------------------ Debate floor */}
        <section className="panel-card ticked flex flex-col h-[560px]" aria-label="Boardroom transcript">
          <div className="flex items-center justify-between gap-3 border-b border-seam px-4 py-2.5">
            <SignalPicker signals={allSignals} fallback={DEMO_SIGNAL} selectedId={signal.id} onSelect={select} className="flex-1 min-w-0" />
            <span className={`font-mono text-[10px] shrink-0 ${live ? "text-blood animate-blink" : "text-dim"}`}>
              {live ? "● LIVE" : "○ CLOSED"}
            </span>
          </div>

          <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
            {!live && (
              <div className="h-full grid place-content-center text-center gap-4">
                <p className="text-mist text-sm max-w-[40ch]">
                  The table has read your brief. They are waiting.
                </p>
                <motion.button
                  onClick={openSession}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="mx-auto font-mono text-[11px] tracking-[0.2em] px-5 py-2.5 rounded btn-primary shadow-glow"
                >
                  ▶ OPEN SESSION
                </motion.button>
              </div>
            )}

            <AnimatePresence initial={false}>
              {transcript.map((t, i) => {
                const isFounder = t.persona === "founder";
                const p = isFounder ? null : PERSONAS[t.persona as keyof typeof PERSONAS];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 14, x: isFounder ? 14 : -14 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    className={`flex ${isFounder ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[52ch] rounded-md border px-3.5 py-2.5 ${isFounder ? "bg-raise border-seam" : "bg-panel"}`}
                      style={p ? { borderColor: `${p.color}44` } : {}}
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-mono text-[10px] font-semibold tracking-widest" style={p ? { color: p.color } : { color: "#F2EEFF" }}>
                          {isFounder ? "YOU · FOUNDER" : `${p!.tag} · ${p!.name.toUpperCase()}`}
                        </span>
                        {t.metric && (
                          <span className="font-mono text-[9px] text-dim border border-seam rounded px-1">
                            {t.metric}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] leading-relaxed text-ink/90">{t.line}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {speaking && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-mono text-[10px] text-dim pl-1"
              >
                <span style={{ color: PERSONAS[speaking as keyof typeof PERSONAS]?.color }}>
                  {PERSONAS[speaking as keyof typeof PERSONAS]?.tag ?? "TABLE"}
                </span>{" "}
                is forming an objection<span className="animate-blink">…</span>
              </motion.p>
            )}
          </div>

          <div className="border-t border-seam p-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={!live || !!speaking}
              placeholder={live ? "Defend your roadmap…" : "Open the session to speak"}
              aria-label="Your response to the board"
              className="flex-1 bg-raise border border-seam rounded px-3 py-2 text-[13px] placeholder:text-dim focus:border-phosphor/60 outline-none disabled:opacity-50"
            />
            <motion.button
              onClick={submit}
              disabled={!live || !draft.trim() || !!speaking}
              whileTap={{ scale: 0.95 }}
              className="font-mono text-[11px] tracking-widest px-4 rounded border border-phosphor/60 text-phosphor disabled:border-seam disabled:text-dim"
            >
              SEND
            </motion.button>
          </div>
        </section>
      </div>
    </div>
  );
}
