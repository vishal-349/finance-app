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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Show in the mobile bottom bar (kept to the most-used 5). */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, primary: true },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight, primary: true },
  { to: "/budgets", label: "Budgets", icon: Wallet, primary: true },
  { to: "/income", label: "Income", icon: TrendingUp, primary: true },
  { to: "/accounts", label: "Accounts", icon: Banknote },
  { to: "/large-expenses", label: "Large Expenses", icon: Flame },
  { to: "/emis", label: "EMIs", icon: Landmark },
  { to: "/recurring", label: "Recurring", icon: Repeat },
  { to: "/emergency-fund", label: "Emergency Fund", icon: PiggyBank },
  { to: "/sip", label: "SIP & Investments", icon: LineChart },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings, primary: true },
];
