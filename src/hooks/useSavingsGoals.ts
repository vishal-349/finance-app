import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveSavingsGoal,
  createSavingsGoal,
  deleteSavingsGoal,
  listSavingsGoals,
  reactivateSavingsGoal,
  reorderSavingsGoals,
  updateSavingsGoal,
  type SavingsGoalInput,
} from "@/services/savingsGoals";
import { createTransaction } from "@/services/transactions";
import { goalProgress } from "@/lib/derive";
import { todayISODate } from "@/lib/date";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";
import { useAllTransactions } from "./useTransactions";

export interface ContributionInput {
  goalId: string;
  accountId: string;
  amount: number;
  date: string;
  note?: string;
}

export function useSavingsGoals() {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.savingsGoals(uid);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  const invalidateTxns = () => qc.invalidateQueries({ queryKey: ["transactions", uid] });

  const query = useQuery({ queryKey: key, queryFn: () => listSavingsGoals(uid) });
  const all = query.data ?? [];
  const active = useMemo(() => all.filter((g) => g.status === "active"), [all]);

  const nextOrder = () => (all.length ? Math.max(...all.map((g) => g.order)) + 1 : 0);

  const create = useMutation({
    mutationFn: (input: Omit<SavingsGoalInput, "order">) =>
      createSavingsGoal(uid, { ...input, order: nextOrder() }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SavingsGoalInput> }) =>
      updateSavingsGoal(uid, id, patch),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (id: string) => archiveSavingsGoal(uid, id),
    onSuccess: invalidate,
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => reactivateSavingsGoal(uid, id),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteSavingsGoal(uid, id),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderSavingsGoals(uid, ids),
    onSuccess: invalidate,
  });

  /** Record a contribution as a `goal` transaction (debits the source account). */
  const contribute = useMutation({
    mutationFn: ({ goalId, accountId, amount, date, note }: ContributionInput) =>
      createTransaction(uid, {
        type: "goal",
        date,
        amount,
        accountId,
        savingsGoalId: goalId,
        note,
      }),
    onSuccess: () => {
      invalidate();
      invalidateTxns();
    },
  });

  return {
    ...query,
    all,
    active,
    create,
    update,
    archive,
    reactivate,
    remove,
    reorder,
    contribute,
  };
}

/** Derived progress + forecast for every goal (from the full transaction set). */
export function useGoalsProgress() {
  const { all, isLoading: gLoading, isError: gError, error: gErr } = useSavingsGoals();
  const {
    transactions,
    isLoading: txLoading,
    isError: txError,
    error: txErr,
  } = useAllTransactions();
  const today = todayISODate();

  const progress = useMemo(
    () => all.map((g) => goalProgress(g, transactions, today)),
    [all, transactions, today],
  );

  return {
    progress,
    isLoading: gLoading || txLoading,
    isError: gError || txError,
    error: gErr ?? txErr ?? null,
  };
}
