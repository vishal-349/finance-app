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

/**
 * Produce the full ordered id list after reordering only a *visible* subset.
 *
 * When archived items are hidden (or another category type isn't shown), the
 * reorder UI only knows about the visible items. Naively persisting `0..n` for
 * just those collides with the order values of the hidden items. This walks the
 * complete ordered list and slots the new visible order into the visible
 * positions, leaving hidden items exactly where they are — so the persisted
 * order is always collision-free.
 */
export function reindexVisibleWithinAll<T extends { id: string }>(
  allOrdered: T[],
  visibleNewOrder: T[],
): string[] {
  const visibleIds = new Set(visibleNewOrder.map((i) => i.id));
  const queue = [...visibleNewOrder];
  return allOrdered.map((item) =>
    visibleIds.has(item.id) ? queue.shift()!.id : item.id,
  );
}
