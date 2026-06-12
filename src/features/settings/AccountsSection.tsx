import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Banknote,
  Pencil,
  Plus,
  Trash2,
  Wallet,
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
import { AccountForm } from "@/features/settings/AccountForm";
import { useAccountBalances, useAccounts } from "@/hooks/useAccounts";
import { useSettings } from "@/hooks/useSettings";
import type { Account } from "@/types";

export function AccountsSection() {
  const accounts = useAccounts();
  const { balances } = useAccountBalances();
  const { money } = useSettings();
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null);

  const balanceById = useMemo(
    () => new Map(balances.map((b) => [b.account.id, b.balance])),
    [balances],
  );
  const archived = accounts.all.filter((a) => a.archived);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (a: Account) => {
    setEditing(a);
    setFormOpen(true);
  };

  const handleArchive = async (a: Account) => {
    try {
      await accounts.archive.mutateAsync(a.id);
      toast.success("Account archived");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to archive account");
    }
  };
  const handleRestore = async (a: Account) => {
    try {
      await accounts.restore.mutateAsync(a.id);
      toast.success("Account restored");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restore account");
    }
  };

  const row = (a: Account, dimmed?: boolean) => (
    <div
      key={a.id}
      className="flex items-center gap-3 px-4 py-3"
      style={dimmed ? { opacity: 0.6 } : undefined}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: a.color ?? "#64748b" }}
      >
        {a.type === "cash" ? (
          <Wallet className="h-4 w-4" />
        ) : (
          <Banknote className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-medium">{a.name}</span>
          <Badge variant="outline">{a.type === "cash" ? "Cash" : "Bank"}</Badge>
          {a.archived && <Badge variant="secondary">Archived</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {a.institution ? `${a.institution} · ` : ""}
          Opening {money(a.openingBalance)}
        </p>
      </div>
      {!a.archived && (
        <span className="shrink-0 text-right font-semibold tabular-nums">
          {money(balanceById.get(a.id) ?? a.openingBalance)}
        </span>
      )}
      <div className="flex shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Edit"
          onClick={() => openEdit(a)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {a.archived ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Restore"
            onClick={() => handleRestore(a)}
          >
            <ArchiveRestore className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Archive"
            onClick={() => handleArchive(a)}
          >
            <Archive className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          aria-label="Delete"
          onClick={() => setConfirmDelete(a)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Accounts &amp; Wallets</CardTitle>
          <CardDescription>
            Bank accounts and cash wallets. They're the funding source for every
            transaction; balances are derived automatically.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add account
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <DataState
          isLoading={accounts.isLoading}
          isError={accounts.isError}
          error={accounts.error}
          onRetry={accounts.refetch}
          isEmpty={accounts.all.length === 0}
          emptyIcon={<Banknote className="h-10 w-10 text-muted-foreground" />}
          emptyTitle="No accounts yet"
          emptyMessage="Add a bank account or cash wallet to start tracking balances."
          emptyAction={
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add account
            </Button>
          }
        >
          <div className="divide-y rounded-lg border">
            {accounts.active.map((a) => row(a))}
          </div>

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
            <div className="divide-y rounded-lg border">
              {archived.map((a) => row(a, true))}
            </div>
          )}
        </DataState>
      </CardContent>

      <AccountForm open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={confirmDelete ? `Delete ${confirmDelete.name}?` : "Delete account?"}
        description="This permanently deletes the account. Existing transactions keep the reference but it becomes unresolved. Archiving is usually safer."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await accounts.remove.mutateAsync(confirmDelete.id);
            toast.success("Account deleted");
            setConfirmDelete(null);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to delete account");
          }
        }}
      />
    </Card>
  );
}
