import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Banknote,
  PiggyBank,
  LineChart,
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { IncomeAmount, IncomeEyeToggle } from "@/components/shared/IncomeAmount";
import { DataState } from "@/components/shared/DataState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { IncomeExpenseBar } from "@/components/charts/IncomeExpenseBar";
import { useYearData } from "@/hooks/useYearData";
import { useSettings } from "@/hooks/useSettings";

export function YearlyReport() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { monthly, totals, categoryBreakdown, isLoading, isError, error, refetch } =
    useYearData(year);
  const { money } = useSettings();

  const maxCategory = categoryBreakdown[0]?.amount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Previous year" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[3.5rem] text-center text-sm font-semibold">{year}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Next year"
            disabled={year >= thisYear}
            onClick={() => setYear((y) => Math.min(thisYear, y + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DataState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard
            label="Total Income"
            value={<IncomeAmount value={totals.totalIncome} />}
            accent="success"
            action={<IncomeEyeToggle />}
          />
          <StatCard label="Total Expenses" value={money(totals.totalExpenses)} icon={TrendingDown} />
          <StatCard
            label="Total Savings"
            value={money(totals.totalSavings)}
            icon={Banknote}
            accent={totals.totalSavings < 0 ? "destructive" : "success"}
          />
          <StatCard label="Emergency Fund" value={money(totals.emergencyFundYear)} icon={PiggyBank} hint="Saved this year" />
          <StatCard label="SIP Invested" value={money(totals.sipYear)} icon={LineChart} hint="This year" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Income vs Expense by month</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeExpenseBar data={monthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No expenses recorded for {year}.
              </p>
            ) : (
              <ul className="space-y-3">
                {categoryBreakdown.map((c) => (
                  <li key={c.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color ?? "#94a3b8" }} />
                        {c.name}
                      </span>
                      <span className="font-medium tabular-nums">{money(c.amount)}</span>
                    </div>
                    <Progress value={maxCategory > 0 ? (c.amount / maxCategory) * 100 : 0} className="h-2" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </DataState>
    </div>
  );
}
