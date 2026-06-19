import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Kinetic } from "@/components/Shell";

// ---------------------------------------------------------------------------
// Matrix data: pain points (columns) × competitors (rows).
// Coverage: 0 = ignored, 1 = partial, 2 = solved. Dead competitors carry an
// epitaph — the verified cause of death — which is the most useful data here.
// ---------------------------------------------------------------------------

type Coverage = 0 | 1 | 2;

interface Competitor {
  name: string;
  status: "dead" | "zombie" | "alive";
  years: string;
  raised: string;
  epitaph: string;
  coverage: Coverage[]; // index-aligned with PAINS
}

const PAINS = [
  { id: "P1", label: "Sunday re-typing", desc: "Quote → invoice → accountant spreadsheet, by hand" },
  { id: "P2", label: "Paper-first quoting", desc: "Quotes written in the van, on paper, always" },
  { id: "P3", label: "WhatsApp as system", desc: "Photos in chat ARE the database" },
  { id: "P4", label: "Accountant handoff", desc: "Month-end export the accountant accepts" },
  { id: "P5", label: "Zero-training crews", desc: "Staff won't open a second app, ever" },
];

const COMPETITORS: Competitor[] = [
  {
    name: "JobDeck",
    status: "dead",
    years: "2017–2021",
    raised: "$4.2M seed",
    epitaph: "Built a 9-screen workflow for people who quote on paper. Onboarding survival rate: 11%. Starved on CAC.",
    coverage: [2, 0, 0, 1, 0],
  },
  {
    name: "TradeFlow",
    status: "dead",
    years: "2019–2023",
    raised: "$11M A",
    epitaph: "Sold to office managers that 4-person firms don't have. Churned every January with seasonal cashflow.",
    coverage: [2, 1, 0, 2, 0],
  },
  {
    name: "InvoiceVan",
    status: "dead",
    years: "2020–2022",
    raised: "bootstrapped",
    epitaph: "Nailed the invoice, ignored the accountant. Accountants vetoed it at month-end. Founder went back to contracting.",
    coverage: [1, 1, 0, 0, 1],
  },
  {
    name: "Tradify",
    status: "alive",
    years: "2013–",
    raised: "$10M+",
    epitaph: "Alive and broad. Wins firms of 10+, loses the man in a van — 'too many screens' is the top churn verbatim.",
    coverage: [2, 1, 0, 2, 0],
  },
  {
    name: "SnapQuote",
    status: "zombie",
    years: "2021–",
    raised: "$1.8M pre-seed",
    epitaph: "Walking dead: photo-quote demo went viral, retention flatlined. No accountant bridge, no reason to stay.",
    coverage: [0, 2, 1, 0, 1],
  },
];

const CELL: Record<Coverage, { glyph: string; cls: string; label: string }> = {
  0: { glyph: "·", cls: "text-dim/50", label: "ignored" },
  1: { glyph: "◐", cls: "text-flare/80", label: "partial" },
  2: { glyph: "●", cls: "text-mist", label: "solved" },
};

const STATUS_META = {
  dead: { tag: "✝ DEAD", cls: "text-blood border-blood/40 bg-blood/5" },
  zombie: { tag: "◍ ZOMBIE", cls: "text-flare border-flare/40 bg-flare/5" },
  alive: { tag: "● ALIVE", cls: "text-phosphor border-phosphor/40 bg-phosphor/5" },
} as const;

export default function Graveyard() {
  const [open, setOpen] = useState<string | null>("JobDeck");

  // Entry gap per pain: how much living, full coverage exists. Lower = wider gap.
  const gaps = useMemo(
    () =>
      PAINS.map((_, col) => {
        const liveSolved = COMPETITORS.filter(
          (c) => c.status !== "dead" && c.coverage[col] === 2,
        ).length;
        const anyPartial = COMPETITORS.some((c) => c.status !== "dead" && c.coverage[col] === 1);
        return liveSolved === 0 ? (anyPartial ? "narrow" : "wide") : "closed";
      }),
    [],
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="eyebrow mb-3">S-02 · COMPETITOR GRAVEYARD</p>
      <Kinetic
        text="Learn from the bodies."
        className="text-3xl sm:text-5xl font-bold tracking-tight mb-2"
      />
      <p className="text-mist max-w-xl mb-8">
        Every grave is a funded experiment you don't have to repeat. The matrix maps who
        covered which pain — the unlit columns are your entry gaps.
      </p>

      {/* ------------------------------------------------ Coverage matrix */}
      <section className="panel-card ticked overflow-x-auto mb-8" aria-label="Coverage matrix">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr className="border-b border-seam">
              <th className="text-left px-4 py-3 font-mono text-[10px] tracking-[0.18em] text-dim font-normal">
                OPERATOR
              </th>
              {PAINS.map((p, i) => (
                <th key={p.id} className="px-2 py-3 font-normal align-bottom">
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`font-mono text-[9px] tracking-widest px-1.5 py-px rounded border ${
                        gaps[i] === "wide"
                          ? "text-phosphor border-phosphor/50 shadow-glow"
                          : gaps[i] === "narrow"
                            ? "text-flare border-flare/40"
                            : "text-dim border-seam"
                      }`}
                      title={p.desc}
                    >
                      {gaps[i] === "wide" ? "GAP ◢" : gaps[i] === "narrow" ? "THIN" : "HELD"}
                    </span>
                    <span className="text-[11px] text-mist text-center leading-tight max-w-[10ch]">
                      {p.label}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPETITORS.map((c) => (
              <tr
                key={c.name}
                className={`border-b border-seam/60 last:border-0 cursor-pointer transition-colors hover:bg-raise/60 ${
                  open === c.name ? "bg-raise/40" : ""
                }`}
                onClick={() => setOpen(open === c.name ? null : c.name)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`font-mono text-[9px] px-1.5 py-px rounded border ${STATUS_META[c.status].cls}`}>
                      {STATUS_META[c.status].tag}
                    </span>
                    <span className={`text-sm font-medium ${c.status === "dead" ? "line-through decoration-blood/60 text-mist" : ""}`}>
                      {c.name}
                    </span>
                    <span className="font-mono text-[10px] text-dim hidden sm:inline">{c.years}</span>
                  </div>
                </td>
                {c.coverage.map((cov, i) => (
                  <td key={i} className="text-center py-3">
                    <span
                      className={`text-lg ${CELL[cov].cls} ${c.status === "dead" ? "opacity-40" : ""}`}
                      aria-label={`${c.name} / ${PAINS[i].label}: ${CELL[cov].label}`}
                    >
                      {CELL[cov].glyph}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-seam flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] text-dim">
          <span><span className="text-mist">●</span> solved</span>
          <span><span className="text-flare/80">◐</span> partial</span>
          <span><span className="text-dim/50">·</span> ignored</span>
          <span className="ml-auto text-phosphor/80">GAP ◢ = no living operator fully covers this pain</span>
        </div>
      </section>

      {/* ------------------------------------------------ Headstones */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {COMPETITORS.map((c, idx) => {
          const meta = STATUS_META[c.status];
          const isOpen = open === c.name;
          return (
            <motion.button
              key={c.name}
              layout
              onClick={() => setOpen(isOpen ? null : c.name)}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 24, delay: idx * 0.06 }}
              whileHover={{ y: -3 }}
              className={`panel-card text-left p-4 transition-shadow ${
                c.status === "dead" ? "hover:shadow-glow-blood" : c.status === "zombie" ? "hover:shadow-glow-flare" : "hover:shadow-glow"
              } ${isOpen ? "border-phosphor/40" : ""}`}
              aria-expanded={isOpen}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-mono text-[9px] px-1.5 py-px rounded border ${meta.cls}`}>{meta.tag}</span>
                <span className="font-mono text-[10px] text-dim">{c.raised}</span>
              </div>
              <h3 className="text-base font-semibold mb-0.5">{c.name}</h3>
              <p className="font-mono text-[10px] text-dim mb-2">{c.years}</p>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[13px] text-mist leading-relaxed overflow-hidden"
                  >
                    {c.epitaph}
                  </motion.p>
                )}
              </AnimatePresence>
              {!isOpen && (
                <p className="font-mono text-[10px] text-dim/80">tap for cause of death →</p>
              )}
            </motion.button>
          );
        })}

        {/* The open plot: your gap */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24, delay: COMPETITORS.length * 0.06 }}
          className="rounded-md border border-dashed border-phosphor/50 p-4 grid place-content-center text-center gap-1.5 bg-phosphor/[0.03]"
        >
          <span className="font-mono text-[10px] tracking-[0.2em] text-phosphor">OPEN PLOT</span>
          <p className="text-sm text-ink font-medium">WhatsApp-native + accountant bridge</p>
          <p className="text-[12px] text-mist">
            Columns P3 + P5 have no living, full coverage. That intersection is the wedge.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
