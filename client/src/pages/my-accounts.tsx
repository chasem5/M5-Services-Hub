import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { cn, formatCurrency } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Lead } from "@shared/schema";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  Search,
  Focus,
  Plus,
  CheckSquare,
  UserCheck,
  AlertTriangle,
  Eye,
  Users,
  X,
} from "lucide-react";
import { differenceInDays, formatDistanceToNow, isToday, isYesterday } from "date-fns";

const CLOSED_STAGES = new Set(["won", "lost", "closed_lost"]);

type SortCol = "name" | "healthScore" | "tier" | "phase" | "lastContact" | "pipelineValue";

function getHealthColor(score: number | null): string {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score >= 70) return "bg-green-100 text-green-700";
  if (score >= 40) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function getHealthStatus(score: number | null): "healthy" | "watch" | "at_risk" | "unscored" {
  if (score === null) return "unscored";
  if (score >= 70) return "healthy";
  if (score >= 40) return "watch";
  return "at_risk";
}

function getPhaseName(phase: number | null): string {
  if (!phase || phase === 1) return "New";
  if (phase === 2) return "Establishing";
  return "Established";
}

function getQualRecommendation(client: Client): string | null {
  const phase = client.customerPhase ?? 1;
  if (phase < 2) return null; // only show for past Day 90 (phase 2+)
  const score = client.healthScore;
  if (score === null) return "Awaiting scoring";
  if (score >= 70 && client.healthTrend !== "declining") return "Retain & Grow";
  if (score >= 40) return "Maintain Engagement";
  return "Rescue Plan Needed";
}

function getQualColor(rec: string | null): string {
  if (!rec || rec === "Awaiting scoring") return "bg-muted text-muted-foreground";
  if (rec === "Retain & Grow") return "bg-green-100 text-green-700";
  if (rec === "Maintain Engagement") return "bg-blue-100 text-blue-700";
  return "bg-red-100 text-red-700";
}

function TrendArrow({ trend }: { trend: string | null }) {
  if (trend === "rising") return <TrendingUp className="h-3.5 w-3.5 text-green-600 shrink-0" />;
  if (trend === "declining") return <TrendingDown className="h-3.5 w-3.5 text-red-500 shrink-0" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
}

function SortButton({ col, active, dir, onClick }: { col: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <button
      className={cn("flex items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wider hover:text-foreground transition-colors", active ? "text-foreground" : "text-muted-foreground")}
      onClick={onClick}
    >
      {col}
      <ArrowUpDown className={cn("h-3 w-3 ml-0.5", active ? "opacity-100" : "opacity-50")} />
    </button>
  );
}

export default function MyAccounts() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [trendFilter, setTrendFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [focusMode, setFocusMode] = useState(false);
  const [sortCol, setSortCol] = useState<SortCol>("healthScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const isAdminOrManager = user && ["super_admin", "admin", "manager"].includes(user.role ?? "");
  const [viewTeamId, setViewTeamId] = useState<string>("__all__");
  const [viewUserId, setViewUserId] = useState<string>("__all__");

  const { data: teamsList = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/teams"],
    enabled: !!isAdminOrManager,
  });

  const { data: userDirectory = [] } = useQuery<{ id: string; firstName: string | null; lastName: string | null; email: string }[]>({
    queryKey: ["/api/users/directory"],
    enabled: !!isAdminOrManager,
  });

  const clientsQueryKey = useMemo(() => {
    if (!isAdminOrManager) return ["/api/clients"];
    if (viewTeamId !== "__all__") return ["/api/clients", "team", viewTeamId];
    if (viewUserId !== "__mine__" && viewUserId !== "__all__") return ["/api/clients", "user", viewUserId];
    if (viewUserId === "__all__") return ["/api/clients", "all"];
    return ["/api/clients", "mine", user?.id];
  }, [isAdminOrManager, viewTeamId, viewUserId, user?.id]);

  const clientsQueryFn = useMemo(() => {
    if (!isAdminOrManager) {
      return () => fetch("/api/clients", { credentials: "include" }).then(r => r.json());
    }
    if (viewTeamId !== "__all__") {
      return () => fetch(`/api/clients?teamId=${viewTeamId}`, { credentials: "include" }).then(r => r.json());
    }
    if (viewUserId !== "__mine__" && viewUserId !== "__all__") {
      return () => fetch(`/api/clients?userId=${viewUserId}`, { credentials: "include" }).then(r => r.json());
    }
    return () => fetch("/api/clients", { credentials: "include" }).then(r => r.json());
  }, [isAdminOrManager, viewTeamId, viewUserId]);

  const { data: allClients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: clientsQueryKey,
    queryFn: clientsQueryFn,
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const milestoneSummaryParams = useMemo(() => {
    if (!isAdminOrManager) return "";
    if (viewTeamId !== "__all__") return `?teamId=${viewTeamId}`;
    if (viewUserId !== "__mine__" && viewUserId !== "__all__") return `?userId=${viewUserId}`;
    return "";
  }, [isAdminOrManager, viewTeamId, viewUserId]);

  const { data: milestoneSummary = {} } = useQuery<Record<number, { completed: number; total: number }>>({
    queryKey: ["/api/clients/milestone-summary", milestoneSummaryParams],
    queryFn: () => fetch(`/api/clients/milestone-summary${milestoneSummaryParams}`, { credentials: "include" }).then(r => r.json()),
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; relatedClientId: number; priority: string }) =>
      apiRequest("POST", "/api/tasks", { ...data, status: "todo", sortOrder: 0 }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }),
  });

  const openPipelineMap = useMemo(() => {
    const map: Record<number, number> = {};
    leads.forEach(l => {
      if (!l.clientId || CLOSED_STAGES.has(l.stage ?? "")) return;
      map[l.clientId] = (map[l.clientId] ?? 0) + Number(l.value ?? 0);
    });
    return map;
  }, [leads]);

  const myClients = useMemo(() => {
    if (isAdminOrManager) {
      // For admin viewing "mine" only
      if (viewTeamId === "__all__" && viewUserId === "__mine__") {
        return allClients.filter(c => c.accountManagerUserId === user?.id);
      }
      return allClients;
    }
    return allClients.filter(c => c.accountManagerUserId === user?.id);
  }, [allClients, isAdminOrManager, viewTeamId, viewUserId, user?.id]);

  const filteredClients = useMemo(() => {
    let result = myClients;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || (c.industry ?? "").toLowerCase().includes(q));
    }

    if (healthFilter !== "all") {
      result = result.filter(c => {
        const status = getHealthStatus(c.healthScore);
        if (healthFilter === "healthy") return status === "healthy";
        if (healthFilter === "watch") return status === "watch";
        if (healthFilter === "at_risk") return status === "at_risk";
        return true;
      });
    }

    if (tierFilter !== "all") {
      result = result.filter(c => String(c.tier) === tierFilter);
    }

    if (trendFilter !== "all") {
      result = result.filter(c => {
        const trend = c.healthTrend;
        if (trendFilter === "rising") return trend === "rising";
        if (trendFilter === "flat") return trend === "flat" || trend === null;
        if (trendFilter === "declining") return trend === "declining";
        return true;
      });
    }

    if (phaseFilter !== "all") {
      result = result.filter(c => {
        const phase = c.customerPhase ?? 1;
        if (phaseFilter === "new") return phase === 1;
        if (phaseFilter === "establishing") return phase === 2;
        if (phaseFilter === "established") return phase >= 3;
        return true;
      });
    }

    if (focusMode) {
      result = result.filter(c => {
        const status = getHealthStatus(c.healthScore);
        return status === "at_risk" || status === "watch" || c.healthTrend === "declining";
      });
    }

    result = [...result].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;

      switch (sortCol) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "healthScore":
          av = a.healthScore ?? (sortDir === "asc" ? 999 : -1);
          bv = b.healthScore ?? (sortDir === "asc" ? 999 : -1);
          break;
        case "tier":
          av = a.tier ?? "z";
          bv = b.tier ?? "z";
          break;
        case "phase":
          av = a.customerPhase ?? 1;
          bv = b.customerPhase ?? 1;
          break;
        case "lastContact":
          av = a.lastContactDate ? new Date(a.lastContactDate).getTime() : 0;
          bv = b.lastContactDate ? new Date(b.lastContactDate).getTime() : 0;
          break;
        case "pipelineValue":
          av = openPipelineMap[a.id] ?? 0;
          bv = openPipelineMap[b.id] ?? 0;
          break;
      }

      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });

    return result;
  }, [myClients, search, healthFilter, tierFilter, trendFilter, phaseFilter, focusMode, sortCol, sortDir, openPipelineMap]);

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir(col === "healthScore" ? "asc" : "desc");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map(c => c.id)));
    }
  };

  const createBulkTasks = async () => {
    const selected = filteredClients.filter(c => selectedIds.has(c.id));
    let created = 0;
    for (const client of selected) {
      await createTaskMutation.mutateAsync({
        title: `Follow up with ${client.name}`,
        relatedClientId: client.id,
        priority: (client.healthScore ?? 100) < 40 ? "high" : "medium",
      });
      created++;
    }
    setSelectedIds(new Set());
    toast({ title: `${created} task${created !== 1 ? "s" : ""} created`, description: "Follow-up tasks linked to selected accounts." });
  };

  const formatLastContact = (date: string | null): string => {
    if (!date) return "Never";
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return formatDistanceToNow(d, { addSuffix: true });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Customers section nav */}
      <div className="flex gap-0 border-b bg-background px-6 shrink-0">
        <Link href="/my-accounts">
          <span className={`inline-flex h-10 items-center px-4 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${location.startsWith("/my-accounts") ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            My Accounts
          </span>
        </Link>
        <Link href="/customers">
          <span className={`inline-flex h-10 items-center px-4 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${location.startsWith("/customers") ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            All Customers
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
      {/* Viewing As bar (admin/manager only) */}
      {isAdminOrManager && (
        <div className="flex items-center gap-3 bg-muted/50 border border-border/60 rounded-lg px-4 py-2.5">
          <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground shrink-0">Viewing as:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={viewTeamId}
              onValueChange={(v) => { setViewTeamId(v); if (v !== "__all__") setViewUserId("__all__"); }}
            >
              <SelectTrigger className="h-8 text-xs w-[160px]" data-testid="select-myaccounts-view-team">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="All Teams" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Teams</SelectItem>
                {teamsList.map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={viewUserId}
              onValueChange={(v) => { setViewUserId(v); if (v !== "__mine__" && v !== "__all__") setViewTeamId("__all__"); }}
            >
              <SelectTrigger className="h-8 text-xs w-[180px]" data-testid="select-myaccounts-view-user">
                <SelectValue placeholder="My Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__mine__">My Accounts</SelectItem>
                <SelectItem value="__all__">All Accounts</SelectItem>
                {userDirectory.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(viewTeamId !== "__all__" || (viewUserId !== "__mine__")) && (
              <button
                onClick={() => { setViewTeamId("__all__"); setViewUserId("__mine__"); }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                data-testid="button-clear-myaccounts-view-filter"
              >
                <X className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-heading font-bold tracking-tight">
            {isAdminOrManager && viewTeamId !== "__all__"
              ? `Team: ${teamsList.find(t => String(t.id) === viewTeamId)?.name ?? "..."} Accounts`
              : isAdminOrManager && viewUserId !== "__mine__" && viewUserId !== "__all__"
              ? `${userDirectory.find(u => u.id === viewUserId)?.firstName ?? "..."}'s Accounts`
              : isAdminOrManager && viewUserId === "__all__"
              ? "All Accounts"
              : "My Accounts"}
          </h1>
          {!clientsLoading && (
            <Badge variant="secondary" className="ml-1">{myClients.length}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={focusMode ? "default" : "outline"}
            size="sm"
            onClick={() => setFocusMode(v => !v)}
            className={cn("gap-1.5", focusMode && "bg-red-600 hover:bg-red-700 text-white border-red-700")}
            data-testid="button-focus-mode"
          >
            <Focus className="h-3.5 w-3.5" />
            Focus Mode
            {focusMode && <Badge className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0">ON</Badge>}
          </Button>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={createBulkTasks}
              disabled={createTaskMutation.isPending}
              data-testid="button-bulk-create-tasks"
              className="gap-1.5"
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Create tasks ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search accounts..."
            className="pl-9 h-9 text-sm"
            data-testid="input-search-accounts"
          />
        </div>
        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-health-filter">
            <SelectValue placeholder="Health status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="watch">Watch</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-28 h-9 text-sm" data-testid="select-tier-filter">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="1">Tier 1</SelectItem>
            <SelectItem value="2">Tier 2</SelectItem>
            <SelectItem value="3">Tier 3</SelectItem>
          </SelectContent>
        </Select>
        <Select value={trendFilter} onValueChange={setTrendFilter}>
          <SelectTrigger className="w-32 h-9 text-sm" data-testid="select-trend-filter">
            <SelectValue placeholder="Trend" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trends</SelectItem>
            <SelectItem value="rising">Rising</SelectItem>
            <SelectItem value="flat">Flat</SelectItem>
            <SelectItem value="declining">Declining</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-36 h-9 text-sm" data-testid="select-phase-filter">
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="establishing">Establishing</SelectItem>
            <SelectItem value="established">Established</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Focus Mode Banner */}
      {focusMode && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-semibold">Focus Mode active</span> — showing only Watch and At Risk accounts.
        </div>
      )}

      {/* Table */}
      <Card className="shadow-sm border-border/40 overflow-hidden">
        {clientsLoading ? (
          <CardContent className="py-6 space-y-3">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        ) : filteredClients.length === 0 ? (
          <CardContent className="py-12 text-center text-muted-foreground text-sm" data-testid="empty-state-accounts">
            {myClients.length === 0
              ? "No accounts are assigned to you yet."
              : focusMode
              ? "All your accounts are healthy. Nice work."
              : "No accounts match the current filters."}
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="px-4 py-3 text-left w-10">
                    <Checkbox
                      checked={selectedIds.size > 0 && selectedIds.size === filteredClients.length}
                      onCheckedChange={toggleSelectAll}
                      data-testid="checkbox-select-all"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <SortButton col="Customer" active={sortCol === "name"} dir={sortDir} onClick={() => handleSort("name")} />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <SortButton col="Health" active={sortCol === "healthScore"} dir={sortDir} onClick={() => handleSort("healthScore")} />
                  </th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">
                    <SortButton col="Tier" active={sortCol === "tier"} dir={sortDir} onClick={() => handleSort("tier")} />
                  </th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">
                    <SortButton col="Phase" active={sortCol === "phase"} dir={sortDir} onClick={() => handleSort("phase")} />
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <SortButton col="Last Contact" active={sortCol === "lastContact"} dir={sortDir} onClick={() => handleSort("lastContact")} />
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <SortButton col="Open Pipeline" active={sortCol === "pipelineValue"} dir={sortDir} onClick={() => handleSort("pipelineValue")} />
                  </th>
                  <th className="px-4 py-3 text-left hidden xl:table-cell">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recommendation</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, idx) => {
                  const isSelected = selectedIds.has(client.id);
                  const rec = getQualRecommendation(client);
                  const pipelineVal = openPipelineMap[client.id] ?? 0;
                  const healthStatus = getHealthStatus(client.healthScore);

                  return (
                    <tr
                      key={client.id}
                      className={cn(
                        "border-b border-border/30 cursor-pointer transition-colors hover:bg-muted/30",
                        isSelected && "bg-primary/5",
                        idx % 2 === 0 ? "" : "bg-muted/10",
                      )}
                      onClick={() => setLocation(`/customers/${client.id}`)}
                      data-testid={`row-my-account-${client.id}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(client.id)}
                          data-testid={`checkbox-account-${client.id}`}
                          aria-label={`Select ${client.name}`}
                        />
                      </td>

                      {/* Customer name */}
                      <td className="px-4 py-3">
                        <div className="font-semibold truncate max-w-[180px]">{client.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">{client.industry ?? "—"}</div>
                        {isAdminOrManager && client.teamId && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 mt-0.5" data-testid={`badge-team-${client.id}`}>
                            {teamsList.find(t => t.id === client.teamId)?.name ?? `Team #${client.teamId}`}
                          </Badge>
                        )}
                      </td>

                      {/* Health */}
                      <td className="px-4 py-3">
                        {client.customerPhase === 1 || client.healthScore === null ? (
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]" data-testid={`badge-phase1-${client.id}`}>New</Badge>
                            <span className="text-[10px] text-muted-foreground font-medium" data-testid={`text-milestone-count-${client.id}`}>
                              {(milestoneSummary[client.id]?.completed ?? 0)}/{(milestoneSummary[client.id]?.total ?? 7)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", getHealthColor(client.healthScore))}>
                              {client.healthScore}
                            </span>
                            <TrendArrow trend={client.healthTrend} />
                          </div>
                        )}
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        {client.tier ? (
                          <Badge variant="outline" className="text-[10px]">T{client.tier}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Phase */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{getPhaseName(client.customerPhase)}</span>
                      </td>

                      {/* Last Contact */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">{formatLastContact(client.lastContactDate as string | null)}</span>
                      </td>

                      {/* Open Pipeline */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {pipelineVal > 0 ? (
                          <span className="text-xs font-semibold text-foreground tabular-nums">{formatCurrency(pipelineVal)}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Recommendation */}
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {rec ? (
                          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", getQualColor(rec))}>
                            {rec}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Summary */}
      {!clientsLoading && filteredClients.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Showing {filteredClients.length} of {myClients.length} accounts
          {focusMode ? " (Focus Mode)" : ""}
        </p>
      )}
      </div>
    </div>
  );
}
