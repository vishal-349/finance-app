import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DataState } from "@/components/shared/DataState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SplitDonut } from "@/components/charts/SplitDonut";
import { useYearTransactions } from "@/hooks/useTransactions";
import { useEmis } from "@/hooks/useEmis";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useCategoryMap } from "@/hooks/useCategories";
import { useSettings } from "@/hooks/useSettings";
import {
  filterLargeExpenses,
  isEmiTransaction,
  largeExpenseSummary,
  spentByCategory,
  splitEmiExpenses,
} from "@/lib/derive";
import { monthKeysForYear, monthKeyToDate } from "@/lib/date";
import { formatCompact, formatPercent } from "@/lib/format";
import type { MonthKey, Transaction } from "@/types";

const INDIGO = "#6366f1";
const SUCCESS_GREEN = "#22c55e";
const HIGHLIGHT_RED = "#ef4444";

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  fontSize: 12,
};

/* ----------------------------------------------------------------------------
 * Aggregations.
 * Each one is a pure function of (transactions, year[, threshold]) — never of
 * hook state — so a future year-over-year comparison can run the SAME
 * functions over two different years' transaction sets and diff the outputs.
 * Nothing here is ever stored; everything derives from raw records at render.
 * ------------------------------------------------------------------------- */

interface MonthTotal {
  monthKey: MonthKey;
  label: string;
  total: number;
}

/** Total expense per calendar month, Jan..Dec (zero-filled). */
function monthlyExpenseTotals(transactions: Transaction[], year: number): MonthTotal[] {
  const byMonth = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    byMonth.set(t.monthKey, (byMonth.get(t.monthKey) ?? 0) + t.amount);
  }
  return monthKeysForYear(year).map((k) => ({
    monthKey: k,
    label: format(monthKeyToDate(k), "MMM"),
    total: byMonth.get(k) ?? 0,
  }));
}

/** Expense totals per category, ranked highest first. */
function expenseTotalsByCategory(
  transactions: Transaction[],
): { categoryId: string; amount: number }[] {
  return [...spentByCategory(transactions).entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/** EMI vs non-EMI expense totals per calendar month, Jan..Dec (zero-filled). */
function emiSplitByMonth(
  transactions: Transaction[],
  year: number,
): { label: string; emi: number; nonEmi: number }[] {
  const emi = new Map<string, number>();
  const nonEmi = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const target = isEmiTransaction(t) ? emi : nonEmi;
    target.set(t.monthKey, (target.get(t.monthKey) ?? 0) + t.amount);
  }
  return monthKeysForYear(year).map((k) => ({
    label: format(monthKeyToDate(k), "MMM"),
    emi: emi.get(k) ?? 0,
    nonEmi: nonEmi.get(k) ?? 0,
  }));
}

/** Large-expense totals per calendar month (threshold classification). */
function largeExpenseTotalsByMonth(
  transactions: Transaction[],
  year: number,
  threshold: number,
): MonthTotal[] {
  return monthlyExpenseTotals(filterLargeExpenses(transactions, threshold), year);
}

/** Expense totals per credit card, ranked highest first. */
function expenseTotalsByCard(
  transactions: Transaction[],
): { cardId: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.creditCardId) continue;
    map.set(t.creditCardId, (map.get(t.creditCardId) ?? 0) + t.amount);
  }
  return [...map.entries()]
    .map(([cardId, amount]) => ({ cardId, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/* ---- Small presentational pieces ---- */

function HighlightChip({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-muted p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

/** Single-series monthly bar chart; optionally tints the highest bar red. */
function MonthTotalsBars({
  data,
  name,
  highlightMax = false,
}: {
  data: MonthTotal[];
  name: string;
  highlightMax?: boolean;
}) {
  const { settings, money } = useSettings();
  const max = highlightMax ? Math.max(...data.map((d) => d.total), 0) : 0;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v) => formatCompact(Number(v), settings.currency, settings.locale)}
        />
        <Tooltip
          formatter={(value) => [money(Number(value)), name]}
          contentStyle={TOOLTIP_STYLE}
        />
        <Bar dataKey="total" name={name} radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell
              key={d.monthKey}
              fill={highlightMax && max > 0 && d.total === max ? HIGHLIGHT_RED : INDIGO}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Grouped EMI vs non-EMI monthly bars. */
function EmiSplitBars({
  data,
}: {
  data: { label: string; emi: number; nonEmi: number }[];
}) {
  const { settings, money } = useSettings();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v) => formatCompact(Number(v), settings.currency, settings.locale)}
        />
        <Tooltip
          formatter={(value, name) => [money(Number(value)), String(name)]}
          contentStyle={TOOLTIP_STYLE}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="emi" name="EMI" fill={INDIGO} radius={[4, 4, 0, 0]} />
        <Bar dataKey="nonEmi" name="Non-EMI" fill={SUCCESS_GREEN} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---- The tab ---- */

export function InsightsTab() {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);

  const query = useYearTransactions(year);
  const { activeEmis } = useEmis();
  const { all: allCards } = useCreditCards();
  const categoryMap = useCategoryMap();
  const { money, settings } = useSettings();
  const threshold = settings.largeExpenseThreshold;

  const transactions = useMemo(() => query.data ?? [], [query.data]);

  const monthlyTotals = useMemo(
    () => monthlyExpenseTotals(transactions, year),
    [transactions, year],
  );
  const categoryTotals = useMemo(
    () => expenseTotalsByCategory(transactions),
    [transactions],
  );
  const split = useMemo(() => splitEmiExpenses(transactions), [transactions]);
  const emiMonthly = useMemo(
    () => emiSplitByMonth(transactions, year),
    [transactions, year],
  );
  const largeSummary = useMemo(
    () => largeExpenseSummary(transactions, threshold),
    [transactions, threshold],
  );
  const largeMonthly = useMemo(
    () => largeExpenseTotalsByMonth(transactions, year, threshold),
    [transactions, year, threshold],
  );
  const cardTotals = useMemo(() => expenseTotalsByCard(transactions), [transactions]);

  const highestMonth = useMemo(() => {
    const spent = monthlyTotals.filter((m) => m.total > 0);
    return spent.length ? spent.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  }, [monthlyTotals]);
  const lowestMonth = useMemo(() => {
    const spent = monthlyTotals.filter((m) => m.total > 0);
    return spent.length ? spent.reduce((a, b) => (b.total < a.total ? b : a)) : null;
  }, [monthlyTotals]);

  const topCategory = categoryTotals[0] ?? null;
  const maxCategory = topCategory?.amount ?? 0;
  const maxCard = cardTotals[0]?.amount ?? 0;
  const nonEmiShare = split.total > 0 ? split.nonEmiTotal / split.total : 0;
  const cardById = useMemo(() => new Map(allCards.map((c) => [c.id, c])), [allCards]);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
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
      </div>

      <DataState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={query.refetch}
        isEmpty={transactions.length === 0}
        emptyTitle={`No data for ${year}`}
        emptyMessage="Insights appear once transactions are recorded for this year."
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <HighlightChip
                icon={Trophy}
                label="Most money spent on"
                value={
                  topCategory
                    ? `${categoryMap.get(topCategory.categoryId)?.name ?? "Uncategorized"} (${money(topCategory.amount)})`
                    : "No expenses yet"
                }
              />
              <HighlightChip
                icon={TrendingUp}
                label="Highest spending month"
                value={
                  highestMonth
                    ? `${format(monthKeyToDate(highestMonth.monthKey), "MMMM")} (${money(highestMonth.total)})`
                    : "No expenses yet"
                }
              />
              <HighlightChip
                icon={TrendingDown}
                label="Lowest spending month"
                value={
                  lowestMonth
                    ? format(monthKeyToDate(lowestMonth.monthKey), "MMMM")
                    : "No expenses yet"
                }
              />
              <HighlightChip
                icon={AlertTriangle}
                label="Large expenses"
                value={
                  threshold > 0
                    ? `${largeSummary.count} totalling ${money(largeSummary.total)}`
                    : "No threshold set"
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top spending categories</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryTotals.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No expenses recorded for {year}.
              </p>
            ) : (
              <ul className="space-y-3">
                {categoryTotals.map((c, i) => {
                  const category = categoryMap.get(c.categoryId);
                  return (
                    <li key={c.categoryId} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                            {i + 1}
                          </span>
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: category?.color ?? "#94a3b8" }}
                          />
                          <span className="truncate">{category?.name ?? "Uncategorized"}</span>
                        </span>
                        <span className="font-medium tabular-nums">{money(c.amount)}</span>
                      </div>
                      <Progress
                        value={maxCategory > 0 ? (c.amount / maxCategory) * 100 : 0}
                        className="h-2"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly spending trend</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthTotalsBars data={monthlyTotals} name="Spend" highlightMax />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">EMI vs Non-EMI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <SplitDonut
                slices={[
                  { name: "EMI", value: split.emiTotal, color: INDIGO },
                  { name: "Non-EMI", value: split.nonEmiTotal, color: SUCCESS_GREEN },
                ]}
                centerLabel={split.total > 0 ? `${formatPercent(split.emiShare)} EMI` : undefined}
              />
              <div className="flex flex-col justify-center gap-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: INDIGO }}
                    />
                    EMI
                  </span>
                  <span className="font-medium tabular-nums">
                    {money(split.emiTotal)} · {formatPercent(split.emiShare)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: SUCCESS_GREEN }}
                    />
                    Non-EMI
                  </span>
                  <span className="font-medium tabular-nums">
                    {money(split.nonEmiTotal)} · {formatPercent(nonEmiShare)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeEmis.length} active EMI plan{activeEmis.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <EmiSplitBars data={emiMonthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Large expense trend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {threshold > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold tabular-nums text-foreground">
                    {largeSummary.count}
                  </span>{" "}
                  large {largeSummary.count === 1 ? "expense" : "expenses"} totalling{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {money(largeSummary.total)}
                  </span>{" "}
                  · threshold {money(threshold)}
                </p>
                <MonthTotalsBars data={largeMonthly} name="Large expenses" />
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Set a large-expense threshold in Settings to see this analysis.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credit card analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {cardTotals.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No credit card spending recorded for {year}.
              </p>
            ) : (
              <ul className="space-y-3">
                {cardTotals.map((c, i) => {
                  const card = cardById.get(c.cardId);
                  return (
                    <li key={c.cardId} className="space-y-1">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="w-5 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                            {i + 1}
                          </span>
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: card?.color ?? "#94a3b8" }}
                          />
                          <span className="truncate">
                            {card ? `${card.name} •••• ${card.last4}` : "Unknown card"}
                          </span>
                        </span>
                        <span className="font-medium tabular-nums">{money(c.amount)}</span>
                      </div>
                      <Progress
                        value={maxCard > 0 ? (c.amount / maxCard) * 100 : 0}
                        className="h-2"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </DataState>
    </div>
  );
}
