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
import { useSavingsGoals } from "@/hooks/useSavingsGoals";
import { cn } from "@/lib/utils";
import type { SavingsGoal } from "@/types";

const SWATCHES = [
  "#16a34a", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899",
  "#ef4444", "#f97316", "#eab308", "#14b8a6", "#64748b",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: SavingsGoal | null;
}

export function GoalForm({ open, onOpenChange, editing }: Props) {
  const { create, update } = useSavingsGoals();
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setTargetAmount(editing ? String(editing.targetAmount) : "");
    setTargetDate(editing?.targetDate ?? "");
    setColor(editing?.color ?? SWATCHES[0]);
    setNote(editing?.note ?? "");
  }, [open, editing]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Enter a goal name");
      return;
    }
    const target = Number(targetAmount);
    if (!(target > 0)) {
      toast.error("Enter a target amount greater than 0");
      return;
    }

    const payload = {
      name: name.trim(),
      targetAmount: target,
      targetDate: targetDate || undefined,
      color,
      note: note.trim() || undefined,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: payload });
        toast.success("Goal updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Goal created");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save goal");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit goal" : "New savings goal"}</DialogTitle>
          <DialogDescription>
            Set a target. Saved progress is derived from your contributions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Goal name</Label>
            <Input
              id="goal-name"
              autoFocus
              value={name}
              placeholder="e.g. New Phone"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-target">Target amount</Label>
              <Input
                id="goal-target"
                type="number"
                inputMode="decimal"
                value={targetAmount}
                placeholder="0"
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Target date (optional)</Label>
              <Input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
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
          <div className="space-y-1.5">
            <Label htmlFor="goal-note">Note</Label>
            <Textarea
              id="goal-note"
              placeholder="Optional note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.isPending || update.isPending}>
            {editing ? "Save" : "Create goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
