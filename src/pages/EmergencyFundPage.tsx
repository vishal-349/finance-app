import { useMemo, useState } from "react";
import { Plus, PiggyBank, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataState } from "@/components/shared/DataState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GrowthAreaChart } from "@/components/charts/GrowthAreaChart";
import { EmergencyFundForm } from "@/features/emergency-fund/EmergencyFundForm";
import { useEmergencyFunds } from "@/hooks/useEmergencyFunds";
import { useSettings } from "@/hooks/useSettings";
import { runningTotal } from "@/lib/derive";
import { formatMonthKeyShort } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { EmergencyFund } from "@/types";

export function EmergencyFundPage() {
  const { entries, isLoading, isError, refetch, remove } = useEmergencyFunds();
  const { money } = useSettings();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmergencyFund | null>(null);
  const [confirmDel, setConfirmDel] = useState<EmergencyFund | null>(null);

  const withTotals = useMemo(() => runningTotal(entries), [entries]);
  const chartData = useMemo(
    () => withTotals.map((e) => ({ label: formatMonthKeyShort(e.monthKey), total: e.total })),
    [withTotals],
  );

  const totalFund = withTotals.length ? withTotals[withTotals.length - 1].total : 0;
  const totalPlanned = entries.reduce((a, e) => a + e.planned, 0);
  const planProgress = totalPlanned > 0 ? totalFund / totalPlanned : 0;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency Fund"
        description="Track your monthly saving and watch the fund grow."
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add entry
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total Fund" value={money(totalFund)} icon={PiggyBank} accent="success" />
        <StatCard label="Total Planned" value={money(totalPlanned)} />
        <StatCard
          label="Plan Progress"
          value={`${Math.round(planProgress * 100)}%`}
          hint="Saved vs planned"
        />
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        isEmpty={entries.length === 0}
        emptyIcon={<PiggyBank className="h-10 w-10 text-muted-foreground" />}
        emptyTitle="No savings recorded"
        emptyMessage="Add your first monthly emergency-fund saving."
        emptyAction={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add entry
          </Button>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fund growth</CardTitle>
          </CardHeader>
          <CardContent>
            <GrowthAreaChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Running Total</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...withTotals].reverse().map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      {formatMonthKeyShort(e.monthKey)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(e.planned)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        e.actual >= e.planned ? "text-success" : "text-warning",
                      )}
                    >
                      {money(e.actual)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {money(e.total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="Edit"
                          onClick={() => {
                            setEditing(e);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          aria-label="Delete"
                          onClick={() => setConfirmDel(e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DataState>

      <EmergencyFundForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete entry?"
        description="This removes the saving record for that month."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (confirmDel) {
            await remove.mutateAsync(confirmDel.id);
            toast.success("Entry deleted");
            setConfirmDel(null);
          }
        }}
      />
    </div>
  );
}
