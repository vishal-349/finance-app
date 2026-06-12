import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Percent,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataState } from "@/components/shared/DataState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TransactionList } from "@/features/transactions/TransactionList";
import { useYearTransactions } from "@/hooks/useTransactions";
import { useCategoryMap } from "@/hooks/useCategories";
import { useSettings } from "@/hooks/useSettings";
import { filterLargeExpenses, largeExpenseSummary, sumExpenses } from "@/lib/derive";
import { currentMonthKey, monthKeysForYear, monthKeyToDate } from "@/lib/date";
import { formatCompact, formatPercent } from "@/lib/format";
import type { Transaction } from "@/types";

export function LargeExpensesPage() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const { settings, money } = useSettings();
  const { data, isLoading, isError, error, refetch } = useYearTransactions(year);
  const categoryMap = useCategoryMap();

  const threshold = settings.largeExpenseThreshold;
  const transactions = useMemo(() => data ?? [], [data]);

  const large = useMemo(
    () => filterLargeExpenses(transactions, threshold),
    [transactions, threshold],
  );

  const yearSummary = useMemo(
    () => largeExpenseSummary(transactions, threshold),
    [transactions, threshold],
  );

  const monthKey = currentMonthKey();
  const thisMonthSummary = useMemo(
    () =>
      largeExpenseSummary(
        transactions.filter((t) => t.monthKey === monthKey),
        threshold,
      ),
    [transactions, monthKey, threshold],
  );

  const allExpenseTotal = useMemo(() => sumExpenses(transactions), [transactions]);
  const share = allExpenseTotal > 0 ? yearSummary.total / allExpenseTotal : 0;

  const monthlyTrend = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of large) {
      totals.set(t.monthKey, (totals.get(t.monthKey) ?? 0) + t.amount);
    }
    return monthKeysForYear(year).map((k) => ({
      label: format(monthKeyToDate(k), "MMM"),
      total: totals.get(k) ?? 0,
    }));
  }, [large, year]);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of large) {
      const key = t.categoryId ?? "uncategorized";
      totals.set(key, (totals.get(key) ?? 0) + t.amount);
    }
    return [...totals.entries()]
      .map(([id, amount]) => ({
        id,
        name: categoryMap.get(id)?.name ?? "Uncategorized",
        color: categoryMap.get(id)?.color,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [large, categoryMap]);
  const maxCategory = byCategory[0]?.amount ?? 0;

  const monthGroups = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const t of large) {
      const list = groups.get(t.monthKey);
      if (list) list.push(t);
      else groups.set(t.monthKey, [t]);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([key, txns]) => ({
        monthKey: key,
        transactions: [...txns].sort((a, b) => (a.date < b.date ? 1 : -1)),
        total: txns.reduce((acc, t) => acc + t.amount, 0),
      }));
  }, [large]);

  const hasThreshold = threshold > 0;
  const isViewingCurrentYear = year === thisYear;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Large Expenses"
        description={
          hasThreshold
            ? `Expenses of ${money(threshold)} or more. Change the threshold in Settings → Preferences.`
            : "No threshold configured — set one in Settings → Preferences to start tracking."
        }
        actions={
          <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Previous year"
              onClick={() => setYear((y) => y - 1)}
            >
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
        }
      />

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        isEmpty={!hasThreshold || large.length === 0}
        emptyIcon={<AlertTriangle className="h-10 w-10 text-muted-foreground" />}
        emptyTitle={hasThreshold ? `No large expenses in ${year}` : "No threshold set"}
        emptyMessage={
          hasThreshold
            ? `Nothing at or above ${money(threshold)} was recorded in ${year}.`
            : "Set a large-expense threshold in Settings → Preferences to classify big spends."
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {isViewingCurrentYear && (
            <StatCard
              label="This Month"
              value={money(thisMonthSummary.total)}
              icon={CalendarDays}
              hint={`${thisMonthSummary.count} large ${
                thisMonthSummary.count === 1 ? "expense" : "expenses"
              }`}
            />
          )}
          <StatCard
            label="This Year"
            value={money(yearSummary.total)}
            icon={CalendarRange}
            hint={`${yearSummary.count} large ${
              yearSummary.count === 1 ? "expense" : "expenses"
            } in ${year}`}
          />
          <StatCard
            label="Share of Spending"
            value={formatPercent(share)}
            icon={Percent}
            hint={`Of all ${year} expenses`}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v) =>
                    formatCompact(Number(v), settings.currency, settings.locale)
                  }
                />
                <Tooltip
                  formatter={(value) => [money(Number(value)), "Large expenses"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="total" name="Large expenses" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By category</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {byCategory.map((c) => (
                <li key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: c.color ?? "#94a3b8" }}
                      />
                      {c.name}
                    </span>
                    <span className="font-medium tabular-nums">{money(c.amount)}</span>
                  </div>
                  <Progress
                    value={maxCategory > 0 ? (c.amount / maxCategory) * 100 : 0}
                    className="h-2"
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">History — month by month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {monthGroups.map((g) => (
              <div key={g.monthKey} className="space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="font-semibold">
                    {format(monthKeyToDate(g.monthKey), "MMMM")}
                  </span>
                  <span className="text-muted-foreground">
                    · {g.transactions.length} ·{" "}
                    <span className="tabular-nums">{money(g.total)}</span>
                  </span>
                </div>
                <TransactionList transactions={g.transactions} />
              </div>
            ))}
          </CardContent>
        </Card>
      </DataState>
    </div>
  );
}
