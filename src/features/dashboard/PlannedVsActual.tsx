import { UtilizationBar, STATUS_TEXT } from "@/components/shared/UtilizationBar";
import { useSettings } from "@/hooks/useSettings";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CategorySummary } from "@/types";

interface Props {
  summaries: CategorySummary[];
  onSelect: (s: CategorySummary) => void;
}

/** Read-only planned-vs-actual list with progress bars; click to drill down. */
export function PlannedVsActual({ summaries, onSelect }: Props) {
  const { money } = useSettings();

  return (
    <ul className="divide-y">
      {summaries.map((s) => (
        <li key={s.category.id} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
          <div className="flex items-center justify-between gap-2 text-sm">
            <button
              type="button"
              className="flex min-w-0 items-center gap-2 text-left font-medium hover:underline disabled:no-underline"
              onClick={() => onSelect(s)}
              disabled={s.transactionCount === 0}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.category.color ?? "#94a3b8" }}
              />
              <span className="truncate">{s.category.name}</span>
            </button>
            <span className="shrink-0 text-muted-foreground">
              {money(s.actual)} / {money(s.planned)}
            </span>
          </div>
          <UtilizationBar utilization={s.utilization} status={s.status} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className={cn("font-medium", STATUS_TEXT[s.status])}>
              {s.planned > 0 ? formatPercent(s.utilization) : "No budget set"}
            </span>
            <span className={cn(s.remaining < 0 && "text-destructive")}>
              {s.remaining < 0
                ? `Over by ${money(Math.abs(s.remaining))}`
                : `${money(s.remaining)} left`}
            </span>
          </div>
          {s.safeDailySpend !== null && (
            <p className="text-xs text-muted-foreground">
              ≈ {money(s.safeDailySpend)}/day for {s.daysLeft} more{" "}
              {s.daysLeft === 1 ? "day" : "days"}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
