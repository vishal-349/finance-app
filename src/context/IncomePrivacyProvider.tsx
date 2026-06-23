import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { IncomePrivacyContext } from "./income-privacy-context";
import { useSettings } from "@/hooks/useSettings";
import { IncomePinDialog } from "@/components/shared/IncomePinDialog";

const STORAGE_KEY = "fintrack:incomeHidden";

/**
 * Holds the app-wide "income hidden" state (persisted, so it survives reloads)
 * and gates revealing it behind the user's PIN. One toggle masks income
 * everywhere it's shown.
 */
export function IncomePrivacyProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const pin = settings.incomePin ?? "";

  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [pinOpen, setPinOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, hidden ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [hidden]);

  const hide = useCallback(() => setHidden(true), []);

  const requestReveal = useCallback(() => {
    if (pin.length === 0) {
      // No PIN configured — reveal directly and nudge the user to set one.
      setHidden(false);
      toast.info("Set an income PIN in Settings → Preferences to protect this.");
    } else {
      setPinOpen(true);
    }
  }, [pin]);

  const value = useMemo(() => ({ hidden, hide, requestReveal }), [hidden, hide, requestReveal]);

  return (
    <IncomePrivacyContext.Provider value={value}>
      {children}
      <IncomePinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        expectedPin={pin}
        onSuccess={() => {
          setHidden(false);
          setPinOpen(false);
        }}
      />
    </IncomePrivacyContext.Provider>
  );
}
