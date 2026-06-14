import { useState } from "react";
import { TrendingUp, TrendingDown, PiggyBank, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { StatCard } from "@/components/shared/StatCard";
import { DataState } from "@/components/shared/DataState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpendDonut } from "@/components/charts/SpendDonut";
import { PlannedVsActual } from "@/features/dashboard/PlannedVsActual";
import { ModuleWidgets } from "@/features/dashboard/ModuleWidgets";
import { AccountsOverview } from "@/features/dashboard/AccountsOverview";
import { CategoryHistoryDialog } from "@/features/transactions/CategoryHistoryDialog";
import { useMonth } from "@/hooks/useMonth";
import { useMonthData } from "@/hooks/useMonthData";
import { useSettings } from "@/hooks/useSettings";
import { formatPercent } from "@/lib/format";
import type { CategorySummary } from "@/types";

export function DashboardPage() {
  const { monthKey } = useMonth();
  const { summary, categorySummaries, transactions, isLoading, isError, error, refetch } =
    useMonthData(monthKey);
  const { money, settings } = useSettings();
  const [history, setHistory] = useState<CategorySummary | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your month at a glance — every figure derived from your transactions."
        actions={<MonthPicker />}
      />

      <DataState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        {/* Truthful cash position — leads the page */}
        <AccountsOverview />

        {/* This month's flow: where income went. Each card drills down. */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">This month</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Income"
              value={money(summary.income)}
              icon={TrendingUp}
              accent="success"
              to="/income"
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
            />
            <StatCard
              label="Saved & invested"
              value={money(summary.savedAndInvested)}
              icon={PiggyBank}
              to="/goals"
              hint="Goals + Emergency + SIP"
              accent="success"
            />
            <StatCard
              label="Left this month"
              value={money(summary.remainingBalance)}
              icon={Wallet}
              to="/reports"
              hint={`${formatPercent(summary.savingsRate)} savings rate`}
              accent={summary.remainingBalance < 0 ? "destructive" : "default"}
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
    </div>
  );
}
