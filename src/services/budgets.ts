import { where, writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Budget, MonthKey } from "@/types";
import {
  COLLECTIONS,
  createDoc,
  deleteDocById,
  listDocs,
  updateDocById,
} from "./firestore";

const NAME = COLLECTIONS.budgets;

/** Budgets (plans) for a single month. */
export function listBudgets(uid: string, monthKey: MonthKey): Promise<Budget[]> {
  return listDocs<Budget>(uid, NAME, where("monthKey", "==", monthKey));
}

/** Create or update the plan for one category in a month (idempotent upsert). */
export async function upsertBudget(
  uid: string,
  monthKey: MonthKey,
  categoryId: string,
  amount: number,
): Promise<void> {
  const existing = await listDocs<Budget>(
    uid,
    NAME,
    where("monthKey", "==", monthKey),
    where("categoryId", "==", categoryId),
  );
  if (existing.length) {
    await updateDocById<Budget>(uid, NAME, existing[0].id, { amount });
  } else {
    await createDoc<Budget>(uid, NAME, { monthKey, categoryId, amount });
  }
}

export const deleteBudget = (uid: string, id: string) =>
  deleteDocById(uid, NAME, id);

/**
 * Copy every budget from `from` month into `to` month. Existing budgets in the
 * target month for the same category are overwritten; others are left intact.
 */
export async function copyBudgets(
  uid: string,
  from: MonthKey,
  to: MonthKey,
): Promise<number> {
  const [source, target] = await Promise.all([
    listBudgets(uid, from),
    listBudgets(uid, to),
  ]);
  const targetByCategory = new Map(target.map((b) => [b.categoryId, b]));
  const batch = writeBatch(db);
  source.forEach((b) => {
    const existing = targetByCategory.get(b.categoryId);
    if (existing) {
      batch.update(doc(db, "users", uid, NAME, existing.id), {
        amount: b.amount,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(collection(db, "users", uid, NAME)), {
        monthKey: to,
        categoryId: b.categoryId,
        amount: b.amount,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  });
  await batch.commit();
  return source.length;
}
