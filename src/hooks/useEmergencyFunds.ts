import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteEmergencyFund,
  listEmergencyFunds,
  upsertEmergencyFund,
} from "@/services/emergencyFunds";
import { queryKeys } from "@/lib/queryClient";
import type { MonthKey } from "@/types";
import { useUid } from "./useAuth";

export function useEmergencyFunds() {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.emergencyFunds(uid);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const query = useQuery({ queryKey: key, queryFn: () => listEmergencyFunds(uid) });

  const upsert = useMutation({
    mutationFn: ({
      monthKey,
      planned,
      actual,
      accountId,
      note,
    }: {
      monthKey: MonthKey;
      planned: number;
      actual: number;
      accountId?: string;
      note?: string;
    }) => upsertEmergencyFund(uid, monthKey, { planned, actual, accountId, note }),
    // Balances depend on EF outflow — refresh the accounts cache too.
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: queryKeys.accounts(uid) });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteEmergencyFund(uid, id),
    onSuccess: invalidate,
  });

  return { ...query, entries: query.data ?? [], upsert, remove };
}
