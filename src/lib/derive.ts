import type {
  Account,
  AccountBalance,
  Budget,
  CashBreakdown,
  Category,
  CategorySummary,
  CreditCard,
  CardCycleStats,
  EmergencyFund,
  Emi,
  EmiInstallment,
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

/**
 * Tracking-start floor: keep only records on/after the user's tracking-start
 * date. Pre-tracking entries (e.g. EMI installments backfilled before the user
 * began tracking) are history/schedule only and must NOT affect cash, balances,
 * or card outstanding. When `startISO` is unset, nothing is filtered (legacy
 * behaviour — count everything). Date strings are ISO (`YYYY-MM-DD`), so a
 * lexical compare is a chronological compare.
 */
export function transactionsSince<T extends { date: string }>(
  records: T[],
  startISO?: string,
): T[] {
  if (!startISO) return records;
  return records.filter((r) => r.date >= startISO);
}

/**
 * Month-keyed sibling of `transactionsSince` for SIP / emergency-fund entries,
 * which are stamped with a `monthKey` (`YYYY-MM`) rather than a full date. The
 * tracking-start month is included.
 */
export function entriesSinceMonth<T extends { monthKey: string }>(
  entries: T[],
  startISO?: string,
): T[] {
  if (!startISO) return entries;
  const startMonth = startISO.slice(0, 7);
  return entries.filter((e) => e.monthKey >= startMonth);
}

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

/** Total of `goal` contribution transactions in the set. */
export function sumGoalContributions(transactions: Transaction[]): number {
  return transactions
    .filter((t) => t.type === "goal")
    .reduce((acc, t) => acc + t.amount, 0);
}

export function buildMonthSummary(
  monthKey: string,
  budgets: Budget[],
  transactions: Transaction[],
  emergencyFundForMonth: number,
  sipForMonth: number,
  goalForMonth: number,
): MonthSummary {
  const income = sumIncome(transactions);
  const actualExpenses = sumExpenses(transactions);
  // Dedupe by category so any accidental duplicate budget docs can't
  // double-count toward the planned total.
  const plannedByCategory = new Map(budgets.map((b) => [b.categoryId, b.amount]));
  const plannedExpenses = [...plannedByCategory.values()].reduce((acc, v) => acc + v, 0);
  // Money deliberately set aside this month — all of it leaves available cash
  // (each draws from an account), so it's treated consistently as an outflow.
  const savedAndInvested = emergencyFundForMonth + sipForMonth + goalForMonth;
  // What's left of this month's income after spending AND saving/investing.
  const remainingBalance = income - actualExpenses - savedAndInvested;
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
    goalContributed: goalForMonth,
    savedAndInvested,
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

/**
 * A category counts as an EMI bucket when its name starts with the word "emi"
 * (case-insensitive) — e.g. "EMI", "EMI TV", "Emi Axis PL", "emi car". The `\b`
 * keeps "Emily"/"emirates" out. Lets users keep one category per loan instead of
 * a single generic "EMI" category.
 */
const EMI_CATEGORY_RE = /^emi\b/i;
export const isEmiCategoryName = (name?: string): boolean =>
  !!name && EMI_CATEGORY_RE.test(name.trim());

/** Ids of every category treated as EMI, from a category list. */
export function emiCategoryIdSet(categories: { id: string; name: string }[]): Set<string> {
  return new Set(categories.filter((c) => isEmiCategoryName(c.name)).map((c) => c.id));
}

/**
 * A transaction is an EMI payment if it was generated by an EMI plan (`emiId`)
 * OR it's filed under an EMI-named category. Pass `emiCategoryIds` (built via
 * `emiCategoryIdSet`) to enable the name-based match; omit it for emiId-only.
 */
export const isEmiTransaction = (
  t: Transaction,
  emiCategoryIds?: Set<string>,
): boolean =>
  !!t.emiId || (!!emiCategoryIds && !!t.categoryId && emiCategoryIds.has(t.categoryId));

/** Split expenses into EMI vs non-EMI portions. */
export function splitEmiExpenses(
  transactions: Transaction[],
  emiCategoryIds?: Set<string>,
): EmiSplit {
  let emiTotal = 0;
  let nonEmiTotal = 0;
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (isEmiTransaction(t, emiCategoryIds)) emiTotal += t.amount;
    else nonEmiTotal += t.amount;
  }
  const total = emiTotal + nonEmiTotal;
  return { emiTotal, nonEmiTotal, total, emiShare: total > 0 ? emiTotal / total : 0 };
}

/** Progress of one EMI plan as of `todayISO` — purely date-derived. */
/** Deterministic transaction id for one EMI installment slot. */
export const emiInstallmentTxnId = (emiId: string, scheduledDate: string): string =>
  `emi-${emiId}-${scheduledDate}`;

/**
 * Every installment slot of an EMI with its recorded status. A slot is `paid`
 * when a transaction exists at its deterministic id, `due` when its scheduled
 * date has passed but no payment is recorded, else `upcoming`. Pay date/amount
 * come from the recorded transaction (may differ from the schedule).
 */
export function emiInstallments(
  emi: Emi,
  todayISO: string,
  emiTxns: Transaction[],
): EmiInstallment[] {
  const byId = new Map(emiTxns.map((t) => [t.id, t]));
  const out: EmiInstallment[] = [];
  for (let k = 0; k < emi.months; k++) {
    const scheduledDate = occurrenceAt(emi.startDate, "monthly", k);
    const txn = byId.get(emiInstallmentTxnId(emi.id, scheduledDate));
    out.push({
      index: k,
      scheduledDate,
      status: txn ? "paid" : scheduledDate <= todayISO ? "due" : "upcoming",
      paidDate: txn?.date,
      paidAmount: txn?.amount,
    });
  }
  return out;
}

/**
 * Progress of one EMI derived from actually-recorded installment payments
 * (`emiTxns` = the EMI's tagged transactions), not the elapsed schedule.
 */
export function emiProgress(
  emi: Emi,
  todayISO: string,
  emiTxns: Transaction[],
): EmiProgress {
  const installments = emiInstallments(emi, todayISO, emiTxns);
  const paid = installments.filter((i) => i.status === "paid");
  const paidInstallments = paid.length;
  const dueInstallments = installments.filter((i) => i.status === "due").length;
  const paidAmount = paid.reduce((a, i) => a + (i.paidAmount ?? 0), 0);
  const remainingInstallments = Math.max(0, emi.months - paidInstallments);
  const isCompleted = emi.status !== "stopped" && paidInstallments >= emi.months;
  const firstUnpaid = installments.find((i) => i.status !== "paid");
  const nextPaymentDate =
    emi.status === "stopped" || isCompleted ? null : (firstUnpaid?.scheduledDate ?? null);
  return {
    emi,
    paidInstallments,
    remainingInstallments,
    dueInstallments,
    paidAmount,
    remainingAmount: remainingInstallments * emi.monthlyAmount,
    totalAmount: emi.monthlyAmount * emi.months,
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
 *  out = expenses paid from here + transfers out + bill payments + goal
 *        contributions + `savingsOut` (SIP + emergency-fund deposits)
 * (Card expenses don't touch an account — they raise the card's outstanding.)
 *
 * `savingsOut` carries SIP/emergency-fund outflows that aren't transactions but
 * still leave this account's cash; the caller supplies the per-account total.
 */
export function accountBalance(
  account: Account,
  txns: Transaction[],
  savingsOut = 0,
): AccountBalance {
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
  totalOut += savingsOut;
  return {
    account,
    balance: account.openingBalance + totalIn - totalOut,
    totalIn,
    totalOut,
    transactionCount,
  };
}

export function accountBalances(
  accounts: Account[],
  txns: Transaction[],
  savingsOutByAccount?: Map<string, number>,
): AccountBalance[] {
  return accounts.map((a) =>
    accountBalance(a, txns, savingsOutByAccount?.get(a.id) ?? 0),
  );
}

/**
 * Map of SIP + emergency-fund outflow per account, summed over ALL entries
 * (these permanently left the account, like a lifetime balance). Entries whose
 * funding account is missing/unknown are attributed to `primaryAccountId` so the
 * total always reconciles, even for legacy records saved before account linking.
 */
export function savingsOutflowByAccount(
  sips: SipInvestment[],
  funds: EmergencyFund[],
  accountIds: Set<string>,
  primaryAccountId: string | undefined,
): Map<string, number> {
  const map = new Map<string, number>();
  const add = (accountId: string | undefined, amount: number) => {
    if (!(amount > 0)) return;
    const id = accountId && accountIds.has(accountId) ? accountId : primaryAccountId;
    if (!id) return;
    map.set(id, (map.get(id) ?? 0) + amount);
  };
  for (const s of sips) add(s.accountId, s.actual);
  for (const f of funds) add(f.accountId, f.actual);
  return map;
}

/** Total liquid cash across all (non-archived) accounts. */
export function totalLiquidBalance(balances: AccountBalance[]): number {
  return balances.reduce((acc, b) => acc + b.balance, 0);
}

/**
 * Reconciling "where did Net Cash come from" breakdown across the given
 * accounts. Each line is bucketed only when its transaction is assigned to one
 * of these accounts, so the result equals the sum of their derived balances.
 * SIP/emergency-fund `actual` always counts (it's attributed to an account when
 * balances are computed). Transfers between these accounts net to zero.
 */
export function portfolioBreakdown(
  accounts: Account[],
  txns: Transaction[],
  sips: SipInvestment[],
  funds: EmergencyFund[],
): CashBreakdown {
  const ids = new Set(accounts.map((a) => a.id));
  let opening = 0;
  for (const a of accounts) opening += a.openingBalance;
  let income = 0;
  let transfersIn = 0;
  let transfersOut = 0;
  let spending = 0;
  let billPayments = 0;
  let goals = 0;
  for (const t of txns) {
    const fromHere = t.accountId ? ids.has(t.accountId) : false;
    if (t.type === "income" && fromHere) income += t.amount;
    else if (t.type === "transfer") {
      if (t.toAccountId && ids.has(t.toAccountId)) transfersIn += t.amount;
      if (fromHere) transfersOut += t.amount;
    } else if (t.type === "expense" && fromHere) spending += t.amount;
    else if (t.type === "cc_payment" && fromHere) billPayments += t.amount;
    else if (t.type === "goal" && fromHere) goals += t.amount;
  }
  // SIP/EF reduce cash regardless of which account is named (unattributed
  // entries fall back to the primary account in balance derivation).
  const savings =
    (accounts.length > 0
      ? sips.reduce((a, s) => a + (s.actual || 0), 0) +
        funds.reduce((a, f) => a + (f.actual || 0), 0)
      : 0);
  const netCash =
    opening + income + transfersIn - transfersOut - spending - billPayments - goals - savings;
  return {
    opening,
    income,
    transfersIn,
    transfersOut,
    spending,
    billPayments,
    goals,
    savings,
    netCash,
  };
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
