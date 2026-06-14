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
import { useEmergencyFunds } from "@/hooks/useEmergencyFunds";
import { useAccounts } from "@/hooks/useAccounts";
import { currentMonthKey } from "@/lib/date";
import type { EmergencyFund } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: EmergencyFund | null;
}

export function EmergencyFundForm({ open, onOpenChange, editing }: Props) {
  const { upsert } = useEmergencyFunds();
  const { active: accounts } = useAccounts();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    if (!open) return;
    setMonthKey(editing?.monthKey ?? currentMonthKey());
    setPlanned(editing ? String(editing.planned) : "");
    setActual(editing ? String(editing.actual) : "");
    setAccountId(editing?.accountId ?? accounts[0]?.id ?? "");
  }, [open, editing, accounts]);

  const submit = async () => {
    try {
      await upsert.mutateAsync({
        monthKey,
        planned: Number(planned) || 0,
        actual: Number(actual) || 0,
        accountId: accountId || undefined,
      });
      toast.success(editing ? "Entry updated" : "Entry added");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit entry" : "Add monthly saving"}</DialogTitle>
          <DialogDescription>
            Log your planned and actual emergency-fund saving for the month.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ef-month">Month</Label>
            <Input
              id="ef-month"
              type="month"
              value={monthKey}
              disabled={!!editing}
              onChange={(e) => setMonthKey(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ef-planned">Planned saving</Label>
              <Input
                id="ef-planned"
                type="number"
                inputMode="decimal"
                value={planned}
                placeholder="0"
                onChange={(e) => setPlanned(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ef-actual">Actual saved</Label>
              <Input
                id="ef-actual"
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
          <Button onClick={submit} disabled={upsert.isPending}>
            {editing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
