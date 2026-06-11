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
  note?: string;
};

/** All SIP entries, chronological. Multiple instruments per month allowed. */
export function listSipInvestments(uid: string): Promise<SipInvestment[]> {
  return listDocs<SipInvestment>(uid, NAME, orderBy("monthKey", "asc"));
}

export function createSip(uid: string, input: SipInput): Promise<string> {
  return createDoc<SipInvestment>(uid, NAME, input);
}

export function updateSip(
  uid: string,
  id: string,
  patch: Partial<SipInput>,
): Promise<void> {
  return updateDocById<SipInvestment>(uid, NAME, id, patch);
}

export const deleteSip = (uid: string, id: string) => deleteDocById(uid, NAME, id);
