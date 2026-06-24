import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/shared/SearchInput";
import { BudgetRow } from "@/features/budgets/BudgetRow";
import { CategoryHistoryDialog } from "@/features/transactions/CategoryHistoryDialog";
import type { CategorySummary } from "@/types";

type CategoryFilter = "all" | "with" | "without";

export function BudgetsPage() {
  const { monthKey } = useMonth();
  const { setBudget, copyFrom } = useBudgets(monthKey);
  const { categorySummaries, summary, isLoading, isError, error, refetch } =
    useMonthData(monthKey);
  const { money } = useSettings();
  const [history, setHistory] = useState<CategorySummary | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");

  // A category "has a budget" when its planned amount is > 0.
  const withBudget = useMemo(
    () => categorySummaries.filter((s) => s.planned > 0),
    [categorySummaries],
  );
  const withoutBudget = useMemo(
    () => categorySummaries.filter((s) => s.planned <= 0),
    [categorySummaries],
  );
  const counts = {
    all: categorySummaries.length,
    with: withBudget.length,
    without: withoutBudget.length,
  };
  const base =
    filter === "with" ? withBudget : filter === "without" ? withoutBudget : categorySummaries;
  const q = query.trim().toLowerCase();
  const visible = q
    ? base.filter((s) => s.category.name.toLowerCase().includes(q))
    : base;

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

      {/* Category counts — click to filter the list below. */}
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { key: "all", label: "Total categories", n: counts.all },
            { key: "with", label: "With budget", n: counts.with },
            { key: "without", label: "Without budget", n: counts.without },
          ] as const
        ).map((c) => {
          const active = filter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter((cur) => (cur === c.key ? "all" : c.key))}
              className={cn(
                "rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active && "ring-2 ring-primary",
              )}
            >
              <p className="truncate text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{c.n}</p>
            </button>
          );
        })}
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search categories…"
      />

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
            {visible.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {q
                  ? "No categories match your search."
                  : filter === "without"
                    ? "Every category has a budget set. 🎉"
                    : "No categories with a budget yet."}
              </p>
            ) : (
              visible.map((s) => (
                <BudgetRow
                  key={s.category.id}
                  summary={s}
                  onSetBudget={(categoryId, amount) =>
                    setBudget.mutateAsync({ categoryId, amount })
                  }
                  onViewHistory={setHistory}
                />
              ))
            )}
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
