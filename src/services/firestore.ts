import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  type QueryConstraint,
  type CollectionReference,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BaseDoc } from "@/types";

/**
 * Generic, user-scoped Firestore access layer.
 *
 * Every collection lives under `users/{uid}/{name}`, guaranteeing per-user
 * isolation. This module is intentionally thin — feature services wrap it with
 * typed helpers, and React Query owns caching/refetching.
 */

export function userCollection(
  uid: string,
  name: string,
): CollectionReference<DocumentData> {
  return collection(db, "users", uid, name);
}

/** Strip Firestore metadata and attach the doc id. */
function withId<T>(id: string, data: DocumentData): T {
  return { id, ...data } as T;
}

export async function listDocs<T extends BaseDoc>(
  uid: string,
  name: string,
  ...constraints: QueryConstraint[]
): Promise<T[]> {
  const ref = userCollection(uid, name);
  const snap = await getDocs(constraints.length ? query(ref, ...constraints) : ref);
  return snap.docs.map((d) => withId<T>(d.id, d.data()));
}

export async function createDoc<T extends BaseDoc>(
  uid: string,
  name: string,
  data: Omit<T, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(userCollection(uid, name), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocById<T extends BaseDoc>(
  uid: string,
  name: string,
  id: string,
  data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  await updateDoc(doc(db, "users", uid, name, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocById(
  uid: string,
  name: string,
  id: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, name, id));
}

/** Collection names — single source of truth to avoid string typos. */
export const COLLECTIONS = {
  categories: "categories",
  paymentMethods: "paymentMethods",
  incomeSources: "incomeSources",
  budgets: "budgets",
  transactions: "transactions",
  emergencyFunds: "emergencyFunds",
  sipInvestments: "sipInvestments",
  creditCards: "creditCards",
  emis: "emis",
  recurringRules: "recurringRules",
  accounts: "accounts",
  savingsGoals: "savingsGoals",
  subscriptions: "subscriptions",
} as const;
