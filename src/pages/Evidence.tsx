import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Kinetic } from "@/components/Shell";
import { checkIsAdmin, entities } from "@/lib/api";
import type { Testimonial } from "@/lib/types";

function toCsv(rows: Testimonial[]): string {
  const cols = ["created_at", "full_name", "role_company", "rating", "would_miss", "consent_quote", "source", "email", "quote"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc((r as unknown as Record<string, unknown>)[c])).join(",")).join("\n");
  return `${head}\n${body}`;
}

/**
 * Evidence Vault — visible only to the owner (admins table). Aggregates every
 * testimonial across all users for personal review and visa-evidence export.
 */
export default function Evidence() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyConsented, setOnlyConsented] = useState(false);

  useEffect(() => {
    checkIsAdmin().then(setAdmin);
  }, []);

  useEffect(() => {
    if (admin !== true) return;
    entities.testimonials.listForAdmin()
      .then(setRows)
      .finally(() => setLoading(false));
  }, [admin]);

  const view = useMemo(
    () => (onlyConsented ? rows.filter((r) => r.consent_quote) : rows),
    [rows, onlyConsented],
  );

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const rated = rows.map((r) => r.rating);
    const avg = (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(1);
    const promoters = rows.filter((r) => r.rating >= 9).length;
    const detractors = rows.filter((r) => r.rating <= 6).length;
    const nps = Math.round(((promoters - detractors) / rows.length) * 100);
    const veryMiss = rows.filter((r) => r.would_miss === 3).length;
    const pmf = Math.round((veryMiss / rows.length) * 100);
    const consented = rows.filter((r) => r.consent_quote).length;
    return { count: rows.length, avg, nps, pmf, consented };
  }, [rows]);

  const downloadCsv = () => {
    const blob = new Blob([toCsv(view)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `founderradar-evidence-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (admin === null) {
    return <div className="min-h-[40vh] grid place-content-center font-mono text-[11px] text-dim animate-blink">◉ VERIFYING OWNER…</div>;
  }
  if (admin === false) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <p className="eyebrow text-blood mb-3">RESTRICTED</p>
        <h1 className="text-xl font-semibold mb-2">Owner only.</h1>
        <p className="text-mist text-sm">
          This is the private evidence vault. Add your user id to the <span className="font-mono">admins</span> table
          in Supabase to unlock it.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <p className="eyebrow mb-3">S-09 · EVIDENCE VAULT · OWNER ONLY</p>
          <Kinetic text="The proof, all in one place." className="text-3xl sm:text-5xl font-bold tracking-tight" />
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={downloadCsv} className="font-mono text-[10px] tracking-widest px-3 py-2 rounded border border-seam text-mist hover:text-phosphor hover:border-phosphor/50">↓ CSV</button>
          <button onClick={() => window.print()} className="font-mono text-[10px] tracking-widest px-3 py-2 rounded border border-seam text-mist hover:text-phosphor hover:border-phosphor/50">⎙ PDF</button>
        </div>
      </div>
      <p className="text-mist max-w-xl mb-8">
        Every testimonial across all testers, aggregated for your eyes only. Export to
        CSV for records, or print to PDF for an evidence portfolio.
      </p>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {[
            ["RESPONSES", stats.count, "text-ink"],
            ["AVG RATING", `${stats.avg}/10`, "text-aurora"],
            ["NPS", stats.nps, "text-phosphor"],
            ["PMF · V.DISAPP.", `${stats.pmf}%`, "text-flare"],
            ["QUOTABLE", stats.consented, "text-pulse"],
          ].map(([label, val, cls], i) => (
            <GlassCard key={label as string} delay={i * 0.04} className="p-4">
              <p className={`font-mono text-2xl ${cls as string}`}>{val as string}</p>
              <p className="font-mono text-[9px] tracking-widest text-dim mt-1">{label as string}</p>
            </GlassCard>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mb-4 print:hidden">
        <label className="flex items-center gap-2 font-mono text-[10px] text-dim cursor-pointer">
          <input type="checkbox" checked={onlyConsented} onChange={(e) => setOnlyConsented(e.target.checked)} className="accent-[#B16CFF]" />
          SHOW ONLY QUOTABLE (CONSENTED) ENTRIES
        </label>
      </div>

      {loading && <p className="font-mono text-[11px] text-dim animate-blink">◉ LOADING EVIDENCE…</p>}

      <div className="space-y-3">
        {view.map((t, i) => (
          <motion.div key={t.id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.4) }}
            className="panel-card p-4">
            <div className="flex items-start justify-between gap-4 mb-1.5 flex-wrap">
              <div>
                <span className="text-[14px] font-medium">{t.full_name}</span>
                {t.role_company && <span className="text-mist text-[12px]"> · {t.role_company}</span>}
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className="text-aurora">{t.rating}/10</span>
                <span className="text-dim">{new Date(t.created_at).toLocaleDateString()}</span>
                <span className="text-dim border border-seam rounded px-1.5 py-0.5">{t.source === "public" ? "PUBLIC" : "IN-APP"}</span>
                {t.consent_quote && <span className="text-phosphor border border-phosphor/40 rounded px-1.5 py-0.5">✓ QUOTABLE</span>}
              </div>
            </div>
            <p className="text-[13px] text-ink/90 leading-relaxed">“{t.quote}”</p>
            {t.email && <p className="font-mono text-[10px] text-dim mt-1.5 print:block hidden">{t.email}</p>}
          </motion.div>
        ))}
        {!loading && view.length === 0 && (
          <p className="text-[13px] text-dim">No testimonials yet. Share your public feedback link to start collecting.</p>
        )}
      </div>
    </div>
  );
}
