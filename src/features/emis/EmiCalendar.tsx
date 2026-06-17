import { useMemo, useState } from "react";
import { getDay, getDaysInMonth, startOfMonth } from "date-fns";
import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSettings } from "@/hooks/useSettings";
import { emiActiveInMonth } from "@/lib/derive";
import {
  currentMonthKey,
  formatDisplayDate,
  formatMonthKey,
  monthKeyToDate,
  nextMonthKey,
  occurrenceAt,
  prevMonthKey,
  todayISO,
} from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Emi, EmiInstallment, EmiProgress } from "@/types";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface MonthInstallment {
  emi: Emi;
  date: string;
}

interface Props {
  progress: EmiProgress[];
  installmentsFor: (emi: Emi) => EmiInstallment[];
  onSelectInstallment: (emi: Emi, installment: EmiInstallment) => void;
}

export function EmiCalendar({ progress, installmentsFor, onSelectInstallment }: Props) {
  const { money } = useSettings();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const today = todayISO();

  /** Every installment of a non-stopped EMI that lands in the viewed month. */
  const installments = useMemo(() => {
    const items: MonthInstallment[] = [];
    for (const p of progress) {
      const emi = p.emi;
      if (emi.status === "stopped") continue;
      if (!emiActiveInMonth(emi, monthKey)) continue;
      for (let k = 0; k < emi.months; k++) {
        const occ = occurrenceAt(emi.startDate, "monthly", k);
        const m = occ.slice(0, 7);
        if (m > monthKey) break;
        if (m === monthKey) items.push({ emi, date: occ });
      }
    }
    return items.sort(
      (a, b) => a.date.localeCompare(b.date) || a.emi.name.localeCompare(b.emi.name),
    );
  }, [progress, monthKey]);

  /** ISO date → total EMI outgo due that day. */
  const totalByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of installments) {
      map.set(it.date, (map.get(it.date) ?? 0) + it.emi.monthlyAmount);
    }
    return map;
  }, [installments]);

  const firstOfMonth = startOfMonth(monthKeyToDate(monthKey));
  const daysInMonth = getDaysInMonth(firstOfMonth);
  // Monday-first grid: getDay() is 0 = Sunday.
  const leadingBlanks = (getDay(firstOfMonth) + 6) % 7;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Previous month"
              onClick={() => setMonthKey((k) => prevMonthKey(k))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm font-semibold">{formatMonthKey(monthKey)}</p>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              aria-label="Next month"
              onClick={() => setMonthKey((k) => nextMonthKey(k))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-1 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const iso = `${monthKey}-${String(day).padStart(2, "0")}`;
              const total = totalByDay.get(iso);
              const isToday = iso === today;
              return (
                <div
                  key={iso}
                  className={cn(
                    "flex min-h-12 flex-col items-center gap-0.5 rounded-md p-1 text-xs",
                    total !== undefined && "bg-primary/10",
                    isToday && "ring-2 ring-primary",
                  )}
                >
                  <span
                    className={cn(
                      "font-medium",
                      total === undefined && "text-muted-foreground",
                    )}
                  >
                    {day}
                  </span>
                  {total !== undefined && (
                    <span className="break-all text-center text-[10px] font-semibold leading-tight text-primary tabular-nums">
                      {money(total)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Installments in {formatMonthKey(monthKey)}
        </p>
        {installments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No installments this month.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {installments.map((it) => {
              const slot = installmentsFor(it.emi).find(
                (i) => i.scheduledDate === it.date,
              );
              const status = slot?.status ?? "upcoming";
              return (
                <button
                  type="button"
                  key={`${it.emi.id}-${it.date}`}
                  onClick={() => slot && onSelectInstallment(it.emi, slot)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {status === "paid" && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{it.emi.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDisplayDate(it.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {status === "due" && <Badge variant="warning">Due</Badge>}
                    <span className="font-semibold tabular-nums">
                      {money(slot?.paidAmount ?? it.emi.monthlyAmount)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
