import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { GlassCard } from "@/components/GlassCard";
import { Kinetic } from "@/components/Shell";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "register" | "reset";

const COPY: Record<Mode, { title: string; cta: string }> = {
  login: { title: "Re-enter the grid.", cta: "SIGN IN" },
  register: { title: "Claim your radar.", cta: "CREATE ACCOUNT" },
  reset: { title: "Recover access.", cta: "SEND RESET LINK" },
};

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Demo mode has no auth surface — go straight in.
  if (!supabase) return <Navigate to="/" replace />;
  const client = supabase;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "login") {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";
        navigate(from, { replace: true });
      } else if (mode === "register") {
        const { error } = await client.auth.signUp({ email, password });
        if (error) throw error;
        setNotice({ kind: "ok", text: "Account created. Check your inbox to confirm, then sign in." });
        setMode("login");
      } else {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        setNotice({ kind: "ok", text: "Reset link sent. Check your inbox." });
      }
    } catch (err) {
      setNotice({ kind: "err", text: err instanceof Error ? err.message : "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <p className="eyebrow mb-3">ACCESS CONTROL</p>
      <Kinetic text={COPY[mode].title} className="text-3xl font-bold tracking-tight mb-6" />

      <GlassCard className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="font-mono text-[10px] tracking-[0.18em] text-dim">EMAIL</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-raise border border-seam rounded px-3 py-2 text-[13px] focus:border-phosphor/60 outline-none"
              autoComplete="email"
            />
          </label>

          {mode !== "reset" && (
            <label className="block">
              <span className="font-mono text-[10px] tracking-[0.18em] text-dim">PASSWORD</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-raise border border-seam rounded px-3 py-2 text-[13px] focus:border-phosphor/60 outline-none"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </label>
          )}

          {notice && (
            <p className={`text-[12px] ${notice.kind === "ok" ? "text-phosphor" : "text-blood"}`}>
              {notice.text}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full font-mono text-[11px] tracking-[0.2em] px-4 py-2.5 rounded btn-primary shadow-glow disabled:opacity-50"
          >
            {busy ? "WORKING…" : COPY[mode].cta}
          </button>
        </form>

        <div className="mt-4 flex justify-between font-mono text-[10px] text-dim">
          {mode !== "login" && (
            <button onClick={() => setMode("login")} className="hover:text-phosphor">← Sign in</button>
          )}
          {mode === "login" && (
            <>
              <button onClick={() => setMode("register")} className="hover:text-phosphor">Create account</button>
              <button onClick={() => setMode("reset")} className="hover:text-phosphor">Forgot password</button>
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
