import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Mic,
  Square,
  ChevronLeft,
  CheckSquare,
  Target,
  Users,
  UserPlus,
  FileText,
  Check,
  X,
  Loader2,
  Sparkles,
  ClipboardList,
  Upload,
  Keyboard,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  ExternalLink,
  Pencil,
  AlertTriangle,
  Link2,
  MessageSquare,
  Gavel,
  ArrowRight,
  ListChecks,
  ScrollText,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import type { ClientContact } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Paperclip } from "lucide-react";

type MeetingAction = {
  id: number;
  meetingId: number;
  type: string;
  description: string;
  payload: Record<string, any>;
  status: string;
  appliedAt: string | null;
};

type MinutesData = {
  discussionPoints: string[];
  decisions: string[];
  nextSteps: string[];
};

type Meeting = {
  id: number;
  title: string;
  meetingType: string;
  date: string;
  status: string;
  rawTranscript: string | null;
  summary: string | null;
  minutesData: MinutesData | null;
  calendarEventId: string | null;
  calendarEventLink: string | null;
  leadId: number | null;
  clientId: number | null;
  attendeeContactIds: number[];
  attendeeUserIds: string[];
  actions: MeetingAction[];
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create_task: <CheckSquare className="h-4 w-4" />,
  update_lead: <Target className="h-4 w-4" />,
  update_client: <Users className="h-4 w-4" />,
  create_contact: <UserPlus className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  create_task: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  update_lead: "bg-primary/10 text-primary",
  update_client: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  create_contact: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  note: "bg-muted text-muted-foreground",
};

const ACTION_LABELS: Record<string, string> = {
  create_task: "Create Task",
  update_lead: "Update Lead",
  update_client: "Update Client",
  create_contact: "Add Contact",
  note: "Note",
};

function ActionCard({
  action,
  onApprove,
  onDecline,
  isApproving,
  isDeclining,
}: {
  action: MeetingAction;
  onApprove: () => void;
  onDecline: () => void;
  isApproving: boolean;
  isDeclining: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = action.status === "pending";
  const isApproved = action.status === "approved";
  const isDeclined = action.status === "declined";

  return (
    <div
      className={cn(
        "border rounded-xl p-4 transition-all",
        isApproved && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-900/10 opacity-80",
        isDeclined && "border-border/30 bg-muted/30 opacity-50",
        isPending && "border-border/60 bg-white dark:bg-card"
      )}
      data-testid={`card-action-${action.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", ACTION_COLORS[action.type] ?? "bg-muted text-muted-foreground")}>
          {ACTION_ICONS[action.type] ?? <FileText className="h-4 w-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {ACTION_LABELS[action.type] ?? action.type}
            </span>
            {isApproved && (
              <Badge variant="outline" className="text-[10px] border-green-300 text-green-700 dark:text-green-400 flex items-center gap-1">
                <Check className="h-2.5 w-2.5" /> Applied
              </Badge>
            )}
            {isDeclined && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground flex items-center gap-1">
                <X className="h-2.5 w-2.5" /> Declined
              </Badge>
            )}
          </div>
          <p className={cn("text-sm font-medium leading-snug", isDeclined && "line-through text-muted-foreground")}>
            {action.description}
          </p>

          {/* Expandable payload */}
          <button
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-2 transition-colors"
            onClick={() => setExpanded(!expanded)}
            data-testid={`button-expand-action-${action.id}`}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide details" : "Show details"}
          </button>

          {expanded && (
            <div className="mt-2 rounded-lg bg-muted/60 border border-border/40 p-3 text-xs font-mono space-y-1">
              {Object.entries(action.payload).filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-muted-foreground min-w-[100px] shrink-0">{k}:</span>
                  <span className="text-foreground break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approve/Decline buttons */}
        {isPending && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              className="h-8 bg-green-600 hover:bg-green-700 text-white px-3"
              onClick={onApprove}
              disabled={isApproving || isDeclining}
              data-testid={`button-approve-action-${action.id}`}
            >
              {isApproving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-destructive/50 text-destructive hover:bg-destructive/10 px-3"
              onClick={onDecline}
              disabled={isApproving || isDeclining}
              data-testid={`button-decline-action-${action.id}`}
            >
              {isDeclining ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineDealSection({
  dealName,
  dealSummary,
  matchedLeadId,
  actions,
  onApprove,
  onDecline,
  actioningIds,
}: {
  dealName: string;
  dealSummary: string;
  matchedLeadId: number | null;
  actions: MeetingAction[];
  onApprove: (id: number) => void;
  onDecline: (id: number) => void;
  actioningIds: Record<number, "approve" | "decline">;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pendingCount = actions.filter(a => a.status === "pending").length;

  return (
    <div className="border border-border/60 rounded-xl overflow-hidden bg-white dark:bg-card" data-testid={`section-deal-${dealName.replace(/\s+/g, "-").toLowerCase()}`}>
      {/* Deal header */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setCollapsed(c => !c)}
        data-testid={`button-toggle-deal-${dealName.replace(/\s+/g, "-").toLowerCase()}`}
      >
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Target className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{dealName}</span>
            {matchedLeadId ? (
              <a
                href={`/leads/${matchedLeadId}`}
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 hover:bg-primary/20 transition-colors"
                data-testid={`link-lead-${matchedLeadId}`}
              >
                <Link2 className="h-2.5 w-2.5" />
                View in CRM
              </a>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                <AlertTriangle className="h-2.5 w-2.5" />
                No CRM match
              </span>
            )}
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground">
                {pendingCount}
              </Badge>
            )}
          </div>
          {dealSummary && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{dealSummary}</p>
          )}
        </div>
        <div className="shrink-0 text-muted-foreground">
          {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </button>

      {/* Deal content */}
      {!collapsed && (
        <div className="border-t border-border/40 p-3 space-y-2.5">
          {dealSummary && (
            <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs text-muted-foreground leading-relaxed">
              {dealSummary}
            </div>
          )}
          {actions.map(action => (
            <ActionCard
              key={action.id}
              action={action}
              isApproving={actioningIds[action.id] === "approve"}
              isDeclining={actioningIds[action.id] === "decline"}
              onApprove={() => onApprove(action.id)}
              onDecline={() => onDecline(action.id)}
            />
          ))}
          {actions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No actions for this deal.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MeetingMinutesPanel({
  meeting,
  actions,
  actioningIds,
  isComplete,
  onApprove,
  onDecline,
}: {
  meeting: Meeting;
  actions: MeetingAction[];
  actioningIds: Record<number, "approve" | "decline">;
  isComplete: boolean;
  onApprove: (id: number) => void;
  onDecline: (id: number) => void;
}) {
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const minutes = meeting.minutesData;
  const pendingActions = actions.filter(a => a.status === "pending");

  return (
    <div className="flex-1 overflow-y-auto" data-testid="section-meeting-minutes">
      {/* Document header */}
      <div className="px-8 pt-7 pb-5 border-b border-border/60">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <ScrollText className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-heading font-bold text-base text-foreground">Meeting Minutes</h2>
          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider ml-1">
            {isComplete ? "Complete" : "Review"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-9">
          {format(new Date(meeting.date), "MMMM d, yyyy")}
          {meeting.title && ` · ${meeting.title}`}
        </p>
      </div>

      <div className="px-8 py-6 space-y-7 max-w-3xl">
        {/* Executive Summary */}
        {meeting.summary && (
          <section data-testid="section-minutes-summary">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-primary shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Executive Summary</h3>
            </div>
            <p className="text-sm leading-relaxed text-foreground pl-6">{meeting.summary}</p>
          </section>
        )}

        {/* Discussion Points */}
        {minutes && minutes.discussionPoints.length > 0 && (
          <section data-testid="section-minutes-discussion">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Discussion Points</h3>
            </div>
            <ol className="pl-6 space-y-2.5">
              {minutes.discussionPoints.map((point, i) => (
                <li key={i} className="flex gap-3" data-testid={`text-discussion-point-${i}`}>
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">{point}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Decisions Made */}
        {minutes && minutes.decisions.length > 0 && (
          <section data-testid="section-minutes-decisions">
            <div className="flex items-center gap-2 mb-3">
              <Gavel className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Decisions Made</h3>
            </div>
            <ul className="pl-6 space-y-2.5">
              {minutes.decisions.map((decision, i) => (
                <li key={i} className="flex gap-3" data-testid={`text-decision-${i}`}>
                  <Check className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed text-foreground">{decision}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Next Steps */}
        {minutes && minutes.nextSteps.length > 0 && (
          <section data-testid="section-minutes-nextsteps">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Next Steps</h3>
            </div>
            <ul className="pl-6 space-y-2.5">
              {minutes.nextSteps.map((step, i) => (
                <li key={i} className="flex gap-3" data-testid={`text-next-step-${i}`}>
                  <span className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-green-500 mt-2" />
                  <span className="text-sm leading-relaxed text-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Action Items */}
        {actions.length > 0 && (
          <section data-testid="section-minutes-actions">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-4 w-4 text-primary shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CRM Action Items</h3>
              {pendingActions.length > 0 && (
                <Badge className="text-[10px] h-4 px-1.5 bg-primary text-primary-foreground">
                  {pendingActions.length} pending
                </Badge>
              )}
            </div>
            <div className="pl-6 space-y-3">
              {actions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  isApproving={actioningIds[action.id] === "approve"}
                  isDeclining={actioningIds[action.id] === "decline"}
                  onApprove={() => onApprove(action.id)}
                  onDecline={() => onDecline(action.id)}
                />
              ))}
            </div>
          </section>
        )}

        {!minutes && !meeting.summary && actions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <ScrollText className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No minutes data available.</p>
            <p className="text-xs mt-1">This meeting was analyzed before structured minutes were introduced.</p>
          </div>
        )}

        {/* Collapsible Transcript */}
        {meeting.rawTranscript && (
          <section className="border-t border-border/60 pt-5" data-testid="section-minutes-transcript">
            <button
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setTranscriptExpanded(v => !v)}
              data-testid="button-toggle-transcript"
            >
              <ScrollText className="h-3.5 w-3.5" />
              View Transcript
              {transcriptExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
            </button>
            {transcriptExpanded && (
              <div className="mt-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-4 border border-border/40 text-muted-foreground">
                  {meeting.rawTranscript}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Bottom padding */}
        <div className="pb-6" />
      </div>
    </div>
  );
}

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const meetingId = parseInt(id);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();

  const [isRecording, setIsRecording] = useState(false);
  const [inputMode, setInputMode] = useState<"record" | "paste">("record");
  const [pasteText, setPasteText] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [actioningIds, setActioningIds] = useState<Record<number, "approve" | "decline">>({});

  const [wordCount, setWordCount] = useState(0);
  const speechRecognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");
  const isRecordingRef = useRef<boolean>(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false);
  const [isEditingAttendees, setIsEditingAttendees] = useState(false);

  const { data: allContacts = [] } = useQuery<ClientContact[]>({
    queryKey: ["/api/client-contacts"],
  });

  const { data: allUsers = [] } = useQuery<{ id: string; email: string; firstName: string | null; lastName: string | null }[]>({
    queryKey: ["/api/users"],
  });

  const { data: meeting, isLoading } = useQuery<Meeting>({
    queryKey: ["/api/meetings", meetingId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/meetings/${meetingId}`);
      if (!res.ok) throw new Error("Meeting not found");
      return res.json();
    },
    refetchInterval: (query) =>
      (query.state.data as Meeting | undefined)?.status === "processing" ? 3000 : false,
  });

  useEffect(() => {
    if (meeting?.rawTranscript) setLiveTranscript(meeting.rawTranscript);
  }, [meeting?.rawTranscript]);

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveTranscript]);

  const handleTranscriptScroll = () => {
    const el = transcriptScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUpRef.current = distanceFromBottom > 80;
  };

  const updateMutation = useMutation({
    mutationFn: async (data: { title?: string; status?: string; rawTranscript?: string; attendeeContactIds?: number[] }) => {
      const res = await apiRequest("PUT", `/api/meetings/${meetingId}`, data);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] }),
    onError: () => toast({ title: "Failed to save changes", variant: "destructive" }),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/analyze`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Analysis failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Analysis complete! Review the AI suggestions below." });
      setShowFollowUpPrompt(true);
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (actionId: number) => {
      const res = await apiRequest("PATCH", `/api/meeting-actions/${actionId}/approve`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to apply");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
    onSettled: (_, __, actionId) => {
      setActioningIds((prev) => { const n = { ...prev }; delete n[actionId]; return n; });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (actionId: number) => {
      const res = await apiRequest("PATCH", `/api/meeting-actions/${actionId}/decline`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] }),
    onError: () => toast({ title: "Failed to decline action", variant: "destructive" }),
    onSettled: (_, __, actionId) => {
      setActioningIds((prev) => { const n = { ...prev }; delete n[actionId]; return n; });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/meetings/${meetingId}`, { status: "complete" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      toast({ title: "Meeting marked as complete" });
    },
    onError: () => toast({ title: "Failed to complete meeting", variant: "destructive" }),
  });

  const syncCalendarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/meetings/${meetingId}/sync-calendar`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to sync to calendar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Synced to Google Calendar", description: "The meeting was added as a calendar event." });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const startRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Speech recognition requires Chrome or Edge browser.", variant: "destructive" });
      return;
    }

    finalTranscriptRef.current = liveTranscript ? liveTranscript.trimEnd() + " " : "";
    isRecordingRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    speechRecognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const combined = finalTranscriptRef.current + interim;
      setLiveTranscript(combined);
      setWordCount(combined.trim().split(/\s+/).filter(Boolean).length);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      toast({ title: `Mic error: ${event.error}. Try refreshing.`, variant: "destructive" });
    };

    recognition.onend = () => {
      if (speechRecognitionRef.current === recognition && isRecordingRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    try {
      recognition.start();
      setIsRecording(true);
      await apiRequest("PUT", `/api/meetings/${meetingId}`, { status: "recording" });
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] });
    } catch {
      isRecordingRef.current = false;
      speechRecognitionRef.current = null;
      toast({ title: "Microphone access denied. Please allow microphone permissions.", variant: "destructive" });
    }
  };

  const stopRecording = async () => {
    isRecordingRef.current = false;
    const recognition = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    if (recognition) recognition.stop();

    setIsRecording(false);

    const transcript = finalTranscriptRef.current.trim();
    await apiRequest("PUT", `/api/meetings/${meetingId}`, {
      rawTranscript: transcript || undefined,
      status: "stopped",
    });
    queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] });
    queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
    toast({ title: "Recording saved. Review transcript then click Finish & Analyze." });
  };

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tasks", {
        title: `Follow up: ${meeting?.title}`,
        relatedLeadId: meeting?.leadId || undefined,
        relatedClientId: meeting?.clientId || undefined,
        status: "todo",
        priority: "medium",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Follow-up task created" });
      setShowFollowUpPrompt(false);
    },
    onError: (e: Error) => toast({ title: "Failed to create task", description: e.message, variant: "destructive" }),
  });

  const handleSavePaste = () => {
    if (!pasteText.trim()) return;
    updateMutation.mutate({ rawTranscript: pasteText.trim() });
    setLiveTranscript(pasteText.trim());
    toast({ title: "Transcript saved" });
  };

  const handleApproveAll = () => {
    const pending = meeting?.actions.filter((a) => a.status === "pending") ?? [];
    pending.forEach((a) => {
      setActioningIds((prev) => ({ ...prev, [a.id]: "approve" }));
      approveMutation.mutate(a.id);
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <p className="text-muted-foreground">Meeting not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/meetings")}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Meetings
        </Button>
      </div>
    );
  }

  const actions = meeting.actions ?? [];
  const pending = actions.filter((a) => a.status === "pending");
  const reviewed = actions.filter((a) => a.status !== "pending");
  const allReviewed = actions.length > 0 && pending.length === 0;
  const isComplete = meeting.status === "complete";
  const isProcessing = meeting.status === "processing";
  const showReview = meeting.status === "review" || meeting.status === "complete";
  const isStopped = meeting.status === "stopped";
  const transcript = liveTranscript || meeting.rawTranscript || "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center gap-4 px-6 py-4 bg-background border-b shadow-sm shrink-0">
        <button
          onClick={() => navigate("/meetings")}
          className="text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-meetings"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <input
              autoFocus
              className="text-xl font-heading font-bold bg-transparent border-b-2 border-primary outline-none w-full max-w-md"
              value={editTitleValue}
              onChange={(e) => setEditTitleValue(e.target.value)}
              onBlur={() => {
                if (editTitleValue.trim() && editTitleValue !== meeting.title) {
                  updateMutation.mutate({ title: editTitleValue.trim() });
                }
                setIsEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (editTitleValue.trim()) updateMutation.mutate({ title: editTitleValue.trim() });
                  setIsEditingTitle(false);
                }
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              data-testid="input-meeting-title-edit"
            />
          ) : (
            <h1
              className="text-xl font-heading font-bold cursor-text hover:bg-muted/40 rounded px-1 -ml-1 transition-colors truncate max-w-md"
              onClick={() => { setIsEditingTitle(true); setEditTitleValue(meeting.title); }}
              data-testid="text-meeting-title"
            >
              {meeting.title}
            </h1>
          )}
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {format(new Date(meeting.date), "MMMM d, yyyy")}
              {isRecording && (
                <span className="ml-2 text-red-500 font-medium flex items-center gap-1 inline-flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  Recording…
                </span>
              )}
            </p>
            {meeting.meetingType === "pipeline_review" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5" data-testid="badge-pipeline-review">
                <ClipboardList className="h-2.5 w-2.5" />
                Pipeline Review
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Calendar sync */}
          {currentUser?.calendarConnected && (
            meeting.calendarEventId ? (
              <a
                href={meeting.calendarEventLink ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded-md px-3 py-1.5 hover:bg-green-200 transition-colors"
                data-testid="link-calendar-event"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                On Calendar
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncCalendarMutation.mutate()}
                disabled={syncCalendarMutation.isPending}
                className="gap-1.5"
                data-testid="button-sync-calendar"
              >
                {syncCalendarMutation.isPending ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing…</>
                ) : (
                  <><CalendarDays className="h-3.5 w-3.5" /> Add to Calendar</>
                )}
              </Button>
            )
          )}
          {!showReview && !isProcessing && (
            <Button
              onClick={analyzeMutation.mutate}
              disabled={!transcript.trim() || analyzeMutation.isPending || isRecording}
              data-testid="button-analyze"
            >
              {analyzeMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Analyzing…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1.5" /> Finish &amp; Analyze</>
              )}
            </Button>
          )}
          {showReview && !isComplete && allReviewed && (
            <Button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-complete-meeting"
            >
              <Check className="h-4 w-4 mr-1.5" />
              Complete Meeting
            </Button>
          )}
        </div>
      </header>

      {/* Attendees strip */}
      {(() => {
        const attendeeContactIds = meeting.attendeeContactIds ?? [];
        const attendeeUserIds = meeting.attendeeUserIds ?? [];
        const attendeeContacts = allContacts.filter(c => attendeeContactIds.includes(c.id));
        const attendeeUsers = allUsers.filter(u => attendeeUserIds.includes(u.id));
        const totalAttendees = attendeeContacts.length + attendeeUsers.length;

        const getUserName = (u: { firstName: string | null; lastName: string | null; email: string }) =>
          u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email;

        return (
          <div className="px-6 py-2 border-b bg-muted/20 flex items-center gap-3 flex-wrap min-h-[40px]">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <Users className="h-3.5 w-3.5" />
              <span className="font-medium">Attendees</span>
            </div>
            {totalAttendees === 0 ? (
              <span className="text-xs text-muted-foreground italic">None</span>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap flex-1">
                {attendeeUsers.map(u => (
                  <div
                    key={`user-${u.id}`}
                    className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5"
                    data-testid={`chip-attendee-user-${u.id}`}
                  >
                    <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                      {getUserName(u).split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-primary">{getUserName(u)}</span>
                  </div>
                ))}
                {attendeeContacts.map(c => (
                  <div
                    key={`contact-${c.id}`}
                    className="inline-flex items-center gap-1 bg-background border border-border rounded-full px-2.5 py-0.5"
                    data-testid={`chip-attendee-${c.id}`}
                  >
                    <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                      {c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium">{c.name}</span>
                    {c.title && <span className="text-[10px] text-muted-foreground hidden sm:inline">· {c.title}</span>}
                  </div>
                ))}
              </div>
            )}
            <Popover open={isEditingAttendees} onOpenChange={setIsEditingAttendees}>
              <PopoverTrigger asChild>
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0"
                  data-testid="button-edit-attendees"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="px-3 py-2.5 border-b">
                  <p className="text-sm font-semibold">Edit Attendees</p>
                </div>
                {/* Internal M5 team */}
                <div className="px-3 py-1.5 border-b bg-muted/30">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">M5 Team</p>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y">
                  {allUsers.map(u => {
                    const isChecked = attendeeUserIds.includes(u.id);
                    return (
                      <div key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors">
                        <Checkbox
                          id={`detail-user-${u.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const current = meeting.attendeeUserIds ?? [];
                            const updated = checked ? [...current, u.id] : current.filter(id => id !== u.id);
                            updateMutation.mutate({ attendeeUserIds: updated });
                          }}
                          data-testid={`checkbox-detail-user-${u.id}`}
                        />
                        <label htmlFor={`detail-user-${u.id}`} className="flex flex-col cursor-pointer flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{getUserName(u)}</span>
                          <span className="text-[11px] text-muted-foreground truncate">{u.email}</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
                {/* External contacts */}
                <div className="px-3 py-1.5 border-y bg-muted/30">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">External Contacts</p>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y">
                  {allContacts.length === 0 && (
                    <p className="text-xs text-muted-foreground p-3 text-center">No contacts yet.</p>
                  )}
                  {allContacts.map(c => {
                    const isChecked = attendeeContactIds.includes(c.id);
                    return (
                      <div key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors">
                        <Checkbox
                          id={`detail-attendee-${c.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const current = meeting.attendeeContactIds ?? [];
                            const updated = checked ? [...current, c.id] : current.filter(id => id !== c.id);
                            updateMutation.mutate({ attendeeContactIds: updated });
                          }}
                          data-testid={`checkbox-detail-attendee-${c.id}`}
                        />
                        <label htmlFor={`detail-attendee-${c.id}`} className="flex flex-col cursor-pointer flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{c.name}</span>
                          {c.title && <span className="text-[11px] text-muted-foreground truncate">{c.title}</span>}
                        </label>
                      </div>
                    );
                  })}
                </div>
                <div className="px-3 py-2 border-t">
                  <Button size="sm" className="w-full h-7 text-xs" onClick={() => setIsEditingAttendees(false)}>
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        );
      })()}

      {/* Follow-up task prompt */}
      {showFollowUpPrompt && (
        <div className="px-6 py-3 bg-primary/5 border-b border-primary/20 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Analysis finished! Would you like to create a follow-up task?</p>
              <p className="text-xs text-muted-foreground">Pre-filled with "Follow up: {meeting.title}"</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={() => createTaskMutation.mutate()} 
              disabled={createTaskMutation.isPending}
              data-testid="button-create-followup-task"
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setShowFollowUpPrompt(false)}
              data-testid="button-dismiss-followup-prompt"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Minutes document (post-review) OR Transcript + controls (pre-review) */}
        <div className={cn("flex flex-col overflow-hidden", showReview ? "flex-1 border-r border-border" : "flex-1")}>
          {/* Input tabs (only when in recording status) */}
          {!showReview && !isProcessing && (
            <div className="shrink-0 px-6 pt-5 pb-4 border-b border-border/60">
              {/* Mode tabs */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mb-4 border">
                <button
                  onClick={() => setInputMode("record")}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", inputMode === "record" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
                  data-testid="button-mode-record"
                >
                  <Mic className="h-3.5 w-3.5" /> Record
                </button>
                <button
                  onClick={() => setInputMode("paste")}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors", inputMode === "paste" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
                  data-testid="button-mode-paste"
                >
                  <Keyboard className="h-3.5 w-3.5" /> Paste / Upload
                </button>
              </div>

              {/* Record controls */}
              {inputMode === "record" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    {!isRecording ? (
                      <Button onClick={startRecording} className="gap-2" data-testid="button-start-recording">
                        <Mic className="h-4 w-4" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button onClick={stopRecording} variant="destructive" className="gap-2" data-testid="button-stop-recording">
                        <Square className="h-3.5 w-3.5 fill-current" />
                        Stop Recording
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {isRecording
                        ? "Listening — transcript appears in real time below."
                        : isStopped
                        ? "Recording stopped. Review transcript below, then click Finish & Analyze."
                        : "Click to start capturing your meeting audio via microphone."}
                    </p>
                  </div>
                  {isRecording && (
                    <div className="flex items-center gap-3 pl-1">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-medium text-red-600">LIVE</span>
                      </div>
                      {wordCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <Check className="h-3 w-3" /> {wordCount} word{wordCount !== 1 ? "s" : ""} captured
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Paste controls */}
              {inputMode === "paste" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Paste a Google Meet, Zoom, or Teams transcript below — or upload a .txt file.
                  </p>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm cursor-pointer hover:bg-muted transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                      Upload .txt
                      <input
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => setPasteText(ev.target?.result as string || "");
                          reader.readAsText(file);
                        }}
                        data-testid="input-upload-transcript"
                      />
                    </label>
                    <Button size="sm" onClick={handleSavePaste} disabled={!pasteText.trim()} data-testid="button-save-paste">
                      Save Transcript
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Paste your meeting transcript here…"
                    className="min-h-[120px] resize-none font-mono text-xs"
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    data-testid="textarea-paste-transcript"
                  />
                </div>
              )}
            </div>
          )}

          {/* Pre-review: Transcript display */}
          {!showReview && !isProcessing && (
            <div className="flex-1 overflow-y-auto px-6 py-5 relative" ref={transcriptScrollRef} onScroll={handleTranscriptScroll}>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transcript</p>
              </div>
              {transcript ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-4 border border-border/40">
                    {transcript}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Mic className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">No transcript yet.</p>
                  <p className="text-xs mt-1">Start recording or paste a transcript above.</p>
                </div>
              )}
              <div ref={transcriptEndRef} />

              {/* Floating stop button — always visible while recording */}
              {isRecording && (
                <div className="sticky bottom-4 flex justify-center pointer-events-none">
                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    className="gap-2 shadow-lg pointer-events-auto"
                    data-testid="button-stop-recording-floating"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Stop Recording
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Post-review: Meeting Minutes document */}
          {showReview && meeting.meetingType !== "pipeline_review" && (
            <MeetingMinutesPanel
              meeting={meeting}
              actions={actions}
              actioningIds={actioningIds}
              isComplete={isComplete}
              onApprove={(actionId) => {
                setActioningIds((prev) => ({ ...prev, [actionId]: "approve" }));
                approveMutation.mutate(actionId);
              }}
              onDecline={(actionId) => {
                setActioningIds((prev) => ({ ...prev, [actionId]: "decline" }));
                declineMutation.mutate(actionId);
              }}
            />
          )}

          {/* Post-review: Pipeline Review — actions in sidebar */}
          {showReview && meeting.meetingType === "pipeline_review" && (
            <div className="flex-1 overflow-y-auto px-6 py-5 relative" ref={transcriptScrollRef} onScroll={handleTranscriptScroll}>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transcript</p>
              </div>
              {transcript ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-4 border border-border/40">
                  {transcript}
                </p>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Mic className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">No transcript.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: simplified sidebar (post-review) */}
        {showReview && (
          <div className="w-[380px] shrink-0 flex flex-col overflow-hidden">
            {meeting.meetingType === "pipeline_review" ? (
              // Pipeline Review: full actions panel unchanged
              <Tabs defaultValue="actions" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-5 pt-4 border-b shrink-0">
                  <TabsList className="w-full grid grid-cols-2 h-9 bg-muted/50 p-1 mb-4">
                    <TabsTrigger value="actions" className="text-[11px] font-bold uppercase tracking-wider">
                      Actions
                      {pending.length > 0 && (
                        <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px] bg-primary text-primary-foreground">
                          {pending.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="files" className="text-[11px] font-bold uppercase tracking-wider">
                      Files
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">AI Suggestions</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {reviewed.length}/{actions.length} reviewed
                    </span>
                  </div>

                  <TabsContent value="actions" className="m-0">
                    {meeting.summary && (
                      <div className="bg-muted/60 border border-border/50 rounded-lg p-3 text-xs leading-relaxed text-muted-foreground mb-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1.5">Pipeline Review Summary</p>
                        {meeting.summary}
                      </div>
                    )}
                    {!isComplete && pending.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mb-4 h-7 text-xs w-full border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                        onClick={handleApproveAll}
                        data-testid="button-approve-all"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve All ({pending.length})
                      </Button>
                    )}
                  </TabsContent>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="actions" className="m-0 p-4 space-y-3">
                    {actions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                        <ClipboardList className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">No action items were identified.</p>
                      </div>
                    ) : (
                      (() => {
                        const dealMap = new Map<string, { dealSummary: string; matchedLeadId: number | null; actions: MeetingAction[] }>();
                        for (const action of actions) {
                          const dealName = (action.payload as Record<string, any>).dealName || "Unknown Deal";
                          const dealSummary = (action.payload as Record<string, any>).dealSummary || "";
                          const matchedLeadId = (action.payload as Record<string, any>).matchedLeadId ?? null;
                          if (!dealMap.has(dealName)) {
                            dealMap.set(dealName, { dealSummary, matchedLeadId, actions: [] });
                          }
                          dealMap.get(dealName)!.actions.push(action);
                        }
                        return Array.from(dealMap.entries()).map(([dealName, group]) => (
                          <PipelineDealSection
                            key={dealName}
                            dealName={dealName}
                            dealSummary={group.dealSummary}
                            matchedLeadId={group.matchedLeadId}
                            actions={group.actions}
                            actioningIds={actioningIds}
                            onApprove={(actionId) => {
                              setActioningIds((prev) => ({ ...prev, [actionId]: "approve" }));
                              approveMutation.mutate(actionId);
                            }}
                            onDecline={(actionId) => {
                              setActioningIds((prev) => ({ ...prev, [actionId]: "decline" }));
                              declineMutation.mutate(actionId);
                            }}
                          />
                        ));
                      })()
                    )}
                  </TabsContent>
                  <TabsContent value="files" className="m-0 p-4">
                    <AttachmentsPanel entityType="meeting" entityId={meetingId} />
                  </TabsContent>
                </div>
              </Tabs>
            ) : (
              // Standard meeting: simplified sidebar with files only
              <Tabs defaultValue="files" className="flex-1 flex flex-col overflow-hidden">
                <div className="px-5 pt-4 border-b shrink-0">
                  <TabsList className="w-full grid grid-cols-1 h-9 bg-muted/50 p-1 mb-3">
                    <TabsTrigger value="files" className="text-[11px] font-bold uppercase tracking-wider">
                      Files &amp; Attachments
                    </TabsTrigger>
                  </TabsList>
                  {!isComplete && pending.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mb-3 h-7 text-xs w-full border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                      onClick={handleApproveAll}
                      data-testid="button-approve-all"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve All CRM Actions ({pending.length})
                    </Button>
                  )}
                  {actions.length > 0 && (
                    <div className="flex items-center justify-between pb-3">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        CRM Actions
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {reviewed.length}/{actions.length} reviewed
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <TabsContent value="files" className="m-0 p-4">
                    <AttachmentsPanel entityType="meeting" entityId={meetingId} />
                  </TabsContent>
                </div>
              </Tabs>
            )}
          </div>
        )}

        {/* Processing state */}
        {isProcessing && !showReview && (
          <div className="w-[380px] shrink-0 flex flex-col items-center justify-center border-l border-border/60 text-center p-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="font-semibold text-sm">Generating meeting minutes…</p>
            <p className="text-xs text-muted-foreground mt-1">GPT-4o is building your structured minutes. This usually takes 10–20 seconds.</p>
          </div>
        )}
      </div>
    </div>
  );
}
