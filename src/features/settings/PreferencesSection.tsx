import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSettings } from "@/hooks/useSettings";
import { CURRENCIES } from "@/lib/format";
import type { ThemePreference } from "@/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function PreferencesSection() {
  const { settings, update } = useSettings();
  const [threshold, setThreshold] = useState(String(settings.largeExpenseThreshold));

  useEffect(() => {
    setThreshold(String(settings.largeExpenseThreshold));
  }, [settings.largeExpenseThreshold]);

  const save = async (patch: Parameters<typeof update>[0], label: string) => {
    try {
      await update(patch);
      toast.success(`${label} updated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const commitThreshold = () => {
    const value = Number(threshold);
    if (!Number.isFinite(value) || value < 0) {
      toast.error("Enter a valid threshold amount");
      setThreshold(String(settings.largeExpenseThreshold));
      return;
    }
    if (value !== settings.largeExpenseThreshold) {
      void save({ largeExpenseThreshold: value }, "Large expense threshold");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>Currency, theme and financial year.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Currency</Label>
          <Select
            value={settings.currency}
            onValueChange={(code) => {
              const c = CURRENCIES.find((x) => x.code === code);
              save({ currency: code, locale: c?.locale ?? settings.locale }, "Currency");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Theme</Label>
          <Select
            value={settings.theme}
            onValueChange={(v) => save({ theme: v as ThemePreference }, "Theme")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="large-threshold">Large expense threshold</Label>
          <Input
            id="large-threshold"
            type="number"
            inputMode="decimal"
            min={0}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            onBlur={commitThreshold}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <p className="text-xs text-muted-foreground">
            Expenses at or above this amount count as large expenses.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Financial year starts</Label>
          <Select
            value={String(settings.financialYearStartMonth)}
            onValueChange={(v) =>
              save({ financialYearStartMonth: Number(v) }, "Financial year")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tracking-start">Tracking start date</Label>
          <Input
            id="tracking-start"
            type="date"
            value={settings.trackingStartDate ?? ""}
            onChange={(e) => save({ trackingStartDate: e.target.value }, "Tracking start date")}
          />
          <p className="text-xs text-muted-foreground">
            When you began tracking. Transactions before this date (e.g. pre-existing
            EMI installments) count toward schedules and history but never reduce Net
            Cash, balances, or card dues. Leave empty to count everything.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
