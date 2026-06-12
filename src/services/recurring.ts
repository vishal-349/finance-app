import { orderBy } from "firebase/firestore";
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

/** Editing a rule only affects FUTURE occurrences — past ones are materialised. */
export function updateRecurringRule(
  uid: string,
  id: string,
  patch: Partial<RecurringRuleInput & { status: ScheduleStatus; lastGeneratedThrough: string }>,
): Promise<void> {
  return updateDocById<RecurringRule>(uid, NAME, id, patch);
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
