import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMonth } from "@/hooks/useMonth";
import { formatMonthKey, nextMonthKey, prevMonthKey } from "@/lib/date";

/** Prev / current-month / next stepper, bound to the shared MonthContext. */
export function MonthPicker() {
  const { monthKey, setMonthKey } = useMonth();
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Previous month"
        onClick={() => setMonthKey(prevMonthKey(monthKey))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[8.5rem] text-center text-sm font-medium">
        {formatMonthKey(monthKey)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Next month"
        onClick={() => setMonthKey(nextMonthKey(monthKey))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
