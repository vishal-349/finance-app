import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  type QueryConstraint,
  type CollectionReference,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BaseDoc, ActivityAction } from "@/types";
import { describeWrite, logActivity } from "./activityLog";

/**
 * Audit hook: record an add/update/delete to the activity log as a
 * fire-and-forget side effect. Wrapped so a logging failure can never break or
 * slow the underlying write.
 */
function recordActivity(
  uid: string,
  action: ActivityAction,
  name: string,
  recordId: string,
  data: Record<string, unknown> | undefined,
  prev: Record<string, unknown> | undefined,
): void {
  try {
    const desc = describeWrite(name, action, data, prev);
    if (desc) void logActivity(uid, action, name, recordId, desc).catch(() => {});
  } catch {
    /* never break the write */
  }
}

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
  recordActivity(uid, "add", name, ref.id, data as Record<string, unknown>, undefined);
  return ref.id;
}

export async function updateDocById<T extends BaseDoc>(
  uid: string,
  name: string,
  id: string,
  data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>,
): Promise<void> {
  const ref = doc(db, "users", uid, name, id);
  // Pre-image for prev → new diffs (best-effort; never blocks the update).
  let prev: Record<string, unknown> | undefined;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) prev = snap.data();
  } catch {
    /* ignore */
  }
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
  recordActivity(uid, "update", name, id, data as Record<string, unknown>, prev);
}

export async function deleteDocById(
  uid: string,
  name: string,
  id: string,
): Promise<void> {
  const ref = doc(db, "users", uid, name, id);
  let prev: Record<string, unknown> | undefined;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) prev = snap.data();
  } catch {
    /* ignore */
  }
  await deleteDoc(ref);
  recordActivity(uid, "delete", name, id, undefined, prev);
}

/**
 * Upsert a doc at a caller-chosen id (deterministic-id writes, e.g. one EMI
 * installment slot → one transaction). Idempotent: re-marking the same slot
 * overwrites rather than duplicating. Stamps `createdAt` only on first write.
 */
export async function setDocById<T extends BaseDoc>(
  uid: string,
  name: string,
  id: string,
  data: Omit<T, "id" | "createdAt" | "updatedAt">,
): Promise<void> {
  const ref = doc(db, "users", uid, name, id);
  const existed = (await getDoc(ref)).exists();
  await setDoc(
    ref,
    {
      ...data,
      ...(existed ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  recordActivity(
    uid,
    existed ? "update" : "add",
    name,
    id,
    data as Record<string, unknown>,
    undefined,
  );
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
  activityLog: "activityLog",
} as const;
