import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import Customers from "@/pages/clients";
import CustomerDetail from "@/pages/client-detail";
import Tasks from "@/pages/tasks";
import EstimatesHub from "@/pages/estimates-hub";
import EstimateDetail from "@/pages/estimate-detail";
import Settings from "@/pages/settings";
import Meetings from "@/pages/meetings";
import MeetingDetail from "@/pages/meeting-detail";
import InvitePage from "@/pages/invite";
import AdminPage from "@/pages/admin";
import EmailSync from "@/pages/email-sync";
import Announcements from "@/pages/announcements";
import CustomerReport from "@/pages/customer-report";
import Reports from "@/pages/company-intelligence";
import CEOCommandCenter from "@/pages/ceo-command-center";
import WeeklyReport from "@/pages/weekly-report";
import WeeklyReportTeam from "@/pages/weekly-report-team";
import EstimatingList from "@/pages/estimating-list";
import EstimatingWorkspace from "@/pages/estimating-workspace";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import MyAccounts from "@/pages/my-accounts";

function TabRedirect({ tab }: { tab: string }) {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate(`/company-intelligence#${tab}`, { replace: true });
  }, [tab, navigate]);
  return null;
}

function ProtectedRouter() {
  return (
    <ProtectedLayout>
      <ErrorBoundary>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/leads" component={Leads} />
          <Route path="/customers" component={Customers} />
          <Route path="/customers/:id" component={CustomerDetail} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/meetings" component={Meetings} />
          <Route path="/meetings/:id" component={MeetingDetail} />
          <Route path="/estimates" component={EstimatesHub} />
          <Route path="/estimates/:id" component={EstimateDetail} />
          <Route path="/service-catalog" component={EstimatesHub} />
          <Route path="/proposals" component={EstimatesHub} />
          <Route path="/buildops-quotes" component={EstimatesHub} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/email" component={EmailSync} />
          <Route path="/announcements" component={Announcements} />
          <Route path="/reports/customer-intelligence" component={CustomerReport} />
          <Route path="/reports" component={Reports} />
          <Route path="/company-intelligence" component={Reports} />
          <Route path="/ceo" component={CEOCommandCenter} />
          <Route path="/weekly-report/team" component={WeeklyReportTeam} />
          <Route path="/my-accounts" component={MyAccounts} />
          <Route path="/weekly-report" component={WeeklyReport} />
          <Route path="/estimating/:id" component={EstimatingWorkspace} />
          <Route path="/estimating" component={EstimatingList} />
          <Route path="/reports/revenue-analytics">
            {() => <TabRedirect tab="revenue" />}
          </Route>
          <Route path="/reports/win-loss">
            {() => <TabRedirect tab="win-loss" />}
          </Route>
          <Route path="/reports/monthly-review">
            {() => <TabRedirect tab="monthly" />}
          </Route>
          <Route path="/reports/cohort-analysis">
            {() => <TabRedirect tab="cohort" />}
          </Route>
          <Route path="/service-agreements">
            {() => <TabRedirect tab="agreements" />}
          </Route>
          <Route path="/reports/service-agreements">
            {() => <TabRedirect tab="agreements" />}
          </Route>
          <Route path="/reports/monthly-report">
            {() => <TabRedirect tab="monthly" />}
          </Route>
          <Route component={NotFound} />
        </Switch>
      </ErrorBoundary>
    </ProtectedLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Switch>
            <Route path="/invite/:token" component={InvitePage} />
            <Route component={ProtectedRouter} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
