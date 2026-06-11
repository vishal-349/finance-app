import { useState } from "react";
import { Pencil, Plus, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataState } from "@/components/shared/DataState";
import { ReorderControls, moveItem } from "@/components/shared/ReorderControls";
import type { NamedEntity } from "@/services/namedCollection";
import { cn } from "@/lib/utils";

interface NamedController<T extends NamedEntity> {
  all: T[];
  active: T[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => void;
  create: { mutateAsync: (name: string) => Promise<unknown> };
  rename: { mutateAsync: (v: { id: string; name: string }) => Promise<unknown> };
  archive: { mutateAsync: (id: string) => Promise<unknown> };
  restore: { mutateAsync: (id: string) => Promise<unknown> };
  remove: { mutateAsync: (id: string) => Promise<unknown> };
  reorder: { mutate: (ids: string[]) => void };
}

interface ManagedListSectionProps<T extends NamedEntity> {
  title: string;
  description: string;
  itemNoun: string;
  controller: NamedController<T>;
}

export function ManagedListSection<T extends NamedEntity>({
  title,
  description,
  itemNoun,
  controller,
}: ManagedListSectionProps<T>) {
  const { all, isLoading, isError, error, refetch } = controller;
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<T | null>(null);

  const visible = all.filter((i) => (showArchived ? true : !i.archived));

  const openAdd = () => {
    setName("");
    setEditing(null);
    setAdding(true);
  };
  const openEdit = (item: T) => {
    setName(item.name);
    setEditing(item);
    setAdding(true);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (editing) {
        await controller.rename.mutateAsync({ id: editing.id, name: trimmed });
        toast.success(`${itemNoun} renamed`);
      } else {
        await controller.create.mutateAsync(trimmed);
        toast.success(`${itemNoun} added`);
      }
      setAdding(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const handleMove = (from: number, to: number) => {
    const reordered = moveItem(visible, from, to);
    controller.reorder.mutate(reordered.map((i) => i.id));
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <DataState
          isLoading={isLoading}
          isError={isError}
          error={error}
          onRetry={refetch}
          isEmpty={visible.length === 0}
          emptyTitle={`No ${itemNoun.toLowerCase()}s yet`}
          emptyMessage={`Add your first ${itemNoun.toLowerCase()} to get started.`}
          emptyAction={
            <Button size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add {itemNoun}
            </Button>
          }
        >
          <ul className="divide-y rounded-lg border">
            {visible.map((item, index) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-2 px-2 py-2",
                  item.archived && "opacity-60",
                )}
              >
                {!showArchived && (
                  <ReorderControls
                    index={index}
                    count={visible.length}
                    onMove={handleMove}
                  />
                )}
                <span className="flex-1 truncate text-sm font-medium">
                  {item.name}
                </span>
                {item.archived && <Badge variant="secondary">Archived</Badge>}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Rename"
                  onClick={() => openEdit(item)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {item.archived ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Restore"
                    onClick={() => controller.restore.mutateAsync(item.id)}
                  >
                    <ArchiveRestore className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Archive"
                    onClick={() => controller.archive.mutateAsync(item.id)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  aria-label="Delete"
                  onClick={() => setConfirmDelete(item)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </DataState>

        {all.some((i) => i.archived) && (
          <Button
            variant="link"
            size="sm"
            className="px-0"
            onClick={() => setShowArchived((s) => !s)}
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </Button>
        )}
      </CardContent>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Rename ${itemNoun}` : `Add ${itemNoun}`}
            </DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            placeholder={`${itemNoun} name`}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!name.trim()}>
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.name}?`}
        description={`This permanently deletes the ${itemNoun.toLowerCase()}. Existing transactions keep their record but the reference becomes unresolved. Consider archiving instead.`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (confirmDelete) {
            await controller.remove.mutateAsync(confirmDelete.id);
            toast.success(`${itemNoun} deleted`);
            setConfirmDelete(null);
          }
        }}
      />
    </Card>
  );
}
