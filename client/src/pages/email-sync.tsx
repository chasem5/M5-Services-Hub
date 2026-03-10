import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import {
  Mail, RefreshCw, AlertCircle, Bell, ArrowDownLeft, ArrowUpRight,
  Plus, TrendingUp, MoreVertical, X, UserPlus, Link2, Zap, Building2,
  ChevronRight, Clock, Eye, EyeOff,
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

interface Client { id: number; name: string; }
interface Lead { id: number; title: string; clientId: number | null; }
interface Contact { id: number; name: string; email: string | null; clientId: number | null; }

function sentimentBadge(sentiment: string | null) {
  switch (sentiment) {
    case "urgent": return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-1.5 py-0">Urgent</Badge>;
    case "negative": return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs px-1.5 py-0">Negative</Badge>;
    case "positive": return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs px-1.5 py-0">Positive</Badge>;
    default: return <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-xs px-1.5 py-0">Neutral</Badge>;
  }
}

type FilterType = "all" | "inbound" | "outbound" | "needs_response";

export default function EmailSyncPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);
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

  const { data: emails = [], isLoading } = useQuery<EmailMessage[]>({
    queryKey: ["/api/email-messages", showDismissed],
    queryFn: () => fetch(`/api/email-messages${showDismissed ? "?includeDismissed=true" : ""}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: contacts = [] } = useQuery<Contact[]>({ queryKey: ["/api/client-contacts"] });
  const { data: syncStatus } = useQuery<{ lastSynced: string | null }>({
    queryKey: ["/api/email/sync-status"],
    refetchInterval: 60000,
  });

  const selectedEmail = emails.find(e => e.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && emails.length > 0) setSelectedId(emails[0].id);
  }, [emails]);

  useEffect(() => {
    if (selectedEmail) {
      const tasks = selectedEmail.aiSuggestedTasks ?? [];
      setSelectedTasks(tasks.map(t => t.title));
      const parts = selectedEmail.fromName?.split(" ") ?? [];
      setNewContactFirstName(parts[0] ?? "");
      setNewContactLastName(parts.slice(1).join(" ") ?? "");
      setNewContactEmail(selectedEmail.fromEmail ?? "");
      setLinkClientId(selectedEmail.clientId ? String(selectedEmail.clientId) : "");
      setLinkLeadId(selectedEmail.leadId ? String(selectedEmail.leadId) : "");
      setLinkContactId(selectedEmail.contactId ? String(selectedEmail.contactId) : "");
    }
  }, [selectedId]);

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
      setSelectedId(null);
      toast({ title: "Email dismissed" });
    },
  });

  const dismissSenderMutation = useMutation({
    mutationFn: (emailAddress: string) => apiRequest("POST", "/api/dismissed-senders", { emailAddress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      setSelectedId(null);
      toast({ title: "Sender dismissed — all emails from this address hidden" });
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
      if (selectedEmail) {
        linkMutation.mutate({ id: selectedEmail.id, contactId: newContact.id, clientId: newContact.clientId });
      }
      setAddContactDialogOpen(false);
      toast({ title: "Contact created and linked" });
    },
    onError: () => toast({ title: "Failed to create contact", variant: "destructive" }),
  });

  const filtered = emails.filter(e => {
    if (showDismissed) return e.isDismissed;
    if (filter === "inbound") return e.direction === "inbound" && !e.isDismissed;
    if (filter === "outbound") return e.direction === "outbound" && !e.isDismissed;
    if (filter === "needs_response") return e.requiresResponse && !e.followUpReminderCreated && !e.isDismissed;
    return !e.isDismissed;
  });

  const needsResponseCount = emails.filter(e => e.requiresResponse && !e.followUpReminderCreated && !e.isDismissed).length;
  const dismissedCount = emails.filter(e => e.isDismissed).length;

  const matchedClient = selectedEmail?.clientId ? clients.find(c => c.id === selectedEmail.clientId) : null;
  const matchedLead = selectedEmail?.leadId ? leads.find(l => l.id === selectedEmail.leadId) : null;
  const matchedContact = selectedEmail?.contactId ? contacts.find(c => c.id === selectedEmail.contactId) : null;
  const availableLeads = linkClientId ? leads.filter(l => l.clientId === parseInt(linkClientId)) : leads;

  const lastSyncedText = syncStatus?.lastSynced
    ? `Last synced ${formatDistanceToNow(new Date(syncStatus.lastSynced), { addSuffix: true })}`
    : "Never synced";

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

      {/* Filter bar */}
      <div className="px-5 py-2 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", "inbound", "outbound", "needs_response"] as FilterType[]).map(key => (
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
      </div>

      {/* Two-panel body */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Email list */}
        <div className="w-80 shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading...
            </div>
          ) : filtered.length === 0 ? (
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
            filtered.map(email => {
              const isSelected = email.id === selectedId;
              const client = email.clientId ? clients.find(c => c.id === email.clientId) : null;
              const hasSuggestions = (email.aiConnectionSuggestions?.length ?? 0) > 0 && !email.clientId;
              return (
                <div
                  key={email.id}
                  onClick={() => setSelectedId(email.id)}
                  data-testid={`email-row-${email.id}`}
                  className={`px-3 py-2.5 border-b border-gray-100 cursor-pointer transition-colors ${
                    isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-gray-50 border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {email.direction === "inbound"
                        ? <ArrowDownLeft className="h-3 w-3 text-blue-500 shrink-0" />
                        : <ArrowUpRight className="h-3 w-3 text-gray-400 shrink-0" />
                      }
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {email.direction === "inbound" ? (email.fromName ?? email.fromEmail) : (email.toEmails?.[0] ?? "—")}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{format(new Date(email.receivedAt), "MMM d")}</span>
                  </div>
                  <p className="text-xs text-gray-600 truncate font-medium">{email.subject ?? "(no subject)"}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{email.bodySnippet}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {email.requiresResponse && !email.followUpReminderCreated && (
                      <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 rounded px-1 py-0">
                        <AlertCircle className="h-2.5 w-2.5" /> Reply
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
                    {email.isDismissed && (
                      <span className="text-xs text-gray-400 italic">dismissed</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT: Email detail */}
        <div className="flex-1 overflow-y-auto">
          {!selectedEmail ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <Mail className="h-10 w-10 mb-3 text-gray-300" />
              <p className="text-sm">Select an email to view details</p>
            </div>
          ) : (
            <div className="p-5 max-w-3xl">
              {/* Detail header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {selectedEmail.direction === "inbound"
                      ? <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5"><ArrowDownLeft className="h-3 w-3" /> Inbound</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5"><ArrowUpRight className="h-3 w-3" /> Outbound</span>
                    }
                    {sentimentBadge(selectedEmail.aiSentiment)}
                    {selectedEmail.requiresResponse && !selectedEmail.followUpReminderCreated && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        <AlertCircle className="h-3 w-3" /> Needs Response
                      </span>
                    )}
                    {selectedEmail.followUpReminderCreated && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                        <Bell className="h-3 w-3" /> Reminder sent
                      </span>
                    )}
                    {selectedEmail.autoLinked && selectedEmail.clientId && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                        <Zap className="h-3 w-3" /> Auto-linked
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-gray-900">{selectedEmail.subject ?? "(no subject)"}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedEmail.direction === "inbound"
                      ? `From: ${selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.fromEmail}>` : selectedEmail.fromEmail}`
                      : `To: ${selectedEmail.toEmails?.join(", ") ?? "—"}`
                    }
                    {" · "}{format(new Date(selectedEmail.receivedAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                {/* Actions menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-3 shrink-0" data-testid={`button-more-${selectedEmail.id}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => dismissEmailMutation.mutate(selectedEmail.id)} data-testid={`menu-dismiss-email-${selectedEmail.id}`}>
                      <X className="h-3.5 w-3.5 mr-2 text-gray-500" /> Dismiss this email
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => dismissSenderMutation.mutate(selectedEmail.fromEmail)}
                      className="text-red-600"
                      data-testid={`menu-dismiss-sender-${selectedEmail.id}`}
                    >
                      <EyeOff className="h-3.5 w-3.5 mr-2" /> Dismiss all from {selectedEmail.fromEmail.split("@")[1]}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Linked records */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
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
                  data-testid={`button-link-${selectedEmail.id}`}
                >
                  <Link2 className="h-3 w-3" /> {matchedClient ? "Edit Links" : "Link Records"}
                </Button>
              </div>

              {/* AI connection suggestions */}
              {(selectedEmail.aiConnectionSuggestions?.length ?? 0) > 0 && !selectedEmail.clientId && (
                <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5" /> Possible Connections
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.aiConnectionSuggestions!.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const update: any = {};
                          if (s.type === "client") update.clientId = s.id;
                          else if (s.type === "contact") update.contactId = s.id;
                          else if (s.type === "lead") update.leadId = s.id;
                          linkMutation.mutate({ id: selectedEmail.id, ...update });
                        }}
                        data-testid={`suggestion-link-${i}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-900 bg-amber-100 border border-amber-300 rounded-full px-2 py-0.5 hover:bg-amber-200 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        {s.type === "client" ? <Building2 className="h-3 w-3" /> : null}
                        {s.name}
                        <span className="text-amber-600 font-normal">— {s.reason}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              {selectedEmail.aiSummary && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-1">AI Summary</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedEmail.aiSummary}</p>
                </div>
              )}

              {/* Email body */}
              {selectedEmail.fullBody && (
                <div className="mb-4 bg-white rounded-lg border border-gray-200 max-h-72 overflow-y-auto p-4">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{selectedEmail.fullBody}</pre>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {(selectedEmail.aiSuggestedTasks?.length ?? 0) > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setTaskDialogOpen(true)}
                    data-testid={`button-create-tasks-${selectedEmail.id}`}
                  >
                    <Plus className="h-3 w-3" /> Create Tasks ({selectedEmail.aiSuggestedTasks!.length})
                  </Button>
                )}
                {selectedEmail.aiStageSuggestion && selectedEmail.leadId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => applyStageMutation.mutate({ id: selectedEmail.id, leadId: selectedEmail.leadId!, stage: selectedEmail.aiStageSuggestion! })}
                    disabled={applyStageMutation.isPending}
                    data-testid={`button-update-stage-${selectedEmail.id}`}
                  >
                    <TrendingUp className="h-3 w-3" /> Update Stage → {selectedEmail.aiStageSuggestion.replace(/_/g, " ")}
                  </Button>
                )}
                {!selectedEmail.contactId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setAddContactDialogOpen(true)}
                    data-testid={`button-add-contact-${selectedEmail.id}`}
                  >
                    <UserPlus className="h-3 w-3" /> Add as Contact
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Dialog */}
      {selectedEmail && (
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Tasks from AI Suggestions</DialogTitle></DialogHeader>
            <div className="space-y-2 py-2">
              {(selectedEmail.aiSuggestedTasks ?? []).map(task => (
                <div key={task.title} className="flex items-start gap-3 p-2.5 rounded border border-gray-200 bg-gray-50">
                  <Checkbox
                    id={`task-${task.title}`}
                    checked={selectedTasks.includes(task.title)}
                    onCheckedChange={() => setSelectedTasks(prev => prev.includes(task.title) ? prev.filter(t => t !== task.title) : [...prev, task.title])}
                    data-testid={`checkbox-task-${task.title}`}
                  />
                  <div>
                    <label htmlFor={`task-${task.title}`} className="text-sm font-medium cursor-pointer">{task.title}</label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Priority: {task.priority ?? "medium"}
                      {task.dueInDays ? ` · Due in ${task.dueInDays} day${task.dueInDays !== 1 ? "s" : ""}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  const toCreate = (selectedEmail.aiSuggestedTasks ?? []).filter(t => selectedTasks.includes(t.title));
                  if (toCreate.length > 0) createTasksMutation.mutate({ id: selectedEmail.id, tasks: toCreate });
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
      {selectedEmail && (
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Link Records</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Client</Label>
                <Select value={linkClientId} onValueChange={v => { setLinkClientId(v); setLinkLeadId(""); }}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-link-client">
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Deal (optional)</Label>
                <Select value={linkLeadId} onValueChange={setLinkLeadId}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-link-lead">
                    <SelectValue placeholder="Select deal..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No deal</SelectItem>
                    {availableLeads.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-500">Contact (optional)</Label>
                <Select value={linkContactId} onValueChange={setLinkContactId}>
                  <SelectTrigger className="h-8 text-sm" data-testid="select-link-contact">
                    <SelectValue placeholder="Select contact..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No contact</SelectItem>
                    {contacts
                      .filter(c => !linkClientId || c.clientId === parseInt(linkClientId))
                      .map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => linkMutation.mutate({
                  id: selectedEmail.id,
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
      {selectedEmail && (
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
