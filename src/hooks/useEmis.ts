import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EmiProgress } from "@/types";
import {
  createEmi,
  deleteEmi,
  listEmis,
  listEmiTransactions,
  pauseEmi,
  resumeEmi,
  stopEmi,
  updateEmi,
  type EmiInput,
} from "@/services/emis";
import { runRecurringEngine } from "@/services/recurringEngine";
import { emiProgress } from "@/lib/derive";
import { todayISODate } from "@/lib/date";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";

export function useEmis() {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.emis(uid);

  /** EMI mutations change generated transactions too — refresh both caches. */
  const invalidateAll = async () => {
    await qc.invalidateQueries({ queryKey: key });
    await qc.invalidateQueries({ queryKey: ["transactions", uid] });
  };

  const query = useQuery({ queryKey: key, queryFn: () => listEmis(uid) });
  const all = query.data ?? [];
  const today = todayISODate();

  const progress: EmiProgress[] = useMemo(
    () => all.map((e) => emiProgress(e, today)),
    [all, today],
  );
  const activeEmis = useMemo(
    () => progress.filter((p) => p.emi.status !== "stopped" && !p.isCompleted),
    [progress],
  );
  const completedEmis = useMemo(
    () => progress.filter((p) => p.emi.status === "stopped" || p.isCompleted),
    [progress],
  );

  const generateNow = async () => {
    await runRecurringEngine(uid);
    await invalidateAll();
  };

  const create = useMutation({
    mutationFn: (input: EmiInput) => createEmi(uid, input),
    onSuccess: generateNow,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateEmi>[2] }) =>
      updateEmi(uid, id, patch),
    onSuccess: generateNow,
  });
  const pause = useMutation({ mutationFn: (id: string) => pauseEmi(uid, id), onSuccess: invalidateAll });
  const resume = useMutation({ mutationFn: (id: string) => resumeEmi(uid, id), onSuccess: invalidateAll });
  const stop = useMutation({ mutationFn: (id: string) => stopEmi(uid, id), onSuccess: invalidateAll });
  const remove = useMutation({ mutationFn: (id: string) => deleteEmi(uid, id), onSuccess: invalidateAll });

  return {
    ...query,
    all,
    progress,
    activeEmis,
    completedEmis,
    create,
    update,
    pause,
    resume,
    stop,
    remove,
  };
}

/** Installments recorded for one EMI (drill-down). */
export function useEmiTransactions(emiId: string | null) {
  const uid = useUid();
  return useQuery({
    queryKey: queryKeys.emiTxns(uid, emiId ?? "none"),
    queryFn: () => listEmiTransactions(uid, emiId as string),
    enabled: !!emiId,
  });
}
