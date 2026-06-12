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
import { cn } from "@/lib/utils";
import type { Account, AccountType } from "@/types";

const SWATCHES = [
  "#16a34a", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899",
  "#ef4444", "#f97316", "#eab308", "#14b8a6", "#64748b",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Account | null;
}

export function AccountForm({ open, onOpenChange, editing }: Props) {
  const { create, update } = useAccounts();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [openingBalance, setOpeningBalance] = useState("");
  const [institution, setInstitution] = useState("");
  const [last4, setLast4] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setType(editing?.type ?? "bank");
    setOpeningBalance(editing ? String(editing.openingBalance) : "");
    setInstitution(editing?.institution ?? "");
    setLast4(editing?.last4 ?? "");
    setColor(editing?.color ?? SWATCHES[0]);
  }, [open, editing]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Enter an account name");
      return;
    }
    const opening = openingBalance.trim() === "" ? 0 : Number(openingBalance);
    if (!isFinite(opening)) {
      toast.error("Opening balance must be a number");
      return;
    }
    if (last4 && !/^\d{4}$/.test(last4)) {
      toast.error("Last 4 digits must be exactly 4 numbers");
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      openingBalance: opening,
      institution: institution.trim() || undefined,
      last4: last4.trim() || undefined,
      color,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: payload });
        toast.success("Account updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Account added");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit account" : "Add account"}</DialogTitle>
          <DialogDescription>
            A bank account or cash wallet. The balance is derived from its
            transactions starting from the opening balance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Name</Label>
              <Input
                id="acc-name"
                autoFocus
                value={name}
                placeholder="e.g. HDFC Savings"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank account</SelectItem>
                  <SelectItem value="cash">Cash wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-opening">Opening balance</Label>
              <Input
                id="acc-opening"
                type="number"
                inputMode="decimal"
                value={openingBalance}
                placeholder="0"
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-inst">Institution (optional)</Label>
              <Input
                id="acc-inst"
                value={institution}
                placeholder="e.g. HDFC"
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>
          </div>

          {type === "bank" && (
            <div className="space-y-1.5">
              <Label htmlFor="acc-last4">Last 4 digits (optional)</Label>
              <Input
                id="acc-last4"
                inputMode="numeric"
                maxLength={4}
                value={last4}
                placeholder="1234"
                onChange={(e) => setLast4(e.target.value)}
              />
            </div>
          )}

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
