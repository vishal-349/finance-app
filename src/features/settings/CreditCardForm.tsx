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
import { useCreditCards } from "@/hooks/useCreditCards";
import { cn } from "@/lib/utils";
import type { CreditCard } from "@/types";

const SWATCHES = [
  "#16a34a", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899",
  "#ef4444", "#f97316", "#eab308", "#14b8a6", "#64748b",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: CreditCard | null;
}

export function CreditCardForm({ open, onOpenChange, editing }: Props) {
  const { create, update } = useCreditCards();
  const [name, setName] = useState("");
  const [bankName, setBankName] = useState("");
  const [last4, setLast4] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [billingDay, setBillingDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setBankName(editing?.bankName ?? "");
    setLast4(editing?.last4 ?? "");
    setCreditLimit(editing ? String(editing.creditLimit) : "");
    setBillingDay(editing ? String(editing.billingDay) : "");
    setDueDay(editing ? String(editing.dueDay) : "");
    setColor(editing?.color ?? SWATCHES[0]);
  }, [open, editing]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Enter a card name");
      return;
    }
    if (!bankName.trim()) {
      toast.error("Enter the bank name");
      return;
    }
    if (!/^\d{4}$/.test(last4)) {
      toast.error("Last 4 digits must be exactly 4 numbers");
      return;
    }
    const limit = Number(creditLimit);
    if (!isFinite(limit) || limit <= 0) {
      toast.error("Enter a credit limit greater than 0");
      return;
    }
    const billing = Number(billingDay);
    if (!Number.isInteger(billing) || billing < 1 || billing > 31) {
      toast.error("Billing day must be between 1 and 31");
      return;
    }
    const due = Number(dueDay);
    if (!Number.isInteger(due) || due < 1 || due > 31) {
      toast.error("Due day must be between 1 and 31");
      return;
    }

    const payload = {
      name: name.trim(),
      bankName: bankName.trim(),
      last4,
      creditLimit: limit,
      billingDay: billing,
      dueDay: due,
      color,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: payload });
        toast.success("Card updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Card added");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save card");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit card" : "Add card"}</DialogTitle>
          <DialogDescription>
            Statement cycles and utilization are derived from the billing day and
            credit limit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cc-name">Card name</Label>
            <Input
              id="cc-name"
              autoFocus
              value={name}
              placeholder="e.g. Platinum Rewards"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cc-bank">Bank name</Label>
            <Input
              id="cc-bank"
              value={bankName}
              placeholder="e.g. HDFC Bank"
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-last4">Last 4 digits</Label>
              <Input
                id="cc-last4"
                inputMode="numeric"
                maxLength={4}
                value={last4}
                placeholder="1234"
                onChange={(e) => setLast4(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-limit">Credit limit</Label>
              <Input
                id="cc-limit"
                type="number"
                inputMode="decimal"
                value={creditLimit}
                placeholder="0"
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cc-billing">Billing day</Label>
              <Input
                id="cc-billing"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={billingDay}
                placeholder="1-31"
                onChange={(e) => setBillingDay(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cc-due">Due day</Label>
              <Input
                id="cc-due"
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                value={dueDay}
                placeholder="1-31"
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={`Color ${s}`}
                  onClick={() => setColor(s)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition",
                    color === s ? "border-foreground" : "border-transparent",
                  )}
                  style={{ backgroundColor: s }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending}>
            {editing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
