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
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { todayISO } from "@/lib/date";
import type { SavingsGoal } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  goal: SavingsGoal | null;
}

/** Records a contribution as a `goal` transaction (debits the source account). */
export function GoalContributeDialog({ open, onOpenChange, goal }: Props) {
  const { active: accounts } = useAccounts();
  const { contribute } = useSavingsGoals();
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());

  useEffect(() => {
    if (!open) return;
    setAccountId("");
    setAmount("");
    setDate(todayISO());
  }, [open]);

  const submit = async () => {
    if (!goal) return;
    if (!accountId) {
      toast.error("Choose the account to contribute from");
      return;
    }
    const amt = Number(amount);
    if (!(amt > 0)) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    try {
      await contribute.mutateAsync({ goalId: goal.id, accountId, amount: amt, date });
      toast.success("Contribution added");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add contribution");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Contribute to {goal?.name}</DialogTitle>
          <DialogDescription>
            Moves money from an account into this goal. It's not counted as an
            expense — it's savings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>From account</Label>
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
              <Label htmlFor="contrib-amount">Amount</Label>
              <Input
                id="contrib-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contrib-date">Date</Label>
              <Input
                id="contrib-date"
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
          <Button onClick={submit} disabled={contribute.isPending}>
            Add contribution
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
