import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  // Log every query failure with full detail (code + message) so Firestore
  // errors are always visible in the console, even when the UI shows a
  // friendly message.
  queryCache: new QueryCache({
    onError: (error, query) => {
      // eslint-disable-next-line no-console
      console.error("[query] failed:", query.queryKey, error);
    },
  }),
  // Any successful mutation may have appended an activity-log entry (added via
  // the Firestore helpers). Refresh the log/"Last updated" everywhere from one
  // place — prefix match invalidates all `["activityLog", uid]` queries.
  mutationCache: new MutationCache({
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["activityLog"] });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Centralised query-key factory keeps cache invalidation consistent. */
export const queryKeys = {
  settings: (uid: string) => ["settings", uid] as const,
  categories: (uid: string) => ["categories", uid] as const,
  paymentMethods: (uid: string) => ["paymentMethods", uid] as const,
  incomeSources: (uid: string) => ["incomeSources", uid] as const,
  budgets: (uid: string, monthKey: string) => ["budgets", uid, monthKey] as const,
  transactionsMonth: (uid: string, monthKey: string) =>
    ["transactions", uid, "month", monthKey] as const,
  /** Every transaction (powers account balances, card outstanding, goal progress). */
  allTransactions: (uid: string) => ["transactions", uid, "all"] as const,
  transactionsYear: (uid: string, year: number) =>
    ["transactions", uid, "year", year] as const,
  transactionsCategory: (uid: string, monthKey: string, categoryId: string) =>
    ["transactions", uid, "category", monthKey, categoryId] as const,
  emergencyFunds: (uid: string) => ["emergencyFunds", uid] as const,
  sip: (uid: string) => ["sip", uid] as const,
  creditCards: (uid: string) => ["creditCards", uid] as const,
  cardCycleTxns: (uid: string, cardId: string, start: string, end: string) =>
    ["transactions", uid, "card", cardId, start, end] as const,
  emis: (uid: string) => ["emis", uid] as const,
  emiTxns: (uid: string, emiId: string) =>
    ["transactions", uid, "emi", emiId] as const,
  recurringRules: (uid: string) => ["recurringRules", uid] as const,
  accounts: (uid: string) => ["accounts", uid] as const,
  savingsGoals: (uid: string) => ["savingsGoals", uid] as const,
  subscriptions: (uid: string) => ["subscriptions", uid] as const,
  activityLog: (uid: string) => ["activityLog", uid] as const,
};
