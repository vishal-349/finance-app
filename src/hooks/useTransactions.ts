import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MonthKey } from "@/types";
import {
  createTransaction,
  deleteTransaction,
  listTransactionsByCategory,
  listTransactionsByMonth,
  listTransactionsByYear,
  updateTransaction,
  type TransactionInput,
} from "@/services/transactions";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";

/** Transactions for the given month + create/update/delete mutations. */
export function useTransactions(monthKey: MonthKey) {
  const uid = useUid();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.transactionsMonth(uid, monthKey),
    queryFn: () => listTransactionsByMonth(uid, monthKey),
  });

  /** Invalidate every transaction-derived cache (month, year, category). */
  const invalidateAll = () =>
    qc.invalidateQueries({ queryKey: ["transactions", uid] });

  const create = useMutation({
    mutationFn: (input: TransactionInput) => createTransaction(uid, input),
    onSuccess: invalidateAll,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TransactionInput> }) =>
      updateTransaction(uid, id, patch),
    onSuccess: invalidateAll,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTransaction(uid, id),
    onSuccess: invalidateAll,
  });

  return { ...query, transactions: query.data ?? [], create, update, remove };
}

/** Read-only transactions for a year (year reports). */
export function useYearTransactions(year: number) {
  const uid = useUid();
  return useQuery({
    queryKey: queryKeys.transactionsYear(uid, year),
    queryFn: () => listTransactionsByYear(uid, year),
  });
}

/** Read-only transactions for one category in a month (drill-down view). */
export function useCategoryTransactions(monthKey: MonthKey, categoryId: string | null) {
  const uid = useUid();
  return useQuery({
    queryKey: queryKeys.transactionsCategory(uid, monthKey, categoryId ?? "none"),
    queryFn: () => listTransactionsByCategory(uid, monthKey, categoryId as string),
    enabled: !!categoryId,
  });
}
