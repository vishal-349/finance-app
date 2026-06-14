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
import { useSip } from "@/hooks/useSip";
import { useAccounts } from "@/hooks/useAccounts";
import { currentMonthKey } from "@/lib/date";
import type { SipInvestment, SipKind } from "@/types";

const KINDS: { value: SipKind; label: string }[] = [
  { value: "mutual_fund", label: "Mutual Fund" },
  { value: "stock", label: "Stock" },
  { value: "custom", label: "Custom" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: SipInvestment | null;
}

export function SipForm({ open, onOpenChange, editing }: Props) {
  const { create, update } = useSip();
  const { active: accounts } = useAccounts();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SipKind>("mutual_fund");
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    if (!open) return;
    setMonthKey(editing?.monthKey ?? currentMonthKey());
    setName(editing?.name ?? "");
    setKind(editing?.kind ?? "mutual_fund");
    setPlanned(editing ? String(editing.planned) : "");
    setActual(editing ? String(editing.actual) : "");
    setAccountId(editing?.accountId ?? accounts[0]?.id ?? "");
  }, [open, editing, accounts]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Enter an investment name");
      return;
    }
    const payload = {
      monthKey,
      name: name.trim(),
      kind,
      planned: Number(planned) || 0,
      actual: Number(actual) || 0,
      accountId: accountId || undefined,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: payload });
        toast.success("Investment updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Investment added");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit investment" : "Add investment"}</DialogTitle>
          <DialogDescription>
            Track a mutual fund, stock or custom investment for the month.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sip-month">Month</Label>
              <Input
                id="sip-month"
                type="month"
                value={monthKey}
                onChange={(e) => setMonthKey(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as SipKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sip-name">Name</Label>
            <Input
              id="sip-name"
              value={name}
              placeholder="e.g. Index Fund"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sip-planned">Planned</Label>
              <Input
                id="sip-planned"
                type="number"
                inputMode="decimal"
                value={planned}
                placeholder="0"
                onChange={(e) => setPlanned(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sip-actual">Actual</Label>
              <Input
                id="sip-actual"
                type="number"
                inputMode="decimal"
                value={actual}
                placeholder="0"
                onChange={(e) => setActual(e.target.value)}
              />
            </div>
          </div>
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
            <p className="text-xs text-muted-foreground">
              {accounts.length === 0
                ? "No accounts yet — add one in Settings → Accounts."
                : "The actual amount leaves this account's balance."}
            </p>
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
