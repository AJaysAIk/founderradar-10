import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

type Cmd = { label: string; hint: string; to?: string; kind: "nav" | "scan" | "coach" };

const NAV: Cmd[] = [
  { label: "Onboarding · meet Dave", hint: "S-01", to: "/", kind: "nav" },
  { label: "Competitor Graveyard", hint: "S-02", to: "/graveyard", kind: "nav" },
  { label: "AI Boardroom", hint: "S-03", to: "/boardroom", kind: "nav" },
  { label: "Signal Command", hint: "S-04", to: "/signals", kind: "nav" },
  { label: "Outreach CRM", hint: "S-05", to: "/crm", kind: "nav" },
  { label: "Pilot Telemetry", hint: "S-06", to: "/feedback", kind: "nav" },
  { label: "Idea Coach", hint: "S-07", to: "/coach", kind: "nav" },
  { label: "Sprint Board", hint: "S-08", to: "/sprint", kind: "nav" },
];

/**
 * CommandBar — the Arc-style omnibox (⌘K / Ctrl+K).
 * Predictive routing: short queries match destinations; anything that reads
 * like real-world pain becomes a scan, pre-seeded into Signal Command.
 */
export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o); setQ(""); setIdx(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  const results = useMemo<Cmd[]>(() => {
    const t = q.trim().toLowerCase();
    if (!t) return NAV;
    const navHits = NAV.filter((c) => c.label.toLowerCase().includes(t));
    const looksLikePain = t.length > 24 || t.split(" ").length > 5;
    const dynamic: Cmd[] = [];
    if (q.trim()) {
      dynamic.push({ label: `Scan as pain signal: “${q.trim().slice(0, 56)}${q.trim().length > 56 ? "…" : ""}”`, hint: "↵ runs the pipeline", kind: "scan" });
      dynamic.push({ label: `Ask the Idea Coach: “${q.trim().slice(0, 48)}…”`, hint: "critical feedback", kind: "coach" });
    }
    return looksLikePain ? [...dynamic, ...navHits] : [...navHits, ...dynamic];
  }, [q]);

  const run = (c: Cmd) => {
    setOpen(false);
    if (c.kind === "nav" && c.to) navigate(c.to);
    if (c.kind === "scan") navigate(`/signals?seed=${encodeURIComponent(q.trim())}`);
    if (c.kind === "coach") navigate(`/coach?ask=${encodeURIComponent(q.trim())}`);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-start justify-center pt-[18vh] px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ background: "rgba(8,5,15,0.7)", backdropFilter: "blur(8px)" }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 24, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="w-full max-w-xl rounded-xl border border-seam bg-panel/95 backdrop-blur-xl shadow-glow overflow-hidden"
            role="dialog" aria-label="Command bar"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-seam">
              <span className="font-mono text-[11px] text-phosphor">▸</span>
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setIdx(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
                  if (e.key === "Enter" && results[idx]) run(results[idx]);
                }}
                placeholder="Go anywhere, or paste a pain to scan it…"
                className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-dim"
              />
              <kbd className="font-mono text-[9px] text-dim border border-seam rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <ul className="max-h-[300px] overflow-y-auto py-1.5">
              {results.map((c, i) => (
                <li key={`${c.kind}-${c.label}`}>
                  <button
                    onClick={() => run(c)}
                    onMouseEnter={() => setIdx(i)}
                    className={`w-full flex items-center justify-between gap-4 px-4 py-2.5 text-left text-[13px] transition-colors ${
                      i === idx ? "bg-raise text-ink" : "text-mist"
                    }`}
                  >
                    <span className="truncate">
                      {c.kind === "scan" && <span className="text-phosphor mr-2">◉</span>}
                      {c.kind === "coach" && <span className="text-flare mr-2">✦</span>}
                      {c.label}
                    </span>
                    <span className="font-mono text-[9px] text-dim shrink-0">{c.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
