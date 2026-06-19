import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Kinetic } from "@/components/Shell";
import { DEMO_SIGNAL } from "@/hooks/useBuildSignal";
import { useBuildSignals } from "@/hooks/useEntities";
import { SignalPicker, useSelectedSignal } from "@/components/SignalPicker";
import { supabase, FUNCTIONS_BASE } from "@/lib/supabase";
import type { BuildSignal } from "@/lib/types";

type Msg = { role: "you" | "coach"; text: string };

/** Local critical-coach fallback: pushes on the weakest evidence dimension. */
function localCoach(signal: BuildSignal, history: Msg[], message: string): string {
  const sb = signal.score_breakdown as Record<string, number>;
  const dims = Object.entries(sb ?? {}).sort((a, b) => a[1] - b[1]);
  const weakest = dims[0]?.[0]?.replace(/_/g, " ") ?? "willingness to pay";
  const turns = history.filter((m) => m.role === "coach").length;
  const probes = [
    `Your weakest dimension is ${weakest}. What single conversation this week would move that number? Book it before you build anything.`,
    `You're describing the solution again. Tell me the last time a real person paid money or lost hours to this problem — date, name, amount.`,
    `What's the kill threshold for that? If you can't name the number that makes you stop, you're not testing — you're hoping.`,
    `That assumption is load-bearing. Run it past 5 people from your citations list and come back with verbatims, not summaries.`,
    `Cheaper test exists: instead of that, make the concierge offer today. Three paid yeses beats any landing page.`,
  ];
  const m = message.toLowerCase();
  if (m.match(/price|charg|pay/)) return `Don't ask people what they'd pay — offer a price and watch behavior. Anchor against the £150/mo workaround in your citations. How many firms will you offer it to this week?`;
  if (m.match(/build|feature|app|code/)) return `Stop. ${signal.roadmap[0]?.kill_criteria ? `Your own plan says: kill if "${signal.roadmap[0].kill_criteria}".` : ""} Has that test run yet? Build nothing until it has.`;
  return probes[turns % probes.length];
}

export default function Coach() {
  const { data: signals = [] } = useBuildSignals();
  const { signal, select } = useSelectedSignal(signals, DEMO_SIGNAL);
  const [params] = useSearchParams();
  const intro: Msg = {
    role: "coach",
    text: "I've read your brief. I'm not here to encourage you — I'm here to find the assumption that kills this. What are you most sure about?",
  };
  const [msgs, setMsgs] = useState<Msg[]>([intro]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  // Switching signals starts a fresh session focused on that brief.
  useEffect(() => {
    setMsgs([intro]);
    seeded.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signal.id]);

  const send = async (text: string) => {
    const line = text.trim();
    if (!line || thinking) return;
    setDraft("");
    setMsgs((m) => [...m, { role: "you", text: line }]);
    setThinking(true);
    let reply: string;
    if (supabase && FUNCTIONS_BASE && signal.id !== "demo-signal") {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${FUNCTIONS_BASE}/coach`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${session?.access_token ?? ""}` },
          body: JSON.stringify({ message: line, history: msgs, build_signal_id: signal.id }),
        });
        reply = (await res.json()).reply ?? localCoach(signal, msgs, line);
      } catch { reply = localCoach(signal, msgs, line); }
    } else {
      await new Promise((r) => setTimeout(r, 650));
      reply = localCoach(signal, msgs, line);
    }
    setMsgs((m) => [...m, { role: "coach", text: reply }]);
    setThinking(false);
  };

  // ⌘K handoff: ?ask=... seeds the first question
  useEffect(() => {
    const ask = params.get("ask");
    if (ask && !seeded.current) { seeded.current = true; void send(ask); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="eyebrow mb-3">S-07 · IDEA COACH</p>
      <Kinetic text="No cheerleading in here." className="text-3xl sm:text-5xl font-bold tracking-tight mb-2" />
      <p className="text-mist max-w-xl mb-8">
        A coach configured for criticism: it reads your live brief and pushes on the
        weakest load-bearing assumption. Bring a thick skin and a calendar.
      </p>

      <GlassCard className="flex flex-col h-[520px] overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-seam px-4 py-2.5">
          <span className="font-mono text-[11px] tracking-widest text-mist shrink-0">COACHING:</span>
          <SignalPicker signals={signals} fallback={DEMO_SIGNAL} selectedId={signal.id} onSelect={select} className="flex-1" />
        </div>
        <div ref={logRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
          <AnimatePresence initial={false}>
            {msgs.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12, x: m.role === "you" ? 12 : -12 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                className={`flex ${m.role === "you" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[52ch] rounded-lg border px-3.5 py-2.5 ${
                  m.role === "you" ? "bg-raise border-seam" : "bg-panel border-flare/30"
                }`}>
                  <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: m.role === "you" ? "#F2EEFF" : "#FF9F6E" }}>
                    {m.role === "you" ? "YOU" : "✦ COACH"}
                  </p>
                  <p className="text-[13px] leading-relaxed text-ink/90">{m.text}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {thinking && (
            <p className="font-mono text-[10px] text-flare pl-1 animate-blink">✦ finding the weak point…</p>
          )}
        </div>
        <div className="border-t border-seam p-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(draft)}
            placeholder="Defend the idea, or ask where to push next…"
            aria-label="Message the coach"
            className="flex-1 bg-raise border border-seam rounded px-3 py-2 text-[13px] placeholder:text-dim focus:border-phosphor/60 outline-none"
          />
          <motion.button
            onClick={() => send(draft)}
            disabled={!draft.trim() || thinking}
            whileTap={{ scale: 0.95 }}
            className="font-mono text-[11px] tracking-widest px-4 rounded btn-primary shadow-glow disabled:opacity-40"
          >
            SEND
          </motion.button>
        </div>
      </GlassCard>
    </div>
  );
}
