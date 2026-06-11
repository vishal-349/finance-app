import { useState } from "react";
import { Copy, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { DataState } from "@/components/shared/DataState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMonth } from "@/hooks/useMonth";
import { useBudgets } from "@/hooks/useBudgets";
import { useMonthData } from "@/hooks/useMonthData";
import { useSettings } from "@/hooks/useSettings";
import { prevMonthKey, formatMonthKeyShort } from "@/lib/date";
import { BudgetRow } from "@/features/budgets/BudgetRow";
import { CategoryHistoryDialog } from "@/features/transactions/CategoryHistoryDialog";
import type { CategorySummary } from "@/types";

export function BudgetsPage() {
  const { monthKey } = useMonth();
  const { setBudget, copyFrom } = useBudgets(monthKey);
  const { categorySummaries, summary, isLoading, isError, error, refetch } =
    useMonthData(monthKey);
  const { money } = useSettings();
  const [history, setHistory] = useState<CategorySummary | null>(null);

  const handleCopy = async () => {
    const from = prevMonthKey(monthKey);
    try {
      const count = await copyFrom.mutateAsync(from);
      toast.success(
        count > 0
          ? `Copied ${count} budgets from ${formatMonthKeyShort(from)}`
          : `No budgets found in ${formatMonthKeyShort(from)}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Copy failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Plan each category's budget for the month. Spent is derived automatically."
        actions={
          <>
            <MonthPicker />
            <Button variant="outline" onClick={handleCopy} disabled={copyFrom.isPending}>
              <Copy className="h-4 w-4" /> Copy last month
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Planned</p>
            <p className="text-lg font-semibold">{money(summary.plannedExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Actual</p>
            <p className="text-lg font-semibold">{money(summary.actualExpenses)}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-lg font-semibold">
              {money(summary.plannedExpenses - summary.actualExpenses)}
            </p>
          </CardContent>
        </Card>
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        isEmpty={categorySummaries.length === 0}
        emptyIcon={<Wallet className="h-10 w-10 text-muted-foreground" />}
        emptyTitle="No categories to budget"
        emptyMessage="Add expense categories in Settings, then set their budgets here."
      >
        <Card>
          <CardContent className="divide-y p-0">
            {categorySummaries.map((s) => (
              <BudgetRow
                key={s.category.id}
                summary={s}
                onSetBudget={(categoryId, amount) =>
                  setBudget.mutateAsync({ categoryId, amount })
                }
                onViewHistory={setHistory}
              />
            ))}
          </CardContent>
        </Card>
      </DataState>

      <CategoryHistoryDialog
        open={!!history}
        onOpenChange={(o) => !o && setHistory(null)}
        monthKey={monthKey}
        categoryId={history?.category.id ?? null}
        categoryName={history?.category.name ?? ""}
      />
    </div>
  );
}
