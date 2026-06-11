import { useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { ensureUserDoc } from "@/services/settings";
import { seedDefaultData } from "@/services/seed";
import { listCategories } from "@/services/categories";
import { AuthContext } from "./auth-context";

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
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await ensureUserDoc(firebaseUser.uid, {
          displayName: firebaseUser.displayName ?? undefined,
          email: firebaseUser.email ?? undefined,
        });
        // Seed starter data only when the user has no categories yet.
        try {
          const cats = await listCategories(firebaseUser.uid);
          if (cats.length === 0) await seedDefaultData(firebaseUser.uid);
        } catch {
          // Non-fatal: user can create categories manually.
        }
      }
      setUser(firebaseUser);
      setLoading(false);
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
