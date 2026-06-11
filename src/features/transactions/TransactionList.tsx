import { useState } from "react";
import { Pencil, Trash2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useCategoryMap } from "@/hooks/useCategories";
import { usePaymentMethodMap } from "@/hooks/usePaymentMethods";
import { useIncomeSourceMap } from "@/hooks/useIncomeSources";
import { useSettings } from "@/hooks/useSettings";
import { formatDisplayDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types";

interface TransactionListProps {
  transactions: Transaction[];
  onEdit?: (t: Transaction) => void;
  onDelete?: (id: string) => Promise<unknown>;
  /** Hide the category chip (used inside the per-category drill-down). */
  hideCategory?: boolean;
}

export function TransactionList({
  transactions,
  onEdit,
  onDelete,
  hideCategory,
}: TransactionListProps) {
  const categoryMap = useCategoryMap();
  const paymentMap = usePaymentMethodMap();
  const incomeMap = useIncomeSourceMap();
  const { money } = useSettings();
  const [confirm, setConfirm] = useState<Transaction | null>(null);

  return (
    <>
      <ul className="divide-y rounded-lg border bg-card">
        {transactions.map((t) => {
          const isIncome = t.type === "income";
          const label = isIncome
            ? incomeMap.get(t.incomeSourceId ?? "")?.name ?? "Income"
            : categoryMap.get(t.categoryId ?? "")?.name ?? "Uncategorized";
          const color = categoryMap.get(t.categoryId ?? "")?.color;
          const payment = paymentMap.get(t.paymentMethodId ?? "")?.name;

          return (
            <li key={t.id} className="flex items-center gap-3 p-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  isIncome
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {isIncome ? (
                  <ArrowDownLeft className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-medium">
                    {t.merchant || label}
                  </span>
                  {!hideCategory && (
                    <Badge variant="outline" className="gap-1">
                      {color && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      )}
                      {label}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDisplayDate(t.date)}
                  {payment && ` · ${payment}`}
                  {t.note && ` · ${t.note}`}
                </p>
              </div>

              <span
                className={cn(
                  "shrink-0 font-semibold tabular-nums",
                  isIncome ? "text-success" : "text-foreground",
                )}
              >
                {isIncome ? "+" : "−"}
                {money(t.amount)}
              </span>

              {(onEdit || onDelete) && (
                <div className="flex shrink-0">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Edit"
                      onClick={() => onEdit(t)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      aria-label="Delete"
                      onClick={() => setConfirm(t)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete transaction?"
        description="This removes the record permanently. Totals will recalculate automatically."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (confirm && onDelete) {
            await onDelete(confirm.id);
            toast.success("Transaction deleted");
            setConfirm(null);
          }
        }}
      />
    </>
  );
}
