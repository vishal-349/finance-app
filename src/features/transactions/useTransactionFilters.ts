import { useMemo, useState } from "react";
import type { Transaction, TransactionType } from "@/types";

export interface TransactionFilterState {
  search: string;
  type: TransactionType | "all";
  categoryId: string | "all";
  paymentMethodId: string | "all";
  minAmount: string;
  maxAmount: string;
}

export const EMPTY_FILTERS: TransactionFilterState = {
  search: "",
  type: "all",
  categoryId: "all",
  paymentMethodId: "all",
  minAmount: "",
  maxAmount: "",
};

export function useTransactionFilters(transactions: Transaction[]) {
  const [filters, setFilters] = useState<TransactionFilterState>(EMPTY_FILTERS);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const min = filters.minAmount ? Number(filters.minAmount) : null;
    const max = filters.maxAmount ? Number(filters.maxAmount) : null;

    return transactions.filter((t) => {
      if (filters.type !== "all" && t.type !== filters.type) return false;
      if (filters.categoryId !== "all" && t.categoryId !== filters.categoryId) return false;
      if (
        filters.paymentMethodId !== "all" &&
        t.paymentMethodId !== filters.paymentMethodId
      )
        return false;
      if (min !== null && t.amount < min) return false;
      if (max !== null && t.amount > max) return false;
      if (q) {
        const haystack = `${t.merchant ?? ""} ${t.note ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  const isActive = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS),
    [filters],
  );

  return { filters, setFilters, filtered, isActive, reset: () => setFilters(EMPTY_FILTERS) };
}
