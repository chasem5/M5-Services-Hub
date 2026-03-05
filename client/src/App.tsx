import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Leads from "@/pages/leads";
import Clients from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import Tasks from "@/pages/tasks";
import Estimates from "@/pages/estimates";
import EstimateDetail from "@/pages/estimate-detail";
import ServiceCatalog from "@/pages/service-catalog";
import Proposals from "@/pages/proposals";
import Settings from "@/pages/settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/leads" component={Leads} />
      <Route path="/clients" component={Clients} />
      <Route path="/clients/:id" component={ClientDetail} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/estimates" component={Estimates} />
      <Route path="/estimates/:id" component={EstimateDetail} />
      <Route path="/service-catalog" component={ServiceCatalog} />
      <Route path="/proposals" component={Proposals} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProtectedLayout>
          <Router />
        </ProtectedLayout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
