# FinTrack — Personal Finance Manager

Mobile-first personal finance app. Budgets, transactions, income, EMIs,
recurring payments, credit cards, large-expense monitoring, emergency fund and
SIP investments — **all totals derived automatically from transactions**, so
nothing is ever updated by hand.

Highlights: daily spend pacing · EMI management with calendar · automatic
recurring transaction engine (subscriptions, rent, EMIs) · credit-card cycle
tracking with utilization · EMI vs non-EMI split · monthly/yearly reports +
annual insights · accent/density/landing-page personalization.

React + Vite + TypeScript · Tailwind + shadcn/ui · Firebase Auth + Firestore · Vercel.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Setup

1. **Install**
   ```bash
   npm install
   ```

2. **Create a Firebase project** → enable **Authentication → Google** and
   **Firestore Database**.

3. **Configure env** — copy the example and fill in your web app keys
   (Firebase Console → Project settings → Your apps → SDK config):
   ```bash
   cp .env.example .env.local
   ```

4. **Run**
   ```bash
   npm run dev
   ```

## Deploy Firestore rules & indexes

```bash
npm i -g firebase-tools && firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

## Deploy to Vercel

Import the repo in Vercel, add the `VITE_FIREBASE_*` env vars, deploy. SPA routing
is handled by `vercel.json`. Add your Vercel domain to Firebase Auth → Settings →
Authorized domains.

## Scripts

| Command           | Description                   |
| ----------------- | ----------------------------- |
| `npm run dev`     | Dev server                    |
| `npm run build`   | Type-check + production build |
| `npm run preview` | Preview the built app         |

> Note: all sample/seed data uses neutral placeholder values. No real figures are
> hardcoded — every number is read live from Firestore.
