import { Switch, Route } from "wouter";
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
import Estimates from "@/pages/estimates";
import EstimateDetail from "@/pages/estimate-detail";
import ServiceCatalog from "@/pages/service-catalog";
import Proposals from "@/pages/proposals";
import Settings from "@/pages/settings";
import Meetings from "@/pages/meetings";
import MeetingDetail from "@/pages/meeting-detail";
import InvitePage from "@/pages/invite";
import AdminPage from "@/pages/admin";
import EmailSync from "@/pages/email-sync";

function ProtectedRouter() {
  return (
    <ProtectedLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/leads" component={Leads} />
        <Route path="/customers" component={Customers} />
        <Route path="/customers/:id" component={CustomerDetail} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/meetings" component={Meetings} />
        <Route path="/meetings/:id" component={MeetingDetail} />
        <Route path="/estimates" component={Estimates} />
        <Route path="/estimates/:id" component={EstimateDetail} />
        <Route path="/service-catalog" component={ServiceCatalog} />
        <Route path="/proposals" component={Proposals} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/email" component={EmailSync} />
        <Route component={NotFound} />
      </Switch>
    </ProtectedLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Switch>
          <Route path="/invite/:token" component={InvitePage} />
          <Route component={ProtectedRouter} />
        </Switch>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
