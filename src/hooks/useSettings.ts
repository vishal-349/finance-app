import { useContext } from "react";
import { SettingsContext } from "@/context/settings-context";

export function useSettings() {
  return useContext(SettingsContext);
}
