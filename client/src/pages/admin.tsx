import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
import {
  ShieldCheck,
  UserPlus,
  Copy,
  Check,
  Trash2,
  Clock,
  Users,
  Mail,
  Link as LinkIcon,
} from "lucide-react";
import { format, isAfter } from "date-fns";
import type { User } from "@shared/models/auth";

interface Invite {
  id: number;
  email: string;
  role: string;
  token: string;
  invitedBy: string | null;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = { admin: "Admin", manager: "Manager", member: "Member" };
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  member: "bg-slate-100 text-slate-600 border-slate-200",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 shrink-0" data-testid="button-copy-link">
      {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [cancelInviteId, setCancelInviteId] = useState<number | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const { register, handleSubmit, reset, setValue, watch } = useForm({ defaultValues: { email: "", role: "member" } });

  if (currentUser && currentUser.role !== "admin") {
    setLocation("/");
    return null;
  }

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: invites = [], isLoading: invitesLoading } = useQuery<Invite[]>({
    queryKey: ["/api/invites"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiRequest("PUT", `/api/users/${id}/role`, { role }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role updated" });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setRemoveUserId(null);
      toast({ title: "Team member removed" });
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      apiRequest("POST", "/api/invites", data).then(r => r.json()),
    onSuccess: (invite: Invite) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      const link = `${window.location.origin}/invite/${invite.token}`;
      setGeneratedLink(link);
      reset({ email: "", role: "member" });
    },
    onError: () => toast({ title: "Error", description: "Could not create invite", variant: "destructive" }),
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/invites/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invites"] });
      setCancelInviteId(null);
      toast({ title: "Invite cancelled" });
    },
  });

  const pendingInvites = invites.filter(inv => !inv.usedAt && isAfter(new Date(inv.expiresAt), new Date()));
  const usedInvites = invites.filter(inv => !!inv.usedAt);
  const expiredInvites = invites.filter(inv => !inv.usedAt && !isAfter(new Date(inv.expiresAt), new Date()));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold">Team Admin</h1>
          <p className="text-muted-foreground text-sm">Manage your team members and invitations</p>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 gap-6">
          <TabsTrigger value="members" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium gap-2">
            <Users className="h-4 w-4" />
            Team Members
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">{users.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="invites" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium gap-2">
            <Mail className="h-4 w-4" />
            Invitations
            {pendingInvites.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 bg-primary text-primary-foreground">{pendingInvites.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="pt-4 space-y-3">
          {usersLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm">No team members yet.</p>
          ) : (
            users.map(u => (
              <Card key={u.id} className="border-none shadow-sm bg-card">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={u.profileImageUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                      {u.firstName?.[0]}{u.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" data-testid={`text-user-name-${u.id}`}>
                      {u.firstName} {u.lastName}
                      {u.id === currentUser?.id && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={u.role}
                      onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })}
                      disabled={u.id === currentUser?.id || updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-role-${u.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={u.id === currentUser?.id}
                      onClick={() => setRemoveUserId(u.id)}
                      data-testid={`button-remove-user-${u.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="invites" className="pt-4 space-y-5">
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Invite a Team Member
              </CardTitle>
              <CardDescription>Generate a link and send it to your employee. It expires in 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit((data) => createInviteMutation.mutate(data))}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Input
                  {...register("email", { required: true })}
                  type="email"
                  placeholder="employee@company.com"
                  className="flex-1"
                  data-testid="input-invite-email"
                />
                <Select value={watch("role")} onValueChange={(v) => setValue("role", v)}>
                  <SelectTrigger className="w-full sm:w-36" data-testid="select-invite-role">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={createInviteMutation.isPending} className="shrink-0" data-testid="button-generate-invite">
                  {createInviteMutation.isPending ? "Generating..." : "Generate Link"}
                </Button>
              </form>

              {generatedLink && (
                <div className="mt-4 rounded-lg border bg-muted/40 p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-primary" />
                    Invite Link Generated — Copy and send this to your employee:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs flex-1 truncate text-muted-foreground bg-background rounded px-2 py-1.5 border" data-testid="text-invite-link">
                      {generatedLink}
                    </code>
                    <CopyButton text={generatedLink} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    They can sign in with Google, GitHub, or email — no Replit experience required.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {pendingInvites.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">Pending</h3>
              {pendingInvites.map(inv => (
                <Card key={inv.id} className="border-none shadow-sm bg-card">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {format(new Date(inv.expiresAt), "MMM d, yyyy")} &middot;{" "}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${ROLE_COLORS[inv.role]}`}>
                          {ROLE_LABELS[inv.role]}
                        </Badge>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <CopyButton text={`${window.location.origin}/invite/${inv.token}`} />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setCancelInviteId(inv.id)}
                        data-testid={`button-cancel-invite-${inv.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {usedInvites.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">Accepted</h3>
              {usedInvites.map(inv => (
                <Card key={inv.id} className="border-none shadow-sm bg-muted/40">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-muted-foreground">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Accepted {inv.usedAt ? format(new Date(inv.usedAt), "MMM d, yyyy") : ""} &middot;{" "}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${ROLE_COLORS[inv.role]}`}>
                          {ROLE_LABELS[inv.role]}
                        </Badge>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {expiredInvites.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">Expired</h3>
              {expiredInvites.map(inv => (
                <Card key={inv.id} className="border-none shadow-sm bg-muted/40 opacity-60">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-muted-foreground">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expired {format(new Date(inv.expiresAt), "MMM d, yyyy")} &middot;{" "}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                          {ROLE_LABELS[inv.role]}
                        </Badge>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => setCancelInviteId(inv.id)}
                      data-testid={`button-delete-invite-${inv.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {pendingInvites.length === 0 && usedInvites.length === 0 && expiredInvites.length === 0 && !invitesLoading && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No invitations yet. Generate one above to bring your team onboard.
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!removeUserId} onOpenChange={(o) => !o && setRemoveUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove their access to M5 Services CRM. They can be re-invited later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeUserId && removeUserMutation.mutate(removeUserId)}
              data-testid="button-confirm-remove-user"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelInviteId} onOpenChange={(o) => !o && setCancelInviteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invite?</AlertDialogTitle>
            <AlertDialogDescription>
              This invite link will no longer work. You can generate a new one at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep It</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelInviteId && cancelInviteMutation.mutate(cancelInviteId)}
              data-testid="button-confirm-cancel-invite"
            >
              Cancel Invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
