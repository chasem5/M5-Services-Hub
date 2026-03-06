import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityLog, Task } from "@shared/schema";
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

interface DashboardStats {
  activeLeads: number;
  pipelineValue: string;
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
  new_lead: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs"],
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Metric Cards — 7 cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <MetricCard
          title="Active Leads"
          value={stats?.activeLeads}
          icon={Target}
          loading={statsLoading}
          dataTestId="text-active-leads"
        />
        <MetricCard
          title="Pipeline Value"
          value={stats ? formatCurrency(stats.pipelineValue) : undefined}
          icon={DollarSign}
          loading={statsLoading}
          dataTestId="text-pipeline-value"
        />
        <MetricCard
          title="Open Tasks"
          value={stats?.openTasks}
          icon={Briefcase}
          loading={statsLoading}
          dataTestId="text-open-tasks"
        />
        <MetricCard
          title="Due Today"
          value={stats?.tasksDueToday}
          icon={Calendar}
          loading={statsLoading}
          dataTestId="text-tasks-due-today"
        />
        <MetricCard
          title="Monthly Revenue"
          value={stats ? formatCurrency(stats.monthlyRevenue) : undefined}
          icon={TrendingUp}
          loading={statsLoading}
          dataTestId="text-monthly-revenue"
        />
        <MetricCard
          title="Win Rate"
          value={stats ? (stats.winRate !== null ? `${stats.winRate}%` : "—") : undefined}
          icon={Trophy}
          loading={statsLoading}
          dataTestId="text-win-rate"
          accentColor={stats?.winRate !== null && stats?.winRate !== undefined ? (stats.winRate >= 50 ? "text-green-600" : "text-orange-500") : undefined}
        />
        <MetricCard
          title="Overdue Tasks"
          value={stats?.overdueTasks}
          icon={AlertTriangle}
          loading={statsLoading}
          dataTestId="text-overdue-tasks"
          accentColor={stats?.overdueTasks ? "text-destructive" : undefined}
          iconColor={stats?.overdueTasks ? "text-destructive" : undefined}
        />
      </div>

      {/* Row 2: Revenue Trend + Upcoming Tasks */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue Trend (bar chart) + Lead Pipeline stacked */}
        <Card className="col-span-4 shadow-sm border-border/40 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-heading">Revenue Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Won deals — last 6 months</p>
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

      {/* Activity Feed */}
      <Card className="shadow-sm border-border/40 bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-heading font-bold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : recentActivities?.length ? (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:h-full before:w-0.5 before:bg-border/50">
              {recentActivities.map((log) => (
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
}: {
  title: string;
  value?: string | number;
  icon: any;
  loading: boolean;
  dataTestId: string;
  accentColor?: string;
  iconColor?: string;
}) {
  return (
    <Card className="shadow-sm border-border/40 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4 shrink-0", iconColor ?? "text-primary")} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div
            className={cn("text-xl font-heading font-bold leading-tight break-words min-w-0", accentColor)}
            data-testid={dataTestId}
          >
            {value ?? 0}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
