import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Info, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAccountBalances } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useAllTransactions } from "@/hooks/useTransactions";
import { useSettings } from "@/hooks/useSettings";
import { cardOutstanding, transactionsSince } from "@/lib/derive";
import { cn } from "@/lib/utils";

const TOOLTIP = "Cash remaining after paying all current credit card dues.";

/**
 * Companion to the Net Cash hero: what would be left if every card's current
 * dues were settled today (Net Cash − total card outstanding). Every input is
 * derived live from transactions/accounts/cards, so it re-computes the instant
 * a card charge, bill payment, or balance changes. Goes destructive when the
 * dues would push you underwater.
 */
export function AvailableAfterSettlement() {
  const { total: netCash, isLoading: cashLoading } = useAccountBalances();
  const { active, isLoading: cardsLoading } = useCreditCards();
  const { transactions } = useAllTransactions();
  const { money, settings } = useSettings();

  // Floor card charges/payments to the tracking period so this stays coherent
  // with Net Cash (which is itself floored).
  const totalOutstanding = useMemo(() => {
    const tracked = transactionsSince(transactions, settings.trackingStartDate);
    return active.reduce((sum, c) => sum + cardOutstanding(c.id, tracked), 0);
  }, [active, transactions, settings.trackingStartDate]);

  // No cards → this figure is just Net Cash; skip the redundant card.
  if (cashLoading || cardsLoading || active.length === 0) return null;

  const available = netCash - totalOutstanding;
  const negative = available < 0;

  return (
    <Card
      variant="glass"
      className={cn(
        "h-full overflow-hidden",
        negative && "ring-1 ring-inset ring-destructive/50",
      )}
    >
      <CardContent className="flex h-full flex-col justify-center gap-3 p-5">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "grid h-8 w-8 shrink-0 place-content-center rounded-lg",
              negative
                ? "bg-destructive/15 text-destructive"
                : "bg-primary/15 text-primary",
            )}
          >
            {negative ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
          </span>
          <p className="text-xs font-medium text-muted-foreground">
            Available After Card Settlement
          </p>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={TOOLTIP}
                  className="ml-auto text-muted-foreground/60 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{TOOLTIP}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <p
          className={cn(
            "text-3xl font-bold tabular-nums tracking-tight",
            negative ? "text-destructive" : "text-foreground",
          )}
        >
          {money(available)}
        </p>

        <Link
          to="/credit-cards"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {money(netCash)} net cash − {money(totalOutstanding)} card dues
        </Link>

        {negative && (
          <p className="text-xs font-medium text-destructive">
            Card dues exceed your cash on hand.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
