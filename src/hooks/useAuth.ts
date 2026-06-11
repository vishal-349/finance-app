import { useContext } from "react";
import { AuthContext } from "@/context/auth-context";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/** Convenience: the current user's id, asserted non-null inside protected routes. */
export function useUid(): string {
  const { user } = useAuth();
  if (!user) throw new Error("useUid called outside an authenticated route");
  return user.uid;
}
