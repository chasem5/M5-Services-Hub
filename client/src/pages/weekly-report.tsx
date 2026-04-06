import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, addWeeks, subWeeks } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Star,
  AlertTriangle,
  Lightbulb,
  MessageCircle,
  X,
  Send,
  Pin,
  Trash2,
  BarChart3,
  Users,
  FileText,
  Mail,
  Phone,
  CalendarCheck,
  Target,
  Activity,
  DollarSign,
  Briefcase,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Plus,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() + diff);
  return monday;
}

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`;
}

function pct(val: number, goal: number) {
  if (!goal) return 0;
  return Math.min(100, Math.round((val / goal) * 100));
}

type ActivityData = {
  emailCount: number;
  callCount: number;
  otherCount: number;
  quotesCreated: number;
  quotesSent: number;
  tasksDone: number;
  dealsWon: number;
  dealsLost: number;
  revenueClosedWeek: number;
  activeProposals: number;
  activeProposalsValue: number;
  accountsTouched: number;
  mtdRevenue: number;
  qtdRevenue: number;
  monthlyGoal: number;
  quarterlyGoal: number;
  mrr: number;
  proposalAging: { id: number; title: string; value: number; ageDays: number; bucket: string }[];
};

type CustomerHealth = {
  id: number;
  name: string;
  tier: string | null;
  healthStatus: string;
  lastContact: string | null;
  openQuotes: number;
  mrr: number;
};

type CoachingItem = {
  title: string;
  message: string;
  type: "win" | "focus" | "risk" | "tip";
};

type Spotlight = {
  id: number;
  reportId: number;
  estimateId?: number | null;
  leadId?: number | null;
  title: string;
  value?: string | null;
  tag: string;
  note?: string | null;
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

type WeeklyReport = {
  id: number;
  userId: string;
  weekStart: string;
  status: string;
  markedReadyAt?: string | null;
  bdText?: string;
  quotesText?: string;
  jobsText?: string;
  saText?: string;
};

type ActionItem = {
  id: number;
  reportId: number;
  text: string;
  isDone: boolean;
  aiGenerated: boolean;
  sortOrder: number;
  createdAt: string;
};

async function fetchJson(url: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
  return r.json();
}

const BUCKET_COLORS: Record<string, string> = {
  "0-14d": "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  "15-30d": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  "31-60d": "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  "60d+": "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
};

const COACHING_ICON: Record<string, any> = {
  win: Star,
  focus: Target,
  risk: AlertTriangle,
  tip: Lightbulb,
};

const COACHING_COLOR: Record<string, string> = {
  win: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30",
  focus: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30",
  risk: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30",
  tip: "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30",
};

const HEALTH_COLOR: Record<string, string> = {
  healthy: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
  "at-risk": "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300",
  churning: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
  unknown: "bg-gray-100 dark:bg-gray-800 text-gray-500",
  dormant: "bg-gray-100 dark:bg-gray-800 text-gray-500",
};

export default function WeeklyReportPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { user: authUser } = useAuth();

  // Parse manager-view params from URL
  const searchParams = new URLSearchParams(search);
  const viewUserId = searchParams.get("userId") || null;
  const viewWeekStartParam = searchParams.get("weekStart") || null;
  // Manager view: only when viewing someone else's report via URL params
  const isManagerView = !!viewUserId && viewUserId !== (authUser?.id ?? null);

  // Week state: lock to URL param when in manager view, otherwise local
  const [weekStart, setWeekStart] = useState<Date>(() => {
    if (viewWeekStartParam) {
      const d = new Date(viewWeekStartParam);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return getMonday(new Date());
  });
  const weekKey = format(weekStart, "yyyy-MM-dd");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [showSpotlightModal, setShowSpotlightModal] = useState(false);
  const [spotlightForm, setSpotlightForm] = useState({ title: "", value: "", tag: "win", note: "" });
  const [coachingLoaded, setCoachingLoaded] = useState(false);
  const [coaching, setCoaching] = useState<CoachingItem[]>([]);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [newActionText, setNewActionText] = useState("");
  const [aiActionsLoading, setAiActionsLoading] = useState(false);

  const narrativeRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [narrative, setNarrative] = useState({ bdText: "", quotesText: "", jobsText: "", saText: "" });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Build URL-suffix with optional userId for manager-view API calls
  const userSuffix = viewUserId ? `&userId=${viewUserId}` : "";

  // Fetch AM user info when in manager view (to show name in header)
  type DirUser = { id: string; firstName: string | null; lastName: string | null; email: string; role: string };
  const { data: dirUsers = [] } = useQuery<DirUser[]>({
    queryKey: ["/api/users/directory"],
    queryFn: () => fetchJson("/api/users/directory"),
    enabled: isManagerView,
  });
  const amUser = isManagerView && viewUserId ? dirUsers.find((u) => u.id === viewUserId) : null;
  const amFirstName = amUser?.firstName ?? null;

  // Fetch report
  const { data: report } = useQuery<WeeklyReport>({
    queryKey: ["/api/weekly-report", weekKey, viewUserId],
    queryFn: () => fetchJson(`/api/weekly-report?weekStart=${weekKey}${userSuffix}`),
  });

  // Sync narrative state when report loads
  useEffect(() => {
    if (report) {
      setNarrative({
        bdText: report.bdText ?? "",
        quotesText: report.quotesText ?? "",
        jobsText: report.jobsText ?? "",
        saText: report.saText ?? "",
      });
    }
  }, [report?.id]);

  // Fetch activity data
  const { data: activity, isLoading: activityLoading } = useQuery<ActivityData>({
    queryKey: ["/api/weekly-report/activity", weekKey, viewUserId],
    queryFn: () => fetchJson(`/api/weekly-report/activity?weekStart=${weekKey}${userSuffix}`),
  });

  // Fetch customer health
  const { data: customerHealth = [] } = useQuery<CustomerHealth[]>({
    queryKey: ["/api/weekly-report/customer-health", viewUserId],
    queryFn: () => fetchJson(`/api/weekly-report/customer-health${viewUserId ? `?userId=${viewUserId}` : ""}`),
  });

  // Fetch spotlights
  const { data: spotlights = [] } = useQuery<Spotlight[]>({
    queryKey: ["/api/weekly-report", report?.id, "spotlights"],
    queryFn: () => fetchJson(`/api/weekly-report/${report!.id}/spotlights`),
    enabled: !!report?.id,
  });

  // Fetch action items
  const { data: actions = [] } = useQuery<ActionItem[]>({
    queryKey: ["/api/weekly-report", report?.id, "actions"],
    queryFn: () => fetchJson(`/api/weekly-report/${report!.id}/actions`),
    enabled: !!report?.id,
  });

  // Fetch messages
  const { data: messages = [], refetch: refetchMessages } = useQuery<Message[]>({
    queryKey: ["/api/weekly-report", report?.id, "messages"],
    queryFn: () => fetchJson(`/api/weekly-report/${report!.id}/messages`),
    enabled: !!report?.id && chatOpen,
    refetchInterval: chatOpen ? 20000 : false,
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load AI coaching when activity is available (not in manager view — too costly for both views)
  useEffect(() => {
    if (!isManagerView && activity && customerHealth && !coachingLoaded && !coachingLoading) {
      setCoachingLoading(true);
      fetch("/api/weekly-report/coaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity, customerHealth }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.coaching)) setCoaching(d.coaching);
          setCoachingLoaded(true);
        })
        .catch(() => setCoachingLoaded(true))
        .finally(() => setCoachingLoading(false));
    }
  }, [activity, customerHealth, isManagerView]);

  // Reset coaching when week changes
  useEffect(() => {
    setCoachingLoaded(false);
    setCoaching([]);
  }, [weekKey]);

  // Auto-save narrative with debounce (only for AM's own report)
  const saveNarrative = useCallback(
    (field: string, value: string) => {
      if (!report?.id || isManagerView) return;
      clearTimeout(narrativeRefs.current[field]);
      narrativeRefs.current[field] = setTimeout(() => {
        apiRequest("PATCH", `/api/weekly-report/${report.id}`, { [field]: value }).catch(() => {});
      }, 1200);
    },
    [report?.id, isManagerView]
  );

  // Mark ready mutation
  const markReadyMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/weekly-report/${report!.id}/mark-ready`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/weekly-report", weekKey, viewUserId] });
      toast({ title: "Report marked ready", description: "Your manager has been notified." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Add spotlight
  const addSpotlightMut = useMutation({
    mutationFn: (data: typeof spotlightForm) =>
      apiRequest("POST", `/api/weekly-report/${report!.id}/spotlights`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/weekly-report", report?.id, "spotlights"] });
      setShowSpotlightModal(false);
      setSpotlightForm({ title: "", value: "", tag: "win", note: "" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Remove spotlight
  const removeSpotlightMut = useMutation({
    mutationFn: (spotlightId: number) =>
      apiRequest("DELETE", `/api/weekly-report/${report!.id}/spotlights/${spotlightId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/weekly-report", report?.id, "spotlights"] }),
  });

  // Send message
  const sendMessageMut = useMutation({
    mutationFn: (text: string) =>
      apiRequest("POST", `/api/weekly-report/${report!.id}/messages`, { text }),
    onSuccess: () => {
      refetchMessages();
      setChatMessage("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Add action item
  const addActionMut = useMutation({
    mutationFn: (text: string) =>
      apiRequest("POST", `/api/weekly-report/${report!.id}/actions`, { text, isDone: false, aiGenerated: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/weekly-report", report?.id, "actions"] });
      setNewActionText("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Toggle action item done
  const toggleActionMut = useMutation({
    mutationFn: ({ id, isDone }: { id: number; isDone: boolean }) =>
      apiRequest("PATCH", `/api/weekly-report/${report!.id}/actions/${id}`, { isDone }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/weekly-report", report?.id, "actions"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Delete action item
  const deleteActionMut = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/weekly-report/${report!.id}/actions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/weekly-report", report?.id, "actions"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // AI-generate action items (manager only)
  const generateAiActions = async () => {
    if (!report?.id) return;
    setAiActionsLoading(true);
    try {
      const res = await fetch(`/api/weekly-report/${report.id}/ai-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity, customerHealth, spotlights, coaching }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      const items: { text: string }[] = Array.isArray(data.items) ? data.items : [];
      for (const item of items) {
        await apiRequest("POST", `/api/weekly-report/${report.id}/actions`, {
          text: item.text,
          isDone: false,
          aiGenerated: true,
        });
      }
      qc.invalidateQueries({ queryKey: ["/api/weekly-report", report?.id, "actions"] });
      toast({ title: "Action items generated", description: `${items.length} items added.` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setAiActionsLoading(false);
    }
  };

  const isReady = report?.status === "ready";
  const canEdit = !isManagerView && !isReady;

  const actCards = [
    { label: "Emails", value: activity?.emailCount ?? 0, icon: Mail, color: "text-blue-500" },
    { label: "Calls", value: activity?.callCount ?? 0, icon: Phone, color: "text-green-500" },
    { label: "Other Activities", value: activity?.otherCount ?? 0, icon: Activity, color: "text-purple-500" },
    { label: "Quotes Created", value: activity?.quotesCreated ?? 0, icon: FileText, color: "text-indigo-500" },
    { label: "Quotes Sent", value: activity?.quotesSent ?? 0, icon: Briefcase, color: "text-cyan-500" },
    { label: "Tasks Done", value: activity?.tasksDone ?? 0, icon: CalendarCheck, color: "text-teal-500" },
    { label: "Deals Won", value: activity?.dealsWon ?? 0, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Revenue Closed", value: activity ? fmt(activity.revenueClosedWeek) : "—", icon: DollarSign, color: "text-yellow-500", isText: true },
    { label: "Accounts Touched", value: activity?.accountsTouched ?? 0, icon: Users, color: "text-orange-500" },
  ];

  return (
    <div className="flex h-full min-h-screen bg-background">
      {/* Main content */}
      <div className={`flex-1 overflow-y-auto transition-all ${chatOpen ? "mr-80" : ""}`}>
        <div className="max-w-5xl mx-auto p-6 pb-24 space-y-8">

          {/* ── Manager View Banner ──────────────────────────────────── */}
          {isManagerView && (
            <div className="flex items-center gap-3 bg-primary/8 border border-primary/20 rounded-xl px-4 py-3">
              <Eye className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary">Manager View — Read Only</p>
                <p className="text-xs text-muted-foreground">
                  Week of {format(weekStart, "MMM d, yyyy")}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                data-testid="btn-back-to-team"
                onClick={() => navigate("/weekly-report/team")}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back to Team View
              </Button>
            </div>
          )}

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isManagerView && amFirstName ? `${amFirstName}'s Weekly Report` : "Weekly Report"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {format(weekStart, "MMM d")} – {format(addWeeks(weekStart, 1), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Week navigation — hidden in manager view (week is fixed from URL) */}
              {!isManagerView && (
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    data-testid="btn-prev-week"
                    onClick={() => { setWeekStart(subWeeks(weekStart, 1)); setCoachingLoaded(false); }}
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
                    data-testid="btn-next-week"
                    onClick={() => { setWeekStart(addWeeks(weekStart, 1)); setCoachingLoaded(false); }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {/* Status badge */}
              <Badge
                data-testid="badge-report-status"
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
              {/* Chat toggle — hidden in manager view */}
              {!isManagerView && (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="btn-toggle-chat"
                  onClick={() => setChatOpen(!chatOpen)}
                  className="relative"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Chat
                  {messages.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                      {messages.length > 9 ? "9+" : messages.length}
                    </span>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* ── Activity Snapshot ────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Activity Snapshot
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {actCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    data-testid={`card-activity-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
                    className="bg-card border border-border rounded-lg p-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${card.color}`} />
                      <span className="text-xs text-muted-foreground">{card.label}</span>
                    </div>
                    {activityLoading ? (
                      <Skeleton className="h-6 w-12" />
                    ) : (
                      <span className="text-xl font-bold text-foreground leading-none">
                        {card.isText ? card.value : String(card.value)}
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Active proposals card */}
              <div
                data-testid="card-activity-active-proposals"
                className="bg-card border border-border rounded-lg p-3 flex flex-col gap-1.5 col-span-2 sm:col-span-1"
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
                  <span className="text-xs text-muted-foreground">Active Proposals</span>
                </div>
                {activityLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <div>
                    <span className="text-xl font-bold text-foreground leading-none">
                      {activity?.activeProposals ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5">
                      {activity ? fmt(activity.activeProposalsValue) : ""}
                    </span>
                  </div>
                )}
              </div>
              {/* Deals lost */}
              <div
                data-testid="card-activity-deals-lost"
                className="bg-card border border-border rounded-lg p-3 flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs text-muted-foreground">Deals Lost</span>
                </div>
                {activityLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <span className="text-xl font-bold text-foreground leading-none">
                    {activity?.dealsLost ?? 0}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ── Revenue Snapshot ─────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Revenue Snapshot
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* MTD */}
              <div data-testid="card-revenue-mtd" className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground font-medium">MTD Revenue</span>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                {activityLoading ? <Skeleton className="h-7 w-24 mb-2" /> : (
                  <p className="text-2xl font-bold text-foreground mb-2">
                    {activity ? fmt(activity.mtdRevenue) : "—"}
                  </p>
                )}
                <Progress
                  value={activity ? pct(activity.mtdRevenue, activity.monthlyGoal) : 0}
                  className="h-1.5 mb-1"
                />
                <p className="text-xs text-muted-foreground">
                  Goal: {activity ? fmt(activity.monthlyGoal) : "—"} ({activity ? pct(activity.mtdRevenue, activity.monthlyGoal) : 0}%)
                </p>
              </div>
              {/* QTD */}
              <div data-testid="card-revenue-qtd" className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground font-medium">QTD Revenue</span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                {activityLoading ? <Skeleton className="h-7 w-24 mb-2" /> : (
                  <p className="text-2xl font-bold text-foreground mb-2">
                    {activity ? fmt(activity.qtdRevenue) : "—"}
                  </p>
                )}
                <Progress
                  value={activity ? pct(activity.qtdRevenue, activity.quarterlyGoal) : 0}
                  className="h-1.5 mb-1"
                />
                <p className="text-xs text-muted-foreground">
                  Goal: {activity ? fmt(activity.quarterlyGoal) : "—"} ({activity ? pct(activity.qtdRevenue, activity.quarterlyGoal) : 0}%)
                </p>
              </div>
              {/* MRR */}
              <div data-testid="card-revenue-mrr" className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground font-medium">MRR (Contracts)</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                {activityLoading ? <Skeleton className="h-7 w-24 mb-2" /> : (
                  <p className="text-2xl font-bold text-foreground mb-2">
                    {activity ? fmt(activity.mrr) : "—"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">From active service agreements</p>
              </div>
            </div>
          </section>

          {/* ── AI Coaching — only shown in AM's own view ─────────────── */}
          {!isManagerView && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                AI Coaching
              </h2>
              {coachingLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  ))}
                </div>
              ) : coaching.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {coaching.map((item, i) => {
                    const Icon = COACHING_ICON[item.type] ?? Lightbulb;
                    return (
                      <div
                        key={i}
                        data-testid={`card-coaching-${i}`}
                        className={`border rounded-lg p-4 ${COACHING_COLOR[item.type] ?? ""}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-semibold text-sm">{item.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.message}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground text-sm">
                  {activityLoading ? "Loading activity data…" : "No coaching tips available. Add activity data to generate insights."}
                </div>
              )}
            </section>
          )}

          {/* ── Action Items ─────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Action Items
                </h2>
                {actions.length > 0 && (
                  <Badge variant="outline" className="text-xs h-5">
                    {actions.filter((a) => a.isDone).length}/{actions.length}
                  </Badge>
                )}
              </div>
              {/* AI Generate — only available to AM on their own report */}
              {!isManagerView && report?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="btn-ai-generate-actions"
                  onClick={generateAiActions}
                  disabled={aiActionsLoading}
                >
                  {aiActionsLoading ? (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5 animate-spin" />Generating…</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5" />AI Generate</>
                  )}
                </Button>
              )}
            </div>

            {actions.length === 0 && (
              <div className="bg-card border border-dashed border-border rounded-lg p-5 text-center text-sm text-muted-foreground mb-3">
                {isManagerView
                  ? "No action items added by AM yet."
                  : "No action items yet. Add one below or use AI Generate."}
              </div>
            )}

            {actions.length > 0 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden mb-3">
                {actions.map((action, i) => (
                  <div
                    key={action.id}
                    data-testid={`row-action-${action.id}`}
                    className={`flex items-start gap-3 px-4 py-3 ${i < actions.length - 1 ? "border-b border-border" : ""} ${action.isDone ? "bg-muted/20" : ""}`}
                  >
                    {/* Checkbox — interactive for AM, read-only indicator for manager */}
                    {isManagerView ? (
                      <span
                        className={`flex-shrink-0 mt-0.5 h-4 w-4 rounded border flex items-center justify-center ${
                          action.isDone ? "bg-primary border-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {action.isDone && <CheckCircle className="h-3 w-3" />}
                      </span>
                    ) : (
                      <button
                        data-testid={`btn-toggle-action-${action.id}`}
                        onClick={() => toggleActionMut.mutate({ id: action.id, isDone: !action.isDone })}
                        className={`flex-shrink-0 mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                          action.isDone
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {action.isDone && <CheckCircle className="h-3 w-3" />}
                      </button>
                    )}
                    <span className={`flex-1 text-sm leading-relaxed ${action.isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {action.text}
                      {action.aiGenerated && (
                        <span className="ml-2 inline-flex items-center gap-1 text-xs text-purple-500">
                          <Sparkles className="h-3 w-3" />AI
                        </span>
                      )}
                    </span>
                    {/* Delete — only available to AM on their own report */}
                    {!isManagerView && (
                      <button
                        data-testid={`btn-delete-action-${action.id}`}
                        onClick={() => deleteActionMut.mutate(action.id)}
                        className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add action item input — only for AM on their own report, not in manager view */}
            {!isManagerView && report?.id && (
              <div className="flex gap-2">
                <Input
                  data-testid="input-new-action"
                  placeholder="Add an action item…"
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  className="flex-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newActionText.trim() && !addActionMut.isPending) {
                      addActionMut.mutate(newActionText.trim());
                    }
                  }}
                />
                <Button
                  size="sm"
                  data-testid="btn-add-action"
                  disabled={!newActionText.trim() || addActionMut.isPending}
                  onClick={() => { if (newActionText.trim()) addActionMut.mutate(newActionText.trim()); }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </section>

          {/* ── Customer Health ──────────────────────────────────────── */}
          {customerHealth.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Customer Health
              </h2>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Account</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Health</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">MRR</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Open Quotes</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Last Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerHealth.map((c, i) => (
                      <tr
                        key={c.id}
                        data-testid={`row-customer-health-${c.id}`}
                        className={`border-b border-border last:border-0 hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                      >
                        <td className="px-4 py-2.5 font-medium text-foreground">{c.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${HEALTH_COLOR[c.healthStatus] ?? HEALTH_COLOR.unknown}`}>
                            {c.healthStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{c.mrr > 0 ? fmt(c.mrr) : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{c.openQuotes}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {c.lastContact ? format(new Date(c.lastContact), "MMM d") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Proposal Aging ───────────────────────────────────────── */}
          {(activity?.proposalAging?.length ?? 0) > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Proposal Aging
              </h2>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Proposal</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Value</th>
                      <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Age</th>
                      <th className="px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity!.proposalAging.map((p, i) => (
                      <tr
                        key={p.id}
                        data-testid={`row-proposal-aging-${p.id}`}
                        className={`border-b border-border last:border-0 hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                      >
                        <td className="px-4 py-2.5 font-medium text-foreground">{p.title}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(p.value)}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{p.ageDays}d</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BUCKET_COLORS[p.bucket] ?? ""}`}>
                            {p.bucket}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ── Weekly Narrative ─────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Weekly Narrative
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                { key: "bdText", label: "Business Development", placeholder: "Key BD activities, outreach, networking..." },
                { key: "quotesText", label: "Quotes & Proposals", placeholder: "Quotes created, sent, won this week..." },
                { key: "jobsText", label: "Jobs & Operations", placeholder: "Key jobs, escalations, field updates..." },
                { key: "saText", label: "Service Agreements", placeholder: "SA renewals, new SAs, upcoming expirations..." },
              ] as const).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</Label>
                  {isManagerView ? (
                    <div className="bg-muted/40 rounded-lg p-3 min-h-[7rem] text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {narrative[key] || <span className="text-muted-foreground italic">Not filled in.</span>}
                    </div>
                  ) : (
                    <Textarea
                      data-testid={`textarea-narrative-${key}`}
                      placeholder={placeholder}
                      value={narrative[key]}
                      disabled={isReady}
                      onChange={(e) => {
                        setNarrative((prev) => ({ ...prev, [key]: e.target.value }));
                        saveNarrative(key, e.target.value);
                      }}
                      className="h-28 text-sm resize-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ── Spotlights ───────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Spotlights
              </h2>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="btn-add-spotlight"
                  onClick={() => setShowSpotlightModal(true)}
                  disabled={!report?.id}
                >
                  <Pin className="h-3.5 w-3.5 mr-1.5" />
                  Pin Item
                </Button>
              )}
            </div>
            {spotlights.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                {isManagerView ? "No spotlights pinned for this week." : "Pin wins, deals, or items that need attention to spotlight them for your manager."}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {spotlights.map((s) => (
                  <div
                    key={s.id}
                    data-testid={`card-spotlight-${s.id}`}
                    className={`bg-card border rounded-lg p-4 relative ${s.tag === "win" ? "border-green-200 dark:border-green-800" : "border-orange-200 dark:border-orange-800"}`}
                  >
                    {canEdit && (
                      <button
                        className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                        data-testid={`btn-remove-spotlight-${s.id}`}
                        onClick={() => removeSpotlightMut.mutate(s.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={s.tag === "win"
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs"
                          : "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs"}
                      >
                        {s.tag === "win" ? "Win" : "Need Help"}
                      </Badge>
                      {s.value && <span className="text-sm font-semibold text-foreground">{s.value}</span>}
                    </div>
                    <p className="font-medium text-sm text-foreground">{s.title}</p>
                    {s.note && <p className="text-xs text-muted-foreground mt-1">{s.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* ── Sticky Bottom Bar — only in AM's own view ──────────────── */}
        {!isReady && !isManagerView && (
          <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 flex items-center justify-end gap-3 z-20">
            <span className="text-sm text-muted-foreground">
              Ready to submit for review?
            </span>
            <Button
              data-testid="btn-mark-ready"
              onClick={() => markReadyMut.mutate()}
              disabled={markReadyMut.isPending || !report?.id}
              className="bg-primary hover:bg-primary/90"
            >
              {markReadyMut.isPending ? (
                "Submitting…"
              ) : (
                <><CheckCircle className="h-4 w-4 mr-1.5" />Mark Ready for Review</>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ── Chat Panel ───────────────────────────────────────────────── */}
      {chatOpen && (
        <div className="fixed top-0 right-0 h-full w-80 bg-background border-l border-border flex flex-col z-30 shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Report Chat</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setChatOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 && (
                <p className="text-xs text-center text-muted-foreground pt-4">
                  No messages yet. {isManagerView ? "Leave feedback for the AM." : "Chat with your manager here."}
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  data-testid={`chat-message-${m.id}`}
                  className={`rounded-lg p-3 text-sm ${m.role === "manager"
                    ? "bg-primary/10 border border-primary/20 ml-2"
                    : "bg-muted border border-border mr-2"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-medium text-muted-foreground capitalize">{m.role}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(m.createdAt), "h:mm a")}
                    </span>
                  </div>
                  <p className="text-foreground leading-relaxed">{m.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-border">
            <div className="flex gap-2">
              <Textarea
                data-testid="input-chat-message"
                placeholder={isManagerView ? "Leave feedback…" : "Type a message…"}
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="h-16 text-sm resize-none flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (chatMessage.trim() && !sendMessageMut.isPending) {
                      sendMessageMut.mutate(chatMessage.trim());
                    }
                  }
                }}
              />
              <Button
                size="sm"
                className="self-end"
                data-testid="btn-send-chat"
                disabled={!chatMessage.trim() || sendMessageMut.isPending}
                onClick={() => {
                  if (chatMessage.trim()) sendMessageMut.mutate(chatMessage.trim());
                }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Spotlight Modal ──────────────────────────────────────────── */}
      <Dialog open={showSpotlightModal} onOpenChange={setShowSpotlightModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pin a Spotlight</DialogTitle>
            <DialogDescription>
              Highlight a win or an item that needs your manager's attention.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Type</Label>
              <Select
                value={spotlightForm.tag}
                onValueChange={(v) => setSpotlightForm((f) => ({ ...f, tag: v }))}
              >
                <SelectTrigger data-testid="select-spotlight-tag" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="win">Win</SelectItem>
                  <SelectItem value="need-help">Need Help</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Title</Label>
              <Input
                data-testid="input-spotlight-title"
                placeholder="e.g., Closed Acme Corp deal"
                className="mt-1"
                value={spotlightForm.title}
                onChange={(e) => setSpotlightForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm">Value (optional)</Label>
              <Input
                data-testid="input-spotlight-value"
                placeholder="e.g., $12,500"
                className="mt-1"
                value={spotlightForm.value}
                onChange={(e) => setSpotlightForm((f) => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm">Note (optional)</Label>
              <Textarea
                data-testid="textarea-spotlight-note"
                placeholder="Any context..."
                className="mt-1 h-20 text-sm resize-none"
                value={spotlightForm.note}
                onChange={(e) => setSpotlightForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowSpotlightModal(false)}>Cancel</Button>
            <Button
              data-testid="btn-save-spotlight"
              disabled={!spotlightForm.title.trim() || addSpotlightMut.isPending}
              onClick={() => addSpotlightMut.mutate(spotlightForm)}
            >
              {addSpotlightMut.isPending ? "Saving…" : "Pin It"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
