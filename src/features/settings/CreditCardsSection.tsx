import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  CreditCard as CreditCardIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataState } from "@/components/shared/DataState";
import { UtilizationBar } from "@/components/shared/UtilizationBar";
import { CreditCardForm } from "@/features/settings/CreditCardForm";
import { useCardStats, useCreditCards } from "@/hooks/useCreditCards";
import { useSettings } from "@/hooks/useSettings";
import { formatPercent } from "@/lib/format";
import { formatDisplayDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { CardCycleStats, CreditCard } from "@/types";

const DEFAULT_COLOR = "#64748b";

/** Darken a #rrggbb color toward black by `amount` (0..1) for the tile gradient. */
function darken(hex: string, amount: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const n = parseInt(match[1], 16);
  const scale = (v: number) => Math.max(0, Math.round(v * (1 - amount)));
  const r = scale((n >> 16) & 255);
  const g = scale((n >> 8) & 255);
  const b = scale(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function CardTile({ card, dimmed }: { card: CreditCard; dimmed?: boolean }) {
  const color = card.color ?? DEFAULT_COLOR;
  return (
    <div
      className={cn("rounded-xl p-4 text-white shadow-sm", dimmed && "opacity-60")}
      style={{
        backgroundImage: `linear-gradient(135deg, ${color}, ${darken(color, 0.45)})`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-white/80">
            {card.bankName}
          </p>
          <p className="truncate text-base font-semibold">{card.name}</p>
        </div>
        <CreditCardIcon className="h-5 w-5 shrink-0 text-white/80" />
      </div>
      <p className="mt-4 text-lg font-semibold tracking-widest tabular-nums">
        •••• {card.last4}
      </p>
      <p className="mt-1 text-xs text-white/80">
        Billing day {card.billingDay} · Due day {card.dueDay}
      </p>
    </div>
  );
}

function CardStatsBlock({ stat }: { stat: CardCycleStats }) {
  const { money } = useSettings();
  const u = stat.utilization;
  const status = u > 0.9 ? "over" : u >= 0.3 ? "warning" : "safe";
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">Current cycle spend</span>
        <span className="font-medium tabular-nums">{money(stat.cycleSpend)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">
          Statement est. ({formatDisplayDate(stat.cycleEnd)})
        </span>
        <span className="font-medium tabular-nums">{money(stat.cycleSpend)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">This month</span>
        <span className="font-medium tabular-nums">{money(stat.monthSpend)}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Utilization</span>
          <span className="font-medium tabular-nums">{formatPercent(u)}</span>
        </div>
        <UtilizationBar utilization={u} status={status} />
      </div>
    </div>
  );
}

export function CreditCardsSection() {
  const cards = useCreditCards();
  const { stats, isLoading: statsLoading } = useCardStats();
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CreditCard | null>(null);

  const statsById = useMemo(
    () => new Map(stats.map((s) => [s.card.id, s])),
    [stats],
  );
  const archived = cards.all.filter((c) => c.archived);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (card: CreditCard) => {
    setEditing(card);
    setFormOpen(true);
  };

  const handleArchive = async (card: CreditCard) => {
    try {
      await cards.archive.mutateAsync(card.id);
      toast.success("Card archived");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to archive card");
    }
  };
  const handleRestore = async (card: CreditCard) => {
    try {
      await cards.restore.mutateAsync(card.id);
      toast.success("Card restored");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restore card");
    }
  };

  const actionButtons = (card: CreditCard) => (
    <div className="flex items-center justify-end gap-1">
      {card.archived && <Badge variant="secondary">Archived</Badge>}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label="Edit"
        onClick={() => openEdit(card)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
      {card.archived ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Restore"
          onClick={() => handleRestore(card)}
        >
          <ArchiveRestore className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Archive"
          onClick={() => handleArchive(card)}
        >
          <Archive className="h-4 w-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        aria-label="Delete"
        onClick={() => setConfirmDelete(card)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Credit Cards</CardTitle>
          <CardDescription>
            Track each card's statement cycle, monthly spend and limit
            utilization. Cards appear in transaction and EMI forms.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add card
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <DataState
          isLoading={cards.isLoading}
          isError={cards.isError}
          error={cards.error}
          onRetry={cards.refetch}
          isEmpty={cards.all.length === 0}
          emptyIcon={<CreditCardIcon className="h-10 w-10 text-muted-foreground" />}
          emptyTitle="No cards yet"
          emptyMessage="Add a credit card to track its statement cycle and utilization."
          emptyAction={
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add card
            </Button>
          }
        >
          <div className="space-y-3">
            {cards.active.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {cards.active.map((card) => {
                  const stat = statsById.get(card.id);
                  return (
                    <div key={card.id} className="space-y-3 rounded-xl border p-3">
                      <CardTile card={card} />
                      {statsLoading ? (
                        <p className="text-xs text-muted-foreground">
                          Loading stats…
                        </p>
                      ) : (
                        stat && <CardStatsBlock stat={stat} />
                      )}
                      {actionButtons(card)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                All cards are archived.
              </p>
            )}

            {archived.length > 0 && (
              <Button
                variant="link"
                size="sm"
                className="px-0"
                onClick={() => setShowArchived((s) => !s)}
              >
                {showArchived ? "Hide archived" : "Show archived"}
              </Button>
            )}

            {showArchived && archived.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {archived.map((card) => (
                  <div key={card.id} className="space-y-3 rounded-xl border p-3">
                    <CardTile card={card} dimmed />
                    {actionButtons(card)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DataState>
      </CardContent>

      <CreditCardForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.name}?`}
        description="This permanently deletes the card. Existing transactions keep the reference but it becomes unresolved. Archiving is usually safer."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await cards.remove.mutateAsync(confirmDelete.id);
            toast.success("Card deleted");
            setConfirmDelete(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete card");
          }
        }}
      />
    </Card>
  );
}
