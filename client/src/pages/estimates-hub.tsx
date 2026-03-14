import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Calculator, BookOpen, ClipboardList } from "lucide-react";
import Estimates from "./estimates";
import ServiceCatalog from "./service-catalog";
import Proposals from "./proposals";
import CalculatorsSection from "./calculators";

interface MyPermissions {
  role: string;
  displayName: string;
  permissions: Record<string, string>;
}

function getTabFromLocation(path: string): string {
  if (path === "/service-catalog") return "catalog";
  if (path === "/proposals") return "proposals";
  return "estimates";
}

export default function EstimatesHub() {
  const [location, setLocation] = useLocation();
  const [showCalculators, setShowCalculators] = useState(false);

  const locationTab = getTabFromLocation(location);
  const activeTab = showCalculators ? "calculators" : locationTab;

  const { data: myPerms } = useQuery<MyPermissions>({
    queryKey: ["/api/my-permissions"],
    staleTime: 30000,
  });

  const hasAccess = useMemo(() => {
    if (!myPerms) return { catalog: true, proposals: true };
    const catalogLevel = myPerms.permissions["service_catalog"];
    const proposalsLevel = myPerms.permissions["proposals"];
    return {
      catalog: !catalogLevel || catalogLevel !== "none",
      proposals: !proposalsLevel || proposalsLevel !== "none",
    };
  }, [myPerms]);

  const handleTabChange = (value: string) => {
    if (value === "calculators") {
      setShowCalculators(true);
      if (location !== "/estimates") setLocation("/estimates");
    } else {
      setShowCalculators(false);
      if (value === "estimates") setLocation("/estimates");
      else if (value === "catalog") setLocation("/service-catalog");
      else if (value === "proposals") setLocation("/proposals");
    }
  };

  useEffect(() => {
    if (location === "/service-catalog" && !hasAccess.catalog) {
      setLocation("/estimates");
    }
    if (location === "/proposals" && !hasAccess.proposals) {
      setLocation("/estimates");
    }
    if (location !== "/estimates" && showCalculators) {
      setShowCalculators(false);
    }
  }, [location, hasAccess, setLocation, showCalculators]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-heading font-bold" data-testid="text-estimates-hub-title">Estimates Hub</h1>
        <p className="text-muted-foreground text-lg">Manage estimates, calculators, service catalog, and proposals</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 gap-2 md:gap-6" data-testid="tabs-estimates-hub">
          <TabsTrigger
            value="estimates"
            data-testid="tab-estimates"
            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium"
          >
            <FileText className="mr-2 h-4 w-4" />
            Estimates
          </TabsTrigger>
          <TabsTrigger
            value="calculators"
            data-testid="tab-calculators"
            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium"
          >
            <Calculator className="mr-2 h-4 w-4" />
            Calculators
          </TabsTrigger>
          {hasAccess.catalog && (
            <TabsTrigger
              value="catalog"
              data-testid="tab-service-catalog"
              className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Service Catalog
            </TabsTrigger>
          )}
          {hasAccess.proposals && (
            <TabsTrigger
              value="proposals"
              data-testid="tab-proposals"
              className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium"
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Proposals
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="estimates" className="mt-0 -mx-4 md:-mx-6">
          <Estimates />
        </TabsContent>
        <TabsContent value="calculators" className="mt-0 -mx-4 md:-mx-6">
          <div className="p-4 md:p-6">
            <CalculatorsSection />
          </div>
        </TabsContent>
        {hasAccess.catalog && (
          <TabsContent value="catalog" className="mt-0 -mx-4 md:-mx-6">
            <ServiceCatalog />
          </TabsContent>
        )}
        {hasAccess.proposals && (
          <TabsContent value="proposals" className="mt-0 -mx-4 md:-mx-6">
            <Proposals />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
