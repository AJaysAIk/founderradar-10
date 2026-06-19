import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#08050F",
        panel: "#100A1F",
        raise: "#170F2B",
        seam: "#261A40",
        ink: "#F2EEFF",
        mist: "#A99FC4",
        dim: "#6E6390",
        phosphor: "#B16CFF",
        flare: "#FF9F6E",
        blood: "#FF4D8D",
        pulse: "#38E1FF",
      },
      fontFamily: {
        wordmark: ["Michroma", "sans-serif"],
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 28px -4px rgba(177,108,255,0.55)",
        "glow-flare": "0 0 24px -6px rgba(255,159,110,0.45)",
        "glow-blood": "0 0 24px -6px rgba(255,77,141,0.45)",
      },
      keyframes: {
        sweep: { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.25" } },
      },
      animation: {
        sweep: "sweep 3.2s linear infinite",
        blink: "blink 1.1s steps(1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
