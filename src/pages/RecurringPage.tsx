import { useState } from "react";
import { format, addYears } from "date-fns";
import {
  CalendarClock,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  Square,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataState } from "@/components/shared/DataState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecurringForm } from "@/features/recurring/RecurringForm";
import { useRecurringRules } from "@/hooks/useRecurring";
import { useSettings } from "@/hooks/useSettings";
import { occurrencesBetween } from "@/services/recurringEngine";
import { formatDisplayDate, todayISODate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Frequency, RecurringRule, ScheduleStatus } from "@/types";

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

/** Approximate occurrences per month for the "monthly equivalent" stat. */
const MONTHLY_FACTOR: Record<Frequency, number> = {
  daily: 30,
  weekly: 4.33,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

const STATUS_BADGE: Record<
  ScheduleStatus,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  active: { label: "Active", variant: "success" },
  paused: { label: "Paused", variant: "warning" },
  stopped: { label: "Stopped", variant: "secondary" },
};

export function RecurringPage() {
  const { rules, isLoading, isError, error, refetch, pause, resume, stop, remove } =
    useRecurringRules();
  const { money } = useSettings();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRule | null>(null);
  const [confirmStop, setConfirmStop] = useState<RecurringRule | null>(null);
  const [confirmDel, setConfirmDel] = useState<RecurringRule | null>(null);

  const today = todayISODate();
  const horizon = format(addYears(new Date(), 1), "yyyy-MM-dd");

  const activeRules = rules.filter((r) => r.status === "active");
  const pausedCount = rules.filter((r) => r.status === "paused").length;
  const monthlyEquivalent = activeRules.reduce(
    (acc, r) => acc + r.amount * MONTHLY_FACTOR[r.frequency],
    0,
  );

  const nextOccurrence = (rule: RecurringRule): string | null =>
    occurrencesBetween(rule.startDate, rule.frequency, today, horizon, rule.endDate)[0] ??
    null;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handlePause = async (rule: RecurringRule) => {
    try {
      await pause.mutateAsync(rule.id);
      toast.success("Rule paused");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to pause rule");
    }
  };

  const handleResume = async (rule: RecurringRule) => {
    try {
      await resume.mutateAsync(rule.id);
      toast.success("Rule resumed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to resume rule");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring"
        description="Subscriptions, rent, bills — added to your transactions automatically."
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add rule
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Active rules"
          value={String(activeRules.length)}
          icon={Repeat}
          accent="success"
        />
        <StatCard label="Paused rules" value={String(pausedCount)} icon={Pause} />
        <StatCard
          label="Monthly equivalent"
          value={money(monthlyEquivalent)}
          icon={CalendarClock}
          hint="approximate"
        />
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        isEmpty={rules.length === 0}
        emptyIcon={<Repeat className="h-10 w-10 text-muted-foreground" />}
        emptyTitle="No recurring rules"
        emptyMessage="Automate rent, subscriptions and salary — add your first rule."
        emptyAction={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add rule
          </Button>
        }
      >
        <div className="space-y-3">
          {rules.map((rule) => {
            const next = rule.status !== "stopped" ? nextOccurrence(rule) : null;
            const status = STATUS_BADGE[rule.status];
            return (
              <Card key={rule.id} className={cn(rule.status === "stopped" && "opacity-60")}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{rule.name}</p>
                      <Badge variant={rule.type === "income" ? "success" : "secondary"}>
                        {rule.type === "income" ? "Income" : "Expense"}
                      </Badge>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold tabular-nums text-foreground">
                        {money(rule.amount)}
                      </span>{" "}
                      · {FREQUENCY_LABELS[rule.frequency]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {next ? `Next: ${formatDisplayDate(next)}` : "No upcoming occurrence"}
                      {rule.endDate && ` · Ends ${formatDisplayDate(rule.endDate)}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(rule);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {rule.status === "active" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Pause"
                        disabled={pause.isPending}
                        onClick={() => handlePause(rule)}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    {rule.status === "paused" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Resume"
                        disabled={resume.isPending}
                        onClick={() => handleResume(rule)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {rule.status !== "stopped" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Stop"
                        onClick={() => setConfirmStop(rule)}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      aria-label="Delete"
                      onClick={() => setConfirmDel(rule)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DataState>

      <RecurringForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <ConfirmDialog
        open={!!confirmStop}
        onOpenChange={(o) => !o && setConfirmStop(null)}
        title="Stop this rule?"
        description="The rule stops generating new occurrences permanently. Transactions it already created are kept."
        confirmLabel="Stop rule"
        onConfirm={async () => {
          if (!confirmStop) return;
          try {
            await stop.mutateAsync(confirmStop.id);
            toast.success("Rule stopped");
            setConfirmStop(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to stop rule");
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete this rule?"
        description="The rule is removed permanently. Transactions it already generated are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!confirmDel) return;
          try {
            await remove.mutateAsync(confirmDel.id);
            toast.success("Rule deleted");
            setConfirmDel(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete rule");
          }
        }}
      />
    </div>
  );
}
