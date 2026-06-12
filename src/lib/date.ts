import {
  format,
  parse,
  startOfMonth,
  endOfMonth,
  addMonths,
  addDays,
  subMonths,
  parseISO,
} from "date-fns";
import type { MonthKey } from "@/types";

/** `YYYY-MM` from a Date. */
export function toMonthKey(date: Date): MonthKey {
  return format(date, "yyyy-MM");
}

/** First day of the month a MonthKey refers to. */
export function monthKeyToDate(key: MonthKey): Date {
  return parse(key, "yyyy-MM", new Date());
}

export function currentMonthKey(): MonthKey {
  return toMonthKey(new Date());
}

/** "June 2026" */
export function formatMonthKey(key: MonthKey): string {
  return format(monthKeyToDate(key), "MMMM yyyy");
}

/** "Jun 2026" */
export function formatMonthKeyShort(key: MonthKey): string {
  return format(monthKeyToDate(key), "MMM yyyy");
}

export function nextMonthKey(key: MonthKey): MonthKey {
  return toMonthKey(addMonths(monthKeyToDate(key), 1));
}

export function prevMonthKey(key: MonthKey): MonthKey {
  return toMonthKey(subMonths(monthKeyToDate(key), 1));
}

export function monthKeyToYear(key: MonthKey): number {
  return monthKeyToDate(key).getFullYear();
}

/** All 12 month keys for a calendar year, Jan..Dec. */
export function monthKeysForYear(year: number): MonthKey[] {
  return Array.from({ length: 12 }, (_, m) =>
    toMonthKey(startOfMonth(new Date(year, m, 1))),
  );
}

/** Today as `YYYY-MM-DD` (for date inputs). */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** "11 Jun 2026" from an ISO date string. */
export function formatDisplayDate(iso: string): string {
  return format(parseISO(iso), "dd MMM yyyy");
}

export function monthKeyFromISODate(iso: string): MonthKey {
  return iso.slice(0, 7);
}

/** Is the given month the one we're currently in (per the system clock)? */
export function isCurrentMonth(key: MonthKey): boolean {
  return key === currentMonthKey();
}

/**
 * Days remaining in the month *including today*, based on the system date.
 * Returns null for any month other than the current one (pacing only makes
 * sense for the month in progress).
 */
export function daysLeftInMonth(key: MonthKey): number | null {
  if (!isCurrentMonth(key)) return null;
  const today = new Date();
  return endOfMonth(today).getDate() - today.getDate() + 1;
}

/* ---- Schedule math (recurring engine, EMIs, card cycles) ---- */

/**
 * The k-th occurrence of a schedule anchored at `startISO`.
 * Month-based frequencies always step from the ORIGINAL start so the intended
 * day-of-month is preserved (Jan 31 → Feb 28 → Mar 31), courtesy of date-fns
 * clamping in `addMonths`.
 */
export function occurrenceAt(
  startISO: string,
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
  k: number,
): string {
  const start = parseISO(startISO);
  switch (frequency) {
    case "daily":
      return format(addDays(start, k), "yyyy-MM-dd");
    case "weekly":
      return format(addDays(start, k * 7), "yyyy-MM-dd");
    case "monthly":
      return format(addMonths(start, k), "yyyy-MM-dd");
    case "quarterly":
      return format(addMonths(start, k * 3), "yyyy-MM-dd");
    case "yearly":
      return format(addMonths(start, k * 12), "yyyy-MM-dd");
  }
}

/** Today as `YYYY-MM-DD` — alias used by schedule code for clarity. */
export const todayISODate = (): string => format(new Date(), "yyyy-MM-dd");

/**
 * A credit card's current statement cycle as of `todayISO`.
 * The cycle runs from the day AFTER the previous statement date through the
 * next statement date (billing days are clamped into short months).
 */
export function currentCardCycle(
  billingDay: number,
  todayISO: string,
): { start: string; end: string } {
  const today = parseISO(todayISO);
  const clamp = (d: Date) =>
    Math.min(Math.max(1, billingDay), endOfMonth(d).getDate());
  const thisMonthStatement = new Date(
    today.getFullYear(),
    today.getMonth(),
    clamp(today),
  );
  // If today is past this month's statement date, the cycle started after it;
  // otherwise the cycle started after LAST month's statement date.
  const prevStatement =
    today.getDate() > thisMonthStatement.getDate()
      ? thisMonthStatement
      : (() => {
          const lastMonth = subMonths(today, 1);
          return new Date(
            lastMonth.getFullYear(),
            lastMonth.getMonth(),
            clamp(lastMonth),
          );
        })();
  const nextStatement = (() => {
    const base = addMonths(prevStatement, 1);
    return new Date(base.getFullYear(), base.getMonth(), clamp(base));
  })();
  return {
    start: format(addDays(prevStatement, 1), "yyyy-MM-dd"),
    end: format(nextStatement, "yyyy-MM-dd"),
  };
}
