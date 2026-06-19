import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type AuthState = "checking" | "in" | "out";

export function useSession(): AuthState {
  const [state, setState] = useState<AuthState>(supabase ? "checking" : "in");
  useEffect(() => {
    if (!supabase) return; // demo mode: always in
    const client = supabase;
    client.auth.getSession().then(({ data }) => setState(data.session ? "in" : "out"));
    const { data: sub } = client.auth.onAuthStateChange((_e, session) =>
      setState(session ? "in" : "out"),
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return state;
}

/** Session gate: demo mode passes through; live mode requires a Supabase session. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const state = useSession();
  const location = useLocation();
  if (state === "checking") {
    return (
      <div className="min-h-[50vh] grid place-content-center font-mono text-[11px] tracking-[0.2em] text-dim">
        <span className="animate-blink">◉ VALIDATING SESSION…</span>
      </div>
    );
  }
  if (state === "out") return <Navigate to="/welcome" state={{ from: location }} replace />;
  return <>{children}</>;
}
