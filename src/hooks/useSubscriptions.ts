import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelSubscription,
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  pauseSubscription,
  resumeSubscription,
  updateSubscription,
  type SubscriptionInput,
} from "@/services/subscriptions";
import { runRecurringEngine } from "@/services/recurringEngine";
import { subscriptionAnalytics } from "@/lib/derive";
import { todayISODate } from "@/lib/date";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";

export function useSubscriptions() {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.subscriptions(uid);
  const invalidateAll = async () => {
    await qc.invalidateQueries({ queryKey: key });
    await qc.invalidateQueries({ queryKey: ["transactions", uid] });
  };
  // Auto-renewing subs materialise charges via the engine. Run it right after a
  // create/edit so a due renewal (e.g. one dated today) appears immediately —
  // without waiting for the next app load. Mirrors recurring rules.
  const generateNow = async () => {
    await runRecurringEngine(uid);
    await invalidateAll();
  };

  const query = useQuery({ queryKey: key, queryFn: () => listSubscriptions(uid) });
  const all = query.data ?? [];
  const active = useMemo(() => all.filter((s) => s.status === "active"), [all]);

  const create = useMutation({
    mutationFn: (input: SubscriptionInput) => createSubscription(uid, input),
    onSuccess: generateNow,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SubscriptionInput> }) =>
      updateSubscription(uid, id, patch),
    onSuccess: generateNow,
  });
  const pause = useMutation({
    mutationFn: (id: string) => pauseSubscription(uid, id),
    onSuccess: invalidateAll,
  });
  const resume = useMutation({
    mutationFn: (id: string) => resumeSubscription(uid, id),
    onSuccess: generateNow,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelSubscription(uid, id),
    onSuccess: invalidateAll,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteSubscription(uid, id),
    onSuccess: invalidateAll,
  });

  return { ...query, all, active, create, update, pause, resume, cancel, remove };
}

/** Derived MRR/ARR + sorted upcoming renewals across all subscriptions. */
export function useSubscriptionAnalytics() {
  const { all, isLoading, isError, error } = useSubscriptions();
  const today = todayISODate();
  const analytics = useMemo(() => subscriptionAnalytics(all, today), [all, today]);
  return { analytics, all, isLoading, isError, error };
}
