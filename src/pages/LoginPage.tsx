import { useState } from "react";
import {
  Wallet,
  Loader2,
  AlertTriangle,
  TrendingUp,
  PiggyBank,
  CalendarClock,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { isFirebaseConfigured } from "@/lib/firebase";

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Totals that update themselves",
    text: "Add a transaction and every budget, total and report recalculates instantly — no manual tallying.",
  },
  {
    icon: CalendarClock,
    title: "Daily spend pacing",
    text: "See how many days are left in the month and a safe amount to spend per day, per category.",
  },
  {
    icon: PiggyBank,
    title: "Emergency fund & SIP",
    text: "Track monthly saving and investments with running totals and growth charts.",
  },
  {
    icon: BarChart3,
    title: "Monthly & yearly reports",
    text: "Filter by month or year and see exactly where your money went.",
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
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / value panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-black/10 blur-2xl" />

        <div className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">FinTrack</span>
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-tight">
              Your personal finance,
              <br />
              on autopilot.
            </h1>
            <p className="max-w-md text-sm text-primary-foreground/80">
              Replace the spreadsheet. Track spending, budgets, savings and
              investments — with totals derived automatically from your
              transactions.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-primary-foreground/75">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-primary-foreground/70">
          <ShieldCheck className="h-4 w-4" />
          Private by design — your data is isolated to your account.
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:hidden">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Wallet className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold">FinTrack</h1>
          </div>

          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to manage your money. New here? Signing in creates your
              account automatically.
            </p>
          </div>

          {!isFirebaseConfigured && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-left text-xs">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>
                Firebase isn't configured yet. Copy <code>.env.example</code> to{" "}
                <code>.env.local</code> and add your Firebase web app keys, then
                restart the dev server.
              </span>
            </div>
          )}

          <Button
            className="w-full"
            size="lg"
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

          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to keep your finances tidy. 🙂
          </p>
        </div>
      </div>
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
