import { useState, useEffect, useMemo, useRef } from "react";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable, useDraggable } from "@dnd-kit/core";

import { 
  Lead, 
  Client, 
  User,
  Task,
  PipelineStage,
  ContactBuilding,
  ClientContact,
  PipelineView,
  insertLeadSchema,
  InsertLead,
  insertTaskSchema,
  InsertTask,
  DealTag,
} from "@shared/schema";
import { useSearch, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  ChevronRight,
  Filter,
  Users as UsersIcon,
  DollarSign,
  X,
  Tag as TagIcon,
  CheckCircle2,
  Clock,
  Circle,
  Target,
  Settings,
  Trash2,
  Pencil,
  ChevronDown,
  GripVertical,
  TrendingUp,
  Check,
  CalendarIcon,
  Building2,
  Sparkles,
  Briefcase,
  User2,
  Eye,
  SlidersHorizontal,
  BookmarkPlus,
  MessageSquare,
  Send,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  ClipboardList,
  Loader2,
  Phone,
  Mail,
  Building,
  CalendarDays,
  CornerDownRight,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { PipelineStagesManager } from "@/components/PipelineStagesManager";
import { BuildOpsIcon } from "@/components/BuildOpsIcon";
import { TierBadge } from "@/components/TierBadge";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const STAGE_COLORS = {
  green: {
    column: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
    header: "bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800 rounded-t-lg",
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-800 border-green-200",
    value: "text-green-700 dark:text-green-400",
  },
  red: {
    column: "bg-red-50/60 dark:bg-red-950/20 border-red-200/70 dark:border-red-800/50",
    header: "bg-red-100/70 dark:bg-red-900/30 border-red-200/70 dark:border-red-800/50 rounded-t-lg",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 border-red-200",
    value: "text-red-700 dark:text-red-400",
  },
  default: {
    column: "bg-muted/70 border-border",
    header: "bg-background border-b border-border rounded-t-lg",
    dot: "bg-muted-foreground/40",
    badge: "",
    value: "text-muted-foreground",
  },
};

const statusIcons: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 border-blue-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

function getConfidenceColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-500";
}

function getConfidenceBarColor(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

const SERVICE_TYPE_OPTIONS = [
  { value: "building_engineering", label: "Building Engineering", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "facility_solutions", label: "Facility Solutions", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "janitorial", label: "Janitorial", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "special_projects", label: "Special Projects", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "property_assessment", label: "Property Assessment", color: "bg-teal-100 text-teal-700 border-teal-200" },
] as const;

function getServiceTypeLabel(value: string | null | undefined) {
  if (!value) return null;
  return SERVICE_TYPE_OPTIONS.find(o => o.value === value)?.label ?? value;
}

function getServiceTypeColor(value: string | null | undefined) {
  if (!value) return "";
  return SERVICE_TYPE_OPTIONS.find(o => o.value === value)?.color ?? "";
}

const TIER_OPTIONS = ["$", "$$", "$$$", "$$$$"] as const;
const DEFAULT_TIER_VALUES: Record<string, number> = { "$": 25000, "$$": 75000, "$$$": 200000, "$$$$": 500000 };

function getLeadNumericValue(
  lead: { value: string | number; valueType?: string | null; valueTier?: string | null },
  tierMap?: Record<string, number>
): number {
  if (lead.valueType === "potential" && lead.valueTier) {
    return (tierMap ?? DEFAULT_TIER_VALUES)[lead.valueTier] ?? 0;
  }
  return Number(lead.value);
}

interface LeadNote {
  id: number;
  leadId: number;
  userId: string;
  content: string;
  createdAt: string;
}

const ACTIVITY_TYPES = [
  { value: "note", label: "Note", icon: MessageSquare, color: "text-slate-500", bg: "bg-slate-100 dark:bg-slate-800" },
  { value: "call", label: "Call", icon: Phone, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/40" },
  { value: "email", label: "Email", icon: Mail, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/40" },
  { value: "meeting", label: "Meeting", icon: UsersIcon, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/40" },
  { value: "site_visit", label: "Site Visit", icon: Building, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/40" },
  { value: "follow_up", label: "Follow-up", icon: CornerDownRight, color: "text-primary", bg: "bg-primary/10" },
] as const;

function LeadActivityTab({ leadId }: { leadId: number }) {
  const [draft, setDraft] = useState("");
  const [activityType, setActivityType] = useState<string>("note");
  const { toast } = useToast();
  const { data: notes = [], isLoading } = useQuery<LeadNote[]>({
    queryKey: ["/api/leads", leadId, "notes"],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/notes`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: users = [] } = useQuery<{ id: string; firstName: string | null; lastName: string | null; email: string | null }[]>({
    queryKey: ["/api/users"],
  });

  function getUserName(userId: string) {
    const u = users.find((m) => m.id === userId);
    if (!u) return "Team Member";
    if (u.firstName || u.lastName) return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return u.email ?? "Team Member";
  }

  const addMutation = useMutation({
    mutationFn: async ({ content, activityType }: { content: string; activityType: string }) => {
      const res = await apiRequest("POST", `/api/leads/${leadId}/notes`, { content, activityType });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/activity-summary"] });
      setDraft("");
    },
    onError: () => toast({ title: "Failed to save activity", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      await apiRequest("DELETE", `/api/leads/${leadId}/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", leadId, "notes"] });
    },
  });

  function handleSubmit() {
    if (draft.trim()) addMutation.mutate({ content: draft.trim(), activityType });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  function getActivityMeta(type: string | null | undefined) {
    return ACTIVITY_TYPES.find(t => t.value === type) ?? ACTIVITY_TYPES[0];
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActivityType(value)}
              data-testid={`button-activity-type-${value}`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                activityType === value
                  ? "bg-primary text-white border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Textarea
            placeholder={`Log a ${getActivityMeta(activityType).label.toLowerCase()}... (Ctrl+Enter to save)`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="pr-12 resize-none"
            data-testid="textarea-lead-activity-draft"
          />
          <Button
            size="icon"
            className="absolute bottom-2 right-2 h-7 w-7"
            onClick={handleSubmit}
            disabled={!draft.trim() || addMutation.isPending}
            data-testid="button-save-lead-activity"
          >
            {addMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Ctrl+Enter to save quickly</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded bg-muted animate-pulse" />)}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No activity logged yet — record your first call, email, or meeting note above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => {
            const meta = getActivityMeta((note as any).activityType);
            const Icon = meta.icon;
            return (
              <div
                key={note.id}
                className="group flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                data-testid={`card-lead-activity-${note.id}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center ${meta.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                    <span>{getUserName(note.userId)}</span>
                    <span>·</span>
                    <span title={new Date(note.createdAt).toLocaleString()}>
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(note.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-activity-${note.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LeadLinkedEmails({ leadId }: { leadId: number }) {
  const { data: emails = [] } = useQuery<any[]>({
    queryKey: ["/api/leads", leadId, "emails"],
    queryFn: () => fetch(`/api/leads/${leadId}/emails`, { credentials: "include" }).then(r => r.json()),
  });

  if (emails.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
        <Mail className="h-3.5 w-3.5" />
        Linked Emails ({emails.length})
      </h4>
      <div className="space-y-1.5">
        {emails.map((e: any) => (
          <Link key={e.id} href="/email" className="block">
            <div className="rounded-md border border-border bg-card p-2.5 space-y-0.5 hover:bg-accent/50 transition-colors cursor-pointer" data-testid={`email-activity-${e.id}`}>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  e.direction === "inbound"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                    : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                }`}>
                  {e.direction === "inbound" ? "IN" : "OUT"}
                </span>
                <span className="text-sm font-medium truncate flex-1">{e.subject ?? "(no subject)"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{e.fromName ?? e.fromEmail}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(e.receivedAt), { addSuffix: true })}</span>
              </div>
              {e.aiSummary && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.aiSummary}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({ 
  stage, 
  sc, 
  weightedVal, 
  rawVal, 
  cardCount, 
  filteredLeads,
  tierMap,
  formatCurrency,
  getBuildingName,
  getClientName,
  getContactName,
  getServiceTypeColor,
  getServiceTypeLabel,
  getUserName,
  openLeadDetail,
  tasks,
  loadingAiSummary,
  aiSummaries,
  fetchAiSummary,
  activitySummary,
}: { 
  stage: PipelineStage;
  sc: any;
  weightedVal: number;
  rawVal: number;
  cardCount: number;
  filteredLeads: Lead[] | undefined;
  tierMap: Record<string, number>;
  formatCurrency: (v: string | number) => string;
  getBuildingName: (id: number | null) => string | null;
  getClientName: (id: number | null) => string;
  getContactName: (id: number | null | undefined) => string | null;
  getServiceTypeColor: (v: string | null | undefined) => string;
  getServiceTypeLabel: (v: string | null | undefined) => string | null;
  getUserName: (id: string | null) => string;
  openLeadDetail: (lead: Lead) => void;
  tasks: Task[];
  loadingAiSummary: Record<number, boolean>;
  aiSummaries: Record<number, { healthLabel: string; headline: string; observation: string; nextStep: string }>;
  fetchAiSummary: (id: number) => void;
  activitySummary: any[] | undefined;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.slug,
  });

  return (
    <div
      ref={setNodeRef}
      id={`column-${stage.slug}`}
      className={`flex flex-col w-full md:w-80 md:min-w-80 min-w-[85vw] rounded-lg border shadow-sm transition-colors scroll-snap-align-start ${sc.column} ${isOver ? "ring-2 ring-primary/50" : ""}`}
    >
      <div className={`p-3 border-b ${sc.header}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${sc.dot}`} />
            <h3 className="font-semibold text-sm">{stage.label}</h3>
            <Badge variant="secondary" className="h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center font-bold text-[10px]">
              {cardCount}
            </Badge>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Value</span>
            <span className="text-sm font-bold text-foreground">{formatCurrency(rawVal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5" />
              Weighted
            </span>
            <span className={`text-xs font-semibold ${sc.value}`}>{formatCurrency(weightedVal)}</span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {filteredLeads
            ?.filter((l) => l.stage === stage.slug)
            .sort((a, b) => getLeadNumericValue(b, tierMap) - getLeadNumericValue(a, tierMap))
            .map((lead) => (
              <LeadCard 
                key={lead.id} 
                lead={lead} 
                formatCurrency={formatCurrency}
                getBuildingName={getBuildingName}
                getClientName={getClientName}
                getContactName={getContactName}
                getServiceTypeColor={getServiceTypeColor}
                getServiceTypeLabel={getServiceTypeLabel}
                getUserName={getUserName}
                openLeadDetail={openLeadDetail}
                tasks={tasks}
                loadingAiSummary={loadingAiSummary}
                aiSummaries={aiSummaries}
                fetchAiSummary={fetchAiSummary}
                activitySummary={activitySummary}
                stageTrack={stage.track ?? "relationship"}
              />
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function LeadCard({ 
  lead, 
  formatCurrency, 
  getBuildingName, 
  getClientName, 
  getContactName, 
  getServiceTypeColor, 
  getServiceTypeLabel, 
  getUserName, 
  openLeadDetail, 
  tasks, 
  loadingAiSummary, 
  aiSummaries, 
  fetchAiSummary,
  activitySummary,
  stageTrack = "relationship",
  isOverlay = false
}: { 
  lead: Lead; 
  formatCurrency: (v: string | number) => string;
  getBuildingName: (id: number | null) => string | null;
  getClientName: (id: number | null) => string;
  getContactName: (id: number | null | undefined) => string | null;
  getServiceTypeColor: (v: string | null | undefined) => string;
  getServiceTypeLabel: (v: string | null | undefined) => string | null;
  getUserName: (id: string | null) => string;
  openLeadDetail: (lead: Lead) => void;
  tasks: Task[];
  loadingAiSummary: Record<number, boolean>;
  aiSummaries: Record<number, { healthLabel: string; headline: string; observation: string; nextStep: string }>;
  fetchAiSummary: (id: number) => void;
  activitySummary: any[] | undefined;
  stageTrack?: string;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const score = lead.confidenceScore ?? 50;
  const leadTasks = tasks.filter(t => t.relatedLeadId === lead.id);
  const contactName = getContactName(lead.contactId);
  const effectiveServiceTypes: string[] = ((lead as any).serviceTypes?.length > 0
    ? (lead as any).serviceTypes
    : lead.serviceType ? [lead.serviceType] : []) as string[];

  const leadSummary = activitySummary?.find(s => s.leadId === lead.id);
  const daysInStage = useMemo(() => {
    const stageDate = leadSummary?.stageChangedAt ? new Date(leadSummary.stageChangedAt) : new Date(lead.createdAt);
    return differenceInDays(new Date(), stageDate);
  }, [leadSummary, lead.createdAt]);

  const daysSinceActivity = useMemo(() => {
    const activityDate = leadSummary?.lastActivityAt ? new Date(leadSummary.lastActivityAt) : null;
    if (!activityDate) return null;
    return differenceInDays(new Date(), activityDate);
  }, [leadSummary]);

  if (isDragging && !isOverlay) {
    return (
      <div 
        ref={setNodeRef} 
        style={style}
        className="h-32 rounded-lg border border-dashed border-primary/20 bg-primary/5" 
      />
    );
  }

  return (
    <HoverCard openDelay={700} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Card
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className={`hover-elevate cursor-grab active:cursor-grabbing border-border shadow transition-shadow hover:shadow-md ${isOverlay ? "cursor-grabbing shadow-xl ring-2 ring-primary" : ""}`}
          onClick={(e) => {
            if (isOverlay) return;
            // Prevent opening detail if dragging
            openLeadDetail(lead);
          }}
          data-testid={`card-lead-${lead.id}`}
          onMouseEnter={() => fetchAiSummary(lead.id)}
        >
          <CardHeader className="p-3 pb-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-sm leading-tight line-clamp-2">{lead.title}</h4>
            </div>
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <UsersIcon className="h-3 w-3" />
              {getClientName(lead.clientId)}
            </p>
            {contactName && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <User2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{contactName}</span>
              </p>
            )}
            {lead.buildingId && getBuildingName(lead.buildingId) && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{getBuildingName(lead.buildingId)}</span>
              </p>
            )}
          </CardHeader>
          <CardContent className="p-3 pt-2 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold flex items-center gap-1 ${(lead.valueType === "potential" && lead.valueTier) ? "text-muted-foreground" : "text-primary"}`}>
                {(lead.valueType === "potential" && lead.valueTier) ? null : <DollarSign className="h-3 w-3" />}
                {(lead.valueType === "potential" && lead.valueTier) ? (
                  <span className="font-black tracking-tight text-primary">{lead.valueTier}</span>
                ) : formatCurrency(lead.value)}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                {getUserName(lead.assignedTo).split(' ')[0]}
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
              {effectiveServiceTypes.map((st, i) => (
                <Badge key={st} variant="outline" className={`text-[9px] px-1.5 py-0 h-4 w-fit font-medium border ${getServiceTypeColor(st)}`}>
                  {i === 0 && <Briefcase className="h-2.5 w-2.5 mr-1" />}
                  {getServiceTypeLabel(st)}
                </Badge>
              ))}
              {lead.tier && <TierBadge tier={lead.tier} size="xs" />}
            </div>

            <div className="space-y-1">
              {lead.confidenceStatus ? (
                <div className="flex items-center gap-1.5">
                  <Badge 
                    variant="secondary" 
                    className={`text-[9px] px-1.5 py-0 h-4 font-bold uppercase tracking-tighter ${
                      lead.confidenceStatus === "undecided" 
                        ? "bg-muted text-muted-foreground" 
                        : "bg-amber-100 text-amber-700 border-amber-200"
                    }`}
                  >
                    {lead.confidenceStatus === "undecided" ? "Undecided" : "Needs Work"}
                  </Badge>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Confidence
                    </span>
                    <span className={`text-[10px] font-bold ${getConfidenceColor(score)}`}>
                      {score}%
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getConfidenceBarColor(score)}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            {lead.tags && lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {lead.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">
                    {tag}
                  </Badge>
                ))}
                {lead.tags.length > 3 && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                    +{lead.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {lead.buildopsQuoteId && stageTrack === "deal" && (
              <div className="flex items-center gap-1.5 border-t pt-1.5 mt-0.5" data-testid={`badge-buildops-quote-${lead.id}`}>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-medium border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800 gap-1">
                  <BuildOpsIcon className="h-3 w-3 shrink-0" />
                  {lead.buildopsQuoteNumber ? `#${lead.buildopsQuoteNumber}` : "Quote"}
                  {lead.buildopsQuoteStatus && <span className="capitalize">· {lead.buildopsQuoteStatus}</span>}
                </Badge>
                {lead.buildopsQuoteTotal && (
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    {formatCurrency(lead.buildopsQuoteTotal)}
                  </span>
                )}
              </div>
            )}

            {leadTasks.length > 0 && (
              <div className="text-[10px] text-muted-foreground flex items-center gap-1 border-t pt-1.5 mt-0.5">
                <CheckCircle2 className="h-3 w-3" />
                {leadTasks.filter(t => t.status === "done").length}/{leadTasks.length} tasks
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-1.5 mt-0.5">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{daysInStage} days in stage</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>
                  Last: {daysSinceActivity === null ? "None" : (daysSinceActivity === 0 ? "Today" : (daysSinceActivity === 1 ? "Yesterday" : `${daysSinceActivity}d ago`))}
                </span>
              </div>
            </div>

            {lead.contractType === "recurring" && (
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-bold bg-blue-100 text-blue-700 border-blue-200 uppercase tracking-tighter">
                  ↻ {lead.recurringFrequency}
                </Badge>
                {lead.renewalDate && (
                  <span className={`text-[9px] font-bold uppercase tracking-tighter ${
                    (new Date(lead.renewalDate).getTime() - new Date().getTime()) < (60 * 24 * 60 * 60 * 1000)
                      ? "text-red-600 animate-pulse"
                      : "text-muted-foreground"
                  }`}>
                    Renews {new Date(lead.renewalDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-64 p-0 overflow-hidden" data-testid={`ai-summary-${lead.id}`}>
        {(() => {
          // Compute health instantly from local data
          const computedHealth: string =
            (daysSinceActivity !== null && daysSinceActivity > 30) || score < 25 ? "At Risk" :
            (daysSinceActivity !== null && daysSinceActivity > 14) || score < 40 ? "Stalled" :
            score >= 70 && (daysSinceActivity === null || daysSinceActivity <= 7) ? "Strong" :
            "On Track";

          const aiData = aiSummaries[lead.id];
          const healthLabel = aiData?.healthLabel ?? computedHealth;
          const isLoading = loadingAiSummary[lead.id];

          const colorMap: Record<string, { badge: string; dot: string; bar: string }> = {
            "Strong":   { badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",  dot: "bg-green-500",  bar: "bg-green-500" },
            "On Track": { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",   dot: "bg-blue-500",   bar: "bg-blue-500" },
            "Stalled":  { badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400", dot: "bg-yellow-500", bar: "bg-yellow-500" },
            "At Risk":  { badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",      dot: "bg-red-500",    bar: "bg-red-500" },
          };
          const colors = colorMap[healthLabel] ?? colorMap["On Track"];

          // Compact meta line
          const lastTouchShort = daysSinceActivity === null ? "No activity"
            : daysSinceActivity === 0 ? "Today"
            : daysSinceActivity === 1 ? "Yesterday"
            : `${daysSinceActivity}d ago`;

          const stageLabel = lead.stage.replace(/_/g, " ");
          const daysInStageShort = daysInStage === 0 ? "today"
            : daysInStage === 1 ? "1d in stage"
            : `${daysInStage}d in stage`;

          // Discussion line: AI headline if loaded, else computed fallback
          const fallbackDiscussion =
            (daysSinceActivity !== null && daysSinceActivity > 30) ? `No activity in ${daysSinceActivity} days — worth a check-in.` :
            (daysSinceActivity !== null && daysSinceActivity > 14) ? `Quiet for ${daysSinceActivity} days. Verify still active.` :
            score < 40 ? `Confidence is low at ${score}% — clarify where this stands.` :
            score >= 70 ? `Strong at ${score}% confidence — push for next step.` :
            `In ${stageLabel}, ${score}% confidence. Moving normally.`;

          const discussion = aiData?.headline || fallbackDiscussion;

          // Verdict
          const verdictMap: Record<string, { label: string; cls: string }> = {
            "Strong":   { label: "✓ Keep moving",     cls: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700" },
            "On Track": { label: "✓ No issues",        cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700" },
            "Stalled":  { label: "→ Quick check-in",   cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700" },
            "At Risk":  { label: "→ Needs discussion", cls: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-700" },
          };
          const verdict = verdictMap[healthLabel] ?? verdictMap["On Track"];

          return (
            <>
              <div className={`${colors.bar} h-1 w-full`} />
              <div className="p-3 space-y-2">
                {/* Health + meta */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                    {healthLabel}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{lastTouchShort} · {daysInStageShort}</span>
                </div>

                {/* Discussion line */}
                <div>
                  {isLoading ? (
                    <div className="space-y-1.5">
                      <div className="h-2 bg-muted animate-pulse rounded w-full" />
                      <div className="h-2 bg-muted animate-pulse rounded w-4/5" />
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5">
                      <p className="text-xs text-foreground leading-relaxed flex-1">{discussion}</p>
                      {aiData?.headline && <Sparkles className="h-2.5 w-2.5 text-primary/50 shrink-0 mt-0.5" />}
                    </div>
                  )}
                </div>

                {/* BuildOps quote info */}
                {lead.buildopsQuoteId && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4" data-testid={`badge-kanban-quote-${lead.id}`}>
                      <Zap className="h-2 w-2 mr-0.5" />
                      {(lead as any).buildopsQuoteNumber ? `#${(lead as any).buildopsQuoteNumber}` : "Quote"}
                    </Badge>
                    {lead.buildopsExpirationDate && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <CalendarIcon className="h-2 w-2" />
                        Exp {new Date(lead.buildopsExpirationDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                )}

                {/* Verdict chip */}
                <div className="pt-1 border-t border-border/50">
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${verdict.cls}`}>
                    {verdict.label}
                  </span>
                </div>
              </div>
            </>
          );
        })()}
      </HoverCardContent>
    </HoverCard>
  );
}

export default function Leads() {
  const searchParams = useSearch();
  const [view, setView] = useState<"kanban" | "list">(() => window.innerWidth < 768 ? "list" : "kanban");
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const autoOpenedRef = useRef(false);
  const [localScore, setLocalScore] = useState(50);
  useEffect(() => { setLocalScore(selectedLead?.confidenceScore ?? 50); }, [selectedLead?.id, selectedLead?.confidenceScore]);
  useEffect(() => {
    setIsEditingInternalNotes(false);
    setSuggestedTask(null);
    setSuggestedTaskLoading(false);
  }, [selectedLead?.id]);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [tagInput, setTagInput] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [isManageStagesOpen, setIsManageStagesOpen] = useState(false);
  const [deleteStageId, setDeleteStageId] = useState<number | null>(null);
  const [deleteStageLabel, setDeleteStageLabel] = useState("");
  const [pendingDealMove, setPendingDealMove] = useState<{ leadId: number; stage: string; clientName: string } | null>(null);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [editingStageLabel, setEditingStageLabel] = useState("");
  const [newStageLabel, setNewStageLabel] = useState("");
  const [newStageColor, setNewStageColor] = useState<string | null>(null);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [isEditingInternalNotes, setIsEditingInternalNotes] = useState(false);
  const [internalNotesDraft, setInternalNotesDraft] = useState("");
  const [editTagInput, setEditTagInput] = useState("");
  const [editFormTags, setEditFormTags] = useState<string[]>([]);
  const [formServiceTypes, setFormServiceTypes] = useState<string[]>([]);
  const [editFormServiceTypes, setEditFormServiceTypes] = useState<string[]>([]);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<number | null>(null);
  const [suggestedTask, setSuggestedTask] = useState<{ title: string; description: string; priority: string; dueInDays: number } | null>(null);
  const [suggestedTaskLoading, setSuggestedTaskLoading] = useState(false);
  const [selectedClientIdForBuilding, setSelectedClientIdForBuilding] = useState<number | null>(null);
  const [selectedClientIdForBuildingEdit, setSelectedClientIdForBuildingEdit] = useState<number | null>(null);
  // Pipeline views
  const [activeViewId, setActiveViewId] = useState<number | null>(null);
  const [buildopsView, setBuildopsView] = useState(false);
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [isManageViewsOpen, setIsManageViewsOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [newViewStages, setNewViewStages] = useState<string[]>([]);
  const [newViewServiceTypes, setNewViewServiceTypes] = useState<string[]>([]);
  const [newViewTiers, setNewViewTiers] = useState<string[]>([]);
  const [newViewTags, setNewViewTags] = useState<string[]>([]);
  const [editingView, setEditingView] = useState<PipelineView | null>(null);
  // AI summaries cache: leadId -> structured analysis
  interface AiSummaryData { healthLabel: string; headline: string; observation: string; nextStep: string; }
  const [aiSummaries, setAiSummaries] = useState<Record<number, AiSummaryData>>({});
  const [loadingAiSummary, setLoadingAiSummary] = useState<Record<number, boolean>>({});
  // Pipeline review report
  const [isPipelineReviewOpen, setIsPipelineReviewOpen] = useState(false);
  const [reviewRunning, setReviewRunning] = useState(false);
  // For create form: contact dropdown
  const [selectedClientIdForContact, setSelectedClientIdForContact] = useState<number | null>(null);
  const [selectedClientIdForContactEdit, setSelectedClientIdForContactEdit] = useState<number | null>(null);
  // Value type toggle for create/edit forms
  const [createValueType, setCreateValueType] = useState<"fixed" | "potential">("fixed");
  const [createValueTier, setCreateValueTier] = useState<string | null>(null);
  const [editValueType, setEditValueType] = useState<"fixed" | "potential">("fixed");
  const [editValueTier, setEditValueTier] = useState<string | null>(null);
  const { toast } = useToast();

  const [createConfidenceStatus, setCreateConfidenceStatus] = useState<string | null>(null);
  const [editConfidenceStatus, setEditConfidenceStatus] = useState<string | null>(null);

  const { data: stages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["/api/pipeline-stages"],
  });

  const { data: leads, isLoading: isLoadingLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  useEffect(() => {
    if (autoOpenedRef.current || !leads) return;
    const params = new URLSearchParams(searchParams);
    const idParam = params.get("id");
    if (!idParam) return;
    const match = leads.find(l => l.id === Number(idParam));
    if (match) {
      autoOpenedRef.current = true;
      setSelectedLead(match);
      setSelectedClientIdForBuildingEdit(match.clientId ?? null);
      setSelectedClientIdForContactEdit(match.clientId ?? null);
    }
  }, [leads, searchParams]);

  const { data: activitySummary } = useQuery<{ leadId: number; lastActivityAt: string | null; stageChangedAt: string | null }[]>({
    queryKey: ["/api/leads/activity-summary"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: allBuildings = [] } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/all-buildings"],
  });

  const { data: allContacts = [] } = useQuery<ClientContact[]>({
    queryKey: ["/api/client-contacts"],
  });

  const { data: dealTags = [] } = useQuery<DealTag[]>({
    queryKey: ["/api/deal-tags"],
  });

  const { data: tierSettings = [] } = useQuery<{ tier: string; estimatedValue: string }[]>({
    queryKey: ["/api/value-tier-settings"],
  });

  const tierMap: Record<string, number> = tierSettings.length > 0
    ? Object.fromEntries(tierSettings.map(t => [t.tier, Number(t.estimatedValue)]))
    : DEFAULT_TIER_VALUES;

  const { data: pipelineViews = [] } = useQuery<PipelineView[]>({
    queryKey: ["/api/pipeline-views"],
  });

  const { data: buildingsForCreate = [] } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/clients", selectedClientIdForBuilding, "all-buildings"],
    enabled: !!selectedClientIdForBuilding,
  });

  const { data: buildingsForEdit = [] } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/clients", selectedClientIdForBuildingEdit, "all-buildings"],
    enabled: !!selectedClientIdForBuildingEdit,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(Number(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = Number(active.id);
    const newStage = String(over.id);
    const lead = leads?.find(l => l.id === leadId);

    if (lead && lead.stage !== newStage) {
      const currentStageObj = stages.find(s => s.slug === lead.stage);
      const targetStageObj = stages.find(s => s.slug === newStage);
      if (currentStageObj?.track === "relationship" && targetStageObj?.track === "deal") {
        const client = clients?.find(c => c.id === lead.clientId);
        setPendingDealMove({ leadId, stage: newStage, clientName: client?.name ?? "this client" });
        return;
      }
      updateLeadStageMutation.mutate({ id: leadId, stage: newStage });
    }
  };

  const contactsForCreate = selectedClientIdForContact
    ? allContacts.filter(c => c.clientId === selectedClientIdForContact)
    : [];

  const contactsForEdit = selectedClientIdForContactEdit
    ? allContacts.filter(c => c.clientId === selectedClientIdForContactEdit)
    : [];

  const getBuildingName = (buildingId: number | null) => {
    if (!buildingId) return null;
    return allBuildings.find(b => b.id === buildingId)?.name ?? null;
  };

  const getContactName = (contactId: number | null | undefined) => {
    if (!contactId) return null;
    return allContacts.find(c => c.id === contactId)?.name ?? null;
  };

  const syncBuildopsQuotesMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/buildops/sync-quotes", {}).then(r => r.json()),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      const parts = [`${data.created} created`, `${data.updated} updated`];
      if (data.matchedViaProperty) parts.push(`${data.matchedViaProperty} matched via property`);
      if (data.valueUpdated) parts.push(`${data.valueUpdated} values updated`);
      toast({ title: "BuildOps sync complete", description: `${parts.join(", ")} (${data.total} total)` });
    },
    onError: (err: any) => {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: InsertLead) => {
      const res = await apiRequest("POST", "/api/leads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsAddDealOpen(false);
      setFormTags([]);
      setTagInput("");
      setCreateValueType("fixed");
      setCreateValueTier(null);
      toast({ title: "Success", description: "Deal created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertLead> }) => {
      const res = await apiRequest("PUT", `/api/leads/${id}`, data);
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedLead(updated);
      toast({ title: "Success", description: "Deal updated successfully" });
    },
  });

  const saveInternalNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      const res = await apiRequest("PUT", `/api/leads/${id}`, { notes });
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedLead(updated);
      setIsEditingInternalNotes(false);
    },
    onError: () => toast({ title: "Failed to save notes", variant: "destructive" }),
  });

  const patchConfidenceMutation = useMutation({
    mutationFn: async ({ id, score }: { id: number; score: number }) => {
      const res = await apiRequest("PUT", `/api/leads/${id}`, { confidenceScore: score });
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedLead(updated);
    },
  });

  const updateLeadStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}/stage`, { stage });
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/activity-summary"] });
      if (selectedLead) setSelectedLead(updated);
    },
  });

  const createStageMutation = useMutation({
    mutationFn: async (data: { label: string; slug: string; color?: string | null }) => {
      const res = await apiRequest("POST", "/api/pipeline-stages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
      setNewStageLabel("");
      setNewStageColor(null);
      toast({ title: "Stage created" });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { label?: string; color?: string | null } }) => {
      const res = await apiRequest("PUT", `/api/pipeline-stages/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
      setEditingStageId(null);
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/pipeline-stages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
      toast({ title: "Stage deleted" });
    },
  });

  const reorderStageMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const res = await apiRequest("POST", "/api/pipeline-stages/reorder", { orderedIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsAddTaskOpen(false);
      addTaskForm.reset();
      toast({ title: "Task created", description: "Task linked to this deal." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string; title?: string; completing?: boolean }) => {
      const res = await apiRequest("PUT", `/api/tasks/${id}`, { status });
      return res.json();
    },
    onMutate: ({ id }) => setPendingTaskId(id),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setPendingTaskId(null);
      if (vars.completing && vars.title && selectedLead) {
        setSuggestedTaskLoading(true);
        setSuggestedTask(null);
        apiRequest("POST", `/api/leads/${selectedLead.id}/suggest-next-task`, { completedTaskTitle: vars.title })
          .then(r => r.json())
          .then(data => { setSuggestedTask(data); setSuggestedTaskLoading(false); })
          .catch(() => setSuggestedTaskLoading(false));
      }
    },
    onError: () => { setPendingTaskId(null); toast({ title: "Error updating task", variant: "destructive" }); },
  });

  const acceptSuggestedTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setSuggestedTask(null);
      toast({ title: "Task added", description: "AI-suggested task added to this deal." });
    },
    onError: () => toast({ title: "Error adding task", variant: "destructive" }),
  });

  const createViewMutation = useMutation({
    mutationFn: async (data: { name: string; filters: object }) => {
      const res = await apiRequest("POST", "/api/pipeline-views", data);
      return res.json();
    },
    onSuccess: (view) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-views"] });
      setActiveViewId(view.id);
      setNewViewName("");
      setNewViewStages([]);
      setNewViewServiceTypes([]);
      setIsManageViewsOpen(false);
      toast({ title: "View created", description: `"${view.name}" is now active.` });
    },
  });

  const updateViewMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: object }) => {
      const res = await apiRequest("PUT", `/api/pipeline-views/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-views"] });
      setEditingView(null);
      toast({ title: "View updated" });
    },
  });

  const deleteViewMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/pipeline-views/${id}`);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-views"] });
      if (activeViewId === id) setActiveViewId(null);
      toast({ title: "View deleted" });
    },
  });

  const fetchAiSummary = async (leadId: number, force = false) => {
    if (!force && (aiSummaries[leadId] || loadingAiSummary[leadId])) return;
    setLoadingAiSummary(prev => ({ ...prev, [leadId]: true }));
    try {
      const res = await apiRequest("POST", `/api/leads/${leadId}/ai-summary`, {});
      const data = await res.json();
      setAiSummaries(prev => ({ ...prev, [leadId]: {
        healthLabel: data.healthLabel ?? "On Track",
        headline: data.headline ?? "No summary available.",
        observation: data.observation ?? "",
        nextStep: data.nextStep ?? "",
      }}));
    } catch {
      setAiSummaries(prev => ({ ...prev, [leadId]: { healthLabel: "Unknown", headline: "Unable to generate summary at this time.", observation: "", nextStep: "" } }));
    } finally {
      setLoadingAiSummary(prev => ({ ...prev, [leadId]: false }));
    }
  };

  // Auto-fetch AI analysis when a lead detail panel opens
  useEffect(() => {
    if (selectedLead?.id) fetchAiSummary(selectedLead.id);
  }, [selectedLead?.id]);

  // Run pipeline review: fetch AI for all active deals in batches of 3
  const runPipelineReview = async () => {
    const activeDeals = (leads ?? []).filter(l => l.stage !== "won" && l.stage !== "lost");
    if (activeDeals.length === 0) return;
    setReviewRunning(true);
    const batches: Lead[][] = [];
    for (let i = 0; i < activeDeals.length; i += 3) {
      batches.push(activeDeals.slice(i, i + 3));
    }
    for (const batch of batches) {
      await Promise.all(batch.map(l => fetchAiSummary(l.id, true)));
    }
    setReviewRunning(false);
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    const newOrder = [...stages];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    reorderStageMutation.mutate(newOrder.map((s) => s.id));
  };

  const getStageColors = (color: string | null | undefined) =>
    STAGE_COLORS[(color as keyof typeof STAGE_COLORS) ?? "default"] ?? STAGE_COLORS.default;

  const getStageWeightedValue = (slug: string) => {
    const stageLeads = filteredLeads?.filter((l) => l.stage === slug) ?? [];
    return stageLeads.reduce((sum, lead) => {
      const weight = (lead.confidenceScore ?? 50) / 100;
      return sum + getLeadNumericValue(lead, tierMap) * weight;
    }, 0);
  };

  const getStageRawValue = (slug: string) => {
    const stageLeads = filteredLeads?.filter((l) => l.stage === slug) ?? [];
    return stageLeads.reduce((sum, lead) => sum + getLeadNumericValue(lead, tierMap), 0);
  };

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      title: "",
      clientId: undefined,
      buildingId: null,
      stage: "met_introduced",
      valueType: "fixed",
      value: "0",
      valueTier: null,
      tier: null,
      confidenceScore: 50,
      tags: [],
      notes: "",
      assignedTo: undefined,
      contractType: "one_time",
      recurringFrequency: null,
      contractStartDate: null,
      renewalDate: null,
    },
  });

  const editLeadForm = useForm<Partial<InsertLead>>({
    defaultValues: {
      title: "",
      clientId: undefined,
      buildingId: null,
      value: "0",
      tier: null,
      confidenceScore: 50,
      notes: "",
      assignedTo: undefined,
      contractType: "one_time",
      recurringFrequency: null,
      contractStartDate: null,
      renewalDate: null,
    },
  });

  const addTaskForm = useForm<InsertTask>({
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "todo",
      assignedTo: undefined,
      dueDate: undefined,
      relatedLeadId: undefined,
      relatedClientId: undefined,
    },
  });

  const activeView = pipelineViews.find(v => v.id === activeViewId) ?? null;
  const activeFilters = activeView ? (activeView.filters as { stages?: string[]; serviceTypes?: string[]; tiers?: string[]; tags?: string[] }) : null;

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch = lead.title.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === "all" || lead.stage === stageFilter;
    const matchesViewStage = !activeFilters?.stages?.length || activeFilters.stages.includes(lead.stage);
    const leadServiceTypes: string[] = ((lead as any).serviceTypes?.length > 0
      ? (lead as any).serviceTypes
      : lead.serviceType ? [lead.serviceType] : []) as string[];
    const matchesViewService = !activeFilters?.serviceTypes?.length || activeFilters.serviceTypes.some(f => leadServiceTypes.includes(f));
    const matchesViewTier = !activeFilters?.tiers?.length || (lead.tier != null && activeFilters.tiers.includes(lead.tier));
    const matchesViewTag = !activeFilters?.tags?.length || (lead.tags && activeFilters.tags.some(t => lead.tags!.includes(t)));
    const matchesTier = tierFilter === "all" || lead.tier === tierFilter;
    const matchesTag = tagFilter === "all" || (lead.tags && lead.tags.includes(tagFilter));
    return matchesSearch && matchesStage && matchesViewStage && matchesViewService && matchesViewTier && matchesViewTag && matchesTier && matchesTag;
  });

  const getClientName = (clientId: number | null) => {
    if (!clientId) return "N/A";
    return clients?.find((c) => c.id === clientId)?.name || "Unknown Client";
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const user = users?.find((u) => u.id === userId);
    if (!user) return "Unknown User";
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return name || user.email || "Unknown";
  };

  const formatCurrency = (value: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));

  const formatLeadValue = (lead: { value: string | number; valueType?: string | null; valueTier?: string | null }) => {
    if (lead.valueType === "potential" && lead.valueTier) {
      return lead.valueTier;
    }
    return formatCurrency(lead.value);
  };

  const isLeadPotential = (lead: { valueType?: string | null; valueTier?: string | null }) =>
    lead.valueType === "potential" && !!lead.valueTier;

  const addTag = async (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean && !formTags.includes(clean)) {
      const next = [...formTags, clean];
      setFormTags(next);
      form.setValue("tags", next);
      if (!dealTags.find(t => t.name === clean)) {
        await apiRequest("POST", "/api/deal-tags", { name: clean });
        queryClient.invalidateQueries({ queryKey: ["/api/deal-tags"] });
      }
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    const next = formTags.filter((t) => t !== tag);
    setFormTags(next);
    form.setValue("tags", next);
  };

  const onSubmit = (data: InsertLead) => {
    createLeadMutation.mutate({ ...data, tags: formTags, confidenceStatus: createConfidenceStatus, serviceTypes: formServiceTypes });
  };

  const getLeadTasks = (leadId: number) =>
    tasks.filter((t) => t.relatedLeadId === leadId);

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditingLead(false);
    setIsAddTaskOpen(false);
    setSelectedClientIdForBuildingEdit(lead.clientId ?? null);
    setSelectedClientIdForContactEdit(lead.clientId ?? null);
    setEditConfidenceStatus(lead.confidenceStatus ?? null);
    const vType = (lead.valueType as "fixed" | "potential") ?? "fixed";
    setEditValueType(vType);
    setEditValueTier((lead.valueTier as string | null) ?? null);
    editLeadForm.reset({
      title: lead.title,
      clientId: lead.clientId ?? undefined,
      contactId: lead.contactId ?? null,
      buildingId: lead.buildingId ?? null,
      serviceType: (lead.serviceType as any) ?? null,
      valueType: vType,
      value: lead.value,
      valueTier: (lead.valueTier as any) ?? null,
      tier: (lead.tier as any) ?? null,
      confidenceScore: lead.confidenceScore ?? 50,
      notes: lead.notes ?? "",
      assignedTo: lead.assignedTo ?? undefined,
      contractType: (lead.contractType as any) ?? "one_time",
      recurringFrequency: lead.recurringFrequency as any,
      contractStartDate: lead.contractStartDate ? new Date(lead.contractStartDate) : null,
      renewalDate: lead.renewalDate ? new Date(lead.renewalDate) : null,
    });
    setEditFormTags(lead.tags ?? []);
    const effectiveTypes = (lead as any).serviceTypes?.length > 0
      ? (lead as any).serviceTypes as string[]
      : lead.serviceType ? [lead.serviceType as string] : [];
    setEditFormServiceTypes(effectiveTypes);
  };

  const addEditTag = async (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean && !editFormTags.includes(clean)) {
      setEditFormTags((prev) => [...prev, clean]);
      if (!dealTags.find(t => t.name === clean)) {
        await apiRequest("POST", "/api/deal-tags", { name: clean });
        queryClient.invalidateQueries({ queryKey: ["/api/deal-tags"] });
      }
    }
    setEditTagInput("");
  };

  const removeEditTag = (tag: string) => setEditFormTags((prev) => prev.filter((t) => t !== tag));

  const saveLeadEdits = (data: Partial<InsertLead>) => {
    if (!selectedLead) return;
    updateLeadMutation.mutate({
      id: selectedLead.id,
      data: { ...data, tags: editFormTags, confidenceStatus: editConfidenceStatus, serviceTypes: editFormServiceTypes },
    });
    setIsEditingLead(false);
  };

  const detailScore = selectedLead?.confidenceScore ?? 50;
  const detailLeadTasks = selectedLead ? getLeadTasks(selectedLead.id) : [];

  const scrollToColumn = (stageSlug: string) => {
    const el = document.getElementById(`column-${stageSlug}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted" data-testid="page-leads">
      <header className="flex flex-col gap-3 p-4 md:p-6 bg-background border-b shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">Deals</h1>
              <p className="text-muted-foreground hidden md:block">Manage your sales pipeline and track opportunities</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle — always visible */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" data-testid="button-view-selector">
                  {view === "kanban" ? <LayoutGrid className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{view === "kanban" ? "Board" : "List"}</span>
                  <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => setView("kanban")} className="gap-2" data-testid="option-view-board">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Board
                  {view === "kanban" && <Check className="h-3.5 w-3.5 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("list")} className="gap-2" data-testid="option-view-list">
                  <List className="h-3.5 w-3.5" />
                  List
                  {view === "list" && <Check className="h-3.5 w-3.5 ml-auto" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Overflow menu for secondary actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8" data-testid="button-mobile-more">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setIsPipelineReviewOpen(true); runPipelineReview(); }} data-testid="option-pipeline-review-mobile">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Pipeline Review
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsManageStagesOpen(true)} data-testid="option-manage-stages-mobile">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Stages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setEditingView(null);
                  setNewViewName("");
                  setNewViewStages([]);
                  setNewViewServiceTypes([]);
                  setNewViewTiers([]);
                  setNewViewTags([]);
                  setIsManageViewsOpen(true);
                }} data-testid="option-new-view-mobile">
                  <BookmarkPlus className="h-4 w-4 mr-2" />
                  New View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Add Deal — desktop only; on mobile use FAB */}
            <Button onClick={() => {
              form.reset();
              setFormTags([]);
              setTagInput("");
              setIsAddDealOpen(true);
            }} className="hidden md:inline-flex" data-testid="button-add-lead">
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </div>
        </div>

        {/* Mobile Stage Selector */}
        <div className="md:hidden px-0 pb-1 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max pb-1">
            {stages.map((stage) => {
              const count = leads?.filter(l => l.stage === stage.slug).length ?? 0;
              return (
                <Button
                  key={stage.slug}
                  variant="outline"
                  size="sm"
                  className="rounded-full h-8 px-3 text-[10px] font-bold uppercase tracking-wider border-muted-foreground/20 whitespace-nowrap bg-background"
                  onClick={() => scrollToColumn(stage.slug)}
                >
                  {stage.label}
                  <Badge variant="secondary" className="ml-1.5 h-4 px-1 min-w-[1rem] text-[9px]">
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Pipeline View switcher — desktop only */}
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setActiveViewId(null); setBuildopsView(false); }}
            className={`px-3 py-1 text-sm rounded-full border transition-colors font-medium ${!activeViewId && !buildopsView ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
            data-testid="button-view-all"
          >
            All Deals
          </button>
          {pipelineViews.map(v => (
            <button
              key={v.id}
              onClick={() => { setActiveViewId(v.id); setBuildopsView(false); }}
              className={`px-3 py-1 text-sm rounded-full border transition-colors font-medium ${activeViewId === v.id && !buildopsView ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
              data-testid={`button-view-${v.id}`}
            >
              {v.name}
            </button>
          ))}
          <button
            onClick={() => { setBuildopsView(true); setActiveViewId(null); }}
            className={`px-3 py-1 text-sm rounded-full border transition-colors font-medium flex items-center gap-1.5 ${buildopsView ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
            data-testid="button-view-buildops"
          >
            <BuildOpsIcon className="h-3.5 w-3.5 shrink-0" />
            BuildOps Quotes
          </button>
          <Button size="sm" variant="outline" className="h-7 rounded-full text-xs gap-1.5" onClick={() => {
            setEditingView(null);
            setNewViewName("");
            setNewViewStages([]);
            setNewViewServiceTypes([]);
            setNewViewTiers([]);
            setNewViewTags([]);
            setIsManageViewsOpen(true);
          }} data-testid="button-manage-views">
            <BookmarkPlus className="h-3.5 w-3.5" />
            New View
          </Button>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-leads"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.slug}>{stage.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-lead-tier-filter">
              <SelectValue placeholder="All Tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="tier_1">Tier 1</SelectItem>
              <SelectItem value="tier_2">Tier 2</SelectItem>
              <SelectItem value="tier_3">Tier 3</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-lead-tag-filter">
              <TagIcon className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {dealTags.map((tag) => (
                <SelectItem key={tag.id} value={tag.name}>{tag.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeView && (
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium border border-primary/30 bg-primary/5 rounded-full px-3 py-1">
              <Eye className="h-3 w-3" />
              View: {activeView.name}
              <button onClick={() => setActiveViewId(null)} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {isLoadingLeads ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        ) : buildopsView ? (
          <div className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-heading font-bold flex items-center gap-2">
                  <BuildOpsIcon className="h-5 w-5 shrink-0" />
                  BuildOps Quotes
                </h2>
                <p className="text-sm text-muted-foreground">Quotes synced from BuildOps — tracked as deals</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => syncBuildopsQuotesMutation.mutate()}
                disabled={syncBuildopsQuotesMutation.isPending}
                data-testid="button-sync-buildops-quotes"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncBuildopsQuotesMutation.isPending ? "animate-spin" : ""}`} />
                Sync BuildOps Quotes
              </Button>
            </div>
            {(() => {
              const buildopsLeads = (leads ?? []).filter((l: any) => l.buildopsQuoteId);
              const boCols = [
                { key: "draft", label: "Quote Needed", statuses: ["draft", "new", "open"], color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300" },
                { key: "sent", label: "Quote Sent", statuses: ["sent", "submitted", "pending", "review", "awaitingapproval", "senttocustomer", "customerviewed"], color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300" },
                { key: "approved", label: "Approved / Won", statuses: ["approved", "won", "accepted", "jobadded", "converted", "projectadded"], color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300" },
                { key: "rejected", label: "Rejected / Expired", statuses: ["rejected", "expired", "lost", "cancelled", "declined"], color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300" },
              ];
              const formatCurrencyLocal = (v: any) =>
                v != null && Number(v) !== 0 ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(v)) : "—";
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {boCols.map(col => {
                    const colLeads = buildopsLeads.filter((l: any) => {
                      const statusLower = l.buildopsQuoteStatus?.toLowerCase() ?? null;
                      return col.statuses.includes(statusLower) ||
                        (col.key === "draft" && !statusLower);
                    });
                    return (
                      <div key={col.key}>
                        <div className={`rounded-t-lg border-b-0 border px-3 py-2 flex items-center justify-between ${col.color}`}>
                          <span className="text-xs font-semibold uppercase tracking-wider">{col.label}</span>
                          <span className="text-xs font-bold">{colLeads.length}</span>
                        </div>
                        <div className="border border-t-0 rounded-b-lg min-h-[80px] divide-y divide-border/40 bg-card">
                          {colLeads.length === 0 ? (
                            <p className="px-3 py-4 text-xs text-muted-foreground italic text-center">None</p>
                          ) : (
                            colLeads.map((l: any) => {
                              const daysOld = Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / 86400000);
                              return (
                                <div
                                  key={l.id}
                                  className="px-3 py-2.5 hover:bg-muted/20 cursor-pointer"
                                  onClick={() => openLeadDetail(l)}
                                  data-testid={`buildops-card-${l.id}`}
                                >
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="min-w-0">
                                      <p className="font-semibold text-xs truncate">{getClientName(l.clientId)}</p>
                                      <p className="text-[11px] text-muted-foreground truncate">{l.title}</p>
                                      {l.buildopsQuoteNumber && (
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                          <BuildOpsIcon className="h-2.5 w-2.5 shrink-0" />
                                          #{l.buildopsQuoteNumber}
                                        </p>
                                      )}
                                      {l.buildopsExpirationDate && (
                                        <p className="text-[10px] text-muted-foreground">
                                          Exp {new Date(l.buildopsExpirationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
                                        </p>
                                      )}
                                    </div>
                                    <div className="shrink-0 text-right">
                                      <p className="text-xs font-semibold tabular-nums">{formatCurrencyLocal(l.buildopsQuoteTotal ?? l.value)}</p>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${daysOld >= 7 ? "bg-red-100 text-red-700" : daysOld >= 3 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                                        {daysOld}d
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : view === "kanban" ? (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full overflow-x-auto p-4 md:p-6 gap-6 scroll-snap-x-mandatory scroll-smooth">
              {(() => {
                const visibleStages = activeFilters?.stages?.length
                  ? stages.filter(s => activeFilters!.stages!.includes(s.slug))
                  : stages;
                const relationshipStages = visibleStages.filter(s => s.track !== "deal");
                const dealStages = visibleStages.filter(s => s.track === "deal");

                return (
                  <>
                    {relationshipStages.length > 0 && (
                      <>
                        <div className="flex flex-col items-center justify-start pt-2 shrink-0">
                          <div className="writing-mode-vertical text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 bg-muted/30 px-1.5 py-3 rounded-full" style={{ writingMode: "vertical-lr", textOrientation: "mixed" }} data-testid="track-label-relationship">
                            Relationship
                          </div>
                        </div>
                        {relationshipStages.map((stage) => {
                          const sc = getStageColors(stage.color);
                          const weightedVal = getStageWeightedValue(stage.slug);
                          const rawVal = getStageRawValue(stage.slug);
                          const cardCount = filteredLeads?.filter(l => l.stage === stage.slug).length || 0;
                          return (
                            <KanbanColumn 
                              key={stage.id} 
                              stage={stage} 
                              sc={sc} 
                              weightedVal={weightedVal} 
                              rawVal={rawVal} 
                              cardCount={cardCount}
                              filteredLeads={filteredLeads}
                              tierMap={tierMap}
                              formatCurrency={formatCurrency}
                              getBuildingName={getBuildingName}
                              getClientName={getClientName}
                              getContactName={getContactName}
                              getServiceTypeColor={getServiceTypeColor}
                              getServiceTypeLabel={getServiceTypeLabel}
                              getUserName={getUserName}
                              openLeadDetail={openLeadDetail}
                              tasks={tasks}
                              loadingAiSummary={loadingAiSummary}
                              aiSummaries={aiSummaries}
                              fetchAiSummary={fetchAiSummary}
                              activitySummary={activitySummary}
                            />
                          );
                        })}
                      </>
                    )}
                    {relationshipStages.length > 0 && dealStages.length > 0 && (
                      <div className="flex flex-col items-center justify-stretch shrink-0 py-2">
                        <div className="w-px flex-1 bg-border" />
                        <div className="my-2 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                        <div className="w-px flex-1 bg-border" />
                      </div>
                    )}
                    {dealStages.length > 0 && (
                      <>
                        <div className="flex flex-col items-center justify-start pt-2 shrink-0">
                          <div className="writing-mode-vertical text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 bg-primary/5 px-1.5 py-3 rounded-full border border-primary/10" style={{ writingMode: "vertical-lr", textOrientation: "mixed" }} data-testid="track-label-deal">
                            Deal
                          </div>
                        </div>
                        {dealStages.map((stage) => {
                          const sc = getStageColors(stage.color);
                          const weightedVal = getStageWeightedValue(stage.slug);
                          const rawVal = getStageRawValue(stage.slug);
                          const cardCount = filteredLeads?.filter(l => l.stage === stage.slug).length || 0;
                          return (
                            <KanbanColumn 
                              key={stage.id} 
                              stage={stage} 
                              sc={sc} 
                              weightedVal={weightedVal} 
                              rawVal={rawVal} 
                              cardCount={cardCount}
                              filteredLeads={filteredLeads}
                              tierMap={tierMap}
                              formatCurrency={formatCurrency}
                              getBuildingName={getBuildingName}
                              getClientName={getClientName}
                              getContactName={getContactName}
                              getServiceTypeColor={getServiceTypeColor}
                              getServiceTypeLabel={getServiceTypeLabel}
                              getUserName={getUserName}
                              openLeadDetail={openLeadDetail}
                              tasks={tasks}
                              loadingAiSummary={loadingAiSummary}
                              aiSummaries={aiSummaries}
                              fetchAiSummary={fetchAiSummary}
                              activitySummary={activitySummary}
                            />
                          );
                        })}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
            <DragOverlay>
              {activeDragId && leads?.find(l => l.id === activeDragId) ? (
                <div className="w-[280px] rotate-3 opacity-80 cursor-grabbing pointer-events-none">
                  <LeadCard 
                    lead={leads.find(l => l.id === activeDragId)!}
                    formatCurrency={formatCurrency}
                    getBuildingName={getBuildingName}
                    getClientName={getClientName}
                    getContactName={getContactName}
                    getServiceTypeColor={getServiceTypeColor}
                    getServiceTypeLabel={getServiceTypeLabel}
                    getUserName={getUserName}
                    openLeadDetail={openLeadDetail}
                    tasks={tasks}
                    loadingAiSummary={loadingAiSummary}
                    aiSummaries={aiSummaries}
                    fetchAiSummary={fetchAiSummary}
                    activitySummary={activitySummary}
                    isOverlay
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="p-6">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Deal Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads?.map((lead) => {
                    const score = lead.confidenceScore ?? 50;
                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer"
                        onClick={() => openLeadDetail(lead)}
                        data-testid={`row-lead-${lead.id}`}
                      >
                        <TableCell className="font-medium">
                          <div>
                            {lead.title}
                            {lead.buildingId && getBuildingName(lead.buildingId) && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Building2 className="h-3 w-3 shrink-0" />
                                {getBuildingName(lead.buildingId)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getClientName(lead.clientId)}</TableCell>
                        <TableCell>
                          {lead.contactId ? (
                            <span className="flex items-center gap-1 text-sm">
                              <User2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {getContactName(lead.contactId) ?? "—"}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const types: string[] = ((lead as any).serviceTypes?.length > 0
                              ? (lead as any).serviceTypes
                              : lead.serviceType ? [lead.serviceType] : []) as string[];
                            return types.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {types.map(st => (
                                  <Badge key={st} variant="outline" className={`text-xs font-medium border ${getServiceTypeColor(st)}`}>
                                    {getServiceTypeLabel(st)}
                                  </Badge>
                                ))}
                              </div>
                            ) : <span className="text-muted-foreground">—</span>;
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {lead.stage.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TierBadge tier={lead.tier} size="xs" />
                        </TableCell>
                        <TableCell className="font-mono">
                          {isLeadPotential(lead) ? (
                            <span className="font-black text-primary tracking-tight">{lead.valueTier}</span>
                          ) : formatCurrency(lead.value)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[80px]">
                            {lead.confidenceStatus ? (
                              <Badge 
                                variant="secondary" 
                                className={`text-[9px] px-1.5 py-0 h-4 font-bold uppercase tracking-tighter ${
                                  lead.confidenceStatus === "undecided" 
                                    ? "bg-muted text-muted-foreground" 
                                    : "bg-amber-100 text-amber-700 border-amber-200"
                                }`}
                              >
                                {lead.confidenceStatus === "undecided" ? "Undecided" : "Needs Work"}
                              </Badge>
                            ) : (
                              <>
                                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${getConfidenceBarColor(score)}`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-bold ${getConfidenceColor(score)}`}>{score}%</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {lead.tags?.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                            {(lead.tags?.length ?? 0) > 2 && (
                              <Badge variant="outline" className="text-xs">+{(lead.tags?.length ?? 0) - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getUserName(lead.assignedTo)}</TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </main>

      {/* Add Deal Sheet */}
      <Sheet open={isAddDealOpen} onOpenChange={setIsAddDealOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Deal</SheetTitle>
            <SheetDescription>Enter the details for the new business opportunity.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. Building Maintenance Q3" {...field} data-testid="input-deal-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={(clients ?? []).map(c => ({ value: c.id.toString(), label: c.name }))}
                        value={field.value?.toString() ?? ""}
                        onChange={(val) => {
                          const id = parseInt(val);
                          field.onChange(id);
                          setSelectedClientIdForBuilding(id);
                          setSelectedClientIdForContact(id);
                          form.setValue("buildingId", null);
                          form.setValue("contactId", null);
                        }}
                        placeholder="Select a client"
                        searchPlaceholder="Search clients..."
                        data-testid="select-deal-client"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedClientIdForContact && contactsForCreate.length > 0 && (
                <FormField
                  control={form.control}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact (Optional)</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                        value={field.value != null ? String(field.value) : "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-deal-contact">
                            <SelectValue placeholder="No specific contact" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No specific contact</SelectItem>
                          {contactsForCreate.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              <span className="flex items-center gap-2">
                                <User2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {c.name}{c.title ? ` · ${c.title}` : ""}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="space-y-2">
                <Label>Services (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {SERVICE_TYPE_OPTIONS.map((opt) => {
                    const selected = formServiceTypes.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormServiceTypes(prev => selected ? prev.filter(s => s !== opt.value) : [...prev, opt.value])}
                        className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${selected ? opt.color + " border-transparent" : "bg-muted/30 text-muted-foreground border-border/50 hover:border-border"}`}
                        data-testid={`toggle-create-service-${opt.value}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedClientIdForBuilding && buildingsForCreate.length > 0 && (
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building (Optional)</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                        value={field.value != null ? String(field.value) : "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-deal-building">
                            <SelectValue placeholder="No specific building" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No specific building</SelectItem>
                          {buildingsForCreate.map((b) => (
                            <SelectItem key={b.id} value={b.id.toString()}>
                              <span className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {b.name}{b.address ? ` · ${b.address}` : ""}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-deal-stage">
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.slug}>{stage.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 rounded-lg border p-3 bg-muted/30">
                <FormField
                  control={form.control}
                  name="contractType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Contract Type</FormLabel>
                      <FormControl>
                        <div className="flex items-center bg-muted rounded-md p-0.5 border w-fit">
                          <button
                            type="button"
                            onClick={() => {
                              field.onChange("one_time");
                              form.setValue("recurringFrequency", null);
                              form.setValue("contractStartDate", null);
                              form.setValue("renewalDate", null);
                            }}
                            className={`px-3 py-1 text-sm rounded font-medium transition-colors ${field.value === "one_time" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                            data-testid="button-contract-one-time"
                          >
                            One-Time
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange("recurring")}
                            className={`px-3 py-1 text-sm rounded font-medium transition-colors ${field.value === "recurring" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                            data-testid="button-contract-recurring"
                          >
                            Recurring
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("contractType") === "recurring" && (
                  <div className="grid gap-4 pt-2">
                    <FormField
                      control={form.control}
                      name="recurringFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-lead-frequency">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="annual">Annual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="contractStartDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                data-testid="input-lead-start-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="renewalDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Renewal Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                data-testid="input-lead-renewal-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Value Type toggle + input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Value</Label>
                <div className="flex items-center bg-muted rounded-md p-0.5 border w-fit">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateValueType("fixed");
                      form.setValue("valueType", "fixed");
                      form.setValue("valueTier", null);
                      setCreateValueTier(null);
                    }}
                    className={`px-3 py-1 text-sm rounded font-medium transition-colors ${createValueType === "fixed" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    data-testid="button-value-type-fixed"
                  >
                    Price
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateValueType("potential");
                      form.setValue("valueType", "potential");
                      form.setValue("value", "0");
                    }}
                    className={`px-3 py-1 text-sm rounded font-medium transition-colors ${createValueType === "potential" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    data-testid="button-value-type-potential"
                  >
                    Potential
                  </button>
                </div>

                {createValueType === "fixed" ? (
                  <FormField
                    control={form.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                            <Input type="number" step="0.01" className="pl-6" {...field} data-testid="input-deal-value" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      {TIER_OPTIONS.map((tier) => (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => {
                            setCreateValueTier(tier);
                            form.setValue("valueTier", tier as any);
                          }}
                          className={`flex-1 py-2 text-sm font-bold rounded-md border transition-colors ${createValueTier === tier ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
                          data-testid={`button-tier-${tier}`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {createValueTier ? `≈ ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(tierMap[createValueTier] ?? 0)} estimated` : "Select a potential tier"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <FormLabel>Confidence Status</FormLabel>
                <div className="flex items-center bg-muted rounded-md p-0.5 border w-fit">
                  <button
                    type="button"
                    onClick={() => setCreateConfidenceStatus("undecided")}
                    className={`px-3 py-1 text-sm rounded font-medium transition-colors ${createConfidenceStatus === "undecided" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    data-testid="button-confidence-undecided"
                  >
                    Undecided
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateConfidenceStatus("needs_work")}
                    className={`px-3 py-1 text-sm rounded font-medium transition-colors ${createConfidenceStatus === "needs_work" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    data-testid="button-confidence-needs-work"
                  >
                    Needs Work
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateConfidenceStatus(null)}
                    className={`px-3 py-1 text-sm rounded font-medium transition-colors ${createConfidenceStatus === null ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    data-testid="button-confidence-set-score"
                  >
                    Set Score
                  </button>
                </div>
              </div>

              {!createConfidenceStatus && (
                <FormField
                  control={form.control}
                  name="confidenceScore"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Confidence Score</FormLabel>
                        <span className={`text-sm font-bold ${getConfidenceColor(field.value ?? 50)}`}>
                          {field.value ?? 50}%
                        </span>
                      </div>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value ?? 50]}
                          onValueChange={([val]) => field.onChange(val)}
                          className="mt-2"
                          data-testid="slider-confidence"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead Tier</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lead-tier">
                          <SelectValue placeholder="No Tier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Tier</SelectItem>
                        <SelectItem value="tier_1">Tier 1 — High Value</SelectItem>
                        <SelectItem value="tier_2">Tier 2 — Medium Value</SelectItem>
                        <SelectItem value="tier_3">Tier 3 — Lower Value</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Tags</FormLabel>
                  <Link to="/settings" className="text-xs text-primary hover:underline">Manage tags →</Link>
                </div>
                <div className="flex gap-2">
                <div className="relative">
                  <Input
                    placeholder="Add a tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    list="deal-tags-list"
                    data-testid="input-lead-tag"
                  />
                  <datalist id="deal-tags-list">
                    {dealTags.map(t => <option key={t.id} value={t.name} />)}
                  </datalist>
                </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => addTag(tagInput)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="rounded-sm hover:bg-muted p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lead-assignee">
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details..."
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-deal-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SheetFooter className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createLeadMutation.isPending}
                  data-testid="button-save-lead"
                >
                  {createLeadMutation.isPending ? "Creating..." : "Create Deal"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Mobile FAB — Add Deal */}
      <button
        className="md:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        onClick={() => {
          form.reset();
          setFormTags([]);
          setTagInput("");
          setIsAddDealOpen(true);
        }}
        data-testid="button-add-deal-fab"
        aria-label="Add Deal"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Lead Detail Sheet */}
      <Sheet open={!!selectedLead} onOpenChange={(open) => {
        if (!open) {
          setSelectedLead(null);
          setIsEditingLead(false);
          setIsAddTaskOpen(false);
        }
      }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="capitalize">
                      {selectedLead.stage.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">ID: #{selectedLead.id}</span>
                  </div>
                  {!isEditingLead ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingLead(true)}
                      data-testid="button-edit-lead"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit Deal
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsEditingLead(false);
                          setEditFormTags(selectedLead.tags ?? []);
                          const vType = (selectedLead.valueType as "fixed" | "potential") ?? "fixed";
                          setEditValueType(vType);
                          setEditValueTier((selectedLead.valueTier as string | null) ?? null);
                          editLeadForm.reset({
                            title: selectedLead.title,
                            clientId: selectedLead.clientId ?? undefined,
                            contactId: selectedLead.contactId ?? null,
                            buildingId: selectedLead.buildingId ?? null,
                            serviceType: (selectedLead.serviceType as any) ?? null,
                            valueType: vType,
                            value: selectedLead.value,
                            valueTier: (selectedLead.valueTier as any) ?? null,
                            confidenceScore: selectedLead.confidenceScore ?? 50,
                            notes: selectedLead.notes ?? "",
                            assignedTo: selectedLead.assignedTo ?? undefined,
                          });
                        }}
                        data-testid="button-cancel-edit-lead"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={editLeadForm.handleSubmit(saveLeadEdits)}
                        disabled={updateLeadMutation.isPending}
                        data-testid="button-save-lead-edits"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {updateLeadMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
                <SheetTitle className="text-2xl">{selectedLead.title}</SheetTitle>
                <SheetDescription>
                  Full details, tasks, and activity timeline for this opportunity.
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="w-full grid grid-cols-5 h-auto">
                  <TabsTrigger value="details" className="py-2.5 text-xs sm:text-sm">Details</TabsTrigger>
                  <TabsTrigger value="notes" className="py-2.5 text-xs sm:text-sm" data-testid="tab-activity">Activity</TabsTrigger>
                  <TabsTrigger value="attachments" className="py-2.5 text-xs sm:text-sm">Files</TabsTrigger>
                  <TabsTrigger value="tasks" className="py-2.5 text-xs sm:text-sm">
                    Tasks
                    {detailLeadTasks.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                        {detailLeadTasks.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="py-2.5 text-xs sm:text-sm">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 py-4">
                  {/* AI Deal Analysis Card */}
                  {!isEditingLead && (() => {
                    const s = aiSummaries[selectedLead.id];
                    const isLoading = loadingAiSummary[selectedLead.id];
                    const colorMap: Record<string, string> = {
                      "Strong": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
                      "On Track": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
                      "Stalled": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
                      "At Risk": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
                    };
                    const dotMap: Record<string, string> = {
                      "Strong": "bg-green-500", "On Track": "bg-blue-500",
                      "Stalled": "bg-yellow-500", "At Risk": "bg-red-500",
                    };
                    return (
                      <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3" data-testid="ai-analysis-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-bold text-primary uppercase tracking-wide">AI Deal Analysis</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {s && !isLoading && (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${colorMap[s.healthLabel] ?? colorMap["On Track"]}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${dotMap[s.healthLabel] ?? "bg-blue-500"}`} />
                                {s.healthLabel}
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setAiSummaries(prev => { const n = {...prev}; delete n[selectedLead.id]; return n; });
                                fetchAiSummary(selectedLead.id, true);
                              }}
                              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                              title="Refresh analysis"
                              data-testid="button-refresh-ai-analysis"
                            >
                              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {isLoading ? (
                          <div className="space-y-2">
                            <div className="h-3 bg-muted animate-pulse rounded w-full" />
                            <div className="h-3 bg-muted animate-pulse rounded w-5/6" />
                            <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                          </div>
                        ) : s ? (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground italic leading-relaxed">{s.headline}</p>
                            {s.observation && (
                              <div className="flex gap-2.5">
                                <div className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                                  <AlertTriangle className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Key Signal</p>
                                  <p className="text-xs text-foreground leading-relaxed">{s.observation}</p>
                                </div>
                              </div>
                            )}
                            {s.nextStep && (
                              <div className="flex gap-2.5">
                                <div className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                                  <ArrowRight className="h-2.5 w-2.5 text-primary" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Next Step</p>
                                  <p className="text-xs text-foreground leading-relaxed">{s.nextStep}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Generating analysis...</p>
                        )}
                      </div>
                    );
                  })()}

                  {isEditingLead ? (
                    <Form {...editLeadForm}>
                      <form onSubmit={editLeadForm.handleSubmit(saveLeadEdits)} className="space-y-4">
                        <FormField
                          control={editLeadForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} data-testid="input-edit-deal-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editLeadForm.control}
                          name="clientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client</FormLabel>
                              <Select
                                onValueChange={(val) => {
                                  const id = parseInt(val);
                                  field.onChange(id);
                                  setSelectedClientIdForBuildingEdit(id);
                                  setSelectedClientIdForContactEdit(id);
                                  editLeadForm.setValue("buildingId", null);
                                  editLeadForm.setValue("contactId", null);
                                }}
                                value={field.value?.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-edit-deal-client">
                                    <SelectValue placeholder="Select client" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {clients?.map((c) => (
                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Edit Value Type toggle + input */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Value</Label>
                          <div className="flex items-center bg-muted rounded-md p-0.5 border w-fit">
                            <button
                              type="button"
                              onClick={() => {
                                setEditValueType("fixed");
                                editLeadForm.setValue("valueType", "fixed");
                                editLeadForm.setValue("valueTier", null);
                                setEditValueTier(null);
                              }}
                              className={`px-3 py-1 text-sm rounded font-medium transition-colors ${editValueType === "fixed" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                              data-testid="button-edit-value-type-fixed"
                            >
                              Price
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditValueType("potential");
                                editLeadForm.setValue("valueType", "potential");
                                editLeadForm.setValue("value", "0");
                              }}
                              className={`px-3 py-1 text-sm rounded font-medium transition-colors ${editValueType === "potential" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                              data-testid="button-edit-value-type-potential"
                            >
                              Potential
                            </button>
                          </div>

                          {editValueType === "fixed" ? (
                            <FormField
                              control={editLeadForm.control}
                              name="value"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                      <Input type="number" step="0.01" className="pl-6" {...field} value={field.value || ""} data-testid="input-edit-deal-value" />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex gap-2">
                                {TIER_OPTIONS.map((tier) => (
                                  <button
                                    key={tier}
                                    type="button"
                                    onClick={() => {
                                      setEditValueTier(tier);
                                      editLeadForm.setValue("valueTier", tier as any);
                                    }}
                                    className={`flex-1 py-2 text-sm font-bold rounded-md border transition-colors ${editValueTier === tier ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
                                    data-testid={`button-edit-tier-${tier}`}
                                  >
                                    {tier}
                                  </button>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {editValueTier ? `≈ ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(tierMap[editValueTier] ?? 0)} estimated` : "Select a potential tier"}
                              </p>
                            </div>
                          )}
                        </div>
                        {selectedClientIdForContactEdit && contactsForEdit.length > 0 && (
                          <FormField
                            control={editLeadForm.control}
                            name="contactId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Contact (Optional)</FormLabel>
                                <Select
                                  onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                                  value={field.value != null ? String(field.value) : "none"}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-deal-contact">
                                      <SelectValue placeholder="No specific contact" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">No specific contact</SelectItem>
                                    {contactsForEdit.map((c) => (
                                      <SelectItem key={c.id} value={c.id.toString()}>
                                        <span className="flex items-center gap-2">
                                          <User2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                          {c.name}{c.title ? ` · ${c.title}` : ""}
                                        </span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <div className="space-y-2">
                          <Label>Services (Optional)</Label>
                          <div className="flex flex-wrap gap-2">
                            {SERVICE_TYPE_OPTIONS.map((opt) => {
                              const selected = editFormServiceTypes.includes(opt.value);
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => setEditFormServiceTypes(prev => selected ? prev.filter(s => s !== opt.value) : [...prev, opt.value])}
                                  className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${selected ? opt.color + " border-transparent" : "bg-muted/30 text-muted-foreground border-border/50 hover:border-border"}`}
                                  data-testid={`toggle-edit-service-${opt.value}`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {selectedClientIdForBuildingEdit && buildingsForEdit.length > 0 && (
                          <FormField
                            control={editLeadForm.control}
                            name="buildingId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Building (Optional)</FormLabel>
                                <Select
                                  onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                                  value={field.value != null ? String(field.value) : "none"}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-deal-building">
                                      <SelectValue placeholder="No specific building" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">No specific building</SelectItem>
                                    {buildingsForEdit.map((b) => (
                                      <SelectItem key={b.id} value={b.id.toString()}>
                                        {b.name}{b.address ? ` · ${b.address}` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField
                          control={editLeadForm.control}
                          name="assignedTo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assigned To</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-edit-lead-assignee">
                                    <SelectValue placeholder="Select team member" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users?.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.firstName} {u.lastName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Confidence Status</Label>
                          <div className="flex items-center bg-muted rounded-md p-0.5 border w-fit">
                            <button
                              type="button"
                              onClick={() => setEditConfidenceStatus("undecided")}
                              className={`px-3 py-1 text-sm rounded font-medium transition-colors ${editConfidenceStatus === "undecided" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                              data-testid="button-edit-confidence-undecided"
                            >
                              Undecided
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditConfidenceStatus("needs_work")}
                              className={`px-3 py-1 text-sm rounded font-medium transition-colors ${editConfidenceStatus === "needs_work" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                              data-testid="button-edit-confidence-needs-work"
                            >
                              Needs Work
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditConfidenceStatus(null)}
                              className={`px-3 py-1 text-sm rounded font-medium transition-colors ${editConfidenceStatus === null ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                              data-testid="button-edit-confidence-set-score"
                            >
                              Set Score
                            </button>
                          </div>
                        </div>

                        {!editConfidenceStatus && (
                          <FormField
                            control={editLeadForm.control}
                            name="confidenceScore"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center justify-between">
                                  <FormLabel>Confidence Score</FormLabel>
                                  <span className={`text-sm font-bold ${getConfidenceColor(field.value ?? 50)}`}>
                                    {field.value ?? 50}%
                                  </span>
                                </div>
                                <FormControl>
                                  <Slider
                                    min={0} max={100} step={5}
                                    value={[field.value ?? 50]}
                                    onValueChange={([v]) => field.onChange(v)}
                                    data-testid="slider-edit-confidence"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField
                          control={editLeadForm.control}
                          name="tier"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lead Tier</FormLabel>
                              <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-edit-lead-tier">
                                    <SelectValue placeholder="No Tier" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">No Tier</SelectItem>
                                  <SelectItem value="tier_1">Tier 1 — High Value</SelectItem>
                                  <SelectItem value="tier_2">Tier 2 — Medium Value</SelectItem>
                                  <SelectItem value="tier_3">Tier 3 — Lower Value</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Tags</Label>
                            <Link to="/settings" className="text-xs text-primary hover:underline">Manage tags →</Link>
                          </div>
                          <div className="flex gap-2">
                          <div className="relative">
                            <Input
                              placeholder="Add a tag and press Enter"
                              value={editTagInput}
                              onChange={(e) => setEditTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === ",") {
                                  e.preventDefault();
                                  addEditTag(editTagInput);
                                }
                              }}
                              list="edit-deal-tags-list"
                              data-testid="input-edit-lead-tag"
                            />
                            <datalist id="edit-deal-tags-list">
                              {dealTags.map(t => <option key={t.id} value={t.name} />)}
                            </datalist>
                          </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => addEditTag(editTagInput)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {editFormTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {editFormTags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1">
                                  {tag}
                                  <button type="button" onClick={() => removeEditTag(tag)} className="rounded-sm hover:bg-muted p-0.5">
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <FormField
                          control={editLeadForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Internal Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  className="resize-none min-h-[100px]"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="textarea-edit-deal-notes"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-4 rounded-lg border p-3 bg-muted/30">
                          <FormField
                            control={editLeadForm.control}
                            name="contractType"
                            render={({ field }) => (
                              <FormItem className="space-y-3">
                                <FormLabel>Contract Type</FormLabel>
                                <FormControl>
                                  <div className="flex items-center bg-muted rounded-md p-0.5 border w-fit">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        field.onChange("one_time");
                                        editLeadForm.setValue("recurringFrequency", null);
                                        editLeadForm.setValue("contractStartDate", null);
                                        editLeadForm.setValue("renewalDate", null);
                                      }}
                                      className={`px-3 py-1 text-sm rounded font-medium transition-colors ${field.value === "one_time" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                                      data-testid="button-edit-contract-one-time"
                                    >
                                      One-Time
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => field.onChange("recurring")}
                                      className={`px-3 py-1 text-sm rounded font-medium transition-colors ${field.value === "recurring" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                                      data-testid="button-edit-contract-recurring"
                                    >
                                      Recurring
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {editLeadForm.watch("contractType") === "recurring" && (
                            <div className="grid gap-4 pt-2">
                              <FormField
                                control={editLeadForm.control}
                                name="recurringFrequency"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Frequency</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ""}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-edit-lead-frequency">
                                          <SelectValue placeholder="Select frequency" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="annual">Annual</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={editLeadForm.control}
                                  name="contractStartDate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Start Date</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="date"
                                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                          data-testid="input-edit-lead-start-date"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={editLeadForm.control}
                                  name="renewalDate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Renewal Date</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="date"
                                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                          data-testid="input-edit-lead-renewal-date"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Client</p>
                          <p className="font-medium text-sm">{getClientName(selectedLead.clientId)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Value</p>
                          {isLeadPotential(selectedLead) ? (
                            <div className="flex items-center gap-2">
                              <span className="font-black text-xl text-primary tracking-tight">{selectedLead.valueTier}</span>
                              <span className="text-xs text-muted-foreground">≈ {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(tierMap[selectedLead.valueTier!] ?? 0)}</span>
                            </div>
                          ) : (
                            <p className="font-mono text-sm font-bold text-primary">{formatCurrency(selectedLead.value)}</p>
                          )}
                        </div>
                        {selectedLead.contactId && getContactName(selectedLead.contactId) && (
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                              <User2 className="h-3 w-3" /> Contact
                            </p>
                            <p className="font-medium text-sm">{getContactName(selectedLead.contactId)}</p>
                          </div>
                        )}
                        {(() => {
                          const types: string[] = ((selectedLead as any).serviceTypes?.length > 0
                            ? (selectedLead as any).serviceTypes
                            : selectedLead.serviceType ? [selectedLead.serviceType] : []) as string[];
                          return types.length > 0 ? (
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Briefcase className="h-3 w-3" /> Services
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {types.map(st => (
                                  <Badge key={st} variant="outline" className={`text-xs font-medium border w-fit ${getServiceTypeColor(st)}`}>
                                    {getServiceTypeLabel(st)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : null;
                        })()}
                        {selectedLead.buildingId && getBuildingName(selectedLead.buildingId) && (
                          <div className="space-y-1 col-span-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> Building
                            </p>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              {getBuildingName(selectedLead.buildingId)}
                            </p>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned To</p>
                          <p className="font-medium text-sm">{getUserName(selectedLead.assignedTo)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Created</p>
                          <p className="font-medium text-sm">{new Date(selectedLead.createdAt).toLocaleDateString()}</p>
                        </div>
                        {(selectedLead as any).buildopsQuoteId && (
                          <div className="space-y-1 col-span-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                              <Zap className="h-3 w-3" /> BuildOps Quote
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs capitalize" data-testid="badge-quote-status">
                                {(selectedLead as any).buildopsQuoteNumber ? `#${(selectedLead as any).buildopsQuoteNumber}` : "Quote"}
                                {(selectedLead as any).buildopsQuoteStatus && <span className="ml-1">· {(selectedLead as any).buildopsQuoteStatus}</span>}
                              </Badge>
                              {(selectedLead as any).buildopsQuoteTotal && (
                                <span className="text-xs font-mono font-bold text-primary" data-testid="text-quote-total">
                                  {formatCurrency((selectedLead as any).buildopsQuoteTotal)}
                                </span>
                              )}
                              {(selectedLead as any).buildopsExpirationDate && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-quote-expiration">
                                  <CalendarIcon className="h-3 w-3" /> Quote Expires {new Date((selectedLead as any).buildopsExpirationDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Target className="h-3 w-3" /> Confidence Score
                          </p>
                          <span className={`text-sm font-bold ${getConfidenceColor(localScore)}`}>{localScore}%</span>
                        </div>
                        <Slider
                          min={0} max={100} step={5}
                          value={[localScore]}
                          onValueChange={([val]) => setLocalScore(val)}
                          onValueCommit={([val]) => {
                            patchConfidenceMutation.mutate({ id: selectedLead.id, score: val });
                          }}
                          data-testid="slider-confidence-detail"
                        />
                      </div>

                      {selectedLead.tags && selectedLead.tags.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <TagIcon className="h-3 w-3" /> Tags
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedLead.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Change Stage</p>
                        <div className="grid grid-cols-2 gap-2">
                          {stages.map((stage) => {
                            const sc = getStageColors(stage.color);
                            const isActive = selectedLead.stage === stage.slug;
                            return (
                              <Button
                                key={stage.id}
                                variant={isActive ? "secondary" : "outline"}
                                size="sm"
                                className="justify-start font-medium"
                                onClick={() => {
                                  const currentStageObj = stages.find(s => s.slug === selectedLead.stage);
                                  if (currentStageObj?.track === "relationship" && stage.track === "deal") {
                                    const client = clients?.find(c => c.id === selectedLead.clientId);
                                    setPendingDealMove({ leadId: selectedLead.id, stage: stage.slug, clientName: client?.name ?? "this client" });
                                    return;
                                  }
                                  updateLeadStageMutation.mutate({ id: selectedLead.id, stage: stage.slug });
                                }}
                              >
                                <div className={`h-2 w-2 rounded-full mr-2 ${isActive ? sc.dot : 'bg-muted-foreground/30'}`} />
                                {stage.label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Internal Notes</p>
                          {!isEditingInternalNotes && (
                            <button
                              type="button"
                              onClick={() => {
                                setInternalNotesDraft(selectedLead.notes ?? "");
                                setIsEditingInternalNotes(true);
                              }}
                              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                              title="Edit notes"
                              data-testid="button-edit-internal-notes"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        {isEditingInternalNotes ? (
                          <div className="space-y-2">
                            <Textarea
                              value={internalNotesDraft}
                              onChange={(e) => setInternalNotesDraft(e.target.value)}
                              rows={4}
                              className="resize-none text-sm"
                              autoFocus
                              data-testid="textarea-internal-notes"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveInternalNotesMutation.mutate({ id: selectedLead.id, notes: internalNotesDraft })}
                                disabled={saveInternalNotesMutation.isPending}
                                data-testid="button-save-internal-notes"
                              >
                                {saveInternalNotesMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                                Save
                              </Button>
                              <button
                                type="button"
                                onClick={() => setIsEditingInternalNotes(false)}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                data-testid="button-cancel-internal-notes"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <Card className="bg-muted">
                            <CardContent className="p-3 text-sm leading-relaxed whitespace-pre-wrap">
                              {selectedLead.notes || <span className="text-muted-foreground italic">No notes yet — click the pencil to add one</span>}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="py-4 space-y-4">
                  {selectedLead && <LeadActivityTab leadId={selectedLead.id} />}
                  {selectedLead && <LeadLinkedEmails leadId={selectedLead.id} />}
                </TabsContent>

                <TabsContent value="attachments" className="py-4">
                  {selectedLead && <AttachmentsPanel entityType="lead" entityId={selectedLead.id} />}
                </TabsContent>

                <TabsContent value="tasks" className="py-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {detailLeadTasks.length} Task{detailLeadTasks.length !== 1 ? "s" : ""}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddTaskOpen((v) => !v);
                        addTaskForm.reset({
                          title: "",
                          description: "",
                          priority: "medium",
                          status: "todo",
                          relatedLeadId: selectedLead.id,
                          relatedClientId: selectedLead.clientId ?? undefined,
                          assignedTo: undefined,
                          dueDate: undefined,
                        });
                      }}
                      data-testid="button-add-task-to-lead"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Task
                    </Button>
                  </div>

                  {isAddTaskOpen && (
                    <Card className="border-primary/30 bg-primary/3">
                      <CardContent className="p-4">
                        <Form {...addTaskForm}>
                          <form
                            onSubmit={addTaskForm.handleSubmit((data) => {
                              const dueDateRaw = data.dueDate as unknown as string;
                              createTaskMutation.mutate({
                                ...data,
                                relatedLeadId: selectedLead.id,
                                dueDate: dueDateRaw ? new Date(dueDateRaw) : undefined,
                              });
                            })}
                            className="space-y-3"
                          >
                            <FormField
                              control={addTaskForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Task Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. Follow up with client" {...field} value={field.value || ""} data-testid="input-new-task-title" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={addTaskForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                                  <FormControl>
                                    <Textarea className="resize-none min-h-[60px]" {...field} value={field.value || ""} data-testid="textarea-new-task-desc" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={addTaskForm.control}
                                name="priority"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Priority</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-new-task-priority">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={addTaskForm.control}
                                name="dueDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Due Date</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        value={field.value ? String(field.value).slice(0, 10) : ""}
                                        data-testid="input-new-task-due"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={addTaskForm.control}
                              name="assignedTo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Assign To <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-new-task-assignee">
                                        <SelectValue placeholder="Select team member" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {users?.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                          {u.firstName} {u.lastName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <div className="flex gap-2 pt-1">
                              <Button
                                type="submit"
                                size="sm"
                                disabled={createTaskMutation.isPending}
                                className="flex-1"
                                data-testid="button-save-new-task"
                              >
                                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsAddTaskOpen(false)}
                                data-testid="button-cancel-new-task"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI Suggested Task Banner */}
                  {suggestedTaskLoading && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 animate-pulse">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <div className="h-3.5 w-40 bg-primary/20 rounded" />
                      </div>
                      <div className="h-3 w-full bg-muted rounded" />
                      <div className="h-3 w-2/3 bg-muted rounded" />
                    </div>
                  )}
                  {suggestedTask && !suggestedTaskLoading && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2" data-testid="card-ai-suggested-task">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">AI Suggested Next Step</span>
                      </div>
                      <p className="text-sm font-medium">{suggestedTask.title}</p>
                      {suggestedTask.description && (
                        <p className="text-xs text-muted-foreground">{suggestedTask.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 capitalize ${priorityColors[suggestedTask.priority as keyof typeof priorityColors] ?? ""}`}>
                          {suggestedTask.priority}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Due in {suggestedTask.dueInDays} day{suggestedTask.dueInDays !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <Button
                          size="sm"
                          className="h-7 text-xs px-3"
                          disabled={acceptSuggestedTaskMutation.isPending}
                          data-testid="button-accept-suggested-task"
                          onClick={() => {
                            if (!selectedLead) return;
                            const dueDate = new Date();
                            dueDate.setDate(dueDate.getDate() + suggestedTask.dueInDays);
                            acceptSuggestedTaskMutation.mutate({
                              title: suggestedTask.title,
                              description: suggestedTask.description,
                              priority: suggestedTask.priority as "low" | "medium" | "high",
                              status: "todo",
                              dueDate: dueDate.toISOString().split("T")[0],
                              relatedLeadId: selectedLead.id,
                              relatedClientId: selectedLead.clientId ?? null,
                              assignedTo: null,
                            } as InsertTask);
                          }}
                        >
                          {acceptSuggestedTaskMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                          Add Task
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-3"
                          data-testid="button-dismiss-suggested-task"
                          onClick={() => setSuggestedTask(null)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  )}

                  {detailLeadTasks.length === 0 && !isAddTaskOpen ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No tasks linked to this deal yet.</p>
                      <p className="text-xs mt-1">Use the "Add Task" button above to create one.</p>
                    </div>
                  ) : (
                    detailLeadTasks.map((task) => {
                      const isDone = task.status === "done";
                      const isPending = pendingTaskId === task.id;
                      return (
                        <Card key={task.id} className={`border-l-4 ${
                          isDone ? "border-l-green-400 opacity-70" :
                          task.priority === "high" ? "border-l-red-400" :
                          task.priority === "medium" ? "border-l-yellow-400" : "border-l-blue-400"
                        }`} data-testid={`card-lead-task-${task.id}`}>
                          <CardContent className="p-3 flex items-start gap-3">
                            <button
                              className={`h-4 w-4 mt-0.5 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                                isDone ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/40 hover:border-green-500"
                              }`}
                              onClick={() => completeTaskMutation.mutate({
                                id: task.id,
                                status: isDone ? "todo" : "done",
                                title: task.title,
                                completing: !isDone,
                              })}
                              disabled={isPending}
                              data-testid={`button-toggle-task-${task.id}`}
                              title={isDone ? "Mark as todo" : "Mark as done"}
                            >
                              {isPending ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : isDone ? (
                                <Check className="h-2.5 w-2.5" />
                              ) : null}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 capitalize ${priorityColors[task.priority]}`}>
                                  {task.priority}
                                </Badge>
                                {task.dueDate && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <CalendarIcon className="h-2.5 w-2.5" />
                                    {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                                {task.assignedTo && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {getUserName(task.assignedTo)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                <TabsContent value="activity" className="py-4 h-[500px]">
                  <ActivityTimeline entityType="lead" entityId={selectedLead.id} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Pipeline Review Dialog */}
      <Dialog open={isPipelineReviewOpen} onOpenChange={(open) => { setIsPipelineReviewOpen(open); if (!open) setReviewRunning(false); }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">Pipeline Review</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={runPipelineReview}
                disabled={reviewRunning}
                data-testid="button-run-review"
              >
                {reviewRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                {reviewRunning ? "Analyzing…" : "Refresh"}
              </Button>
            </div>
            {reviewRunning && (() => {
              const activeDeals = (leads ?? []).filter(l => l.stage !== "won" && l.stage !== "lost");
              const done = activeDeals.filter(l => aiSummaries[l.id] || (loadingAiSummary[l.id] === false)).length;
              const pct = activeDeals.length > 0 ? Math.round((done / activeDeals.length) * 100) : 0;
              return (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Analyzing deals…</span>
                    <span>{done} / {activeDeals.length}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })()}
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-4 space-y-3">
              {(() => {
                const activeDeals = (leads ?? []).filter(l => l.stage !== "won" && l.stage !== "lost");

                if (activeDeals.length === 0) {
                  return (
                    <div className="text-center py-12 text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No active deals in the pipeline</p>
                    </div>
                  );
                }

                const healthOrder = { "At Risk": 0, "Stalled": 1, "On Track": 2, "Strong": 3, "Unknown": 4 };

                const dealsWithHealth = activeDeals.map(lead => {
                  const summary = activitySummary?.find(s => s.leadId === lead.id);
                  const daysActivity = summary?.lastActivityAt ? differenceInDays(new Date(), new Date(summary.lastActivityAt)) : null;
                  const sc = lead.confidenceScore ?? 50;
                  const computedHealth: string =
                    (daysActivity !== null && daysActivity > 30) || sc < 25 ? "At Risk" :
                    (daysActivity !== null && daysActivity > 14) || sc < 40 ? "Stalled" :
                    sc >= 70 && (daysActivity === null || daysActivity <= 7) ? "Strong" :
                    "On Track";
                  const aiData = aiSummaries[lead.id];
                  const healthLabel = aiData?.healthLabel ?? computedHealth;
                  return { lead, healthLabel, aiData, daysActivity, computedHealth };
                });

                const sorted = [...dealsWithHealth].sort((a, b) =>
                  (healthOrder[a.healthLabel as keyof typeof healthOrder] ?? 4) -
                  (healthOrder[b.healthLabel as keyof typeof healthOrder] ?? 4)
                );

                const colorMap: Record<string, { badge: string; dot: string; row: string }> = {
                  "Strong":   { badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",   dot: "bg-green-500",   row: "border-l-green-500" },
                  "On Track": { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",    dot: "bg-blue-500",    row: "border-l-blue-400" },
                  "Stalled":  { badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400", dot: "bg-yellow-500",  row: "border-l-yellow-500" },
                  "At Risk":  { badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",       dot: "bg-red-500",     row: "border-l-red-500" },
                };

                const stageDefaults: Record<string, string> = {
                  met_introduced: "Schedule a discovery call to understand their facility needs.",
                  new_lead:       "Reach out to introduce M5 and learn about their current service gaps.",
                  in_conversation: "Follow up on initial interest and qualify their budget and timeline.",
                  qualified:      "Confirm scope, decision-makers, and when they expect to move forward.",
                  proposal_sent:  "Check if they've reviewed the proposal and address any open questions.",
                };

                return sorted.map(({ lead, healthLabel, aiData, daysActivity }) => {
                  const colors = colorMap[healthLabel] ?? colorMap["On Track"];
                  const isLoading = loadingAiSummary[lead.id];
                  const clientName = getClientName(lead.clientId);
                  const value = formatLeadValue(lead);
                  const stageLabel = lead.stage.replace(/_/g, " ");

                  const verdictMap: Record<string, { label: string; cls: string }> = {
                    "Strong":   { label: "✓ Keep moving",      cls: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700" },
                    "On Track": { label: "✓ No issues",         cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-700" },
                    "Stalled":  { label: "→ Quick check-in",    cls: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700" },
                    "At Risk":  { label: "→ Needs discussion",  cls: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-700" },
                  };
                  const verdict = verdictMap[healthLabel] ?? verdictMap["On Track"];

                  return (
                    <div
                      key={lead.id}
                      className={`border-l-4 ${colors.row} bg-card rounded-r-lg border border-l-4 border-border/60 p-4 space-y-3 cursor-pointer hover:shadow-sm transition-shadow`}
                      onClick={() => { setIsPipelineReviewOpen(false); openLeadDetail(lead); }}
                      data-testid={`review-row-${lead.id}`}
                    >
                      {/* Row header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm leading-tight">{lead.title}</h3>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                              {healthLabel}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                            {clientName} · <span className="capitalize">{stageLabel}</span> · {value}
                            {daysActivity !== null && (
                              <span className="ml-1 opacity-70">· last touch {daysActivity === 0 ? "today" : daysActivity === 1 ? "yesterday" : `${daysActivity}d ago`}</span>
                            )}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${verdict.cls}`}>
                          {verdict.label}
                        </span>
                      </div>

                      {/* Key Signal + Action Item */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Key Signal
                          </p>
                          {isLoading ? (
                            <div className="space-y-1">
                              <div className="h-2 bg-muted animate-pulse rounded w-full" />
                              <div className="h-2 bg-muted animate-pulse rounded w-3/4" />
                            </div>
                          ) : (
                            <p className="text-xs text-foreground leading-relaxed">
                              {aiData?.observation || (daysActivity !== null && daysActivity > 14
                                ? `No activity in ${daysActivity} days — deal may be stalling.`
                                : `Deal is in ${stageLabel} stage with ${lead.confidenceScore ?? 50}% confidence.`)}
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                            <ArrowRight className="h-2.5 w-2.5" />
                            Action Item
                          </p>
                          {isLoading ? (
                            <div className="space-y-1">
                              <div className="h-2 bg-muted animate-pulse rounded w-full" />
                              <div className="h-2 bg-muted animate-pulse rounded w-2/3" />
                            </div>
                          ) : (
                            <p className="text-xs text-foreground leading-relaxed">
                              {aiData?.nextStep || stageDefaults[lead.stage] || "Review deal status and identify next steps."}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <p className="text-[11px] text-muted-foreground flex-1">
              {(leads ?? []).filter(l => l.stage !== "won" && l.stage !== "lost").length} active deal{(leads ?? []).filter(l => l.stage !== "won" && l.stage !== "lost").length !== 1 ? "s" : ""} · click any row to open deal
            </p>
            <Button variant="outline" onClick={() => setIsPipelineReviewOpen(false)} data-testid="button-close-review">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Pipeline Stages Dialog */}
      <Dialog open={isManageStagesOpen} onOpenChange={setIsManageStagesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
              Manage Pipeline Stages
            </DialogTitle>
          </DialogHeader>

          <PipelineStagesManager />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageStagesOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pipeline Views Dialog */}
      <Dialog open={isManageViewsOpen} onOpenChange={(open) => {
        setIsManageViewsOpen(open);
        if (!open) {
          setNewViewStages([]);
          setNewViewServiceTypes([]);
          setNewViewTiers([]);
          setNewViewTags([]);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              {editingView ? "Edit View" : "Create Pipeline View"}
            </DialogTitle>
            <DialogDescription>
              Save a named filter preset to quickly switch between different lead perspectives.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">View Name</Label>
              <Input
                placeholder="E.g. Relationship Pipeline, Contract Pipeline..."
                value={editingView ? editingView.name : newViewName}
                onChange={(e) => editingView
                  ? setEditingView({ ...editingView, name: e.target.value })
                  : setNewViewName(e.target.value)
                }
                data-testid="input-view-name"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Filter by Stage</Label>
              <div className="flex flex-wrap gap-2">
                {stages.map((stage) => {
                  const arr = editingView
                    ? ((editingView.filters as any)?.stages ?? []) as string[]
                    : newViewStages;
                  const selected = arr.includes(stage.slug);
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => {
                        if (editingView) {
                          const curr = ((editingView.filters as any)?.stages ?? []) as string[];
                          const next = selected ? curr.filter(s => s !== stage.slug) : [...curr, stage.slug];
                          setEditingView({ ...editingView, filters: { ...(editingView.filters as any), stages: next } });
                        } else {
                          setNewViewStages(selected ? newViewStages.filter(s => s !== stage.slug) : [...newViewStages, stage.slug]);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors font-medium ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
                      data-testid={`button-view-stage-${stage.slug}`}
                    >
                      {stage.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Leave blank to include all stages.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Filter by Service Type</Label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_TYPE_OPTIONS.map((opt) => {
                  const arr = editingView
                    ? ((editingView.filters as any)?.serviceTypes ?? []) as string[]
                    : newViewServiceTypes;
                  const selected = arr.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (editingView) {
                          const curr = ((editingView.filters as any)?.serviceTypes ?? []) as string[];
                          const next = selected ? curr.filter(s => s !== opt.value) : [...curr, opt.value];
                          setEditingView({ ...editingView, filters: { ...(editingView.filters as any), serviceTypes: next } });
                        } else {
                          setNewViewServiceTypes(selected ? newViewServiceTypes.filter(s => s !== opt.value) : [...newViewServiceTypes, opt.value]);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors font-medium ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
                      data-testid={`button-view-service-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Leave blank to include all service types.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Filter by Tier</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "tier_1", label: "Tier 1" },
                  { value: "tier_2", label: "Tier 2" },
                  { value: "tier_3", label: "Tier 3" },
                ].map((opt) => {
                  const arr = editingView
                    ? ((editingView.filters as any)?.tiers ?? []) as string[]
                    : newViewTiers;
                  const selected = arr.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        if (editingView) {
                          const curr = ((editingView.filters as any)?.tiers ?? []) as string[];
                          const next = selected ? curr.filter(s => s !== opt.value) : [...curr, opt.value];
                          setEditingView({ ...editingView, filters: { ...(editingView.filters as any), tiers: next } });
                        } else {
                          setNewViewTiers(selected ? newViewTiers.filter(s => s !== opt.value) : [...newViewTiers, opt.value]);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors font-medium ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
                      data-testid={`button-view-tier-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Leave blank to include all tiers.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Filter by Tag</Label>
              <div className="flex flex-wrap gap-2">
                {dealTags.map((tag) => {
                  const arr = editingView
                    ? ((editingView.filters as any)?.tags ?? []) as string[]
                    : newViewTags;
                  const selected = arr.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        if (editingView) {
                          const curr = ((editingView.filters as any)?.tags ?? []) as string[];
                          const next = selected ? curr.filter(s => s !== tag.name) : [...curr, tag.name];
                          setEditingView({ ...editingView, filters: { ...(editingView.filters as any), tags: next } });
                        } else {
                          setNewViewTags(selected ? newViewTags.filter(s => s !== tag.name) : [...newViewTags, tag.name]);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors font-medium ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
                      data-testid={`button-view-tag-${tag.name}`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Leave blank to include all tags.</p>
            </div>

            {/* Existing views list */}
            {!editingView && pipelineViews.length > 0 && (
              <div className="space-y-1.5 border-t pt-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Saved Views</Label>
                <div className="space-y-1.5">
                  {pipelineViews.map((v) => {
                    const filters = v.filters as { stages?: string[]; serviceTypes?: string[]; tiers?: string[]; tags?: string[] };
                    return (
                      <div key={v.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{v.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {[
                              filters.stages?.length ? `${filters.stages.length} stage(s)` : null,
                              filters.serviceTypes?.length ? `${filters.serviceTypes.length} service(s)` : null,
                              filters.tiers?.length ? `${filters.tiers.length} tier(s)` : null,
                              filters.tags?.length ? `${filters.tags.length} tag(s)` : null,
                            ].filter(Boolean).join(" · ") || "No filters"}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            setEditingView(v);
                          }}
                          data-testid={`button-edit-view-${v.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteViewMutation.mutate(v.id)}
                          data-testid={`button-delete-view-${v.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {editingView ? (
              <>
                <Button variant="outline" onClick={() => setEditingView(null)}>
                  Back
                </Button>
                <Button
                  onClick={() => updateViewMutation.mutate({ id: editingView.id, data: { name: editingView.name, filters: editingView.filters } })}
                  disabled={updateViewMutation.isPending || !editingView.name.trim()}
                  data-testid="button-save-view"
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsManageViewsOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createViewMutation.mutate({
                    name: newViewName.trim(),
                    filters: { 
                      stages: newViewStages, 
                      serviceTypes: newViewServiceTypes,
                      tiers: newViewTiers,
                      tags: newViewTags,
                    },
                  })}
                  disabled={createViewMutation.isPending || !newViewName.trim()}
                  data-testid="button-create-view"
                >
                  <BookmarkPlus className="h-4 w-4 mr-1.5" />
                  Save View
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteStageId !== null} onOpenChange={(open) => { if (!open) setDeleteStageId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage "{deleteStageLabel}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Leads in this stage will remain but won't appear on the board until reassigned to another stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteStageId !== null) { deleteStageMutation.mutate(deleteStageId); setDeleteStageId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingDealMove !== null} onOpenChange={(open) => { if (!open) setPendingDealMove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="title-deal-move-confirm" className="flex items-center gap-2">
              <BuildOpsIcon className="h-5 w-5 shrink-0" />
              Move to Deal Track?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3" data-testid="description-deal-move-confirm">
              <span className="block">
                You're about to move this lead into the <strong>Deal</strong> track for <strong>{pendingDealMove?.clientName}</strong>.
              </span>
              <span className="block">
                This will auto-advance the lead to <strong>Proposal Sent</strong> and may create a new customer in BuildOps if one doesn't already exist when an estimate is created.
              </span>
              <span className="block text-amber-600 dark:text-amber-400 font-medium">
                BuildOps customers are difficult to delete — please make sure this is the right company and not a duplicate before proceeding.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-deal-move">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-deal-move"
              disabled={updateLeadStageMutation.isPending}
              onClick={() => {
                if (pendingDealMove) {
                  updateLeadStageMutation.mutate({ id: pendingDealMove.leadId, stage: pendingDealMove.stage });
                  setPendingDealMove(null);
                }
              }}
            >
              {updateLeadStageMutation.isPending ? "Moving…" : "Yes, Move to Deal Track"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
