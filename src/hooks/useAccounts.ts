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
import {
  accountBalances,
  entriesSinceMonth,
  portfolioBreakdown,
  savingsOutflowByAccount,
  totalLiquidBalance,
  transactionsSince,
} from "@/lib/derive";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";
import { useAllTransactions } from "./useTransactions";
import { useSettings } from "./useSettings";
import { useSip } from "./useSip";
import { useEmergencyFunds } from "./useEmergencyFunds";

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
  const sip = useSip();
  const ef = useEmergencyFunds();
  const { settings } = useSettings();
  const start = settings.trackingStartDate;

  // Only count flows on/after the tracking-start date — pre-tracking entries
  // (e.g. backfilled EMI installments) are history and must not move cash.
  const tracked = useMemo(() => transactionsSince(transactions, start), [transactions, start]);

  // SIP + emergency-fund deposits leave cash too — attribute each to its funding
  // account (legacy unattributed entries fall back to the primary account).
  const savingsOut = useMemo(
    () =>
      savingsOutflowByAccount(
        entriesSinceMonth(sip.entries, start),
        entriesSinceMonth(ef.entries, start),
        new Set(active.map((a) => a.id)),
        active[0]?.id,
      ),
    [sip.entries, ef.entries, active, start],
  );

  const balances = useMemo(
    () => accountBalances(active, tracked, savingsOut),
    [active, tracked, savingsOut],
  );

  return {
    balances,
    total: totalLiquidBalance(balances),
    isLoading: accLoading || txLoading || sip.isLoading || ef.isLoading,
    isError: accError || txError || sip.isError || ef.isError,
    error: accErr ?? txErr ?? sip.error ?? ef.error ?? null,
  };
}

/**
 * Reconciling breakdown of total Net Cash (opening + in − out − saved). Powers
 * the "how is this calculated?" disclosures so the headline figure is never a
 * black box. Equals the sum of account balances by construction.
 */
export function useCashBreakdown() {
  const { active } = useAccounts();
  const { transactions } = useAllTransactions();
  const sip = useSip();
  const ef = useEmergencyFunds();
  const { settings } = useSettings();
  const start = settings.trackingStartDate;
  return useMemo(
    () =>
      portfolioBreakdown(
        active,
        transactionsSince(transactions, start),
        entriesSinceMonth(sip.entries, start),
        entriesSinceMonth(ef.entries, start),
      ),
    [active, transactions, sip.entries, ef.entries, start],
  );
}
