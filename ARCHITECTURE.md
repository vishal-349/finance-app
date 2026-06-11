# FinTrack — Architecture

A mobile-first personal finance manager. Single user today, multi-user ready by
construction (every document is namespaced under `users/{uid}`).

## Core design principle: totals are never stored

The original Google-Sheets pain was manually maintaining "Spent Till Now". Here,
**transactions are the only source of truth**. Every total is *derived*:

| Displayed value      | Derived from                                              |
| -------------------- | -------------------------------------------------------- |
| Spent (per category) | `sum(transactions where type=expense, categoryId, month)`|
| Remaining            | `budget.amount − spent`                                  |
| Actual income        | `sum(transactions where type=income, month)`             |
| Emergency fund total | `running sum(emergencyFunds.actual)`                     |
| SIP total invested   | `running sum(sipInvestments.actual)`                     |

No write ever stores a computed total. Adding/editing/deleting a transaction is
the only mutation; React Query re-derives the rest on the next read.

## Tech stack

- **React 18 + Vite + TypeScript** — strict mode, path alias `@/`.
- **Tailwind CSS + shadcn/ui** (Radix primitives) — themable via CSS variables.
- **Firebase Auth** (Google) + **Firestore** (offline persistence enabled).
- **TanStack Query** — server-state cache, optimistic-friendly invalidation.
- **React Router** — protected/public route split.
- **Recharts** — charts. **date-fns** — dates. **zod + react-hook-form** — forms.
- **Vercel** — static hosting (`vercel.json` rewrites all routes to the SPA).

## Firestore schema (all under `users/{uid}/…`)

```
users/{uid}                       profile + settings (currency, locale, theme, FY start)
  categories/{id}                 name, type(expense|income), order, archived, color, icon
  paymentMethods/{id}             name, order, archived
  incomeSources/{id}              name, order, archived
  budgets/{id}                    monthKey, categoryId, amount         ← the PLAN
  transactions/{id}               date, monthKey, amount, type,        ← SOURCE OF TRUTH
                                  categoryId?, incomeSourceId?,
                                  paymentMethodId?, merchant?, note?
  emergencyFunds/{id}             monthKey, planned, actual, note?
  sipInvestments/{id}             monthKey, planned, actual, kind, name, note?
```

`monthKey` is `YYYY-MM` — the universal index for month and year reporting.

### Relationships

- Transactions hold **soft references** (`categoryId`, `paymentMethodId`,
  `incomeSourceId`). Deleting a category is discouraged in favour of **archive**,
  so historical transactions never orphan. Archived items stay resolvable in
  history but disappear from pickers.
- Budgets join to transactions on `(monthKey, categoryId)` to produce the
  planned-vs-actual view.

## Folder structure

```
src/
  lib/         firebase, queryClient, utils, date, format, export
  types/       domain models (single source of truth)
  services/    Firestore access layer — one module per collection
  hooks/       useAuth, useSettings, useMonth, + per-feature data hooks
  context/     Auth / Settings / Month providers
  components/  ui/ (shadcn)  layout/  charts/  shared/
  features/    dashboard, transactions, budgets, categories, income,
               emergency-fund, sip, reports, settings
  pages/       route-level screens
```

## Security & indexes

- `firestore.rules` — a user can only touch documents under their own `uid`.
- `firestore.indexes.json` — composite indexes for the transaction queries
  (`monthKey + date`, `monthKey + categoryId + date`).

## Future-proofing

New modules (loans, net worth, assets, credit cards, tax) drop in as a new
collection under `users/{uid}`, a service module, data hooks, a route, and a nav
entry — no refactor of existing code. The derived-totals pattern and the generic
Firestore service scale to them directly.
