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
      note,
    }: {
      monthKey: MonthKey;
      planned: number;
      actual: number;
      note?: string;
    }) => upsertEmergencyFund(uid, monthKey, { planned, actual, note }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteEmergencyFund(uid, id),
    onSuccess: invalidate,
  });

  return { ...query, entries: query.data ?? [], upsert, remove };
}
