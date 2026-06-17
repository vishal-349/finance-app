import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard as CreditCardIcon,
  Flame,
  Landmark,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtilizationBar } from "@/components/shared/UtilizationBar";
import { useMemo } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useEmis } from "@/hooks/useEmis";
import { useCardStats } from "@/hooks/useCreditCards";
import { useCategoryMap } from "@/hooks/useCategories";
import {
  emiActiveInMonth,
  emiCategoryIdSet,
  largeExpenseSummary,
  splitEmiExpenses,
} from "@/lib/derive";
import { formatDisplayDate } from "@/lib/date";
import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Emi, EmiInstallment, MonthKey, Transaction } from "@/types";

/**
 * Dashboard module widgets: Large Expenses, EMI burden + upcoming payments,
 * Credit-card spend/utilization, and the EMI vs non-EMI split. Every card
 * deep-links to its module; sub-rows deep-link to the exact record.
 */
export function ModuleWidgets({
  monthKey,
  transactions,
}: {
  monthKey: MonthKey;
  transactions: Transaction[];
}) {
  const { settings, money } = useSettings();
  const { all: emis, installmentsFor } = useEmis();
  const { stats: cardStats } = useCardStats();
  const categoryMap = useCategoryMap();
  const emiCategoryIds = useMemo(
    () => emiCategoryIdSet([...categoryMap.values()]),
    [categoryMap],
  );

  const large = largeExpenseSummary(transactions, settings.largeExpenseThreshold);
  // Only EMIs with an installment in the selected month — so the count and the
  // listed dates always agree with the burden amount (a loan that starts a
  // later month is excluded from "this month").
  const dueThisMonth = emis
    .filter((e) => e.status !== "stopped" && emiActiveInMonth(e, monthKey))
    .map((e) => ({
      emi: e,
      slot: installmentsFor(e).find((i) => i.scheduledDate.slice(0, 7) === monthKey),
    }))
    .filter((x): x is { emi: Emi; slot: EmiInstallment } => !!x.slot)
    .sort((a, b) => (a.slot.scheduledDate < b.slot.scheduledDate ? -1 : 1));
  const emiBurden = dueThisMonth.reduce((a, x) => a + x.emi.monthlyAmount, 0);
  const totalCardSpend = cardStats.reduce((a, s) => a + s.monthSpend, 0);
  const split = splitEmiExpenses(transactions, emiCategoryIds);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Large expenses this month */}
      <WidgetCard title="Large Expenses" icon={<Flame className="h-4 w-4" />} to="/large-expenses">
        <p className="text-xl font-bold tabular-nums">{money(large.total)}</p>
        <p className="text-xs text-muted-foreground">
          {large.count} this month · over {money(settings.largeExpenseThreshold)}
        </p>
      </WidgetCard>

      {/* EMI burden + upcoming */}
      <WidgetCard title="EMI Burden" icon={<Landmark className="h-4 w-4" />} to="/emis">
        <p className="text-xl font-bold tabular-nums">{money(emiBurden)}</p>
        <p className="text-xs text-muted-foreground">
          {dueThisMonth.length} {dueThisMonth.length === 1 ? "EMI" : "EMIs"} this month
        </p>
        {dueThisMonth.length > 0 && (
          <ul className="mt-2 space-y-1 border-t pt-2">
            {dueThisMonth.slice(0, 3).map(({ emi, slot }) => (
              <DrillRow key={emi.id} to={`/emis?focus=${emi.id}`}>
                <span className="flex min-w-0 items-center gap-1 text-muted-foreground">
                  {slot.status === "paid" ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
                  ) : (
                    <CalendarClock className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">{emi.name}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatDisplayDate(slot.scheduledDate)}
                </span>
              </DrillRow>
            ))}
          </ul>
        )}
      </WidgetCard>

      {/* Card spend + utilization */}
      <WidgetCard
        title="Card Spend"
        icon={<CreditCardIcon className="h-4 w-4" />}
        to="/credit-cards"
      >
        <p className="text-xl font-bold tabular-nums">{money(totalCardSpend)}</p>
        <p className="text-xs text-muted-foreground">
          {cardStats.length === 0
            ? "No cards yet — add one in Credit Cards"
            : "this month across cards"}
        </p>
        {cardStats.slice(0, 3).map((s) => (
          <DrillRow key={s.card.id} to={`/credit-cards?card=${s.card.id}`} className="mt-2 block">
            <div className="w-full space-y-1">
              <div className="flex justify-between text-xs">
                <span className="truncate text-muted-foreground">
                  {s.card.name} ·· {s.card.last4}
                </span>
                <span className="tabular-nums">{formatPercent(s.utilization)}</span>
              </div>
              <UtilizationBar
                utilization={s.utilization}
                status={s.utilization > 0.9 ? "over" : s.utilization >= 0.3 ? "warning" : "safe"}
              />
            </div>
          </DrillRow>
        ))}
      </WidgetCard>

      {/* EMI vs non-EMI split */}
      <WidgetCard title="EMI vs Non-EMI" icon={<Landmark className="h-4 w-4" />} to="/reports">
        {split.total === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No expenses yet this month.
          </p>
        ) : (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">EMI {formatPercent(split.emiShare)}</span>
              <span className="tabular-nums">{money(split.emiTotal)}</span>
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-muted-foreground">
                Non-EMI {formatPercent(1 - split.emiShare)}
              </span>
              <span className="tabular-nums">{money(split.nonEmiTotal)}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-[#6366f1]"
                style={{ width: `${Math.min(100, split.emiShare * 100)}%` }}
              />
            </div>
          </>
        )}
      </WidgetCard>
    </div>
  );
}

/**
 * Clickable widget shell. The whole card navigates to `to`; it's a div (not an
 * anchor) so inner DrillRow buttons can deep-link to specific records without
 * nesting anchors. The header arrow keeps a clear affordance.
 */
function WidgetCard({
  title,
  icon,
  to,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  to: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <Card
      interactive
      role="link"
      tabIndex={0}
      onClick={() => navigate(to)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(to);
        }
      }}
      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          <ArrowRight className="h-4 w-4" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

/** A sub-row inside a widget that deep-links to a specific record. */
function DrillRow({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate(to);
      }}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded text-left text-xs transition-colors hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
