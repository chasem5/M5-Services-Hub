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
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityLog, Task, Lead } from "@shared/schema";

interface DashboardStats {
  activeLeads: number;
  pipelineValue: string;
  openTasks: number;
  tasksDueToday: number;
  monthlyRevenue: string;
  leadStageCounts: { stage: string; count: number }[];
}

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

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(value));
  };

  const getRelativeTime = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const upcomingTasks = tasks
    ?.filter(task => task.status !== 'done' && task.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const recentActivities = activities?.slice(0, 10);

  const stageLabels: Record<string, string> = {
    new_lead: "New Lead",
    contacted: "Contacted",
    qualified: "Qualified",
    proposal_sent: "Proposal Sent",
    won: "Won",
    lost: "Lost",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
          title="Tasks Due Today"
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
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Lead Stages */}
        <Card className="col-span-4 shadow-sm border-border/40 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg font-heading">Lead Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {stats?.leadStageCounts.map((item) => (
                  <div key={item.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stageLabels[item.stage] || item.stage}</span>
                      <span className="text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all" 
                        style={{ 
                          width: `${Math.max((item.count / (stats.activeLeads || 1)) * 100, 2)}%` 
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card className="col-span-3 shadow-sm border-border/40 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-heading">Upcoming Tasks</CardTitle>
            <Button variant="ghost" size="sm" asChild className="no-default-hover-elevate">
              <Link href="/tasks">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : upcomingTasks?.length ? (
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group">
                    <div className={cn(
                      "mt-1 h-2 w-2 rounded-full",
                      task.priority === 'high' ? "bg-destructive" : 
                      task.priority === 'medium' ? "bg-orange-500" : "bg-blue-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-8 w-8">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground italic">
                No upcoming tasks
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card className="shadow-sm border-border/40 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-lg font-heading font-bold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
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
                      </span>
                      {" "}{log.entityType}{" "}
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
  dataTestId 
}: { 
  title: string; 
  value?: string | number; 
  icon: any; 
  loading: boolean;
  dataTestId: string;
}) {
  return (
    <Card className="shadow-sm border-border/40 bg-card/50 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="text-2xl font-heading font-bold" data-testid={dataTestId}>
            {value ?? 0}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
