import { createContext } from "react";

export interface IncomePrivacyContextValue {
  /** Whether income amounts are currently masked across the app. */
  hidden: boolean;
  /** Mask income immediately (no PIN needed to hide). */
  hide: () => void;
  /** Request reveal — prompts for the PIN when one is set, else reveals. */
  requestReveal: () => void;
}

export const IncomePrivacyContext = createContext<IncomePrivacyContextValue>({
  hidden: false,
  hide: () => {},
  requestReveal: () => {},
});
