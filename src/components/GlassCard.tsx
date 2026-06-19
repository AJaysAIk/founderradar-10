import type { HTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { Tilt } from "@/components/Tilt";

type Tone = "neutral" | "phosphor" | "flare" | "blood";

const TONE_BORDER: Record<Tone, string> = {
  neutral: "rgba(38,26,64,1)",
  phosphor: "rgba(177,108,255,0.35)",
  flare: "rgba(255,159,110,0.35)",
  blood: "rgba(255,77,141,0.35)",
};

/**
 * GlassCard — the aesthetic-consistency primitive for all data surfaces.
 * Frosted panel over the tactical grid, corner ticks, optional tone edge,
 * spring entrance. Everything data-driven sits on one of these.
 */
export function GlassCard({
  tone = "neutral",
  eyebrow,
  delay = 0,
  className = "",
  children,
  ...rest
}: {
  tone?: Tone;
  eyebrow?: string;
  delay?: number;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <Tilt max={4}>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 26, delay }}
      whileHover={{ y: -3 }}
      className={`ticked panel-card relative rounded-lg border backdrop-blur-md ${className}`}
      style={{
        borderColor: TONE_BORDER[tone],
        background: "linear-gradient(180deg, rgba(23,15,43,0.72), rgba(16,10,31,0.85))",
      }}
      {...(rest as object)}
    >
      {eyebrow && (
        <p className="eyebrow px-4 pt-3.5 !text-[9px]">{eyebrow}</p>
      )}
      {children}
    </motion.div>
    </Tilt>
  );
}
