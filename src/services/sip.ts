import { orderBy } from "firebase/firestore";
import type { SipInvestment, MonthKey, SipKind } from "@/types";
import {
  COLLECTIONS,
  createDoc,
  deleteDocById,
  listDocs,
  updateDocById,
} from "./firestore";

const NAME = COLLECTIONS.sipInvestments;

export type SipInput = {
  monthKey: MonthKey;
  planned: number;
  actual: number;
  kind: SipKind;
  name: string;
  /** Cash account the investment is drawn from. */
  accountId?: string;
  note?: string;
};

/** All SIP entries, chronological. Multiple instruments per month allowed. */
export function listSipInvestments(uid: string): Promise<SipInvestment[]> {
  return listDocs<SipInvestment>(uid, NAME, orderBy("monthKey", "asc"));
}

export function createSip(uid: string, input: SipInput): Promise<string> {
  return createDoc<SipInvestment>(uid, NAME, stripUndefined(input));
}

export function updateSip(
  uid: string,
  id: string,
  patch: Partial<SipInput>,
): Promise<void> {
  return updateDocById<SipInvestment>(uid, NAME, id, stripUndefined(patch));
}

/** Firestore rejects `undefined` field values — drop them. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as T;
}

export const deleteSip = (uid: string, id: string) => deleteDocById(uid, NAME, id);
