import {
  format,
  parse,
  startOfMonth,
  addMonths,
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
