import { writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "./firestore";

/**
 * Seed sensible starter data for a brand-new user. Only *names* are seeded —
 * never any budget amounts or financial figures. The user can rename, reorder,
 * archive or delete everything afterwards.
 */

const DEFAULT_EXPENSE_CATEGORIES = [
  "Grocery",
  "Rent",
  "Electricity",
  "Petrol",
  "WiFi",
  "Mobile Bill",
  "Gym",
  "Shopping",
  "Home Support",
  "Weekend / Fun",
];

const DEFAULT_INCOME_CATEGORIES = ["Salary", "Freelancing", "Other Income"];

const DEFAULT_PAYMENT_METHODS = ["Cash", "UPI", "Credit Card", "Debit Card", "Net Banking"];

const DEFAULT_INCOME_SOURCES = [
  "Salary",
  "Freelancing",
  "Bonus",
  "Interest",
  "Rental Income",
  "Business Income",
  "Other Income",
];

export async function seedDefaultData(uid: string): Promise<void> {
  const batch = writeBatch(db);
  const stamp = { createdAt: serverTimestamp(), updatedAt: serverTimestamp() };

  DEFAULT_EXPENSE_CATEGORIES.forEach((name, order) => {
    batch.set(doc(collection(db, "users", uid, COLLECTIONS.categories)), {
      name,
      type: "expense",
      order,
      archived: false,
      ...stamp,
    });
  });

  DEFAULT_INCOME_CATEGORIES.forEach((name, order) => {
    batch.set(doc(collection(db, "users", uid, COLLECTIONS.categories)), {
      name,
      type: "income",
      order: DEFAULT_EXPENSE_CATEGORIES.length + order,
      archived: false,
      ...stamp,
    });
  });

  DEFAULT_PAYMENT_METHODS.forEach((name, order) => {
    batch.set(doc(collection(db, "users", uid, COLLECTIONS.paymentMethods)), {
      name,
      order,
      archived: false,
      ...stamp,
    });
  });

  DEFAULT_INCOME_SOURCES.forEach((name, order) => {
    batch.set(doc(collection(db, "users", uid, COLLECTIONS.incomeSources)), {
      name,
      order,
      archived: false,
      ...stamp,
    });
  });

  await batch.commit();
}
