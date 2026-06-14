import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  TrendingUp,
  PiggyBank,
  LineChart,
  BarChart3,
  Settings,
  Flame,
  Landmark,
  Repeat,
  Banknote,
  Target,
  CalendarClock,
  CreditCard,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Show in the mobile bottom bar (kept to the most-used 5). */
  primary?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Sidebar grouped by purpose so ~16 modules stay scannable:
 * Overview (where am I) → Money (day-to-day) → Commitments (what I owe) →
 * Grow (what I'm building) → Setup (configuration & help).
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, primary: true },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/transactions", label: "Transactions", icon: ArrowLeftRight, primary: true },
      { to: "/income", label: "Income", icon: TrendingUp, primary: true },
      { to: "/budgets", label: "Budgets", icon: Wallet, primary: true },
      { to: "/accounts", label: "Accounts", icon: Banknote },
      { to: "/large-expenses", label: "Large Expenses", icon: Flame },
    ],
  },
  {
    label: "Commitments",
    items: [
      { to: "/credit-cards", label: "Credit Cards", icon: CreditCard },
      { to: "/emis", label: "EMIs", icon: Landmark },
      { to: "/subscriptions", label: "Subscriptions", icon: CalendarClock },
      { to: "/recurring", label: "Recurring", icon: Repeat },
    ],
  },
  {
    label: "Grow",
    items: [
      { to: "/goals", label: "Savings Goals", icon: Target },
      { to: "/emergency-fund", label: "Emergency Fund", icon: PiggyBank },
      { to: "/sip", label: "SIP & Investments", icon: LineChart },
    ],
  },
  {
    label: "Setup",
    items: [
      { to: "/help", label: "How to use", icon: HelpCircle },
      { to: "/settings", label: "Settings", icon: Settings, primary: true },
    ],
  },
];

/** Flattened list (mobile bottom bar + anywhere a single list is needed). */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);
