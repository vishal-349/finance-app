import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  Banknote,
  CreditCard as CreditCardIcon,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataState } from "@/components/shared/DataState";
import { UtilizationBar } from "@/components/shared/UtilizationBar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CreditCardForm } from "@/features/settings/CreditCardForm";
import { PayBillDialog } from "@/features/settings/PayBillDialog";
import { TransactionList } from "@/features/transactions/TransactionList";
import { useCardStats, useCreditCards } from "@/hooks/useCreditCards";
import { useAllTransactions } from "@/hooks/useTransactions";
import { useSettings } from "@/hooks/useSettings";
import { cardOutstanding, cardPayments } from "@/lib/derive";
import { formatPercent } from "@/lib/format";
import { formatDisplayDate } from "@/lib/date";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { CreditCard, Transaction } from "@/types";

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

function CardTile({
  card,
  selected,
  dimmed,
  onClick,
}: {
  card: CreditCard;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}) {
  const color = card.color ?? DEFAULT_COLOR;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl p-4 text-left text-white transition-all duration-200",
        "shadow-e2 [box-shadow:var(--elev-2),var(--highlight-top)] ring-1 ring-inset ring-white/15",
        onClick && "lift cursor-pointer",
        selected && "ring-2 ring-white/70",
        dimmed && "opacity-60",
      )}
      style={{ backgroundImage: `linear-gradient(135deg, ${color}, ${darken(color, 0.45)})` }}
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
      <p className="mt-4 text-lg font-semibold tracking-widest tabular-nums">•••• {card.last4}</p>
      <p className="mt-1 text-xs text-white/80">
        Billing day {card.billingDay} · Due day {card.dueDay}
      </p>
    </button>
  );
}

export function CreditCardsPage() {
  const cards = useCreditCards();
  const { stats } = useCardStats();
  const { transactions } = useAllTransactions();
  const { money } = useSettings();
  const [params, setParams] = useSearchParams();

  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CreditCard | null>(null);
  const [payBill, setPayBill] = useState<CreditCard | null>(null);

  const outstandingById = useMemo(
    () => new Map(cards.all.map((c) => [c.id, cardOutstanding(c.id, transactions)])),
    [cards.all, transactions],
  );
  const statsById = useMemo(() => new Map(stats.map((s) => [s.card.id, s])), [stats]);

  // Selected card is driven by the URL (?card=) so dashboard widgets can deep-link.
  const selectedId = params.get("card");
  const selected =
    cards.active.find((c) => c.id === selectedId) ?? cards.active[0] ?? null;

  useEffect(() => {
    // Keep the URL honest once cards load (first card selected by default).
    if (!selectedId && cards.active[0]) {
      setParams((p) => {
        p.set("card", cards.active[0].id);
        return p;
      }, { replace: true });
    }
  }, [selectedId, cards.active, setParams]);

  const select = (id: string) =>
    setParams((p) => {
      p.set("card", id);
      return p;
    });

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (card: CreditCard) => {
    setEditing(card);
    setFormOpen(true);
  };

  const archived = cards.all.filter((c) => c.archived);
  const totalOutstanding = cards.active.reduce(
    (a, c) => a + (outstandingById.get(c.id) ?? 0),
    0,
  );
  const totalMonthSpend = stats.reduce((a, s) => a + s.monthSpend, 0);
  const totalLimit = cards.active.reduce((a, c) => a + c.creditLimit, 0);
  const totalCycleSpend = stats.reduce((a, s) => a + s.cycleSpend, 0);
  const overallUtil = totalLimit > 0 ? totalCycleSpend / totalLimit : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit Cards"
        description="Track spend, outstanding balance and utilization — and pay your bills."
        actions={
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add card
          </Button>
        }
      />

      <DataState
        isLoading={cards.isLoading}
        isError={cards.isError}
        error={cards.error}
        onRetry={cards.refetch}
        isEmpty={cards.all.length === 0}
        emptyIcon={<CreditCardIcon className="h-10 w-10 text-muted-foreground" />}
        emptyTitle="No cards yet"
        emptyMessage="Add a credit card to track its statement cycle, spend and utilization."
        emptyAction={
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add card
          </Button>
        }
      >
        {/* Portfolio stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total outstanding"
            value={money(totalOutstanding)}
            icon={CreditCardIcon}
            accent={totalOutstanding > 0 ? "destructive" : "default"}
            hint="Charges minus payments"
          />
          <StatCard
            label="Spent this month"
            value={money(totalMonthSpend)}
            icon={Wallet}
            hint="Across all cards"
          />
          <StatCard label="Active cards" value={String(cards.active.length)} icon={CreditCardIcon} />
          <StatCard
            label="Credit used"
            value={formatPercent(overallUtil)}
            icon={Gauge}
            accent={overallUtil > 0.9 ? "destructive" : overallUtil >= 0.3 ? "warning" : "default"}
            hint={totalLimit > 0 ? `of ${money(totalLimit)} limit` : "No limit set"}
          />
        </div>

        {cards.active.length === 0 ? (
          <p className="text-sm text-muted-foreground">All cards are archived.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            {/* Card selector */}
            <div className="space-y-3">
              {cards.active.map((card) => (
                <CardTile
                  key={card.id}
                  card={card}
                  selected={selected?.id === card.id}
                  onClick={() => select(card.id)}
                />
              ))}
            </div>

            {/* Selected card detail */}
            {selected && (
              <CardDetail
                key={selected.id}
                card={selected}
                outstanding={outstandingById.get(selected.id) ?? 0}
                cycleSpend={statsById.get(selected.id)?.cycleSpend ?? 0}
                cycleStart={statsById.get(selected.id)?.cycleStart ?? ""}
                cycleEnd={statsById.get(selected.id)?.cycleEnd ?? ""}
                monthSpend={statsById.get(selected.id)?.monthSpend ?? 0}
                utilization={statsById.get(selected.id)?.utilization ?? 0}
                transactions={transactions}
                onPayBill={() => setPayBill(selected)}
                onEdit={() => openEdit(selected)}
                onArchive={async () => {
                  try {
                    await cards.archive.mutateAsync(selected.id);
                    toast.success("Card archived");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed to archive");
                  }
                }}
                onDelete={() => setConfirmDelete(selected)}
              />
            )}
          </div>
        )}

        {archived.length > 0 && (
          <div className="space-y-3">
            <Button variant="link" size="sm" className="px-0" onClick={() => setShowArchived((s) => !s)}>
              {showArchived ? "Hide archived" : `Show archived (${archived.length})`}
            </Button>
            {showArchived && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {archived.map((card) => (
                  <div key={card.id} className="space-y-2">
                    <CardTile card={card} dimmed />
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Restore"
                        onClick={async () => {
                          try {
                            await cards.restore.mutateAsync(card.id);
                            toast.success("Card restored");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Failed to restore");
                          }
                        }}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DataState>

      <CreditCardForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <PayBillDialog
        open={!!payBill}
        onOpenChange={(o) => !o && setPayBill(null)}
        card={payBill}
        outstanding={payBill ? (outstandingById.get(payBill.id) ?? 0) : 0}
      />

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
            toast.error(e instanceof Error ? e.message : "Failed to delete");
          }
        }}
      />
    </div>
  );
}

function StatRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold tabular-nums", danger && "text-destructive")}>{value}</span>
    </div>
  );
}

function CardDetail({
  card,
  outstanding,
  cycleSpend,
  cycleStart,
  cycleEnd,
  monthSpend,
  utilization,
  transactions,
  onPayBill,
  onEdit,
  onArchive,
  onDelete,
}: {
  card: CreditCard;
  outstanding: number;
  cycleSpend: number;
  cycleStart: string;
  cycleEnd: string;
  monthSpend: number;
  utilization: number;
  transactions: Transaction[];
  onPayBill: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const { money } = useSettings();
  const status = utilization > 0.9 ? "over" : utilization >= 0.3 ? "warning" : "safe";

  // All charges on this card (incl. EMI installments) — this is the spend list
  // that was previously invisible. Newest first (allTransactions is date-desc).
  const charges = useMemo(
    () => transactions.filter((t) => t.creditCardId === card.id && t.type === "expense"),
    [transactions, card.id],
  );
  const payments = useMemo(() => cardPayments(transactions, card.id), [transactions, card.id]);

  const shortDate = (iso: string) => (iso ? format(parseISO(iso), "d MMM") : "—");
  const cycleRange = `${shortDate(cycleStart)} – ${shortDate(cycleEnd)}`;

  return (
    <div className="glass space-y-4 rounded-2xl p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          {/* Lead with what you owe and what you've spent this month — the
              numbers that match the transaction list (Outstanding = all
              charges − payments; This month = calendar-month spend). */}
          <StatRow label="Outstanding" value={money(outstanding)} danger={outstanding > 0} />
          <StatRow label="Spent this month" value={money(monthSpend)} />
          {/* Current statement cycle — labelled with its window so it's clear
              why earlier charges (billed last cycle) aren't counted here. */}
          <StatRow label={`This cycle · ${cycleRange}`} value={money(cycleSpend)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Utilization (this cycle)</span>
            <span className="font-medium tabular-nums">{formatPercent(utilization)}</span>
          </div>
          <UtilizationBar utilization={utilization} status={status} />
          <p className="text-xs text-muted-foreground">
            {money(cycleSpend)} of {money(card.creditLimit)} limit
          </p>
          <p className="text-xs text-muted-foreground">
            Statement closes {cycleEnd ? formatDisplayDate(cycleEnd) : "—"} · payment due day{" "}
            {card.dueDay}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onPayBill}>
          <Banknote className="h-4 w-4" /> Pay bill
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={onArchive}>
          <Archive className="h-4 w-4" /> Archive
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">
            Transactions{charges.length > 0 && ` (${charges.length})`}
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payments{payments.length > 0 && ` (${payments.length})`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="transactions">
          {charges.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No spend on this card yet. Add a transaction and choose this card as the source.
            </p>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto">
              <TransactionList transactions={charges} />
            </div>
          )}
        </TabsContent>
        <TabsContent value="payments">
          {payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No bill payments recorded yet. Use “Pay bill” to log a payment — it reduces the
              outstanding balance and isn't counted as a new expense.
            </p>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto">
              <TransactionList transactions={payments} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
