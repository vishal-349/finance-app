import { useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useCategoryMap } from "@/hooks/useCategories";
import { usePaymentMethodMap } from "@/hooks/usePaymentMethods";
import { useIncomeSourceMap } from "@/hooks/useIncomeSources";
import { useAccountMap } from "@/hooks/useAccounts";
import { useCreditCardMap } from "@/hooks/useCreditCards";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useSettings } from "@/hooks/useSettings";
import { useIncomePrivacy } from "@/hooks/useIncomePrivacy";
import { IncomeEyeToggle } from "@/components/shared/IncomeAmount";
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
  const accountMap = useAccountMap();
  const cardMap = useCreditCardMap();
  const { all: goals } = useSavingsGoals();
  const goalMap = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const { money } = useSettings();
  const { hidden: incomeHidden } = useIncomePrivacy();
  const [confirm, setConfirm] = useState<Transaction | null>(null);

  /** Per-type icon, colors, amount sign and primary label/chip. */
  const visualFor = (t: Transaction) => {
    const accountName = (id?: string) => accountMap.get(id ?? "")?.name;
    switch (t.type) {
      case "income":
        return {
          icon: ArrowDownLeft as LucideIcon,
          iconClass: "bg-success/15 text-success",
          amountClass: "text-success",
          sign: "+",
          chip: incomeMap.get(t.incomeSourceId ?? "")?.name ?? "Income",
          chipColor: undefined as string | undefined,
          source: accountName(t.accountId),
        };
      case "transfer":
        return {
          icon: ArrowLeftRight as LucideIcon,
          iconClass: "bg-muted text-muted-foreground",
          amountClass: "text-foreground",
          sign: "",
          chip: "Transfer",
          chipColor: undefined,
          source: `${accountName(t.accountId) ?? "?"} → ${accountName(t.toAccountId) ?? "?"}`,
        };
      case "cc_payment":
        return {
          icon: CreditCard as LucideIcon,
          iconClass: "bg-muted text-muted-foreground",
          amountClass: "text-foreground",
          sign: "",
          chip: "Bill payment",
          chipColor: undefined,
          source: `${accountName(t.accountId) ?? "?"} → ${
            cardMap.get(t.creditCardId ?? "")?.name ?? "card"
          }`,
        };
      case "goal":
        return {
          icon: PiggyBank as LucideIcon,
          iconClass: "bg-muted text-muted-foreground",
          amountClass: "text-foreground",
          sign: "",
          chip: goalMap.get(t.savingsGoalId ?? "")?.name ?? "Savings goal",
          chipColor: undefined,
          source: accountName(t.accountId),
        };
      default: // expense
        return {
          icon: ArrowUpRight as LucideIcon,
          iconClass: "bg-muted text-muted-foreground",
          amountClass: "text-foreground",
          sign: "−",
          chip: categoryMap.get(t.categoryId ?? "")?.name ?? "Uncategorized",
          chipColor: categoryMap.get(t.categoryId ?? "")?.color,
          source:
            cardMap.get(t.creditCardId ?? "")?.name ??
            accountName(t.accountId) ??
            paymentMap.get(t.paymentMethodId ?? "")?.name,
        };
    }
  };

  return (
    <>
      <ul className="divide-y rounded-lg border bg-card">
        {transactions.map((t) => {
          const v = visualFor(t);
          const Icon = v.icon;
          return (
            <li key={t.id} className="flex items-center gap-3 p-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  v.iconClass,
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-medium">{t.merchant || v.chip}</span>
                  {!hideCategory && (
                    <Badge variant="outline" className="gap-1">
                      {v.chipColor && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: v.chipColor }}
                        />
                      )}
                      {v.chip}
                    </Badge>
                  )}
                  {t.emiId && (
                    <Badge variant="secondary" className="bg-[#6366f1]/15 text-[#6366f1]">
                      EMI
                    </Badge>
                  )}
                  {t.isAutoGenerated && !t.emiId && <Badge variant="secondary">Auto</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDisplayDate(t.date)}
                  {v.source && ` · ${v.source}`}
                  {t.note && ` · ${t.note}`}
                </p>
              </div>

              <span className={cn("shrink-0 font-semibold tabular-nums", v.amountClass)}>
                {t.type === "income" && incomeHidden ? "••••••" : `${v.sign}${money(t.amount)}`}
              </span>

              {t.type === "income" && <IncomeEyeToggle className="shrink-0" />}

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
