import { useMemo, useState } from "react";
import type { Transaction, TransactionType } from "@/types";
import { useCategoryMap } from "@/hooks/useCategories";
import { useIncomeSourceMap } from "@/hooks/useIncomeSources";
import { usePaymentMethodMap } from "@/hooks/usePaymentMethods";
import { useAccountMap } from "@/hooks/useAccounts";
import { useCreditCardMap } from "@/hooks/useCreditCards";
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useSettings } from "@/hooks/useSettings";

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

  const categoryMap = useCategoryMap();
  const incomeMap = useIncomeSourceMap();
  const paymentMap = usePaymentMethodMap();
  const accountMap = useAccountMap();
  const cardMap = useCreditCardMap();
  const { all: goals } = useSavingsGoals();
  const goalMap = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const { money } = useSettings();

  // Precompute one searchable string per transaction from every label the user
  // can see — merchant/note, the resolved names of its category, income source,
  // payment method, account(s), card and goal, AND the amount in several forms
  // ("2725", "2725.00", "₹2,725.00") so it's findable by value too. Rebuilt only
  // when the data changes, not on every keystroke.
  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of transactions) {
      const parts = [
        t.merchant,
        t.note,
        categoryMap.get(t.categoryId ?? "")?.name,
        incomeMap.get(t.incomeSourceId ?? "")?.name,
        paymentMap.get(t.paymentMethodId ?? "")?.name,
        accountMap.get(t.accountId ?? "")?.name,
        accountMap.get(t.toAccountId ?? "")?.name,
        cardMap.get(t.creditCardId ?? "")?.name,
        goalMap.get(t.savingsGoalId ?? "")?.name,
        String(t.amount),
        t.amount.toFixed(2),
        money(t.amount),
      ];
      map.set(t.id, parts.filter(Boolean).join(" ").toLowerCase());
    }
    return map;
  }, [transactions, categoryMap, incomeMap, paymentMap, accountMap, cardMap, goalMap, money]);

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
      if (q && !(haystacks.get(t.id) ?? "").includes(q)) return false;
      return true;
    });
  }, [transactions, filters, haystacks]);

  const isActive = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS),
    [filters],
  );

  return { filters, setFilters, filtered, isActive, reset: () => setFilters(EMPTY_FILTERS) };
}
