import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Category, CategoryType } from "@/types";
import {
  archiveCategory,
  createCategory,
  deleteCategory,
  listCategories,
  reorderCategories,
  restoreCategory,
  updateCategory,
} from "@/services/categories";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";

export function useCategories() {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeys.categories(uid);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const query = useQuery({ queryKey: key, queryFn: () => listCategories(uid) });
  const all = query.data ?? [];

  const expense = useMemo(
    () => all.filter((c) => c.type === "expense"),
    [all],
  );
  const income = useMemo(() => all.filter((c) => c.type === "income"), [all]);

  /** Highest order + 1, so new items append to the end. */
  const nextOrder = (type: CategoryType) => {
    const ofType = all.filter((c) => c.type === type);
    return ofType.length ? Math.max(...ofType.map((c) => c.order)) + 1 : 0;
  };

  const create = useMutation({
    mutationFn: (input: {
      name: string;
      type: CategoryType;
      color?: string;
      icon?: string;
      trackDailyPace?: boolean;
    }) => createCategory(uid, { ...input, order: nextOrder(input.type) }),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Category> }) =>
      updateCategory(uid, id, patch),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: (id: string) => archiveCategory(uid, id),
    onSuccess: invalidate,
  });

  const restore = useMutation({
    mutationFn: (id: string) => restoreCategory(uid, id),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(uid, id),
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => reorderCategories(uid, orderedIds),
    onSuccess: invalidate,
  });

  return {
    ...query,
    all,
    expense,
    income,
    /** Active (non-archived) categories for pickers. */
    activeExpense: expense.filter((c) => !c.archived),
    activeIncome: income.filter((c) => !c.archived),
    create,
    update,
    archive,
    restore,
    remove,
    reorder,
  };
}

/** Quick id → category lookup map. */
export function useCategoryMap() {
  const { all } = useCategories();
  return useMemo(() => new Map(all.map((c) => [c.id, c])), [all]);
}
