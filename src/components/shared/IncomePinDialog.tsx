import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  expectedPin: string;
  onSuccess: () => void;
}

/** Prompts for the income PIN; reveals income only on an exact match. */
export function IncomePinDialog({ open, onOpenChange, expectedPin, onSuccess }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setError(false);
    }
  }, [open]);

  const submit = () => {
    if (pin === expectedPin && expectedPin.length > 0) {
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> Enter PIN
          </DialogTitle>
          <DialogDescription>Enter your 4-character PIN to reveal income.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="income-pin" className="sr-only">
            Income PIN
          </Label>
          <Input
            id="income-pin"
            type="password"
            inputMode="text"
            autoFocus
            maxLength={4}
            value={pin}
            placeholder="••••"
            className="text-center text-lg tracking-[0.5em]"
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          {error && <p className="text-xs text-destructive">Incorrect PIN. Try again.</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pin.length === 0}>
            Reveal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
