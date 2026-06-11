import { useState } from "react";
import { Pencil, Plus, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useCategories } from "@/hooks/useCategories";
import type { Category, CategoryType } from "@/types";
import { cn } from "@/lib/utils";

const SWATCHES = [
  "#16a34a", "#0ea5e9", "#6366f1", "#a855f7", "#ec4899",
  "#ef4444", "#f97316", "#eab308", "#14b8a6", "#64748b",
];

export function CategoryManager() {
  const cats = useCategories();
  const [tab, setTab] = useState<CategoryType>("expense");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>
          Create, rename, recolor, reorder, archive or delete your spending and
          income categories. New categories appear instantly in forms and reports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={(v) => setTab(v as CategoryType)}>
          <TabsList>
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
          <TabsContent value="expense">
            <CategoryList type="expense" controller={cats} />
          </TabsContent>
          <TabsContent value="income">
            <CategoryList type="income" controller={cats} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CategoryList({
  type,
  controller,
}: {
  type: CategoryType;
  controller: ReturnType<typeof useCategories>;
}) {
  const items = type === "expense" ? controller.expense : controller.income;
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  const visible = items.filter((i) => (showArchived ? true : !i.archived));

  const openAdd = () => {
    setEditing(null);
    setName("");
    setColor(SWATCHES[items.length % SWATCHES.length]);
    setDialogOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setColor(c.color ?? SWATCHES[0]);
    setDialogOpen(true);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (editing) {
        await controller.update.mutateAsync({ id: editing.id, patch: { name: trimmed, color } });
        toast.success("Category updated");
      } else {
        await controller.create.mutateAsync({ name: trimmed, type, color });
        toast.success("Category added");
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const handleMove = (from: number, to: number) => {
    const reordered = moveItem(visible, from, to);
    controller.reorder.mutate(reordered.map((i) => i.id));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add category
        </Button>
      </div>

      <DataState
        isLoading={controller.isLoading}
        isError={controller.isError}
        error={controller.error}
        onRetry={controller.refetch}
        isEmpty={visible.length === 0}
        emptyTitle="No categories yet"
        emptyMessage={`Add your first ${type} category.`}
        emptyAction={
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add category
          </Button>
        }
      >
        <ul className="divide-y rounded-lg border">
          {visible.map((c, index) => (
            <li
              key={c.id}
              className={cn("flex items-center gap-2 px-2 py-2", c.archived && "opacity-60")}
            >
              {!showArchived && (
                <ReorderControls index={index} count={visible.length} onMove={handleMove} />
              )}
              <span
                className="h-4 w-4 shrink-0 rounded-full border"
                style={{ backgroundColor: c.color ?? "#94a3b8" }}
              />
              <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
              {c.archived && <Badge variant="secondary">Archived</Badge>}
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit" onClick={() => openEdit(c)}>
                <Pencil className="h-4 w-4" />
              </Button>
              {c.archived ? (
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Restore" onClick={() => controller.restore.mutateAsync(c.id)}>
                  <ArchiveRestore className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Archive" onClick={() => controller.archive.mutateAsync(c.id)}>
                  <Archive className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Delete" onClick={() => setConfirmDelete(c)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </DataState>

      {items.some((i) => i.archived) && (
        <Button variant="link" size="sm" className="px-0" onClick={() => setShowArchived((s) => !s)}>
          {showArchived ? "Hide archived" : "Show archived"}
        </Button>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                autoFocus
                value={name}
                placeholder="e.g. Grocery"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!name.trim()}>{editing ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={`Delete ${confirmDelete?.name}?`}
        description="Existing transactions keep their record but lose this category reference. Archiving is usually safer."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (confirmDelete) {
            await controller.remove.mutateAsync(confirmDelete.id);
            toast.success("Category deleted");
            setConfirmDelete(null);
          }
        }}
      />
    </div>
  );
}
