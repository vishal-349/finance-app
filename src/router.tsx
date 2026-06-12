import { lazy, Suspense, useRef } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { useRecurringEngine } from "@/hooks/useRecurring";
import { AppLayout } from "@/components/layout/AppLayout";
import { MonthProvider } from "@/context/MonthProvider";
import { LoginPage } from "@/pages/LoginPage";

// Route-level code splitting keeps the initial bundle small; heavy deps
// (charts, xlsx) load only when their page is visited.
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const TransactionsPage = lazy(() =>
  import("@/pages/TransactionsPage").then((m) => ({ default: m.TransactionsPage })),
);
const BudgetsPage = lazy(() =>
  import("@/pages/BudgetsPage").then((m) => ({ default: m.BudgetsPage })),
);
const IncomePage = lazy(() =>
  import("@/pages/IncomePage").then((m) => ({ default: m.IncomePage })),
);
const EmergencyFundPage = lazy(() =>
  import("@/pages/EmergencyFundPage").then((m) => ({ default: m.EmergencyFundPage })),
);
const SipPage = lazy(() => import("@/pages/SipPage").then((m) => ({ default: m.SipPage })));
const ReportsPage = lazy(() =>
  import("@/pages/ReportsPage").then((m) => ({ default: m.ReportsPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const LargeExpensesPage = lazy(() =>
  import("@/pages/LargeExpensesPage").then((m) => ({ default: m.LargeExpensesPage })),
);
const EmisPage = lazy(() => import("@/pages/EmisPage").then((m) => ({ default: m.EmisPage })));
const RecurringPage = lazy(() =>
  import("@/pages/RecurringPage").then((m) => ({ default: m.RecurringPage })),
);

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function PageSuspense({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

/**
 * Once per session: materialise due recurring/EMI transactions, and honor the
 * user's default landing page when the app opened at the root.
 */
function SessionBootstrap() {
  useRecurringEngine();
  const { settings, loading } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const redirected = useRef(false);

  useEffect(() => {
    if (redirected.current || loading) return;
    redirected.current = true;
    const landing = settings.defaultLandingPage;
    if (landing && landing !== "/" && location.pathname === "/") {
      navigate(landing, { replace: true });
    }
  }, [loading, settings.defaultLandingPage, location.pathname, navigate]);

  return null;
}

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <MonthProvider>
      <SessionBootstrap />
      <AppLayout />
    </MonthProvider>
  );
}

function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

const page = (el: React.ReactNode) => <PageSuspense>{el}</PageSuspense>;

export const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [{ path: "/login", element: <LoginPage /> }],
  },
  {
    element: <ProtectedShell />,
    children: [
      { path: "/", element: page(<DashboardPage />) },
      { path: "/transactions", element: page(<TransactionsPage />) },
      { path: "/budgets", element: page(<BudgetsPage />) },
      { path: "/income", element: page(<IncomePage />) },
      { path: "/large-expenses", element: page(<LargeExpensesPage />) },
      { path: "/emis", element: page(<EmisPage />) },
      { path: "/recurring", element: page(<RecurringPage />) },
      { path: "/emergency-fund", element: page(<EmergencyFundPage />) },
      { path: "/sip", element: page(<SipPage />) },
      { path: "/reports", element: page(<ReportsPage />) },
      { path: "/settings", element: page(<SettingsPage />) },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
