import { useMemo } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CardCycleStats, CreditCard } from "@/types";
import {
  archiveCreditCard,
  createCreditCard,
  deleteCreditCard,
  listCardTransactions,
  listCreditCards,
  reorderCreditCards,
  restoreCreditCard,
  updateCreditCard,
  type CreditCardInput,
} from "@/services/creditCards";
import { cardCycleStats } from "@/lib/derive";
import { currentCardCycle, currentMonthKey, todayISODate } from "@/lib/date";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";

export function useCreditCards() {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.creditCards(uid);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const query = useQuery({ queryKey: key, queryFn: () => listCreditCards(uid) });
  const all = query.data ?? [];
  const active = useMemo(() => all.filter((c) => !c.archived), [all]);

  const nextOrder = () => (all.length ? Math.max(...all.map((c) => c.order)) + 1 : 0);

  const create = useMutation({
    mutationFn: (input: Omit<CreditCardInput, "order">) =>
      createCreditCard(uid, { ...input, order: nextOrder() }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CreditCardInput> }) =>
      updateCreditCard(uid, id, patch),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (id: string) => archiveCreditCard(uid, id),
    onSuccess: invalidate,
  });
  const restore = useMutation({
    mutationFn: (id: string) => restoreCreditCard(uid, id),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteCreditCard(uid, id),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (ids: string[]) => reorderCreditCards(uid, ids),
    onSuccess: invalidate,
  });

  return { ...query, all, active, create, update, archive, restore, remove, reorder };
}

export function useCreditCardMap() {
  const { all } = useCreditCards();
  return useMemo(() => new Map(all.map((c) => [c.id, c])), [all]);
}

/**
 * Current-cycle + current-month stats for every active card. One small ranged
 * query per card (composite index creditCardId+date), derived via
 * `cardCycleStats` — nothing stored.
 */
export function useCardStats(): {
  stats: CardCycleStats[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
} {
  const uid = useUid();
  const { active, isLoading: cardsLoading, isError: cardsError, error } = useCreditCards();
  const today = todayISODate();
  const monthKey = currentMonthKey();

  const results = useQueries({
    queries: active.map((card: CreditCard) => {
      const { start, end } = currentCardCycle(card.billingDay, today);
      // Pool must cover both the cycle window and the calendar month.
      const poolStart = start < `${monthKey}-01` ? start : `${monthKey}-01`;
      const poolEnd = end > today ? end : today;
      return {
        queryKey: queryKeys.cardCycleTxns(uid, card.id, poolStart, poolEnd),
        queryFn: () => listCardTransactions(uid, card.id, poolStart, poolEnd),
      };
    }),
  });

  const stats = useMemo(
    () =>
      active.map((card, i) =>
        cardCycleStats(card, results[i]?.data ?? [], monthKey, today),
      ),
    [active, results, monthKey, today],
  );

  return {
    stats,
    isLoading: cardsLoading || results.some((r) => r.isLoading),
    isError: cardsError || results.some((r) => r.isError),
    error: error ?? results.find((r) => r.error)?.error ?? null,
  };
}
