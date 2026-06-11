import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSip, deleteSip, listSipInvestments, updateSip, type SipInput } from "@/services/sip";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";

export function useSip() {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.sip(uid);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const query = useQuery({ queryKey: key, queryFn: () => listSipInvestments(uid) });

  const create = useMutation({
    mutationFn: (input: SipInput) => createSip(uid, input),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<SipInput> }) =>
      updateSip(uid, id, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteSip(uid, id),
    onSuccess: invalidate,
  });

  return { ...query, entries: query.data ?? [], create, update, remove };
}
