import { useMemo, useState } from "react";
import { TrendingDown, Banknote, PiggyBank, LineChart, Percent } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { IncomeAmount, IncomeEyeToggle } from "@/components/shared/IncomeAmount";
import { DataState } from "@/components/shared/DataState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpendDonut } from "@/components/charts/SpendDonut";
import { useMonthData } from "@/hooks/useMonthData";
import { useSettings } from "@/hooks/useSettings";
import { formatPercent } from "@/lib/format";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthlyReport() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth(); // 0-11
  const [monthIdx, setMonthIdx] = useState(thisMonth);
  const [year, setYear] = useState(thisYear);

  // Reports are retrospective — never offer a future year or month.
  const years = useMemo(
    () => Array.from({ length: 6 }, (_, i) => thisYear - 5 + i),
    [thisYear],
  );
  const availableMonths = year === thisYear ? MONTHS.slice(0, thisMonth + 1) : MONTHS;

  const handleYearChange = (y: number) => {
    setYear(y);
    if (y === thisYear && monthIdx > thisMonth) setMonthIdx(thisMonth);
  };

  const monthKey = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
  const { summary, categorySummaries, isLoading, isError, error, refetch } =
    useMonthData(monthKey);

  const spentCategories = categorySummaries
    .filter((s) => s.actual > 0)
    .sort((a, b) => b.actual - a.actual);
  const maxActual = spentCategories[0]?.actual ?? 0;
  const { money } = useSettings();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Select value={String(monthIdx)} onValueChange={(v) => setMonthIdx(Number(v))}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableMonths.map((m, i) => (
              <SelectItem key={m} value={String(i)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={(v) => handleYearChange(Number(v))}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatCard
            label="Income"
            value={<IncomeAmount value={summary.income} />}
            accent="success"
            action={<IncomeEyeToggle />}
          />
          <StatCard label="Expenses" value={money(summary.actualExpenses)} icon={TrendingDown} />
          <StatCard
            label="Net Savings"
            value={money(summary.income - summary.actualExpenses)}
            icon={Banknote}
            accent={summary.income - summary.actualExpenses < 0 ? "destructive" : "success"}
          />
          <StatCard label="Emergency Fund" value={money(summary.emergencyFundSaved)} icon={PiggyBank} hint="Saved this month" />
          <StatCard label="SIP Invested" value={money(summary.sipInvested)} icon={LineChart} hint="This month" />
          <StatCard
            label="Savings Rate"
            value={formatPercent(summary.savingsRate)}
            icon={Percent}
            accent={summary.savingsRate < 0 ? "destructive" : "success"}
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
              <CardTitle className="text-base">By category</CardTitle>
            </CardHeader>
            <CardContent>
              {spentCategories.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No spending recorded for this month.
                </p>
              ) : (
                <ul className="space-y-3">
                  {spentCategories.map((s) => (
                    <li key={s.category.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: s.category.color ?? "#94a3b8" }}
                          />
                          {s.category.name}
                        </span>
                        <span className="font-medium tabular-nums">{money(s.actual)}</span>
                      </div>
                      <Progress value={maxActual > 0 ? (s.actual / maxActual) * 100 : 0} className="h-2" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </DataState>
    </div>
  );
}
