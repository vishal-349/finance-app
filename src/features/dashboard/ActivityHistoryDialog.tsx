import { useMemo } from "react";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useCategoryMap } from "@/hooks/useCategories";
import { useSettings } from "@/hooks/useSettings";
import { formatTimestamp } from "@/lib/date";
import type { ActivityAction, ActivityLog } from "@/types";

const VERB: Record<ActivityAction, { label: string; variant: "success" | "warning" | "destructive" }> = {
  add: { label: "Added", variant: "success" },
  update: { label: "Updated", variant: "warning" },
  delete: { label: "Deleted", variant: "destructive" },
};

/** Fields whose values should render as currency. */
const MONEY_FIELDS = new Set([
  "amount",
  "monthlyAmount",
  "planned",
  "actual",
  "openingBalance",
  "creditLimit",
  "targetAmount",
]);

function prettyField(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function ActivityHistoryDialog({ open, onOpenChange }: Props) {
  const { entries, isLoading } = useActivityLog(50);
  const categoryMap = useCategoryMap();
  const { money } = useSettings();

  const fmtVal = (field: string, v: unknown): string => {
    if (MONEY_FIELDS.has(field) && typeof v === "number") return money(v);
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
  };

  const labelFor = useMemo(
    () => (e: ActivityLog): string | undefined =>
      e.label ?? (e.categoryId ? categoryMap.get(e.categoryId)?.name : undefined),
    [categoryMap],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Activity history
          </DialogTitle>
          <DialogDescription>
            Recent changes across the app — additions, edits and deletions.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-2 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-muted-foreground">
              No activity recorded yet.
            </p>
          ) : (
            <ul className="divide-y">
              {entries.map((e) => {
                const verb = VERB[e.action];
                const label = labelFor(e);
                return (
                  <li key={e.id} className="flex items-start justify-between gap-3 px-2 py-2.5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 text-sm">
                        <Badge variant={verb.variant}>{verb.label}</Badge>
                        <span className="font-medium">{e.module}</span>
                        {label && (
                          <span className="truncate text-muted-foreground">· {label}</span>
                        )}
                      </div>
                      {e.changes?.map((c) => (
                        <p key={c.field} className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          {prettyField(c.field)}: {fmtVal(c.field, c.from)} → {fmtVal(c.field, c.to)}
                        </p>
                      ))}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatTimestamp(e.at)}
                        {e.actorName ? ` · ${e.actorName}` : ""}
                      </p>
                    </div>
                    {e.amount !== undefined && e.action !== "update" && (
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {money(e.amount)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
