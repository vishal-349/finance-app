import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IncomePrivacyContext } from "./income-privacy-context";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryClient";
import { IncomePinDialog } from "@/components/shared/IncomePinDialog";
import type { UserSettings } from "@/types";

/**
 * App-wide "income hidden" state. Stored as an account setting (Firestore), so
 * the choice follows the user across devices/browsers, and gated behind their
 * PIN to reveal. One toggle masks income everywhere it's shown.
 */
export function IncomePrivacyProvider({ children }: { children: React.ReactNode }) {
  const { settings, loading, update } = useSettings();
  const { user } = useAuth();
  const uid = user?.uid;
  const qc = useQueryClient();
  const pin = settings.incomePin ?? "";

  // Account-synced source of truth. While settings load, default to hidden so
  // income never flashes visible before the saved preference is known.
  const hidden = loading ? true : (settings.incomeHidden ?? false);
  const [pinOpen, setPinOpen] = useState(false);

  const persistHidden = useCallback(
    (next: boolean) => {
      // Optimistically flip the cached setting for an instant toggle, then save.
      if (uid) {
        qc.setQueryData<UserSettings>(queryKeys.settings(uid), (prev) => ({
          ...(prev ?? settings),
          incomeHidden: next,
        }));
      }
      void update({ incomeHidden: next });
    },
    [qc, uid, update, settings],
  );

  const hide = useCallback(() => persistHidden(true), [persistHidden]);

  const requestReveal = useCallback(() => {
    if (pin.length === 0) {
      persistHidden(false);
      toast.info("Set an income PIN in Settings → Preferences to protect this.");
    } else {
      setPinOpen(true);
    }
  }, [pin, persistHidden]);

  return (
    <IncomePrivacyContext.Provider value={{ hidden, hide, requestReveal }}>
      {children}
      <IncomePinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        expectedPin={pin}
        onSuccess={() => {
          persistHidden(false);
          setPinOpen(false);
        }}
      />
    </IncomePrivacyContext.Provider>
  );
}
