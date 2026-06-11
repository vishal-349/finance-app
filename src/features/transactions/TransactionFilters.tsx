import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import type { TransactionFilterState } from "./useTransactionFilters";
import type { TransactionType } from "@/types";

interface Props {
  filters: TransactionFilterState;
  setFilters: React.Dispatch<React.SetStateAction<TransactionFilterState>>;
  isActive: boolean;
  onReset: () => void;
}

export function TransactionFilters({ filters, setFilters, isActive, onReset }: Props) {
  const { expense } = useCategories();
  const { active: paymentMethods } = usePaymentMethods();

  const set = <K extends keyof TransactionFilterState>(
    key: K,
    value: TransactionFilterState[K],
  ) => setFilters((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search merchant or note…"
          className="pl-8"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Select value={filters.type} onValueChange={(v) => set("type", v as TransactionType | "all")}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.categoryId} onValueChange={(v) => set("categoryId", v)}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {expense.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.paymentMethodId} onValueChange={(v) => set("paymentMethodId", v)}>
          <SelectTrigger><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            {paymentMethods.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          inputMode="decimal"
          placeholder="Min ₹"
          value={filters.minAmount}
          onChange={(e) => set("minAmount", e.target.value)}
        />
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Max ₹"
          value={filters.maxAmount}
          onChange={(e) => set("maxAmount", e.target.value)}
        />
      </div>

      {isActive && (
        <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
          <X className="h-4 w-4" /> Clear filters
        </Button>
      )}
    </div>
  );
}
