import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useCategories } from "@/hooks/useCategories";
import { decodeSource, encodeSource } from "@/lib/source";
import { todayISO } from "@/lib/date";
import type { Subscription, SubscriptionFrequency } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Subscription | null;
}

export function SubscriptionForm({ open, onOpenChange, editing }: Props) {
  const { create, update } = useSubscriptions();
  const { active: accounts } = useAccounts();
  const { active: cards } = useCreditCards();
  const { activeExpense } = useCategories();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<SubscriptionFrequency>("monthly");
  const [startDate, setStartDate] = useState(todayISO());
  const [sourceId, setSourceId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setAmount(editing ? String(editing.amount) : "");
    setFrequency(editing?.frequency ?? "monthly");
    setStartDate(editing?.startDate ?? todayISO());
    setSourceId(encodeSource(editing?.accountId, editing?.creditCardId));
    setCategoryId(editing?.categoryId ?? "");
    setAutoRenew(editing ? editing.autoRenew : true);
    setNote(editing?.note ?? "");
  }, [open, editing]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Enter the subscription name");
      return;
    }
    const amt = Number(amount);
    if (!(amt > 0)) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    const { accountId, creditCardId } = decodeSource(sourceId);
    if (!accountId && !creditCardId) {
      toast.error("Choose a funding source");
      return;
    }

    const payload = {
      name: name.trim(),
      service: name.trim(),
      amount: amt,
      frequency,
      startDate,
      accountId,
      creditCardId,
      categoryId: categoryId || undefined,
      autoRenew,
      note: note.trim() || undefined,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: payload });
        toast.success("Subscription updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Subscription added");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save subscription");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit subscription" : "Add subscription"}</DialogTitle>
          <DialogDescription>
            Auto-renewing subscriptions are recorded automatically each cycle.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sub-name">Name</Label>
            <Input
              id="sub-name"
              autoFocus
              value={name}
              placeholder="e.g. Netflix"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <Tabs value={frequency} onValueChange={(v) => setFrequency(v as SubscriptionFrequency)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-amount">Amount</Label>
              <Input
                id="sub-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-start">Start / next charge</Label>
              <Input
                id="sub-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Pay from</Label>
            <Select value={sourceId} onValueChange={setSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Account or card" />
              </SelectTrigger>
              <SelectContent>
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
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
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

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="sub-autorenew">Auto-renew</Label>
              <p className="text-xs text-muted-foreground">
                Record the charge automatically each cycle.
              </p>
            </div>
            <Switch id="sub-autorenew" checked={autoRenew} onCheckedChange={setAutoRenew} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-note">Note</Label>
            <Input
              id="sub-note"
              value={note}
              placeholder="Optional"
              onChange={(e) => setNote(e.target.value)}
            />
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
