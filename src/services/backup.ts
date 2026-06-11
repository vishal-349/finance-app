import { writeBatch, doc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS, listDocs } from "./firestore";
import type { BaseDoc } from "@/types";

/** Collections included in a full backup, in restore-safe order. */
const ALL = Object.values(COLLECTIONS);

export interface BackupFile {
  version: 1;
  exportedAt: string;
  collections: Record<string, Record<string, unknown>[]>;
}

/** Read every collection for the user into a single JSON-serialisable object. */
export async function buildBackup(uid: string, exportedAt: string): Promise<BackupFile> {
  const collections: BackupFile["collections"] = {};
  await Promise.all(
    ALL.map(async (name) => {
      const docs = await listDocs<BaseDoc>(uid, name);
      // Drop Firestore Timestamps — they don't serialise cleanly to JSON.
      collections[name] = docs.map(({ createdAt, updatedAt, ...rest }) => {
        void createdAt;
        void updatedAt;
        return rest;
      });
    }),
  );
  return { version: 1, exportedAt, collections };
}

/**
 * Restore a backup. Each document is written by its original id (merge), so
 * re-importing is idempotent. Batched in chunks to respect the 500-write limit.
 */
export async function restoreBackup(uid: string, backup: BackupFile): Promise<number> {
  let total = 0;
  for (const name of ALL) {
    const docs = backup.collections[name] ?? [];
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const batch = writeBatch(db);
      for (const d of chunk) {
        const { id, ...data } = d as { id?: string } & Record<string, unknown>;
        const ref = id
          ? doc(db, "users", uid, name, id)
          : doc(collection(db, "users", uid, name));
        batch.set(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
        total += 1;
      }
      await batch.commit();
    }
  }
  return total;
}
