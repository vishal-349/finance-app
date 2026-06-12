import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Pencil,
  Plus,
  Target,
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
import { Progress } from "@/components/ui/progress";
import { GoalForm } from "@/features/goals/GoalForm";
import { GoalContributeDialog } from "@/features/goals/GoalContributeDialog";
import { useGoalsProgress, useSavingsGoals } from "@/hooks/useSavingsGoals";
import { useSettings } from "@/hooks/useSettings";
import { formatPercent } from "@/lib/format";
import { formatDisplayDate } from "@/lib/date";
import type { GoalProgress, SavingsGoal } from "@/types";

export function GoalsPage() {
  const { archive, reactivate, remove } = useSavingsGoals();
  const { progress, isLoading, isError, error } = useGoalsProgress();
  const { money } = useSettings();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [contributeFor, setContributeFor] = useState<SavingsGoal | null>(null);
  const [confirmDel, setConfirmDel] = useState<SavingsGoal | null>(null);

  const active = useMemo(
    () => progress.filter((p) => p.goal.status === "active"),
    [progress],
  );
  const inactive = useMemo(
    () => progress.filter((p) => p.goal.status !== "active"),
    [progress],
  );

  const summary = useMemo(() => {
    const saved = active.reduce((a, p) => a + p.saved, 0);
    const target = active.reduce((a, p) => a + p.goal.targetAmount, 0);
    return { saved, target, count: active.length };
  }, [active]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const forecastLabel = (p: GoalProgress): { text: string; tone: string } => {
    if (p.isAchieved) return { text: "Achieved 🎉", tone: "text-success" };
    if (p.goal.targetDate && p.onTrack === false)
      return { text: `Behind · est. ${forecastText(p)}`, tone: "text-destructive" };
    if (p.onTrack === true) return { text: `On track · ${forecastText(p)}`, tone: "text-success" };
    if (p.forecastDate)
      return { text: `Est. ${formatDisplayDate(p.forecastDate)}`, tone: "text-muted-foreground" };
    return { text: "Add a contribution to forecast", tone: "text-muted-foreground" };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings Goals"
        description="Set targets and track progress. Saved amounts are derived from your contributions."
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> New goal
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total Saved" value={money(summary.saved)} icon={Target} accent="success" />
        <StatCard label="Total Target" value={money(summary.target)} />
        <StatCard label="Active Goals" value={String(summary.count)} icon={CheckCircle2} />
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={progress.length === 0}
        emptyIcon={<Target className="h-10 w-10 text-muted-foreground" />}
        emptyTitle="No savings goals yet"
        emptyMessage="Create a goal like Phone, Car or Vacation and start contributing."
        emptyAction={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> New goal
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {active.map((p) => {
            const f = forecastLabel(p);
            return (
              <Card key={p.goal.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: p.goal.color ?? "#16a34a" }}
                      />
                      <p className="font-semibold">{p.goal.name}</p>
                    </div>
                    {p.goal.targetDate && (
                      <Badge variant="outline">by {formatDisplayDate(p.goal.targetDate)}</Badge>
                    )}
                  </div>

                  <Progress value={p.progress * 100} />

                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium tabular-nums">
                      {money(p.saved)}{" "}
                      <span className="text-muted-foreground">
                        / {money(p.goal.targetAmount)}
                      </span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatPercent(p.progress)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground tabular-nums">
                      {money(p.remaining)} to go
                    </span>
                    <span className={f.tone}>{f.text}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setContributeFor(p.goal)}
                    >
                      <Plus className="h-4 w-4" /> Contribute
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Edit"
                      onClick={() => {
                        setEditing(p.goal);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Archive"
                      onClick={() => archive.mutate(p.goal.id)}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      aria-label="Delete"
                      onClick={() => setConfirmDel(p.goal)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {inactive.length > 0 && (
          <Card>
            <CardContent className="divide-y p-0">
              {inactive.map((p) => (
                <div
                  key={p.goal.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.goal.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {money(p.saved)} saved of {money(p.goal.targetAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={p.isAchieved ? "success" : "secondary"}>
                      {p.isAchieved ? "Achieved" : "Archived"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Reactivate"
                      onClick={() => reactivate.mutate(p.goal.id)}
                    >
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      aria-label="Delete"
                      onClick={() => setConfirmDel(p.goal)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </DataState>

      <GoalForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <GoalContributeDialog
        open={!!contributeFor}
        onOpenChange={(o) => !o && setContributeFor(null)}
        goal={contributeFor}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title={confirmDel ? `Delete ${confirmDel.name}?` : "Delete goal?"}
        description="This removes the goal. Past contribution transactions are kept (they stay tagged but no longer roll up to a goal)."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!confirmDel) return;
          try {
            await remove.mutateAsync(confirmDel.id);
            toast.success("Goal deleted");
            setConfirmDel(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete goal");
          }
        }}
      />
    </div>
  );
}

function forecastText(p: GoalProgress): string {
  return p.forecastDate ? formatDisplayDate(p.forecastDate) : "—";
}
