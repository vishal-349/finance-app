import { orderBy, where, deleteField } from "firebase/firestore";
import type { Emi, EmiType, ScheduleStatus, Transaction } from "@/types";
import { occurrenceAt, todayISODate } from "@/lib/date";
import {
  COLLECTIONS,
  createDoc,
  deleteDocById,
  listDocs,
  updateDocById,
} from "./firestore";

const NAME = COLLECTIONS.emis;

export type EmiInput = {
  name: string;
  emiType: EmiType;
  monthlyAmount: number;
  startDate: string;
  months: number;
  categoryId?: string;
  creditCardId?: string;
  accountId?: string;
  paymentMethodId?: string;
  note?: string;
};

/** Last installment date for a plan = occurrence (months - 1). */
export function emiEndDate(startDate: string, months: number): string {
  return occurrenceAt(startDate, "monthly", Math.max(0, months - 1));
}

export function listEmis(uid: string): Promise<Emi[]> {
  return listDocs<Emi>(uid, NAME, orderBy("startDate", "desc"));
}

export function createEmi(uid: string, input: EmiInput): Promise<string> {
  return createDoc<Emi>(uid, NAME, {
    ...input,
    endDate: emiEndDate(input.startDate, input.months),
    status: "active" as ScheduleStatus,
  });
}

/**
 * Update an EMI. When the schedule shape changes, callers must pass BOTH
 * `startDate` and `months` (the form always does) so the stored `endDate`
 * stays consistent.
 */
/** Optional fields an edit can clear by passing them explicitly as undefined. */
const CLEARABLE_EMI_FIELDS = [
  "categoryId",
  "creditCardId",
  "accountId",
  "paymentMethodId",
  "note",
] as const;

export function updateEmi(
  uid: string,
  id: string,
  patch: Partial<EmiInput & { status: ScheduleStatus; lastGeneratedThrough: string }>,
): Promise<void> {
  const next: Record<string, unknown> = { ...patch };
  if (patch.startDate !== undefined && patch.months !== undefined) {
    next.endDate = emiEndDate(patch.startDate, patch.months);
  }
  for (const key of CLEARABLE_EMI_FIELDS) {
    if (key in patch && patch[key] === undefined) next[key] = deleteField();
  }
  return updateDocById<Emi>(uid, NAME, id, next as Partial<Emi>);
}

/** Pause: engine skips it. Resume: skip the paused window (no backfill). */
export const pauseEmi = (uid: string, id: string) =>
  updateDocById<Emi>(uid, NAME, id, { status: "paused" });
export const resumeEmi = (uid: string, id: string) =>
  updateDocById<Emi>(uid, NAME, id, {
    status: "active",
    lastGeneratedThrough: todayISODate(),
  });
export const stopEmi = (uid: string, id: string) =>
  updateDocById<Emi>(uid, NAME, id, { status: "stopped" });

export const deleteEmi = (uid: string, id: string) => deleteDocById(uid, NAME, id);

/**
 * Installment transactions recorded for one EMI, newest first.
 * Requires the composite index (emiId ASC, date DESC).
 */
export function listEmiTransactions(uid: string, emiId: string): Promise<Transaction[]> {
  return listDocs<Transaction>(
    uid,
    COLLECTIONS.transactions,
    where("emiId", "==", emiId),
    orderBy("date", "desc"),
  );
}
