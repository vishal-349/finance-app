import { Eye, EyeOff } from "lucide-react";
import { useIncomePrivacy } from "@/hooks/useIncomePrivacy";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

/**
 * An income amount that respects the global privacy toggle: shows the formatted
 * value when visible, a mask when hidden. `prefix` (e.g. "+ ") is kept visible.
 */
export function IncomeAmount({
  value,
  prefix = "",
  className,
}: {
  value: number;
  prefix?: string;
  className?: string;
}) {
  const { hidden } = useIncomePrivacy();
  const { money } = useSettings();
  return (
    <span className={cn("tabular-nums", className)}>
      {hidden ? `${prefix}••••••` : `${prefix}${money(value)}`}
    </span>
  );
}

/**
 * Eye button that hides income (one click) or requests a PIN-gated reveal. One
 * global state, so every toggle across the app stays in sync. Stops event
 * propagation so it works even when placed over a clickable card.
 */
export function IncomeEyeToggle({ className }: { className?: string }) {
  const { hidden, hide, requestReveal } = useIncomePrivacy();
  return (
    <button
      type="button"
      aria-label={hidden ? "Show income (PIN required)" : "Hide income"}
      title={hidden ? "Show income" : "Hide income"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hidden) requestReveal();
        else hide();
      }}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
