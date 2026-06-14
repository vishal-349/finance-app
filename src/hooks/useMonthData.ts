import { useMemo } from "react";
import type { MonthKey } from "@/types";
import {
  buildCategorySummaries,
  buildMonthSummary,
  emergencyFundActualForMonth,
  sipActualForMonth,
  sumGoalContributions,
} from "@/lib/derive";
import { useCategories } from "./useCategories";
import { useBudgets } from "./useBudgets";
import { useTransactions } from "./useTransactions";
import { useEmergencyFunds } from "./useEmergencyFunds";
import { useSip } from "./useSip";

/**
 * One-stop hook joining categories + budgets + transactions + emergency fund +
 * SIP for a month, and deriving the planned-vs-actual summaries. All totals are
 * computed here — nothing is read from a stored aggregate.
 */
export function useMonthData(monthKey: MonthKey) {
  const categories = useCategories();
  const budgets = useBudgets(monthKey);
  const txns = useTransactions(monthKey);
  const ef = useEmergencyFunds();
  const sip = useSip();

  const isLoading =
    categories.isLoading || budgets.isLoading || txns.isLoading || ef.isLoading || sip.isLoading;
  const isError =
    categories.isError || budgets.isError || txns.isError || ef.isError || sip.isError;
  const error =
    categories.error ?? budgets.error ?? txns.error ?? ef.error ?? sip.error ?? null;

  const categorySummaries = useMemo(
    () =>
      buildCategorySummaries(monthKey, categories.all, budgets.budgets, txns.transactions),
    [monthKey, categories.all, budgets.budgets, txns.transactions],
  );

  const efForMonth = useMemo(
    () => emergencyFundActualForMonth(ef.entries, monthKey),
    [ef.entries, monthKey],
  );
  const sipForMonth = useMemo(
    () => sipActualForMonth(sip.entries, monthKey),
    [sip.entries, monthKey],
  );
  const goalForMonth = useMemo(
    () => sumGoalContributions(txns.transactions),
    [txns.transactions],
  );

  const summary = useMemo(
    () =>
      buildMonthSummary(
        monthKey,
        budgets.budgets,
        txns.transactions,
        efForMonth,
        sipForMonth,
        goalForMonth,
      ),
    [monthKey, budgets.budgets, txns.transactions, efForMonth, sipForMonth, goalForMonth],
  );

  return {
    isLoading,
    isError,
    error,
    refetch: () => {
      void txns.refetch();
      void budgets.refetch();
    },
    categorySummaries,
    summary,
    transactions: txns.transactions,
  };
}
