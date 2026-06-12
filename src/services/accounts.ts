import { orderBy, writeBatch, doc, serverTimestamp, deleteField } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Account, AccountType, Transaction } from "@/types";
import {
  COLLECTIONS,
  createDoc,
  deleteDocById,
  listDocs,
  updateDocById,
} from "./firestore";
import { listAllTransactions } from "./transactions";

const NAME = COLLECTIONS.accounts;

export type AccountInput = {
  name: string;
  type: AccountType;
  openingBalance: number;
  institution?: string;
  last4?: string;
  color?: string;
  order: number;
};

export function listAccounts(uid: string): Promise<Account[]> {
  return listDocs<Account>(uid, NAME, orderBy("order", "asc"));
}

export function createAccount(uid: string, input: AccountInput): Promise<string> {
  return createDoc<Account>(uid, NAME, { archived: false, ...input });
}

/** Optional fields an edit can clear by passing them explicitly as undefined. */
const CLEARABLE_ACCOUNT_FIELDS = ["institution", "last4", "color"] as const;

export function updateAccount(
  uid: string,
  id: string,
  patch: Partial<AccountInput & { archived: boolean }>,
): Promise<void> {
  const next: Record<string, unknown> = { ...patch };
  for (const key of CLEARABLE_ACCOUNT_FIELDS) {
    if (key in patch && patch[key] === undefined) next[key] = deleteField();
  }
  return updateDocById<Account>(uid, NAME, id, next as Partial<Account>);
}

export const archiveAccount = (uid: string, id: string) =>
  updateAccount(uid, id, { archived: true });
export const restoreAccount = (uid: string, id: string) =>
  updateAccount(uid, id, { archived: false });
export const deleteAccount = (uid: string, id: string) => deleteDocById(uid, NAME, id);

/** Persist a new account ordering atomically. */
export async function reorderAccounts(uid: string, orderedIds: string[]): Promise<void> {
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
 * A transaction is "unassigned" when it carries money but has no funding source
 * yet — i.e. a legacy expense/income created before accounts existed. Transfers,
 * bill payments and goal contributions always have a source by construction.
 */
export function isUnassignedTransaction(t: Transaction): boolean {
  return (
    (t.type === "expense" || t.type === "income") &&
    !t.accountId &&
    !t.creditCardId
  );
}

/**
 * Backfill tool: assign `accountId` to every unassigned transaction so its
 * balance starts reflecting history. Returns how many were updated. Batched to
 * respect Firestore's 500-write limit.
 */
export async function assignUnassignedTransactions(
  uid: string,
  accountId: string,
): Promise<number> {
  const all = await listAllTransactions(uid);
  const targets = all.filter(isUnassignedTransaction);
  let updated = 0;
  for (let i = 0; i < targets.length; i += 400) {
    const chunk = targets.slice(i, i + 400);
    const batch = writeBatch(db);
    for (const t of chunk) {
      batch.update(doc(db, "users", uid, COLLECTIONS.transactions, t.id), {
        accountId,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    updated += chunk.length;
  }
  return updated;
}
