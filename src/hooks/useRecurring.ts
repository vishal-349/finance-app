import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRecurringRule,
  deleteRecurringRule,
  listRecurringRules,
  pauseRecurringRule,
  resumeRecurringRule,
  stopRecurringRule,
  updateRecurringRule,
  type RecurringRuleInput,
} from "@/services/recurring";
import { runRecurringEngine } from "@/services/recurringEngine";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";

export function useRecurringRules() {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.recurringRules(uid);

  const invalidateAll = async () => {
    await qc.invalidateQueries({ queryKey: key });
    await qc.invalidateQueries({ queryKey: ["transactions", uid] });
  };

  const query = useQuery({ queryKey: key, queryFn: () => listRecurringRules(uid) });

  /** Create/edit then immediately materialise due occurrences. */
  const generateNow = async () => {
    await runRecurringEngine(uid);
    await invalidateAll();
  };

  const create = useMutation({
    mutationFn: (input: RecurringRuleInput) => createRecurringRule(uid, input),
    onSuccess: generateNow,
  });
  const update = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof updateRecurringRule>[2];
    }) => updateRecurringRule(uid, id, patch),
    onSuccess: generateNow,
  });
  const pause = useMutation({
    mutationFn: (id: string) => pauseRecurringRule(uid, id),
    onSuccess: invalidateAll,
  });
  const resume = useMutation({
    mutationFn: (id: string) => resumeRecurringRule(uid, id),
    onSuccess: invalidateAll,
  });
  const stop = useMutation({
    mutationFn: (id: string) => stopRecurringRule(uid, id),
    onSuccess: invalidateAll,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteRecurringRule(uid, id),
    onSuccess: invalidateAll,
  });

  return { ...query, rules: query.data ?? [], create, update, pause, resume, stop, remove };
}

/**
 * Runs the recurring engine once per session (mounted inside the protected
 * shell). Materialises any occurrences that became due since the last visit,
 * then refreshes transaction-derived caches.
 */
export function useRecurringEngine() {
  const uid = useUid();
  const qc = useQueryClient();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    runRecurringEngine(uid)
      .then((generated) => {
        if (generated > 0) {
          // eslint-disable-next-line no-console
          console.info(`[recurring] generated ${generated} transaction(s)`);
          void qc.invalidateQueries({ queryKey: ["transactions", uid] });
          void qc.invalidateQueries({ queryKey: queryKeys.emis(uid) });
          void qc.invalidateQueries({ queryKey: queryKeys.recurringRules(uid) });
        }
      })
      .catch((err) => {
        // Non-fatal: the next session retries from the same bookkeeping.
        // eslint-disable-next-line no-console
        console.error("[recurring] engine run failed:", err);
      });
  }, [uid, qc]);
}
