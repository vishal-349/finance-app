import { useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserSettings } from "@/types";
import {
  DEFAULT_SETTINGS,
  getUserSettings,
  saveUserSettings,
} from "@/services/settings";
import { formatCurrency } from "@/lib/format";
import { queryKeys } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { SettingsContext } from "./settings-context";

function applyTheme(theme: UserSettings["theme"]) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", dark);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const qc = useQueryClient();

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey: uid ? queryKeys.settings(uid) : ["settings", "anon"],
    queryFn: () => getUserSettings(uid as string),
    enabled: !!uid,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<UserSettings>) =>
      saveUserSettings(uid as string, patch),
    onSuccess: (_data, patch) => {
      if (uid) {
        qc.setQueryData<UserSettings>(queryKeys.settings(uid), (prev) => ({
          ...(prev ?? DEFAULT_SETTINGS),
          ...patch,
        }));
      }
    },
  });

  useEffect(() => {
    applyTheme(settings.theme);
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(settings.theme);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [settings.theme]);

  // Personalization: accent + density are plain data attributes consumed by
  // CSS variable overrides in index.css.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.accent = settings.accentColor;
    root.dataset.density = settings.density;
  }, [settings.accentColor, settings.density]);

  const update = useCallback(
    (patch: Partial<UserSettings>) => mutation.mutateAsync(patch),
    [mutation],
  );

  const money = useCallback(
    (amount: number) => formatCurrency(amount, settings.currency, settings.locale),
    [settings.currency, settings.locale],
  );

  return (
    <SettingsContext.Provider value={{ settings, loading: isLoading, update, money }}>
      {children}
    </SettingsContext.Provider>
  );
}
