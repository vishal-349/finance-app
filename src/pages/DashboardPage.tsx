import { useState } from "react";
import { TrendingDown, PiggyBank, Wallet, Banknote, History } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { StatCard } from "@/components/shared/StatCard";
import { DataState } from "@/components/shared/DataState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpendDonut } from "@/components/charts/SpendDonut";
import { PlannedVsActual } from "@/features/dashboard/PlannedVsActual";
import { ModuleWidgets } from "@/features/dashboard/ModuleWidgets";
import { AccountsOverview } from "@/features/dashboard/AccountsOverview";
import { AvailableAfterSettlement } from "@/features/dashboard/AvailableAfterSettlement";
import { ActivityHistoryDialog } from "@/features/dashboard/ActivityHistoryDialog";
import { IncomeAmount, IncomeEyeToggle } from "@/components/shared/IncomeAmount";
import { CategoryHistoryDialog } from "@/features/transactions/CategoryHistoryDialog";
import { useMonth } from "@/hooks/useMonth";
import { useMonthData } from "@/hooks/useMonthData";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useSettings } from "@/hooks/useSettings";
import { formatPercent } from "@/lib/format";
import { formatTimestamp } from "@/lib/date";
import type { CategorySummary } from "@/types";

export function DashboardPage() {
  const { monthKey } = useMonth();
  const { summary, categorySummaries, transactions, isLoading, isError, error, refetch } =
    useMonthData(monthKey);
  const { money, settings } = useSettings();
  const { lastUpdatedAt } = useActivityLog(50);
  const [history, setHistory] = useState<CategorySummary | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your month at a glance — every figure derived from your transactions."
        actions={<MonthPicker />}
      />

      {lastUpdatedAt && (
        <button
          type="button"
          onClick={() => setActivityOpen(true)}
          className="-mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <History className="h-3.5 w-3.5" />
          Last updated: <span className="tabular-nums">{formatTimestamp(lastUpdatedAt)}</span>
        </button>
      )}

      <DataState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        {/* Truthful cash position — leads the page, with the post-settlement
            figure sitting right beside it. */}
        <div className="grid items-stretch gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AccountsOverview />
          </div>
          <AvailableAfterSettlement />
        </div>

        {/* This month's flow: where income went. Each card drills down. */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">This month</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard
              label="Income"
              value={<IncomeAmount value={summary.income} />}
              accent="success"
              to="/income"
              dense
              action={<IncomeEyeToggle />}
            />
            <StatCard
              label="Spending"
              value={money(summary.actualExpenses)}
              icon={TrendingDown}
              to="/transactions"
              hint={
                summary.plannedExpenses > 0
                  ? `${formatPercent(summary.budgetUtilization)} of budget`
                  : "No budget set"
              }
              accent={summary.budgetUtilization > 1 ? "destructive" : "default"}
              dense
            />
            <StatCard
              label="Saved & invested"
              value={money(summary.savedAndInvested)}
              icon={PiggyBank}
              to="/goals"
              hint="Goals + Emergency + SIP"
              accent="success"
              dense
            />
            <StatCard
              label="Total Outflow"
              value={money(summary.actualExpenses + summary.savedAndInvested)}
              icon={Banknote}
              to="/transactions"
              hint="Spending + Saved & invested"
              dense
            />
            <StatCard
              label="Left this month"
              value={money(summary.remainingBalance)}
              icon={Wallet}
              to="/reports"
              hint={`${formatPercent(summary.savingsRate)} savings rate`}
              accent={summary.remainingBalance < 0 ? "destructive" : "default"}
              dense
            />
          </div>
        </section>

        {/* Commitments & detail modules — each deep-links to its page/record */}
        <ModuleWidgets monthKey={monthKey} transactions={transactions} />

        {settings.dashboardLayout === "full" && (
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
        )}
      </DataState>

      <CategoryHistoryDialog
        open={!!history}
        onOpenChange={(o) => !o && setHistory(null)}
        monthKey={monthKey}
        categoryId={history?.category.id ?? null}
        categoryName={history?.category.name ?? ""}
      />

      <ActivityHistoryDialog open={activityOpen} onOpenChange={setActivityOpen} />
    </div>
  );
}
