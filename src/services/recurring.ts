import { orderBy, deleteField } from "firebase/firestore";
import type { Frequency, RecurringRule, ScheduleStatus, TransactionType } from "@/types";
import { todayISODate } from "@/lib/date";
import {
  COLLECTIONS,
  createDoc,
  deleteDocById,
  listDocs,
  updateDocById,
} from "./firestore";

const NAME = COLLECTIONS.recurringRules;

export type RecurringRuleInput = {
  name: string;
  amount: number;
  type: TransactionType;
  frequency: Frequency;
  startDate: string;
  endDate?: string;
  categoryId?: string;
  incomeSourceId?: string;
  paymentMethodId?: string;
  creditCardId?: string;
  merchant?: string;
  note?: string;
};

export function listRecurringRules(uid: string): Promise<RecurringRule[]> {
  return listDocs<RecurringRule>(uid, NAME, orderBy("createdAt", "desc"));
}

export function createRecurringRule(
  uid: string,
  input: RecurringRuleInput,
): Promise<string> {
  return createDoc<RecurringRule>(uid, NAME, {
    ...input,
    status: "active" as ScheduleStatus,
  });
}

/**
 * Optional fields an edit can CLEAR: passing them explicitly as `undefined`
 * deletes them from the document (updateDoc merges, so omission would keep a
 * stale value).
 */
const CLEARABLE_RULE_FIELDS = [
  "endDate",
  "categoryId",
  "incomeSourceId",
  "paymentMethodId",
  "creditCardId",
  "merchant",
  "note",
] as const;

/** Editing a rule only affects FUTURE occurrences — past ones are materialised. */
export function updateRecurringRule(
  uid: string,
  id: string,
  patch: Partial<RecurringRuleInput & { status: ScheduleStatus; lastGeneratedThrough: string }>,
): Promise<void> {
  const next: Record<string, unknown> = { ...patch };
  for (const key of CLEARABLE_RULE_FIELDS) {
    if (key in patch && patch[key] === undefined) next[key] = deleteField();
  }
  return updateDocById<RecurringRule>(uid, NAME, id, next as Partial<RecurringRule>);
}

/** Pause: engine skips it. Resume: skip the paused window (no backfill). */
export const pauseRecurringRule = (uid: string, id: string) =>
  updateDocById<RecurringRule>(uid, NAME, id, { status: "paused" });
export const resumeRecurringRule = (uid: string, id: string) =>
  updateDocById<RecurringRule>(uid, NAME, id, {
    status: "active",
    lastGeneratedThrough: todayISODate(),
  });
export const stopRecurringRule = (uid: string, id: string) =>
  updateDocById<RecurringRule>(uid, NAME, id, { status: "stopped" });

export const deleteRecurringRule = (uid: string, id: string) =>
  deleteDocById(uid, NAME, id);
