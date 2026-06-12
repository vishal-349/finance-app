/**
 * A transaction's funding source is either a bank/cash account or a credit card.
 * In `<Select>` controls we encode it as a single prefixed string so accounts
 * and cards can share one dropdown: "acct:<id>" or "card:<id>".
 */

export function encodeSource(accountId?: string, creditCardId?: string): string {
  if (creditCardId) return `card:${creditCardId}`;
  if (accountId) return `acct:${accountId}`;
  return "";
}

export function decodeSource(sourceId?: string): {
  accountId?: string;
  creditCardId?: string;
} {
  if (sourceId?.startsWith("acct:")) return { accountId: sourceId.slice(5) };
  if (sourceId?.startsWith("card:")) return { creditCardId: sourceId.slice(5) };
  return {};
}

export const isCardSource = (sourceId?: string): boolean =>
  sourceId?.startsWith("card:") ?? false;
