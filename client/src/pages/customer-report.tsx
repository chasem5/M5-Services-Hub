import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  Search,
  ExternalLink,
  HeartPulse,
  Sparkles,
  Pin,
  MoreVertical,
  ShieldCheck,
  Eye,
  AlertCircle,
  X,
} from "lucide-react";

interface ClientIntel {
  clientId: number;
  name: string;
  tier: string | null;
  hitRate: number | null;
  wonCount: number;
  lostCount: number;
  openDeals: number;
  pipelineValue: number;
  ltv: number;
  mrr: number;
  activeJobs: number;
  totalJobs: number;
  velocityLast90: number;
  velocityPrior90: number;
  velocityDirection: "growing" | "flat" | "declining";
  hasActiveSA: boolean;
  invoiceTrend: "growing" | "flat" | "declining";
  invoiceLast3Avg: number;
  invoicePrior3Avg: number;
  healthScore: number;
  healthStatus: "healthy" | "watch" | "at_risk";
  momentum: "rising" | "declining" | "stable";
  isOverridden: boolean;
  healthOverrideNote: string | null;
  groupChildCount: number;
}

type SortKey = "ltv" | "hitRate" | "pipelineValue" | "velocityLast90" | "activeJobs" | "healthScore" | "name";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

function HealthBadgeHover({ client, onOverrideChange }: { client: ClientIntel; onOverrideChange?: (clientId: number, val: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && summary === null && !loading) {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          healthStatus: client.healthStatus,
          healthScore: String(client.healthScore),
          velocityLast90: String(client.velocityLast90),
          velocityPrior90: String(client.velocityPrior90),
          velocityDirection: client.velocityDirection,
          velocityChange: String(client.velocityLast90 - client.velocityPrior90),
          ltv: String(client.ltv),
          hitRate: client.hitRate !== null ? String(client.hitRate) : "",
          wonCount: String(client.wonCount),
          lostCount: String(client.lostCount),
          openCount: String(client.openDeals),
          totalJobs: String(client.totalJobs),
          hasActiveSA: String(client.hasActiveSA),
          invoiceTrend: client.invoiceTrend ?? "flat",
          invoiceLast3Avg: String(client.invoiceLast3Avg ?? 0),
          invoicePrior3Avg: String(client.invoicePrior3Avg ?? 0),
        });
        const res = await fetch(`/api/clients/${client.clientId}/health-summary?${params}`, { credentials: "include" });
        const json = await res.json();
        setSummary(json.summary ?? "No summary available.");
      } catch {
        setSummary("Unable to generate summary.");
      } finally {
        setLoading(false);
      }
    }
  };

  const badgeEl = (() => {
    const overriddenClass = client.isOverridden ? "ring-2 ring-offset-1 ring-amber-400" : "";
    if (client.healthStatus === "healthy") return (
      <Badge className={cn("bg-green-100 text-green-700 border-green-200 text-xs cursor-pointer gap-1", overriddenClass)} data-testid="badge-health-healthy">
        {client.isOverridden && <Pin className="h-2.5 w-2.5" />}
        Healthy
      </Badge>
    );
    if (client.healthStatus === "watch") return (
      <Badge className={cn("bg-amber-100 text-amber-700 border-amber-200 text-xs cursor-pointer gap-1", overriddenClass)} data-testid="badge-health-watch">
        {client.isOverridden && <Pin className="h-2.5 w-2.5" />}
        Watch
      </Badge>
    );
    return (
      <Badge className={cn("bg-red-100 text-red-700 border-red-200 text-xs cursor-pointer gap-1", overriddenClass)} data-testid="badge-health-at-risk">
        {client.isOverridden && <Pin className="h-2.5 w-2.5" />}
        At Risk
      </Badge>
    );
  })();

  return (
    <HoverCard open={open} onOpenChange={handleOpen} openDelay={400}>
      <HoverCardTrigger asChild><span className="inline-block cursor-pointer">{badgeEl}</span></HoverCardTrigger>
      <HoverCardContent className="w-80 text-sm" side="right">
        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI Health Summary
        </div>
        {client.isOverridden && client.healthOverrideNote && (
          <div className="mb-2 flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 rounded p-2">
            <Pin className="h-3 w-3 mt-0.5 shrink-0" />
            <span>Manually set: {client.healthOverrideNote}</span>
          </div>
        )}
        {loading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
            <Skeleton className="h-3.5 w-4/6" />
          </div>
        ) : (
          <p className="text-muted-foreground leading-relaxed">{summary}</p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

function HealthOverrideMenu({ client }: { client: ClientIntel }) {
  const mutation = useMutation({
    mutationFn: (val: { healthOverride: string | null; healthOverrideNote?: string | null }) =>
      apiRequest("PUT", `/api/clients/${client.clientId}/health-override`, val),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/reports/customer-intelligence"] }),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`btn-health-override-${client.clientId}`}>
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Set Health Override</div>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => mutation.mutate({ healthOverride: "healthy", healthOverrideNote: "Manually set healthy" })}
          data-testid={`override-healthy-${client.clientId}`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
          <span>Mark Healthy</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => mutation.mutate({ healthOverride: "watch", healthOverrideNote: "Manually set watch" })}
          data-testid={`override-watch-${client.clientId}`}
        >
          <Eye className="h-3.5 w-3.5 text-amber-600" />
          <span>Mark Watch</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 cursor-pointer"
          onClick={() => mutation.mutate({ healthOverride: "at_risk", healthOverrideNote: "Manually set at risk" })}
          data-testid={`override-atrisk-${client.clientId}`}
        >
          <AlertCircle className="h-3.5 w-3.5 text-red-600" />
          <span>Mark At Risk</span>
        </DropdownMenuItem>
        {client.isOverridden && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-muted-foreground"
              onClick={() => mutation.mutate({ healthOverride: null, healthOverrideNote: null })}
              data-testid={`override-clear-${client.clientId}`}
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Override</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const trendIcon = (dir: string) => {
  if (dir === "growing") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (dir === "declining") return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const tierLabel = (t: string | null) => {
  if (t === "tier_1") return <Badge variant="outline" className="text-xs border-primary/30 text-primary">Tier 1</Badge>;
  if (t === "tier_2") return <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">Tier 2</Badge>;
  if (t === "tier_3") return <Badge variant="outline" className="text-xs border-gray-300 text-gray-500">Tier 3</Badge>;
  return <span className="text-xs text-muted-foreground">—</span>;
};

export default function CustomerReport() {
  const { user: authUser } = useAuth();
  const isAdminOrManager = authUser?.role === "super_admin" || authUser?.role === "admin" || authUser?.role === "manager";

  const [tierFilter, setTierFilter] = useState("all");
  const [healthFilterState, setHealthFilterState] = useState("all");
  const [filterUserId, setFilterUserId] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ltv");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: directoryUsers = [] } = useQuery<{id: string; firstName: string|null; lastName: string|null; email: string|null; role: string|null}[]>({
    queryKey: ["/api/users/directory"],
    enabled: isAdminOrManager,
  });

  const queryParams = new URLSearchParams();
  if (tierFilter !== "all") queryParams.set("tier", tierFilter);
  if (healthFilterState !== "all") queryParams.set("health", healthFilterState);
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);
  if (filterUserId !== "all") queryParams.set("userId", filterUserId);

  const { data: clients, isLoading, isError } = useQuery<ClientIntel[]>({
    queryKey: ["/api/reports/customer-intelligence", tierFilter, healthFilterState, dateFrom, dateTo, filterUserId],
    queryFn: async () => {
      const res = await fetch(`/api/reports/customer-intelligence?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    if (!clients) return [];
    let filtered = clients;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(c => c.name.toLowerCase().includes(q));
    }
    const numericVal = (c: ClientIntel, key: SortKey): number => {
      switch (key) {
        case "ltv": return c.ltv;
        case "hitRate": return c.hitRate ?? -1;
        case "pipelineValue": return c.pipelineValue;
        case "velocityLast90": return c.velocityLast90;
        case "activeJobs": return c.activeJobs;
        case "healthScore": return c.healthScore;
        default: return 0;
      }
    };
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") {
        return sortDir === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      const av = numericVal(a, sortKey);
      const bv = numericVal(b, sortKey);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [clients, search, sortKey, sortDir]);

  const totalLtv = sorted.reduce((s, c) => s + c.ltv, 0);
  const totalPipeline = sorted.reduce((s, c) => s + c.pipelineValue, 0);
  const healthyCnt = sorted.filter(c => c.healthStatus === "healthy").length;
  const watchCnt = sorted.filter(c => c.healthStatus === "watch").length;
  const atRiskCnt = sorted.filter(c => c.healthStatus === "at_risk").length;

  const SortHeader = ({ label, field, className }: { label: string; field: SortKey; className?: string }) => (
    <th className={cn("py-2 px-3 font-medium cursor-pointer hover:text-foreground select-none", className)} onClick={() => toggleSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && <ArrowUpDown className="h-3 w-3" />}
      </span>
    </th>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-2">
            <HeartPulse className="h-7 w-7 text-primary" />
            Customer Intelligence
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Account health, lifetime value, and pipeline metrics across all customers</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total LTV</p>
            <p className="text-xl font-heading font-bold mt-1" data-testid="text-total-ltv">{isLoading ? "…" : fmt(totalLtv)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pipeline</p>
            <p className="text-xl font-heading font-bold mt-1" data-testid="text-total-pipeline">{isLoading ? "…" : fmt(totalPipeline)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Healthy</p>
            <p className="text-xl font-heading font-bold mt-1 text-green-600" data-testid="text-healthy-count">{isLoading ? "…" : healthyCnt}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">At Risk</p>
            <p className="text-xl font-heading font-bold mt-1 text-red-600" data-testid="text-atrisk-count">{isLoading ? "…" : atRiskCnt}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search customers…" className="pl-9 w-full" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-report" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-full sm:w-32" data-testid="select-tier-filter">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="tier_1">Tier 1</SelectItem>
              <SelectItem value="tier_2">Tier 2</SelectItem>
              <SelectItem value="tier_3">Tier 3</SelectItem>
            </SelectContent>
          </Select>
          <Select value={healthFilterState} onValueChange={setHealthFilterState}>
            <SelectTrigger className="w-full sm:w-32" data-testid="select-health-filter">
              <SelectValue placeholder="Health" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Health</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="watch">Watch</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-36" placeholder="From" data-testid="input-date-from" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-36" placeholder="To" data-testid="input-date-to" />
          {isAdminOrManager && (
            <Select value={filterUserId} onValueChange={setFilterUserId}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-user-filter">
                <SelectValue placeholder="All Reps" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reps</SelectItem>
                {authUser?.id && (
                  <SelectItem value={authUser.id}>My Data</SelectItem>
                )}
                {directoryUsers
                  .filter(u => u.id !== authUser?.id)
                  .map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email ?? u.id}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{sorted.length} customers</span>
      </div>

      {/* Scoring explanation */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 flex flex-wrap gap-x-4 gap-y-1">
        <span className="font-medium text-foreground">Health scoring:</span>
        <span>Revenue trend <strong className="text-foreground">+2 growing / +1 flat</strong></span>
        <span>Job velocity <strong className="text-foreground">+1</strong></span>
        <span>Active pipeline <strong className="text-foreground">+1</strong></span>
        <span>LTV &gt;$25K <strong className="text-foreground">+1</strong></span>
        <span>Service agreement <strong className="text-foreground">+1</strong></span>
        <span>Healthy ≥ 4 pts · Watch 2–3 pts · At Risk &lt; 2 pts</span>
        <span className="flex items-center gap-1"><Pin className="h-3 w-3 text-amber-500" /> = manually pinned</span>
      </div>

      <Card className="shadow-sm bg-card">
        <CardContent className="p-0">
          {isError ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-red-600">Failed to load report</p>
              <p className="text-sm">Please try refreshing the page.</p>
            </div>
          ) : isLoading ? (
            <div className="p-6"><Skeleton className="h-60 w-full" /></div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No customers with enough data</p>
              <p className="text-sm">Customers need at least one deal or BuildOps record to appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-customer-intelligence">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <SortHeader label="Customer" field="name" />
                    <th className="py-2 px-3 font-medium">Tier</th>
                    <SortHeader label="Health" field="healthScore" />
                    <SortHeader label="LTV" field="ltv" className="text-right" />
                    <SortHeader label="Pipeline" field="pipelineValue" className="text-right" />
                    <SortHeader label="Velocity (90d)" field="velocityLast90" className="text-right" />
                    <SortHeader label="Hit Rate" field="hitRate" className="text-right" />
                    <SortHeader label="Active Jobs" field="activeJobs" className="text-right" />
                    <th className="py-2 px-3 font-medium">Activity</th>
                    <th className="py-2 px-3 font-medium text-right">Deals (W/L/O)</th>
                    <th className="py-2 px-3 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(c => (
                    <tr key={c.clientId} className="border-b hover:bg-muted/50 group" data-testid={`row-client-${c.clientId}`}>
                      <td className="py-2.5 px-3 font-medium max-w-[220px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Link href={`/customers/${c.clientId}`} className="hover:text-primary hover:underline truncate">{c.name}</Link>
                          {c.groupChildCount > 0 && (
                            <span
                              className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20 whitespace-nowrap"
                              title={`Includes data from ${c.groupChildCount} sub-${c.groupChildCount === 1 ? "company" : "companies"}`}
                              data-testid={`badge-group-${c.clientId}`}
                            >
                              +{c.groupChildCount} sub
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">{tierLabel(c.tier)}</td>
                      <td className="py-2.5 px-3"><HealthBadgeHover client={c} /></td>
                      <td className="py-2.5 px-3 text-right font-mono">{fmt(c.ltv)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{fmt(c.pipelineValue)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{c.velocityLast90}</td>
                      <td className="py-2.5 px-3 text-right">{c.hitRate !== null ? `${c.hitRate}%` : "—"}</td>
                      <td className="py-2.5 px-3 text-right">{c.activeJobs}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {trendIcon(c.velocityDirection)}
                          {c.momentum === "rising" && (
                            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider" data-testid={`badge-momentum-${c.clientId}`}>Rising</span>
                          )}
                          {c.momentum === "declining" && (
                            <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider" data-testid={`badge-momentum-${c.clientId}`}>Declining</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-muted-foreground">{c.wonCount}/{c.lostCount}/{c.openDeals}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {isAdminOrManager && <HealthOverrideMenu client={c} />}
                          <Link href={`/customers/${c.clientId}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`link-view-${c.clientId}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
