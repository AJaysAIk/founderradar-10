import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { GlassCard } from "@/components/GlassCard";
import { Kinetic } from "@/components/Shell";
import { checkIsAdmin, entities } from "@/lib/api";
import type { OwnerStats, WaitlistEntry } from "@/lib/types";

const REF_COLORS = ["#B16CFF", "#FF4D8D", "#38E1FF", "#FF9F6E", "#9F8CFF", "#6E6390"];

function waitlistCsv(rows: WaitlistEntry[]): string {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return "created_at,email,ref,note\n" +
    rows.map((r) => [r.created_at, r.email, r.ref, r.note].map(esc).join(",")).join("\n");
}

export default function Analytics() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [list, setList] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkIsAdmin().then(setAdmin); }, []);
  useEffect(() => {
    if (admin !== true) return;
    Promise.all([entities.stats.owner(), entities.waitlist.listForAdmin()])
      .then(([s, w]) => { setStats(s); setList(w); })
      .finally(() => setLoading(false));
  }, [admin]);

  // Cumulative growth curve by day.
  const growth = useMemo(() => {
    if (!list.length) return [];
    const byDay = new Map<string, number>();
    [...list].reverse().forEach((w) => {
      const d = w.created_at.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    });
    let cum = 0;
    return [...byDay.entries()].map(([day, n]) => ({ day: day.slice(5), total: (cum += n) }));
  }, [list]);

  // Source breakdown.
  const sources = useMemo(() => {
    const by = new Map<string, number>();
    list.forEach((w) => by.set(w.ref, (by.get(w.ref) ?? 0) + 1));
    return [...by.entries()].map(([ref, count]) => ({ ref, count })).sort((a, b) => b.count - a.count);
  }, [list]);

  const downloadCsv = () => {
    const blob = new Blob([waitlistCsv(list)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `founderradar-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (admin === null) return <div className="min-h-[40vh] grid place-content-center font-mono text-[11px] text-dim animate-blink">◉ VERIFYING OWNER…</div>;
  if (admin === false) return (
    <div className="mx-auto max-w-md px-5 py-20 text-center">
      <p className="eyebrow text-blood mb-3">RESTRICTED</p>
      <h1 className="text-xl font-semibold mb-2">Owner only.</h1>
      <p className="text-mist text-sm">Add your user id to the <span className="font-mono">admins</span> table in Supabase to unlock analytics.</p>
    </div>
  );

  const cards: Array<[string, number | string, string]> = [
    ["WAITLIST", stats?.waitlist_total ?? 0, "text-aurora"],
    ["ACTIVE USERS", stats?.active_users ?? 0, "text-phosphor"],
    ["SIGNALS RUN", stats?.signals_total ?? 0, "text-pulse"],
    ["COMPLETED", stats?.signals_completed ?? 0, "text-phosphor"],
    ["SCANS TODAY", stats?.scans_today ?? 0, "text-flare"],
    ["TESTIMONIALS", stats?.testimonials_total ?? 0, "text-ink"],
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
        <div>
          <p className="eyebrow mb-3">S-10 · ANALYTICS · OWNER ONLY</p>
          <Kinetic text="Watch it grow." className="text-3xl sm:text-5xl font-bold tracking-tight" />
        </div>
        <button onClick={downloadCsv} className="font-mono text-[10px] tracking-widest px-3 py-2 rounded border border-seam text-mist hover:text-phosphor hover:border-phosphor/50">↓ WAITLIST CSV</button>
      </div>
      <p className="text-mist max-w-xl mb-8">
        Live counts across the whole platform, plus where your waitlist is coming
        from. Share <span className="font-mono text-[12px] text-pulse">/welcome?ref=twitter</span> style links to track each channel.
      </p>

      {loading && <p className="font-mono text-[11px] text-dim animate-blink mb-6">◉ LOADING…</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {cards.map(([label, val, cls], i) => (
          <GlassCard key={label} delay={i * 0.04} className="p-4">
            <p className={`font-mono text-2xl ${cls}`}>{val}</p>
            <p className="font-mono text-[9px] tracking-widest text-dim mt-1">{label}</p>
          </GlassCard>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <GlassCard eyebrow="WAITLIST GROWTH" className="p-4 pt-2">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growth} margin={{ top: 12, right: 10, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="wl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B16CFF" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#B16CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "#6E6390" }} axisLine={{ stroke: "#261A40" }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "#6E6390" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#100A1F", border: "1px solid #261A40", borderRadius: 6, fontSize: 11, fontFamily: "JetBrains Mono" }} labelStyle={{ color: "#A99FC4" }} itemStyle={{ color: "#F2EEFF" }} />
                <Area type="monotone" dataKey="total" stroke="#B16CFF" strokeWidth={2} fill="url(#wl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard eyebrow="SIGNUPS BY SOURCE" className="p-4 pt-2" delay={0.06}>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sources} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "#6E6390" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="ref" width={78} tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#A99FC4" }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(38,26,64,0.4)" }} contentStyle={{ background: "#100A1F", border: "1px solid #261A40", borderRadius: 6, fontSize: 11, fontFamily: "JetBrains Mono" }} labelStyle={{ color: "#A99FC4" }} itemStyle={{ color: "#F2EEFF" }} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {sources.map((_, i) => <Cell key={i} fill={REF_COLORS[i % REF_COLORS.length]} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard eyebrow="RECENT SIGNUPS" className="mt-6 overflow-hidden" delay={0.1}>
        <div className="divide-y divide-seam/60 max-h-[320px] overflow-y-auto">
          {list.slice(0, 50).map((w) => (
            <div key={w.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-[12px]">
              <span className="text-ink truncate">{w.email}</span>
              <div className="flex items-center gap-3 shrink-0 font-mono text-[10px]">
                <span className="text-pulse border border-seam rounded px-1.5 py-0.5">{w.ref}</span>
                <span className="text-dim">{new Date(w.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {!loading && list.length === 0 && <p className="px-4 py-6 text-[13px] text-dim">No signups yet. Share your /welcome link to start filling the list.</p>}
        </div>
      </GlassCard>
    </div>
  );
}
