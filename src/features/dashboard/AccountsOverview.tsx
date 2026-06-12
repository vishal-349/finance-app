import { Link } from "react-router-dom";
import { ArrowRight, Banknote, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccountBalances } from "@/hooks/useAccounts";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

/** Dashboard net-cash overview: total liquid balance + per-account chips. */
export function AccountsOverview() {
  const { balances, total } = useAccountBalances();
  const { money } = useSettings();

  if (balances.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Banknote className="h-4 w-4" /> Accounts
        </CardTitle>
        <Link
          to="/accounts"
          aria-label="Open accounts"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{money(total)}</p>
        <p className="text-xs text-muted-foreground">
          net cash across {balances.length} account{balances.length === 1 ? "" : "s"}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {balances.map((b) => (
            <div
              key={b.account.id}
              className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                {b.account.type === "cash" ? (
                  <Wallet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: b.account.color ?? "#64748b" }}
                  />
                )}
                <span className="truncate">{b.account.name}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 font-medium tabular-nums",
                  b.balance < 0 && "text-destructive",
                )}
              >
                {money(b.balance)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
