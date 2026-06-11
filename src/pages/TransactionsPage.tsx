import { useMemo, useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { DataState } from "@/components/shared/DataState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMonth } from "@/hooks/useMonth";
import { useTransactions } from "@/hooks/useTransactions";
import { useSettings } from "@/hooks/useSettings";
import { sumExpenses, sumIncome } from "@/lib/derive";
import { TransactionForm } from "@/features/transactions/TransactionForm";
import { TransactionList } from "@/features/transactions/TransactionList";
import { TransactionFilters } from "@/features/transactions/TransactionFilters";
import { useTransactionFilters } from "@/features/transactions/useTransactionFilters";
import type { Transaction } from "@/types";

export function TransactionsPage() {
  const { monthKey } = useMonth();
  const { transactions, isLoading, isError, refetch, remove } = useTransactions(monthKey);
  const { money } = useSettings();
  const { filters, setFilters, filtered, isActive, reset } =
    useTransactionFilters(transactions);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const totals = useMemo(
    () => ({ income: sumIncome(filtered), expense: sumExpenses(filtered) }),
    [filtered],
  );

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (t: Transaction) => {
    setEditing(t);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Every total in the app is derived from these records."
        actions={
          <>
            <MonthPicker />
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-lg font-semibold text-success">{money(totals.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="text-lg font-semibold">{money(totals.expense)}</p>
          </CardContent>
        </Card>
      </div>

      <TransactionFilters
        filters={filters}
        setFilters={setFilters}
        isActive={isActive}
        onReset={reset}
      />

      <DataState
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        isEmpty={filtered.length === 0}
        emptyIcon={<Receipt className="h-10 w-10 text-muted-foreground" />}
        emptyTitle={isActive ? "No matches" : "No transactions yet"}
        emptyMessage={
          isActive
            ? "Try adjusting or clearing your filters."
            : "Add your first transaction for this month."
        }
        emptyAction={
          !isActive && (
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add transaction
            </Button>
          )
        }
      >
        <TransactionList
          transactions={filtered}
          onEdit={openEdit}
          onDelete={(id) => remove.mutateAsync(id)}
        />
      </DataState>

      <TransactionForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />
    </div>
  );
}
