import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { GlassCard } from "@/components/GlassCard";
import { Kinetic } from "@/components/Shell";
import {
  useBuildSignals, useContacts, useCreateContact, useSetContactStage,
} from "@/hooks/useEntities";
import { entities, demoMode } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import type { BuildSignal, ProspectResult, TargetPersona } from "@/lib/types";

// ---------------------------------------------------------------------------
// AI Prospector: pick an opportunity → AI researches public prospects, plus
// ready-made X-ray searches the founder can fire off themselves.
// ---------------------------------------------------------------------------

function xraySearches(sig: BuildSignal): Array<{ label: string; url: string; hint: string }> {
  const persona = ("role" in sig.target_persona ? sig.target_persona : null) as TargetPersona | null;
  const roleWords = (persona?.role ?? "founder").split(/[,(]/)[0].trim();
  const painWords = sig.problem_statement.split(" ").slice(0, 7).join(" ");
  const holes = persona?.watering_holes ?? [];
  const sub = holes.find((h) => h.startsWith("r/"))?.slice(2) ?? "smallbusiness";
  const g = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  return [
    { label: "LINKEDIN X-RAY", hint: "public profiles matching the persona", url: g(`site:linkedin.com/in "${roleWords}"`) },
    { label: "PAIN IN THE WILD", hint: "people publicly describing the pain", url: g(`"${painWords}" (forum OR reddit OR review)`) },
    { label: "REDDIT ORBIT", hint: `live threads in r/${sub}`, url: `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(painWords.split(" ").slice(0, 4).join(" "))}&restrict_sr=1` },
  ];
}

const CHANNEL_GLYPH: Record<ProspectResult["channel"], string> = {
  email: "✉", linkedin: "in", x: "𝕏", reddit: "ʀ", web: "◍",
};

function Prospector({ signals, onAdd }: {
  signals: BuildSignal[];
  onAdd: (p: ProspectResult, signalId: string) => void;
}) {
  const completed = signals.filter((s) => s.status === "completed");
  const [sigId, setSigId] = useState(completed[0]?.id ?? "");
  const sig = completed.find((s) => s.id === sigId) ?? completed[0];
  const hunt = useMutation({ mutationFn: (id: string) => entities.prospects.find(id) });

  if (!sig) return null;
  const searches = xraySearches(sig);

  return (
    <GlassCard eyebrow="AI PROSPECTOR · PICK AN OPPORTUNITY, FIND ITS PEOPLE" className="mt-6 overflow-hidden" delay={0.08}>
      <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-seam">
        <select
          value={sig.id}
          onChange={(e) => { setSigId(e.target.value); hunt.reset(); }}
          aria-label="Opportunity to prospect for"
          className="flex-1 min-w-[220px] bg-raise border border-seam rounded px-3 py-2 text-[12px] text-ink outline-none focus:border-phosphor/60"
        >
          {completed.map((s) => (
            <option key={s.id} value={s.id}>
              [{Math.round(s.validation_score ?? 0)}] {s.problem_statement.slice(0, 70)}
            </option>
          ))}
        </select>
        <motion.button
          onClick={() => hunt.mutate(sig.id)}
          disabled={hunt.isPending || demoMode}
          whileTap={{ scale: 0.96 }}
          className="font-mono text-[10px] tracking-[0.2em] px-4 py-2 rounded btn-primary shadow-glow disabled:opacity-40"
          title={demoMode ? "Connect the backend to research live prospects" : "Research public prospects"}
        >
          {hunt.isPending ? "RESEARCHING…" : "◉ FIND PROSPECTS"}
        </motion.button>
      </div>

      {/* X-ray searches: instant, no AI needed */}
      <div className="px-4 py-3 flex flex-wrap gap-2 border-b border-seam">
        {searches.map((x) => (
          <a key={x.label} href={x.url} target="_blank" rel="noreferrer"
            className="group font-mono text-[10px] tracking-widest px-3 py-2 rounded border border-seam text-mist hover:text-phosphor hover:border-phosphor/50 transition-colors"
            title={x.hint}>
            ↗ {x.label}
          </a>
        ))}
        <span className="font-mono text-[9px] text-dim self-center ml-auto">PRE-BUILT SEARCHES · OPEN IN NEW TAB</span>
      </div>

      <div className="p-4">
        {demoMode && (
          <p className="text-[12px] text-dim">
            Demo mode shows the X-ray searches above. Live prospect discovery (real public
            profiles with sources and openers) switches on once the backend is connected
            and the <span className="font-mono text-[11px]">prospect</span> worker is deployed.
          </p>
        )}
        {hunt.isError && (
          <p className="text-[12px] text-blood font-mono break-all">
            PROSPECT FAILED · {(hunt.error as Error)?.message ?? "unknown"} — if it says 404, deploy the function; otherwise check Edge Functions → prospect → Logs.
          </p>
        )}
        {hunt.isPending && (
          <p className="font-mono text-[10px] text-phosphor animate-blink">◉ SEARCHING PUBLIC SOURCES — THIS TAKES A MINUTE…</p>
        )}
        {hunt.isSuccess && hunt.data.length === 0 && !demoMode && (
          <p className="text-[12px] text-dim">No solid public prospects found this pass — try the X-ray searches, or re-run after refining the signal.</p>
        )}
        {hunt.isSuccess && hunt.data.length > 0 && (
          <div className="grid md:grid-cols-2 gap-3">
            {hunt.data.map((p, i) => (
              <motion.div key={`${p.name}-${i}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-raise/70 border border-seam rounded-lg p-3.5">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-[13px] font-medium">{p.name}</p>
                    <p className="font-mono text-[10px] text-dim">{p.role} · {p.company} · {p.region}</p>
                  </div>
                  <span className="font-mono text-[10px] text-pulse border border-seam rounded px-1.5 py-0.5 shrink-0">{CHANNEL_GLYPH[p.channel]} {p.channel.toUpperCase()}</span>
                </div>
                <p className="text-[11.5px] text-mist leading-relaxed mb-2">{p.why_relevant}</p>
                <p className="text-[11.5px] text-ink/85 leading-relaxed border-l-2 border-phosphor/50 pl-2 mb-3">“{p.opener}”</p>
                <div className="flex items-center justify-between">
                  <a href={p.source_url} target="_blank" rel="noreferrer"
                    className="font-mono text-[9.5px] text-dim hover:text-phosphor truncate max-w-[60%]">
                    ↗ SOURCE
                  </a>
                  <button onClick={() => onAdd(p, sig.id)}
                    className="font-mono text-[9.5px] tracking-widest px-2.5 py-1.5 rounded border border-phosphor/60 text-phosphor hover:bg-phosphor/10">
                    + ADD TO CRM
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
import type { ContactStage, FounderContact } from "@/lib/types";

const STAGES: Array<{ id: ContactStage; label: string; color: string }> = [
  { id: "identified", label: "IDENTIFIED", color: "#6E6390" },
  { id: "contacted", label: "CONTACTED", color: "#38E1FF" },
  { id: "replied", label: "REPLIED", color: "#A99FC4" },
  { id: "call_booked", label: "CALL BOOKED", color: "#FF9F6E" },
  { id: "pilot", label: "PILOT", color: "#B16CFF" },
  { id: "churned", label: "CHURNED", color: "#FF4D8D" },
];
const stageMeta = (id: ContactStage) => STAGES.find((s) => s.id === id)!;

// ---------------------------------------------------------------------------
// Network map: signal node at center, contacts on an orbit, edge + node color
// encodes stage, node radius encodes fit score.
// ---------------------------------------------------------------------------

function NetworkMap({ contacts, onSelect, selected }: {
  contacts: FounderContact[];
  onSelect: (id: string) => void;
  selected: string | null;
}) {
  const W = 460, H = 320, cx = W / 2, cy = H / 2, orbit = 118;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Contact network map">
      {/* orbit ring */}
      <circle cx={cx} cy={cy} r={orbit} fill="none" stroke="#261A40" strokeDasharray="3 5" />
      {contacts.map((c, i) => {
        const a = (i / Math.max(contacts.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * orbit;
        const y = cy + Math.sin(a) * orbit;
        const meta = stageMeta(c.stage);
        const r = 6 + ((c.lead_metrics.fit_score ?? 50) / 100) * 8;
        const isSel = selected === c.id;
        return (
          <g key={c.id} onClick={() => onSelect(c.id)} className="cursor-pointer">
            <motion.line
              x1={cx} y1={cy} x2={x} y2={y}
              stroke={meta.color} strokeOpacity={c.stage === "churned" ? 0.18 : 0.4}
              strokeWidth={isSel ? 1.6 : 0.8}
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: i * 0.07 }}
            />
            <motion.circle
              cx={x} cy={y} r={r}
              fill="#100A1F" stroke={meta.color} strokeWidth={isSel ? 2 : 1.2}
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: i * 0.07 }}
              style={isSel ? { filter: `drop-shadow(0 0 6px ${meta.color})` } : {}}
            />
            <text x={x} y={y + r + 12} textAnchor="middle" fontSize="8.5" fontFamily="JetBrains Mono" fill={isSel ? "#F2EEFF" : "#A99FC4"}>
              {c.full_name.split(" ")[0]}
            </text>
          </g>
        );
      })}
      {/* center signal node */}
      <circle cx={cx} cy={cy} r={20} fill="#100A1F" stroke="#B16CFF" strokeWidth="1.5"
        style={{ filter: "drop-shadow(0 0 10px rgba(177,108,255,0.5))" }} />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="8" fontFamily="JetBrains Mono" fill="#B16CFF">SIGNAL</text>
    </svg>
  );
}

export default function CRM() {
  const { data: contacts = [], isLoading } = useContacts();
  const { data: signals = [] } = useBuildSignals();
  const createContact = useCreateContact();
  const setStage = useSetContactStage();
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");

  const funnel = useMemo(
    () => STAGES.map((s) => ({ name: s.label, color: s.color, count: contacts.filter((c) => c.stage === s.id).length })),
    [contacts],
  );
  const pipelineValue = useMemo(
    () => contacts.filter((c) => c.stage !== "churned").reduce((s, c) => s + (c.lead_metrics.acv_estimate ?? 0), 0),
    [contacts],
  );
  const sel = contacts.find((c) => c.id === selected) ?? null;
  const primarySignal = signals[0];

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !primarySignal) return;
    createContact.mutate({
      full_name: name.trim(), company: company.trim() || null, role: null,
      channel: "email", build_signal_id: primarySignal.id,
    });
    setName(""); setCompany("");
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <p className="eyebrow mb-3">S-05 · OUTREACH CRM</p>
      <Kinetic text="Work the orbit." className="text-3xl sm:text-5xl font-bold tracking-tight mb-2" />
      <p className="text-mist max-w-xl mb-8">
        Every lead orbits the signal it validates. Move them through the stages — the
        funnel, the map, and the ledger stay in sync live.
      </p>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <GlassCard eyebrow="NETWORK MAP" className="p-4 pt-2">
          {isLoading
            ? <p className="font-mono text-[11px] text-dim animate-blink py-12 text-center">◉ HYDRATING…</p>
            : <NetworkMap contacts={contacts} onSelect={(id) => setSelected(id === selected ? null : id)} selected={selected} />}
        </GlassCard>

        <div className="space-y-4">
          <GlassCard eyebrow="STAGE FUNNEL" className="p-4 pt-2" delay={0.05}>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 8, fontFamily: "JetBrains Mono", fill: "#6E6390" }} axisLine={{ stroke: "#261A40" }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fontFamily: "JetBrains Mono", fill: "#6E6390" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(38,26,64,0.4)" }} contentStyle={{ background: "#100A1F", border: "1px solid #261A40", borderRadius: 6, fontSize: 11, fontFamily: "JetBrains Mono" }} labelStyle={{ color: "#A99FC4" }} itemStyle={{ color: "#F2EEFF" }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {funnel.map((f) => <Cell key={f.name} fill={f.color} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard eyebrow="PIPELINE" className="p-4 pt-2 flex items-baseline gap-3" delay={0.1}>
            <span className="font-mono text-2xl text-phosphor text-glow">£{pipelineValue.toLocaleString()}</span>
            <span className="font-mono text-[10px] text-dim">EST. ANNUAL VALUE · ACTIVE STAGES</span>
          </GlassCard>
        </div>
      </div>

      {/* Add + ledger */}
      <GlassCard eyebrow="LEDGER" className="overflow-hidden">
        <form onSubmit={add} className="flex flex-wrap gap-2 px-4 py-3 border-b border-seam">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" aria-label="Contact name"
            className="flex-1 min-w-[140px] bg-raise border border-seam rounded px-3 py-1.5 text-[12px] placeholder:text-dim focus:border-phosphor/60 outline-none" />
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" aria-label="Company"
            className="flex-1 min-w-[140px] bg-raise border border-seam rounded px-3 py-1.5 text-[12px] placeholder:text-dim focus:border-phosphor/60 outline-none" />
          <button type="submit" disabled={!name.trim() || createContact.isPending}
            className="font-mono text-[10px] tracking-widest px-3 rounded border border-phosphor/60 text-phosphor disabled:border-seam disabled:text-dim">
            + ADD LEAD
          </button>
        </form>

        <div className="divide-y divide-seam/60">
          {contacts.map((c) => {
            const meta = stageMeta(c.stage);
            return (
              <div key={c.id}
                className={`px-4 py-3 flex flex-wrap items-center gap-3 transition-colors ${selected === c.id ? "bg-raise/50" : "hover:bg-raise/30"}`}
                onClick={() => setSelected(c.id === selected ? null : c.id)}
              >
                <div className="min-w-[160px] flex-1">
                  <p className="text-[13px] font-medium">{c.full_name}</p>
                  <p className="font-mono text-[10px] text-dim">{c.company ?? "—"} · via {c.channel}</p>
                </div>
                <div className="font-mono text-[10px] text-dim hidden sm:block">
                  FIT <span className="text-ink">{c.lead_metrics.fit_score ?? "—"}</span>
                  <span className="mx-2">·</span>
                  ACV <span className="text-ink">£{c.lead_metrics.acv_estimate ?? 0}</span>
                </div>
                <select
                  value={c.stage}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setStage.mutate({ id: c.id, stage: e.target.value as ContactStage })}
                  aria-label={`Stage for ${c.full_name}`}
                  className="font-mono text-[10px] tracking-widest rounded px-2 py-1.5 bg-raise border outline-none"
                  style={{ color: meta.color, borderColor: `${meta.color}55` }}
                >
                  {STAGES.map((s) => <option key={s.id} value={s.id} style={{ color: "#F2EEFF" }}>{s.label}</option>)}
                </select>
              </div>
            );
          })}
          {!isLoading && contacts.length === 0 && (
            <p className="px-4 py-6 text-[13px] text-dim">No leads yet. Add the first one above — pull names straight from your citation sources.</p>
          )}
        </div>
      </GlassCard>

      <Prospector
        signals={signals}
        onAdd={(p, signalId) =>
          createContact.mutate({
            full_name: p.name, company: p.company || null, role: p.role || null,
            channel: p.channel === "web" ? "email" : p.channel, build_signal_id: signalId,
          })
        }
      />

      {/* Lead recommendations: cross-reference the signal's own evidence */}
      {primarySignal && (
        <GlassCard eyebrow="RECOMMENDED ORBITS · WHERE YOUR NEXT LEADS LIVE" className="mt-6 p-4 pt-2" delay={0.1}>
          <div className="grid sm:grid-cols-3 gap-3 mt-1">
            {("watering_holes" in primarySignal.target_persona
              ? (primarySignal.target_persona as TargetPersona).watering_holes
              : []
            ).map((w) => (
              <div key={w} className="bg-raise/70 border border-seam rounded p-3">
                <p className="font-mono text-[10px] text-phosphor mb-1">◉ {w}</p>
                <p className="text-[11.5px] text-mist leading-relaxed">
                  Recruit the voices behind your citations here — people already describing the pain in their own words convert fastest.
                </p>
              </div>
            ))}
            {primarySignal.citations.slice(0, 1).map((c) => (
              <div key={c.quote} className="bg-raise/70 border border-phosphor/30 rounded p-3">
                <p className="font-mono text-[10px] text-flare mb-1">★ HIGHEST-INTENT LEAD TYPE</p>
                <p className="text-[11.5px] text-mist leading-relaxed">
                  Anyone saying things like “{c.quote.slice(0, 60)}…” — they've already priced the pain.
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {sel && (
        <p className="font-mono text-[10px] text-dim mt-3">
          SELECTED: <span className="text-ink">{sel.full_name}</span> · last touch {sel.last_touch_at ? new Date(sel.last_touch_at).toLocaleDateString() : "never"} · {sel.milestones.length} milestones logged
        </p>
      )}
    </div>
  );
}
