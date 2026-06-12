import { orderBy, deleteField } from "firebase/firestore";
import type { Subscription, SubscriptionFrequency, SubscriptionStatus } from "@/types";
import { todayISODate } from "@/lib/date";
import {
  COLLECTIONS,
  createDoc,
  deleteDocById,
  listDocs,
  updateDocById,
} from "./firestore";

const NAME = COLLECTIONS.subscriptions;

export type SubscriptionInput = {
  name: string;
  service?: string;
  amount: number;
  frequency: SubscriptionFrequency;
  startDate: string;
  accountId?: string;
  creditCardId?: string;
  categoryId?: string;
  autoRenew: boolean;
  note?: string;
};

export function listSubscriptions(uid: string): Promise<Subscription[]> {
  return listDocs<Subscription>(uid, NAME, orderBy("createdAt", "desc"));
}

export function createSubscription(uid: string, input: SubscriptionInput): Promise<string> {
  return createDoc<Subscription>(uid, NAME, {
    status: "active" as SubscriptionStatus,
    ...input,
  });
}

/** Optional fields an edit can clear by passing them explicitly as undefined. */
const CLEARABLE_SUB_FIELDS = [
  "service",
  "accountId",
  "creditCardId",
  "categoryId",
  "note",
] as const;

export function updateSubscription(
  uid: string,
  id: string,
  patch: Partial<
    SubscriptionInput & { status: SubscriptionStatus; lastGeneratedThrough: string }
  >,
): Promise<void> {
  const next: Record<string, unknown> = { ...patch };
  for (const key of CLEARABLE_SUB_FIELDS) {
    if (key in patch && patch[key] === undefined) next[key] = deleteField();
  }
  return updateDocById<Subscription>(uid, NAME, id, next as Partial<Subscription>);
}

/** Pause: engine skips it. Resume: skip the paused window (no backfill). */
export const pauseSubscription = (uid: string, id: string) =>
  updateDocById<Subscription>(uid, NAME, id, { status: "paused" });
export const resumeSubscription = (uid: string, id: string) =>
  updateDocById<Subscription>(uid, NAME, id, {
    status: "active",
    lastGeneratedThrough: todayISODate(),
  });
export const cancelSubscription = (uid: string, id: string) =>
  updateDocById<Subscription>(uid, NAME, id, { status: "cancelled" });

export const deleteSubscription = (uid: string, id: string) =>
  deleteDocById(uid, NAME, id);
