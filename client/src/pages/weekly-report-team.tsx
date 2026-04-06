import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, addWeeks, subWeeks } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Users,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  User,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() + diff);
  return monday;
}

type TeamReport = {
  id: number;
  userId: string;
  weekStart: string;
  status: string;
  markedReadyAt?: string | null;
  bdText?: string;
  quotesText?: string;
  jobsText?: string;
  saText?: string;
  user: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string;
  } | null;
};

type Message = {
  id: number;
  reportId: number;
  userId: string;
  role: string;
  text: string;
  spotlightRef?: string | null;
  createdAt: string;
};

function ReportCard({ report, weekKey }: { report: TeamReport; weekKey: string }) {
  const [expanded, setExpanded] = useState(report.status === "ready");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const userName = report.user
    ? `${report.user.firstName ?? ""} ${report.user.lastName ?? ""}`.trim() || report.user.email || "Unknown"
    : "Unknown";

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/weekly-report", report.id, "messages"],
    queryFn: () => fetch(`/api/weekly-report/${report.id}/messages`).then((r) => r.json()),
    enabled: chatOpen,
    refetchInterval: chatOpen ? 20000 : false,
  });

  const sendMsg = useMutation({
    mutationFn: (text: string) =>
      apiRequest("POST", `/api/weekly-report/${report.id}/messages`, { text }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/weekly-report", report.id, "messages"] });
      setChatMsg("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isReady = report.status === "ready";

  const sections = [
    { key: "bdText", label: "Business Development" },
    { key: "quotesText", label: "Quotes & Proposals" },
    { key: "jobsText", label: "Jobs & Operations" },
    { key: "saText", label: "Service Agreements" },
  ] as const;

  const hasNarrative = sections.some((s) => (report[s.key] ?? "").trim().length > 0);

  return (
    <div
      data-testid={`card-team-report-${report.id}`}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Header row */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground" data-testid={`text-am-name-${report.id}`}>
              {userName}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{report.user?.role ?? "member"}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isReady && report.markedReadyAt && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Submitted {format(new Date(report.markedReadyAt), "MMM d, h:mm a")}
            </span>
          )}
          <Badge
            data-testid={`badge-report-status-${report.id}`}
            className={isReady
              ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200"
              : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-200"}
          >
            {isReady ? (
              <><CheckCircle className="h-3 w-3 mr-1" />Ready</>
            ) : (
              <><Clock className="h-3 w-3 mr-1" />Draft</>
            )}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
            data-testid={`btn-view-full-report-${report.id}`}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/weekly-report?userId=${report.userId}&weekStart=${weekKey}`);
            }}
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">Full Report</span>
          </Button>
          <button
            className="text-muted-foreground hover:text-primary transition-colors"
            data-testid={`btn-chat-${report.id}`}
            onClick={(e) => { e.stopPropagation(); setChatOpen(!chatOpen); }}
          >
            <div className="relative">
              <MessageCircle className="h-4 w-4" />
              {messages.length > 0 && !chatOpen && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-3.5 w-3.5 flex items-center justify-center text-[10px]">
                  {messages.length}
                </span>
              )}
            </div>
          </button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded: narrative sections */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {!hasNarrative ? (
            <p className="text-sm text-muted-foreground italic">No narrative added yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sections.map(({ key, label }) => {
                const text = report[key] ?? "";
                if (!text.trim()) return null;
                return (
                  <div key={key}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      {label}
                    </p>
                    <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Chat panel */}
      {chatOpen && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Chat
          </p>
          <ScrollArea className="h-48 rounded-lg border border-border bg-muted/20 p-3">
            {messages.length === 0 && (
              <p className="text-xs text-center text-muted-foreground">No messages yet.</p>
            )}
            <div className="space-y-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  data-testid={`chat-msg-${m.id}`}
                  className={`rounded-lg p-2.5 text-sm ${m.role === "manager"
                    ? "bg-primary/10 border border-primary/20 ml-4"
                    : "bg-background border border-border mr-4"}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium text-muted-foreground capitalize">{m.role}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(m.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className="text-foreground">{m.text}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <Textarea
              data-testid={`input-manager-chat-${report.id}`}
              placeholder="Leave feedback or a note..."
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              className="h-16 text-sm resize-none flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (chatMsg.trim() && !sendMsg.isPending) sendMsg.mutate(chatMsg.trim());
                }
              }}
            />
            <Button
              size="sm"
              className="self-end"
              data-testid={`btn-send-manager-chat-${report.id}`}
              disabled={!chatMsg.trim() || sendMsg.isPending}
              onClick={() => { if (chatMsg.trim()) sendMsg.mutate(chatMsg.trim()); }}
            >
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeeklyReportTeamPage() {
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [filterStatus, setFilterStatus] = useState<"all" | "ready" | "draft">("all");
  const weekKey = format(weekStart, "yyyy-MM-dd");

  const { data: reports = [], isLoading } = useQuery<TeamReport[]>({
    queryKey: ["/api/weekly-report/team", weekKey],
    queryFn: () => fetch(`/api/weekly-report/team?weekStart=${weekKey}`).then((r) => r.json()),
  });

  const filtered = reports.filter((r) => {
    if (filterStatus === "ready") return r.status === "ready";
    if (filterStatus === "draft") return r.status === "draft";
    return true;
  });

  const readyCount = reports.filter((r) => r.status === "ready").length;
  const draftCount = reports.filter((r) => r.status === "draft").length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Weekly Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(weekStart, "MMM d")} – {format(addWeeks(weekStart, 1), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Week navigation */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              data-testid="btn-prev-week-team"
              onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium px-2 text-foreground">
              {format(weekStart, "MMM d")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              data-testid="btn-next-week-team"
              onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div
          data-testid="stat-total-reports"
          className="bg-card border border-border rounded-lg p-4 text-center"
        >
          <p className="text-2xl font-bold text-foreground">{reports.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Reports</p>
        </div>
        <div
          data-testid="stat-ready-reports"
          className="bg-card border border-border rounded-lg p-4 text-center"
        >
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{readyCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Ready for Review</p>
        </div>
        <div
          data-testid="stat-draft-reports"
          className="bg-card border border-border rounded-lg p-4 text-center"
        >
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{draftCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Still in Draft</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "ready", "draft"] as const).map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            size="sm"
            data-testid={`btn-filter-${status}`}
            onClick={() => setFilterStatus(status)}
            className="capitalize"
          >
            {status === "all" ? `All (${reports.length})` : status === "ready" ? `Ready (${readyCount})` : `Draft (${draftCount})`}
          </Button>
        ))}
      </div>

      {/* Report list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {reports.length === 0
              ? "No reports submitted for this week yet."
              : `No ${filterStatus} reports for this week.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} weekKey={weekKey} />
          ))}
        </div>
      )}
    </div>
  );
}
