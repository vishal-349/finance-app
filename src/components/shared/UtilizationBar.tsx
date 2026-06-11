import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { CategorySummary } from "@/types";

const STATUS_STYLES: Record<CategorySummary["status"], string> = {
  safe: "bg-success",
  warning: "bg-warning",
  over: "bg-destructive",
};

export const STATUS_TEXT: Record<CategorySummary["status"], string> = {
  safe: "text-success",
  warning: "text-warning",
  over: "text-destructive",
};

/** A budget-utilization progress bar, colored by status. */
export function UtilizationBar({
  utilization,
  status,
  className,
}: {
  utilization: number;
  status: CategorySummary["status"];
  className?: string;
}) {
  const pct = isFinite(utilization) ? Math.min(utilization * 100, 100) : 100;
  return (
    <Progress
      value={pct}
      className={cn("h-2", className)}
      indicatorClassName={STATUS_STYLES[status]}
    />
  );
}
