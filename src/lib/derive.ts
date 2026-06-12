import type {
  Account,
  AccountBalance,
  Budget,
  Category,
  CategorySummary,
  CreditCard,
  CardCycleStats,
  EmergencyFund,
  Emi,
  EmiProgress,
  EmiSplit,
  GoalProgress,
  MonthKey,
  MonthSummary,
  SavingsGoal,
  SipInvestment,
  Subscription,
  SubscriptionAnalytics,
  SubscriptionRenewal,
  Transaction,
} from "@/types";
import { daysLeftInMonth, occurrenceAt, currentCardCycle } from "@/lib/date";
import {
  addMonths,
  differenceInCalendarMonths,
  format,
  parseISO,
} from "date-fns";

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

/* ---- Account balances (derived — never stored) ---- */

/**
 * Current balance + flows for one account, derived from the FULL transaction
 * set. Balance = opening + money in − money out, where:
 *  in  = income credited here + transfers into here
 *  out = expenses paid from here + transfers out + bill payments + goal contributions
 * (Card expenses don't touch an account — they raise the card's outstanding.)
 */
export function accountBalance(account: Account, txns: Transaction[]): AccountBalance {
  let totalIn = 0;
  let totalOut = 0;
  let transactionCount = 0;
  for (const t of txns) {
    if (t.type === "income" && t.accountId === account.id) {
      totalIn += t.amount;
      transactionCount++;
    } else if (t.type === "transfer" && t.toAccountId === account.id) {
      totalIn += t.amount;
      transactionCount++;
    } else if (
      (t.type === "expense" ||
        t.type === "transfer" ||
        t.type === "cc_payment" ||
        t.type === "goal") &&
      t.accountId === account.id
    ) {
      totalOut += t.amount;
      transactionCount++;
    }
  }
  return {
    account,
    balance: account.openingBalance + totalIn - totalOut,
    totalIn,
    totalOut,
    transactionCount,
  };
}

export function accountBalances(accounts: Account[], txns: Transaction[]): AccountBalance[] {
  return accounts.map((a) => accountBalance(a, txns));
}

/** Total liquid cash across all (non-archived) accounts. */
export function totalLiquidBalance(balances: AccountBalance[]): number {
  return balances.reduce((acc, b) => acc + b.balance, 0);
}

/* ---- Savings goal derivations (derived — never stored) ---- */

export function goalContributions(txns: Transaction[], goalId: string): Transaction[] {
  return txns.filter((t) => t.type === "goal" && t.savingsGoalId === goalId);
}

/**
 * Progress + run-rate forecast for one goal. The forecast projects the average
 * monthly contribution forward to estimate a completion date.
 */
export function goalProgress(
  goal: SavingsGoal,
  txns: Transaction[],
  todayISO: string,
): GoalProgress {
  const contribs = goalContributions(txns, goal.id);
  const saved = contribs.reduce((a, t) => a + t.amount, 0);
  const remaining = Math.max(0, goal.targetAmount - saved);
  const progress =
    goal.targetAmount > 0 ? Math.min(1, saved / goal.targetAmount) : saved > 0 ? 1 : 0;
  const isAchieved = goal.targetAmount > 0 && saved >= goal.targetAmount;

  let monthlyRate = 0;
  let forecastDate: string | null = null;
  let onTrack: boolean | null = null;

  if (contribs.length > 0) {
    const firstDate = contribs.reduce(
      (min, t) => (t.date < min ? t.date : min),
      contribs[0].date,
    );
    const monthsElapsed = Math.max(
      1,
      differenceInCalendarMonths(parseISO(todayISO), parseISO(firstDate)) + 1,
    );
    monthlyRate = saved / monthsElapsed;
  }

  if (isAchieved) {
    onTrack = goal.targetDate ? true : null;
  } else if (monthlyRate > 0) {
    const monthsNeeded = Math.ceil(remaining / monthlyRate);
    forecastDate = format(addMonths(parseISO(todayISO), monthsNeeded), "yyyy-MM-dd");
    if (goal.targetDate) onTrack = forecastDate <= goal.targetDate;
  }

  return {
    goal,
    saved,
    remaining,
    progress,
    isAchieved,
    monthlyRate,
    forecastDate,
    onTrack,
  };
}

/* ---- Subscription derivations (derived — never stored) ---- */

/** This subscription's cost normalised to one month. */
export function subscriptionMonthlyEquivalent(sub: Subscription): number {
  return sub.frequency === "yearly" ? sub.amount / 12 : sub.amount;
}

/** Next charge date on/after today, or null when cancelled. */
export function nextRenewalDate(sub: Subscription, todayISO: string): string | null {
  if (sub.status === "cancelled") return null;
  for (let k = 0; k < 600; k++) {
    const occ = occurrenceAt(sub.startDate, sub.frequency, k);
    if (occ >= todayISO) return occ;
  }
  return null;
}

export function subscriptionAnalytics(
  subs: Subscription[],
  todayISO: string,
): SubscriptionAnalytics {
  const active = subs.filter((s) => s.status === "active");
  const renewals: SubscriptionRenewal[] = subs
    .map((subscription) => ({
      subscription,
      nextRenewal: nextRenewalDate(subscription, todayISO),
      monthlyEquivalent: subscriptionMonthlyEquivalent(subscription),
    }))
    .sort((a, b) => {
      if (!a.nextRenewal) return 1;
      if (!b.nextRenewal) return -1;
      return a.nextRenewal.localeCompare(b.nextRenewal);
    });
  const monthlyTotal = active.reduce(
    (acc, s) => acc + subscriptionMonthlyEquivalent(s),
    0,
  );
  return {
    monthlyTotal,
    yearlyTotal: monthlyTotal * 12,
    activeCount: active.length,
    renewals,
  };
}

/* ---- Credit card derivations ---- */

/** Bill payments recorded against one card, newest first. */
export function cardPayments(txns: Transaction[], cardId: string): Transaction[] {
  return txns
    .filter((t) => t.type === "cc_payment" && t.creditCardId === cardId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Outstanding balance on a card = all charges (expenses, incl. EMI installments)
 * minus all bill payments. Derived from the full transaction set, never stored.
 */
export function cardOutstanding(cardId: string, txns: Transaction[]): number {
  let charges = 0;
  let payments = 0;
  for (const t of txns) {
    if (t.creditCardId !== cardId) continue;
    if (t.type === "expense") charges += t.amount;
    else if (t.type === "cc_payment") payments += t.amount;
  }
  return charges - payments;
}

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
