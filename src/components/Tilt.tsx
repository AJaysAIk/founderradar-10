import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

/**
 * Tilt — tactile 3D: the card pivots in perspective toward the cursor and a
 * soft light spotlight tracks the pointer across its surface.
 */
export function Tilt({ children, max = 5, className = "" }: {
  children: ReactNode; max?: number; className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 180, damping: 18 });

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={`relative ${className}`}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", perspective: 900 }}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
        ref.current?.style.setProperty("--spot-x", `${((e.clientX - r.left) / r.width) * 100}%`);
        ref.current?.style.setProperty("--spot-y", `${((e.clientY - r.top) / r.height) * 100}%`);
      }}
      onMouseLeave={() => { px.set(0.5); py.set(0.5); }}
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 [div:hover>&]:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--spot-x,50%) var(--spot-y,50%), rgba(177,108,255,0.14), transparent 65%)",
        }}
      />
    </motion.div>
  );
}
