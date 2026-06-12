import { orderBy, writeBatch, doc, serverTimestamp, deleteField } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { GoalStatus, SavingsGoal } from "@/types";
import {
  COLLECTIONS,
  createDoc,
  deleteDocById,
  listDocs,
  updateDocById,
} from "./firestore";

const NAME = COLLECTIONS.savingsGoals;

export type SavingsGoalInput = {
  name: string;
  targetAmount: number;
  targetDate?: string;
  color?: string;
  icon?: string;
  note?: string;
  order: number;
};

export function listSavingsGoals(uid: string): Promise<SavingsGoal[]> {
  return listDocs<SavingsGoal>(uid, NAME, orderBy("order", "asc"));
}

export function createSavingsGoal(uid: string, input: SavingsGoalInput): Promise<string> {
  return createDoc<SavingsGoal>(uid, NAME, {
    status: "active" as GoalStatus,
    ...input,
  });
}

/** Optional fields an edit can clear by passing them explicitly as undefined. */
const CLEARABLE_GOAL_FIELDS = ["targetDate", "color", "icon", "note"] as const;

export function updateSavingsGoal(
  uid: string,
  id: string,
  patch: Partial<SavingsGoalInput & { status: GoalStatus }>,
): Promise<void> {
  const next: Record<string, unknown> = { ...patch };
  for (const key of CLEARABLE_GOAL_FIELDS) {
    if (key in patch && patch[key] === undefined) next[key] = deleteField();
  }
  return updateDocById<SavingsGoal>(uid, NAME, id, next as Partial<SavingsGoal>);
}

export const archiveSavingsGoal = (uid: string, id: string) =>
  updateSavingsGoal(uid, id, { status: "archived" });
export const reactivateSavingsGoal = (uid: string, id: string) =>
  updateSavingsGoal(uid, id, { status: "active" });
export const deleteSavingsGoal = (uid: string, id: string) =>
  deleteDocById(uid, NAME, id);

/** Persist a new goal ordering atomically. */
export async function reorderSavingsGoals(uid: string, orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "users", uid, NAME, id), {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}
