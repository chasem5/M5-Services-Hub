import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow } from "date-fns";
import {
  Megaphone,
  CheckSquare,
  Bell,
  Plus,
  Check,
  CheckCheck,
  AlertCircle,
  Users,
  Sparkles,
  Wand2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Announcement {
  id: number;
  title: string;
  message: string | null;
  priority: string;
  type: string;
  targetUserIds: string[] | null;
  createdBy: string;
  createdAt: string;
  isRead: boolean;
}

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface MyPermissions {
  role: string;
  isSuperAdmin?: boolean;
  permissions: Record<string, string>;
}

const broadcastSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().optional(),
  type: z.enum(["announcement", "task", "reminder", "release_notes"]),
  priority: z.enum(["normal", "urgent"]),
  targetUserIds: z.array(z.string()).optional(),
});

type BroadcastForm = z.infer<typeof broadcastSchema>;

const TYPE_ICON: Record<string, React.ElementType> = {
  announcement: Megaphone,
  task: CheckSquare,
  reminder: Bell,
  release_notes: Sparkles,
};

const TYPE_LABEL: Record<string, string> = {
  announcement: "Announcement",
  task: "Task",
  reminder: "Reminder",
  release_notes: "What's New",
};

export default function Announcements() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const { data: myPerms } = useQuery<MyPermissions>({ queryKey: ["/api/my-permissions"] });
  const canCreate =
    myPerms?.isSuperAdmin || myPerms?.role === "admin" || myPerms?.permissions?.["announcements"] === "full";
  const canCreateReleaseNotes = myPerms?.isSuperAdmin || myPerms?.role === "admin";

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  const { data: teamMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: canCreate,
  });

  const form = useForm<BroadcastForm>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      title: "",
      message: "",
      type: "announcement",
      priority: "normal",
      targetUserIds: [],
    },
  });

  const watchedType = form.watch("type");
  const isReleaseNotes = watchedType === "release_notes";

  const createMutation = useMutation({
    mutationFn: async (data: BroadcastForm) => {
      const payload = {
        ...data,
        targetUserIds: selectedUserIds.length > 0 ? selectedUserIds : null,
      };
      const res = await apiRequest("POST", "/api/announcements", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/latest-release-notes"] });
      setDialogOpen(false);
      setSelectedUserIds([]);
      form.reset();
      toast({ title: isReleaseNotes ? "What's New published!" : "Broadcast sent successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send broadcast", description: err.message, variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/announcements/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/announcements/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/unread-count"] });
      toast({ title: "All announcements marked as read" });
    },
  });

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/announcements/generate-release-notes", {});
      const json = await res.json();
      if (json.draft) {
        form.setValue("message", json.draft);
        toast({ title: "Draft generated", description: "Review and edit before publishing." });
      } else {
        form.setValue("message", "");
        toast({ title: "Could not generate notes", description: "Describe your update manually." });
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  const unreadCount = announcements.filter((a) => !a.isRead).length;

  function getUserName(userId: string) {
    const u = teamMembers.find((m) => m.id === userId);
    if (!u) return "Unknown";
    if (u.firstName || u.lastName) return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    return u.email ?? userId;
  }

  function toggleUser(id: string) {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const releaseAnn = announcements.filter((a) => a.type === "release_notes");
  const otherAnn = announcements.filter((a) => a.type !== "release_notes");
  const sortedAll = [...releaseAnn, ...otherAnn];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            Announcements
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount} unread broadcast{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark All Read
            </Button>
          )}
          {canCreate && (
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              data-testid="button-new-broadcast"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Broadcast
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : sortedAll.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No broadcasts yet</p>
          <p className="text-sm mt-1">Company-wide announcements will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAll.map((a) => {
            const Icon = TYPE_ICON[a.type] ?? Megaphone;
            const isUrgent = a.priority === "urgent";
            const isRelease = a.type === "release_notes";
            const bullets = isRelease
              ? (a.message ?? "")
                  .split("\n")
                  .map((l) => l.trim())
                  .filter((l) => l.length > 0)
              : null;

            return (
              <Card
                key={a.id}
                data-testid={`card-announcement-${a.id}`}
                className={`transition-colors ${
                  isRelease && !a.isRead
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                    : !a.isRead
                    ? "border-primary/40 bg-primary/5"
                    : "border-border"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 rounded-full p-2 flex-shrink-0 ${
                        isRelease
                          ? "bg-primary/10 text-primary"
                          : isUrgent
                          ? "bg-red-100 text-red-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className="font-semibold text-sm"
                          data-testid={`text-announcement-title-${a.id}`}
                        >
                          {a.title}
                        </span>
                        {isUrgent && (
                          <Badge variant="destructive" className="text-xs py-0 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Urgent
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs py-0 ${isRelease ? "border-primary/30 text-primary bg-primary/5" : ""}`}
                        >
                          {TYPE_LABEL[a.type] ?? a.type}
                        </Badge>
                        {!a.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                        )}
                      </div>

                      {/* Release notes: render bullets */}
                      {isRelease && bullets && bullets.length > 0 ? (
                        <ul className="space-y-1.5 mb-2">
                          {bullets.map((line, i) => {
                            const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
                            const text = isBullet ? line.replace(/^[•\-*]\s*/, "") : line;
                            return (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                                <span>{text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        a.message && (
                          <p
                            className="text-sm text-muted-foreground mb-2"
                            data-testid={`text-announcement-message-${a.id}`}
                          >
                            {a.message}
                          </p>
                        )
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>From: {getUserName(a.createdBy)}</span>
                        {a.targetUserIds && a.targetUserIds.length > 0 ? (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {a.targetUserIds.length} recipient{a.targetUserIds.length !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Everyone
                          </span>
                        )}
                        <span title={format(new Date(a.createdAt), "PPP p")}>
                          {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {(a as any).actionUrl && (
                        <div className="mt-2">
                          <Link href={(a as any).actionUrl}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                              data-testid={`btn-announcement-action-${a.id}`}
                            >
                              Review Report
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                    {!a.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 text-xs"
                        onClick={() => markReadMutation.mutate(a.id)}
                        disabled={markReadMutation.isPending}
                        data-testid={`button-mark-read-${a.id}`}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark read
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">New Broadcast</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-broadcast-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="task">Assign Task</SelectItem>
                        <SelectItem value="reminder">Send Reminder</SelectItem>
                        {canCreateReleaseNotes && (
                          <SelectItem value="release_notes">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                              What's New / Release Notes
                            </span>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isReleaseNotes ? "Version Label" : "Title"}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isReleaseNotes ? "e.g. March 2026 Update" : "Broadcast title"}
                        {...field}
                        data-testid="input-broadcast-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>
                        {isReleaseNotes ? "Release Notes" : "Message (optional)"}
                      </FormLabel>
                      {isReleaseNotes && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={handleGenerate}
                          disabled={generating}
                          data-testid="button-generate-release-notes"
                        >
                          {generating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Wand2 className="h-3 w-3 text-primary" />
                          )}
                          {generating ? "Generating…" : "Auto-generate with AI"}
                        </Button>
                      )}
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder={
                          isReleaseNotes
                            ? "Paste or generate bullet-point release notes…\n• Added customer health score overrides\n• Fixed revenue analytics to exclude draft invoices"
                            : "Additional details..."
                        }
                        rows={isReleaseNotes ? 6 : 3}
                        {...field}
                        data-testid="textarea-broadcast-message"
                      />
                    </FormControl>
                    {isReleaseNotes && (
                      <p className="text-[11px] text-muted-foreground">
                        Use one item per line. Bullets (•) are rendered as bullet points for users.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isReleaseNotes && (
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-broadcast-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {!isReleaseNotes && (
                <div>
                  <FormLabel>Target Recipients</FormLabel>
                  <div className="mt-2 border rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.length === 0}
                        onChange={() => setSelectedUserIds([])}
                        data-testid="checkbox-everyone"
                      />
                      <span className="font-medium">Everyone</span>
                    </label>
                    {teamMembers.map((u) => {
                      const name =
                        u.firstName || u.lastName
                          ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                          : u.email ?? u.id;
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() => toggleUser(u.id)}
                            data-testid={`checkbox-user-${u.id}`}
                          />
                          {name}
                        </label>
                      );
                    })}
                  </div>
                  {selectedUserIds.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedUserIds.length} recipient{selectedUserIds.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setDialogOpen(false); form.reset(); }}
                  data-testid="button-cancel-broadcast"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-broadcast"
                >
                  {createMutation.isPending
                    ? "Sending..."
                    : isReleaseNotes
                    ? "Publish What's New"
                    : "Send Broadcast"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
