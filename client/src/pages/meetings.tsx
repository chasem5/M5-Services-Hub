import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow } from "date-fns";
import { Mic, Plus, Trash2, ChevronRight, CheckCircle2, Clock, AlertCircle, Radio, CalendarDays, ExternalLink, ChevronDown, ChevronUp, Target, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Lead, Client, ClientContact, User } from "@shared/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  htmlLink: string | null;
  allDay: boolean;
}

function formatEventTime(startTime: string, allDay: boolean): string {
  if (!startTime) return "";
  const d = new Date(startTime);
  if (allDay) return format(d, "MMM d");
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow at ${format(d, "h:mm a")}`;
  return format(d, "EEE MMM d, h:mm a");
}

type MeetingWithCounts = {
  id: number;
  title: string;
  date: string;
  status: string;
  summary: string | null;
  rawTranscript: string | null;
  actionCount: number;
  pendingCount: number;
};

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  recording: {
    label: "Recording",
    badge: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
    icon: <Radio className="h-3 w-3" />,
  },
  stopped: {
    label: "Needs Analysis",
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  processing: {
    label: "Processing",
    badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <Clock className="h-3 w-3" />,
  },
  review: {
    label: "Needs Review",
    badge: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  complete: {
    label: "Complete",
    badge: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
};

export default function MeetingsPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<number[]>([]);
  const [selectedAttendeeUserIds, setSelectedAttendeeUserIds] = useState<string[]>([]);
  const [attendeeTab, setAttendeeTab] = useState<"internal" | "external">("internal");
  const [deleteTarget, setDeleteTarget] = useState<MeetingWithCounts | null>(null);
  const [eventsExpanded, setEventsExpanded] = useState(true);

  const { data: meetings = [], isLoading } = useQuery<MeetingWithCounts[]>({
    queryKey: ["/api/meetings"],
  });

  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events"],
    enabled: !!currentUser?.calendarConnected,
    staleTime: 5 * 60 * 1000,
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: allContacts = [] } = useQuery<ClientContact[]>({
    queryKey: ["/api/client-contacts"],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const companyContacts = selectedClientId
    ? allContacts.filter(c => c.clientId === parseInt(selectedClientId))
    : allContacts;

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; leadId?: number; clientId?: number; attendeeContactIds?: number[]; attendeeUserIds?: string[] }) => {
      const res = await apiRequest("POST", "/api/meetings", data);
      return res.json();
    },
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setIsNewOpen(false);
      setNewTitle("");
      setSelectedLeadId("");
      setSelectedClientId("");
      setSelectedAttendeeIds([]);
      setSelectedAttendeeUserIds([]);
      navigate(`/meetings/${meeting.id}`);
    },
    onError: () => toast({ title: "Failed to create meeting", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/meetings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setDeleteTarget(null);
      toast({ title: "Meeting deleted" });
    },
    onError: () => toast({ title: "Failed to delete meeting", variant: "destructive" }),
  });

  const handleCreate = () => {
    if (newTitle.trim()) {
      createMutation.mutate({
        title: newTitle.trim(),
        leadId: selectedLeadId ? parseInt(selectedLeadId) : undefined,
        clientId: selectedClientId ? parseInt(selectedClientId) : undefined,
        attendeeContactIds: selectedAttendeeIds.length > 0 ? selectedAttendeeIds : undefined,
        attendeeUserIds: selectedAttendeeUserIds.length > 0 ? selectedAttendeeUserIds : undefined,
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-4 bg-background border-b shadow-sm shrink-0">
        <div>
          <h1 className="text-2xl font-heading font-bold">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered meeting notes &amp; action items
          </p>
        </div>
        <Button onClick={() => setIsNewOpen(true)} data-testid="button-new-meeting">
          <Plus className="h-4 w-4 mr-1" />
          New Meeting
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Upcoming Calendar Events Panel */}
        {currentUser?.calendarConnected && (
          <div className="max-w-3xl mx-auto mb-6">
            <div className="bg-white dark:bg-card border border-border/60 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                onClick={() => setEventsExpanded((v) => !v)}
                data-testid="button-toggle-events"
              >
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">Upcoming Events</span>
                  {calendarEvents.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] font-bold h-4 px-1.5">
                      {calendarEvents.length}
                    </Badge>
                  )}
                </div>
                {eventsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {eventsExpanded && (
                <div className="border-t border-border/60">
                  {eventsLoading ? (
                    <div className="p-4 space-y-2">
                      {[1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
                    </div>
                  ) : calendarEvents.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                      No upcoming events in the next 7 days
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {calendarEvents.map((event) => (
                        <div key={event.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors" data-testid={`row-event-${event.id}`}>
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0 mt-0.5">
                            <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground">{formatEventTime(event.startTime, event.allDay)}</p>
                            {event.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{event.description}</p>
                            )}
                          </div>
                          {event.htmlLink && (
                            <a
                              href={event.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors shrink-0 mt-1"
                              data-testid={`link-event-${event.id}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3 max-w-3xl mx-auto">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mic className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-heading font-semibold text-xl mb-2">No meetings yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Start a meeting to record audio or paste a transcript. The AI will extract tasks, deals, and action items for you to review.
            </p>
            <Button onClick={() => setIsNewOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Start First Meeting
            </Button>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl mx-auto">
            {meetings.map((meeting) => {
              const config = STATUS_CONFIG[meeting.status] ?? STATUS_CONFIG.recording;
              return (
                <div
                  key={meeting.id}
                  className="bg-white dark:bg-card border border-border/60 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all group"
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                  data-testid={`card-meeting-${meeting.id}`}
                >
                  {/* Icon */}
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                    meeting.status === "recording" ? "bg-red-100 dark:bg-red-900/30" :
                    meeting.status === "review" ? "bg-orange-100 dark:bg-orange-900/30" :
                    meeting.status === "complete" ? "bg-green-100 dark:bg-green-900/30" :
                    "bg-blue-100 dark:bg-blue-900/30"
                  )}>
                    <Mic className={cn(
                      "h-5 w-5",
                      meeting.status === "recording" ? "text-red-600" :
                      meeting.status === "review" ? "text-orange-600" :
                      meeting.status === "complete" ? "text-green-600" :
                      "text-blue-600"
                    )} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm truncate">{meeting.title}</p>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] font-bold flex items-center gap-1 shrink-0", config.badge)}
                        data-testid={`badge-status-${meeting.id}`}
                      >
                        {config.icon}
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{format(new Date(meeting.date), "MMM d, yyyy 'at' h:mm a")}</span>
                      {meeting.actionCount > 0 && (
                        <span className="flex items-center gap-1">
                          {meeting.pendingCount > 0 ? (
                            <span className="text-orange-600 font-medium">{meeting.pendingCount} pending review</span>
                          ) : (
                            <span className="text-green-600 font-medium">{meeting.actionCount} items complete</span>
                          )}
                        </span>
                      )}
                    </div>
                    {meeting.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{meeting.summary}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(meeting); }}
                      data-testid={`button-delete-meeting-${meeting.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Meeting Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Meeting</DialogTitle>
            <DialogDescription>Give your meeting a title so you can find it later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Meeting Title</Label>
              <Input
                id="title"
                autoFocus
                placeholder="e.g. Q2 Review with Acme Corp"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                data-testid="input-meeting-title"
              />
            </div>

            {/* Attendees — tabbed: Internal (M5 Users) / External (Contacts) */}
            <div className="space-y-2">
              <Label>Attendees</Label>
              <div className="border rounded-lg overflow-hidden">
                <div className="flex border-b bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setAttendeeTab("internal")}
                    className={cn("flex-1 px-3 py-2 text-xs font-medium transition-colors", attendeeTab === "internal" ? "bg-background text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
                    data-testid="tab-internal-attendees"
                  >
                    M5 Team {selectedAttendeeUserIds.length > 0 && <span className="ml-1 bg-primary/15 text-primary rounded-full px-1.5 py-0.5 text-[10px]">{selectedAttendeeUserIds.length}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendeeTab("external")}
                    className={cn("flex-1 px-3 py-2 text-xs font-medium transition-colors", attendeeTab === "external" ? "bg-background text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
                    data-testid="tab-external-attendees"
                  >
                    External {selectedAttendeeIds.length > 0 && <span className="ml-1 bg-primary/15 text-primary rounded-full px-1.5 py-0.5 text-[10px]">{selectedAttendeeIds.length}</span>}
                  </button>
                </div>

                {attendeeTab === "internal" && (
                  <div className="max-h-40 overflow-y-auto divide-y">
                    {allUsers.length === 0 && (
                      <p className="text-xs text-muted-foreground p-3 text-center">No team members found.</p>
                    )}
                    {allUsers.map(u => (
                      <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                        <Checkbox
                          id={`user-attendee-${u.id}`}
                          checked={selectedAttendeeUserIds.includes(u.id)}
                          onCheckedChange={(checked) => {
                            setSelectedAttendeeUserIds(prev =>
                              checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                            );
                          }}
                          data-testid={`checkbox-user-attendee-${u.id}`}
                        />
                        <label htmlFor={`user-attendee-${u.id}`} className="flex flex-col cursor-pointer flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">
                            {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate">{u.email}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {attendeeTab === "external" && (
                  <div>
                    <div className="px-3 pt-2.5 pb-1.5 border-b bg-muted/20">
                      <p className="text-[11px] text-muted-foreground mb-2">Filter by company (optional)</p>
                      <SearchableSelect
                        options={[{ value: "", label: "All contacts" }, ...clients.map(c => ({ value: c.id.toString(), label: c.name }))]}
                        value={selectedClientId}
                        onChange={(val) => {
                          setSelectedClientId(val);
                          setSelectedAttendeeIds([]);
                        }}
                        placeholder="Filter by company..."
                        data-testid="select-related-client"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y">
                      {companyContacts.length === 0 && (
                        <p className="text-xs text-muted-foreground p-3 text-center">No contacts found.</p>
                      )}
                      {companyContacts.map(contact => (
                        <div key={contact.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                          <Checkbox
                            id={`attendee-${contact.id}`}
                            checked={selectedAttendeeIds.includes(contact.id)}
                            onCheckedChange={(checked) => {
                              setSelectedAttendeeIds(prev =>
                                checked ? [...prev, contact.id] : prev.filter(id => id !== contact.id)
                              );
                            }}
                            data-testid={`checkbox-attendee-${contact.id}`}
                          />
                          <label htmlFor={`attendee-${contact.id}`} className="flex flex-col cursor-pointer flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">{contact.name}</span>
                            {contact.title && <span className="text-[11px] text-muted-foreground truncate">{contact.title}</span>}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {(selectedAttendeeUserIds.length + selectedAttendeeIds.length) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedAttendeeUserIds.length + selectedAttendeeIds.length} attendee{(selectedAttendeeUserIds.length + selectedAttendeeIds.length) !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Optional link to deal */}
            <div className="space-y-2">
              <Label>Related Deal (Optional)</Label>
              <SearchableSelect
                options={[{ value: "", label: "None" }, ...leads.map(l => ({
                  value: l.id.toString(),
                  label: l.title,
                  sublabel: clients.find(c => c.id === l.clientId)?.name
                }))]}
                value={selectedLeadId}
                onChange={(val) => {
                  setSelectedLeadId(val);
                  const lead = leads.find(l => l.id.toString() === val);
                  if (lead?.clientId && attendeeTab === "external") {
                    setSelectedClientId(lead.clientId.toString());
                  }
                }}
                placeholder="Select a deal..."
                data-testid="select-related-deal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || createMutation.isPending}
              data-testid="button-start-meeting"
            >
              {createMutation.isPending ? "Starting…" : "Start Meeting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the meeting and all its AI suggestions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              data-testid="button-confirm-delete-meeting"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
