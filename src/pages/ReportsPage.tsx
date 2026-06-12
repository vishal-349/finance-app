import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthlyReport } from "@/features/reports/MonthlyReport";
import { YearlyReport } from "@/features/reports/YearlyReport";
import { InsightsTab } from "@/features/reports/InsightsTab";

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Income, expenses, savings, EMIs and investments — by month, year or as annual insights."
      />
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly">
          <MonthlyReport />
        </TabsContent>
        <TabsContent value="yearly">
          <YearlyReport />
        </TabsContent>
        <TabsContent value="insights">
          <InsightsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
