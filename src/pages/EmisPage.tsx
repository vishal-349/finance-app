import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  Landmark,
  Pause,
  Pencil,
  Play,
  Plus,
  Square,
  Trash2,
  Wallet,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmiForm, EMI_TYPE_LABELS } from "@/features/emis/EmiForm";
import { EmiCalendar } from "@/features/emis/EmiCalendar";
import { MarkEmiPaidDialog } from "@/features/emis/MarkEmiPaidDialog";
import { useEmis } from "@/hooks/useEmis";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useSettings } from "@/hooks/useSettings";
import { emiMonthlyBurden } from "@/lib/derive";
import { currentMonthKey, formatDisplayDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Emi, EmiInstallment, EmiProgress } from "@/types";

export function EmisPage() {
  const {
    all,
    progress,
    activeEmis,
    completedEmis,
    isLoading,
    isError,
    error,
    refetch,
    pause,
    resume,
    stop,
    remove,
    installmentsFor,
    markAllPastDue,
  } = useEmis();
  const { all: cards } = useCreditCards();
  const { money } = useSettings();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Emi | null>(null);
  const [confirmStop, setConfirmStop] = useState<Emi | null>(null);
  const [confirmDel, setConfirmDel] = useState<Emi | null>(null);
  const [payTarget, setPayTarget] = useState<{ emi: Emi; installment: EmiInstallment } | null>(
    null,
  );

  const recordPayment = (emi: Emi) => {
    const slots = installmentsFor(emi);
    const next = slots.find((i) => i.status !== "paid") ?? slots[slots.length - 1];
    if (next) setPayTarget({ emi, installment: next });
  };

  const catchUp = async (emi: Emi) => {
    try {
      const n = await markAllPastDue.mutateAsync(emi);
      toast.success(`${n} past-due installment${n === 1 ? "" : "s"} marked paid`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mark installments");
    }
  };

  // Deep-link target: dashboard widgets link to /emis?focus=<id>.
  const [params] = useSearchParams();
  const focusId = params.get("focus");
  useEffect(() => {
    if (!focusId || isLoading) return;
    const el = document.getElementById(`emi-${focusId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId, isLoading]);

  const cardMap = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const burden = useMemo(() => emiMonthlyBurden(all, currentMonthKey()), [all]);
  const totalRemaining = useMemo(
    () => activeEmis.reduce((a, p) => a + p.remainingAmount, 0),
    [activeEmis],
  );
  const nextPayment = useMemo(() => {
    let best: EmiProgress | null = null;
    for (const p of activeEmis) {
      if (!p.nextPaymentDate) continue;
      if (!best?.nextPaymentDate || p.nextPaymentDate < best.nextPaymentDate) {
        best = p;
      }
    }
    return best;
  }, [activeEmis]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const togglePause = async (p: EmiProgress) => {
    try {
      if (p.emi.status === "paused") {
        await resume.mutateAsync(p.emi.id);
        toast.success("EMI resumed");
      } else {
        await pause.mutateAsync(p.emi.id);
        toast.success("EMI paused");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update EMI");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="EMIs"
        description="Track installment plans, progress and your monthly burden."
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add EMI
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Monthly EMI Burden" value={money(burden)} icon={Wallet} />
        <StatCard
          label="Active EMIs"
          value={String(activeEmis.length)}
          icon={Landmark}
        />
        <StatCard label="Total Remaining" value={money(totalRemaining)} />
        <StatCard
          label="Next Payment"
          value={
            nextPayment?.nextPaymentDate
              ? formatDisplayDate(nextPayment.nextPaymentDate)
              : "—"
          }
          hint={nextPayment?.emi.name}
          icon={CalendarClock}
        />
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <DataState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={refetch}
            isEmpty={activeEmis.length === 0}
            emptyIcon={<Landmark className="h-10 w-10 text-muted-foreground" />}
            emptyTitle="No active EMIs"
            emptyMessage="Add an EMI plan, then mark each installment paid as you pay it."
            emptyAction={
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add EMI
              </Button>
            }
          >
            <div className="space-y-3">
              {activeEmis.map((p) => {
                const linkedCard = p.emi.creditCardId
                  ? cardMap.get(p.emi.creditCardId)
                  : undefined;
                const isPaused = p.emi.status === "paused";
                return (
                  <Card
                    key={p.emi.id}
                    id={`emi-${p.emi.id}`}
                    className={cn(
                      "scroll-mt-24 transition-shadow",
                      focusId === p.emi.id && "ring-2 ring-primary shadow-glow",
                    )}
                  >
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold">{p.emi.name}</p>
                            <Badge variant="outline">
                              {EMI_TYPE_LABELS[p.emi.emiType]}
                            </Badge>
                            {isPaused && <Badge variant="warning">Paused</Badge>}
                          </div>
                          {linkedCard && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {linkedCard.name} ·· {linkedCard.last4}
                            </p>
                          )}
                        </div>
                        <p className="shrink-0 text-right font-bold tabular-nums">
                          {money(p.emi.monthlyAmount)}
                          <span className="text-xs font-normal text-muted-foreground">
                            /mo
                          </span>
                        </p>
                      </div>

                      <Progress
                        value={(p.paidInstallments / p.emi.months) * 100}
                      />

                      <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span className="flex items-center gap-2 tabular-nums">
                          {p.paidInstallments} of {p.emi.months} installments ·{" "}
                          {money(p.remainingAmount)} remaining
                          {p.dueInstallments > 0 && (
                            <Badge variant="warning">
                              {p.dueInstallments} due
                            </Badge>
                          )}
                        </span>
                        {p.nextPaymentDate && (
                          <span>
                            Next payment {formatDisplayDate(p.nextPaymentDate)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!isPaused && (
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => recordPayment(p.emi)}
                          >
                            <CheckCircle2 className="h-4 w-4" /> Record payment
                          </Button>
                        )}
                        {p.dueInstallments > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            disabled={markAllPastDue.isPending}
                            onClick={() => catchUp(p.emi)}
                          >
                            Mark {p.dueInstallments} past-due paid
                          </Button>
                        )}
                        <div className="ml-auto flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Edit"
                          onClick={() => {
                            setEditing(p.emi);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={isPaused ? "Resume" : "Pause"}
                          disabled={pause.isPending || resume.isPending}
                          onClick={() => togglePause(p)}
                        >
                          {isPaused ? (
                            <Play className="h-4 w-4" />
                          ) : (
                            <Pause className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-warning"
                          aria-label="Stop"
                          onClick={() => setConfirmStop(p.emi)}
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="Delete"
                          onClick={() => setConfirmDel(p.emi)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </DataState>
        </TabsContent>

        <TabsContent value="completed">
          <DataState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={refetch}
            isEmpty={completedEmis.length === 0}
            emptyTitle="No completed EMIs"
            emptyMessage="Finished and stopped EMI plans will show up here."
          >
            <Card>
              <CardContent className="divide-y p-0">
                {completedEmis.map((p) => (
                  <div
                    key={p.emi.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.emi.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {money(p.paidAmount)} paid · {p.paidInstallments} of{" "}
                        {p.emi.months} installments
                      </p>
                    </div>
                    <Badge variant={p.isCompleted ? "success" : "secondary"}>
                      {p.isCompleted ? "Completed" : "Stopped"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </DataState>
        </TabsContent>

        <TabsContent value="calendar">
          <DataState
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={refetch}
            isEmpty={progress.length === 0}
            emptyTitle="No EMIs scheduled"
            emptyMessage="Add an EMI to see its installments on the calendar."
            emptyAction={
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" /> Add EMI
              </Button>
            }
          >
            <EmiCalendar
              progress={progress}
              installmentsFor={installmentsFor}
              onSelectInstallment={(emi, installment) => setPayTarget({ emi, installment })}
            />
          </DataState>
        </TabsContent>
      </Tabs>

      <EmiForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <MarkEmiPaidDialog
        open={!!payTarget}
        onOpenChange={(o) => !o && setPayTarget(null)}
        emi={payTarget?.emi ?? null}
        installment={payTarget?.installment ?? null}
      />

      <ConfirmDialog
        open={!!confirmStop}
        onOpenChange={(o) => !o && setConfirmStop(null)}
        title="Stop this EMI?"
        description="It moves to Completed and no longer expects payments. Recorded installments are kept."
        confirmLabel="Stop EMI"
        onConfirm={async () => {
          if (!confirmStop) return;
          try {
            await stop.mutateAsync(confirmStop.id);
            toast.success("EMI stopped");
            setConfirmStop(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to stop EMI");
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete this EMI?"
        description="This removes the EMI plan. Installment payments you've recorded are kept as transactions."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!confirmDel) return;
          try {
            await remove.mutateAsync(confirmDel.id);
            toast.success("EMI deleted");
            setConfirmDel(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete EMI");
          }
        }}
      />
    </div>
  );
}
