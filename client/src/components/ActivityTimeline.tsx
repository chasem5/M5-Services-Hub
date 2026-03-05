import { useQuery } from "@tanstack/react-query";
import { ActivityLog, User } from "@shared/schema";
import { 
  CheckCircle2, 
  Circle, 
  FileEdit, 
  PlusCircle, 
  Trash2, 
  AlertCircle,
  FileText,
  User as UserIcon,
  Target,
  ClipboardList,
  Calculator
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ActivityTimelineProps {
  entityType?: "lead" | "client" | "task" | "estimate" | "proposal";
  entityId?: number;
  limit?: number;
}

const getActionIcon = (action: string, entityType: string) => {
  switch (action.toLowerCase()) {
    case "created":
      return <PlusCircle className="h-4 w-4 text-green-500" />;
    case "updated":
    case "stage_updated":
      return <FileEdit className="h-4 w-4 text-blue-500" />;
    case "deleted":
      return <Trash2 className="h-4 w-4 text-destructive" />;
    case "completed":
    case "signed":
    case "accepted":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "rejected":
    case "lost":
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getEntityIcon = (entityType: string) => {
  switch (entityType) {
    case "lead":
      return <Target className="h-3 w-3" />;
    case "client":
      return <UserIcon className="h-3 w-3" />;
    case "task":
      return <ClipboardList className="h-3 w-3" />;
    case "estimate":
      return <Calculator className="h-3 w-3" />;
    case "proposal":
      return <FileText className="h-3 w-3" />;
    default:
      return null;
  }
};

export function ActivityTimeline({ entityType, entityId, limit }: ActivityTimelineProps) {
  const queryParams = new URLSearchParams();
  if (entityType) queryParams.append("entityType", entityType);
  if (entityId) queryParams.append("entityId", entityId.toString());

  const { data: logs, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(`/api/activity-logs?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      return res.json();
    }
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const displayLogs = limit ? logs?.slice(0, limit) : logs;

  if (!displayLogs || displayLogs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No recent activity found.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-[15px] before:w-[2px] before:bg-border">
        {displayLogs.map((log) => {
          const user = users?.find(u => u.id === log.userId);
          return (
            <div key={log.id} className="relative flex gap-4 items-start pl-8 group">
              <div className="absolute left-0 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-background shadow-sm group-hover:border-primary/50 transition-colors">
                {getActionIcon(log.action, log.entityType)}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5 border">
                      <AvatarImage src={user?.profileImageUrl || undefined} />
                      <AvatarFallback className="text-[10px]">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {user ? `${user.firstName} ${user.lastName}` : "System"}
                    </span>
                  </div>
                  <time className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                  </time>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <span className="capitalize font-medium text-foreground">{log.action.replace("_", " ")}</span>
                  {" "}{log.entityType}{" "}
                  {Boolean(log.metadata) && typeof log.metadata === 'object' && 'title' in (log.metadata as Record<string, unknown>) && (
                    <span className="font-medium text-foreground italic">"{(log.metadata as Record<string, unknown>).title as string}"</span>
                  )}
                </div>

                {!entityType && (
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    {getEntityIcon(log.entityType)}
                    {log.entityType}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
