import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories } from "@/hooks/useCategories";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useIncomeSources } from "@/hooks/useIncomeSources";
import { useTransactions } from "@/hooks/useTransactions";
import { useMonth } from "@/hooks/useMonth";
import { todayISO } from "@/lib/date";
import type { Transaction, TransactionType } from "@/types";

const schema = z
  .object({
    type: z.enum(["expense", "income"]),
    date: z.string().min(1, "Pick a date"),
    amount: z
      .number({ message: "Enter an amount" })
      .positive("Amount must be greater than 0"),
    categoryId: z.string().optional(),
    incomeSourceId: z.string().optional(),
    paymentMethodId: z.string().optional(),
    merchant: z.string().optional(),
    note: z.string().optional(),
  })
  .refine((d) => (d.type === "expense" ? !!d.categoryId : true), {
    message: "Choose a category",
    path: ["categoryId"],
  })
  .refine((d) => (d.type === "income" ? !!d.incomeSourceId : true), {
    message: "Choose an income source",
    path: ["incomeSourceId"],
  });

type FormValues = z.infer<typeof schema>;

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Transaction to edit; omit for a new one. */
  editing?: Transaction | null;
  defaultType?: TransactionType;
}

export function TransactionForm({
  open,
  onOpenChange,
  editing,
  defaultType = "expense",
}: TransactionFormProps) {
  const { monthKey } = useMonth();
  const { create, update } = useTransactions(monthKey);
  const { activeExpense } = useCategories();
  const { active: paymentMethods } = usePaymentMethods();
  const { active: incomeSources } = useIncomeSources();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: defaultType, date: todayISO() },
  });

  const type = watch("type");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        type: editing.type,
        date: editing.date,
        amount: editing.amount,
        categoryId: editing.categoryId,
        incomeSourceId: editing.incomeSourceId,
        paymentMethodId: editing.paymentMethodId,
        merchant: editing.merchant ?? "",
        note: editing.note ?? "",
      });
    } else {
      reset({ type: defaultType, date: todayISO(), amount: undefined });
    }
  }, [open, editing, defaultType, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      type: values.type,
      date: values.date,
      amount: values.amount,
      categoryId: values.type === "expense" ? values.categoryId : undefined,
      incomeSourceId: values.type === "income" ? values.incomeSourceId : undefined,
      paymentMethodId: values.paymentMethodId || undefined,
      merchant: values.merchant?.trim() || undefined,
      note: values.note?.trim() || undefined,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: payload });
        toast.success("Transaction updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Transaction added");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save transaction");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>
            Record an expense or income — every total updates automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs
            value={type}
            onValueChange={(v) => setValue("type", v as TransactionType)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register("date")} />
              {errors.date && <FieldError msg={errors.date.message} />}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && <FieldError msg={errors.amount.message} />}
            </div>
          </div>

          {type === "expense" ? (
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeExpense.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && <FieldError msg={errors.categoryId.message} />}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Income source</Label>
              <Controller
                control={control}
                name="incomeSourceId"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select income source" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeSources.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.incomeSourceId && <FieldError msg={errors.incomeSourceId.message} />}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment method</Label>
              <Controller
                control={control}
                name="paymentMethodId"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="merchant">
                {type === "expense" ? "Merchant" : "Source"}
              </Label>
              <Input
                id="merchant"
                placeholder={type === "expense" ? "e.g. Instamart" : "e.g. Employer"}
                {...register("merchant")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" placeholder="Optional note" {...register("note")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {editing ? "Save changes" : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}
