import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import {
  Mail, RefreshCw, AlertCircle, Bell, ArrowDownLeft, ArrowUpRight,
  Plus, TrendingUp, MoreVertical, X, UserPlus, Zap, Building2,
  ChevronRight, ChevronLeft, Clock, Eye, EyeOff, Search, Users, ChevronDown, ChevronUp, Ban,
  ThumbsUp, ThumbsDown, Check, ChevronsUpDown, Pencil, Tag, MessageSquare, UserCheck, ArrowRightLeft, SortAsc, Trash2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface ConnectionSuggestion {
  type: "client" | "contact" | "lead";
  id: number;
  name: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

interface CreateSuggestion {
  type: "contact" | "client";
  name: string;
  email?: string;
  company?: string;
  title?: string;
  reason: string;
}

interface EmailMessage {
  id: number;
  gmailMessageId: string;
  gmailThreadId: string;
  userId: string;
  direction: string;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  ccEmails: string[];
  subject: string | null;
  bodySnippet: string | null;
  fullBody: string | null;
  receivedAt: string;
  clientId: number | null;
  leadId: number | null;
  contactId: number | null;
  aiSummary: string | null;
  aiSuggestedTasks: { title: string; priority: string; dueInDays?: number }[] | null;
  aiConnectionSuggestions: ConnectionSuggestion[] | null;
  aiCreateSuggestions: CreateSuggestion[] | null;
  aiSentiment: string | null;
  aiStageSuggestion: string | null;
  requiresResponse: boolean;
  followUpReminderCreated: boolean;
  isProcessed: boolean;
  isDismissed: boolean;
  autoLinked: boolean;
  assignedUserId: string | null;
  requestType: string | null;
}

interface DismissedSender {
  id: number;
  userId: string;
  emailAddress: string;
  createdAt: string;
}

interface EmailThread {
  threadId: string;
  messages: EmailMessage[];
  latestMessage: EmailMessage;
  senderNames: string;
  requiresResponse: boolean;
  hasCC: boolean;
}

interface Client { id: number; name: string; healthScore?: number | null; }
interface Lead { id: number; title: string; clientId: number | null; }
interface Contact { id: number; name: string; email: string | null; clientId: number | null; }
interface DirectoryUser { id: string; firstName: string | null; lastName: string | null; email: string; role: string; }
interface ThreadNote { id: number; gmailThreadId: string; userId: string; content: string; createdAt: string; userName: string; }

function groupIntoThreads(emails: EmailMessage[], sortMode: "newest" | "needs_action" = "newest"): EmailThread[] {
  const map = new Map<string, EmailMessage[]>();
  for (const e of emails) {
    if (!map.has(e.gmailThreadId)) map.set(e.gmailThreadId, []);
    map.get(e.gmailThreadId)!.push(e);
  }
  const threads: EmailThread[] = [];
  for (const [threadId, messages] of map) {
    const sorted = [...messages].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    const latestMessage = sorted[0];
    const uniqueSenders = [...new Set(messages.map(m => m.fromName?.split(" ")[0] || m.fromEmail.split("@")[0]))];
    const senderNames = uniqueSenders.slice(0, 3).join(", ") + (uniqueSenders.length > 3 ? "..." : "");
    threads.push({
      threadId,
      messages: sorted,
      latestMessage,
      senderNames,
      requiresResponse: messages.some(m => m.requiresResponse && !m.followUpReminderCreated),
      hasCC: messages.some(m => m.direction === "cc"),
    });
  }
  if (sortMode === "needs_action") {
    // Sort "needs action" threads by oldest unanswered inbound first, others after
    const needsAction = threads.filter(t => t.requiresResponse);
    const rest = threads.filter(t => !t.requiresResponse);
    needsAction.sort((a, b) => {
      const oldestUnanswered = (thread: EmailThread) => {
        const outboundTimes = thread.messages.filter(m => m.direction === "outbound").map(m => new Date(m.receivedAt).getTime());
        const latestOutbound = outboundTimes.length > 0 ? Math.max(...outboundTimes) : 0;
        const unansweredInbound = thread.messages.filter(m => m.direction === "inbound" && new Date(m.receivedAt).getTime() > latestOutbound);
        if (unansweredInbound.length === 0) {
          const inbound = thread.messages.filter(m => m.direction === "inbound");
          return inbound.length > 0 ? Math.min(...inbound.map(m => new Date(m.receivedAt).getTime())) : new Date(thread.latestMessage.receivedAt).getTime();
        }
        return Math.min(...unansweredInbound.map(m => new Date(m.receivedAt).getTime()));
      };
      return oldestUnanswered(a) - oldestUnanswered(b);
    });
    rest.sort((a, b) => new Date(b.latestMessage.receivedAt).getTime() - new Date(a.latestMessage.receivedAt).getTime());
    return [...needsAction, ...rest];
  }
  return threads.sort((a, b) => new Date(b.latestMessage.receivedAt).getTime() - new Date(a.latestMessage.receivedAt).getTime());
}

function sentimentBadge(sentiment: string | null) {
  switch (sentiment) {
    case "urgent": return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-1.5 py-0">Urgent</Badge>;
    case "negative": return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs px-1.5 py-0">Negative</Badge>;
    case "positive": return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-1.5 py-0">Positive</Badge>;
    default: return null;
  }
}

function directionBadge(direction: string) {
  if (direction === "inbound") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
      <ArrowDownLeft className="h-3 w-3" /> Inbound
    </span>
  );
  if (direction === "cc") return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
      <Users className="h-3 w-3" /> CC'd
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
      <ArrowUpRight className="h-3 w-3" /> Outbound
    </span>
  );
}

function EmailBodyRenderer({ body }: { body: string }) {
  const paragraphs = body.split(/\n\n+/);
  return (
    <div className="text-sm leading-relaxed text-gray-700 space-y-3">
      {paragraphs.map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j) => (
            <span key={j}>
              {line}
              {j < para.split("\n").length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

function ThreadRow({ thread, clients, directoryUsers, isSelected, isChecked, showCheckboxes, onSelect, onToggleCheck }: {
  thread: EmailThread;
  clients: Client[];
  directoryUsers: DirectoryUser[];
  isSelected: boolean;
  isChecked: boolean;
  showCheckboxes: boolean;
  onSelect: () => void;
  onToggleCheck: (e: React.MouseEvent) => void;
}) {
  const latest = thread.latestMessage;
  const client = thread.messages.find(m => m.clientId)?.clientId
    ? clients.find(c => c.id === thread.messages.find(m => m.clientId)?.clientId)
    : null;
  const hasSuggestions = (latest.aiConnectionSuggestions?.length ?? 0) > 0 && !latest.clientId;
  const isCC = thread.messages.every(m => m.direction === "cc");
  const hasInbound = thread.messages.some(m => m.direction === "inbound");
  const hasOutbound = thread.messages.some(m => m.direction === "outbound");

  return (
    <div
      onClick={onSelect}
      data-testid={`thread-row-${thread.threadId}`}
      className={`px-3 py-2.5 border-b border-gray-100 cursor-pointer transition-colors group ${
        isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-gray-50 border-l-2 border-l-transparent"
      } ${isCC ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            onClick={onToggleCheck}
            className={`shrink-0 transition-opacity ${isChecked || showCheckboxes ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            data-testid={`checkbox-thread-${thread.threadId}`}
          >
            <Checkbox checked={isChecked} onCheckedChange={() => {}} className="h-3.5 w-3.5" />
          </div>
          {hasInbound && hasOutbound ? (
            <div className="flex shrink-0">
              <ArrowDownLeft className="h-3 w-3 text-blue-500" />
              <ArrowUpRight className="h-3 w-3 text-gray-400 -ml-1" />
            </div>
          ) : hasInbound ? (
            <ArrowDownLeft className="h-3 w-3 text-blue-500 shrink-0" />
          ) : isCC ? (
            <Users className="h-3 w-3 text-gray-400 shrink-0" />
          ) : (
            <ArrowUpRight className="h-3 w-3 text-gray-400 shrink-0" />
          )}
          <p className="text-xs font-semibold text-gray-800 truncate">{thread.senderNames}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {thread.messages.length > 1 && (
            <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0">
              {thread.messages.length} msgs
            </span>
          )}
          <span className="text-xs text-gray-400">{format(new Date(latest.receivedAt), "MMM d")}</span>
        </div>
      </div>
      <p className="text-xs text-gray-600 truncate font-medium">{latest.subject ?? "(no subject)"}</p>
      <p className="text-xs text-gray-400 truncate mt-0.5">{latest.bodySnippet}</p>
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        {thread.requiresResponse && (
          <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 rounded px-1 py-0">
            <AlertCircle className="h-2.5 w-2.5" /> Reply
          </span>
        )}
        {isCC && (
          <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 bg-gray-100 rounded px-1 py-0">
            <Users className="h-2.5 w-2.5" /> CC
          </span>
        )}
        {hasSuggestions && (
          <span className="inline-flex items-center gap-0.5 text-xs text-purple-600 bg-purple-50 rounded px-1 py-0">
            <Zap className="h-2.5 w-2.5" /> Suggestion
          </span>
        )}
        {client && (
          <span className="inline-flex items-center gap-1">
            <span className="text-xs text-primary font-medium truncate">{client.name}</span>
            {client.healthScore !== null && client.healthScore !== undefined && (
              <span className={`text-[9px] font-bold px-1 py-0 rounded-full shrink-0 ${
                client.healthScore >= 70 ? "bg-green-100 text-green-700" :
                client.healthScore >= 40 ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }`} data-testid={`badge-health-email-${thread.threadId}`}>
                {client.healthScore}
              </span>
            )}
          </span>
        )}
        {latest.isDismissed && (
          <span className="text-xs text-gray-400 italic">dismissed</span>
        )}
        {latest.assignedUserId && (() => {
          const assignee = directoryUsers.find(u => u.id === latest.assignedUserId);
          const name = assignee ? `${assignee.firstName ?? ""} ${assignee.lastName ?? ""}`.trim() || assignee.email : "Assigned";
          return (
            <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded px-1 py-0">
              <UserCheck className="h-2.5 w-2.5" /> {name}
            </span>
          );
        })()}
        {latest.requestType && (
          <span className="inline-flex items-center gap-0.5 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1 py-0">
            <Tag className="h-2.5 w-2.5" /> {latest.requestType.replace(/_/g, " ")}
          </span>
        )}
        {(() => {
          const hasLead = thread.messages.some(m => m.leadId);
          if (!hasLead || latest.direction !== "inbound") return null;
          const lastOutbound = thread.messages.find(m => m.direction === "outbound");
          const sinceMs = lastOutbound
            ? Date.now() - new Date(lastOutbound.receivedAt).getTime()
            : Date.now() - new Date(latest.receivedAt).getTime();
          const hoursOld = Math.floor(sinceMs / 3600000);
          if (hoursOld < 24) return null;
          const isRed = hoursOld >= 48;
          const label = hoursOld < 48 ? `${hoursOld}h` : `${Math.floor(hoursOld / 24)}d`;
          return (
            <span className={`inline-flex items-center gap-0.5 text-xs rounded px-1 py-0 ${isRed ? "text-red-600 bg-red-50" : "text-amber-600 bg-amber-50"}`}>
              <Clock className="h-2.5 w-2.5" /> {label}
            </span>
          );
        })()}
      </div>
    </div>
  );
}

export default function EmailSyncPage() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id;
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  // Prevents auto-select from overriding the user's explicit "Back" tap on mobile
  const [mobileDeselected, setMobileDeselected] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [viewFilter, setViewFilter] = useState<"all" | "customers" | "other">("customers");
  const [needsResponseOnly, setNeedsResponseOnly] = useState(true);
  const [hasTasksOnly, setHasTasksOnly] = useState(false);
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [showBlockedSenders, setShowBlockedSenders] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [editingLinkField, setEditingLinkField] = useState<"client" | "deal" | "contact" | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [linkClientId, setLinkClientId] = useState("");
  const [linkLeadId, setLinkLeadId] = useState("");
  const [linkContactId, setLinkContactId] = useState("");
  const [newContactFirstName, setNewContactFirstName] = useState("");
  const [newContactLastName, setNewContactLastName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactClientId, setNewContactClientId] = useState("");
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const [pendingSuggestion, setPendingSuggestion] = useState<{ msgId: number; suggestion: ConnectionSuggestion } | null>(null);
  const [aiFeedbackGiven, setAiFeedbackGiven] = useState<Record<string, "thumbs_up" | "thumbs_down">>({});
  // Link dialog combobox open states
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [leadComboOpen, setLeadComboOpen] = useState(false);
  const [contactComboOpen, setContactComboOpen] = useState(false);
  // Quick-create client dialog (from create suggestion)
  const [quickClientDialogOpen, setQuickClientDialogOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientIndustry, setQuickClientIndustry] = useState("");
  const [quickClientEmailForLink, setQuickClientEmailForLink] = useState<number | null>(null);
  // New M5 overhaul state
  const [sortMode, setSortMode] = useState<"newest" | "needs_action">(() => {
    const saved = localStorage.getItem("emailSortMode");
    return saved === "newest" || saved === "needs_action" ? saved : "needs_action";
  });
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "mine" | "unassigned">("all");
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);
  const [handoffFromUserId, setHandoffFromUserId] = useState("");
  const [handoffToUserId, setHandoffToUserId] = useState("");
  const [handoffPreviewThreads, setHandoffPreviewThreads] = useState<{ gmailThreadId: string; subject: string; clientId: number | null; receivedAt: string; requiresResponse: boolean; openTaskCount: number }[]>([]);
  const [handoffSelectedThreadIds, setHandoffSelectedThreadIds] = useState<Set<string>>(new Set());
  const [handoffLoading, setHandoffLoading] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("");
  const [showSuppressedManagement, setShowSuppressedManagement] = useState(false);

  const { data: emails = [], isLoading } = useQuery<EmailMessage[]>({
    queryKey: ["/api/email-messages", "all"],
    queryFn: () => fetch(`/api/email-messages?includeDismissed=true`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: dismissedSenders = [] } = useQuery<DismissedSender[]>({
    queryKey: ["/api/dismissed-senders"],
    queryFn: () => fetch("/api/dismissed-senders", { credentials: "include" }).then(r => r.json()),
  });

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: contacts = [] } = useQuery<Contact[]>({ queryKey: ["/api/client-contacts"] });
  const { data: syncStatus } = useQuery<{ lastSynced: string | null }>({
    queryKey: ["/api/email/sync-status"],
    refetchInterval: 60000,
  });
  const { data: myPerms } = useQuery<{ role: string; permissions: Record<string, string>; isSuperAdmin: boolean }>({
    queryKey: ["/api/my-permissions"],
  });
  const isAdminOrAbove = myPerms?.role === "super_admin" || myPerms?.role === "admin";
  const { data: directoryUsers = [] } = useQuery<DirectoryUser[]>({
    queryKey: ["/api/users/directory"],
    enabled: isAdminOrAbove || myPerms?.role === "manager",
  });
  const { data: threadNotes = [] } = useQuery<ThreadNote[]>({
    queryKey: ["/api/email-thread-notes", selectedThreadId],
    queryFn: () => selectedThreadId
      ? fetch(`/api/email-thread-notes/${selectedThreadId}`, { credentials: "include" }).then(r => r.json())
      : Promise.resolve([]),
    enabled: !!selectedThreadId && showNotesPanel,
  });
  const { data: suppressedSenders = [] } = useQuery<{ email: string; count: number; latestSubject: string; latestDate: string }[]>({
    queryKey: ["/api/email/suppressed-senders"],
    queryFn: () => fetch("/api/email/suppressed-senders", { credentials: "include" }).then(r => r.json()),
    enabled: isAdminOrAbove && showSuppressedManagement,
  });
  const restoreSuppressedMutation = useMutation({
    mutationFn: (senderEmail: string) => apiRequest("POST", "/api/email/restore-suppressed", { senderEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/suppressed-senders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      toast({ title: "Sender restored" });
    },
    onError: () => toast({ title: "Failed to restore sender", variant: "destructive" }),
  });

  const activeEmails = emails.filter(e => showDismissed ? e.isDismissed : !e.isDismissed);
  const allThreads = groupIntoThreads(activeEmails, sortMode);

  const filteredThreads = allThreads.filter(thread => {
    if (needsResponseOnly && !thread.requiresResponse) return false;
    if (hasTasksOnly && !thread.messages.some(m => m.aiSuggestedTasks && m.aiSuggestedTasks.length > 0)) return false;
    if (unlinkedOnly && thread.messages.some(m => m.clientId !== null || m.leadId !== null)) return false;
    if (requestTypeFilter && !thread.messages.some(m => m.requestType === requestTypeFilter)) return false;
    if (assigneeFilter === "mine" && !thread.messages.some(m => m.assignedUserId === currentUserId)) return false;
    if (assigneeFilter === "unassigned" && thread.messages.some(m => m.assignedUserId)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return thread.messages.some(m => {
        const haystack = [m.subject, m.fromName, m.fromEmail, m.bodySnippet, m.aiSummary].join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }
    return true;
  });

  const customerThreads = filteredThreads.filter(t => t.messages.some(m => m.clientId !== null));
  const otherThreads = filteredThreads.filter(t => !t.messages.some(m => m.clientId !== null));

  const visibleThreads = viewFilter === "all" ? filteredThreads : viewFilter === "customers" ? customerThreads : otherThreads;
  const threads = [...customerThreads, ...otherThreads];
  const selectedThread = threads.find(t => t.threadId === selectedThreadId) ?? null;
  const primaryEmail = selectedThread?.latestMessage ?? null;

  const isMobileViewport = useIsMobile();

  // Auto-select first thread, or re-home if selection no longer visible in active tab.
  // On mobile, if the user explicitly tapped "Back" (mobileDeselected), do NOT auto-select
  // until they explicitly select a thread again.
  // Desktop: always auto-selects so the center panel is never empty.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const threadParam = params.get("thread");
    if (threadParam && visibleThreads.find(t => t.threadId === threadParam)) {
      setSelectedThreadId(threadParam);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (visibleThreads.length === 0) {
      setSelectedThreadId(null);
      return;
    }
    if (isMobileViewport && mobileDeselected) return;
    if (!selectedThreadId || !visibleThreads.find(t => t.threadId === selectedThreadId)) {
      setSelectedThreadId(visibleThreads[0].threadId);
    }
  }, [visibleThreads.length, selectedThreadId, mobileDeselected, viewFilter, needsResponseOnly, hasTasksOnly, unlinkedOnly, showDismissed, searchQuery]);

  // When thread changes, auto-expand most recent message
  useEffect(() => {
    if (selectedThread) {
      setExpandedMessages(new Set([selectedThread.latestMessage.id]));
      const e = selectedThread.latestMessage;
      setSelectedTasks(e.aiSuggestedTasks?.map(t => t.title) ?? []);
      const parts = e.fromName?.split(" ") ?? [];
      setNewContactFirstName(parts[0] ?? "");
      setNewContactLastName(parts.slice(1).join(" ") ?? "");
      setNewContactEmail(e.fromEmail ?? "");
      setLinkClientId(e.clientId ? String(e.clientId) : "");
      setLinkLeadId(e.leadId ? String(e.leadId) : "");
      setLinkContactId(e.contactId ? String(e.contactId) : "");
      setEditingLinkField(null);
    }
  }, [selectedThreadId]);

  const needsResponseCount = allThreads.filter(t => t.requiresResponse).length;
  const hasTasksCount = allThreads.filter(t => t.messages.some(m => m.aiSuggestedTasks && m.aiSuggestedTasks.length > 0)).length;
  const unlinkedCount = allThreads.filter(t => !t.messages.some(m => m.clientId !== null || m.leadId !== null)).length;
  const dismissedCount = groupIntoThreads(emails).filter(t => t.messages.every(m => m.isDismissed)).length;

  const matchedClient = primaryEmail?.clientId ? clients.find(c => c.id === primaryEmail.clientId) : null;
  const matchedLead = primaryEmail?.leadId ? leads.find(l => l.id === primaryEmail.leadId) : null;
  const matchedContact = primaryEmail?.contactId ? contacts.find(c => c.id === primaryEmail.contactId) : null;
  const availableLeads = linkClientId ? leads.filter(l => l.clientId === parseInt(linkClientId)) : leads;

  const lastSyncedText = syncStatus?.lastSynced
    ? `Last synced ${formatDistanceToNow(new Date(syncStatus.lastSynced), { addSuffix: true })}`
    : "Never synced";

  const threadParticipants = useMemo(() => {
    if (!selectedThread) return { external: [] as { email: string; name?: string }[], internal: [] as { email: string; name?: string }[] };
    const externalMap = new Map<string, { email: string; name?: string }>();
    const internalMap = new Map<string, { email: string; name?: string }>();
    for (const msg of selectedThread.messages) {
      const addPerson = (email: string, name?: string | null) => {
        const lower = email.toLowerCase();
        if (lower.endsWith("@m5svcs.com")) {
          if (!internalMap.has(lower)) internalMap.set(lower, { email: lower, name: name ?? undefined });
        } else {
          if (!externalMap.has(lower)) externalMap.set(lower, { email: lower, name: name ?? undefined });
        }
      };
      addPerson(msg.fromEmail, msg.fromName);
      for (const e of (msg.toEmails ?? [])) addPerson(e);
      for (const e of (msg.ccEmails ?? [])) addPerson(e);
    }
    return { external: Array.from(externalMap.values()), internal: Array.from(internalMap.values()) };
  }, [selectedThread?.threadId, selectedThread?.messages.length]);

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/email/sync", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/sync-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      const parts = [`Synced ${data.totalSynced} emails (${data.newEmails} new)`];
      if (data.remindersCreated > 0) parts.push(`${data.remindersCreated} follow-up reminder${data.remindersCreated !== 1 ? "s" : ""} created`);
      toast({ title: parts.join(" · ") });
    },
    onError: (err: any) => toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
  });

  const dismissThreadMutation = useMutation({
    mutationFn: (gmailThreadId: string) => apiRequest("PATCH", `/api/email-messages/dismiss-thread`, { gmailThreadId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      setSelectedThreadId(null);
      toast({ title: "Thread dismissed" });
    },
  });

  const dismissSenderMutation = useMutation({
    mutationFn: (emailAddress: string) => apiRequest("POST", "/api/dismissed-senders", { emailAddress }),
    onSuccess: (_, emailAddress) => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dismissed-senders"] });
      setSelectedThreadId(null);
      const isDomain = emailAddress.startsWith("@");
      toast({ title: isDomain ? `All emails from ${emailAddress} blocked` : `${emailAddress} blocked` });
    },
  });

  const removeDismissedSenderMutation = useMutation({
    mutationFn: (emailAddress: string) => apiRequest("DELETE", `/api/dismissed-senders/${encodeURIComponent(emailAddress)}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dismissed-senders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      toast({ title: "Sender unblocked" });
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ id, clientId, leadId, contactId }: { id: number; clientId?: number | null; leadId?: number | null; contactId?: number | null }) =>
      apiRequest("PATCH", `/api/email-messages/${id}/link`, { clientId, leadId, contactId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setEditingLinkField(null);
      toast({ title: "Email linked successfully" });
    },
    onError: () => toast({ title: "Failed to link email", variant: "destructive" }),
  });

  const createTasksMutation = useMutation({
    mutationFn: ({ id, tasks }: { id: number; tasks: any[] }) =>
      apiRequest("POST", `/api/email-messages/${id}/create-tasks`, { tasks }),
    onSuccess: (data: any) => {
      toast({ title: `${data.length} task${data.length !== 1 ? "s" : ""} created` });
      setTaskDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => toast({ title: "Failed to create tasks", variant: "destructive" }),
  });

  const applyStageMutation = useMutation({
    mutationFn: ({ id, leadId, stage }: { id: number; leadId: number; stage: string }) =>
      apiRequest("PATCH", `/api/email-messages/${id}/apply-stage`, { leadId, stage }),
    onSuccess: () => {
      toast({ title: "Lead stage updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: () => toast({ title: "Failed to update stage", variant: "destructive" }),
  });

  const addContactMutation = useMutation({
    mutationFn: ({ firstName, lastName, email, clientId }: { firstName: string; lastName: string; email: string; clientId: number }) =>
      apiRequest("POST", `/api/clients/${clientId}/contacts`, {
        name: `${firstName} ${lastName}`.trim(),
        email,
        clientId,
        isPrimary: false,
        serviceNeeds: [],
      }),
    onSuccess: (newContact: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      if (primaryEmail) {
        linkMutation.mutate({ id: primaryEmail.id, contactId: newContact.id, clientId: newContact.clientId });
      }
      setAddContactDialogOpen(false);
      toast({ title: "Contact created and linked" });
    },
    onError: () => toast({ title: "Failed to create contact", variant: "destructive" }),
  });

  const quickClientMutation = useMutation({
    mutationFn: ({ name, industry }: { name: string; industry?: string }) =>
      apiRequest("POST", "/api/clients", { name, industry: industry || "" }) as Promise<{ id: number }>,
    onSuccess: async (newClient) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      if (quickClientEmailForLink !== null) {
        linkMutation.mutate({ id: quickClientEmailForLink, clientId: newClient.id });
      }
      setQuickClientDialogOpen(false);
      setQuickClientName("");
      setQuickClientIndustry("");
      setQuickClientEmailForLink(null);
      toast({ title: "Company created and linked" });
    },
    onError: () => toast({ title: "Failed to create company", variant: "destructive" }),
  });

  const aiFeedbackMutation = useMutation({
    mutationFn: ({ emailId, feedbackType, feedbackContext, contentSnippet }: { emailId: number; feedbackType: string; feedbackContext: string; contentSnippet?: string }) =>
      apiRequest("POST", "/api/ai-feedback", { emailId, feedbackType, feedbackContext, contentSnippet }),
  });

  const dismissConnectionSuggestionMutation = useMutation({
    mutationFn: ({ emailId, type, suggestionId }: { emailId: number; type: string; suggestionId: number }) =>
      apiRequest("PATCH", `/api/email-messages/${emailId}/remove-connection-suggestion`, { type, suggestionId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] }),
  });

  const dismissCreateSuggestionMutation = useMutation({
    mutationFn: ({ emailId, name }: { emailId: number; name: string }) =>
      apiRequest("PATCH", `/api/email-messages/${emailId}/remove-create-suggestion`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] }),
  });

  const dismissTaskSuggestionMutation = useMutation({
    mutationFn: ({ emailId, title }: { emailId: number; title: string }) =>
      apiRequest("PATCH", `/api/email-messages/${emailId}/remove-task-suggestion`, { title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] }),
  });

  const assignThreadMutation = useMutation({
    mutationFn: ({ id, assignedUserId }: { id: number; assignedUserId: string | null }) =>
      apiRequest("PATCH", `/api/email-messages/${id}/assign`, { assignedUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      toast({ title: "Thread assigned" });
    },
    onError: () => toast({ title: "Failed to assign thread", variant: "destructive" }),
  });

  const requestTypeMutation = useMutation({
    mutationFn: ({ id, requestType }: { id: number; requestType: string | null }) =>
      apiRequest("PATCH", `/api/email-messages/${id}/request-type`, { requestType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      toast({ title: "Request type updated" });
    },
    onError: () => toast({ title: "Failed to update request type", variant: "destructive" }),
  });

  const createNoteMutation = useMutation({
    mutationFn: ({ gmailThreadId, content }: { gmailThreadId: string; content: string }) =>
      apiRequest("POST", "/api/email-thread-notes", { gmailThreadId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-thread-notes", selectedThreadId] });
      setNewNoteContent("");
      toast({ title: "Note added" });
    },
    onError: () => toast({ title: "Failed to add note", variant: "destructive" }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/email-thread-notes/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-thread-notes", selectedThreadId] });
      toast({ title: "Note deleted" });
    },
    onError: () => toast({ title: "Failed to delete note", variant: "destructive" }),
  });

  const handoffMutation = useMutation({
    mutationFn: ({ fromUserId, toUserId, gmailThreadIds }: { fromUserId: string; toUserId: string; gmailThreadIds: string[] }) =>
      apiRequest("POST", "/api/email/handoff", { fromUserId, toUserId, gmailThreadIds }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      setHandoffDialogOpen(false);
      setHandoffFromUserId("");
      setHandoffToUserId("");
      toast({ title: `${data.count} thread${data.count !== 1 ? "s" : ""} reassigned` });
    },
    onError: (e: any) => toast({ title: "Handoff failed", description: e.message, variant: "destructive" }),
  });

  const bulkBlockSenders = async () => {
    const toBlock = Array.from(selectedThreadIds).map(tid => {
      const thread = threads.find(t => t.threadId === tid);
      return thread?.latestMessage.fromEmail;
    }).filter(Boolean) as string[];
    await Promise.all(toBlock.map(email => apiRequest("POST", "/api/dismissed-senders", { emailAddress: email })));
    queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
    queryClient.invalidateQueries({ queryKey: ["/api/dismissed-senders"] });
    setSelectedThreadIds(new Set());
    toast({ title: `${toBlock.length} sender${toBlock.length !== 1 ? "s" : ""} blocked` });
  };

  const bulkDismiss = async () => {
    const threadIds = Array.from(selectedThreadIds);
    await Promise.all(threadIds.map(gmailThreadId => apiRequest("PATCH", `/api/email-messages/dismiss-thread`, { gmailThreadId })));
    queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
    setSelectedThreadIds(new Set());
    setSelectedThreadId(null);
    toast({ title: `${threadIds.length} thread${threadIds.length !== 1 ? "s" : ""} dismissed` });
  };

  const submitFeedback = (emailId: number, context: string, type: "thumbs_up" | "thumbs_down", snippet?: string) => {
    const key = `${emailId}-${context}`;
    if (aiFeedbackGiven[key]) return;
    setAiFeedbackGiven(prev => ({ ...prev, [key]: type }));
    aiFeedbackMutation.mutate({ emailId, feedbackType: type, feedbackContext: context, contentSnippet: snippet });
  };

  const toggleMessageExpanded = (id: number) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Archivo Black, sans-serif" }}>
            Email Sync
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" /> {lastSyncedText}
            </span>
            <span className="text-xs text-gray-300">·</span>
            <span className="inline-flex items-center gap-1 text-xs text-green-600">
              <Zap className="h-3 w-3" /> Auto-sync on
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2 bg-primary hover:bg-primary/90 text-white h-8 text-sm px-2 sm:px-4"
            data-testid="button-sync-now"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{syncMutation.isPending ? "Syncing..." : "Sync Now"}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" data-testid="button-email-actions-menu">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  if (primaryEmail) setQuickClientEmailForLink(primaryEmail.id);
                  setQuickClientDialogOpen(true);
                }}
                data-testid="menu-new-company"
              >
                <Building2 className="h-3.5 w-3.5 mr-2 text-gray-500" /> New Company
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setAddContactDialogOpen(true)}
                data-testid="menu-new-contact"
              >
                <UserPlus className="h-3.5 w-3.5 mr-2 text-gray-500" /> New Contact
              </DropdownMenuItem>
              {isAdminOrAbove && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setHandoffDialogOpen(true)}
                    data-testid="menu-handoff"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 mr-2 text-gray-500" /> Employee Handoff
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowSuppressedManagement(true)}
                    data-testid="menu-suppressed"
                  >
                    <Ban className="h-3.5 w-3.5 mr-2 text-gray-500" /> Manage Suppressed
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter bar + search */}
      <div className="px-5 py-2 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {/* Sort mode toggle */}
            <button
              onClick={() => setSortMode(prev => { const next = prev === "newest" ? "needs_action" : "newest"; localStorage.setItem("emailSortMode", next); return next; })}
              data-testid="button-sort-mode"
              title="Toggle sort: Needs Action First"
              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1 ${
                sortMode === "needs_action" ? "bg-primary text-white" : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              <SortAsc className="h-3 w-3" />
              {sortMode === "needs_action" ? "Oldest First" : "Newest First"}
            </button>
            <button
              onClick={() => setAssigneeFilter(prev => prev === "mine" ? "all" : "mine")}
              data-testid="filter-assigned-mine"
              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1 ${
                assigneeFilter === "mine" ? "bg-blue-500 text-white" : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
              }`}
            >
              <UserCheck className="h-3 w-3" />
              Assigned to Me
            </button>
            <button
              onClick={() => setAssigneeFilter(prev => prev === "unassigned" ? "all" : "unassigned")}
              data-testid="filter-unassigned"
              className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1 ${
                assigneeFilter === "unassigned" ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
              }`}
            >
              <Users className="h-3 w-3" />
              Unassigned
            </button>
            {needsResponseCount > 0 && (
              <button
                onClick={() => setNeedsResponseOnly(!needsResponseOnly)}
                data-testid="filter-needs-response"
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1 ${
                  needsResponseOnly ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <AlertCircle className="h-3 w-3" />
                Needs Response ({needsResponseCount})
              </button>
            )}
            {hasTasksCount > 0 && (
              <button
                onClick={() => setHasTasksOnly(!hasTasksOnly)}
                data-testid="filter-has-tasks"
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1 ${
                  hasTasksOnly ? "bg-indigo-500 text-white" : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                }`}
              >
                <Check className="h-3 w-3" />
                Has Tasks ({hasTasksCount})
              </button>
            )}
            {unlinkedCount > 0 && (
              <button
                onClick={() => setUnlinkedOnly(!unlinkedOnly)}
                data-testid="filter-unlinked"
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1 ${
                  unlinkedOnly ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                }`}
              >
                <UserPlus className="h-3 w-3" />
                Unlinked ({unlinkedCount})
              </button>
            )}
            {dismissedCount > 0 && (
              <button
                onClick={() => setShowDismissed(!showDismissed)}
                data-testid="filter-dismissed"
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1 ${
                  showDismissed ? "bg-gray-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {showDismissed ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Dismissed ({dismissedCount})
              </button>
            )}
            {/* Request type filter */}
            {(["quote_request","support_issue","complaint","general_inquiry","follow_up","other"] as const).map(rt => {
              const count = allThreads.filter(t => t.messages.some(m => m.requestType === rt)).length;
              if (count === 0) return null;
              const labels: Record<string, string> = { quote_request: "Quote", support_issue: "Support", complaint: "Complaint", general_inquiry: "Inquiry", follow_up: "Follow-up", other: "Other" };
              return (
                <button
                  key={rt}
                  onClick={() => setRequestTypeFilter(prev => prev === rt ? "" : rt)}
                  data-testid={`filter-request-type-${rt}`}
                  className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1 ${
                    requestTypeFilter === rt ? "bg-indigo-500 text-white" : "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  {labels[rt]} ({count})
                </button>
              );
            })}
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search emails..."
              className="h-7 pl-8 pr-7 text-xs w-44 bg-gray-50 border-gray-200"
              data-testid="input-email-search"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        {searchQuery && (
          <p className="text-xs text-gray-400 mt-1.5">{filteredThreads.length} thread{filteredThreads.length !== 1 ? "s" : ""} found</p>
        )}
      </div>

      {/* Three-column body */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Thread list — full-width on mobile, fixed 320px on md+ */}
        <div className={`${selectedThread ? "hidden md:flex" : "flex"} w-full md:w-80 md:shrink-0 border-r border-gray-200 bg-white flex-col overflow-hidden`}>
          {/* View filter tabs — always at top, never scrolls */}
          {!isLoading && allThreads.length > 0 && (
            <div className="shrink-0 flex border-b border-gray-200 bg-white" data-testid="email-view-tabs">
              {([
                { key: "all" as const, label: "All", count: filteredThreads.length, icon: null },
                { key: "customers" as const, label: "Customers", count: customerThreads.length, icon: <Building2 className="h-3 w-3" /> },
                { key: "other" as const, label: "Other", count: otherThreads.length, icon: <Mail className="h-3 w-3" /> },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setViewFilter(tab.key)}
                  data-testid={`tab-${tab.key}`}
                  className={`flex-1 px-3 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                    viewFilter === tab.key
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                    viewFilter === tab.key ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Scrollable thread list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <Mail className="h-8 w-8 text-gray-300 mb-3" />
                {emails.filter(e => !e.isDismissed).length === 0 ? (
                  <>
                    <p className="text-sm font-semibold text-gray-600">No emails synced yet</p>
                    <p className="text-xs text-gray-400 mt-1">Click Sync Now to pull your Gmail</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No emails match this filter</p>
                )}
              </div>
            ) : (
              <>
                {visibleThreads.length > 0 ? visibleThreads.map(thread => (
                  <ThreadRow
                    key={thread.threadId}
                    thread={thread}
                    clients={clients}
                    directoryUsers={directoryUsers}
                    isSelected={thread.threadId === selectedThreadId}
                    isChecked={selectedThreadIds.has(thread.threadId)}
                    showCheckboxes={selectedThreadIds.size > 0}
                    onSelect={() => { setSelectedThreadId(thread.threadId); setMobileDeselected(false); }}
                    onToggleCheck={(e) => {
                      e.stopPropagation();
                      setSelectedThreadIds(prev => {
                        const next = new Set(prev);
                        if (next.has(thread.threadId)) next.delete(thread.threadId);
                        else next.add(thread.threadId);
                        return next;
                      });
                    }}
                  />
                )) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                    <Mail className="h-8 w-8 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No emails match this filter</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bulk Action Bar */}
          {selectedThreadIds.size > 0 && (
            <div className="sticky bottom-0 border-t border-gray-200 bg-white px-3 py-2 flex items-center gap-2 shadow-sm">
              <span className="text-xs text-gray-600 font-medium flex-1">{selectedThreadIds.size} selected</span>
              <button
                onClick={bulkBlockSenders}
                className="text-xs px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors whitespace-nowrap"
                data-testid="button-bulk-block"
              >
                <Ban className="h-3 w-3 inline mr-0.5" /> Block
              </button>
              <button
                onClick={bulkDismiss}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                data-testid="button-bulk-dismiss"
              >
                Dismiss
              </button>
              <button
                onClick={() => setSelectedThreadIds(new Set())}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                data-testid="button-bulk-clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Blocked Senders Panel */}
          {dismissedSenders.length > 0 && (
            <div className="border-t border-gray-200 shrink-0">
              <button
                onClick={() => setShowBlockedSenders(!showBlockedSenders)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                data-testid="button-toggle-blocked-senders"
              >
                <span className="flex items-center gap-1.5">
                  <Ban className="h-3 w-3" />
                  Blocked Senders ({dismissedSenders.length})
                </span>
                {showBlockedSenders ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showBlockedSenders && (
                <div className="px-3 pb-2 space-y-1 max-h-40 overflow-y-auto">
                  {dismissedSenders.map(ds => (
                    <div key={ds.id} className="flex items-center justify-between text-xs py-0.5">
                      <span className={`truncate ${ds.emailAddress.startsWith("@") ? "text-orange-600 font-medium" : "text-gray-600"}`}>
                        {ds.emailAddress.startsWith("@") ? `All from ${ds.emailAddress}` : ds.emailAddress}
                      </span>
                      <button
                        onClick={() => removeDismissedSenderMutation.mutate(ds.emailAddress)}
                        className="ml-2 shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                        data-testid={`button-unblock-sender-${ds.id}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CENTER: Email messages — hidden on mobile when no thread selected */}
        <div className={`${!selectedThread ? "hidden md:flex md:flex-col" : "flex flex-col"} flex-1 overflow-y-auto`}>
          {!selectedThread ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <Mail className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm">Select a thread to view details</p>
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              {/* Mobile back button */}
              <button
                onClick={() => { setSelectedThreadId(null); setMobileDeselected(true); }}
                className="md:hidden flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3 -ml-1"
                data-testid="button-email-back"
              >
                <ChevronLeft className="h-4 w-4" />
                All emails
              </button>
              {/* Thread header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-gray-900 mb-1">{primaryEmail?.subject ?? "(no subject)"}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedThread.messages.length > 1 && (
                      <span className="text-xs text-gray-500">{selectedThread.messages.length} messages</span>
                    )}
                    {matchedClient && (
                      <Link href={`/customers/${matchedClient.id}`}>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/5 border border-primary/20 rounded-full px-2 py-0.5 hover:bg-primary/10 cursor-pointer">
                          <Building2 className="h-3 w-3" /> {matchedClient.name}
                        </span>
                      </Link>
                    )}
                    {matchedLead && (
                      <Link href={`/leads/${matchedLead.id}`}>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full px-2 py-0.5 hover:bg-indigo-100 cursor-pointer">
                          <ChevronRight className="h-3 w-3" /> {matchedLead.title}
                        </span>
                      </Link>
                    )}
                    {matchedContact && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                        {matchedContact.name}
                      </span>
                    )}
                  </div>
                </div>
                {/* Actions menu */}
                {primaryEmail && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-3 shrink-0" data-testid="button-thread-more">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      <DropdownMenuItem
                        onClick={() => dismissThreadMutation.mutate(selectedThread.threadId)}
                        data-testid="menu-dismiss-email"
                      >
                        <X className="h-3.5 w-3.5 mr-2 text-gray-500" /> Dismiss this thread
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => dismissSenderMutation.mutate(primaryEmail.fromEmail)}
                        data-testid="menu-dismiss-sender"
                      >
                        <EyeOff className="h-3.5 w-3.5 mr-2 text-gray-500" />
                        Block {primaryEmail.fromEmail}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => dismissSenderMutation.mutate("@" + primaryEmail.fromEmail.split("@")[1])}
                        className="text-orange-600"
                        data-testid="menu-dismiss-domain"
                      >
                        <Ban className="h-3.5 w-3.5 mr-2" />
                        Block all from @{primaryEmail.fromEmail.split("@")[1]}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Thread messages */}
              <div className="space-y-3 mb-4">
                {selectedThread.messages.map((msg, idx) => {
                  const isExpanded = expandedMessages.has(msg.id);
                  const isLatest = idx === 0;
                  return (
                    <div
                      key={msg.id}
                      className={`rounded-lg border bg-white ${isLatest ? "border-gray-300 shadow-sm" : "border-gray-200"}`}
                      data-testid={`message-${msg.id}`}
                    >
                      {/* Message header — always visible, clickable to toggle */}
                      <button
                        onClick={() => toggleMessageExpanded(msg.id)}
                        className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          {directionBadge(msg.direction)}
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800">
                              {msg.fromName ? `${msg.fromName} <${msg.fromEmail}>` : msg.fromEmail}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {format(new Date(msg.receivedAt), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 flex-wrap">
                            {sentimentBadge(msg.aiSentiment)}
                            {msg.requiresResponse && !msg.followUpReminderCreated && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                <AlertCircle className="h-3 w-3" /> Respond
                              </span>
                            )}
                            {msg.followUpReminderCreated && (
                              <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                                <Bell className="h-3 w-3" /> Reminded
                              </span>
                            )}
                            {msg.autoLinked && msg.clientId && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                                <Zap className="h-3 w-3" /> Linked
                              </span>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                      </button>

                      {/* Message body — only when expanded */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100">
                          {/* Email body */}
                          {msg.fullBody && (
                            <div className="mt-3 bg-white rounded-lg border border-gray-200 max-h-72 overflow-y-auto p-4">
                              <EmailBodyRenderer body={msg.fullBody} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}
        </div>

        {/* RIGHT: CRM Sidebar — hidden on mobile, shown on md+ */}
        {selectedThread && primaryEmail && (
          <div className="hidden md:flex w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto flex-col">
            <div className="p-4 space-y-4">

              {/* Thread Summary */}
              {primaryEmail.aiSummary && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Summary</p>
                    <div className="flex items-center gap-0.5">
                      {(["thumbs_up", "thumbs_down"] as const).map(type => {
                        const fbKey = `${primaryEmail.id}-summary`;
                        const given = aiFeedbackGiven[fbKey];
                        return (
                          <button key={type} onClick={() => submitFeedback(primaryEmail.id, "summary", type, primaryEmail.aiSummary?.slice(0, 100))} disabled={!!given}
                            className={`p-0.5 rounded transition-colors ${given === type ? (type === "thumbs_up" ? "text-green-600" : "text-red-500") : "text-gray-400 hover:text-gray-600 disabled:opacity-30"}`}>
                            {type === "thumbs_up" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-700 leading-relaxed">{primaryEmail.aiSummary}</p>
                  </div>
                </div>
              )}

              {/* Linked Records */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Linked Records</p>
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {/* Client */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editingLinkField === "client" ? (
                        <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                          <PopoverTrigger asChild>
                            <button className="w-full text-left text-xs bg-white border border-gray-300 rounded px-2 py-1 flex items-center justify-between gap-1 hover:border-gray-400 transition-colors" data-testid="select-link-client-inline">
                              <span className="truncate">{linkClientId && linkClientId !== "none" ? clients.find(c => String(c.id) === linkClientId)?.name ?? "Select..." : "None"}</span>
                              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search clients..." className="h-7 text-xs" />
                              <CommandList>
                                <CommandEmpty>No clients found</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem value="none" onSelect={() => { setLinkClientId("none"); setLinkLeadId(""); setClientComboOpen(false); }}>
                                    <Check className={`mr-2 h-3 w-3 ${!linkClientId || linkClientId === "none" ? "opacity-100" : "opacity-0"}`} /> None
                                  </CommandItem>
                                  {clients.map(c => (
                                    <CommandItem key={c.id} value={c.name} onSelect={() => { setLinkClientId(String(c.id)); setLinkLeadId(""); setClientComboOpen(false); }}>
                                      <Check className={`mr-2 h-3 w-3 ${linkClientId === String(c.id) ? "opacity-100" : "opacity-0"}`} /> {c.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : matchedClient ? (
                        <Link href={`/customers/${matchedClient.id}`}>
                          <span className="text-xs font-medium text-primary hover:underline truncate block">{matchedClient.name}</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">No client</span>
                      )}
                    </div>
                    {editingLinkField === "client" ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { linkMutation.mutate({ id: primaryEmail.id, clientId: linkClientId && linkClientId !== "none" ? parseInt(linkClientId) : null, leadId: linkLeadId && linkLeadId !== "none" ? parseInt(linkLeadId) : null, contactId: linkContactId && linkContactId !== "none" ? parseInt(linkContactId) : null }); }} className="text-xs text-primary font-medium px-1.5 py-0.5 rounded bg-primary/5 hover:bg-primary/10 transition-colors">Save</button>
                        <button onClick={() => setEditingLinkField(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingLinkField("client")} className="text-gray-400 hover:text-gray-600 shrink-0 p-0.5 transition-colors" data-testid="button-edit-link-client"><Pencil className="h-3 w-3" /></button>
                    )}
                  </div>
                  {/* Deal */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editingLinkField === "deal" ? (
                        <Popover open={leadComboOpen} onOpenChange={setLeadComboOpen}>
                          <PopoverTrigger asChild>
                            <button className="w-full text-left text-xs bg-white border border-gray-300 rounded px-2 py-1 flex items-center justify-between gap-1 hover:border-gray-400 transition-colors" data-testid="select-link-lead-inline">
                              <span className="truncate">{linkLeadId && linkLeadId !== "none" ? availableLeads.find(l => String(l.id) === linkLeadId)?.title ?? "Select..." : "None"}</span>
                              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search deals..." className="h-7 text-xs" />
                              <CommandList>
                                <CommandEmpty>No deals found</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem value="none" onSelect={() => { setLinkLeadId("none"); setLeadComboOpen(false); }}>
                                    <Check className={`mr-2 h-3 w-3 ${!linkLeadId || linkLeadId === "none" ? "opacity-100" : "opacity-0"}`} /> None
                                  </CommandItem>
                                  {availableLeads.map(l => (
                                    <CommandItem key={l.id} value={l.title} onSelect={() => { setLinkLeadId(String(l.id)); setLeadComboOpen(false); }}>
                                      <Check className={`mr-2 h-3 w-3 ${linkLeadId === String(l.id) ? "opacity-100" : "opacity-0"}`} /> {l.title}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : matchedLead ? (
                        <Link href={`/leads/${matchedLead.id}`}>
                          <span className="text-xs font-medium text-indigo-700 hover:underline truncate block">{matchedLead.title}</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">No deal</span>
                      )}
                    </div>
                    {editingLinkField === "deal" ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { linkMutation.mutate({ id: primaryEmail.id, clientId: linkClientId && linkClientId !== "none" ? parseInt(linkClientId) : null, leadId: linkLeadId && linkLeadId !== "none" ? parseInt(linkLeadId) : null, contactId: linkContactId && linkContactId !== "none" ? parseInt(linkContactId) : null }); }} className="text-xs text-primary font-medium px-1.5 py-0.5 rounded bg-primary/5 hover:bg-primary/10 transition-colors">Save</button>
                        <button onClick={() => setEditingLinkField(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingLinkField("deal")} className="text-gray-400 hover:text-gray-600 shrink-0 p-0.5 transition-colors" data-testid="button-edit-link-deal"><Pencil className="h-3 w-3" /></button>
                    )}
                  </div>
                  {/* Contact */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <UserPlus className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {editingLinkField === "contact" ? (
                        <Popover open={contactComboOpen} onOpenChange={setContactComboOpen}>
                          <PopoverTrigger asChild>
                            <button className="w-full text-left text-xs bg-white border border-gray-300 rounded px-2 py-1 flex items-center justify-between gap-1 hover:border-gray-400 transition-colors" data-testid="select-link-contact-inline">
                              <span className="truncate">{linkContactId && linkContactId !== "none" ? contacts.find(c => String(c.id) === linkContactId)?.name ?? "Select..." : "None"}</span>
                              <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search contacts..." className="h-7 text-xs" />
                              <CommandList>
                                <CommandEmpty>No contacts found</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem value="none" onSelect={() => { setLinkContactId("none"); setContactComboOpen(false); }}>
                                    <Check className={`mr-2 h-3 w-3 ${!linkContactId || linkContactId === "none" ? "opacity-100" : "opacity-0"}`} /> None
                                  </CommandItem>
                                  {contacts.filter(c => !linkClientId || linkClientId === "none" || c.clientId === parseInt(linkClientId)).map(c => (
                                    <CommandItem key={c.id} value={c.name} onSelect={() => { setLinkContactId(String(c.id)); setContactComboOpen(false); }}>
                                      <Check className={`mr-2 h-3 w-3 ${linkContactId === String(c.id) ? "opacity-100" : "opacity-0"}`} /> {c.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : matchedContact ? (
                        <span className="text-xs font-medium text-gray-700 truncate block">{matchedContact.name}</span>
                      ) : (
                        <span className="text-xs text-gray-400">No contact</span>
                      )}
                    </div>
                    {editingLinkField === "contact" ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { linkMutation.mutate({ id: primaryEmail.id, clientId: linkClientId && linkClientId !== "none" ? parseInt(linkClientId) : null, leadId: linkLeadId && linkLeadId !== "none" ? parseInt(linkLeadId) : null, contactId: linkContactId && linkContactId !== "none" ? parseInt(linkContactId) : null }); }} className="text-xs text-primary font-medium px-1.5 py-0.5 rounded bg-primary/5 hover:bg-primary/10 transition-colors">Save</button>
                        <button onClick={() => setEditingLinkField(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X className="h-3 w-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingLinkField("contact")} className="text-gray-400 hover:text-gray-600 shrink-0 p-0.5 transition-colors" data-testid="button-edit-link-contact"><Pencil className="h-3 w-3" /></button>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignee + Request Type */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Thread Actions</p>
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {/* Assignee */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <UserCheck className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                      {isAdminOrAbove ? (
                        <Select
                          value={primaryEmail?.assignedUserId ?? "unassigned"}
                          onValueChange={val => primaryEmail && assignThreadMutation.mutate({ id: primaryEmail.id, assignedUserId: val === "unassigned" ? null : val })}
                        >
                          <SelectTrigger className="h-7 text-xs" data-testid="select-assignee">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {directoryUsers.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-gray-700">
                          {primaryEmail?.assignedUserId
                            ? (directoryUsers.find(u => u.id === primaryEmail.assignedUserId) ? `${directoryUsers.find(u => u.id === primaryEmail.assignedUserId)?.firstName ?? ""} ${directoryUsers.find(u => u.id === primaryEmail.assignedUserId)?.lastName ?? ""}`.trim() : "Assigned")
                            : "Unassigned"
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Request Type */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <Tag className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">Request Type</p>
                      <Select
                        value={primaryEmail?.requestType ?? "none"}
                        onValueChange={val => primaryEmail && requestTypeMutation.mutate({ id: primaryEmail.id, requestType: val === "none" ? null : val })}
                      >
                        <SelectTrigger className="h-7 text-xs" data-testid="select-request-type">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="quote_request">Quote Request</SelectItem>
                          <SelectItem value="support_issue">Support Issue</SelectItem>
                          <SelectItem value="complaint">Complaint</SelectItem>
                          <SelectItem value="general_inquiry">General Inquiry</SelectItem>
                          <SelectItem value="follow_up">Follow-up</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="space-y-1.5">
                <button
                  className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
                  onClick={() => setShowNotesPanel(!showNotesPanel)}
                  data-testid="button-toggle-notes"
                >
                  <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Internal Notes {threadNotes.length > 0 && <span className="bg-gray-200 text-gray-600 rounded-full px-1.5 text-[10px]">{threadNotes.length}</span>}</span>
                  {showNotesPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showNotesPanel && (
                  <div className="space-y-2">
                    {threadNotes.length > 0 && (
                      <div className="space-y-2">
                        {threadNotes.map(note => (
                          <div key={note.id} className="rounded-lg border border-gray-200 bg-yellow-50 px-3 py-2 relative group" data-testid={`note-${note.id}`}>
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-700">{note.userName}</p>
                                <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</p>
                              </div>
                              <button
                                onClick={() => deleteNoteMutation.mutate(note.id)}
                                className="shrink-0 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                data-testid={`delete-note-${note.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-xs text-gray-800 mt-1.5 leading-relaxed">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={newNoteContent}
                        onChange={e => setNewNoteContent(e.target.value)}
                        placeholder="Add internal note..."
                        className="h-7 text-xs flex-1"
                        data-testid="input-new-note"
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey && newNoteContent.trim() && selectedThreadId) {
                            e.preventDefault();
                            createNoteMutation.mutate({ gmailThreadId: selectedThreadId, content: newNoteContent.trim() });
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        disabled={!newNoteContent.trim() || createNoteMutation.isPending}
                        onClick={() => {
                          if (newNoteContent.trim() && selectedThreadId) {
                            createNoteMutation.mutate({ gmailThreadId: selectedThreadId, content: newNoteContent.trim() });
                          }
                        }}
                        data-testid="button-add-note"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* People in This Thread */}
              {(threadParticipants.external.length > 0 || threadParticipants.internal.length > 0) && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">People in This Thread</p>
                  <div className="space-y-2">
                    {threadParticipants.external.map(person => {
                      const contactMatch = contacts.find(c => c.email?.toLowerCase() === person.email.toLowerCase());
                      const connSugg = primaryEmail.aiConnectionSuggestions?.find(s => {
                        if (s.type !== "contact") return false;
                        const c = contacts.find(cx => cx.id === s.id);
                        return c?.email?.toLowerCase() === person.email.toLowerCase();
                      });
                      const createSugg = primaryEmail.aiCreateSuggestions?.find(s => s.email?.toLowerCase() === person.email.toLowerCase());
                      const isPendingConn = !!(pendingSuggestion && connSugg && pendingSuggestion.suggestion.id === connSugg.id);
                      return (
                        <div key={person.email} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                          <div className="flex items-start gap-2 px-3 py-2">
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-medium text-gray-500">{(person.name ?? person.email)[0].toUpperCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              {person.name && person.name !== person.email && (
                                <p className="text-xs font-medium text-gray-800 truncate">{person.name}</p>
                              )}
                              <p className="text-xs text-gray-500 truncate">{person.email}</p>
                              {contactMatch && (
                                <span className="inline-flex items-center gap-0.5 text-xs text-green-700 bg-green-50 rounded px-1 py-0 mt-0.5">
                                  <Check className="h-2.5 w-2.5" /> {contactMatch.name}
                                </span>
                              )}
                            </div>
                            {!contactMatch && !connSugg && !createSugg && (
                              <button
                                onClick={() => { const parts = (person.name ?? "").trim().split(" "); setNewContactFirstName(parts[0] ?? ""); setNewContactLastName(parts.slice(1).join(" ")); setNewContactEmail(person.email); setNewContactClientId(""); setAddContactDialogOpen(true); }}
                                className="shrink-0 text-xs text-gray-500 hover:text-primary border border-gray-200 hover:border-primary/30 rounded px-1.5 py-0.5 transition-colors whitespace-nowrap"
                                data-testid={`add-person-${person.email}`}
                              >
                                + Add
                              </button>
                            )}
                          </div>
                          {connSugg && (
                            <div className="border-t border-gray-100 px-3 py-2 bg-amber-50">
                              <p className="text-xs text-amber-700 mb-1.5">
                                <Zap className="h-3 w-3 inline mr-0.5" /> Match: <strong>{connSugg.name}</strong> — {connSugg.reason}
                              </p>
                              {isPendingConn ? (
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => { const u: any = {}; if (connSugg.type === "client") u.clientId = connSugg.id; else if (connSugg.type === "contact") u.contactId = connSugg.id; else u.leadId = connSugg.id; linkMutation.mutate({ id: primaryEmail.id, ...u }); setPendingSuggestion(null); }} className="text-xs px-2 py-0.5 bg-primary text-white rounded font-medium hover:bg-primary/90 transition-colors" data-testid={`confirm-suggestion-${connSugg.type}-${connSugg.id}`}>Confirm</button>
                                  <button onClick={() => setPendingSuggestion(null)} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">Cancel</button>
                                  <button onClick={() => { dismissConnectionSuggestionMutation.mutate({ emailId: primaryEmail.id, type: connSugg.type, suggestionId: connSugg.id }); setPendingSuggestion(null); }} className="ml-auto text-gray-400 hover:text-red-500 transition-colors" title="Dismiss"><X className="h-3 w-3" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => setPendingSuggestion({ msgId: primaryEmail.id, suggestion: connSugg })} className="text-xs px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 rounded font-medium hover:bg-amber-200 transition-colors" data-testid={`link-suggestion-${connSugg.type}-${connSugg.id}`}>Link</button>
                                  <div className="flex items-center gap-0.5 ml-auto">
                                    {(["thumbs_up", "thumbs_down"] as const).map(type => { const fbKey = `${primaryEmail.id}-connection-${connSugg.id}`; const given = aiFeedbackGiven[fbKey]; return (<button key={type} onClick={() => submitFeedback(primaryEmail.id, `connection-${connSugg.id}`, type)} disabled={!!given} className={`p-0.5 rounded transition-colors ${given === type ? (type === "thumbs_up" ? "text-green-600" : "text-red-500") : "text-gray-400 hover:text-gray-600 disabled:opacity-30"}`}>{type === "thumbs_up" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}</button>); })}
                                    <button onClick={() => dismissConnectionSuggestionMutation.mutate({ emailId: primaryEmail.id, type: connSugg.type, suggestionId: connSugg.id })} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors" title="Dismiss"><X className="h-3 w-3" /></button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {createSugg && !connSugg && (
                            <div className="border-t border-gray-100 px-3 py-2 bg-green-50">
                              <p className="text-xs text-green-700 mb-1.5"><UserPlus className="h-3 w-3 inline mr-0.5" /> Not in CRM — {createSugg.reason}</p>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => { const parts = createSugg.name.trim().split(" "); setNewContactFirstName(parts[0] ?? ""); setNewContactLastName(parts.slice(1).join(" ")); setNewContactEmail(createSugg.email ?? person.email); setNewContactClientId(""); setAddContactDialogOpen(true); }} className="text-xs px-2 py-0.5 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors">Add Contact</button>
                                <div className="flex items-center gap-0.5 ml-auto">
                                  {(["thumbs_up", "thumbs_down"] as const).map(type => { const fbKey = `${primaryEmail.id}-create_suggestion-${createSugg.name}`; const given = aiFeedbackGiven[fbKey]; return (<button key={type} onClick={() => submitFeedback(primaryEmail.id, `create_suggestion-${createSugg.name}`, type)} disabled={!!given} className={`p-0.5 rounded transition-colors ${given === type ? (type === "thumbs_up" ? "text-green-600" : "text-red-500") : "text-gray-400 hover:text-gray-600 disabled:opacity-30"}`}>{type === "thumbs_up" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}</button>); })}
                                  <button onClick={() => dismissCreateSuggestionMutation.mutate({ emailId: primaryEmail.id, name: createSugg.name })} className="p-0.5 text-gray-400 hover:text-red-500 transition-colors" title="Dismiss"><X className="h-3 w-3" /></button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {threadParticipants.internal.length > 0 && (
                      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <p className="text-xs text-gray-400 mb-1">M5 Team</p>
                        <div className="space-y-1">
                          {threadParticipants.internal.map(p => (
                            <div key={p.email} className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-medium text-primary">{(p.name ?? p.email)[0].toUpperCase()}</span>
                              </div>
                              <span className="text-xs text-gray-500 truncate">{p.name ?? p.email}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Remaining AI Connection Suggestions (not matched to thread participants) */}
              {(() => {
                const participantEmails = new Set(threadParticipants.external.map(p => p.email));
                const remaining = (primaryEmail.aiConnectionSuggestions ?? []).filter(s => {
                  if (s.type !== "contact") return true;
                  const c = contacts.find(cx => cx.id === s.id);
                  return !c?.email || !participantEmails.has(c.email.toLowerCase());
                });
                if (remaining.length === 0) return null;
                return (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Other Matches</p>
                    <div className="space-y-1.5">
                      {remaining.map((s, i) => {
                        const isPending = pendingSuggestion?.suggestion.id === s.id && pendingSuggestion?.suggestion.type === s.type;
                        return (
                          <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                            <div className="flex items-start gap-2 mb-1.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-amber-800">{s.type === "client" ? "🏢" : s.type === "lead" ? "📋" : "👤"} {s.name}</p>
                                <p className="text-xs text-amber-600 mt-0.5">{s.reason}</p>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                {(["thumbs_up", "thumbs_down"] as const).map(type => { const fbKey = `${primaryEmail.id}-connection-${s.id}`; const given = aiFeedbackGiven[fbKey]; return (<button key={type} onClick={() => submitFeedback(primaryEmail.id, `connection-${s.id}`, type)} disabled={!!given} className={`p-0.5 rounded transition-colors ${given === type ? (type === "thumbs_up" ? "text-green-600" : "text-red-500") : "text-amber-400 hover:text-amber-700 disabled:opacity-30"}`}>{type === "thumbs_up" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}</button>); })}
                                <button onClick={() => dismissConnectionSuggestionMutation.mutate({ emailId: primaryEmail.id, type: s.type, suggestionId: s.id })} className="p-0.5 text-amber-400 hover:text-red-500 transition-colors" title="Dismiss"><X className="h-3 w-3" /></button>
                              </div>
                            </div>
                            {isPending ? (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => { const u: any = {}; if (s.type === "client") u.clientId = s.id; else if (s.type === "contact") u.contactId = s.id; else u.leadId = s.id; linkMutation.mutate({ id: primaryEmail.id, ...u }); setPendingSuggestion(null); }} className="text-xs px-2 py-0.5 bg-primary text-white rounded font-medium hover:bg-primary/90 transition-colors" data-testid={`confirm-suggestion-${s.type}-${s.id}`}>Confirm</button>
                                <button onClick={() => setPendingSuggestion(null)} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setPendingSuggestion({ msgId: primaryEmail.id, suggestion: s })} className="text-xs px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 rounded font-medium hover:bg-amber-200 transition-colors" data-testid={`suggestion-${s.type}-${s.id}`}>Link</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Remaining Create Suggestions (not matched to thread participants) */}
              {(() => {
                const participantEmails = new Set(threadParticipants.external.map(p => p.email));
                const remaining = (primaryEmail.aiCreateSuggestions ?? []).filter(s => !s.email || !participantEmails.has(s.email.toLowerCase()));
                if (remaining.length === 0) return null;
                return (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Not in CRM</p>
                    <div className="space-y-1.5">
                      {remaining.map((s, i) => (
                        <div key={i} className="rounded-lg border border-green-200 bg-green-50 p-2.5">
                          <div className="flex items-start gap-2 mb-1.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 flex items-center gap-1">
                                {s.type === "client" ? <Building2 className="h-3 w-3 text-green-600 shrink-0" /> : <UserPlus className="h-3 w-3 text-green-600 shrink-0" />}
                                {s.name}
                              </p>
                              {s.email && <p className="text-xs text-gray-500">{s.email}</p>}
                              <p className="text-xs text-green-700 mt-0.5">{s.reason}</p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {(["thumbs_up", "thumbs_down"] as const).map(type => { const fbKey = `${primaryEmail.id}-create_suggestion-${s.name}`; const given = aiFeedbackGiven[fbKey]; return (<button key={type} onClick={() => submitFeedback(primaryEmail.id, `create_suggestion-${s.name}`, type)} disabled={!!given} className={`p-0.5 rounded transition-colors ${given === type ? (type === "thumbs_up" ? "text-green-600" : "text-red-500") : "text-green-400 hover:text-green-700 disabled:opacity-30"}`}>{type === "thumbs_up" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}</button>); })}
                              <button onClick={() => dismissCreateSuggestionMutation.mutate({ emailId: primaryEmail.id, name: s.name })} className="p-0.5 text-green-400 hover:text-red-500 transition-colors" title="Dismiss"><X className="h-3 w-3" /></button>
                            </div>
                          </div>
                          <button onClick={() => { if (s.type === "contact") { const parts = s.name.trim().split(" "); setNewContactFirstName(parts[0] ?? ""); setNewContactLastName(parts.slice(1).join(" ")); setNewContactEmail(s.email ?? ""); setNewContactClientId(""); setAddContactDialogOpen(true); } else { setQuickClientName(s.name); setQuickClientIndustry(""); setQuickClientEmailForLink(primaryEmail.id); setQuickClientDialogOpen(true); } }} className="text-xs px-2 py-0.5 bg-green-600 text-white rounded font-medium hover:bg-green-700 transition-colors">
                            {s.type === "client" ? "Add Company" : "Add Contact"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* AI Tasks + Stage buttons */}
              {((primaryEmail.aiSuggestedTasks?.length ?? 0) > 0 || (primaryEmail.aiStageSuggestion && primaryEmail.leadId)) && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  {(primaryEmail.aiSuggestedTasks?.length ?? 0) > 0 && (
                    <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1" onClick={() => setTaskDialogOpen(true)} data-testid="button-create-tasks">
                      <Plus className="h-3 w-3" /> Create Tasks ({primaryEmail.aiSuggestedTasks!.length})
                    </Button>
                  )}
                  {primaryEmail.aiStageSuggestion && primaryEmail.leadId && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => applyStageMutation.mutate({ id: primaryEmail.id, leadId: primaryEmail.leadId!, stage: primaryEmail.aiStageSuggestion! })} disabled={applyStageMutation.isPending} data-testid="button-update-stage">
                        <TrendingUp className="h-3 w-3" /> Stage → {primaryEmail.aiStageSuggestion.replace(/_/g, " ")}
                      </Button>
                      {(["thumbs_up", "thumbs_down"] as const).map(type => { const fbKey = `${primaryEmail.id}-stage`; const given = aiFeedbackGiven[fbKey]; return (<button key={type} onClick={() => submitFeedback(primaryEmail.id, "stage", type, primaryEmail.aiStageSuggestion ?? undefined)} disabled={!!given} className={`p-0.5 rounded transition-colors ${given === type ? (type === "thumbs_up" ? "text-green-600" : "text-red-500") : "text-gray-400 hover:text-gray-600 disabled:opacity-30"}`}>{type === "thumbs_up" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}</button>); })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Task Dialog */}
      {primaryEmail && (
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Tasks from AI Suggestions</DialogTitle></DialogHeader>
            <div className="space-y-2 py-2">
              {(primaryEmail.aiSuggestedTasks ?? []).map(task => (
                <div key={task.title} className="flex items-start gap-3 p-2.5 rounded border border-gray-200 bg-gray-50">
                  <Checkbox
                    id={`task-${task.title}`}
                    checked={selectedTasks.includes(task.title)}
                    onCheckedChange={() => setSelectedTasks(prev => prev.includes(task.title) ? prev.filter(t => t !== task.title) : [...prev, task.title])}
                    data-testid={`checkbox-task-${task.title}`}
                  />
                  <div className="flex-1">
                    <label htmlFor={`task-${task.title}`} className="text-sm font-medium cursor-pointer">{task.title}</label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Priority: {task.priority ?? "medium"}
                      {task.dueInDays ? ` · Due in ${task.dueInDays} day${task.dueInDays !== 1 ? "s" : ""}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                    {(["thumbs_up", "thumbs_down"] as const).map(type => {
                      const fbKey = `${primaryEmail.id}-task-${task.title}`;
                      const given = aiFeedbackGiven[fbKey];
                      return (
                        <button key={type} onClick={() => submitFeedback(primaryEmail.id, "task", type, task.title)} disabled={!!given}
                          className={`p-0.5 rounded transition-colors ${given === type ? (type === "thumbs_up" ? "text-green-600" : "text-red-500") : "text-gray-400 hover:text-gray-600 disabled:opacity-30"}`}>
                          {type === "thumbs_up" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { dismissTaskSuggestionMutation.mutate({ emailId: primaryEmail.id, title: task.title }); setSelectedTasks(prev => prev.filter(t => t !== task.title)); }}
                      className="p-0.5 text-gray-400 hover:text-red-500 transition-colors ml-0.5"
                      title="Remove this suggestion"
                      data-testid={`dismiss-task-${task.title}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  const toCreate = (primaryEmail.aiSuggestedTasks ?? []).filter(t => selectedTasks.includes(t.title));
                  if (toCreate.length > 0) createTasksMutation.mutate({ id: primaryEmail.id, tasks: toCreate });
                }}
                disabled={selectedTasks.length === 0 || createTasksMutation.isPending}
                data-testid="button-confirm-create-tasks"
              >
                {createTasksMutation.isPending ? "Creating..." : `Create ${selectedTasks.length} Task${selectedTasks.length !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


      {/* Add Contact Dialog */}
        <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add New Contact</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">First Name</Label>
                  <Input
                    className="h-8 text-sm"
                    value={newContactFirstName}
                    onChange={e => setNewContactFirstName(e.target.value)}
                    data-testid="input-contact-firstname"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Last Name</Label>
                  <Input
                    className="h-8 text-sm"
                    value={newContactLastName}
                    onChange={e => setNewContactLastName(e.target.value)}
                    data-testid="input-contact-lastname"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Email</Label>
                <Input
                  className="h-8 text-sm"
                  value={newContactEmail}
                  onChange={e => setNewContactEmail(e.target.value)}
                  data-testid="input-contact-email"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">Client *</Label>
                <Select value={newContactClientId} onValueChange={setNewContactClientId}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-contact-client">
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddContactDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!newContactClientId) { toast({ title: "Please select a client", variant: "destructive" }); return; }
                  addContactMutation.mutate({
                    firstName: newContactFirstName,
                    lastName: newContactLastName,
                    email: newContactEmail,
                    clientId: parseInt(newContactClientId),
                  });
                }}
                disabled={addContactMutation.isPending || !newContactClientId}
                data-testid="button-confirm-add-contact"
              >
                {addContactMutation.isPending ? "Creating..." : "Create Contact"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Employee Handoff Dialog */}
      <Dialog open={handoffDialogOpen} onOpenChange={(v) => { setHandoffDialogOpen(v); if (!v) { setHandoffPreviewThreads([]); setHandoffSelectedThreadIds(new Set()); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Employee Handoff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Transfer FROM</Label>
                <Select value={handoffFromUserId} onValueChange={async (val) => {
                  setHandoffFromUserId(val);
                  setHandoffPreviewThreads([]);
                  setHandoffSelectedThreadIds(new Set());
                  if (val) {
                    setHandoffLoading(true);
                    try {
                      const threads = await fetch(`/api/email/assigned-threads/${val}`, { credentials: "include" }).then(r => r.json());
                      setHandoffPreviewThreads(threads);
                      setHandoffSelectedThreadIds(new Set(threads.map((t: any) => t.gmailThreadId)));
                    } catch {} finally { setHandoffLoading(false); }
                  }
                }}>
                  <SelectTrigger data-testid="select-handoff-from">
                    <SelectValue placeholder="Select employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {directoryUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Reassign TO</Label>
                <Select value={handoffToUserId} onValueChange={setHandoffToUserId}>
                  <SelectTrigger data-testid="select-handoff-to">
                    <SelectValue placeholder="Select employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {directoryUsers.filter(u => u.id !== handoffFromUserId).map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {handoffLoading && (
              <div className="flex items-center justify-center py-4 text-gray-400 text-sm"><RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" /> Loading threads...</div>
            )}

            {handoffPreviewThreads.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">{handoffSelectedThreadIds.size} of {handoffPreviewThreads.length} threads selected</span>
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      if (handoffSelectedThreadIds.size === handoffPreviewThreads.length) {
                        setHandoffSelectedThreadIds(new Set());
                      } else {
                        setHandoffSelectedThreadIds(new Set(handoffPreviewThreads.map(t => t.gmailThreadId)));
                      }
                    }}
                    data-testid="button-handoff-select-all"
                  >
                    {handoffSelectedThreadIds.size === handoffPreviewThreads.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[300px]">
                  {handoffPreviewThreads.map(thread => {
                    const age = formatDistanceToNow(new Date(thread.receivedAt), { addSuffix: true });
                    const clientName = thread.clientId ? clients.find(c => c.id === thread.clientId)?.companyName : null;
                    return (
                      <label key={thread.gmailThreadId} className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-50 cursor-pointer" data-testid={`handoff-thread-${thread.gmailThreadId}`}>
                        <Checkbox
                          checked={handoffSelectedThreadIds.has(thread.gmailThreadId)}
                          onCheckedChange={(checked) => {
                            const next = new Set(handoffSelectedThreadIds);
                            if (checked) next.add(thread.gmailThreadId); else next.delete(thread.gmailThreadId);
                            setHandoffSelectedThreadIds(next);
                          }}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{thread.subject || "(no subject)"}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                            {clientName && <span className="text-gray-600">{clientName}</span>}
                            <span>{age}</span>
                            {thread.requiresResponse && <span className="text-amber-600 font-medium">Needs response</span>}
                            {thread.openTaskCount > 0 && <span className="text-indigo-600 font-medium">{thread.openTaskCount} open task{thread.openTaskCount > 1 ? "s" : ""}</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {handoffFromUserId && !handoffLoading && handoffPreviewThreads.length === 0 && (
              <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded p-3 text-center">
                No assigned threads found for this employee.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHandoffDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!handoffFromUserId || !handoffToUserId || handoffSelectedThreadIds.size === 0) return;
                handoffMutation.mutate({ fromUserId: handoffFromUserId, toUserId: handoffToUserId, gmailThreadIds: Array.from(handoffSelectedThreadIds) });
              }}
              disabled={!handoffFromUserId || !handoffToUserId || handoffSelectedThreadIds.size === 0 || handoffMutation.isPending}
              data-testid="button-confirm-handoff"
            >
              {handoffMutation.isPending ? "Transferring..." : `Transfer ${handoffSelectedThreadIds.size} Thread${handoffSelectedThreadIds.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppressed Sender Management Dialog */}
      <Dialog open={showSuppressedManagement} onOpenChange={setShowSuppressedManagement}>
        <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban className="h-4 w-4" /> Suppressed Senders</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500">These senders were auto-filtered as noise (no-reply, newsletters, alerts, etc.). You can restore any sender to make their emails visible again.</p>
          <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-[400px]">
            {suppressedSenders.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-8">No suppressed senders found.</div>
            ) : suppressedSenders.map(sender => (
              <div key={sender.email} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50" data-testid={`suppressed-sender-${sender.email}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{sender.email}</p>
                  <p className="text-xs text-gray-400 truncate">{sender.count} email{sender.count > 1 ? "s" : ""} · Latest: {sender.latestSubject || "(no subject)"}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs shrink-0 ml-2"
                  onClick={() => restoreSuppressedMutation.mutate(sender.email)}
                  disabled={restoreSuppressedMutation.isPending}
                  data-testid={`button-restore-${sender.email}`}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuppressedManagement(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick-create company dialog (from AI create suggestion) */}
      <Dialog open={quickClientDialogOpen} onOpenChange={v => { setQuickClientDialogOpen(v); if (!v) { setQuickClientName(""); setQuickClientIndustry(""); setQuickClientEmailForLink(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add New Company</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Company Name *</Label>
              <Input
                className="h-8 text-sm"
                placeholder="e.g. CBRE, Cushman & Wakefield"
                value={quickClientName}
                onChange={e => setQuickClientName(e.target.value)}
                data-testid="input-quick-client-name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Industry (optional)</Label>
              <Input
                className="h-8 text-sm"
                placeholder="e.g. Property Management"
                value={quickClientIndustry}
                onChange={e => setQuickClientIndustry(e.target.value)}
                data-testid="input-quick-client-industry"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickClientDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => quickClientMutation.mutate({ name: quickClientName, industry: quickClientIndustry })}
              disabled={quickClientMutation.isPending || !quickClientName.trim()}
              data-testid="button-confirm-quick-client"
            >
              {quickClientMutation.isPending ? "Creating..." : "Create & Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
