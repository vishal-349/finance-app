import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEmergencyFunds } from "@/hooks/useEmergencyFunds";
import { currentMonthKey } from "@/lib/date";
import type { EmergencyFund } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: EmergencyFund | null;
}

export function EmergencyFundForm({ open, onOpenChange, editing }: Props) {
  const { upsert } = useEmergencyFunds();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");

  useEffect(() => {
    if (!open) return;
    setMonthKey(editing?.monthKey ?? currentMonthKey());
    setPlanned(editing ? String(editing.planned) : "");
    setActual(editing ? String(editing.actual) : "");
  }, [open, editing]);

  const submit = async () => {
    try {
      await upsert.mutateAsync({
        monthKey,
        planned: Number(planned) || 0,
        actual: Number(actual) || 0,
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
