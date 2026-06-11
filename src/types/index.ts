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

export type TransactionType = "expense" | "income";
export type CategoryType = "expense" | "income";
export type SipKind = "mutual_fund" | "stock" | "custom";
export type ThemePreference = "light" | "dark" | "system";

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
}

export interface PaymentMethod extends BaseDoc {
  name: string;
  order: number;
  archived: boolean;
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
  paymentMethodId?: string;
  merchant?: string;
  note?: string;
}

export interface EmergencyFund extends BaseDoc {
  monthKey: MonthKey;
  planned: number;
  actual: number;
  note?: string;
}

export interface SipInvestment extends BaseDoc {
  monthKey: MonthKey;
  planned: number;
  actual: number;
  kind: SipKind;
  /** Fund / stock / custom instrument name. */
  name: string;
  note?: string;
}

export interface UserSettings {
  currency: string; // ISO 4217, e.g. "INR"
  locale: string; // e.g. "en-IN"
  theme: ThemePreference;
  /** 1-12, month the financial year starts (India default = 4 / April). */
  financialYearStartMonth: number;
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
}

export interface MonthSummary {
  monthKey: MonthKey;
  income: number;
  plannedExpenses: number;
  actualExpenses: number;
  emergencyFundSaved: number;
  sipInvested: number;
  remainingBalance: number;
  savingsRate: number; // share of income not spent; negative on a deficit
  budgetUtilization: number; // 0..1 (actual / planned)
}
