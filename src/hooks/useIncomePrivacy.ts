import { useContext } from "react";
import { IncomePrivacyContext } from "@/context/income-privacy-context";

export function useIncomePrivacy() {
  return useContext(IncomePrivacyContext);
}
