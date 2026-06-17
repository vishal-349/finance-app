import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmis } from "@/hooks/useEmis";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useSettings } from "@/hooks/useSettings";
import { decodeSource, encodeSource } from "@/lib/source";
import { formatDisplayDate } from "@/lib/date";
import type { Emi, EmiInstallment } from "@/types";

/** Sentinel for the optional funding-source select (Radix disallows ""). */
const NONE = "none";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  emi: Emi | null;
  installment: EmiInstallment | null;
}

/**
 * Record (or edit/undo) a single EMI installment payment. Marking paid creates
 * a tagged expense at the installment slot's deterministic id, so it flows into
 * Net Cash, budgets, the monthly summary and the EMI-vs-Non-EMI split like any
 * other expense. Date/amount/funding source default to the schedule but are
 * editable for early/late or different-sized payments.
 */
export function MarkEmiPaidDialog({ open, onOpenChange, emi, installment }: Props) {
  const { markPaid, markUnpaid } = useEmis();
  const { active: accounts } = useAccounts();
  const { active: cards } = useCreditCards();
  const { money } = useSettings();

  const [payDate, setPayDate] = useState("");
  const [amount, setAmount] = useState("");
  const [sourceId, setSourceId] = useState(NONE);

  const isPaid = installment?.status === "paid";

  useEffect(() => {
    if (!open || !emi || !installment) return;
    setPayDate(installment.paidDate ?? installment.scheduledDate);
    setAmount(String(installment.paidAmount ?? emi.monthlyAmount));
    setSourceId(encodeSource(emi.accountId, emi.creditCardId) || NONE);
  }, [open, emi, installment]);

  if (!emi || !installment) return null;

  const amountNum = Number(amount);

  const save = async () => {
    if (!(amountNum > 0)) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    if (!payDate) {
      toast.error("Pick a payment date");
      return;
    }
    const { accountId, creditCardId } = decodeSource(sourceId === NONE ? "" : sourceId);
    try {
      await markPaid.mutateAsync({
        emi,
        input: {
          scheduledDate: installment.scheduledDate,
          payDate,
          amount: amountNum,
          accountId,
          creditCardId,
        },
      });
      toast.success(isPaid ? "Installment updated" : "Installment marked paid");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
    }
  };

  const unpay = async () => {
    try {
      await markUnpaid.mutateAsync({ emiId: emi.id, scheduledDate: installment.scheduledDate });
      toast.success("Payment removed");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isPaid ? "Edit installment payment" : "Record EMI payment"}</DialogTitle>
          <DialogDescription>
            {emi.name} · installment {installment.index + 1} of {emi.months} · scheduled{" "}
            {formatDisplayDate(installment.scheduledDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emi-pay-date">Payment date</Label>
              <Input
                id="emi-pay-date"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emi-pay-amount">Amount</Label>
              <Input
                id="emi-pay-amount"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Paid from</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {accounts.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Accounts</SelectLabel>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={`acct:${a.id}`}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {cards.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Credit cards</SelectLabel>
                    {cards.map((c) => (
                      <SelectItem key={c.id} value={`card:${c.id}`}>
                        {c.name} ·· {c.last4}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Records a {money(amountNum > 0 ? amountNum : emi.monthlyAmount)} EMI expense — tagged
              and reflected across every metric.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {isPaid ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={unpay}
              disabled={markUnpaid.isPending}
            >
              Remove payment
            </Button>
          ) : (
            <span />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={markPaid.isPending}>
              {isPaid ? "Save changes" : "Mark paid"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
