import { NavLink, Outlet } from "react-router-dom";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_SECTIONS } from "./nav-items";
import { UserMenu } from "./UserMenu";

const BrandMark = () => (
  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-glow ring-1 ring-inset ring-white/20">
    <Wallet className="h-5 w-5" />
  </div>
);

export function AppLayout() {
  return (
    <div className="min-h-screen bg-mesh">
      {/* Desktop sidebar — frosted glass over the ambient mesh */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border/60 bg-card/70 shadow-e2 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-6">
          <BrandMark />
          <span className="text-lg font-bold tracking-tight">FinTrack</span>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="space-y-1">
              <p className="px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </p>
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-out-expo",
                      isActive
                        ? "bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-glow ring-1 ring-inset ring-white/15"
                        : "text-muted-foreground hover:translate-x-0.5 hover:bg-accent hover:text-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main column */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-4 shadow-e1 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <BrandMark />
            <span className="font-bold tracking-tight">FinTrack</span>
          </div>
          <div className="hidden lg:block" />
          <UserMenu />
        </header>

        <main className="mx-auto max-w-6xl animate-fade-up space-y-6 p-4 pb-24 sm:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav — glass bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border/60 bg-card/80 shadow-e3 backdrop-blur-xl lg:hidden">
        {NAV_ITEMS.filter((i) => i.primary).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -top-px h-0.5 w-8 rounded-full bg-primary shadow-glow" />
                )}
                <Icon className="h-5 w-5" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
