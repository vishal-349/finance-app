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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRecurringRules } from "@/hooks/useRecurring";
import { useCategories } from "@/hooks/useCategories";
import { useIncomeSources } from "@/hooks/useIncomeSources";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useCreditCards } from "@/hooks/useCreditCards";
import { isCreditCardMethod } from "@/services/creditCards";
import { todayISO } from "@/lib/date";
import type { Frequency, RecurringRule, TransactionType } from "@/types";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

/** Sentinel for "no payment method" — shadcn Select items can't be empty strings. */
const NONE = "none";

interface RecurringFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Rule to edit; omit for a new one. */
  editing?: RecurringRule | null;
}

export function RecurringForm({ open, onOpenChange, editing }: RecurringFormProps) {
  const { create, update } = useRecurringRules();
  const { activeExpense } = useCategories();
  const { active: incomeSources } = useIncomeSources();
  const { active: paymentMethods } = usePaymentMethods();
  const { active: creditCards } = useCreditCards();

  const [type, setType] = useState<TransactionType>("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [incomeSourceId, setIncomeSourceId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [creditCardId, setCreditCardId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setType(editing?.type ?? "expense");
    setName(editing?.name ?? "");
    setAmount(editing ? String(editing.amount) : "");
    setFrequency(editing?.frequency ?? "monthly");
    setStartDate(editing?.startDate ?? todayISO());
    setEndDate(editing?.endDate ?? "");
    setCategoryId(editing?.categoryId ?? "");
    setIncomeSourceId(editing?.incomeSourceId ?? "");
    setPaymentMethodId(editing?.paymentMethodId ?? "");
    setCreditCardId(editing?.creditCardId ?? "");
    setMerchant(editing?.merchant ?? "");
    setNote(editing?.note ?? "");
  }, [open, editing]);

  const selectedMethod = paymentMethods.find((p) => p.id === paymentMethodId);
  const showCardSelect = !!selectedMethod && isCreditCardMethod(selectedMethod);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Enter a name for the rule");
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    if (!startDate) {
      toast.error("Pick a start date");
      return;
    }
    if (endDate && endDate < startDate) {
      toast.error("End date must be on or after the start date");
      return;
    }
    if (type === "expense" && !categoryId) {
      toast.error("Choose a category");
      return;
    }
    if (type === "income" && !incomeSourceId) {
      toast.error("Choose an income source");
      return;
    }

    // All fields, with undefined for cleared optionals — updates must clear them.
    const payload = {
      name: name.trim(),
      amount: amt,
      type,
      frequency,
      startDate,
      endDate: endDate || undefined,
      categoryId: type === "expense" ? categoryId : undefined,
      incomeSourceId: type === "income" ? incomeSourceId : undefined,
      paymentMethodId: paymentMethodId || undefined,
      creditCardId: showCardSelect && creditCardId ? creditCardId : undefined,
      merchant: merchant.trim() || undefined,
      note: note.trim() || undefined,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: payload });
        toast.success("Rule updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Rule added");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save rule");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit rule" : "Add rule"}</DialogTitle>
          <DialogDescription>
            Occurrences are added automatically — past dates since the start are
            backfilled; edits only affect future occurrences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-1.5">
            <Label htmlFor="rec-name">Name</Label>
            <Input
              id="rec-name"
              value={name}
              placeholder="e.g. Rent, streaming subscription"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-amount">Amount</Label>
              <Input
                id="rec-amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                value={amount}
                placeholder="0.00"
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as Frequency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-start">Start date</Label>
              <Input
                id="rec-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-end">End date</Label>
              <Input
                id="rec-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Empty = open-ended</p>
            </div>
          </div>

          {type === "expense" ? (
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {activeExpense.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Income source</Label>
              <Select value={incomeSourceId} onValueChange={setIncomeSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select income source" />
                </SelectTrigger>
                <SelectContent>
                  {incomeSources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Select
                value={paymentMethodId || NONE}
                onValueChange={(v) => setPaymentMethodId(v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {paymentMethods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-merchant">Merchant</Label>
              <Input
                id="rec-merchant"
                value={merchant}
                placeholder="Optional"
                onChange={(e) => setMerchant(e.target.value)}
              />
            </div>
          </div>

          {showCardSelect && (
            <div className="space-y-1.5">
              <Label>Credit card</Label>
              <Select value={creditCardId} onValueChange={setCreditCardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select card" />
                </SelectTrigger>
                <SelectContent>
                  {creditCards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ·· {c.last4}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="rec-note">Note</Label>
            <Textarea
              id="rec-note"
              value={note}
              placeholder="Optional note"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending}>
            {editing ? "Save changes" : "Add rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
