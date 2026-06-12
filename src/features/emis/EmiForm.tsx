import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useEmis } from "@/hooks/useEmis";
import { useCategories } from "@/hooks/useCategories";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useSettings } from "@/hooks/useSettings";
import { emiEndDate } from "@/services/emis";
import { formatDisplayDate, todayISO } from "@/lib/date";
import type { Emi, EmiType } from "@/types";

/** Display labels for each EMI type (shared with the EMIs page). */
export const EMI_TYPE_LABELS: Record<EmiType, string> = {
  credit_card: "Credit Card EMI",
  personal_loan: "Personal Loan",
  car_loan: "Car Loan",
  home_loan: "Home Loan",
  custom: "Custom",
};

const EMI_TYPES = Object.entries(EMI_TYPE_LABELS) as [EmiType, string][];

/** Sentinel for the optional selects (Radix Select disallows empty values). */
const NONE = "none";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Emi | null;
}

export function EmiForm({ open, onOpenChange, editing }: Props) {
  const { create, update } = useEmis();
  const { activeExpense } = useCategories();
  const { active: cards } = useCreditCards();
  const { money } = useSettings();

  const [name, setName] = useState("");
  const [emiType, setEmiType] = useState<EmiType>("credit_card");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [months, setMonths] = useState("");
  const [categoryId, setCategoryId] = useState(NONE);
  const [creditCardId, setCreditCardId] = useState(NONE);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setEmiType(editing?.emiType ?? "credit_card");
    setMonthlyAmount(editing ? String(editing.monthlyAmount) : "");
    setStartDate(editing?.startDate ?? todayISO());
    setMonths(editing ? String(editing.months) : "");
    setCategoryId(editing?.categoryId ?? NONE);
    setCreditCardId(editing?.creditCardId ?? NONE);
    setNote(editing?.note ?? "");
  }, [open, editing]);

  const amountNum = Number(monthlyAmount);
  const monthsNum = Math.floor(Number(months));
  const showSummary = !!startDate && amountNum > 0 && monthsNum >= 1;

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Enter an EMI name");
      return;
    }
    if (!(amountNum > 0)) {
      toast.error("Enter a monthly amount greater than 0");
      return;
    }
    if (!startDate) {
      toast.error("Pick a start date");
      return;
    }
    if (monthsNum < 1) {
      toast.error("Months must be at least 1");
      return;
    }
    // NOTE: startDate + months are ALWAYS included so the stored endDate stays
    // consistent when editing (updateEmi recomputes it from this pair).
    const payload = {
      name: name.trim(),
      emiType,
      monthlyAmount: amountNum,
      startDate,
      months: monthsNum,
      categoryId: categoryId === NONE ? undefined : categoryId,
      creditCardId: creditCardId === NONE ? undefined : creditCardId,
      note: note.trim() || undefined,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: payload });
        toast.success("EMI updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("EMI added");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save EMI");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit EMI" : "Add EMI"}</DialogTitle>
          <DialogDescription>
            Plan an installment schedule. Monthly installments are recorded
            automatically — past installments since the start date are
            backfilled for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="emi-name">Name</Label>
            <Input
              id="emi-name"
              value={name}
              placeholder="e.g. iPhone EMI"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>EMI type</Label>
              <Select value={emiType} onValueChange={(v) => setEmiType(v as EmiType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMI_TYPES.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emi-amount">Monthly amount</Label>
              <Input
                id="emi-amount"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emi-start">Start date</Label>
              <Input
                id="emi-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emi-months">Months</Label>
              <Input
                id="emi-months"
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="e.g. 12"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {activeExpense.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Linked credit card</Label>
              <Select value={creditCardId} onValueChange={setCreditCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ·· {c.last4}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emi-note">Note</Label>
            <Textarea
              id="emi-note"
              placeholder="Optional note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {showSummary && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground tabular-nums">
              {monthsNum} installments of {money(amountNum)} ={" "}
              {money(amountNum * monthsNum)}, last installment{" "}
              {formatDisplayDate(emiEndDate(startDate, monthsNum))}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending}>
            {editing ? "Save" : "Add EMI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
