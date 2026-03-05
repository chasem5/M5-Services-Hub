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
import { format } from "date-fns";
import { Mic, Plus, Trash2, ChevronRight, CheckCircle2, Clock, AlertCircle, Radio } from "lucide-react";

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
  const [, navigate] = useLocation();
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MeetingWithCounts | null>(null);

  const { data: meetings = [], isLoading } = useQuery<MeetingWithCounts[]>({
    queryKey: ["/api/meetings"],
  });

  const createMutation = useMutation({
    mutationFn: async (title: string) => {
      const res = await apiRequest("POST", "/api/meetings", { title });
      return res.json();
    },
    onSuccess: (meeting) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings"] });
      setIsNewOpen(false);
      setNewTitle("");
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
    if (newTitle.trim()) createMutation.mutate(newTitle.trim());
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
              Start a meeting to record audio or paste a transcript. The AI will extract tasks, leads, and action items for you to review.
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
          <Input
            autoFocus
            placeholder="e.g. Q2 Review with Acme Corp"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            data-testid="input-meeting-title"
          />
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
