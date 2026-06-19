import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { CommandBar } from "@/components/CommandBar";

const AURORA = ["#B16CFF", "#D85ED4", "#FF4D8D", "#FF7AA0", "#9F8CFF", "#38E1FF"];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const sample = (t: number) => {
  const seg = Math.min(Math.floor(t * (AURORA.length - 1)), AURORA.length - 2);
  const f = t * (AURORA.length - 1) - seg;
  const [a, b] = [hex(AURORA[seg]), hex(AURORA[seg + 1])];
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], f))).join(",")})`;
};

/** Kinetic typography: characters rise on a spring, colored along the aurora gradient. */
export function Kinetic({ text, className = "" }: { text: string; className?: string }) {
  const reduced = useReducedMotion();
  const chars = text.split("");
  if (reduced) return <h1 className={`${className} text-aurora`}>{text}</h1>;
  return (
    <h1 className={className} aria-label={text}>
      {chars.map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          aria-hidden
          className="inline-block"
          style={{ color: sample(i / Math.max(chars.length - 1, 1)), textShadow: "0 0 24px rgba(177,108,255,0.35)" }}
          initial={{ y: "0.8em", opacity: 0, rotateX: 55, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, rotateX: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22, delay: i * 0.024 }}
        >
          {ch === " " ? "\u00A0" : ch}
        </motion.span>
      ))}
    </h1>
  );
}

const LINKS = [
  { to: "/", label: "ONBOARD", code: "S-01" },
  { to: "/graveyard", label: "GRAVEYARD", code: "S-02" },
  { to: "/boardroom", label: "BOARDROOM", code: "S-03" },
  { to: "/signals", label: "SIGNALS", code: "S-04" },
  { to: "/crm", label: "CRM", code: "S-05" },
  { to: "/feedback", label: "TELEMETRY", code: "S-06" },
  { to: "/coach", label: "COACH", code: "S-07" },
  { to: "/sprint", label: "SPRINT", code: "S-08" },
  { to: "/evidence", label: "EVIDENCE", code: "S-09" },
  { to: "/analytics", label: "ANALYTICS", code: "S-10" },
];

export function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate("/auth");
  };
  return (
    <div className="min-h-screen flex flex-col">
      <CommandBar />
      <header className="sticky top-0 z-40 border-b border-seam bg-void/85 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-baseline gap-2.5">
            <span className="font-wordmark text-sm tracking-[0.25em] text-ink">
              FOUNDER<span className="text-aurora">RADAR</span>
            </span>
            <span className="hidden sm:inline font-mono text-[10px] text-dim">v0.4 / AURORA</span>
          </NavLink>
          <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Sections">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  `group px-3 py-1.5 rounded font-mono text-[11px] tracking-widest transition-colors ${
                    isActive ? "text-phosphor bg-phosphor/10" : "text-mist hover:text-ink"
                  }`
                }
              >
                <span className="text-dim mr-1.5 group-hover:text-phosphor/70">{l.code}</span>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <kbd className="hidden md:inline font-mono text-[9px] text-dim border border-seam rounded px-1.5 py-1 ml-2 shrink-0">⌘K</kbd>
          {supabase && (
            <button
              onClick={signOut}
              className="ml-2 font-mono text-[10px] tracking-widest text-dim hover:text-blood transition-colors shrink-0"
            >
              EXIT
            </button>
          )}
        </div>
      </header>
      <main className="flex-1">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 160, damping: 24 }}
        >
          <Outlet />
        </motion.div>
      </main>
      <footer className="border-t border-seam py-4">
        <div className="mx-auto max-w-6xl px-5 flex items-center justify-between font-mono text-[10px] text-dim">
          <span>FOUNDERRADAR · MARKET PAIN, TRIANGULATED</span>
          <span className="text-phosphor/60">ALL SYSTEMS NOMINAL</span>
        </div>
      </footer>
    </div>
  );
}
