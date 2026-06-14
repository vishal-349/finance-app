import type { Timestamp } from "firebase/firestore";

/**
 * Domain models for the finance app.
 *
 * Design rule: we NEVER persist computed totals (spent, remaining, running
 * total, total invested). Those are always derived from `Transaction`,
 * `EmergencyFund` and `SipInvestment` documents at read time. Only the raw
 * source records and the *plans* (budgets) are stored.
 *
 * All collections live under `users/{uid}/...` so every user's data is isolated.
 */

/** `YYYY-MM`, e.g. "2026-06". Primary index for month/year reporting. */
export type MonthKey = string;

/**
 * Money-movement type. `expense`/`income` are the originals and the ONLY two
 * counted toward spending/earning totals. The rest are explicitly excluded from
 * income/expense everywhere (they move money between the user's own buckets):
 * - `transfer`    — account → account.
 * - `cc_payment`  — account → credit card (a bill payment, NOT a new expense).
 * - `goal`        — account → savings goal (a contribution, NOT an expense).
 */
export type TransactionType =
  | "expense"
  | "income"
  | "transfer"
  | "cc_payment"
  | "goal";
export type CategoryType = "expense" | "income";
/** A funding source that holds cash: a bank account or a physical/virtual wallet. */
export type AccountType = "bank" | "cash";
export type SubscriptionFrequency = "monthly" | "yearly";
export type GoalStatus = "active" | "achieved" | "archived";
export type SubscriptionStatus = "active" | "paused" | "cancelled";
export type SipKind = "mutual_fund" | "stock" | "custom";
export type ThemePreference = "light" | "dark" | "system";
export type AccentColor = "green" | "blue" | "purple" | "orange";
export type Density = "comfortable" | "compact";
export type PaymentMethodKind = "cash" | "upi" | "bank" | "credit_card" | "other";
export type EmiType =
  | "credit_card"
  | "personal_loan"
  | "car_loan"
  | "home_loan"
  | "custom";
export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
/** Lifecycle of anything the recurring engine generates from. */
export type ScheduleStatus = "active" | "paused" | "stopped";

/** Base fields every Firestore document carries. */
export interface BaseDoc {
  id: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Category extends BaseDoc {
  name: string;
  type: CategoryType;
  /** Manual sort order (lower = first). */
  order: number;
  archived: boolean;
  color?: string;
  icon?: string;
  /**
   * Whether to show the "safe daily spend" pacing for this category (days left
   * in month + remaining ÷ days left). Defaults to true when undefined.
   */
  trackDailyPace?: boolean;
}

export interface PaymentMethod extends BaseDoc {
  name: string;
  order: number;
  archived: boolean;
  /**
   * What kind of instrument this is. Optional for backwards compatibility —
   * when missing, `resolvePaymentMethodKind` falls back to a name heuristic
   * (e.g. "Credit Card" → credit_card) so no data migration is required.
   */
  kind?: PaymentMethodKind;
}

/**
 * A bank account or cash wallet — the primary funding source for transactions.
 * The current balance is NEVER stored: it's derived as
 * `openingBalance + income − expense − transfersOut + transfersIn − billPayments
 *  − goalContributions − sipInvested − emergencyFundSaved`
 * (see `accountBalance` in `derive.ts`). SIP/emergency-fund outflows come from
 * those records' `actual` amounts, attributed to their funding account.
 */
export interface Account extends BaseDoc {
  name: string;
  type: AccountType;
  /** Starting balance the derived balance builds on. */
  openingBalance: number;
  institution?: string;
  last4?: string;
  color?: string;
  order: number;
  archived: boolean;
}

/**
 * A savings goal (Phone, Car, Vacation…). Saved amount is NEVER stored — it's
 * the sum of `goal` contribution transactions tagged with this goal's id.
 */
export interface SavingsGoal extends BaseDoc {
  name: string;
  targetAmount: number;
  /** Optional desired completion date `YYYY-MM-DD`. */
  targetDate?: string;
  color?: string;
  icon?: string;
  status: GoalStatus;
  order: number;
  note?: string;
}

/**
 * A subscription (Netflix, Spotify, ChatGPT…). When `autoRenew` is true and
 * `status` is active, the recurring engine materialises each cycle's charge as
 * an expense transaction tagged with this subscription's id.
 */
export interface Subscription extends BaseDoc {
  name: string;
  /** Brand/service tag for analytics, e.g. "Netflix". */
  service?: string;
  amount: number;
  frequency: SubscriptionFrequency;
  /** First charge date `YYYY-MM-DD`. */
  startDate: string;
  /** Funding source — exactly one of these in practice. */
  accountId?: string;
  creditCardId?: string;
  /** Expense category the generated charge is filed under. */
  categoryId?: string;
  autoRenew: boolean;
  status: SubscriptionStatus;
  note?: string;
  /** Engine bookkeeping: charges generated up to and including this date. */
  lastGeneratedThrough?: string;
}

export interface CreditCard extends BaseDoc {
  name: string; // e.g. card product name
  bankName: string;
  last4: string;
  creditLimit: number;
  /** Day of month (1-31) the statement is generated. Clamped to month length. */
  billingDay: number;
  /** Day of month (1-31) payment is due. */
  dueDay: number;
  color?: string;
  order: number;
  archived: boolean;
}

/** An EMI plan. Installment transactions are generated by the recurring engine. */
export interface Emi extends BaseDoc {
  name: string;
  emiType: EmiType;
  monthlyAmount: number;
  /** Date of the first installment, `YYYY-MM-DD`. */
  startDate: string;
  /** Total number of monthly installments. */
  months: number;
  /** Date of the last installment (start + months - 1), stored for display/query. */
  endDate: string;
  /** Category the generated installment expenses are filed under. */
  categoryId?: string;
  creditCardId?: string;
  /** Bank/cash account the installment is debited from (when not on a card). */
  accountId?: string;
  paymentMethodId?: string;
  note?: string;
  status: ScheduleStatus;
  /** Engine bookkeeping: installments generated up to and including this date. */
  lastGeneratedThrough?: string;
}

/** A recurring transaction rule. The engine materialises occurrences as transactions. */
export interface RecurringRule extends BaseDoc {
  name: string; // e.g. "Rent", streaming subscription
  amount: number;
  type: TransactionType;
  frequency: Frequency;
  startDate: string;
  /** Optional last date — open-ended when missing. */
  endDate?: string;
  categoryId?: string;
  incomeSourceId?: string;
  paymentMethodId?: string;
  creditCardId?: string;
  /** Bank/cash account the occurrence is debited from / credited to. */
  accountId?: string;
  merchant?: string;
  note?: string;
  status: ScheduleStatus;
  /** Engine bookkeeping: occurrences generated up to and including this date. */
  lastGeneratedThrough?: string;
}

export interface IncomeSource extends BaseDoc {
  name: string;
  order: number;
  archived: boolean;
}

/** The monthly *plan* for one expense category. Actuals come from transactions. */
export interface Budget extends BaseDoc {
  monthKey: MonthKey;
  categoryId: string;
  amount: number;
}

/** The single source of truth for actual money movement. */
export interface Transaction extends BaseDoc {
  /** ISO date string `YYYY-MM-DD`. */
  date: string;
  monthKey: MonthKey;
  amount: number;
  type: TransactionType;
  /** Expense → categoryId set. Income → incomeSourceId set. */
  categoryId?: string;
  incomeSourceId?: string;
  /** Optional descriptive "rail" (UPI/NEFT/etc) — superseded by the source below. */
  paymentMethodId?: string;
  /**
   * Funding source. For an `expense`, exactly one of `accountId` | `creditCardId`.
   * For `income`/`transfer`/`cc_payment`/`goal`, `accountId` is the bank/cash
   * account money moves OUT of (or, for income, INTO).
   */
  accountId?: string;
  /** Set when paid by credit card (expense source) or the card being paid (cc_payment). */
  creditCardId?: string;
  /** Destination account for a `transfer`. */
  toAccountId?: string;
  /** Destination goal for a `goal` contribution (also the analytics tag). */
  savingsGoalId?: string;
  /** Set when materialised from a subscription. */
  subscriptionId?: string;
  /** Set when this transaction is an EMI installment. EMI-ness is derived from this. */
  emiId?: string;
  /** Set when materialised from a recurring rule. */
  recurringRuleId?: string;
  /** True for engine-generated transactions. */
  isAutoGenerated?: boolean;
  merchant?: string;
  note?: string;
}

export interface EmergencyFund extends BaseDoc {
  monthKey: MonthKey;
  planned: number;
  actual: number;
  /**
   * Cash account the `actual` deposit is drawn from. Reduces that account's
   * derived balance (money set aside leaves your cash). Legacy entries without
   * one are attributed to the primary account when computing balances.
   */
  accountId?: string;
  note?: string;
}

export interface SipInvestment extends BaseDoc {
  monthKey: MonthKey;
  planned: number;
  actual: number;
  kind: SipKind;
  /** Fund / stock / custom instrument name. */
  name: string;
  /** Cash account the `actual` investment is drawn from (see EmergencyFund). */
  accountId?: string;
  note?: string;
}

export interface UserSettings {
  currency: string; // ISO 4217, e.g. "INR"
  locale: string; // e.g. "en-IN"
  theme: ThemePreference;
  /** 1-12, month the financial year starts (India default = 4 / April). */
  financialYearStartMonth: number;
  /** An expense at or above this amount is classified as a "large expense". */
  largeExpenseThreshold: number;
  accentColor: AccentColor;
  density: Density;
  /** Route to land on after sign-in / app open, e.g. "/" or "/transactions". */
  defaultLandingPage: string;
  /** "full" shows charts + widgets; "compact" shows stat cards + widgets only. */
  dashboardLayout: "full" | "compact";
  displayName?: string;
  email?: string;
}

/* ---- Derived view-models (computed, never stored) ---- */

/** Planned vs actual for one category in a month. */
export interface CategorySummary {
  category: Category;
  planned: number;
  actual: number;
  remaining: number;
  utilization: number; // 0..n (1 = 100%)
  status: "safe" | "warning" | "over";
  transactionCount: number;
  /** Whether daily-pace tracking is on for this category. */
  paceEnabled: boolean;
  /** Days remaining in the month — only for the current month, else null. */
  daysLeft: number | null;
  /** Remaining budget ÷ days left — null when not applicable. */
  safeDailySpend: number | null;
}

/** Derived (never stored) progress of one EMI as of "today". */
export interface EmiProgress {
  emi: Emi;
  paidInstallments: number;
  remainingInstallments: number;
  paidAmount: number;
  remainingAmount: number;
  totalAmount: number;
  /** Next installment date, or null when completed/stopped. */
  nextPaymentDate: string | null;
  isCompleted: boolean;
}

/** Derived split of expenses into EMI vs non-EMI. */
export interface EmiSplit {
  emiTotal: number;
  nonEmiTotal: number;
  total: number;
  emiShare: number; // 0..1
}

/** Derived stats for one credit card's current statement cycle. */
export interface CardCycleStats {
  card: CreditCard;
  cycleStart: string;
  cycleEnd: string;
  cycleSpend: number;
  monthSpend: number;
  utilization: number; // 0..n of creditLimit
  transactionCount: number;
}

/**
 * Reconciling breakdown of total Net Cash across all accounts (never stored).
 * netCash = opening + income + transfersIn − spending − transfersOut
 *           − billPayments − goals − savings.
 * (Across the portfolio transfersIn === transfersOut, so they cancel.)
 */
export interface CashBreakdown {
  /** Sum of account opening balances. */
  opening: number;
  /** Income credited to accounts. */
  income: number;
  transfersIn: number;
  transfersOut: number;
  /** Expenses paid from accounts (card spend is excluded — it's owed, not paid). */
  spending: number;
  /** Credit-card bill payments made from accounts. */
  billPayments: number;
  /** Savings-goal contributions. */
  goals: number;
  /** SIP invested + emergency-fund saved. */
  savings: number;
  /** Resulting total = current Net Cash. */
  netCash: number;
}

/** Derived balance + flows for one account (never stored). */
export interface AccountBalance {
  account: Account;
  balance: number;
  /** Money that has entered this account (income + transfers in). */
  totalIn: number;
  /**
   * Money that has left: expenses + transfers out + bill payments + goal
   * contributions + SIP invested + emergency-fund saved.
   */
  totalOut: number;
  transactionCount: number;
}

/** Derived progress of one savings goal (never stored). */
export interface GoalProgress {
  goal: SavingsGoal;
  saved: number;
  remaining: number;
  /** 0..1 (1 = reached). */
  progress: number;
  isAchieved: boolean;
  /** Avg contribution per month over the contribution window. */
  monthlyRate: number;
  /** Projected completion date `YYYY-MM-DD`, or null when not yet forecastable. */
  forecastDate: string | null;
  /** When `targetDate` is set: whether the run-rate reaches it in time. */
  onTrack: boolean | null;
}

/** Next renewal of one subscription (never stored). */
export interface SubscriptionRenewal {
  subscription: Subscription;
  /** Next charge date `YYYY-MM-DD`, or null when cancelled/ended. */
  nextRenewal: string | null;
  /** This subscription's cost normalised to a month (yearly ÷ 12). */
  monthlyEquivalent: number;
}

/** Derived subscription analytics across all subscriptions (never stored). */
export interface SubscriptionAnalytics {
  /** Monthly recurring spend (monthly subs + yearly ÷ 12). */
  monthlyTotal: number;
  /** Annualised spend. */
  yearlyTotal: number;
  activeCount: number;
  renewals: SubscriptionRenewal[];
}

export interface MonthSummary {
  monthKey: MonthKey;
  income: number;
  plannedExpenses: number;
  actualExpenses: number;
  emergencyFundSaved: number;
  sipInvested: number;
  /** Savings-goal contributions made this month (type `goal`). */
  goalContributed: number;
  /** Money set aside this month = emergency fund + SIP + goal contributions. */
  savedAndInvested: number;
  /** What's left of this month's income after spending AND saving/investing. */
  remainingBalance: number;
  savingsRate: number; // share of income not spent; negative on a deficit
  budgetUtilization: number; // 0..1 (actual / planned)
}
