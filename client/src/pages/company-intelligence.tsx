import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActionPlanPanel } from "@/components/ActionPlanPanel";
import { RecommendationsHub } from "@/components/RecommendationsHub";
import RevenueAnalytics from "./revenue-analytics";
import WinLossReport from "./win-loss-report";
import MonthlyReport from "./monthly-report";
import CohortAnalysis from "./cohort-analysis";
import ServiceAgreements from "./service-agreements";
import CustomerReport from "./customer-report";
import WeeklyReport from "./weekly-report";

const TABS = [
  { value: "customer-intel", label: "Customer Health" },
  { value: "monthly",        label: "Monthly Report" },
  { value: "revenue",        label: "Revenue" },
  { value: "win-loss",       label: "Win / Loss" },
  { value: "cohort",         label: "Cohort Analysis" },
  { value: "agreements",     label: "Agreements" },
  { value: "weekly-report",  label: "Weekly Report" },
  { value: "action-plan",    label: "Action Plan" },
  { value: "recommendations",label: "Recommendations" },
];

const TAB_VALUES = TABS.map(t => t.value);

function getInitialTab(): string {
  const hash = window.location.hash.replace("#", "");
  return TAB_VALUES.includes(hash) ? hash : "customer-intel";
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.replace("#", "");
      const tab = TAB_VALUES.includes(hash) ? hash : "customer-intel";
      setActiveTab(tab);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function handleTabChange(value: string) {
    setActiveTab(value);
    window.location.hash = value;
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-heading font-bold">Reports</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-0.5">
          Customer health, revenue analytics, deal outcomes, cohort trends, and coaching reports
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="shrink-0 border-b bg-background px-6 overflow-x-auto">
            <TabsList className="h-10 bg-transparent p-0 gap-0 rounded-none flex">
              {TABS.map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-testid={`tab-${tab.value}`}
                  className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="customer-intel" className="m-0 h-full">
              <CustomerReport />
            </TabsContent>
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
            <TabsContent value="weekly-report" className="m-0">
              <WeeklyReport />
            </TabsContent>
            <TabsContent value="action-plan" className="m-0 p-6">
              <Card className="shadow-sm bg-card max-w-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Company Action Plan</CardTitle>
                  <CardDescription className="text-xs">
                    Company-wide business development and retention action items
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ActionPlanPanel type="company" clientId={null} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="recommendations" className="m-0">
              <RecommendationsHub />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
