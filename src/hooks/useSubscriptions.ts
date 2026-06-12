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
import { subscriptionAnalytics } from "@/lib/derive";
import { todayISODate } from "@/lib/date";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";

export function useSubscriptions() {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.subscriptions(uid);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const query = useQuery({ queryKey: key, queryFn: () => listSubscriptions(uid) });
  const all = query.data ?? [];
  const active = useMemo(() => all.filter((s) => s.status === "active"), [all]);

  const create = useMutation({
    mutationFn: (input: SubscriptionInput) => createSubscription(uid, input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SubscriptionInput> }) =>
      updateSubscription(uid, id, patch),
    onSuccess: invalidate,
  });
  const pause = useMutation({
    mutationFn: (id: string) => pauseSubscription(uid, id),
    onSuccess: invalidate,
  });
  const resume = useMutation({
    mutationFn: (id: string) => resumeSubscription(uid, id),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelSubscription(uid, id),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteSubscription(uid, id),
    onSuccess: invalidate,
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
