import type {
  Budget,
  Category,
  CategorySummary,
  EmergencyFund,
  MonthSummary,
  SipInvestment,
  Transaction,
} from "@/types";

/**
 * All derivation logic lives here. These pure functions turn raw records
 * (transactions, budgets) into the totals shown across the app. Nothing here is
 * ever persisted — call sites recompute on every render/refetch.
 */

export function sumExpenses(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);
}

export function sumIncome(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);
}

/** Total spent per categoryId (expenses only). */
export function spentByCategory(transactions: Transaction[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense" || !t.categoryId) continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }
  return map;
}

export function countByCategory(transactions: Transaction[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (!t.categoryId) continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1);
  }
  return map;
}

function statusFor(utilization: number): CategorySummary["status"] {
  if (utilization > 1) return "over";
  if (utilization >= 0.85) return "warning";
  return "safe";
}

/**
 * Planned-vs-actual rows for the month. Includes every active expense category
 * plus any (possibly archived) category that has either a budget or spend, so
 * history is never hidden.
 */
export function buildCategorySummaries(
  categories: Category[],
  budgets: Budget[],
  transactions: Transaction[],
): CategorySummary[] {
  const spent = spentByCategory(transactions);
  const counts = countByCategory(transactions);
  const budgetByCat = new Map(budgets.map((b) => [b.categoryId, b.amount]));

  const relevant = categories.filter(
    (c) =>
      c.type === "expense" &&
      (!c.archived || budgetByCat.has(c.id) || spent.has(c.id)),
  );

  return relevant
    .map((category) => {
      const planned = budgetByCat.get(category.id) ?? 0;
      const actual = spent.get(category.id) ?? 0;
      const remaining = planned - actual;
      const utilization = planned > 0 ? actual / planned : actual > 0 ? Infinity : 0;
      return {
        category,
        planned,
        actual,
        remaining,
        utilization,
        status: statusFor(utilization),
        transactionCount: counts.get(category.id) ?? 0,
      } satisfies CategorySummary;
    })
    .sort((a, b) => a.category.order - b.category.order);
}

export function buildMonthSummary(
  monthKey: string,
  budgets: Budget[],
  transactions: Transaction[],
  emergencyFundForMonth: number,
  sipForMonth: number,
): MonthSummary {
  const income = sumIncome(transactions);
  const actualExpenses = sumExpenses(transactions);
  const plannedExpenses = budgets.reduce((acc, b) => acc + b.amount, 0);
  // What's left after spending, emergency-fund saving and SIP investing.
  const remainingBalance =
    income - actualExpenses - emergencyFundForMonth - sipForMonth;
  // Savings rate = money not spent on expenses, as a share of income.
  const savingsRate =
    income > 0 ? Math.max(0, (income - actualExpenses) / income) : 0;
  const budgetUtilization = plannedExpenses > 0 ? actualExpenses / plannedExpenses : 0;

  return {
    monthKey,
    income,
    plannedExpenses,
    actualExpenses,
    emergencyFundSaved: emergencyFundForMonth,
    sipInvested: sipForMonth,
    remainingBalance,
    savingsRate,
    budgetUtilization,
  } satisfies MonthSummary;
}

/** Running cumulative total of `actual` over chronologically-sorted entries. */
export function runningTotal<T extends { actual: number }>(
  entries: T[],
): (T & { total: number })[] {
  let acc = 0;
  return entries.map((e) => {
    acc += e.actual;
    return { ...e, total: acc };
  });
}

export function emergencyFundActualForMonth(
  funds: EmergencyFund[],
  monthKey: string,
): number {
  return funds
    .filter((f) => f.monthKey === monthKey)
    .reduce((acc, f) => acc + f.actual, 0);
}

export function sipActualForMonth(
  sips: SipInvestment[],
  monthKey: string,
): number {
  return sips
    .filter((s) => s.monthKey === monthKey)
    .reduce((acc, s) => acc + s.actual, 0);
}
