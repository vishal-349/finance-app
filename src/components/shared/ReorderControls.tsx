import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReorderControlsProps {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
}

/** Accessible, mobile-friendly up/down reordering (no drag required). */
export function ReorderControls({ index, count, onMove }: ReorderControlsProps) {
  return (
    <div className="flex flex-col">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-5 w-6"
        disabled={index === 0}
        aria-label="Move up"
        onClick={() => onMove(index, index - 1)}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-5 w-6"
        disabled={index === count - 1}
        aria-label="Move down"
        onClick={() => onMove(index, index + 1)}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Move an item within an array, returning a new array. */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
