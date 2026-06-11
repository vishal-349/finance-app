import { useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
 * user is already signed in — a Firestore failure here (e.g. security rules not
 * yet deployed) must never block authentication or bounce the user to login.
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
    console.error("[auth] user provisioning failed (auth still succeeded):", err);
    if ((err as { code?: string })?.code === "permission-denied") {
      toast.error(
        "Signed in, but the database denied access — deploy your Firestore security rules.",
      );
    }
  }
}

// Popup can fail to propagate auth state in embedded/preview browsers or when
// popups are blocked. In those cases fall back to a full-page redirect.
const POPUP_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/web-storage-unsupported",
  "auth/popup-closed-by-user", // often a symptom of COOP blocking the opener
  "auth/cancelled-popup-request",
  "auth/internal-error",
]);

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

    // Complete a redirect-based sign-in if one is pending (no-op for popup).
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          // eslint-disable-next-line no-console
          console.info("[auth] completed redirect sign-in:", result.user.uid);
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("[auth] getRedirectResult error:", err);
        toast.error(
          `Sign-in failed: ${(err as { code?: string })?.code ?? "unknown error"}`,
        );
      });

    return onAuthStateChanged(auth, (firebaseUser) => {
      // eslint-disable-next-line no-console
      console.info("[auth] state changed →", firebaseUser ? firebaseUser.uid : "signed out");
      // Establish auth state FIRST and unconditionally; everything else is a
      // best-effort side effect that must not gate navigation.
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) void provisionUser(firebaseUser);
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      // eslint-disable-next-line no-console
      console.error("[auth] popup sign-in error:", code, err);
      if (POPUP_FALLBACK_CODES.has(code)) {
        // Switch to a redirect — reliable where popups are restricted. The
        // page navigates away; getRedirectResult() completes it on return.
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
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
