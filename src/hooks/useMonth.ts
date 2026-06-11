import { useContext } from "react";
import { MonthContext } from "@/context/month-context";

export function useMonth() {
  return useContext(MonthContext);
}
