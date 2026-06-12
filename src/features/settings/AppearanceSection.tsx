import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/useSettings";
import type { AccentColor, Density, UserSettings } from "@/types";

const ACCENTS: { value: AccentColor; label: string; hex: string }[] = [
  { value: "green", label: "Green", hex: "#16a34a" },
  { value: "blue", label: "Blue", hex: "#2563eb" },
  { value: "purple", label: "Purple", hex: "#7c3aed" },
  { value: "orange", label: "Orange", hex: "#ea580c" },
];

const LANDING_PAGES = [
  { value: "/", label: "Dashboard" },
  { value: "/transactions", label: "Transactions" },
  { value: "/budgets", label: "Budgets" },
  { value: "/income", label: "Income" },
  { value: "/reports", label: "Reports" },
];

export function AppearanceSection() {
  const { settings, update } = useSettings();

  const save = async (patch: Partial<UserSettings>, label: string) => {
    try {
      await update(patch);
      toast.success(`${label} updated`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Accent color, density and layout. Light/dark theme is under
          Preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Accent color</Label>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {ACCENTS.map((accent) => (
              <button
                key={accent.value}
                type="button"
                aria-pressed={settings.accentColor === accent.value}
                onClick={() => save({ accentColor: accent.value }, "Accent color")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent",
                  settings.accentColor === accent.value &&
                    "ring-2 ring-foreground",
                )}
              >
                <span
                  aria-hidden
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: accent.hex }}
                />
                {accent.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Density</Label>
          <Select
            value={settings.density}
            onValueChange={(v) => save({ density: v as Density }, "Density")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comfortable">Comfortable</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Dashboard layout</Label>
          <Select
            value={settings.dashboardLayout}
            onValueChange={(v) =>
              save(
                { dashboardLayout: v as UserSettings["dashboardLayout"] },
                "Dashboard layout",
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Charts + widgets</SelectItem>
              <SelectItem value="compact">
                Stat cards &amp; widgets only
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Default landing page</Label>
          <Select
            value={settings.defaultLandingPage}
            onValueChange={(v) =>
              save({ defaultLandingPage: v }, "Default landing page")
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANDING_PAGES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
