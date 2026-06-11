import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MonthKey } from "@/types";
import {
  copyBudgets,
  deleteBudget,
  listBudgets,
  upsertBudget,
} from "@/services/budgets";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";

export function useBudgets(monthKey: MonthKey) {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.budgets(uid, monthKey);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const query = useQuery({ queryKey: key, queryFn: () => listBudgets(uid, monthKey) });

  const setBudget = useMutation({
    mutationFn: ({ categoryId, amount }: { categoryId: string; amount: number }) =>
      upsertBudget(uid, monthKey, categoryId, amount),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteBudget(uid, id),
    onSuccess: invalidate,
  });

  const copyFrom = useMutation({
    mutationFn: (from: MonthKey) => copyBudgets(uid, from, monthKey),
    onSuccess: invalidate,
  });

  return { ...query, budgets: query.data ?? [], setBudget, remove, copyFrom };
}
