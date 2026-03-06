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
} from "lucide-react";
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
  permissions: Record<string, string>;
}

const broadcastSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().optional(),
  type: z.enum(["announcement", "task", "reminder"]),
  priority: z.enum(["normal", "urgent"]),
  targetUserIds: z.array(z.string()).optional(),
});

type BroadcastForm = z.infer<typeof broadcastSchema>;

const TYPE_ICON: Record<string, React.ElementType> = {
  announcement: Megaphone,
  task: CheckSquare,
  reminder: Bell,
};

const TYPE_LABEL: Record<string, string> = {
  announcement: "Announcement",
  task: "Task",
  reminder: "Reminder",
};

export default function Announcements() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: myPerms } = useQuery<MyPermissions>({ queryKey: ["/api/my-permissions"] });
  const canCreate =
    myPerms?.role === "admin" || myPerms?.permissions?.["announcements"] === "full";

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
      setDialogOpen(false);
      setSelectedUserIds([]);
      form.reset();
      toast({ title: "Broadcast sent successfully" });
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
      ) : announcements.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No broadcasts yet</p>
          <p className="text-sm mt-1">Company-wide announcements will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const Icon = TYPE_ICON[a.type] ?? Megaphone;
            const isUrgent = a.priority === "urgent";
            return (
              <Card
                key={a.id}
                data-testid={`card-announcement-${a.id}`}
                className={`transition-colors ${
                  !a.isRead
                    ? "border-primary/40 bg-primary/5"
                    : "border-border"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 rounded-full p-2 flex-shrink-0 ${
                        isUrgent
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
                        <Badge variant="outline" className="text-xs py-0">
                          {TYPE_LABEL[a.type] ?? a.type}
                        </Badge>
                        {!a.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                        )}
                      </div>
                      {a.message && (
                        <p
                          className="text-sm text-muted-foreground mb-2"
                          data-testid={`text-announcement-message-${a.id}`}
                        >
                          {a.message}
                        </p>
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Broadcast title" {...field} data-testid="input-broadcast-title" />
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
                    <FormLabel>Message (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details..."
                        rows={3}
                        {...field}
                        data-testid="textarea-broadcast-message"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
              </div>

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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-broadcast"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-broadcast"
                >
                  {createMutation.isPending ? "Sending..." : "Send Broadcast"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
