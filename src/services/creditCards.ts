import { orderBy, where, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CreditCard, PaymentMethod, PaymentMethodKind, Transaction } from "@/types";
import {
  COLLECTIONS,
  createDoc,
  deleteDocById,
  listDocs,
  updateDocById,
} from "./firestore";

const NAME = COLLECTIONS.creditCards;

export type CreditCardInput = {
  name: string;
  bankName: string;
  last4: string;
  creditLimit: number;
  billingDay: number;
  dueDay: number;
  color?: string;
  order: number;
};

export function listCreditCards(uid: string): Promise<CreditCard[]> {
  return listDocs<CreditCard>(uid, NAME, orderBy("order", "asc"));
}

export function createCreditCard(uid: string, input: CreditCardInput): Promise<string> {
  return createDoc<CreditCard>(uid, NAME, { archived: false, ...input });
}

export function updateCreditCard(
  uid: string,
  id: string,
  patch: Partial<CreditCardInput & { archived: boolean }>,
): Promise<void> {
  return updateDocById<CreditCard>(uid, NAME, id, patch);
}

export const archiveCreditCard = (uid: string, id: string) =>
  updateCreditCard(uid, id, { archived: true });
export const restoreCreditCard = (uid: string, id: string) =>
  updateCreditCard(uid, id, { archived: false });
export const deleteCreditCard = (uid: string, id: string) =>
  deleteDocById(uid, NAME, id);

/** Persist a new card ordering atomically. */
export async function reorderCreditCards(uid: string, orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "users", uid, NAME, id), {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

/**
 * Card transactions in a date range, newest first.
 * Requires the composite index (creditCardId ASC, date DESC).
 */
export function listCardTransactions(
  uid: string,
  creditCardId: string,
  startISO: string,
  endISO: string,
): Promise<Transaction[]> {
  return listDocs<Transaction>(
    uid,
    COLLECTIONS.transactions,
    where("creditCardId", "==", creditCardId),
    where("date", ">=", startISO),
    where("date", "<=", endISO),
    orderBy("date", "desc"),
  );
}

/**
 * Resolve a payment method's kind without requiring a data migration:
 * explicit `kind` wins; otherwise a conservative name heuristic.
 */
export function resolvePaymentMethodKind(pm: PaymentMethod): PaymentMethodKind {
  if (pm.kind) return pm.kind;
  const n = pm.name.toLowerCase();
  if (/credit/.test(n)) return "credit_card";
  if (/upi/.test(n)) return "upi";
  if (/cash/.test(n)) return "cash";
  if (/bank|net\s*banking|debit/.test(n)) return "bank";
  return "other";
}

export const isCreditCardMethod = (pm: PaymentMethod): boolean =>
  resolvePaymentMethodKind(pm) === "credit_card";
