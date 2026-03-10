import { useState, useEffect } from "react";
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
  Plus, TrendingUp, MoreVertical, X, UserPlus, Link2, Zap, Building2,
  ChevronRight, Clock, Eye, EyeOff, Search, Users, ChevronDown, ChevronUp, Ban,
  ThumbsUp, ThumbsDown, Check, ChevronsUpDown,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface ConnectionSuggestion {
  type: "client" | "contact" | "lead";
  id: number;
  name: string;
  confidence: "high" | "medium" | "low";
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
  aiSentiment: string | null;
  aiStageSuggestion: string | null;
  requiresResponse: boolean;
  followUpReminderCreated: boolean;
  isProcessed: boolean;
  isDismissed: boolean;
  autoLinked: boolean;
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

interface Client { id: number; name: string; }
interface Lead { id: number; title: string; clientId: number | null; }
interface Contact { id: number; name: string; email: string | null; clientId: number | null; }

function groupIntoThreads(emails: EmailMessage[]): EmailThread[] {
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

type FilterType = "all" | "inbound" | "outbound" | "cc" | "needs_response";

export default function EmailSyncPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const [showBlockedSenders, setShowBlockedSenders] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
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

  const { data: emails = [], isLoading } = useQuery<EmailMessage[]>({
    queryKey: ["/api/email-messages", showDismissed],
    queryFn: () => fetch(`/api/email-messages${showDismissed ? "?includeDismissed=true" : ""}`, { credentials: "include" }).then(r => r.json()),
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

  // Apply filter + search to emails
  const filteredEmails = emails.filter(e => {
    // Dismissed view
    if (showDismissed) return e.isDismissed;
    if (e.isDismissed) return false;

    // Direction filter
    if (filter === "inbound" && e.direction !== "inbound") return false;
    if (filter === "outbound" && e.direction !== "outbound") return false;
    if (filter === "cc" && e.direction !== "cc") return false;
    if (filter === "needs_response" && !(e.requiresResponse && !e.followUpReminderCreated)) return false;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const haystack = [e.subject, e.fromName, e.fromEmail, e.bodySnippet, e.aiSummary].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  const threads = groupIntoThreads(filteredEmails);
  const selectedThread = threads.find(t => t.threadId === selectedThreadId) ?? null;
  const primaryEmail = selectedThread?.latestMessage ?? null;

  // Auto-select first thread
  useEffect(() => {
    if (!selectedThreadId && threads.length > 0) {
      setSelectedThreadId(threads[0].threadId);
    }
  }, [threads.length]);

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
    }
  }, [selectedThreadId]);

  const needsResponseCount = emails.filter(e => e.requiresResponse && !e.followUpReminderCreated && !e.isDismissed).length;
  const ccCount = emails.filter(e => e.direction === "cc" && !e.isDismissed).length;
  const dismissedCount = emails.filter(e => e.isDismissed).length;

  const matchedClient = primaryEmail?.clientId ? clients.find(c => c.id === primaryEmail.clientId) : null;
  const matchedLead = primaryEmail?.leadId ? leads.find(l => l.id === primaryEmail.leadId) : null;
  const matchedContact = primaryEmail?.contactId ? contacts.find(c => c.id === primaryEmail.contactId) : null;
  const availableLeads = linkClientId ? leads.filter(l => l.clientId === parseInt(linkClientId)) : leads;

  const lastSyncedText = syncStatus?.lastSynced
    ? `Last synced ${formatDistanceToNow(new Date(syncStatus.lastSynced), { addSuffix: true })}`
    : "Never synced";

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

  const dismissEmailMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PATCH", `/api/email-messages/${id}/dismiss`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      setSelectedThreadId(null);
      toast({ title: "Email dismissed" });
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
      setLinkDialogOpen(false);
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
      apiRequest("POST", "/api/client-contacts", {
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

  const aiFeedbackMutation = useMutation({
    mutationFn: ({ emailId, feedbackType, feedbackContext, contentSnippet }: { emailId: number; feedbackType: string; feedbackContext: string; contentSnippet?: string }) =>
      apiRequest("POST", "/api/ai-feedback", { emailId, feedbackType, feedbackContext, contentSnippet }),
  });

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
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="gap-2 bg-primary hover:bg-primary/90 text-white h-8 text-sm"
          data-testid="button-sync-now"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Filter bar + search */}
      <div className="px-5 py-2 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {(["all", "inbound", "outbound", "cc", "needs_response"] as FilterType[]).map(key => (
              <button
                key={key}
                onClick={() => { setFilter(key); setShowDismissed(false); }}
                data-testid={`filter-${key}`}
                className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                  !showDismissed && filter === key ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {key === "all" && "All"}
                {key === "inbound" && "Inbound"}
                {key === "outbound" && "Outbound"}
                {key === "cc" && `CC'd${ccCount > 0 ? ` (${ccCount})` : ""}`}
                {key === "needs_response" && `Needs Response${needsResponseCount > 0 ? ` (${needsResponseCount})` : ""}`}
              </button>
            ))}
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
          <p className="text-xs text-gray-400 mt-1.5">{threads.length} thread{threads.length !== 1 ? "s" : ""} found</p>
        )}
      </div>

      {/* Two-panel body */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Thread list */}
        <div className="w-80 shrink-0 border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading...
              </div>
            ) : threads.length === 0 ? (
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
              threads.map(thread => {
                const isSelected = thread.threadId === selectedThreadId;
                const latest = thread.latestMessage;
                const client = latest.clientId ? clients.find(c => c.id === latest.clientId) : null;
                const hasSuggestions = (latest.aiConnectionSuggestions?.length ?? 0) > 0 && !latest.clientId;
                const isCC = thread.messages.every(m => m.direction === "cc");
                return (
                  <div
                    key={thread.threadId}
                    onClick={() => setSelectedThreadId(thread.threadId)}
                    data-testid={`thread-row-${thread.threadId}`}
                    className={`px-3 py-2.5 border-b border-gray-100 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-gray-50 border-l-2 border-l-transparent"
                    } ${isCC ? "opacity-70" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {latest.direction === "inbound"
                          ? <ArrowDownLeft className="h-3 w-3 text-blue-500 shrink-0" />
                          : latest.direction === "cc"
                          ? <Users className="h-3 w-3 text-gray-400 shrink-0" />
                          : <ArrowUpRight className="h-3 w-3 text-gray-400 shrink-0" />
                        }
                        <p className="text-xs font-semibold text-gray-800 truncate">{thread.senderNames}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {thread.messages.length > 1 && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0">{thread.messages.length}</span>
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
                        <span className="text-xs text-primary font-medium truncate">{client.name}</span>
                      )}
                      {latest.isDismissed && (
                        <span className="text-xs text-gray-400 italic">dismissed</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

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

        {/* RIGHT: Thread detail */}
        <div className="flex-1 overflow-y-auto">
          {!selectedThread ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <Mail className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm">Select a thread to view details</p>
            </div>
          ) : (
            <div className="p-5 max-w-3xl">
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs gap-1 rounded-full"
                      onClick={() => setLinkDialogOpen(true)}
                      data-testid={`button-link-thread`}
                    >
                      <Link2 className="h-3 w-3" /> {matchedClient ? "Edit Links" : "Link Records"}
                    </Button>
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
                        onClick={() => dismissEmailMutation.mutate(primaryEmail.id)}
                        data-testid="menu-dismiss-email"
                      >
                        <X className="h-3.5 w-3.5 mr-2 text-gray-500" /> Dismiss this email
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
                          {/* AI connection suggestions */}
                          {(msg.aiConnectionSuggestions?.length ?? 0) > 0 && !msg.clientId && (
                            <div className="mt-3 mb-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                                  <Zap className="h-3.5 w-3.5" /> Possible Connections
                                </p>
                                <div className="flex items-center gap-0.5">
                                  {(["thumbs_up", "thumbs_down"] as const).map(type => {
                                    const fbKey = `${msg.id}-connection`;
                                    const given = aiFeedbackGiven[fbKey];
                                    return (
                                      <button key={type} onClick={e => { e.stopPropagation(); submitFeedback(msg.id, "connection", type); }} disabled={!!given}
                                        className={`p-0.5 rounded transition-colors ${given === type ? (type === "thumbs_up" ? "text-green-600" : "text-red-500") : "text-amber-400 hover:text-amber-700 disabled:opacity-30"}`}>
                                        {type === "thumbs_up" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                {msg.aiConnectionSuggestions!.map((s, i) => {
                                  const isPending = pendingSuggestion?.msgId === msg.id && pendingSuggestion?.suggestion.id === s.id && pendingSuggestion?.suggestion.type === s.type;
                                  return (
                                    <div key={i} className="flex flex-col gap-1.5">
                                      <button
                                        onClick={e => {
                                          e.stopPropagation();
                                          if (!s.id) return;
                                          setPendingSuggestion(isPending ? null : { msgId: msg.id, suggestion: s });
                                        }}
                                        data-testid={`suggestion-${s.type}-${s.id}`}
                                        className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors text-left ${
                                          isPending ? "bg-amber-100 border-amber-400 text-amber-800" :
                                          s.confidence === "high" ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" :
                                          s.confidence === "medium" ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" :
                                          "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                                        }`}
                                      >
                                        {s.type === "client" ? "🏢" : s.type === "lead" ? "📋" : "👤"} {s.name}
                                        <span className="text-amber-600 font-normal"> — {s.reason}</span>
                                      </button>
                                      {isPending && (
                                        <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-2 shadow-sm" onClick={e => e.stopPropagation()}>
                                          <p className="text-xs text-gray-700 flex-1">
                                            Link this email to <strong>{s.name}</strong> ({s.type})?
                                          </p>
                                          <button
                                            onClick={e => {
                                              e.stopPropagation();
                                              const update: any = {};
                                              if (s.type === "client") update.clientId = s.id;
                                              else if (s.type === "contact") update.contactId = s.id;
                                              else if (s.type === "lead") update.leadId = s.id;
                                              linkMutation.mutate({ id: msg.id, ...update });
                                              setPendingSuggestion(null);
                                            }}
                                            className="px-2.5 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                                            data-testid={`confirm-suggestion-${s.type}-${s.id}`}
                                          >
                                            Confirm
                                          </button>
                                          <button
                                            onClick={e => { e.stopPropagation(); setPendingSuggestion(null); }}
                                            className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
                                            data-testid={`cancel-suggestion-${s.type}-${s.id}`}
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* AI Summary */}
                          {msg.aiSummary && (
                            <div className="mt-3 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-gray-500">AI Summary</p>
                                <div className="flex items-center gap-0.5">
                                  {(["thumbs_up", "thumbs_down"] as const).map(type => {
                                    const fbKey = `${msg.id}-summary`;
                                    const given = aiFeedbackGiven[fbKey];
                                    return (
                                      <button key={type} onClick={() => submitFeedback(msg.id, "summary", type, msg.aiSummary?.slice(0, 100))} disabled={!!given}
                                        className={`p-0.5 rounded transition-colors ${given === type ? (type === "thumbs_up" ? "text-green-600" : "text-red-500") : "text-gray-400 hover:text-gray-600 disabled:opacity-30"}`}>
                                        {type === "thumbs_up" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">{msg.aiSummary}</p>
                            </div>
                          )}

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

              {/* Action buttons — driven by the latest email's AI suggestions */}
              {primaryEmail && (
                <div className="flex items-center gap-2 flex-wrap">
                  {(primaryEmail.aiSuggestedTasks?.length ?? 0) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setTaskDialogOpen(true)}
                      data-testid="button-create-tasks"
                    >
                      <Plus className="h-3 w-3" /> Create Tasks ({primaryEmail.aiSuggestedTasks!.length})
                    </Button>
                  )}
                  {primaryEmail.aiStageSuggestion && primaryEmail.leadId && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => applyStageMutation.mutate({ id: primaryEmail.id, leadId: primaryEmail.leadId!, stage: primaryEmail.aiStageSuggestion! })}
                        disabled={applyStageMutation.isPending}
                        data-testid="button-update-stage"
                      >
                        <TrendingUp className="h-3 w-3" /> Update Stage → {primaryEmail.aiStageSuggestion.replace(/_/g, " ")}
                      </Button>
                      {(["thumbs_up", "thumbs_down"] as const).map(type => {
                        const fbKey = `${primaryEmail.id}-stage`;
                        const given = aiFeedbackGiven[fbKey];
                        return (
                          <button key={type} onClick={() => submitFeedback(primaryEmail.id, "stage", type, primaryEmail.aiStageSuggestion ?? undefined)} disabled={!!given}
                            className={`p-0.5 rounded transition-colors ${given === type ? (type === "thumbs_up" ? "text-green-600" : "text-red-500") : "text-gray-400 hover:text-gray-600 disabled:opacity-30"}`}>
                            {type === "thumbs_up" ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!primaryEmail.contactId && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => setAddContactDialogOpen(true)}
                      data-testid="button-add-contact"
                    >
                      <UserPlus className="h-3 w-3" /> Add as Contact
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
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

      {/* Link Records Dialog */}
      {primaryEmail && (
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Link Records</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              {/* Client — searchable combobox */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Client</Label>
                <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full h-8 text-sm justify-between font-normal" data-testid="select-link-client">
                      {linkClientId && linkClientId !== "none" ? clients.find(c => String(c.id) === linkClientId)?.name : "Select client..."}
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search clients..." className="h-8 text-sm" />
                      <CommandList>
                        <CommandEmpty>No clients found</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="none" onSelect={() => { setLinkClientId("none"); setLinkLeadId(""); setClientComboOpen(false); }}>
                            <Check className={`mr-2 h-3.5 w-3.5 ${!linkClientId || linkClientId === "none" ? "opacity-100" : "opacity-0"}`} />
                            No client
                          </CommandItem>
                          {clients.map(c => (
                            <CommandItem key={c.id} value={c.name} onSelect={() => { setLinkClientId(String(c.id)); setLinkLeadId(""); setClientComboOpen(false); }}>
                              <Check className={`mr-2 h-3.5 w-3.5 ${linkClientId === String(c.id) ? "opacity-100" : "opacity-0"}`} />
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {/* Deal — searchable combobox */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Deal (optional)</Label>
                <Popover open={leadComboOpen} onOpenChange={setLeadComboOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full h-8 text-sm justify-between font-normal" data-testid="select-link-lead">
                      {linkLeadId && linkLeadId !== "none" ? availableLeads.find(l => String(l.id) === linkLeadId)?.title : "Select deal..."}
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search deals..." className="h-8 text-sm" />
                      <CommandList>
                        <CommandEmpty>No deals found</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="none" onSelect={() => { setLinkLeadId("none"); setLeadComboOpen(false); }}>
                            <Check className={`mr-2 h-3.5 w-3.5 ${!linkLeadId || linkLeadId === "none" ? "opacity-100" : "opacity-0"}`} />
                            No deal
                          </CommandItem>
                          {availableLeads.map(l => (
                            <CommandItem key={l.id} value={l.title} onSelect={() => { setLinkLeadId(String(l.id)); setLeadComboOpen(false); }}>
                              <Check className={`mr-2 h-3.5 w-3.5 ${linkLeadId === String(l.id) ? "opacity-100" : "opacity-0"}`} />
                              {l.title}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {/* Contact — searchable combobox */}
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Contact (optional)</Label>
                <Popover open={contactComboOpen} onOpenChange={setContactComboOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full h-8 text-sm justify-between font-normal" data-testid="select-link-contact">
                      {linkContactId && linkContactId !== "none" ? contacts.find(c => String(c.id) === linkContactId)?.name : "Select contact..."}
                      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search contacts..." className="h-8 text-sm" />
                      <CommandList>
                        <CommandEmpty>No contacts found</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="none" onSelect={() => { setLinkContactId("none"); setContactComboOpen(false); }}>
                            <Check className={`mr-2 h-3.5 w-3.5 ${!linkContactId || linkContactId === "none" ? "opacity-100" : "opacity-0"}`} />
                            No contact
                          </CommandItem>
                          {contacts
                            .filter(c => !linkClientId || linkClientId === "none" || c.clientId === parseInt(linkClientId))
                            .map(c => (
                              <CommandItem key={c.id} value={c.name} onSelect={() => { setLinkContactId(String(c.id)); setContactComboOpen(false); }}>
                                <Check className={`mr-2 h-3.5 w-3.5 ${linkContactId === String(c.id) ? "opacity-100" : "opacity-0"}`} />
                                {c.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => linkMutation.mutate({
                  id: primaryEmail.id,
                  clientId: linkClientId && linkClientId !== "none" ? parseInt(linkClientId) : null,
                  leadId: linkLeadId && linkLeadId !== "none" ? parseInt(linkLeadId) : null,
                  contactId: linkContactId && linkContactId !== "none" ? parseInt(linkContactId) : null,
                })}
                disabled={linkMutation.isPending}
                data-testid="button-confirm-link"
              >
                {linkMutation.isPending ? "Saving..." : "Save Links"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Contact Dialog */}
      {primaryEmail && (
        <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add as New Contact</DialogTitle></DialogHeader>
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
                {addContactMutation.isPending ? "Creating..." : "Create & Link"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
