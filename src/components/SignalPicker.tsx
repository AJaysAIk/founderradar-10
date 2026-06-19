import { useEffect } from "react";
import type { BuildSignal } from "@/lib/types";

const STORE_KEY = "fr:selected_signal";

/**
 * Shared signal selector. Persists the chosen id to localStorage so the
 * selection survives a refresh, and self-heals if that signal is gone.
 */
export function useSelectedSignal(signals: BuildSignal[], fallback: BuildSignal) {
  const completed = signals.filter((s) => s.status === "completed");
  const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORE_KEY) : null;
  const chosen =
    completed.find((s) => s.id === stored) ?? completed[0] ?? fallback;

  // Keep storage valid once real signals load in.
  useEffect(() => {
    if (completed.length && !completed.find((s) => s.id === stored)) {
      window.localStorage.setItem(STORE_KEY, completed[0].id);
    }
  }, [completed, stored]);

  const select = (id: string) => window.localStorage.setItem(STORE_KEY, id);
  return { signal: chosen, completed, select };
}

export function SignalPicker({
  signals, fallback, selectedId, onSelect, className = "",
}: {
  signals: BuildSignal[];
  fallback: BuildSignal;
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const completed = signals.filter((s) => s.status === "completed");
  const options = completed.length ? completed : [fallback];
  return (
    <select
      value={selectedId}
      onChange={(e) => onSelect(e.target.value)}
      aria-label="Choose a build signal"
      className={`bg-raise border border-seam rounded px-3 py-2 text-[12px] text-ink outline-none focus:border-phosphor/60 max-w-full truncate ${className}`}
    >
      {options.map((s) => (
        <option key={s.id} value={s.id}>
          [{Math.round(s.validation_score ?? 0)}] {s.problem_statement.slice(0, 64)}
        </option>
      ))}
    </select>
  );
}
