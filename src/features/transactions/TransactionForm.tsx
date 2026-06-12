import { useEffect, useState } from "react";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories } from "@/hooks/useCategories";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useIncomeSources } from "@/hooks/useIncomeSources";
import { useTransactions } from "@/hooks/useTransactions";
import { useCreditCards } from "@/hooks/useCreditCards";
import { useAccounts } from "@/hooks/useAccounts";
import { useEmis } from "@/hooks/useEmis";
import { useMonth } from "@/hooks/useMonth";
import { useSettings } from "@/hooks/useSettings";
import { decodeSource, encodeSource, isCardSource } from "@/lib/source";
import { todayISO } from "@/lib/date";
import type { Transaction, TransactionType } from "@/types";

type FormType = "expense" | "income" | "transfer";

const schema = z
  .object({
    type: z.enum(["expense", "income", "transfer"]),
    date: z.string().min(1, "Pick a date"),
    amount: z
      .number({ message: "Enter an amount" })
      .positive("Amount must be greater than 0"),
    categoryId: z.string().optional(),
    incomeSourceId: z.string().optional(),
    /** "acct:<id>" for a bank/cash account or "card:<id>" for a credit card. */
    sourceId: z.string().optional(),
    /** Destination account id for a transfer. */
    toAccountId: z.string().optional(),
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
  })
  .refine((d) => (d.type === "transfer" ? d.sourceId?.startsWith("acct:") : true), {
    message: "Choose the account to transfer from",
    path: ["sourceId"],
  })
  .refine((d) => (d.type === "transfer" ? !!d.toAccountId : true), {
    message: "Choose the account to transfer to",
    path: ["toAccountId"],
  })
  .refine((d) => (d.type === "transfer" ? d.sourceId !== `acct:${d.toAccountId}` : true), {
    message: "Pick two different accounts",
    path: ["toAccountId"],
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
  const { active: creditCards } = useCreditCards();
  const { active: accounts } = useAccounts();
  const { create: createEmi } = useEmis();
  const { money } = useSettings();

  // Credit-card payment flow state (full payment vs convert to EMI).
  const [cardMode, setCardMode] = useState<"full" | "emi">("full");
  const [emiMonths, setEmiMonths] = useState("");
  const [emiMonthly, setEmiMonthly] = useState("");
  const [emiMonthlyTouched, setEmiMonthlyTouched] = useState(false);

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
    defaultValues: { type: normalizeType(defaultType), date: todayISO() },
  });

  const type = watch("type");
  const amount = watch("amount");
  const sourceId = watch("sourceId");

  /** Is the selected source a credit card (only meaningful for expenses)? */
  const cardSelected = type === "expense" && isCardSource(sourceId);

  // EMI conversion is only offered when CREATING a card expense.
  const emiOffered = cardSelected && !editing;
  const emiMode = emiOffered && cardMode === "emi";

  // Default the monthly installment to amount ÷ tenure until the user edits it.
  useEffect(() => {
    if (!emiMode || emiMonthlyTouched) return;
    const months = Number(emiMonths);
    if (amount > 0 && months >= 1) {
      setEmiMonthly((amount / months).toFixed(2));
    }
  }, [emiMode, emiMonths, amount, emiMonthlyTouched]);

  useEffect(() => {
    if (!open) return;
    setCardMode("full");
    setEmiMonths("");
    setEmiMonthly("");
    setEmiMonthlyTouched(false);
    if (editing) {
      reset({
        type: normalizeType(editing.type),
        date: editing.date,
        amount: editing.amount,
        categoryId: editing.categoryId,
        incomeSourceId: editing.incomeSourceId,
        sourceId: encodeSource(editing.accountId, editing.creditCardId),
        toAccountId: editing.toAccountId,
        paymentMethodId: editing.paymentMethodId,
        merchant: editing.merchant ?? "",
        note: editing.note ?? "",
      });
    } else {
      reset({ type: normalizeType(defaultType), date: todayISO(), amount: undefined });
    }
  }, [open, editing, defaultType, reset]);

  const onSubmit = async (values: FormValues) => {
    const { accountId, creditCardId } = decodeSource(values.sourceId);

    // A funding source is required for new transactions, and an existing one
    // must not be cleared on edit (that would orphan it from every balance).
    // Legacy transactions that never had a source can still be edited freely.
    const editingHadSource = !!(editing && (editing.accountId || editing.creditCardId));
    if (
      values.type !== "transfer" &&
      !accountId &&
      !creditCardId &&
      (!editing || editingHadSource)
    ) {
      toast.error("Choose a funding source");
      return;
    }

    // Credit-card EMI conversion: create an EMI plan instead of one transaction —
    // the recurring engine materialises the monthly installments.
    if (emiMode) {
      const months = Number(emiMonths);
      const monthly = Number(emiMonthly);
      if (!Number.isInteger(months) || months < 1) {
        toast.error("Enter the EMI tenure in months");
        return;
      }
      if (!(monthly > 0)) {
        toast.error("Enter the monthly installment amount");
        return;
      }
      try {
        await createEmi.mutateAsync({
          name: values.merchant?.trim() || "Card EMI",
          emiType: "credit_card",
          monthlyAmount: monthly,
          startDate: values.date,
          months,
          categoryId: values.categoryId,
          creditCardId,
          note: values.note?.trim() || undefined,
        });
        toast.success(
          `EMI created — ${months} monthly installments of ${money(monthly)} will be recorded automatically`,
        );
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to create EMI");
      }
      return;
    }

    const payload =
      values.type === "transfer"
        ? {
            type: "transfer" as const,
            date: values.date,
            amount: values.amount,
            accountId,
            toAccountId: values.toAccountId,
            note: values.note?.trim() || undefined,
          }
        : {
            type: values.type,
            date: values.date,
            amount: values.amount,
            categoryId: values.type === "expense" ? values.categoryId : undefined,
            incomeSourceId: values.type === "income" ? values.incomeSourceId : undefined,
            accountId,
            creditCardId: values.type === "expense" ? creditCardId : undefined,
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
        toast.success(type === "transfer" ? "Transfer recorded" : "Transaction added");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save transaction");
    }
  };

  const noAccounts = accounts.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>
            Record an expense, income or transfer — every total updates automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs value={type} onValueChange={(v) => setValue("type", v as FormType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="transfer">Transfer</TabsTrigger>
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

          {type === "expense" && (
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
          )}

          {type === "income" && (
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

          {/* Funding source */}
          {type === "transfer" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From account</Label>
                <Controller
                  control={control}
                  name="sourceId"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="From" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={`acct:${a.id}`}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.sourceId && <FieldError msg={errors.sourceId.message} />}
              </div>
              <div className="space-y-1.5">
                <Label>To account</Label>
                <Controller
                  control={control}
                  name="toAccountId"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="To" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.toAccountId && <FieldError msg={errors.toAccountId.message} />}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>{type === "income" ? "Deposit to" : "Source"}</Label>
              <Controller
                control={control}
                name="sourceId"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Account or card" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Accounts</SelectLabel>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={`acct:${a.id}`}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {type === "expense" && creditCards.length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Credit cards</SelectLabel>
                          {creditCards.map((c) => (
                            <SelectItem key={c.id} value={`card:${c.id}`}>
                              {c.name} ·· {c.last4}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {noAccounts && (
                <p className="text-xs text-muted-foreground">
                  No accounts yet — add one in Settings → Accounts.
                </p>
              )}
            </div>
          )}

          {/* Credit-card EMI conversion */}
          {cardSelected && emiOffered && (
            <div className="space-y-3 rounded-lg border p-3">
              <Tabs value={cardMode} onValueChange={(v) => setCardMode(v as "full" | "emi")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="full">Full payment</TabsTrigger>
                  <TabsTrigger value="emi">Convert to EMI</TabsTrigger>
                </TabsList>
              </Tabs>

              {emiMode && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="emi-months">Tenure (months)</Label>
                      <Input
                        id="emi-months"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        placeholder="e.g. 6"
                        value={emiMonths}
                        onChange={(e) => setEmiMonths(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emi-monthly">Monthly amount</Label>
                      <Input
                        id="emi-monthly"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={emiMonthly}
                        onChange={(e) => {
                          setEmiMonthlyTouched(true);
                          setEmiMonthly(e.target.value);
                        }}
                      />
                    </div>
                  </div>
                  {Number(emiMonths) >= 1 && Number(emiMonthly) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {emiMonths} installments of {money(Number(emiMonthly))} starting{" "}
                      {watch("date")} — recorded automatically each month.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Optional rail + merchant (expense/income only) */}
          {type !== "transfer" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Rail (optional)</Label>
                <Controller
                  control={control}
                  name="paymentMethodId"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="UPI / NEFT / …" />
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
                  {type === "expense" ? "Merchant" : "Payer"}
                </Label>
                <Input
                  id="merchant"
                  placeholder={type === "expense" ? "e.g. Instamart" : "e.g. Employer"}
                  {...register("merchant")}
                />
              </div>
            </div>
          )}

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

/** This form handles expense/income/transfer; map any other type to expense. */
function normalizeType(t: TransactionType): FormType {
  return t === "income" || t === "transfer" ? t : "expense";
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive">{msg}</p>;
}
