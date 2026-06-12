import type {
  Budget,
  Category,
  CategorySummary,
  CreditCard,
  CardCycleStats,
  EmergencyFund,
  Emi,
  EmiProgress,
  EmiSplit,
  MonthKey,
  MonthSummary,
  SipInvestment,
  Transaction,
} from "@/types";
import { daysLeftInMonth, occurrenceAt, currentCardCycle } from "@/lib/date";

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
  monthKey: MonthKey,
  categories: Category[],
  budgets: Budget[],
  transactions: Transaction[],
): CategorySummary[] {
  const spent = spentByCategory(transactions);
  const counts = countByCategory(transactions);
  const budgetByCat = new Map(budgets.map((b) => [b.categoryId, b.amount]));
  const daysLeft = daysLeftInMonth(monthKey);

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
      const paceEnabled = category.trackDailyPace !== false;
      const safeDailySpend =
        paceEnabled && daysLeft && daysLeft > 0 && remaining > 0
          ? remaining / daysLeft
          : null;
      return {
        category,
        planned,
        actual,
        remaining,
        utilization,
        status: statusFor(utilization),
        transactionCount: counts.get(category.id) ?? 0,
        paceEnabled,
        daysLeft: paceEnabled ? daysLeft : null,
        safeDailySpend,
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
  // Dedupe by category so any accidental duplicate budget docs can't
  // double-count toward the planned total.
  const plannedByCategory = new Map(budgets.map((b) => [b.categoryId, b.amount]));
  const plannedExpenses = [...plannedByCategory.values()].reduce((acc, v) => acc + v, 0);
  // What's left after spending, emergency-fund saving and SIP investing.
  const remainingBalance =
    income - actualExpenses - emergencyFundForMonth - sipForMonth;
  // Savings rate = money not spent on expenses, as a share of income.
  // Allowed to go negative: spending more than you earn is a real deficit and
  // must not be flattened to a misleading 0%.
  const savingsRate = income > 0 ? (income - actualExpenses) / income : 0;
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

/* ---- Large expenses (read-time classification — never stored) ---- */

export const isLargeExpense = (t: Transaction, threshold: number): boolean =>
  t.type === "expense" && threshold > 0 && t.amount >= threshold;

export function filterLargeExpenses(
  transactions: Transaction[],
  threshold: number,
): Transaction[] {
  return transactions.filter((t) => isLargeExpense(t, threshold));
}

export function largeExpenseSummary(
  transactions: Transaction[],
  threshold: number,
): { count: number; total: number } {
  const large = filterLargeExpenses(transactions, threshold);
  return { count: large.length, total: large.reduce((a, t) => a + t.amount, 0) };
}

/* ---- EMI derivations ---- */

export const isEmiTransaction = (t: Transaction): boolean => !!t.emiId;

/** Split expenses into EMI vs non-EMI portions. */
export function splitEmiExpenses(transactions: Transaction[]): EmiSplit {
  let emiTotal = 0;
  let nonEmiTotal = 0;
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (isEmiTransaction(t)) emiTotal += t.amount;
    else nonEmiTotal += t.amount;
  }
  const total = emiTotal + nonEmiTotal;
  return { emiTotal, nonEmiTotal, total, emiShare: total > 0 ? emiTotal / total : 0 };
}

/** Progress of one EMI plan as of `todayISO` — purely date-derived. */
export function emiProgress(emi: Emi, todayISO: string): EmiProgress {
  const totalAmount = emi.monthlyAmount * emi.months;
  let paidInstallments = 0;
  let nextPaymentDate: string | null = null;
  for (let k = 0; k < emi.months; k++) {
    const occ = occurrenceAt(emi.startDate, "monthly", k);
    if (occ <= todayISO) paidInstallments += 1;
    else {
      nextPaymentDate = occ;
      break;
    }
  }
  const isCompleted = emi.status !== "stopped" && paidInstallments >= emi.months;
  if (emi.status === "stopped" || isCompleted) nextPaymentDate = null;
  const remainingInstallments = Math.max(0, emi.months - paidInstallments);
  return {
    emi,
    paidInstallments,
    remainingInstallments,
    paidAmount: paidInstallments * emi.monthlyAmount,
    remainingAmount: remainingInstallments * emi.monthlyAmount,
    totalAmount,
    nextPaymentDate,
    isCompleted,
  };
}

/** Does this EMI have an installment falling inside the given month? */
export function emiActiveInMonth(emi: Emi, monthKey: MonthKey): boolean {
  for (let k = 0; k < emi.months; k++) {
    const occ = occurrenceAt(emi.startDate, "monthly", k);
    const m = occ.slice(0, 7);
    if (m === monthKey) return true;
    if (m > monthKey) return false;
  }
  return false;
}

/** Total EMI outgo scheduled for a month across active (non-stopped) plans. */
export function emiMonthlyBurden(emis: Emi[], monthKey: MonthKey): number {
  return emis
    .filter((e) => e.status !== "stopped" && emiActiveInMonth(e, monthKey))
    .reduce((a, e) => a + e.monthlyAmount, 0);
}

/* ---- Credit card derivations ---- */

/**
 * Current statement-cycle stats for one card from a pool of transactions
 * (the pool must cover the cycle window — the hook supplies it).
 */
export function cardCycleStats(
  card: CreditCard,
  cycleTransactions: Transaction[],
  monthKey: MonthKey,
  todayISO: string,
): CardCycleStats {
  const { start, end } = currentCardCycle(card.billingDay, todayISO);
  const inCycle = cycleTransactions.filter(
    (t) =>
      t.type === "expense" &&
      t.creditCardId === card.id &&
      t.date >= start &&
      t.date <= end,
  );
  const cycleSpend = inCycle.reduce((a, t) => a + t.amount, 0);
  const monthSpend = cycleTransactions
    .filter(
      (t) =>
        t.type === "expense" &&
        t.creditCardId === card.id &&
        t.monthKey === monthKey,
    )
    .reduce((a, t) => a + t.amount, 0);
  return {
    card,
    cycleStart: start,
    cycleEnd: end,
    cycleSpend,
    monthSpend,
    utilization: card.creditLimit > 0 ? cycleSpend / card.creditLimit : 0,
    transactionCount: inCycle.length,
  };
}
