import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
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
  transactionsYear: (uid: string, year: number) =>
    ["transactions", uid, "year", year] as const,
  transactionsCategory: (uid: string, monthKey: string, categoryId: string) =>
    ["transactions", uid, "category", monthKey, categoryId] as const,
  emergencyFunds: (uid: string) => ["emergencyFunds", uid] as const,
  sip: (uid: string) => ["sip", uid] as const,
};
