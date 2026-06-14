import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Banknote,
  ChevronDown,
  Info,
  Layers,
  Pencil,
  Plus,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataState } from "@/components/shared/DataState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { TransactionList } from "@/features/transactions/TransactionList";
import { TransactionForm } from "@/features/transactions/TransactionForm";
import { AccountForm } from "@/features/settings/AccountForm";
import { useAccountBalances, useAccounts, useCashBreakdown } from "@/hooks/useAccounts";
import { useAllTransactions } from "@/hooks/useTransactions";
import { useSettings } from "@/hooks/useSettings";
import { isUnassignedTransaction } from "@/services/accounts";
import { currentMonthKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Account } from "@/types";

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

export function AccountsPage() {
  const accounts = useAccounts();
  const { balances, total, isLoading, isError, error } = useAccountBalances();
  const breakdown = useCashBreakdown();
  const { transactions } = useAllTransactions();
  const { money } = useSettings();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [statementFor, setStatementFor] = useState<Account | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [showCalc, setShowCalc] = useState(false);

  const transfersNet = breakdown.transfersIn - breakdown.transfersOut;
  const setAside = breakdown.goals + breakdown.savings;

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (a: Account) => {
    setEditing(a);
    setFormOpen(true);
  };

  const monthKey = currentMonthKey();

  /** This-month money in/out per account id. */
  const monthFlows = useMemo(() => {
    const map = new Map<string, { in: number; out: number }>();
    const bump = (id: string | undefined, key: "in" | "out", amt: number) => {
      if (!id) return;
      const cur = map.get(id) ?? { in: 0, out: 0 };
      cur[key] += amt;
      map.set(id, cur);
    };
    for (const t of transactions) {
      if (t.monthKey !== monthKey) continue;
      if (t.type === "income") bump(t.accountId, "in", t.amount);
      else if (t.type === "transfer") {
        bump(t.accountId, "out", t.amount);
        bump(t.toAccountId, "in", t.amount);
      } else if (t.type === "expense" || t.type === "cc_payment" || t.type === "goal") {
        bump(t.accountId, "out", t.amount);
      }
    }
    return map;
  }, [transactions, monthKey]);

  const monthTotals = useMemo(() => {
    let mIn = 0;
    let mOut = 0;
    for (const b of balances) {
      const f = monthFlows.get(b.account.id);
      if (f) {
        mIn += f.in;
        mOut += f.out;
      }
    }
    return { mIn, mOut };
  }, [balances, monthFlows]);

  const unassignedCount = useMemo(
    () => transactions.filter(isUnassignedTransaction).length,
    [transactions],
  );

  const statementTxns = useMemo(() => {
    if (!statementFor) return [];
    return transactions
      .filter(
        (t) => t.accountId === statementFor.id || t.toAccountId === statementFor.id,
      )
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 50);
  }, [transactions, statementFor]);

  const handleAssign = async () => {
    if (!assignTo) {
      toast.error("Choose an account to assign to");
      return;
    }
    try {
      const n = await accounts.assignUnassigned.mutateAsync(assignTo);
      toast.success(`Assigned ${n} transaction${n === 1 ? "" : "s"}`);
      setAssignTo("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to assign transactions");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Bank accounts and cash wallets. Every balance is derived from your transactions."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="h-4 w-4" /> Transfer
            </Button>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add account
            </Button>
          </div>
        }
      />

      <DataState
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={accounts.refetch}
        isEmpty={accounts.active.length === 0}
        emptyIcon={<Banknote className="h-10 w-10 text-muted-foreground" />}
        emptyTitle="No accounts yet"
        emptyMessage="Add a bank account or cash wallet to start tracking balances and transfers."
        emptyAction={
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add account
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Net Cash" value={money(total)} icon={Layers} accent="success" />
          <StatCard label="Accounts" value={String(accounts.active.length)} icon={Banknote} />
          <StatCard label="In this month" value={money(monthTotals.mIn)} accent="success" />
          <StatCard label="Out this month" value={money(monthTotals.mOut)} />
        </div>

        {/* Net Cash breakdown — fully reconciling (opening + in − out − saved) */}
        <Card>
          <CardContent className="p-4">
            <button
              type="button"
              onClick={() => setShowCalc((s) => !s)}
              aria-expanded={showCalc}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-muted-foreground" />
                How is Net Cash calculated?
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  showCalc && "rotate-180",
                )}
              />
            </button>
            {showCalc && (
              <dl className="mt-3 space-y-1.5 text-sm">
                <BreakdownRow label="Opening balance" value={money(breakdown.opening)} />
                <BreakdownRow label="Income" value={`+ ${money(breakdown.income)}`} />
                {transfersNet !== 0 && (
                  <BreakdownRow
                    label="Transfers (net)"
                    value={`${transfersNet >= 0 ? "+" : "−"} ${money(Math.abs(transfersNet))}`}
                  />
                )}
                <BreakdownRow
                  label="Spending (from accounts)"
                  value={`− ${money(breakdown.spending)}`}
                />
                {breakdown.billPayments > 0 && (
                  <BreakdownRow
                    label="Card bill payments"
                    value={`− ${money(breakdown.billPayments)}`}
                  />
                )}
                {setAside > 0 && (
                  <BreakdownRow label="Saved & invested (Goals + SIP + Emergency)" value={`− ${money(setAside)}`} />
                )}
                <div className="mt-1 flex items-center justify-between border-t pt-2 font-semibold">
                  <dt>Net Cash</dt>
                  <dd className="tabular-nums">{money(breakdown.netCash)}</dd>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  Credit-card spend isn't subtracted until you pay the bill — it appears as
                  outstanding under Credit Cards.
                </p>
              </dl>
            )}
          </CardContent>
        </Card>

        {unassignedCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assign past transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {unassignedCount} transaction{unassignedCount === 1 ? "" : "s"} have
                no funding source yet. Assign them to an account so its balance
                reflects your history.
              </p>
              <div className="flex flex-wrap gap-2">
                <Select value={assignTo} onValueChange={setAssignTo}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Choose account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.active.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssign}
                  disabled={accounts.assignUnassigned.isPending}
                >
                  Assign {unassignedCount}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {balances.map((b) => {
            const f = monthFlows.get(b.account.id) ?? { in: 0, out: 0 };
            return (
              <Card key={b.account.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: b.account.color ?? "#64748b" }}
                      >
                        {b.account.type === "cash" ? (
                          <Wallet className="h-4 w-4" />
                        ) : (
                          <Banknote className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{b.account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.account.institution || (b.account.type === "cash" ? "Cash" : "Bank")}
                          {" · Opening "}
                          {money(b.account.openingBalance)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-right text-lg font-bold tabular-nums",
                        b.balance < 0 && "text-destructive",
                      )}
                    >
                      {money(b.balance)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="tabular-nums text-success">+{money(f.in)} in</span>
                    <span className="tabular-nums">−{money(f.out)} out</span>
                    <span>this month</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setStatementFor(b.account)}
                    >
                      View statement
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(b.account)}
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DataState>

      <AccountForm
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditing(null);
        }}
        editing={editing}
      />
      <TransactionForm
        open={transferOpen}
        onOpenChange={setTransferOpen}
        defaultType="transfer"
      />

      <Dialog open={!!statementFor} onOpenChange={(o) => !o && setStatementFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{statementFor?.name} — recent activity</DialogTitle>
            <DialogDescription>
              The latest transactions that moved money in or out of this account.
            </DialogDescription>
          </DialogHeader>
          {statementTxns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No activity yet.
            </p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <TransactionList transactions={statementTxns} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
