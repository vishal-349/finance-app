import { useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { toast } from "sonner";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { ensureUserDoc } from "@/services/settings";
import { seedDefaultData } from "@/services/seed";
import { listCategories } from "@/services/categories";
import { AuthContext } from "./auth-context";

/**
 * Provision the user's profile + starter data. Runs in the background AFTER the
 * user is already considered signed in — a Firestore failure here (e.g. security
 * rules not yet deployed) must never block authentication or bounce the user
 * back to the login screen.
 */
async function provisionUser(firebaseUser: User) {
  try {
    await ensureUserDoc(firebaseUser.uid, {
      displayName: firebaseUser.displayName ?? undefined,
      email: firebaseUser.email ?? undefined,
    });
    const cats = await listCategories(firebaseUser.uid);
    if (cats.length === 0) await seedDefaultData(firebaseUser.uid);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("User provisioning failed (auth still succeeded):", err);
    const code = (err as { code?: string })?.code;
    if (code === "permission-denied") {
      toast.error(
        "Signed in, but the database denied access. Deploy your Firestore security rules.",
      );
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Without Firebase config there's no auth to wait on — show the login
    // screen (which surfaces the setup notice) instead of hanging on a loader.
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth, (firebaseUser) => {
      // Establish auth state FIRST and unconditionally. Everything else is a
      // best-effort side effect that must not gate navigation.
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) void provisionUser(firebaseUser);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}
