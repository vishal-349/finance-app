import { createContext } from "react";
import type { MonthKey } from "@/types";
import { currentMonthKey } from "@/lib/date";

export interface MonthContextValue {
  monthKey: MonthKey;
  setMonthKey: (key: MonthKey) => void;
}

export const MonthContext = createContext<MonthContextValue>({
  monthKey: currentMonthKey(),
  setMonthKey: () => {},
});
