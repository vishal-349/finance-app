import { useEffect, useRef, useState } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { UtilizationBar, STATUS_TEXT } from "@/components/shared/UtilizationBar";
import { useSettings } from "@/hooks/useSettings";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CategorySummary } from "@/types";

interface BudgetRowProps {
  summary: CategorySummary;
  onSetBudget: (categoryId: string, amount: number) => Promise<unknown>;
  onViewHistory: (summary: CategorySummary) => void;
}

/** One editable budget line: set planned amount, see derived actual/remaining. */
export function BudgetRow({ summary, onSetBudget, onViewHistory }: BudgetRowProps) {
  const { money } = useSettings();
  const { category, planned, actual, remaining, utilization, status, transactionCount } = summary;
  const [draft, setDraft] = useState(String(planned || ""));
  const lastSaved = useRef(planned);

  useEffect(() => {
    setDraft(planned ? String(planned) : "");
    lastSaved.current = planned;
  }, [planned]);

  const commit = async () => {
    const value = draft === "" ? 0 : Number(draft);
    if (Number.isNaN(value) || value === lastSaved.current) return;
    try {
      await onSetBudget(category.id, value);
      lastSaved.current = value;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save budget");
    }
  };

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-center gap-3">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: category.color ?? "#94a3b8" }}
        />
        <span className="flex-1 truncate font-medium">{category.name}</span>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>Budget</span>
          <Input
            type="number"
            inputMode="decimal"
            value={draft}
            placeholder="0"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-8 w-24 text-right"
          />
        </div>
      </div>

      <UtilizationBar utilization={utilization} status={status} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={() => onViewHistory(summary)}
          className="font-medium text-foreground underline-offset-2 hover:underline disabled:no-underline"
          disabled={transactionCount === 0}
          title={transactionCount ? "View transactions" : "No transactions yet"}
        >
          Spent {money(actual)}
          {transactionCount > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({transactionCount})
            </span>
          )}
        </button>
        <span className={cn("tabular-nums", remaining < 0 && "text-destructive")}>
          {remaining < 0 ? "Over by " : "Left "}
          {money(Math.abs(remaining))}
        </span>
        <span className={cn("font-medium tabular-nums", STATUS_TEXT[status])}>
          {planned > 0 ? formatPercent(utilization) : "—"}
        </span>
      </div>

      {summary.safeDailySpend !== null && summary.daysLeft !== null && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {summary.daysLeft} {summary.daysLeft === 1 ? "day" : "days"} left · spend up to{" "}
          <span className="font-medium text-foreground">{money(summary.safeDailySpend)}</span>/day
        </p>
      )}
    </div>
  );
}
