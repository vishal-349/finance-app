import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserSettings } from "@/types";

/** Settings + profile live on the user document itself: `users/{uid}`. */

export const DEFAULT_SETTINGS: UserSettings = {
  currency: "INR",
  locale: "en-IN",
  theme: "system",
  financialYearStartMonth: 4, // April (India)
};

export async function getUserSettings(uid: string): Promise<UserSettings> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return DEFAULT_SETTINGS;
  const data = snap.data() as Partial<UserSettings>;
  return { ...DEFAULT_SETTINGS, ...data };
}

export async function saveUserSettings(
  uid: string,
  patch: Partial<UserSettings>,
): Promise<void> {
  await setDoc(
    doc(db, "users", uid),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Called once on first sign-in to stamp profile fields. */
export async function ensureUserDoc(
  uid: string,
  profile: { displayName?: string; email?: string },
): Promise<void> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      ...DEFAULT_SETTINGS,
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
  }
}
