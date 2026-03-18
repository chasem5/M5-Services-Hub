import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2 } from "lucide-react";
import RevenueAnalytics from "./revenue-analytics";
import WinLossReport from "./win-loss-report";
import MonthlyReport from "./monthly-report";
import CohortAnalysis from "./cohort-analysis";
import ServiceAgreements from "./service-agreements";

const TABS = [
  { value: "revenue", label: "Revenue" },
  { value: "win-loss", label: "Win / Loss" },
  { value: "monthly", label: "Monthly Review" },
  { value: "cohort", label: "Cohort Analysis" },
  { value: "agreements", label: "Service Agreements" },
];

const TAB_VALUES = TABS.map(t => t.value);

function getInitialTab(): string {
  const hash = window.location.hash.replace("#", "");
  return TAB_VALUES.includes(hash) ? hash : "revenue";
}

export default function CompanyIntelligence() {
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  function handleTabChange(value: string) {
    setActiveTab(value);
    window.location.hash = value;
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Building2 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">Company Intelligence</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-0.5">
          Revenue analytics, deal outcomes, cohort trends, and service agreements
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="shrink-0 border-b bg-background px-6">
            <TabsList className="h-10 bg-transparent p-0 gap-0 rounded-none">
              {TABS.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-testid={`tab-${tab.value}`}
                  className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="revenue" className="m-0">
              <RevenueAnalytics />
            </TabsContent>
            <TabsContent value="win-loss" className="m-0">
              <WinLossReport />
            </TabsContent>
            <TabsContent value="monthly" className="m-0">
              <MonthlyReport />
            </TabsContent>
            <TabsContent value="cohort" className="m-0">
              <CohortAnalysis />
            </TabsContent>
            <TabsContent value="agreements" className="m-0">
              <ServiceAgreements />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
