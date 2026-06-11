import { useState } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  LineChart,
  Banknote,
  Percent,
  Gauge,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { StatCard } from "@/components/shared/StatCard";
import { DataState } from "@/components/shared/DataState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpendDonut } from "@/components/charts/SpendDonut";
import { PlannedVsActual } from "@/features/dashboard/PlannedVsActual";
import { CategoryHistoryDialog } from "@/features/transactions/CategoryHistoryDialog";
import { useMonth } from "@/hooks/useMonth";
import { useMonthData } from "@/hooks/useMonthData";
import { useSettings } from "@/hooks/useSettings";
import { formatPercent } from "@/lib/format";
import type { CategorySummary } from "@/types";

export function DashboardPage() {
  const { monthKey } = useMonth();
  const { summary, categorySummaries, isLoading, isError, refetch } = useMonthData(monthKey);
  const { money } = useSettings();
  const [history, setHistory] = useState<CategorySummary | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your month at a glance — every figure derived from your transactions."
        actions={<MonthPicker />}
      />

      <DataState isLoading={isLoading} isError={isError} onRetry={refetch}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Income" value={money(summary.income)} icon={TrendingUp} accent="success" />
          <StatCard label="Planned Expenses" value={money(summary.plannedExpenses)} icon={Wallet} />
          <StatCard label="Actual Expenses" value={money(summary.actualExpenses)} icon={TrendingDown} />
          <StatCard
            label="Remaining Balance"
            value={money(summary.remainingBalance)}
            icon={Banknote}
            accent={summary.remainingBalance < 0 ? "destructive" : "default"}
          />
          <StatCard label="Emergency Fund" value={money(summary.emergencyFundSaved)} icon={PiggyBank} hint="Saved this month" />
          <StatCard label="SIP Invested" value={money(summary.sipInvested)} icon={LineChart} hint="This month" />
          <StatCard label="Savings Rate" value={formatPercent(summary.savingsRate)} icon={Percent} accent="success" />
          <StatCard
            label="Budget Utilization"
            value={formatPercent(summary.budgetUtilization)}
            icon={Gauge}
            accent={summary.budgetUtilization > 1 ? "destructive" : "default"}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Spending breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <SpendDonut summaries={categorySummaries} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Planned vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              {categorySummaries.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Add expense categories and budgets to see this breakdown.
                </p>
              ) : (
                <PlannedVsActual summaries={categorySummaries} onSelect={setHistory} />
              )}
            </CardContent>
          </Card>
        </div>
      </DataState>

      <CategoryHistoryDialog
        open={!!history}
        onOpenChange={(o) => !o && setHistory(null)}
        monthKey={monthKey}
        categoryId={history?.category.id ?? null}
        categoryName={history?.category.name ?? ""}
      />
    </div>
  );
}
