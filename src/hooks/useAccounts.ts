import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveAccount,
  assignUnassignedTransactions,
  createAccount,
  deleteAccount,
  listAccounts,
  reorderAccounts,
  restoreAccount,
  updateAccount,
  type AccountInput,
} from "@/services/accounts";
import { accountBalances, totalLiquidBalance } from "@/lib/derive";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";
import { useAllTransactions } from "./useTransactions";

export function useAccounts() {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.accounts(uid);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  const invalidateTxns = () => qc.invalidateQueries({ queryKey: ["transactions", uid] });

  const query = useQuery({ queryKey: key, queryFn: () => listAccounts(uid) });
  const all = query.data ?? [];
  const active = useMemo(() => all.filter((a) => !a.archived), [all]);

  const nextOrder = () => (all.length ? Math.max(...all.map((a) => a.order)) + 1 : 0);

  const create = useMutation({
    mutationFn: (input: Omit<AccountInput, "order">) =>
      createAccount(uid, { ...input, order: nextOrder() }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AccountInput> }) =>
      updateAccount(uid, id, patch),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (id: string) => archiveAccount(uid, id),
    onSuccess: invalidate,
  });
  const restore = useMutation({
    mutationFn: (id: string) => restoreAccount(uid, id),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteAccount(uid, id),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderAccounts(uid, ids),
    onSuccess: invalidate,
  });
  const assignUnassigned = useMutation({
    mutationFn: (accountId: string) => assignUnassignedTransactions(uid, accountId),
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
    restore,
    remove,
    reorder,
    assignUnassigned,
  };
}

export function useAccountMap() {
  const { all } = useAccounts();
  return useMemo(() => new Map(all.map((a) => [a.id, a])), [all]);
}

/**
 * Derived balance for every active account + the total liquid cash. Combines the
 * accounts list with the full transaction set (both cached) — nothing stored.
 */
export function useAccountBalances() {
  const { active, isLoading: accLoading, isError: accError, error: accErr } = useAccounts();
  const {
    transactions,
    isLoading: txLoading,
    isError: txError,
    error: txErr,
  } = useAllTransactions();

  const balances = useMemo(
    () => accountBalances(active, transactions),
    [active, transactions],
  );

  return {
    balances,
    total: totalLiquidBalance(balances),
    isLoading: accLoading || txLoading,
    isError: accError || txError,
    error: accErr ?? txErr ?? null,
  };
}
