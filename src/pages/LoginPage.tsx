import { useState } from "react";
import {
  Wallet,
  Loader2,
  AlertTriangle,
  TrendingUp,
  CalendarClock,
  Repeat,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isFirebaseConfigured } from "@/lib/firebase";
import "./login.css";

const HIGHLIGHTS = [
  {
    icon: TrendingUp,
    title: "Automatic totals",
    text: "Budgets and reports recalculate themselves.",
  },
  {
    icon: CalendarClock,
    title: "Daily spend pacing",
    text: "A safe amount to spend, every day.",
  },
  {
    icon: Repeat,
    title: "EMI & recurring autopilot",
    text: "Installments and rules post on schedule.",
  },
  {
    icon: BarChart3,
    title: "Annual insights",
    text: "A whole year of money at a glance.",
  },
];

export function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-100">
      {/* Animated background scene */}
      <div aria-hidden className="login-blob login-blob--emerald" />
      <div aria-hidden className="login-blob login-blob--indigo" />
      <div aria-hidden className="login-blob login-blob--teal" />
      <div aria-hidden className="login-grid" />

      <main className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-10">
        {/* Glass card */}
        <section className="w-full max-w-md space-y-7 rounded-2xl border border-white/10 bg-white/[0.06] p-7 shadow-2xl backdrop-blur-2xl duration-700 animate-in fade-in slide-in-from-bottom-4 fill-mode-both motion-reduce:animate-none sm:p-9">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-400/30 to-teal-500/15">
              <Wallet className="h-5 w-5 text-emerald-300" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              FinTrack
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              Your money,{" "}
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">
                on autopilot
              </span>
              .
            </h1>
            <p className="text-sm text-slate-400">
              Spending, budgets, EMIs and investments — totals derive
              themselves from your transactions.
            </p>
          </div>

          {!isFirebaseConfigured && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-left text-xs text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>
                Firebase isn't configured yet. Copy <code>.env.example</code>{" "}
                to <code>.env.local</code> and add your Firebase web app keys,
                then restart the dev server.
              </span>
            </div>
          )}

          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full bg-white text-slate-900 shadow-lg hover:bg-slate-100"
              onClick={handleSignIn}
              disabled={busy || !isFirebaseConfigured}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="h-4 w-4" />
              )}
              Continue with Google
            </Button>
            <p className="text-center text-xs text-slate-500">
              New here? Signing in creates your account automatically.
            </p>
          </div>
        </section>

        {/* Feature highlights */}
        <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map(({ icon: Icon, title, text }, i) => (
            <li
              key={title}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl duration-700 animate-in fade-in slide-in-from-bottom-4 fill-mode-both motion-reduce:animate-none"
              style={{ animationDelay: `${150 + i * 100}ms` }}
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gradient-to-br from-emerald-400/20 to-indigo-500/15">
                <Icon className="h-4 w-4 text-emerald-300" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-slate-100">{title}</p>
                <p className="text-xs leading-relaxed text-slate-400">
                  {text}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Trust footer */}
        <p
          className="flex items-center gap-2 text-xs text-slate-500 duration-700 animate-in fade-in slide-in-from-bottom-4 fill-mode-both motion-reduce:animate-none"
          style={{ animationDelay: "600ms" }}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400/80" />
          Private by design — your data stays in your account.
        </p>
      </main>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
