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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useSettings } from "@/hooks/useSettings";
import { currentMonthKey, todayISO } from "@/lib/date";
import type { CreditCard } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  card: CreditCard | null;
  outstanding: number;
}

/**
 * Records a credit-card bill payment as a `cc_payment` transaction: it debits a
 * source account and reduces the card's outstanding. It is NOT a new expense.
 */
export function PayBillDialog({ open, onOpenChange, card, outstanding }: Props) {
  const { active: accounts } = useAccounts();
  const { create } = useTransactions(currentMonthKey());
  const { money } = useSettings();

  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (!open) return;
    setAccountId("");
    setAmount(outstanding > 0 ? outstanding.toFixed(2) : "");
    setDate(todayISO());
  }, [open, outstanding]);

  const submit = async () => {
    if (!card) return;
    if (!accountId) {
      toast.error("Choose the account to pay from");
      return;
    }
    const amt = Number(amount);
    if (!(amt > 0)) {
      toast.error("Enter a payment amount greater than 0");
      return;
    }
    try {
      await create.mutateAsync({
        type: "cc_payment",
        date,
        amount: amt,
        accountId,
        creditCardId: card.id,
        note: `Bill payment · ${card.name}`,
      });
      toast.success("Bill payment recorded");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pay {card?.name} bill</DialogTitle>
          <DialogDescription>
            Moves money from an account to clear the card. It reduces the card's
            outstanding and is not counted as a new expense.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current outstanding</span>
              <span className="font-semibold tabular-nums">{money(outstanding)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Pay from</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accounts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No accounts yet — add one in Settings → Accounts.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-date">Date</Label>
              <Input
                id="pay-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            Pay bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
