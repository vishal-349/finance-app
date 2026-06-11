import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataState } from "@/components/shared/DataState";
import { TransactionList } from "./TransactionList";
import { useCategoryTransactions } from "@/hooks/useTransactions";
import { useSettings } from "@/hooks/useSettings";
import { formatMonthKey } from "@/lib/date";
import { sumExpenses } from "@/lib/derive";
import type { MonthKey } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthKey: MonthKey;
  categoryId: string | null;
  categoryName: string;
}

/**
 * Drill-down: shows exactly which transactions make up a category's spent total
 * for the month — so the user always knows how a total was generated.
 */
export function CategoryHistoryDialog({
  open,
  onOpenChange,
  monthKey,
  categoryId,
  categoryName,
}: Props) {
  const { data, isLoading, isError, error, refetch } = useCategoryTransactions(
    monthKey,
    open ? categoryId : null,
  );
  const { money } = useSettings();
  const transactions = data ?? [];
  const total = sumExpenses(transactions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{categoryName}</DialogTitle>
          <DialogDescription>
            {formatMonthKey(monthKey)} · {transactions.length} transaction
            {transactions.length === 1 ? "" : "s"} · {money(total)}
          </DialogDescription>
        </DialogHeader>
        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          isEmpty={transactions.length === 0}
          emptyTitle="No transactions"
          emptyMessage="Nothing was spent in this category this month."
        >
          <TransactionList transactions={transactions} hideCategory />
        </DataState>
      </DialogContent>
    </Dialog>
  );
}
