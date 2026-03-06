import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import {
  Mail,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  TrendingUp,
  Bell,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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
  aiSentiment: string | null;
  aiStageSuggestion: string | null;
  requiresResponse: boolean;
  followUpReminderCreated: boolean;
  isProcessed: boolean;
}

interface Client {
  id: number;
  name: string;
}

function sentimentBadge(sentiment: string | null) {
  switch (sentiment) {
    case "urgent":
      return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Urgent</Badge>;
    case "negative":
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">Negative</Badge>;
    case "positive":
      return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Positive</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">Neutral</Badge>;
  }
}

function directionBadge(direction: string) {
  if (direction === "inbound") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">
        <ArrowDownLeft className="h-3 w-3" /> Inbound
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
      <ArrowUpRight className="h-3 w-3" /> Outbound
    </span>
  );
}

function EmailCard({ email, clients }: { email: EmailMessage; clients: Client[] }) {
  const [expanded, setExpanded] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const { toast } = useToast();

  const createTasksMutation = useMutation({
    mutationFn: (tasks: { title: string; priority: string; dueInDays?: number }[]) =>
      apiRequest("POST", `/api/email-messages/${email.id}/create-tasks`, { tasks }),
    onSuccess: (data: any) => {
      toast({ title: `${data.length} task${data.length !== 1 ? "s" : ""} created successfully` });
      setTaskDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => toast({ title: "Failed to create tasks", variant: "destructive" }),
  });

  const applyStageMutation = useMutation({
    mutationFn: () =>
      apiRequest("PATCH", `/api/email-messages/${email.id}/apply-stage`, {
        leadId: email.leadId,
        stage: email.aiStageSuggestion,
      }),
    onSuccess: () => {
      toast({ title: "Lead stage updated" });
      setStageDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: () => toast({ title: "Failed to update stage", variant: "destructive" }),
  });

  const linkMutation = useMutation({
    mutationFn: (clientId: number) =>
      apiRequest("PATCH", `/api/email-messages/${email.id}/link`, { clientId }),
    onSuccess: () => {
      toast({ title: "Email linked to client" });
      setLinkDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
    },
    onError: () => toast({ title: "Failed to link email", variant: "destructive" }),
  });

  const matchedClient = email.clientId ? clients.find((c) => c.id === email.clientId) : null;
  const tasks = email.aiSuggestedTasks ?? [];

  const handleTaskToggle = (title: string) => {
    setSelectedTasks((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const handleCreateTasks = () => {
    const toCreate = tasks.filter((t) => selectedTasks.includes(t.title));
    if (toCreate.length === 0) return;
    createTasksMutation.mutate(toCreate);
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {directionBadge(email.direction)}
              {sentimentBadge(email.aiSentiment)}
              {email.requiresResponse && !email.followUpReminderCreated && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5" data-testid={`badge-needs-response-${email.id}`}>
                  <AlertCircle className="h-3 w-3" /> Needs Response
                </span>
              )}
              {email.followUpReminderCreated && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                  <Bell className="h-3 w-3" /> Reminder sent
                </span>
              )}
            </div>
            <p className="font-semibold text-gray-900 truncate text-sm" data-testid={`text-subject-${email.id}`}>
              {email.subject ?? "(no subject)"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {email.direction === "inbound" ? `From: ${email.fromName ?? email.fromEmail}` : `To: ${email.toEmails?.[0] ?? "—"}`}
              {" · "}
              {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">{format(new Date(email.receivedAt), "MMM d, h:mm a")}</p>
            {matchedClient && (
              <Link href={`/customers/${matchedClient.id}`}>
                <span className="inline-block mt-1 text-xs text-primary font-medium hover:underline cursor-pointer" data-testid={`link-client-${email.id}`}>
                  {matchedClient.name}
                </span>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {email.aiSummary && (
          <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded p-2.5 border border-gray-100" data-testid={`text-ai-summary-${email.id}`}>
            <span className="font-medium text-gray-700">AI: </span>{email.aiSummary}
          </p>
        )}

        {expanded && email.fullBody && (
          <div className="bg-gray-50 rounded p-3 border border-gray-100 max-h-64 overflow-y-auto">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{email.fullBody}</pre>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {tasks.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => { setSelectedTasks(tasks.map(t => t.title)); setTaskDialogOpen(true); }}
                data-testid={`button-create-tasks-${email.id}`}
              >
                <Plus className="h-3 w-3" /> Create Tasks ({tasks.length})
              </Button>
            )}
            {email.aiStageSuggestion && email.leadId && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setStageDialogOpen(true)}
                data-testid={`button-update-stage-${email.id}`}
              >
                <TrendingUp className="h-3 w-3" /> Update Stage
              </Button>
            )}
            {!email.clientId && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => setLinkDialogOpen(true)}
                data-testid={`button-link-client-${email.id}`}
              >
                <Mail className="h-3 w-3" /> Link to Client
              </Button>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-gray-500"
            onClick={() => setExpanded(!expanded)}
            data-testid={`button-expand-${email.id}`}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Collapse" : "View Email"}
          </Button>
        </div>
      </CardContent>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Tasks from AI Suggestions</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {tasks.map((task) => (
              <div key={task.title} className="flex items-start gap-3 p-2.5 rounded border border-gray-200 bg-gray-50">
                <Checkbox
                  id={`task-${task.title}`}
                  checked={selectedTasks.includes(task.title)}
                  onCheckedChange={() => handleTaskToggle(task.title)}
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
              onClick={handleCreateTasks}
              disabled={selectedTasks.length === 0 || createTasksMutation.isPending}
              data-testid="button-confirm-create-tasks"
            >
              {createTasksMutation.isPending ? "Creating..." : `Create ${selectedTasks.length} Task${selectedTasks.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Lead Stage</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-gray-600">
              Based on this email, AI suggests moving the lead to:
            </p>
            <p className="mt-2 text-base font-semibold text-primary capitalize">
              {email.aiStageSuggestion?.replace(/_/g, " ")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => applyStageMutation.mutate()}
              disabled={applyStageMutation.isPending}
              data-testid="button-confirm-stage"
            >
              {applyStageMutation.isPending ? "Updating..." : "Apply Stage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Link to Client</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>Select client</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger data-testid="select-link-client">
                <SelectValue placeholder="Choose a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedClient && linkMutation.mutate(parseInt(selectedClient))}
              disabled={!selectedClient || linkMutation.isPending}
              data-testid="button-confirm-link"
            >
              {linkMutation.isPending ? "Linking..." : "Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type FilterType = "all" | "inbound" | "outbound" | "needs_response";

export default function EmailSyncPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: emails = [], isLoading } = useQuery<EmailMessage[]>({
    queryKey: ["/api/email-messages"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/email/sync", {}),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      const parts = [`Synced ${data.totalSynced} emails (${data.newEmails} new)`];
      if (data.remindersCreated > 0) {
        parts.push(`${data.remindersCreated} follow-up reminder${data.remindersCreated !== 1 ? "s" : ""} created`);
      }
      toast({ title: parts.join(" · ") });
    },
    onError: (err: any) => {
      toast({
        title: "Sync failed",
        description: err.message ?? "Could not connect to Gmail. Please authorize Gmail in Settings.",
        variant: "destructive",
      });
    },
  });

  const filtered = emails.filter((e) => {
    if (filter === "inbound") return e.direction === "inbound";
    if (filter === "outbound") return e.direction === "outbound";
    if (filter === "needs_response") return e.requiresResponse && !e.followUpReminderCreated;
    return true;
  });

  const needsResponseCount = emails.filter((e) => e.requiresResponse && !e.followUpReminderCreated).length;

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "inbound", label: "Inbound" },
    { key: "outbound", label: "Outbound" },
    { key: "needs_response", label: `Needs Response${needsResponseCount > 0 ? ` (${needsResponseCount})` : ""}` },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Archivo Black, sans-serif" }}>
            Email Sync
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">AI-powered Gmail sync with client matching and follow-up reminders</p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="gap-2 bg-primary hover:bg-primary/90 text-white"
          data-testid="button-sync-now"
        >
          <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      <div className="px-6 py-3 border-b border-gray-100 bg-white shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              data-testid={`filter-${key}`}
              className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
                filter === key
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading emails...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Mail className="h-12 w-12 text-gray-300 mb-4" />
            {emails.length === 0 ? (
              <>
                <p className="text-lg font-semibold text-gray-700">No emails synced yet</p>
                <p className="text-sm text-gray-400 mt-1 max-w-sm">
                  Click <strong>Sync Now</strong> to import your last 30 days of Gmail. The AI will automatically match
                  emails to clients, suggest tasks, and flag emails that need a response.
                </p>
                <Button
                  className="mt-4 gap-2 bg-primary hover:bg-primary/90 text-white"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  data-testid="button-sync-empty"
                >
                  <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                  Sync Now
                </Button>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-gray-700">No emails match this filter</p>
                <p className="text-sm text-gray-400 mt-1">Try a different filter above.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {filtered.map((email) => (
              <EmailCard key={email.id} email={email} clients={clients} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
