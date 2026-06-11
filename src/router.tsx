import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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

function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <MonthProvider>
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
      { path: "/emergency-fund", element: page(<EmergencyFundPage />) },
      { path: "/sip", element: page(<SipPage />) },
      { path: "/reports", element: page(<ReportsPage />) },
      { path: "/settings", element: page(<SettingsPage />) },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
