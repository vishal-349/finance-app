import {
  addDoc,
  collection,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ActivityAction, ActivityChange, ActivityLog } from "@/types";

/**
 * Audit-trail service. Kept dependency-free of the generic Firestore helpers
 * (uses the raw SDK) so it can be called FROM those helpers without a cycle,
 * and so writing an activity entry never itself triggers another entry.
 *
 * Collection names are duplicated as literals here (rather than importing
 * COLLECTIONS from firestore.ts) precisely to avoid that import cycle.
 */

const ACTIVITY = "activityLog";

/** Collections we record, mapped to a human module label. Anything not here
 *  (config like categories/paymentMethods, settings, the log itself) is skipped. */
const MODULE: Record<string, string> = {
  emis: "EMI",
  budgets: "Budget",
  savingsGoals: "Savings Goal",
  subscriptions: "Subscription",
  accounts: "Account",
  creditCards: "Credit Card",
  recurringRules: "Recurring",
  sipInvestments: "SIP",
  emergencyFunds: "Emergency Fund",
};

/** Transaction sub-types get their own module label. */
const TXN_MODULE: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  cc_payment: "Card payment",
  goal: "Goal",
};

/** Fields not worth surfacing as a change. */
const NOISE = new Set(["updatedAt", "createdAt", "order", "lastGeneratedThrough"]);

type AnyData = Record<string, unknown>;

/** A value we can store + compare meaningfully (skip FieldValue sentinels, objects). */
function isPrimitive(v: unknown): v is string | number | boolean | null {
  return v === null || ["string", "number", "boolean"].includes(typeof v);
}

function labelOf(collectionName: string, record: AnyData): string | undefined {
  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      const v = record[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return undefined;
  };
  if (collectionName === "transactions") return pick("merchant", "note");
  if (collectionName === "subscriptions") return pick("service", "name", "merchant");
  return pick("name", "merchant", "note");
}

function amountOf(record: AnyData): number | undefined {
  for (const k of ["amount", "monthlyAmount", "actual", "planned"]) {
    const v = record[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return undefined;
}

export interface ActivityDescriptor {
  module: string;
  label?: string;
  categoryId?: string;
  amount?: number;
  changes?: ActivityChange[];
}

/**
 * Decide whether/how to log a write. Returns null when the collection isn't
 * tracked. `data` is the new data (create) or patch (update); `prev` is the
 * pre-image (update/delete) used for diffs and the delete label.
 */
export function describeWrite(
  collectionName: string,
  action: ActivityAction,
  data: AnyData | undefined,
  prev: AnyData | undefined,
): ActivityDescriptor | null {
  if (collectionName === ACTIVITY) return null;
  const record: AnyData = { ...(prev ?? {}), ...(data ?? {}) };

  let module: string | undefined;
  if (collectionName === "transactions") {
    module = TXN_MODULE[String(record.type ?? "")] ?? "Transaction";
  } else {
    module = MODULE[collectionName];
  }
  if (!module) return null;

  const out: ActivityDescriptor = { module };
  const label = labelOf(collectionName, record);
  if (label) out.label = label;
  if (typeof record.categoryId === "string") out.categoryId = record.categoryId;
  const amount = amountOf(record);
  if (amount !== undefined) out.amount = amount;

  if (action === "update" && data && prev) {
    const changes: ActivityChange[] = [];
    for (const [field, to] of Object.entries(data)) {
      if (NOISE.has(field)) continue;
      const from = prev[field];
      if (!isPrimitive(to) || !isPrimitive(from)) continue;
      if (from !== to) changes.push({ field, from: from ?? null, to: to ?? null });
    }
    if (changes.length) out.changes = changes;
  }

  return out;
}

let currentActor: { uid: string; name?: string } | null = null;

/** Set once on auth state change so service-layer writes can stamp who acted. */
export function setActor(actor: { uid: string; name?: string } | null): void {
  currentActor = actor;
}

/** Append one audit entry. Fire-and-forget — callers must not await/throw on it. */
export async function logActivity(
  uid: string,
  action: ActivityAction,
  collectionName: string,
  recordId: string,
  desc: ActivityDescriptor,
): Promise<void> {
  const entry: AnyData = {
    action,
    collection: collectionName,
    module: desc.module,
    recordId,
    actorUid: uid,
    at: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (desc.label) entry.label = desc.label;
  if (desc.categoryId) entry.categoryId = desc.categoryId;
  if (desc.amount !== undefined) entry.amount = desc.amount;
  if (desc.changes) entry.changes = desc.changes;
  if (currentActor?.name) entry.actorName = currentActor.name;
  await addDoc(collection(db, "users", uid, ACTIVITY), entry);
}

/** Most-recent activity entries, newest first. */
export async function listRecentActivity(uid: string, max = 50): Promise<ActivityLog[]> {
  const ref = collection(db, "users", uid, ACTIVITY);
  const snap = await getDocs(query(ref, orderBy("at", "desc"), fbLimit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ActivityLog);
}
