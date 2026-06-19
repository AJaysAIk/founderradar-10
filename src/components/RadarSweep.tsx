import { motion, useReducedMotion } from "framer-motion";
import type { SignalStatus } from "@/lib/types";

const STAGE_LABEL: Record<string, string> = {
  queued: "DISPATCHING",
  stage_0_scout: "STAGE 0 · SCOUT",
  stage_1_cynic: "STAGE 1 · THE CYNIC",
  stage_2_anchor: "STAGE 2 · DATA ANCHOR",
  stage_3_editor: "STAGE 3 · EDITOR",
  triangulated: "TRIANGULATED",
};

/**
 * The signature instrument: a phosphor radar scope.
 * Idle: slow ambient sweep. Scanning: fast sweep + blips. Failed: amber halt.
 */
export function RadarSweep({
  status,
  stage,
  size = 168,
}: {
  status: SignalStatus | "idle";
  stage?: string | null;
  size?: number;
}) {
  const reduced = useReducedMotion();
  const live = status === "scanning";
  const failed = status === "failed";
  const color = failed ? "#FF9F6E" : "#B16CFF";

  return (
    <div className="flex flex-col items-center gap-3 select-none" aria-live="polite">
      <div
        className="relative rounded-full border border-seam"
        style={{ width: size, height: size, background: "radial-gradient(circle, #100A1F 0%, #08050F 75%)" }}
        role="img"
        aria-label={`Scan status: ${status}${stage ? `, ${STAGE_LABEL[stage] ?? stage}` : ""}`}
      >
        {/* Range rings */}
        {[0.33, 0.66].map((r) => (
          <div
            key={r}
            className="absolute rounded-full border border-seam/70"
            style={{ inset: `${((1 - r) / 2) * 100}%` }}
          />
        ))}
        {/* Crosshair */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-seam/60" />
        <div className="absolute top-1/2 left-0 w-full h-px bg-seam/60" />

        {/* The sweep */}
        {!reduced && !failed && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, ${color}33 0deg, transparent 70deg)`,
              animation: `sweep ${live ? 1.6 : 5}s linear infinite`,
              mixBlendMode: "screen",
            }}
          />
        )}

        {/* Blips while scanning */}
        {live &&
          [
            { x: "62%", y: "30%", d: 0 },
            { x: "30%", y: "58%", d: 0.5 },
            { x: "70%", y: "70%", d: 1.1 },
          ].map((b) => (
            <motion.span
              key={b.x}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ left: b.x, top: b.y, background: color, boxShadow: `0 0 10px ${color}` }}
              animate={reduced ? {} : { opacity: [0, 1, 0], scale: [0.6, 1.4, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: b.d }}
            />
          ))}

        {/* Center dot */}
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full"
          style={{ background: color, boxShadow: failed ? "none" : `0 0 12px ${color}` }}
        />
      </div>

      <div className="font-mono text-[11px] tracking-[0.2em] uppercase">
        {status === "idle" && <span className="text-dim">STANDBY</span>}
        {live && (
          <span className="text-phosphor animate-blink">
            ◉ {STAGE_LABEL[stage ?? ""] ?? "SCANNING"}
          </span>
        )}
        {status === "completed" && <span className="text-phosphor">● SIGNAL LOCKED</span>}
        {failed && <span className="text-flare">▲ SCAN FAILED</span>}
      </div>
    </div>
  );
}
