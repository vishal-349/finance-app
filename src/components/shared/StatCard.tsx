import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  hint?: string;
  accent?: "default" | "success" | "warning" | "destructive";
  /** When set, the whole card becomes a deep link to this route. */
  to?: string;
  /** Shrinks the value text for tight, many-up grids (e.g. a 5-column row of large currency figures). */
  dense?: boolean;
  /** Optional control rendered top-right (e.g. a privacy toggle). Rendered
   *  OUTSIDE the card's link so it stays independently clickable. */
  action?: ReactNode;
}

const ACCENT: Record<
  NonNullable<StatCardProps["accent"]>,
  { value: string; chip: string; glow: string }
> = {
  default: {
    value: "text-foreground",
    chip: "from-primary/85 to-primary text-primary-foreground shadow-glow",
    glow: "bg-primary/25",
  },
  success: {
    value: "text-success",
    chip: "from-success/85 to-success text-success-foreground",
    glow: "bg-success/25",
  },
  warning: {
    value: "text-warning",
    chip: "from-warning/85 to-warning text-warning-foreground",
    glow: "bg-warning/30",
  },
  destructive: {
    value: "text-destructive",
    chip: "from-destructive/85 to-destructive text-destructive-foreground",
    glow: "bg-destructive/25",
  },
};

export function StatCard({ label, value, icon: Icon, hint, accent = "default", to, dense, action }: StatCardProps) {
  const a = ACCENT[accent];
  const inner = (
    <Card variant="glass" interactive className="group relative h-full overflow-hidden">
      {/* Ambient accent glow that intensifies on hover */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-2xl opacity-60 transition-opacity duration-300 group-hover:opacity-100",
          a.glow,
        )}
      />
      {to && !action && (
        <ArrowUpRight className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground/0 transition-colors duration-200 group-hover:text-muted-foreground" />
      )}
      <CardContent className="relative flex items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn("mt-1.5 font-bold tabular-nums tracking-tight", dense ? "text-xl" : "text-2xl", a.value)}>
            {value}
          </p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              "grid h-11 w-11 shrink-0 place-content-center rounded-xl bg-gradient-to-b text-white ring-1 ring-inset ring-white/20 shadow-e2 [box-shadow:var(--elev-2),var(--highlight-top)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105",
              a.chip,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const ariaLabel = typeof value === "string" ? `${label}: ${value}` : label;
  const body =
    to ? (
      <Link
        to={to}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={ariaLabel}
      >
        {inner}
      </Link>
    ) : (
      inner
    );

  // Action (e.g. privacy toggle) sits OUTSIDE the link as a positioned overlay,
  // so it never nests an interactive control inside an anchor.
  if (action) {
    return (
      <div className="relative h-full">
        {body}
        <div className="absolute right-2 top-2 z-10">{action}</div>
      </div>
    );
  }
  return body;
}
