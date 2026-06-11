import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { NamedEntity } from "@/services/namedCollection";
import { createNamedService } from "@/services/namedCollection";
import { useUid } from "./useAuth";

/**
 * Generic data hook for named, orderable, archivable collections
 * (payment methods, income sources). Mirrors useCategories' shape.
 */
export function useNamedEntities<T extends NamedEntity>(
  service: ReturnType<typeof createNamedService<T>>,
  queryKeyFactory: (uid: string) => readonly unknown[],
) {
  const uid = useUid();
  const qc = useQueryClient();
  const key = queryKeyFactory(uid);
  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const query = useQuery({ queryKey: key, queryFn: () => service.list(uid) });
  const all = (query.data ?? []) as T[];
  const active = useMemo(() => all.filter((e) => !e.archived), [all]);

  const nextOrder = () =>
    all.length ? Math.max(...all.map((e) => e.order)) + 1 : 0;

  const create = useMutation({
    mutationFn: (name: string) => service.create(uid, { name, order: nextOrder() }),
    onSuccess: invalidate,
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      service.update(uid, id, { name } as Partial<Pick<T, "name">>),
    onSuccess: invalidate,
  });
  const archive = useMutation({
    mutationFn: (id: string) => service.archive(uid, id),
    onSuccess: invalidate,
  });
  const restore = useMutation({
    mutationFn: (id: string) => service.restore(uid, id),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => service.remove(uid, id),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (orderedIds: string[]) => service.reorder(uid, orderedIds),
    onSuccess: invalidate,
  });

  return { ...query, all, active, create, rename, archive, restore, remove, reorder };
}
