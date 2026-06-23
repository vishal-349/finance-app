import { useMemo, useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { DataState } from "@/components/shared/DataState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMonth } from "@/hooks/useMonth";
import { useTransactions } from "@/hooks/useTransactions";
import { useIncomeSourceMap } from "@/hooks/useIncomeSources";
import { useSettings } from "@/hooks/useSettings";
import { sumIncome } from "@/lib/derive";
import { TransactionForm } from "@/features/transactions/TransactionForm";
import { TransactionList } from "@/features/transactions/TransactionList";
import { IncomeAmount, IncomeEyeToggle } from "@/components/shared/IncomeAmount";
import type { Transaction } from "@/types";

export function IncomePage() {
  const { monthKey } = useMonth();
  const { transactions, isLoading, isError, error, refetch, remove } = useTransactions(monthKey);
  const incomeMap = useIncomeSourceMap();
  const { money } = useSettings();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const income = useMemo(
    () => transactions.filter((t) => t.type === "income"),
    [transactions],
  );
  const total = sumIncome(income);

  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of income) {
      const key = t.incomeSourceId ?? "other";
      map.set(key, (map.get(key) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .map(([id, amount]) => ({
        id,
        name: incomeMap.get(id)?.name ?? "Other",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [income, incomeMap]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        description="Track salary, freelancing, interest and other income sources."
        actions={
          <>
            <MonthPicker />
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add income
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="flex items-start justify-between gap-2 p-5">
          <div>
            <p className="text-sm text-muted-foreground">Total income this month</p>
            <p className="text-3xl font-bold text-success">
              <IncomeAmount value={total} />
            </p>
          </div>
          <IncomeEyeToggle />
        </CardContent>
      </Card>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        isEmpty={income.length === 0}
        emptyIcon={<TrendingUp className="h-10 w-10 text-muted-foreground" />}
        emptyTitle="No income recorded"
        emptyMessage="Add your income for this month to keep the dashboard accurate."
        emptyAction={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add income
          </Button>
        }
      >
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {bySource.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{s.name}</span>
                    <span className="font-medium tabular-nums">{money(s.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-3">
            <TransactionList
              transactions={income}
              hideCategory
              onEdit={(t) => {
                setEditing(t);
                setFormOpen(true);
              }}
              onDelete={(id) => remove.mutateAsync(id)}
            />
          </div>
        </div>
      </DataState>

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        defaultType="income"
      />
    </div>
  );
}
