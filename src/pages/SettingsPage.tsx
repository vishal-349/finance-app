import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryManager } from "@/features/categories/CategoryManager";
import { ManagedListSection } from "@/features/settings/ManagedListSection";
import { PreferencesSection } from "@/features/settings/PreferencesSection";
import { DataSection } from "@/features/settings/DataSection";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useIncomeSources } from "@/hooks/useIncomeSources";

export function SettingsPage() {
  const paymentMethods = usePaymentMethods();
  const incomeSources = useIncomeSources();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage categories, payment methods, income sources and preferences."
      />
      <Tabs defaultValue="categories">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="income">Income Sources</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>
        <TabsContent value="payment">
          <ManagedListSection
            title="Payment Methods"
            description="Cash, UPI, cards, net banking — fully customizable."
            itemNoun="Payment Method"
            controller={paymentMethods}
          />
        </TabsContent>
        <TabsContent value="income">
          <ManagedListSection
            title="Income Sources"
            description="Salary, freelancing, interest and more."
            itemNoun="Income Source"
            controller={incomeSources}
          />
        </TabsContent>
        <TabsContent value="preferences" className="space-y-6">
          <PreferencesSection />
          <DataSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
