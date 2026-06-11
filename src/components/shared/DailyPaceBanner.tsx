import { CalendarClock } from "lucide-react";
import { daysLeftInMonth, formatMonthKey } from "@/lib/date";
import { useSettings } from "@/hooks/useSettings";
import type { CategorySummary, MonthKey } from "@/types";

/**
 * "X days left in June 2026 · spend up to ₹Y/day" — driven by the system date,
 * only shown for the month currently in progress. The per-day figure sums the
 * safe daily spend across categories that have daily-pace tracking enabled.
 */
export function DailyPaceBanner({
  monthKey,
  summaries,
}: {
  monthKey: MonthKey;
  summaries: CategorySummary[];
}) {
  const { money } = useSettings();
  const days = daysLeftInMonth(monthKey);
  if (days === null) return null; // only the current month

  const totalSafeDaily = summaries.reduce((acc, s) => acc + (s.safeDailySpend ?? 0), 0);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border bg-card p-3 text-sm">
      <CalendarClock className="h-4 w-4 shrink-0 text-primary" />
      <span className="font-semibold">
        {days} {days === 1 ? "day" : "days"} left
      </span>
      <span className="text-muted-foreground">in {formatMonthKey(monthKey)}</span>
      {totalSafeDaily > 0 && (
        <span className="text-muted-foreground sm:ml-auto">
          Spend up to{" "}
          <span className="font-semibold text-foreground">{money(totalSafeDaily)}</span>/day
          across tracked budgets
        </span>
      )}
    </div>
  );
}
