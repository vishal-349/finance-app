/** Currency / number formatting helpers. Currency + locale come from settings. */

export function formatCurrency(
  amount: number,
  currency = "INR",
  locale = "en-IN",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Compact form for charts/tiles: ₹1.2L, ₹12K. */
export function formatCompact(
  amount: number,
  currency = "INR",
  locale = "en-IN",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function formatPercent(ratio: number, fractionDigits = 1): string {
  if (!isFinite(ratio)) return "0%";
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}

/** Common world currencies for the settings picker. */
export const CURRENCIES: { code: string; label: string; locale: string }[] = [
  { code: "INR", label: "₹ Indian Rupee", locale: "en-IN" },
  { code: "USD", label: "$ US Dollar", locale: "en-US" },
  { code: "EUR", label: "€ Euro", locale: "en-IE" },
  { code: "GBP", label: "£ British Pound", locale: "en-GB" },
  { code: "AED", label: "AED Dirham", locale: "ar-AE" },
  { code: "SGD", label: "$ Singapore Dollar", locale: "en-SG" },
  { code: "AUD", label: "$ Australian Dollar", locale: "en-AU" },
  { code: "CAD", label: "$ Canadian Dollar", locale: "en-CA" },
  { code: "JPY", label: "¥ Japanese Yen", locale: "ja-JP" },
];
