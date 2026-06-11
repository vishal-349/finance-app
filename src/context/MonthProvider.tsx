import { useState } from "react";
import { currentMonthKey } from "@/lib/date";
import { MonthContext } from "./month-context";

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  return (
    <MonthContext.Provider value={{ monthKey, setMonthKey }}>
      {children}
    </MonthContext.Provider>
  );
}
