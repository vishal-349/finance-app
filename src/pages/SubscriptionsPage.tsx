import { useMemo, useState } from "react";
import {
  CalendarClock,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataState } from "@/components/shared/DataState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubscriptionForm } from "@/features/subscriptions/SubscriptionForm";
import { useSubscriptions, useSubscriptionAnalytics } from "@/hooks/useSubscriptions";
import { useAccountMap } from "@/hooks/useAccounts";
import { useCreditCardMap } from "@/hooks/useCreditCards";
import { useSettings } from "@/hooks/useSettings";
import { formatDisplayDate } from "@/lib/date";
import type { Subscription } from "@/types";

export function SubscriptionsPage() {
  const { pause, resume, cancel, remove, isLoading, isError, error, refetch } =
    useSubscriptions();
  const { analytics, all } = useSubscriptionAnalytics();
  const accountMap = useAccountMap();
  const cardMap = useCreditCardMap();
  const { money } = useSettings();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [confirmDel, setConfirmDel] = useState<Subscription | null>(null);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const nextRenewal = useMemo(
    () => analytics.renewals.find((r) => r.subscription.status === "active" && r.nextRenewal),
    [analytics.renewals],
  );
  const upcoming = useMemo(
    () =>
      analytics.renewals
        .filter((r) => r.subscription.status === "active" && r.nextRenewal)
        .slice(0, 6),
    [analytics.renewals],
  );

  const sourceLabel = (s: Subscription) =>
    s.creditCardId
      ? cardMap.get(s.creditCardId)?.name
      : accountMap.get(s.accountId ?? "")?.name;

  const statusBadge = (s: Subscription) => {
    if (s.status === "paused") return <Badge variant="warning">Paused</Badge>;
    if (s.status === "cancelled") return <Badge variant="secondary">Cancelled</Badge>;
    return s.autoRenew ? (
      <Badge variant="success">Auto-renew</Badge>
    ) : (
      <Badge variant="secondary">Manual</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Netflix, Spotify, ChatGPT and more — track renewals and recurring cost."
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add subscription
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Monthly cost" value={money(analytics.monthlyTotal)} icon={Repeat} />
        <StatCard label="Yearly cost" value={money(analytics.yearlyTotal)} />
        <StatCard label="Active" value={String(analytics.activeCount)} />
        <StatCard
          label="Next renewal"
          value={nextRenewal?.nextRenewal ? formatDisplayDate(nextRenewal.nextRenewal) : "—"}
          hint={nextRenewal?.subscription.name}
          icon={CalendarClock}
        />
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        isEmpty={all.length === 0}
        emptyIcon={<Repeat className="h-10 w-10 text-muted-foreground" />}
        emptyTitle="No subscriptions yet"
        emptyMessage="Add a subscription to track renewals and recurring spend."
        emptyAction={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add subscription
          </Button>
        }
      >
        {upcoming.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming renewals</CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {upcoming.map((r) => (
                <div
                  key={r.subscription.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">{r.subscription.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.nextRenewal && formatDisplayDate(r.nextRenewal)}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium tabular-nums">
                    {money(r.subscription.amount)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="divide-y p-0">
            {all.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium">{s.name}</span>
                    {statusBadge(s)}
                    <Badge variant="outline">
                      {s.frequency === "yearly" ? "Yearly" : "Monthly"}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {money(s.amount)}
                    {sourceLabel(s) && ` · ${sourceLabel(s)}`}
                  </p>
                </div>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Edit"
                    onClick={() => {
                      setEditing(s);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {s.status !== "cancelled" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={s.status === "paused" ? "Resume" : "Pause"}
                      onClick={() =>
                        s.status === "paused" ? resume.mutate(s.id) : pause.mutate(s.id)
                      }
                    >
                      {s.status === "paused" ? (
                        <Play className="h-4 w-4" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {s.status !== "cancelled" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-warning"
                      aria-label="Cancel"
                      onClick={() => cancel.mutate(s.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    aria-label="Delete"
                    onClick={() => setConfirmDel(s)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </DataState>

      <SubscriptionForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title={confirmDel ? `Delete ${confirmDel.name}?` : "Delete subscription?"}
        description="This removes the subscription. Charges already recorded are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!confirmDel) return;
          try {
            await remove.mutateAsync(confirmDel.id);
            toast.success("Subscription deleted");
            setConfirmDel(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete subscription");
          }
        }}
      />
    </div>
  );
}
