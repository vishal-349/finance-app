import { orderBy, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BaseDoc } from "@/types";
import { createDoc, deleteDocById, listDocs, updateDocById } from "./firestore";

/** A simple named, orderable, archivable entity (payment methods, income sources). */
export interface NamedEntity extends BaseDoc {
  name: string;
  order: number;
  archived: boolean;
}

/** Factory that produces a CRUD service for a named-entity collection. */
export function createNamedService<T extends NamedEntity>(name: string) {
  return {
    list: (uid: string) => listDocs<T>(uid, name, orderBy("order", "asc")),
    create: (uid: string, input: { name: string; order: number }) =>
      createDoc<T>(uid, name, { archived: false, ...input } as Omit<
        T,
        "id" | "createdAt" | "updatedAt"
      >),
    update: (uid: string, id: string, patch: Partial<Pick<T, "name" | "order" | "archived">>) =>
      updateDocById<T>(uid, name, id, patch as Partial<Omit<T, "id" | "createdAt" | "updatedAt">>),
    archive: (uid: string, id: string) =>
      updateDocById<T>(uid, name, id, { archived: true } as Partial<T>),
    restore: (uid: string, id: string) =>
      updateDocById<T>(uid, name, id, { archived: false } as Partial<T>),
    remove: (uid: string, id: string) => deleteDocById(uid, name, id),
    async reorder(uid: string, orderedIds: string[]) {
      const batch = writeBatch(db);
      orderedIds.forEach((id, index) => {
        batch.update(doc(db, "users", uid, name, id), {
          order: index,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    },
  };
}
