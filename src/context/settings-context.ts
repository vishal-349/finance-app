import { createContext } from "react";
import type { UserSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/services/settings";

export interface SettingsContextValue {
  settings: UserSettings;
  loading: boolean;
  update: (patch: Partial<UserSettings>) => Promise<void>;
  /** Format an amount using the user's currency + locale. */
  money: (amount: number) => string;
}

export const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: false,
  update: async () => {},
  money: (a) => String(a),
});
