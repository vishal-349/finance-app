/**
 * Turn a raw Firestore/Firebase error into something actionable in the UI.
 * The two failures that bite a fresh deployment are:
 *   - permission-denied   → security rules not deployed
 *   - failed-precondition → a composite index isn't created yet
 * Firestore embeds an index-creation URL in the failed-precondition message;
 * we surface it so the fix is one click away.
 */

export interface FormattedFirestoreError {
  code: string;
  title: string;
  message: string;
  /** Firebase console link to create the missing index, if present. */
  indexUrl?: string;
  /** CLI command that resolves the issue. */
  hint?: string;
}

export function formatFirestoreError(error: unknown): FormattedFirestoreError | null {
  if (!error) return null;

  const code = (error as { code?: string })?.code ?? "";
  const rawMessage = error instanceof Error ? error.message : String(error);
  const indexUrl = rawMessage.match(/https?:\/\/console\.firebase\.google\.com\/[^\s)]+/)?.[0];

  if (code === "permission-denied") {
    return {
      code,
      title: "Database access denied",
      message:
        "Your Firestore security rules aren't deployed, so the database is rejecting reads for your own account.",
      hint: "firebase deploy --only firestore:rules",
    };
  }

  if (code === "failed-precondition" || /requires an index/i.test(rawMessage)) {
    return {
      code: code || "failed-precondition",
      title: "Missing database index",
      message:
        "A required Firestore composite index hasn't been created yet. Deploy your indexes, or create it from the link below.",
      indexUrl,
      hint: "firebase deploy --only firestore:indexes",
    };
  }

  if (code === "unavailable") {
    return {
      code,
      title: "Can't reach the database",
      message: "Check your internet connection and try again.",
    };
  }

  if (code === "unauthenticated") {
    return {
      code,
      title: "Session expired",
      message: "Please sign in again.",
    };
  }

  return {
    code: code || "error",
    title: "Something went wrong",
    message: rawMessage || "Failed to load data.",
  };
}
