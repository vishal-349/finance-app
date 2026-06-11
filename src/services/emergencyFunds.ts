import { orderBy, where } from "firebase/firestore";
import type { EmergencyFund, MonthKey } from "@/types";
import {
  COLLECTIONS,
  createDoc,
  deleteDocById,
  listDocs,
  updateDocById,
} from "./firestore";

const NAME = COLLECTIONS.emergencyFunds;

/** All emergency-fund entries, chronological (for running totals + charts). */
export function listEmergencyFunds(uid: string): Promise<EmergencyFund[]> {
  return listDocs<EmergencyFund>(uid, NAME, orderBy("monthKey", "asc"));
}

export function getEmergencyFundForMonth(
  uid: string,
  monthKey: MonthKey,
): Promise<EmergencyFund[]> {
  return listDocs<EmergencyFund>(uid, NAME, where("monthKey", "==", monthKey));
}

/** One entry per month — create or update. */
export async function upsertEmergencyFund(
  uid: string,
  monthKey: MonthKey,
  data: { planned: number; actual: number; note?: string },
): Promise<void> {
  const existing = await getEmergencyFundForMonth(uid, monthKey);
  if (existing.length) {
    await updateDocById<EmergencyFund>(uid, NAME, existing[0].id, data);
  } else {
    await createDoc<EmergencyFund>(uid, NAME, { monthKey, ...data });
  }
}

export const deleteEmergencyFund = (uid: string, id: string) =>
  deleteDocById(uid, NAME, id);
