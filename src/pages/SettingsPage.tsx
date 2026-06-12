import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryManager } from "@/features/categories/CategoryManager";
import { ManagedListSection } from "@/features/settings/ManagedListSection";
import { PreferencesSection } from "@/features/settings/PreferencesSection";
import { AppearanceSection } from "@/features/settings/AppearanceSection";
import { CreditCardsSection } from "@/features/settings/CreditCardsSection";
import { AccountsSection } from "@/features/settings/AccountsSection";
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
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 sm:w-auto">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="cards">Credit Cards</TabsTrigger>
          <TabsTrigger value="income">Income Sources</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>
        <TabsContent value="accounts">
          <AccountsSection />
        </TabsContent>
        <TabsContent value="payment">
          <ManagedListSection
            title="Payment Methods"
            description="Optional rails (UPI, NEFT, etc.) tagged on transactions. Your funding source is an Account or Credit Card."
            itemNoun="Payment Method"
            controller={paymentMethods}
          />
        </TabsContent>
        <TabsContent value="cards">
          <CreditCardsSection />
        </TabsContent>
        <TabsContent value="income">
          <ManagedListSection
            title="Income Sources"
            description="Salary, freelancing, interest and more."
            itemNoun="Income Source"
            controller={incomeSources}
          />
        </TabsContent>
        <TabsContent value="appearance">
          <AppearanceSection />
        </TabsContent>
        <TabsContent value="preferences" className="space-y-6">
          <PreferencesSection />
          <DataSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
