import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Emi, EmiInstallment, EmiProgress, Transaction } from "@/types";
import {
  createEmi,
  deleteEmi,
  listEmis,
  listEmiTransactions,
  markInstallmentPaid,
  markInstallmentUnpaid,
  pauseEmi,
  resumeEmi,
  stopEmi,
  updateEmi,
  type EmiInput,
  type MarkInstallmentInput,
} from "@/services/emis";
import { emiInstallments, emiProgress } from "@/lib/derive";
import { todayISODate } from "@/lib/date";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";
import { useAllTransactions } from "./useTransactions";

export function useEmis() {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.emis(uid);

  /** EMI mutations change installment transactions too — refresh both caches. */
  const invalidateAll = async () => {
    await qc.invalidateQueries({ queryKey: key });
    await qc.invalidateQueries({ queryKey: ["transactions", uid] });
  };

  const query = useQuery({ queryKey: key, queryFn: () => listEmis(uid) });
  const all = useMemo(() => query.data ?? [], [query.data]);
  const today = todayISODate();

  // Installment payments are ordinary tagged transactions — group them per EMI
  // so progress reflects what's actually been recorded, not the elapsed schedule.
  const { transactions } = useAllTransactions();
  const txnsByEmi = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (!t.emiId) continue;
      const list = map.get(t.emiId);
      if (list) list.push(t);
      else map.set(t.emiId, [t]);
    }
    return map;
  }, [transactions]);

  const progress: EmiProgress[] = useMemo(
    () => all.map((e) => emiProgress(e, today, txnsByEmi.get(e.id) ?? [])),
    [all, today, txnsByEmi],
  );
  const installmentsByEmi = useMemo(() => {
    const map = new Map<string, EmiInstallment[]>();
    for (const e of all) {
      map.set(e.id, emiInstallments(e, today, txnsByEmi.get(e.id) ?? []));
    }
    return map;
  }, [all, today, txnsByEmi]);
  const installmentsFor = (emi: Emi): EmiInstallment[] =>
    installmentsByEmi.get(emi.id) ?? emiInstallments(emi, today, txnsByEmi.get(emi.id) ?? []);

  const activeEmis = useMemo(
    () => progress.filter((p) => p.emi.status !== "stopped" && !p.isCompleted),
    [progress],
  );
  const completedEmis = useMemo(
    () => progress.filter((p) => p.emi.status === "stopped" || p.isCompleted),
    [progress],
  );

  const create = useMutation({
    mutationFn: (input: EmiInput) => createEmi(uid, input),
    onSuccess: invalidateAll,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateEmi>[2] }) =>
      updateEmi(uid, id, patch),
    onSuccess: invalidateAll,
  });
  const pause = useMutation({ mutationFn: (id: string) => pauseEmi(uid, id), onSuccess: invalidateAll });
  const resume = useMutation({ mutationFn: (id: string) => resumeEmi(uid, id), onSuccess: invalidateAll });
  const stop = useMutation({ mutationFn: (id: string) => stopEmi(uid, id), onSuccess: invalidateAll });
  const remove = useMutation({ mutationFn: (id: string) => deleteEmi(uid, id), onSuccess: invalidateAll });

  const markPaid = useMutation({
    mutationFn: ({ emi, input }: { emi: Emi; input: MarkInstallmentInput }) =>
      markInstallmentPaid(uid, emi, input),
    onSuccess: invalidateAll,
  });
  const markUnpaid = useMutation({
    mutationFn: ({ emiId, scheduledDate }: { emiId: string; scheduledDate: string }) =>
      markInstallmentUnpaid(uid, emiId, scheduledDate),
    onSuccess: invalidateAll,
  });
  // Catch-up: record every elapsed-but-unpaid installment at its scheduled date
  // and the EMI's standard amount/funding source.
  const markAllPastDue = useMutation({
    mutationFn: async (emi: Emi) => {
      const due = installmentsFor(emi).filter((i) => i.status === "due");
      for (const slot of due) {
        await markInstallmentPaid(uid, emi, {
          scheduledDate: slot.scheduledDate,
          payDate: slot.scheduledDate,
          amount: emi.monthlyAmount,
          accountId: emi.accountId,
          creditCardId: emi.creditCardId,
          paymentMethodId: emi.paymentMethodId,
        });
      }
      return due.length;
    },
    onSuccess: invalidateAll,
  });

  return {
    ...query,
    all,
    progress,
    activeEmis,
    completedEmis,
    installmentsFor,
    create,
    update,
    pause,
    resume,
    stop,
    remove,
    markPaid,
    markUnpaid,
    markAllPastDue,
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
