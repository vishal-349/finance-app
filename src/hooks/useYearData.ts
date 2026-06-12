import { useMemo } from "react";
import { useYearTransactions } from "./useTransactions";
import { useEmergencyFunds } from "./useEmergencyFunds";
import { useSip } from "./useSip";
import { useCategoryMap } from "./useCategories";
import { format } from "date-fns";
import { monthKeysForYear, monthKeyToYear, monthKeyToDate } from "@/lib/date";

/** Aggregates a full calendar year for the reports page. */
export function useYearData(year: number) {
  const txnsQuery = useYearTransactions(year);
  const ef = useEmergencyFunds();
  const sip = useSip();
  const categoryMap = useCategoryMap();

  const transactions = useMemo(() => txnsQuery.data ?? [], [txnsQuery.data]);

  const monthly = useMemo(() => {
    const keys = monthKeysForYear(year);
    const income = new Map<string, number>();
    const expense = new Map<string, number>();
    for (const t of transactions) {
      // Only income/expense feed the bars — transfers, bill payments and goal
      // contributions move money between the user's own buckets.
      if (t.type !== "income" && t.type !== "expense") continue;
      const target = t.type === "income" ? income : expense;
      target.set(t.monthKey, (target.get(t.monthKey) ?? 0) + t.amount);
    }
    return keys.map((k) => ({
      monthKey: k,
      label: format(monthKeyToDate(k), "MMM"),
      income: income.get(k) ?? 0,
      expense: expense.get(k) ?? 0,
    }));
  }, [transactions, year]);

  const totals = useMemo(() => {
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((a, t) => a + t.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((a, t) => a + t.amount, 0);
    const efYear = ef.entries
      .filter((e) => monthKeyToYear(e.monthKey) === year)
      .reduce((a, e) => a + e.actual, 0);
    const sipYear = sip.entries
      .filter((s) => monthKeyToYear(s.monthKey) === year)
      .reduce((a, s) => a + s.actual, 0);
    return {
      totalIncome,
      totalExpenses,
      totalSavings: totalIncome - totalExpenses,
      emergencyFundYear: efYear,
      sipYear,
    };
  }, [transactions, ef.entries, sip.entries, year]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type !== "expense" || !t.categoryId) continue;
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
    }
    return [...map.entries()]
      .map(([id, amount]) => ({
        id,
        name: categoryMap.get(id)?.name ?? "Uncategorized",
        color: categoryMap.get(id)?.color,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, categoryMap]);

  return {
    isLoading: txnsQuery.isLoading || ef.isLoading || sip.isLoading,
    isError: txnsQuery.isError || ef.isError || sip.isError,
    error: txnsQuery.error ?? ef.error ?? sip.error ?? null,
    refetch: txnsQuery.refetch,
    monthly,
    totals,
    categoryBreakdown,
  };
}
