import { useQuery } from "@tanstack/react-query";
import { listRecentActivity } from "@/services/activityLog";
import { queryKeys } from "@/lib/queryClient";
import { useUid } from "./useAuth";

/**
 * Recent audit-trail entries (newest first) plus the most-recent timestamp,
 * powering the Dashboard "Last updated" indicator and the activity dialog.
 * Kept fresh by a global mutation hook that invalidates `["activityLog"]`.
 */
export function useActivityLog(max = 50) {
  const uid = useUid();
  const query = useQuery({
    queryKey: queryKeys.activityLog(uid),
    queryFn: () => listRecentActivity(uid, max),
  });
  const entries = query.data ?? [];
  return { ...query, entries, lastUpdatedAt: entries[0]?.at ?? null };
}
