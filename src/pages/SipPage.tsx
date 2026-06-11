import { useMemo, useState } from "react";
import { Plus, LineChart, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataState } from "@/components/shared/DataState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { SipForm } from "@/features/sip/SipForm";
import { useSip } from "@/hooks/useSip";
import { useSettings } from "@/hooks/useSettings";
import { formatMonthKeyShort } from "@/lib/date";
import type { SipInvestment, SipKind } from "@/types";

const KIND_LABEL: Record<SipKind, string> = {
  mutual_fund: "Mutual Fund",
  stock: "Stock",
  custom: "Custom",
};

export function SipPage() {
  const { entries, isLoading, isError, error, refetch, remove } = useSip();
  const { money } = useSettings();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SipInvestment | null>(null);
  const [confirmDel, setConfirmDel] = useState<SipInvestment | null>(null);

  const totalInvested = entries.reduce((a, e) => a + e.actual, 0);
  const totalPlanned = entries.reduce((a, e) => a + e.planned, 0);

  // Aggregate actual investment per month, then build a running total series.
  const chartData = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const e of entries) {
      byMonth.set(e.monthKey, (byMonth.get(e.monthKey) ?? 0) + e.actual);
    }
    const sorted = [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b));
    let acc = 0;
    return sorted.map(([monthKey, amount]) => {
      acc += amount;
      return { label: formatMonthKeyShort(monthKey), total: acc };
    });
  }, [entries]);

  const rows = useMemo(
    () => [...entries].sort((a, b) => b.monthKey.localeCompare(a.monthKey)),
    [entries],
  );

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SIP & Investments"
        description="Mutual funds, stocks and custom investments — track planned vs actual."
        actions={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add investment
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total Invested" value={money(totalInvested)} icon={LineChart} accent="success" />
        <StatCard label="Total Planned" value={money(totalPlanned)} />
        <StatCard label="Instruments" value={String(entries.length)} hint="Entries tracked" />
      </div>

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        isEmpty={entries.length === 0}
        emptyIcon={<LineChart className="h-10 w-10 text-muted-foreground" />}
        emptyTitle="No investments yet"
        emptyMessage="Add your first SIP, stock or custom investment."
        emptyAction={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add investment
          </Button>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Investment growth</CardTitle>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Planned</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{formatMonthKeyShort(e.monthKey)}</TableCell>
                    <TableCell className="max-w-[10rem] truncate">{e.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{KIND_LABEL[e.kind]}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(e.planned)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {money(e.actual)}
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

      <SipForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Delete investment?"
        description="This removes the investment record permanently."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (confirmDel) {
            await remove.mutateAsync(confirmDel.id);
            toast.success("Investment deleted");
            setConfirmDel(null);
          }
        }}
      />
    </div>
  );
}
