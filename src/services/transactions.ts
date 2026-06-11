import { where, orderBy, deleteField } from "firebase/firestore";
import type { Transaction, MonthKey } from "@/types";
import {
  COLLECTIONS,
  createDoc,
  deleteDocById,
  listDocs,
  updateDocById,
} from "./firestore";
import { monthKeyFromISODate } from "@/lib/date";

const NAME = COLLECTIONS.transactions;

export type TransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt" | "monthKey"
>;

/** Every transaction for the user, newest first (export / backup). */
export function listAllTransactions(uid: string): Promise<Transaction[]> {
  return listDocs<Transaction>(uid, NAME, orderBy("date", "desc"));
}

/** All transactions for a month, newest first. */
export function listTransactionsByMonth(
  uid: string,
  monthKey: MonthKey,
): Promise<Transaction[]> {
  return listDocs<Transaction>(
    uid,
    NAME,
    where("monthKey", "==", monthKey),
    orderBy("date", "desc"),
  );
}

/** All transactions for a calendar year (used by year reports). */
export function listTransactionsByYear(
  uid: string,
  year: number,
): Promise<Transaction[]> {
  return listDocs<Transaction>(
    uid,
    NAME,
    where("monthKey", ">=", `${year}-01`),
    where("monthKey", "<=", `${year}-12`),
    orderBy("monthKey", "asc"),
  );
}

/** Transactions for a single category in a month — powers the drill-down view. */
export function listTransactionsByCategory(
  uid: string,
  monthKey: MonthKey,
  categoryId: string,
): Promise<Transaction[]> {
  return listDocs<Transaction>(
    uid,
    NAME,
    where("monthKey", "==", monthKey),
    where("categoryId", "==", categoryId),
    orderBy("date", "desc"),
  );
}

export function createTransaction(
  uid: string,
  input: TransactionInput,
): Promise<string> {
  return createDoc<Transaction>(uid, NAME, {
    ...stripUndefined(input),
    monthKey: monthKeyFromISODate(input.date),
  } as TransactionInput & { monthKey: MonthKey });
}

export function updateTransaction(
  uid: string,
  id: string,
  patch: Partial<TransactionInput>,
): Promise<void> {
  const next: Record<string, unknown> = stripUndefined(patch);
  if (patch.date) next.monthKey = monthKeyFromISODate(patch.date);
  // When the type is known, delete the opposite reference so a document never
  // ends up with BOTH categoryId and incomeSourceId (e.g. after switching an
  // expense to income while editing).
  if (patch.type === "expense") next.incomeSourceId = deleteField();
  if (patch.type === "income") next.categoryId = deleteField();
  return updateDocById<Transaction>(
    uid,
    NAME,
    id,
    next as Partial<Omit<Transaction, "id" | "createdAt" | "updatedAt">>,
  );
}

export const deleteTransaction = (uid: string, id: string) =>
  deleteDocById(uid, NAME, id);

/** Firestore rejects `undefined` field values — drop them. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}
