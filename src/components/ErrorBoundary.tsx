import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Top-level error boundary: a single component crash shows a recoverable panel
 * instead of a white screen — essential once strangers are using the app.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Hook for an error reporter (Sentry, etc.) later.
    console.error("[FounderRadar] uncaught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen grid place-content-center px-6 text-center gap-4">
          <p className="eyebrow text-blood">SYSTEM FAULT</p>
          <h1 className="text-2xl font-bold">Something broke on this screen.</h1>
          <p className="text-mist max-w-sm mx-auto text-sm">
            The rest of the app is fine. Reload to get back to a clean state — your
            saved signals and contacts are untouched.
          </p>
          <button
            onClick={() => window.location.assign("/")}
            className="mx-auto font-mono text-[11px] tracking-[0.2em] px-5 py-2.5 rounded btn-primary shadow-glow"
          >
            ↻ RELOAD
          </button>
          {import.meta.env.DEV && (
            <pre className="text-[10px] text-dim max-w-lg mx-auto overflow-auto text-left mt-2 p-3 bg-panel border border-seam rounded">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
