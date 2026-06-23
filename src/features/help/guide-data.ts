import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  Wallet,
  Banknote,
  Flame,
  Landmark,
  Repeat,
  Target,
  CalendarClock,
  PiggyBank,
  LineChart,
  BarChart3,
  Settings,
  Rocket,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export interface GuideFeature {
  /** Feature / action name. */
  title: string;
  /** Exactly where in the UI to find it. */
  where: string;
  /** Concrete how-to steps (or what you'll see, for read-only views). */
  steps: string[];
  /** Optional good-to-know note. */
  tip?: string;
}

export interface GuideSection {
  id: string;
  title: string;
  icon: LucideIcon;
  /** Route this area lives at (for the "Open" deep link). Omitted for basics. */
  to?: string;
  /** Where it sits in navigation, in plain words. */
  location: string;
  summary: string;
  features: GuideFeature[];
}

/**
 * Single source of truth for the in-app "How to use" guide. Every user-facing
 * feature is represented here, grouped by the area of the app it lives in.
 */
export const GUIDE: GuideSection[] = [
  {
    id: "getting-started",
    title: "Getting started & basics",
    icon: Rocket,
    location: "Sign-in screen · top-right account menu · anywhere",
    summary:
      "Sign in, find your way around, and learn the controls that work the same on every page.",
    features: [
      {
        title: "Sign in with Google",
        where: "Login screen — “Continue with Google” button",
        steps: [
          "Open the app while signed out to reach the login screen.",
          "Click “Continue with Google” and complete the Google sign-in.",
          "Your account and a starter set of categories are created automatically on first sign-in.",
        ],
        tip: "Your data is private to your account and synced to the cloud.",
      },
      {
        title: "Account menu (profile, theme, log out)",
        where: "Top-right avatar / initials in the header",
        steps: [
          "Click your avatar to open the menu.",
          "See your name and email at the top.",
          "Quick-switch theme: Light, Dark, or System.",
          "Click “Log out” to sign out.",
        ],
      },
      {
        title: "Jump to the Dashboard from the logo",
        where: "“FinTrack” logo / name — top-left sidebar (or header on mobile)",
        steps: [
          "Click the FinTrack logo or name from anywhere to return to the Dashboard.",
        ],
      },
      {
        title: "Switch the month (month picker)",
        where: "Top-right of Dashboard, Transactions, Income, Budgets",
        steps: [
          "Use the ‹ and › arrows to move to the previous or next month.",
          "The centre shows the month you're viewing (e.g. “June 2026”).",
          "Every figure on the page recalculates for the chosen month.",
        ],
        tip: "The selected month is shared across the app, so switching it once carries between pages.",
      },
      {
        title: "Reorder lists",
        where: "Settings → Categories / Payment Methods / Income Sources",
        steps: [
          "Use the up / down arrows on each row to change its order.",
          "The arrow is disabled at the top/bottom of the list.",
          "New order is saved instantly and used everywhere that list appears.",
        ],
      },
      {
        title: "Light / Dark / System theme & accent colour",
        where: "Account menu, or Settings → Preferences (theme) & Appearance (accent)",
        steps: [
          "Pick a theme from the account menu or Preferences.",
          "Change the accent colour (Green, Blue, Purple, Orange) in Appearance.",
          "Both apply instantly across the whole app.",
        ],
      },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    to: "/",
    location: "Sidebar → Dashboard (home)",
    summary:
      "Your month at a glance — every figure is derived live from your transactions, nothing is typed in here.",
    features: [
      {
        title: "Net cash & Available After Card Settlement",
        where: "Gradient panel at the top, with a companion card beside it",
        steps: [
          "Net cash = your true total liquid cash across all accounts, each account broken out.",
          "Reflects everything that moved your cash — income, spending, transfers, bill payments, and money set aside to Goals/SIP/Emergency Fund. Card spend isn't subtracted until you pay the bill.",
          "“How is this calculated?” expands a full breakdown (opening balance + in − out − saved).",
          "Available After Card Settlement = Net cash − all current credit-card dues; it goes red if dues exceed your cash.",
          "Click the arrow to jump to the Accounts page.",
        ],
        tip: "Set a “Tracking start date” in Settings → Preferences so pre-tracking transactions don't reduce Net cash.",
      },
      {
        title: "“This month” cash-flow cards",
        where: "Five cards below the Net cash panel — each is clickable",
        steps: [
          "Income → opens Income. Spending → opens Transactions (with budget-used %).",
          "Saved & invested = Goals + Emergency Fund + SIP set aside this month → opens Goals.",
          "Total Outflow = Spending + Saved & invested — what actually left you this month.",
          "Left this month = Income − Spending − Saved/invested, with your savings rate → opens Reports.",
          "Click any card to drill into the underlying records.",
        ],
        tip: "The Income card has an eye to hide income everywhere — see the Income section. All values update automatically as you add or edit transactions, budgets and savings.",
      },
      {
        title: "Last updated & activity history",
        where: "“Last updated …” line just under the page title",
        steps: [
          "Shows the date & time of your most recent change anywhere in the app (DD/MM/YY, hh:mm AM/PM).",
          "Click it to open the Activity History — recent Add / Update / Delete actions with the module, record, amount, what changed (old → new), time and who made the change.",
        ],
      },
      {
        title: "Module widgets",
        where: "Row of four cards: Large Expenses, EMI Burden, Card Spend, EMI vs Non-EMI",
        steps: [
          "Large Expenses: total + count above your threshold this month.",
          "EMI Burden: this month's installment total, how many EMIs fall in the month, and their dates (paid ones show a ✓). Loans that start a later month aren't counted.",
          "Card Spend: total credit-card spend with per-card utilisation bars (green/amber/red).",
          "EMI vs Non-EMI: split of this month's expenses — counts both EMI-module payments and expenses in categories named “EMI…”. Click any widget's arrow to open its full page.",
        ],
      },
      {
        title: "Spending breakdown & Planned vs Actual",
        where: "Two charts lower on the Dashboard (full layout only)",
        steps: [
          "Spending breakdown is a donut of expenses by category — hover a slice for the amount.",
          "Planned vs Actual lists each budgeted category with a utilisation bar.",
          "Click a category row to drill into the exact transactions behind the total.",
        ],
        tip: "Switch between “Charts + widgets” and “widgets only” in Settings → Appearance → Dashboard layout.",
      },
    ],
  },
  {
    id: "transactions",
    title: "Transactions",
    icon: ArrowLeftRight,
    to: "/transactions",
    location: "Sidebar → Transactions",
    summary: "Record and manage every expense, income and transfer — the heart of the app.",
    features: [
      {
        title: "Add a transaction",
        where: "“Add” button in the page header",
        steps: [
          "Click “Add”, then choose the type: Expense, Income, or Transfer.",
          "Enter the date and amount (amount must be greater than 0).",
          "Expense → pick a category and funding source; Income → pick an income source and deposit account; Transfer → choose two different accounts.",
          "Optionally add a payment method, merchant/payer, and note, then save.",
        ],
      },
      {
        title: "Convert a card expense to an EMI",
        where: "Add Transaction dialog — “Convert to EMI” tab (new card expenses only)",
        steps: [
          "Add an expense and choose a credit card as the source.",
          "Switch to the “Convert to EMI” tab.",
          "Enter the tenure in months; the monthly amount auto-fills (total ÷ months) and is editable.",
          "Save to create an EMI plan on the EMIs page — then mark each instalment paid there as you pay it.",
        ],
        tip: "Only offered when creating a new card expense, not when editing one.",
      },
      {
        title: "Edit or delete a transaction",
        where: "Pencil / trash icons on each transaction row",
        steps: [
          "Click the pencil to reopen the form with all fields pre-filled, change anything, and save.",
          "Click the trash icon and confirm to delete permanently.",
          "Totals and budgets recalculate immediately either way.",
        ],
      },
      {
        title: "Filter & search transactions",
        where: "Filter bar above the list",
        steps: [
          "Type in the search box to match a merchant or note.",
          "Narrow by Type, Category, Payment method, and Min/Max amount — filters combine.",
          "Click “Clear filters” (appears when any filter is active) to reset.",
        ],
        tip: "The Income/Expenses totals card reflects whatever your filters currently show.",
      },
    ],
  },
  {
    id: "income",
    title: "Income",
    icon: TrendingUp,
    to: "/income",
    location: "Sidebar → Income",
    summary: "A focused view for recording and understanding where your money comes from.",
    features: [
      {
        title: "Add, edit or delete income",
        where: "“Add income” button; pencil / trash on each row",
        steps: [
          "Click “Add income” — the form opens pre-set to the Income type.",
          "Set date, amount, income source (required) and the deposit account (required).",
          "Optionally add payment method, payer and note.",
          "Use the pencil to edit or the trash icon (with confirm) to delete.",
        ],
      },
      {
        title: "Total income & breakdown by source",
        where: "Total card at top; “By source” card alongside the list",
        steps: [
          "The total card sums all income for the selected month.",
          "“By source” groups income by salary, freelance, interest, etc., highest first.",
          "Income without an assigned source is grouped as “Other”.",
        ],
      },
      {
        title: "Hide / show income (privacy)",
        where: "Eye icon on income cards and on each income row",
        steps: [
          "Click the eye to mask every income figure across the whole app at once — the total, each entry, the By-source breakdown, and the Dashboard/Reports income cards. It stays hidden after a reload.",
          "Click the eye again to reveal — you'll be asked for your PIN if one is set.",
          "Every income entry has its own eye, so you can hide or reveal from anywhere.",
        ],
        tip: "Set or change the unlock PIN in Settings → Preferences → Income PIN. With no PIN set, revealing needs no code.",
      },
    ],
  },
  {
    id: "budgets",
    title: "Budgets",
    icon: Wallet,
    to: "/budgets",
    location: "Sidebar → Budgets",
    summary: "Plan a spending limit per category and watch your pace through the month.",
    features: [
      {
        title: "Set a category budget",
        where: "Budget input on each category row",
        steps: [
          "Click the amount field on a category and type the planned budget.",
          "Press Enter or click away to save.",
          "The utilisation bar, % used and remaining amount update instantly.",
        ],
      },
      {
        title: "Copy last month's budgets",
        where: "“Copy last month” button in the header",
        steps: [
          "Click “Copy last month” to bring every budget amount forward into the current month.",
          "A toast confirms how many budgets were copied.",
        ],
        tip: "Great for steady month-to-month plans — set once, copy forward.",
      },
      {
        title: "Track spending pace & drill into a category",
        where: "Each category row + the “Spent” link",
        steps: [
          "Bars are colour-coded: under budget, nearing the limit, or over.",
          "If daily-pace tracking is on for a category, you'll see days left and a safe amount per day.",
          "Click the “Spent ₹X” link to open the exact transactions that make up that total.",
        ],
        tip: "Turn daily-pace tracking on per category in Settings → Categories.",
      },
      {
        title: "Budget summary",
        where: "Cards at the top of the page",
        steps: ["See Planned, Actual and Remaining totalled across all categories for the month."],
      },
    ],
  },
  {
    id: "accounts",
    title: "Accounts",
    icon: Banknote,
    to: "/accounts",
    location: "Sidebar → Accounts",
    summary: "Bank accounts and cash wallets whose balances are derived live from your transactions.",
    features: [
      {
        title: "Add an account",
        where: "“Add account” button (full options live in Settings → Accounts)",
        steps: [
          "Click “Add account” and enter a name.",
          "Choose Bank account or Cash wallet, and optionally an institution, last-4 digits and colour.",
          "In Settings → Accounts you can also set an opening balance and edit/archive later.",
        ],
      },
      {
        title: "Transfer between accounts",
        where: "“Transfer” button on the Accounts page",
        steps: [
          "Click “Transfer”, pick the From and To accounts (must differ).",
          "Enter the amount and date, optionally a note, then save.",
          "It appears in both accounts' histories — money out of one, into the other.",
        ],
      },
      {
        title: "View an account statement",
        where: "“View statement” on each account card",
        steps: [
          "Click “View statement” to see that account's most recent transactions (latest first).",
          "Use it to reconcile a single account.",
        ],
      },
      {
        title: "Assign past (unassigned) transactions",
        where: "“Assign past transactions” card (shows only when some exist)",
        steps: [
          "If you have transactions with no funding source, this card appears.",
          "Pick the account they belong to and click “Assign” to attach them in bulk.",
        ],
        tip: "Useful after importing history or fixing older entries.",
      },
      {
        title: "Account stats",
        where: "Cards at the top of the page",
        steps: ["See Net cash, number of accounts, and money In / Out this calendar month."],
        tip: "Net cash reflects money moved to Goals, SIP and Emergency Fund — those leave your account. Only transactions on/after your tracking-start date (Settings → Preferences) count toward balances.",
      },
    ],
  },
  {
    id: "credit-cards",
    title: "Credit Cards",
    icon: CreditCard,
    to: "/credit-cards",
    location: "Sidebar → Commitments → Credit Cards",
    summary:
      "A dedicated module to track each card's spend, outstanding balance and utilization, and to pay bills.",
    features: [
      {
        title: "Add / edit a card",
        where: "“Add card” button; Edit on the selected card",
        steps: [
          "Click “Add card” and enter the bank, last-4, credit limit, billing day and due day.",
          "Pick a colour, then save.",
          "Select a card from the list on the left to see its full detail on the right.",
        ],
      },
      {
        title: "See a card's transactions",
        where: "Select a card → “Transactions” tab",
        steps: [
          "Every charge on the card (including EMI installments) is listed newest-first.",
          "This is where individual card spends appear — the total and the list always agree.",
        ],
        tip: "To add a card spend, add an expense in Transactions and choose the card as the source.",
      },
      {
        title: "Pay a bill & view payment history",
        where: "“Pay bill” button; “Payments” tab",
        steps: [
          "“Pay bill” moves money from an account to the card — it reduces the outstanding and is NOT a new expense.",
          "The “Payments” tab lists every bill payment you've recorded against the card.",
        ],
      },
      {
        title: "Outstanding, cycle spend & utilization",
        where: "Selected card detail + portfolio stat cards",
        steps: [
          "Outstanding = all charges − all payments.",
          "Utilization compares current-cycle spend to the credit limit (green / amber / red).",
          "The top stat cards total outstanding, this-month spend and overall credit used across all cards.",
        ],
      },
    ],
  },
  {
    id: "large-expenses",
    title: "Large Expenses",
    icon: Flame,
    to: "/large-expenses",
    location: "Sidebar → Large Expenses",
    summary: "Spotlights spending spikes above a threshold you choose, across a whole year.",
    features: [
      {
        title: "Set the large-expense threshold",
        where: "Settings → Preferences (shown in the page subtitle)",
        steps: [
          "This page tracks any expense at or above your threshold.",
          "Set or change the amount in Settings → Preferences.",
          "Until a threshold is set, the page prompts you to configure one.",
        ],
      },
      {
        title: "Browse by year",
        where: "Year arrows in the header",
        steps: [
          "Use ‹ / › to change year (you can't go past the current year).",
          "Stat cards show this month, this year, and large expenses' share of all spending.",
        ],
      },
      {
        title: "Trends, categories & history",
        where: "Cards down the page",
        steps: [
          "Monthly trend: a bar per month of the year.",
          "By category: which categories hold your biggest expenses, ranked.",
          "History month-by-month: every large expense grouped by month — edit or delete inline.",
        ],
      },
    ],
  },
  {
    id: "emis",
    title: "EMIs",
    icon: Landmark,
    to: "/emis",
    location: "Sidebar → EMIs",
    summary:
      "The single source of truth for loans & instalments: plan a schedule, then mark each instalment paid as you pay it. Nothing is auto-recorded.",
    features: [
      {
        title: "Add an EMI plan",
        where: "“Add EMI” button",
        steps: [
          "Click “Add EMI” and name it (e.g. “iPhone EMI”).",
          "Choose a type (Credit Card EMI, Personal/Car/Home Loan, or Custom).",
          "Enter the monthly amount, start date and number of months.",
          "Optionally set a category and funding source (an account or card), then save.",
        ],
        tip: "This creates a schedule only — no transactions yet. You record each instalment as you pay it.",
      },
      {
        title: "Record a payment (Mark Paid)",
        where: "“Record payment” button on an EMI card, or click a date in the Calendar",
        steps: [
          "Click “Record payment” (it targets the next unpaid instalment), or open the Calendar and click any instalment.",
          "In the dialog, confirm or change the payment date, amount and funding source (all pre-filled from the plan).",
          "Save — this creates an EMI-tagged expense that flows into Net cash, Spending, budgets, the monthly summary and the EMI-vs-Non-EMI split automatically.",
          "To edit or undo, open a paid instalment again and change it or choose “Remove payment”.",
        ],
        tip: "Behind on a few? Click “Mark N past-due paid” on the card to record every overdue instalment in one tap.",
      },
      {
        title: "Edit, pause/resume, stop or delete a plan",
        where: "Icon buttons on each EMI card (Active tab)",
        steps: [
          "Pencil edits the plan; end date is recalculated from start + months.",
          "Pause/resume hides or restores the plan's expected payments.",
          "Stop moves it to Completed and stops expecting payments; Delete removes the plan.",
          "Either way, instalment payments you've already recorded are kept as transactions.",
        ],
      },
      {
        title: "Progress, due badge, Completed & Calendar tabs",
        where: "Tabs on the EMIs page",
        steps: [
          "Active: progress bar of instalments paid (from your recorded payments), remaining amount, next due date, and a “N due” badge for overdue-but-unrecorded instalments.",
          "Completed: fully-paid or stopped plans for reference.",
          "Calendar: a month grid showing each instalment as paid ✓ / due / upcoming — click any date to record or edit its payment.",
        ],
      },
      {
        title: "EMI stats",
        where: "Cards at the top",
        steps: ["Monthly burden (instalments due this month), active count, total remaining, and the next payment due."],
      },
    ],
  },
  {
    id: "recurring",
    title: "Recurring",
    icon: Repeat,
    to: "/recurring",
    location: "Sidebar → Recurring",
    summary: "Rules that auto-record repeating income or expenses (rent, salary, bills…).",
    features: [
      {
        title: "Add a recurring rule",
        where: "“Add rule” button",
        steps: [
          "Click “Add rule” and choose Expense or Income.",
          "Set a name, amount and frequency (Daily, Weekly, Monthly, Quarterly, Yearly).",
          "Pick a start date and optional end date, plus category/source and funding account.",
          "Save — occurrences from the start date onward are added automatically.",
        ],
        tip: "Past dates since the start are backfilled; edits only affect future occurrences.",
      },
      {
        title: "Edit, pause, resume, stop or delete a rule",
        where: "Icon buttons on each rule card",
        steps: [
          "Pause/resume to temporarily stop or restart generating occurrences.",
          "Stop ends the rule permanently; Delete removes the rule definition.",
          "Transactions already generated are always kept.",
        ],
      },
      {
        title: "Status, next run & totals",
        where: "On each card and the stat cards up top",
        steps: [
          "Badges show Active / Paused / Stopped and Income / Expense.",
          "“Next:” shows when the rule will next record (and its end date if set).",
          "Stat cards: active rules, paused rules, and an approximate monthly equivalent.",
        ],
      },
    ],
  },
  {
    id: "goals",
    title: "Savings Goals",
    icon: Target,
    to: "/goals",
    location: "Sidebar → Savings Goals",
    summary: "Set targets, contribute toward them, and get a forecast of when you'll get there.",
    features: [
      {
        title: "Create a goal",
        where: "“New goal” button",
        steps: [
          "Click “New goal”, name it and set a target amount.",
          "Optionally add a target date, a colour and a note.",
          "Save — progress is tracked by your contributions.",
        ],
      },
      {
        title: "Contribute to a goal",
        where: "Green “Contribute” button on an active goal card",
        steps: [
          "Click “Contribute”, choose the account the money comes from.",
          "Enter an amount and date (defaults to today), then add it.",
          "It's recorded as a goal contribution — it moves money toward the goal, not counted as an expense.",
        ],
      },
      {
        title: "Edit, archive, reactivate or delete",
        where: "Icons on each goal card",
        steps: [
          "Pencil edits the goal; the archive box moves it to the inactive section.",
          "Reactivate brings an archived goal back; Delete removes it (contributions are kept).",
        ],
      },
      {
        title: "Progress & forecast",
        where: "Each goal card + stat cards",
        steps: [
          "A bar shows saved vs target with the % complete and amount to go.",
          "The forecast reads Achieved, On track / Est. date, or Behind based on your pace.",
          "Stat cards total saved, total target and active goal count.",
        ],
      },
    ],
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    icon: CalendarClock,
    to: "/subscriptions",
    location: "Sidebar → Subscriptions",
    summary: "Track recurring subscriptions with renewal dates and monthly/yearly cost (MRR/ARR).",
    features: [
      {
        title: "Add a subscription",
        where: "“Add subscription” button",
        steps: [
          "Click “Add subscription” and name it (e.g. “Netflix”).",
          "Choose Monthly or Yearly, enter the amount and the next charge date.",
          "Pick what it's paid from, an optional category, and toggle Auto-renew.",
          "Save — if an auto-renew charge is already due it's recorded right away (and on each future cycle), showing up in Transactions.",
        ],
      },
      {
        title: "Edit, pause/resume, cancel or delete",
        where: "Icon buttons on each subscription row",
        steps: [
          "Pause/resume temporarily stops or restarts renewals.",
          "Cancel marks it cancelled (kept for history); Delete removes it entirely.",
          "Once cancelled, only Edit and Delete remain — the pause and cancel buttons disappear.",
        ],
      },
      {
        title: "Upcoming renewals & cost stats",
        where: "“Upcoming renewals” card + stat cards",
        steps: [
          "See the next renewals in date order.",
          "Stats show monthly cost (MRR), yearly cost (ARR), active count and the next renewal.",
        ],
      },
    ],
  },
  {
    id: "emergency-fund",
    title: "Emergency Fund",
    icon: PiggyBank,
    to: "/emergency-fund",
    location: "Sidebar → Emergency Fund",
    summary: "Log planned vs actual savings each month and watch your safety net grow.",
    features: [
      {
        title: "Add a monthly entry",
        where: "“Add entry” button",
        steps: [
          "Click “Add entry” and pick the month (defaults to current).",
          "Enter the planned saving and the actual amount saved.",
          "Choose the “From account” — the actual amount leaves that account's balance.",
          "Save — the running total updates cumulatively.",
        ],
        tip: "Emergency-fund deposits reduce your Net Cash, because the money came from your account.",
      },
      {
        title: "Edit or delete an entry",
        where: "Pencil / trash on each history row",
        steps: [
          "Edit to adjust planned/actual amounts (the month stays fixed).",
          "Delete to remove a month; running totals recalculate.",
        ],
      },
      {
        title: "Growth chart, history & stats",
        where: "“Fund growth” chart, history table and stat cards",
        steps: [
          "The area chart shows your cumulative balance over time.",
          "The table lists each month with actual colour-coded vs planned, and the running total.",
          "Stats show total fund, total planned and plan progress %.",
        ],
      },
    ],
  },
  {
    id: "sip",
    title: "SIP & Investments",
    icon: LineChart,
    to: "/sip",
    location: "Sidebar → SIP & Investments",
    summary: "Record planned vs actual investments per month and track cumulative growth.",
    features: [
      {
        title: "Add an investment",
        where: "“Add investment” button",
        steps: [
          "Click “Add investment” and pick the month.",
          "Choose a type (Mutual Fund, Stock, Custom) and name it.",
          "Enter planned and actual amounts, choose the “From account”, then save.",
        ],
        tip: "The actual invested amount leaves that account, reducing your Net Cash.",
      },
      {
        title: "Edit or delete an investment",
        where: "Pencil / trash on each history row",
        steps: ["Edit to change details/amounts, or delete to remove the record."],
      },
      {
        title: "Growth chart, history & stats",
        where: "“Investment growth” chart, history table and stat cards",
        steps: [
          "The chart plots your cumulative invested amount over time.",
          "The table lists each entry with its type, planned and actual amounts.",
          "Stats show total invested, total planned and number of entries tracked.",
        ],
      },
    ],
  },
  {
    id: "reports",
    title: "Reports & Insights",
    icon: BarChart3,
    to: "/reports",
    location: "Sidebar → Reports",
    summary: "Deep dives into your money: month, year and a year's worth of automatic insights.",
    features: [
      {
        title: "Monthly report",
        where: "Reports → Monthly tab",
        steps: [
          "Pick a month and year from the dropdowns.",
          "See Income, Expenses, Net Savings, Emergency Fund, SIP and Savings Rate.",
          "Below: a spending donut and a ranked category breakdown.",
        ],
      },
      {
        title: "Yearly report",
        where: "Reports → Yearly tab",
        steps: [
          "Navigate years with the arrows.",
          "See annual totals, an income-vs-expense bar chart by month, and the category breakdown.",
        ],
      },
      {
        title: "Insights",
        where: "Reports → Insights tab",
        steps: [
          "Highlight chips: biggest spending category, highest & lowest months, large-expense count.",
          "Top categories, a monthly spending trend, and an EMI vs non-EMI breakdown.",
          "Large-expense trend (needs a threshold) and a credit-card spend ranking.",
        ],
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    icon: Settings,
    to: "/settings",
    location: "Sidebar → Settings",
    summary: "Set up the building blocks — categories, accounts, cards, appearance — and manage your data.",
    features: [
      {
        title: "Categories",
        where: "Settings → Categories (Expense / Income tabs)",
        steps: [
          "Add a category with a name and colour; toggle “Track daily spend pace”.",
          "Edit, reorder, archive (safe hide) or delete; toggle “Show archived” to see hidden ones.",
          "Deleting keeps past transactions but un-categorises them — archiving is usually safer.",
        ],
      },
      {
        title: "Accounts",
        where: "Settings → Accounts",
        steps: [
          "Add/edit accounts with name, type, opening balance, institution, last-4 and colour.",
          "Archive to hide without losing history, or delete permanently.",
          "Balances are always derived from your transactions.",
        ],
      },
      {
        title: "Payment Methods & Income Sources",
        where: "Settings → Payment Methods / Income Sources",
        steps: [
          "Maintain optional tags (UPI, NEFT, Salary, Freelance…) used in transaction forms.",
          "Add, rename, reorder, archive or delete each.",
        ],
      },
      {
        title: "Appearance",
        where: "Settings → Appearance",
        steps: [
          "Accent colour: Green, Blue, Purple or Orange.",
          "Density: Comfortable or Compact.",
          "Dashboard layout: charts + widgets, or widgets only.",
          "Default landing page: Dashboard, Transactions, Budgets, Income or Reports.",
        ],
      },
      {
        title: "Preferences",
        where: "Settings → Preferences",
        steps: [
          "Set your currency, theme (Light/Dark/System).",
          "Set the large-expense threshold and the financial-year start month.",
          "Set a Tracking start date — the day you began tracking.",
          "Set an Income PIN (4 characters) — required to reveal income once it's hidden.",
        ],
        tip: "Transactions dated before your tracking-start date count toward EMI schedules and history but never reduce Net cash, account balances or card dues. Leave it empty to count everything. Clear the Income PIN field to remove PIN protection.",
      },
      {
        title: "Export & backup your data",
        where: "Settings → Preferences → Data section",
        steps: [
          "Export CSV: all transactions as a spreadsheet.",
          "Export Excel: a multi-sheet workbook (transactions, budgets, emergency fund, SIP).",
          "Download Backup: a complete JSON of everything.",
          "Restore Backup: upload a JSON to merge it back in (matching records are overwritten).",
        ],
      },
    ],
  },
];

/** Total number of documented features — handy for the page header. */
export const GUIDE_FEATURE_COUNT = GUIDE.reduce((n, s) => n + s.features.length, 0);
