import { useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useUid } from "@/hooks/useAuth";
import { useCategoryMap } from "@/hooks/useCategories";
import { usePaymentMethodMap } from "@/hooks/usePaymentMethods";
import { useIncomeSourceMap } from "@/hooks/useIncomeSources";
import { listAllTransactions } from "@/services/transactions";
import { buildBackup, restoreBackup, type BackupFile } from "@/services/backup";
import { exportCSV, exportExcel, downloadBlob } from "@/lib/export";
import { useQueryClient } from "@tanstack/react-query";

export function DataSection() {
  const uid = useUid();
  const qc = useQueryClient();
  const categoryMap = useCategoryMap();
  const paymentMap = usePaymentMethodMap();
  const incomeMap = useIncomeSourceMap();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null);

  const stamp = () => new Date().toISOString().slice(0, 10);

  const flatTransactions = async () => {
    const txns = await listAllTransactions(uid);
    return txns.map((t) => ({
      Date: t.date,
      Type: t.type,
      Amount: t.amount,
      Category: t.categoryId ? categoryMap.get(t.categoryId)?.name ?? "" : "",
      "Income Source": t.incomeSourceId ? incomeMap.get(t.incomeSourceId)?.name ?? "" : "",
      "Payment Method": t.paymentMethodId ? paymentMap.get(t.paymentMethodId)?.name ?? "" : "",
      Merchant: t.merchant ?? "",
      Note: t.note ?? "",
    }));
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(null);
    }
  };

  const handleCSV = () =>
    run("csv", async () => {
      const rows = await flatTransactions();
      if (rows.length === 0) {
        toast.info("No transactions to export");
        return;
      }
      exportCSV(rows, `fintrack-transactions-${stamp()}.csv`);
      toast.success("CSV exported");
    });

  const handleExcel = () =>
    run("excel", async () => {
      const [rows, backup] = await Promise.all([flatTransactions(), buildBackup(uid, stamp())]);
      exportExcel(
        [
          { name: "Transactions", rows },
          { name: "Budgets", rows: backup.collections.budgets ?? [] },
          { name: "Emergency Fund", rows: backup.collections.emergencyFunds ?? [] },
          { name: "SIP", rows: backup.collections.sipInvestments ?? [] },
        ],
        `fintrack-export-${stamp()}.xlsx`,
      );
      toast.success("Excel exported");
    });

  const handleBackup = () =>
    run("backup", async () => {
      const backup = await buildBackup(uid, new Date().toISOString());
      downloadBlob(
        new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
        `fintrack-backup-${stamp()}.json`,
      );
      toast.success("Backup downloaded");
    });

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile;
      if (parsed.version !== 1 || !parsed.collections) {
        throw new Error("Unrecognised backup file");
      }
      setPendingRestore(parsed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid backup file");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup & Export</CardTitle>
        <CardDescription>
          Export your data or back up and restore everything as JSON.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Button variant="outline" onClick={handleCSV} disabled={!!busy}>
          {busy === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Export CSV
        </Button>
        <Button variant="outline" onClick={handleExcel} disabled={!!busy}>
          {busy === "excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          Export Excel
        </Button>
        <Button variant="outline" onClick={handleBackup} disabled={!!busy}>
          {busy === "backup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download Backup
        </Button>
        <Button variant="outline" onClick={() => fileInput.current?.click()} disabled={!!busy}>
          {busy === "restore" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Restore Backup
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFilePicked}
        />
      </CardContent>

      <ConfirmDialog
        open={!!pendingRestore}
        onOpenChange={(o) => !o && setPendingRestore(null)}
        title="Restore this backup?"
        description="Documents are merged by id — matching records are overwritten and new ones added. This cannot be undone."
        confirmLabel="Restore"
        onConfirm={async () => {
          const backup = pendingRestore;
          setPendingRestore(null);
          if (!backup) return;
          await run("restore", async () => {
            const count = await restoreBackup(uid, backup);
            await qc.invalidateQueries();
            toast.success(`Restored ${count} records`);
          });
        }}
      />
    </Card>
  );
}
