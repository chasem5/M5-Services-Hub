import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Target,
  DollarSign,
  Briefcase,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  ArrowRight,
  Trophy,
  AlertTriangle,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Plus,
  X,
  UserPlus,
  Phone,
  Building2,
  Filter,
  Mail,
  FileText,
  Send,
  BellRing,
  TriangleAlert,
  RefreshCw,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { formatDistanceToNow, format, parseISO, differenceInDays } from "date-fns";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityLog, Task, Client, ClientContact, Lead } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QuickActionsBar } from "@/components/QuickActionsBar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/models/auth";

interface DashboardStats {
  activeLeads: number;
  activeLeadsCRM: number;
  activeLeadsBuildOps: number;
  pipelineValue: string;
  pipelineValueCRM: string;
  pipelineValueBuildOps: string;
  openTasks: number;
  tasksDueToday: number;
  monthlyRevenue: string;
  leadStageCounts: { stage: string; count: number }[];
  winRate: number | null;
  overdueTasks: number;
  revenueByMonth: { month: string; revenue: string }[];
  estimateStatusCounts: { status: string; count: number }[];
  bdSpendThisMonth: string;
  topClients: { clientId: number; name: string; pipelineValue: string }[];
  mrr: string;
  wonDealsByClient: { clientId: number | null; name: string; totalValue: string; dealCount: number }[];
}

interface PulseAlert {
  type: string;
  leadId: number | null;
  clientId: number | null;
  clientName: string;
  title: string;
  daysSince?: number;
  daysLeft?: number;
  hoursSince?: number;
  priority?: string;
  threadId?: string;
  estimateId?: number;
  total?: string | number;
  daysOld?: number;
  endDate?: string;
  daysUntil?: number;
  action?: string;
}

interface QuotePipelineItem {
  id: number | string;
  title: string | null;
  status: string;
  total: string | null;
  clientId: number | null;
  clientName: string;
  leadId: number | null;
  buildopsQuoteId: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  daysOld: number;
  source: "crm" | "buildops";
}

interface TeamPerformanceStat {
  userId: string;
  name: string;
  email: string;
  leadsAssigned: number;
  leadsWon: number;
  pipelineValue: string;
  wonValueMonth: string;
  tasksCompletedMonth: number;
}

const ESTIMATE_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  sent: "#3b82f6",
  accepted: "#22c55e",
  rejected: "#ef4444",
};

const ESTIMATE_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
};

const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value));

const formatShortCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
};

const monthLabel = (yearMonth: string) => {
  try {
    return format(parseISO(`${yearMonth}-01`), "MMM");
  } catch {
    return yearMonth;
  }
};

const stageLabels: Record<string, string> = {
  met_introduced: "Met / Introduced",
  new_lead: "Reached Out",
  in_conversation: "In Conversation",
  qualified: "Ready for Proposal",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdminOrManager = user?.role === "super_admin" || user?.role === "admin" || user?.role === "manager";
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [quickAction, setQuickAction] = useState<"deal" | "contact" | "company" | "task" | "activity" | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>(user?.dashboardFilter ?? "all");
  const [pulseTab, setPulseTab] = useState<"all" | "F" | "E" | "A" | "B" | "C" | "D">("all");
  const [pulseCollapsed, setPulseCollapsed] = useState(true);
  const [pipelineCollapsed, setPipelineCollapsed] = useState(true);

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdminOrManager,
  });

  const saveFilterMutation = useMutation({
    mutationFn: (filter: string) =>
      apiRequest("PATCH", "/api/users/me", { dashboardFilter: filter }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", activeFilter] });
    },
  });

  const handleFilterChange = (val: string) => {
    setActiveFilter(val);
    saveFilterMutation.mutate(val);
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
  };

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard", activeFilter],
    queryFn: () => fetch(`/api/dashboard?filter=${encodeURIComponent(activeFilter)}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: contacts = [] } = useQuery<ClientContact[]>({
    queryKey: ["/api/client-contacts"],
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: teamStats, isLoading: teamLoading } = useQuery<TeamPerformanceStat[]>({
    queryKey: ["/api/dashboard/team-performance"],
    enabled: isAdminOrManager,
  });

  const { data: clientPulse = [], isLoading: pulseLoading, refetch: refetchPulse } = useQuery<PulseAlert[]>({
    queryKey: ["/api/client-pulse"],
  });

  const { data: quotesPipeline = [], isLoading: pipelineLoading } = useQuery<QuotePipelineItem[]>({
    queryKey: ["/api/quotes-pipeline"],
  });

  const snoozeLead = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/leads/${id}/snooze-follow-up`, {}).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/client-pulse"] }),
  });

  const snoozeEstimate = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/estimates/${id}/snooze-follow-up`, {}).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/client-pulse"] }),
  });

  // Onboarding logic
  const [onboardingSteps, setOnboardingSteps] = useState<Record<string, boolean>>({});
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`onboarding_${user.id}`);
      if (stored) {
        setOnboardingSteps(JSON.parse(stored));
      }
      const dismissed = localStorage.getItem(`onboarding_${user.id}_dismissed`);
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }
  }, [user]);

  const toggleStep = (stepId: string) => {
    const newSteps = { ...onboardingSteps, [stepId]: !onboardingSteps[stepId] };
    setOnboardingSteps(newSteps);
    if (user) {
      localStorage.setItem(`onboarding_${user.id}`, JSON.stringify(newSteps));
    }
  };

  const dismissOnboarding = () => {
    setIsDismissed(true);
    if (user) {
      localStorage.setItem(`onboarding_${user.id}_dismissed`, "true");
    }
  };

  const onboardingItems = [
    { id: "company", title: "Add your first company", icon: Building2, href: "/customers", done: clients.length > 0 || onboardingSteps["company"] },
    { id: "contact", title: "Add a contact", icon: UserPlus, href: "/customers", done: contacts.length > 0 || onboardingSteps["contact"] },
    { id: "lead", title: "Create your first lead", icon: Target, href: "/leads", done: leads.length > 0 || onboardingSteps["lead"] },
    { id: "activity", title: "Log your first activity", icon: Phone, action: () => setQuickAction("activity"), done: onboardingSteps["activity"] },
  ];

  const completedCount = onboardingItems.filter(item => item.done).length;
  const isNewUser = user && differenceInDays(new Date(), new Date(user.createdAt)) < 7;
  const showOnboarding = isNewUser && !isDismissed && completedCount < 4;

  const getRelativeTime = (date: string | Date) =>
    formatDistanceToNow(new Date(date), { addSuffix: true });

  const upcomingTasks = tasks
    ?.filter((task) => task.status !== "done" && task.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const recentActivities = activities?.slice(0, 10);

  const chartData = (stats?.revenueByMonth ?? []).map((r) => ({
    month: monthLabel(r.month),
    revenue: Number(r.revenue),
  }));

  const wonDealsChartData = (stats?.wonDealsByClient ?? []).map(c => ({
    name: c.name.length > 22 ? c.name.slice(0, 21) + "…" : c.name,
    value: Number(c.totalValue),
    dealCount: c.dealCount,
  }));

  const pieData = (stats?.estimateStatusCounts ?? []).map((e) => ({
    name: ESTIMATE_LABELS[e.status] ?? e.status,
    value: Number(e.count),
    status: e.status,
  }));
  const totalEstimates = pieData.reduce((s, d) => s + d.value, 0);

  const topMax = stats?.topClients?.[0] ? Number(stats.topClients[0].pipelineValue) : 1;
  const bdSpend = Number(stats?.bdSpendThisMonth ?? 0);
  const revenue = Number(stats?.monthlyRevenue ?? 0);
  const totalBdRev = bdSpend + revenue;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={activeFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-44 h-9 text-sm" data-testid="select-dashboard-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Team</SelectItem>
              <SelectItem value="mine">My Data</SelectItem>
              {isAdminOrManager && allUsers.filter(u => u.id !== user?.id).map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showOnboarding && (
        <Card className="border-primary/20 bg-primary/5 shadow-sm relative overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground z-10"
            onClick={dismissOnboarding}
            data-testid="button-dismiss-onboarding"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Complete these steps to get the most out of M5 CRM.
              <span className="ml-2 font-medium text-primary">
                {completedCount}/4 complete
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {onboardingItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col p-4 rounded-lg border bg-card transition-all hover:shadow-md",
                    item.done ? "border-primary/20 bg-primary/5" : "border-border"
                  )}
                  data-testid={`onboarding-step-${item.id}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "p-2 rounded-md",
                      item.done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleStep(item.id)}
                      data-testid={`button-toggle-step-${item.id}`}
                    >
                      {item.done ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <h3 className={cn(
                    "text-sm font-semibold mb-2",
                    item.done && "text-muted-foreground line-through"
                  )}>
                    {item.title}
                  </h3>
                  {item.href ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto w-full text-xs"
                      asChild
                    >
                      <Link href={item.href}>Go to Page</Link>
                    </Button>
                  ) : item.action ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto w-full text-xs"
                      onClick={item.action}
                    >
                      Open Tool
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QuickActionsBar for onboarding actions */}
      <QuickActionsBar
        showButton={false}
        externalDialog={quickAction === "activity" ? null : quickAction as any}
        onExternalOpen={(d) => setQuickAction(d as any)}
      />

      {/* Metric Cards — 7-col grid, Pipeline Value spans 2, Tasks combined */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
        {/* Active Leads with CRM/BuildOps breakdown */}
        <Card className="shadow-sm border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
              Active Leads
            </CardTitle>
            <Target className="h-4 w-4 shrink-0 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <>
                <div className="font-heading font-bold text-xl leading-tight" data-testid="text-active-leads">
                  {stats?.activeLeads ?? 0}
                </div>
                {(stats?.activeLeadsCRM !== undefined || stats?.activeLeadsBuildOps !== undefined) && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {stats.activeLeadsCRM ?? 0} CRM · {stats.activeLeadsBuildOps ?? 0} BuildOps
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Value with CRM/BuildOps breakdown */}
        <Card className="shadow-sm border-border/40 bg-card col-span-1 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
              Pipeline Value
            </CardTitle>
            <DollarSign className="h-4 w-4 shrink-0 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="font-heading font-bold text-xl leading-tight" data-testid="text-pipeline-value">
                  {stats ? formatCurrency(stats.pipelineValue) : "—"}
                </div>
                {(stats?.pipelineValueCRM !== undefined || stats?.pipelineValueBuildOps !== undefined) && (
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {formatCurrency(stats.pipelineValueCRM ?? 0)} CRM · {formatCurrency(stats.pipelineValueBuildOps ?? 0)} BO
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <MetricCard
          title="Avg Monthly Revenue"
          value={stats ? formatCurrency(stats.mrr) : undefined}
          icon={TrendingUp}
          loading={statsLoading}
          dataTestId="text-estimated-mrr"
          accentColor="text-blue-600"
          subtitle="12-mo invoice avg"
        />
        <MetricCard
          title="Monthly Revenue"
          value={stats ? formatCurrency(stats.monthlyRevenue) : undefined}
          icon={TrendingUp}
          loading={statsLoading}
          dataTestId="text-monthly-revenue"
        />

        {/* Win Rate with time window label */}
        <Card className="shadow-sm border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
              Win Rate
            </CardTitle>
            <Trophy className="h-4 w-4 shrink-0 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <>
                <div
                  className={cn(
                    "font-heading font-bold text-xl leading-tight",
                    stats?.winRate !== null && stats?.winRate !== undefined
                      ? stats.winRate >= 50 ? "text-green-600" : "text-orange-500"
                      : undefined
                  )}
                  data-testid="text-win-rate"
                >
                  {stats ? (stats.winRate !== null ? `${stats.winRate}%` : "—") : "—"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">Last 12 months</div>
              </>
            )}
          </CardContent>
        </Card>
        {/* Combined Tasks card */}
        <Card className="shadow-sm border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
              Tasks
            </CardTitle>
            <Briefcase className="h-4 w-4 shrink-0 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <>
                <div className="font-heading font-bold text-xl leading-tight" data-testid="text-open-tasks">
                  {stats?.openTasks ?? 0}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">{stats?.tasksDueToday ?? 0} due today</span>
                  <span className="text-muted-foreground/30 text-[10px]">·</span>
                  <span className={cn(
                    "text-[11px]",
                    Number(stats?.overdueTasks) > 0 ? "text-destructive font-medium" : "text-muted-foreground"
                  )}>
                    {stats?.overdueTasks ?? 0} overdue
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Required + Quotes Pipeline */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Action Required (Client Pulse) */}
        <Card className="shadow-sm border-border/40 bg-card">
          <CardHeader className="pb-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-heading font-bold flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-primary" />
                  Action Required
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Follow-up signals across deals &amp; quotes</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground shrink-0"
                onClick={() => setPulseCollapsed(!pulseCollapsed)}
                data-testid="button-toggle-pulse"
              >
                {pulseCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>

            {/* Collapsed summary row */}
            {pulseCollapsed && !pulseLoading && clientPulse.length > 0 && (() => {
              const categoryDefs: { key: "F" | "E" | "A" | "B" | "C" | "D"; label: string; color: string }[] = [
                { key: "F", label: "Expired",    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
                { key: "E", label: "Expiring",   color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
                { key: "A", label: "Acknowledge",color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
                { key: "B", label: "Price",      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
                { key: "C", label: "Draft",      color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
                { key: "D", label: "Follow-Up",  color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
              ];
              const counts = categoryDefs.map(c => ({
                ...c,
                count: clientPulse.filter((p) => p.type === c.key).length,
              })).filter(c => c.count > 0);
              return (
                <div className="flex flex-wrap gap-1.5 mt-3 pb-1">
                  {counts.map(c => (
                    <button
                      key={c.key}
                      onClick={() => { setPulseCollapsed(false); setPulseTab(c.key); }}
                      data-testid={`pulse-summary-${c.key}`}
                      className={cn("text-xs px-2 py-0.5 rounded-full font-semibold", c.color)}
                    >
                      {c.label} <span className="font-bold">{c.count}</span>
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* Tab bar — only when expanded */}
            {!pulseCollapsed && !pulseLoading && clientPulse.length > 0 && (() => {
              const tabDefs: { key: "all"|"F"|"E"|"A"|"B"|"C"|"D"; label: string; activeClass: string }[] = [
                { key: "all", label: "All",        activeClass: "bg-primary text-white" },
                { key: "F",   label: "Expired",    activeClass: "bg-orange-600 text-white" },
                { key: "A",   label: "Acknowledge", activeClass: "bg-amber-500 text-white" },
                { key: "B",   label: "Price",       activeClass: "bg-blue-600 text-white" },
                { key: "C",   label: "Draft",       activeClass: "bg-orange-500 text-white" },
                { key: "D",   label: "Follow-Up",   activeClass: "bg-purple-600 text-white" },
                { key: "E",   label: "Expiring",    activeClass: "bg-red-600 text-white" },
              ];
              return (
                <div className="flex flex-wrap gap-1 mt-3 pb-1">
                  {tabDefs.map(({ key, label, activeClass }) => {
                    const count = key === "all" ? clientPulse.length : clientPulse.filter((p) => p.type === key).length;
                    if (key !== "all" && count === 0) return null;
                    return (
                      <button
                        key={key}
                        onClick={() => setPulseTab(key)}
                        data-testid={`pulse-tab-${key}`}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-full font-medium transition-colors leading-none",
                          pulseTab === key
                            ? activeClass
                            : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {label}
                        <span className={cn(
                          "ml-1 text-[10px] font-bold",
                          pulseTab === key ? "opacity-80" : "opacity-60"
                        )}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </CardHeader>
          <CardContent className="p-0 mt-2">
            {pulseCollapsed ? (
              clientPulse.length === 0 && !pulseLoading ? (
                <div className="px-6 pb-4 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  All caught up — no follow-ups needed
                </div>
              ) : null
            ) : pulseLoading ? (
              <div className="px-6 pb-4 space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : clientPulse.length === 0 ? (
              <div className="px-6 pb-6 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                All caught up — no follow-ups needed
              </div>
            ) : (() => {
              const sectionMeta: Record<string, { icon: LucideIcon; label: string; color: string; desc: string }> = {
                F: { icon: TriangleAlert, label: "Expired Quote",              color: "text-orange-600",  desc: "Quote has expired — reach out to re-engage this client" },
                E: { icon: TriangleAlert, label: "Expiring Soon",              color: "text-red-600",    desc: "Sent quote approaching its 30-day window — act before it lapses" },
                A: { icon: Mail,         label: "Acknowledge Client Request",  color: "text-amber-600",  desc: "Inbound email received — client is waiting on a reply for 24+ hours" },
                B: { icon: FileText,     label: "Price Not Sent",              color: "text-blue-600",   desc: "Active deal with no estimate started — client hasn't seen any pricing yet" },
                C: { icon: FileText,     label: "Draft Quote Stale",           color: "text-orange-600", desc: "Estimate created but never sent — sitting as a draft for 2+ days" },
                D: { icon: Send,         label: "Follow Up Sent Quote",        color: "text-purple-600", desc: "Quote sent 7+ days ago with no response — time to check back in" },
              };

              const PulseRow = ({ item, idx, showCategory }: { item: PulseAlert; idx: number; showCategory?: boolean }) => {
                const isExpiring = item.type === "E";
                const isExpired = item.type === "F";
                const pillColor = isExpired
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                  : isExpiring
                  ? ((item.daysLeft ?? Infinity) <= 3 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300")
                  : (item.priority === "high" || (item.daysSince ?? 0) >= 3
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300");
                const meta = sectionMeta[item.type];
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 group"
                    data-testid={`pulse-item-${item.type}-${item.leadId ?? item.estimateId ?? idx}`}
                  >
                    {showCategory && (
                      <meta.icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.title}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${pillColor}`}>
                      {isExpired
                        ? "Expired"
                        : isExpiring
                        ? `Exp. in ${item.daysLeft}d`
                        : item.hoursSince != null && item.hoursSince < 48
                          ? `${item.hoursSince}h`
                          : `${item.daysSince}d`}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-20 hover:!opacity-40 text-muted-foreground"
                          data-testid={`button-snooze-${item.type}-${item.leadId ?? item.estimateId ?? idx}`}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem
                          className="text-xs cursor-pointer"
                          onClick={() => {
                            if (item.leadId) snoozeLead.mutate(item.leadId);
                            else if (item.estimateId) snoozeEstimate.mutate(item.estimateId);
                          }}
                        >
                          Snooze 7 days
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              };

              if (pulseTab !== "all") {
                const items = clientPulse.filter((p) => p.type === pulseTab);
                const meta = sectionMeta[pulseTab];
                return (
                  <div className="divide-y divide-border/40">
                    <div className="px-4 pt-2 pb-2 bg-muted/30">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${meta.color}`}>
                        <meta.icon className="h-3 w-3" />
                        {meta.label}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{meta.desc}</p>
                    </div>
                    {items.map((item, idx) => (
                      <PulseRow key={idx} item={item} idx={idx} />
                    ))}
                  </div>
                );
              }

              return (
                <div className="divide-y divide-border/40">
                  {(["F","E","A","B","C","D"] as const).map(type => {
                    const section = clientPulse.filter((p) => p.type === type);
                    if (!section.length) return null;
                    const meta = sectionMeta[type];
                    return (
                      <div key={type}>
                        <div className="px-4 pt-2 pb-2 bg-muted/30">
                          <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${meta.color}`}>
                            <meta.icon className="h-3 w-3" />
                            {meta.label}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{meta.desc}</p>
                        </div>
                        {section.map((item, idx) => (
                          <PulseRow key={idx} item={item} idx={idx} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Quotes Pipeline */}
        <Card className="shadow-sm border-border/40 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-heading font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Quotes Pipeline
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Active estimates + expired quotes</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground shrink-0"
                onClick={() => setPipelineCollapsed(!pipelineCollapsed)}
                data-testid="button-toggle-pipeline"
              >
                {pipelineCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>

            {pipelineCollapsed && !pipelineLoading && quotesPipeline.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {(["draft", "sent", "expired"] as const).map(status => {
                  const count = quotesPipeline.filter(q => q.status === status).length;
                  if (count === 0) return null;
                  const total = quotesPipeline.filter(q => q.status === status).reduce((s, q) => s + Number(q.total ?? 0), 0);
                  return (
                    <button
                      key={status}
                      onClick={() => setPipelineCollapsed(false)}
                      data-testid={`pipeline-summary-${status}`}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full font-semibold",
                        status === "draft"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          : status === "expired"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      )}
                    >
                      {status === "draft" ? "Draft" : status === "expired" ? "Expired" : "Sent"} {count} · {formatCurrency(total)}
                    </button>
                  );
                })}
              </div>
            )}
          </CardHeader>
          {!pipelineCollapsed && (
          <CardContent className="p-0">
            {pipelineLoading ? (
              <div className="px-6 pb-4 space-y-2">
                {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-3 divide-x divide-border/40">
                {(["draft","sent","expired"] as const).map(status => {
                  const items = quotesPipeline.filter((q) => q.status === status);
                  return (
                    <div key={status}>
                      <div className={cn(
                        "px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5",
                        status === "expired" ? "bg-orange-50 dark:bg-orange-950/20" : "bg-muted/30"
                      )}>
                        {status === "draft" ? <FileText className="h-3 w-3" /> : status === "expired" ? <TriangleAlert className="h-3 w-3 text-orange-500" /> : <Send className="h-3 w-3" />}
                        {status === "draft" ? "Draft" : status === "expired" ? "Expired" : "Sent"} ({items.length})
                      </div>
                      {items.length === 0 ? (
                        <p className="px-4 py-4 text-xs text-muted-foreground italic">None</p>
                      ) : (
                        <div className="divide-y divide-border/40">
                          {items.map((q) => {
                            const href = q.leadId
                              ? `/leads/${q.leadId}`
                              : q.source === "crm"
                              ? `/estimates/${q.id}`
                              : `/leads/${q.leadId}`;
                            return (
                              <Link key={q.id} href={href}>
                                <div
                                  className="px-4 py-2.5 hover:bg-muted/20 cursor-pointer group"
                                  data-testid={`quote-tile-${q.id}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-semibold text-sm truncate">{q.clientName}</p>
                                      <p className="text-xs text-muted-foreground truncate">{q.title}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(q.total ?? "0")}</p>
                                      <div className="flex items-center gap-1 justify-end">
                                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${q.daysOld >= 7 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : q.daysOld >= 3 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                                          {q.daysOld}d
                                        </span>
                                        {q.buildopsQuoteId && (
                                          <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">BO</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          )}
        </Card>
      </div>

      {/* Row 2: Revenue Trend + Upcoming Tasks */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue Trend (bar chart) + Lead Pipeline stacked */}
        <Card className="col-span-4 shadow-sm border-border/40 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-heading">Revenue Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Invoice revenue — last 12 months</p>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatShortCurrency}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                    contentStyle={{
                      fontSize: 12,
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      background: "var(--background)",
                      color: "var(--foreground)",
                    }}
                  />
                  <Bar dataKey="revenue" fill="#BE1916" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Lead Pipeline breakdown */}
            <div className="mt-4 pt-4 border-t border-border/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Lead Pipeline Stages</p>
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats?.leadStageCounts
                    .filter((item) => !["won", "lost"].includes(item.stage))
                    .map((item) => (
                      <div key={item.stage} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{stageLabels[item.stage] ?? item.stage}</span>
                          <span className="text-muted-foreground tabular-nums">{item.count}</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{
                              width: `${Math.max((item.count / (Number(stats.activeLeads) || 1)) * 100, item.count > 0 ? 3 : 0)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="col-span-3 shadow-sm border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-heading">Upcoming Tasks</CardTitle>
            <Button variant="ghost" size="sm" asChild className="no-default-hover-elevate">
              <Link href="/tasks">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : upcomingTasks?.length ? (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group"
                  >
                    <div
                      className={cn(
                        "mt-1 h-2 w-2 rounded-full shrink-0",
                        task.priority === "high"
                          ? "bg-destructive"
                          : task.priority === "medium"
                          ? "bg-orange-500"
                          : "bg-blue-500"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</span>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-8 w-8">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground italic text-sm">
                No upcoming tasks
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Estimate Conversion Donut + BD Spend vs Revenue + Top Clients */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Estimate Pipeline Donut */}
        <Card className="col-span-2 shadow-sm border-border/40 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-heading">Estimate Pipeline</CardTitle>
            <p className="text-xs text-muted-foreground">Estimates by status</p>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : totalEstimates === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No estimates yet</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <ResponsiveContainer width={180} height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={72}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.status} fill={ESTIMATE_COLORS[entry.status] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, name: string) => [v, name]}
                        contentStyle={{
                          fontSize: 12,
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          background: "var(--background)",
                          color: "var(--foreground)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-2xl font-bold font-heading">{totalEstimates}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                    </div>
                  </div>
                </div>
                <div className="w-full mt-1 space-y-1.5">
                  {pieData.map((entry) => (
                    <div key={entry.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full" style={{ background: ESTIMATE_COLORS[entry.status] ?? "#94a3b8" }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="font-semibold tabular-nums">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BD Spend vs Revenue */}
        <Card className="col-span-2 shadow-sm border-border/40 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-heading">BD vs Revenue</CardTitle>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {statsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-orange-500" />
                      <span className="text-sm text-muted-foreground">BD Spend</span>
                    </div>
                    <span className="font-bold font-heading text-lg" data-testid="text-bd-spend">
                      {formatCurrency(bdSpend)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm text-muted-foreground">Won Revenue</span>
                    </div>
                    <span className="font-bold font-heading text-lg" data-testid="text-monthly-rev">
                      {formatCurrency(revenue)}
                    </span>
                  </div>
                </div>

                {/* Combined bar */}
                {totalBdRev > 0 && (
                  <div className="space-y-1">
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-orange-500 transition-all"
                        style={{ width: `${(bdSpend / totalBdRev) * 100}%` }}
                      />
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(revenue / totalBdRev) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{totalBdRev > 0 ? Math.round((bdSpend / totalBdRev) * 100) : 0}% spend</span>
                      <span>{totalBdRev > 0 ? Math.round((revenue / totalBdRev) * 100) : 0}% revenue</span>
                    </div>
                  </div>
                )}

                {revenue > 0 && bdSpend > 0 && (
                  <div className={cn(
                    "text-xs font-medium px-2 py-1 rounded-md text-center",
                    revenue >= bdSpend * 3
                      ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                  )}>
                    {revenue >= bdSpend * 3 ? "Strong ROI this month" : "Building pipeline"}
                  </div>
                )}

                <Button variant="ghost" size="sm" asChild className="w-full text-xs text-muted-foreground no-default-hover-elevate">
                  <Link href="/email_sync">Manage BD Spend →</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="col-span-3 shadow-sm border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-heading">Top Clients</CardTitle>
              <p className="text-xs text-muted-foreground">By open pipeline value</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="no-default-hover-elevate">
              <Link href="/customers">
                <Users className="h-3.5 w-3.5 mr-1" /> View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (stats?.topClients ?? []).length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground italic">
                No client pipeline data yet
              </div>
            ) : (
              <div className="space-y-3">
                {(stats?.topClients ?? []).map((client, i) => {
                  const val = Number(client.pipelineValue);
                  const pct = topMax > 0 ? (val / topMax) * 100 : 0;
                  return (
                    <div key={client.clientId} className="flex items-center gap-3" data-testid={`row-client-${client.clientId}`}>
                      <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 tabular-nums">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold truncate">{client.name}</p>
                          <p className="text-sm font-bold tabular-nums text-primary shrink-0 ml-2">
                            {formatCurrency(val)}
                          </p>
                        </div>
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/60 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Won Deals by Client */}
      <Card className="shadow-sm border-border/40 bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Won Deals by Client
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Top 8 clients by total closed deal value</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="no-default-hover-elevate">
              <Link href="/leads?stage=won">
                <ArrowRight className="h-3.5 w-3.5 mr-1" /> View All
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : wonDealsChartData.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground italic">No won deals yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, wonDealsChartData.length * 36)}>
              <BarChart
                data={wonDealsChartData}
                layout="vertical"
                margin={{ top: 4, right: 60, left: 8, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  tickFormatter={formatShortCurrency}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  tick={{ fontSize: 12, fill: "var(--foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number, _name: string, entry: { payload?: { dealCount?: number } }) => {
                    const count = entry?.payload?.dealCount ?? 0;
                    return [`${formatCurrency(v)} · ${count} deal${count !== 1 ? "s" : ""}`, "Won Value"];
                  }}
                  contentStyle={{
                    fontSize: 12,
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--background)",
                    color: "var(--foreground)",
                  }}
                />
                <Bar dataKey="value" fill="#BE1916" radius={[0, 4, 4, 0]} maxBarSize={28} label={{ position: "right", formatter: (v: number) => formatShortCurrency(v), fontSize: 11, fill: "var(--muted-foreground)" }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Team Performance Section */}
      {isAdminOrManager && (
        <Card className="shadow-sm border-border/40 bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-heading font-bold">Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {teamLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : teamStats && teamStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left pb-3 font-medium">Team Member</th>
                      <th className="text-right pb-3 font-medium">Pipeline</th>
                      <th className="text-right pb-3 font-medium">Won (Month)</th>
                      <th className="text-right pb-3 font-medium">Leads Assigned</th>
                      <th className="text-right pb-3 font-medium">Tasks Done</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {teamStats.map((stat) => (
                      <tr key={stat.userId} className="group hover:bg-muted/30 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>{(stat.name || stat.email || '??').substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{stat.name || stat.email || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground truncate">{stat.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right font-bold tabular-nums text-primary">
                          {formatCurrency(stat.pipelineValue)}
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          <div className="flex flex-col items-end">
                            <span className="font-medium">{formatCurrency(stat.wonValueMonth)}</span>
                            <span className="text-[10px] text-muted-foreground">{stat.leadsWon} deals won</span>
                          </div>
                        </td>
                        <td className="py-3 text-right tabular-nums text-muted-foreground">
                          {stat.leadsAssigned}
                        </td>
                        <td className="py-3 text-right tabular-nums text-muted-foreground">
                          {stat.tasksCompletedMonth}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground italic border-2 border-dashed rounded-lg">
                No team activity recorded
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity — collapsible, at bottom */}
      <Card className="shadow-sm border-border/40 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-heading font-bold">Recent Activity</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => setActivityExpanded(!activityExpanded)}
            data-testid="button-toggle-activity"
          >
            {activityExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : recentActivities?.length ? (
            <>
              <div className="space-y-5 relative before:absolute before:inset-0 before:ml-4 before:h-full before:w-0.5 before:bg-border/50">
                {(activityExpanded ? recentActivities : recentActivities.slice(0, 5)).map((log) => (
                  <div key={log.id} className="relative flex items-start gap-4 pl-10">
                    <div className="absolute left-2.5 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background flex items-center justify-center z-10" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-semibold text-foreground">
                          {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                        </span>{" "}
                        {log.entityType}{" "}
                        <span className="text-muted-foreground">#{log.entityId}</span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {getRelativeTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {recentActivities.length > 5 && (
                <button
                  onClick={() => setActivityExpanded(!activityExpanded)}
                  className="mt-4 text-xs text-primary hover:underline w-full text-center"
                  data-testid="button-activity-expand"
                >
                  {activityExpanded ? "Show less" : `Show all ${recentActivities.length} activities`}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground italic border-2 border-dashed rounded-lg">
              No recent activity recorded
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  loading,
  dataTestId,
  accentColor,
  iconColor,
  className,
  large,
  subtitle,
}: {
  title: string;
  value?: string | number;
  icon: LucideIcon;
  loading: boolean;
  dataTestId: string;
  accentColor?: string;
  iconColor?: string;
  className?: string;
  large?: boolean;
  subtitle?: string;
}) {
  return (
    <Card className={cn("shadow-sm border-border/40 bg-card", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4 shrink-0", iconColor ?? "text-primary")} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className={cn("h-7 w-20", large && "h-8 w-28")} />
        ) : (
          <>
            <div
              className={cn(
                "font-heading font-bold leading-tight break-words min-w-0",
                large ? "text-2xl" : "text-xl",
                accentColor
              )}
              data-testid={dataTestId}
            >
              {value ?? 0}
            </div>
            {subtitle && <div className="text-[11px] text-muted-foreground mt-1">{subtitle}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
