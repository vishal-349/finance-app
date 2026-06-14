import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Info, Wallet } from "lucide-react";
import { useAccountBalances, useCashBreakdown } from "@/hooks/useAccounts";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

/**
 * Dashboard hero: total liquid balance + per-account chips, rendered as a
 * premium 3D gradient glass panel. Every figure is derived from account
 * balances — nothing is hardcoded. A disclosure explains how Net Cash is built
 * (opening + in − out − saved) so the headline is never a black box.
 */
export function AccountsOverview() {
  const { balances, total } = useAccountBalances();
  const breakdown = useCashBreakdown();
  const { money } = useSettings();
  const [showCalc, setShowCalc] = useState(false);

  if (balances.length === 0) return null;

  const transfersNet = breakdown.transfersIn - breakdown.transfersOut;
  const setAside = breakdown.goals + breakdown.savings;

  return (
    <section
      className={cn(
        "group relative overflow-hidden rounded-2xl p-6 text-primary-foreground",
        "bg-gradient-to-br from-primary via-primary to-primary/70",
        "shadow-glow-lg ring-1 ring-inset ring-white/15",
      )}
    >
      {/* Layered depth: soft radial highlight + floating orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_85%_-10%,rgba(255,255,255,0.35),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 animate-float rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 right-16 h-40 w-40 animate-float rounded-full bg-white/10 blur-2xl"
        style={{ animationDelay: "1.5s" }}
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
            <Wallet className="h-4 w-4" /> Net cash
          </span>
          <Link
            to="/accounts"
            aria-label="Open accounts"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-primary-foreground/90 ring-1 ring-inset ring-white/20 transition-all hover:bg-white/25 hover:text-primary-foreground active:scale-95"
          >
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="mt-2 text-4xl font-bold tabular-nums tracking-tight drop-shadow-sm sm:text-5xl">
          {money(total)}
        </p>
        <p className="text-sm text-primary-foreground/75">
          across {balances.length} account{balances.length === 1 ? "" : "s"}
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map((b) => (
            <div
              key={b.account.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm shadow-inner-top backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              <span className="flex min-w-0 items-center gap-2">
                {b.account.type === "cash" ? (
                  <Wallet className="h-3.5 w-3.5 shrink-0 text-primary-foreground/80" />
                ) : (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/30"
                    style={{ backgroundColor: b.account.color ?? "#e2e8f0" }}
                  />
                )}
                <span className="truncate text-primary-foreground/90">{b.account.name}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 font-semibold tabular-nums",
                  b.balance < 0 ? "text-red-200" : "text-primary-foreground",
                )}
              >
                {money(b.balance)}
              </span>
            </div>
          ))}
        </div>

        {/* How is this calculated? — reconciling breakdown */}
        <button
          type="button"
          onClick={() => setShowCalc((s) => !s)}
          aria-expanded={showCalc}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary-foreground/80 transition-colors hover:text-primary-foreground"
        >
          <Info className="h-3.5 w-3.5" /> How is this calculated?
          <ChevronDown
            className={cn("h-3.5 w-3.5 transition-transform", showCalc && "rotate-180")}
          />
        </button>

        {showCalc && (
          <dl className="mt-2 space-y-1.5 rounded-xl border border-white/15 bg-white/10 p-3 text-sm shadow-inner-top backdrop-blur-sm">
            <CalcRow label="Opening balance" value={money(breakdown.opening)} />
            <CalcRow label="Income" value={`+ ${money(breakdown.income)}`} />
            {transfersNet !== 0 && (
              <CalcRow
                label="Transfers (net)"
                value={`${transfersNet >= 0 ? "+" : "−"} ${money(Math.abs(transfersNet))}`}
              />
            )}
            <CalcRow label="Spending (from accounts)" value={`− ${money(breakdown.spending)}`} />
            {breakdown.billPayments > 0 && (
              <CalcRow label="Card bill payments" value={`− ${money(breakdown.billPayments)}`} />
            )}
            {setAside > 0 && (
              <CalcRow label="Saved & invested" value={`− ${money(setAside)}`} />
            )}
            <div className="mt-1 flex items-center justify-between border-t border-white/20 pt-1.5 font-semibold">
              <dt>Net cash</dt>
              <dd className="tabular-nums">{money(breakdown.netCash)}</dd>
            </div>
            <p className="pt-1 text-[11px] text-primary-foreground/70">
              Card spend isn't subtracted until you pay the bill — it shows under Credit Cards as
              outstanding.
            </p>
          </dl>
        )}
      </div>
    </section>
  );
}

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-primary-foreground/80">{label}</dt>
      <dd className="tabular-nums text-primary-foreground">{value}</dd>
    </div>
  );
}
