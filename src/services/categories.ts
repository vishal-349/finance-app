import { orderBy, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Category, CategoryType } from "@/types";
import {
  COLLECTIONS,
  createDoc,
  deleteDocById,
  listDocs,
  updateDocById,
} from "./firestore";
import { deleteBudgetsForCategory } from "./budgets";

const NAME = COLLECTIONS.categories;

export function listCategories(uid: string): Promise<Category[]> {
  return listDocs<Category>(uid, NAME, orderBy("order", "asc"));
}

export function createCategory(
  uid: string,
  input: {
    name: string;
    type: CategoryType;
    order: number;
    color?: string;
    icon?: string;
    trackDailyPace?: boolean;
  },
): Promise<string> {
  return createDoc<Category>(uid, NAME, { archived: false, ...input });
}

export function updateCategory(
  uid: string,
  id: string,
  patch: Partial<
    Pick<Category, "name" | "color" | "icon" | "order" | "archived" | "trackDailyPace">
  >,
): Promise<void> {
  return updateDocById<Category>(uid, NAME, id, patch);
}

export const archiveCategory = (uid: string, id: string) =>
  updateCategory(uid, id, { archived: true });

export const restoreCategory = (uid: string, id: string) =>
  updateCategory(uid, id, { archived: false });

/** Delete a category and cascade-remove its budgets so none are orphaned. */
export async function deleteCategory(uid: string, id: string): Promise<void> {
  await deleteBudgetsForCategory(uid, id);
  await deleteDocById(uid, NAME, id);
}

/** Persist a new ordering in one atomic batch. */
export async function reorderCategories(
  uid: string,
  orderedIds: string[],
): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "users", uid, NAME, id), {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}
