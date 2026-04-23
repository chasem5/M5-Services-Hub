import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  Lock,
  Settings2,
  Pencil,
  Plus,
  X,
  GitBranch,
  Tag,
  Users2,
  Building2,
  DollarSign,
  Zap,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Briefcase,
  Receipt,
  FileSignature,
  UserCheck,
  Unlink,
  Link2,
  Search,
  MapPin,
  Database,
  GitMerge,
  Activity,
} from "lucide-react";
import { format, isAfter } from "date-fns";
import type { User } from "@shared/models/auth";
import type { IndustryOption } from "@shared/schema";
import { PipelineStagesManager } from "@/components/PipelineStagesManager";
import { ContactStagesManager } from "@/components/ContactStagesManager";
import { DealTagsManager } from "@/components/DealTagsManager";

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

const ROLE_LABELS: Record<string, string> = { super_admin: "Super Admin", admin: "Admin", manager: "Manager", member: "Member" };
const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-red-100 text-red-700 border-red-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  member: "bg-slate-100 text-slate-600 border-slate-200",
};

const MODULE_DEFS = [
  { key: "dashboard", label: "Dashboard", description: "Summary stats, metrics and activity feed" },
  { key: "leads", label: "Deal Pipeline", description: "Kanban board for tracking potential deals" },
  { key: "customers", label: "Customers", description: "Customer database, contacts and buildings" },
  { key: "tasks", label: "Tasks", description: "Task board and assignments" },
  { key: "meetings", label: "Meetings", description: "Meeting notes and AI action items" },
  { key: "estimates", label: "Estimates", description: "Job estimates and line items" },
  { key: "service_catalog", label: "Service Catalog", description: "Standard services and pricing" },
  { key: "proposals", label: "Proposals", description: "Client proposal documents" },
  { key: "email_sync", label: "Email Sync", description: "Gmail sync, AI analysis and follow-up reminders" },
  { key: "announcements", label: "Announcements", description: "Company broadcasts, task assignments and reminders" },
];

const ACCESS_LEVELS = [
  { value: "full", label: "Full Access", description: "Create, edit, delete and view all records" },
  { value: "view_all", label: "View All", description: "View all records, only edit own" },
  { value: "own_only", label: "Own Only", description: "See and manage only their own records" },
  { value: "none", label: "No Access", description: "Section hidden, no access" },
];

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

interface RoleConfig { roleKey: string; displayName: string; }
interface RolePermission { id: number; roleKey: string; module: string; accessLevel: string; }

function TeamsPanel({ users }: { users: User[] }) {
  const { toast } = useToast();
  const { data: teamsList = [], isLoading: teamsLoading } = useQuery<{ id: number; name: string; description: string | null; createdAt: string }[]>({
    queryKey: ["/api/teams"],
  });

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [editingTeam, setEditingTeam] = useState<{ id: number; name: string; description: string | null } | null>(null);
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);
  const [assigningUserId, setAssigningUserId] = useState<Record<number, string>>({});

  const createTeamMutation = useMutation({
    mutationFn: (data: { name: string; description?: string | null }) =>
      apiRequest("POST", "/api/teams", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setNewTeamName("");
      setNewTeamDesc("");
      toast({ title: "Team created" });
    },
    onError: () => toast({ title: "Failed to create team", variant: "destructive" }),
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string; description?: string | null }) =>
      apiRequest("PATCH", `/api/teams/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setEditingTeam(null);
      toast({ title: "Team updated" });
    },
    onError: () => toast({ title: "Failed to update team", variant: "destructive" }),
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeletingTeamId(null);
      toast({ title: "Team deleted" });
    },
    onError: () => toast({ title: "Failed to delete team", variant: "destructive" }),
  });

  const assignUserMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: string }) =>
      apiRequest("POST", `/api/teams/${teamId}/members`, { userId }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User added to team" });
    },
    onError: () => toast({ title: "Failed to assign user", variant: "destructive" }),
  });

  const removeUserMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: number; userId: string }) =>
      apiRequest("DELETE", `/api/teams/${teamId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User removed from team" });
    },
    onError: () => toast({ title: "Failed to remove user", variant: "destructive" }),
  });

  const getTeamMembers = (teamId: number) =>
    users.filter((u: any) => u.teamId === teamId);

  const unassignedUsers = users.filter((u: any) => !u.teamId);

  return (
    <div className="space-y-4">
      {/* Create Team */}
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Users2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-heading">Create a Team</CardTitle>
              <CardDescription className="text-xs">Organize employees into teams for scoped reporting and filtering.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <Input
              placeholder="Team name (e.g. Facility Solutions)"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              data-testid="input-new-team-name"
            />
            <Input
              placeholder="Description (optional)"
              value={newTeamDesc}
              onChange={e => setNewTeamDesc(e.target.value)}
              data-testid="input-new-team-description"
            />
          </div>
          <Button
            size="sm"
            onClick={() => createTeamMutation.mutate({ name: newTeamName.trim(), description: newTeamDesc.trim() || null })}
            disabled={!newTeamName.trim() || createTeamMutation.isPending}
            data-testid="button-create-team"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {createTeamMutation.isPending ? "Creating..." : "Create Team"}
          </Button>
        </CardContent>
      </Card>

      {/* Teams List */}
      {teamsLoading ? (
        <Skeleton className="h-24 w-full rounded-lg" />
      ) : teamsList.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No teams yet. Create one above.</div>
      ) : (
        <div className="space-y-3">
          {teamsList.map(team => {
            const members = getTeamMembers(team.id);
            const isExpanded = expandedTeamId === team.id;
            return (
              <Card key={team.id} className="border-none shadow-sm bg-card">
                <CardContent className="p-4">
                  {editingTeam?.id === team.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editingTeam.name}
                        onChange={e => setEditingTeam(t => t ? { ...t, name: e.target.value } : t)}
                        data-testid={`input-edit-team-name-${team.id}`}
                      />
                      <Input
                        value={editingTeam.description ?? ""}
                        onChange={e => setEditingTeam(t => t ? { ...t, description: e.target.value } : t)}
                        placeholder="Description (optional)"
                        data-testid={`input-edit-team-description-${team.id}`}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateTeamMutation.mutate({ id: editingTeam.id, name: editingTeam.name, description: editingTeam.description })} disabled={updateTeamMutation.isPending} data-testid={`button-save-team-${team.id}`}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingTeam(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full shrink-0">
                        <Users2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm" data-testid={`text-team-name-${team.id}`}>{team.name}</span>
                          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{members.length} member{members.length !== 1 ? "s" : ""}</Badge>
                        </div>
                        {team.description && <p className="text-xs text-muted-foreground mt-0.5">{team.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExpandedTeamId(isExpanded ? null : team.id)} data-testid={`button-expand-team-${team.id}`}>
                          {isExpanded ? "Collapse" : "Manage"}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingTeam({ id: team.id, name: team.name, description: team.description })} data-testid={`button-edit-team-${team.id}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingTeamId(team.id)} data-testid={`button-delete-team-${team.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Members</p>
                      {members.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No members yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {members.map((u: any) => (
                            <div key={u.id} className="flex items-center gap-2 text-sm">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">{u.firstName?.[0]}{u.lastName?.[0]}</AvatarFallback>
                              </Avatar>
                              <span className="flex-1">{u.firstName} {u.lastName} <span className="text-muted-foreground text-xs">({u.email})</span></span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeUserMutation.mutate({ teamId: team.id, userId: u.id })} data-testid={`button-remove-member-${u.id}`}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {unassignedUsers.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <Select value={assigningUserId[team.id] ?? ""} onValueChange={v => setAssigningUserId(prev => ({ ...prev, [team.id]: v }))}>
                            <SelectTrigger className="h-8 text-xs flex-1" data-testid={`select-add-member-${team.id}`}>
                              <SelectValue placeholder="Add employee to team..." />
                            </SelectTrigger>
                            <SelectContent>
                              {unassignedUsers.map((u: any) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.firstName} {u.lastName} ({u.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button size="sm" className="h-8" onClick={() => {
                            const uid = assigningUserId[team.id];
                            if (uid) {
                              assignUserMutation.mutate({ teamId: team.id, userId: uid });
                              setAssigningUserId(prev => ({ ...prev, [team.id]: "" }));
                            }
                          }} disabled={!assigningUserId[team.id] || assignUserMutation.isPending} data-testid={`button-add-member-${team.id}`}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Unassigned Users */}
      {users.length > 0 && (
        <Card className="border-none shadow-sm bg-card">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned Employees</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {unassignedUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground">All employees are assigned to a team.</p>
            ) : (
              <div className="space-y-1.5">
                {unassignedUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-2 text-sm py-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">{u.firstName?.[0]}{u.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1">{u.firstName} {u.lastName} <span className="text-muted-foreground text-xs">({u.email})</span></span>
                    <Badge variant="outline" className="text-[10px] px-1.5 h-4">No Team</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deletingTeamId !== null} onOpenChange={open => { if (!open) setDeletingTeamId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the team and unassign all its members. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deletingTeamId && deleteTeamMutation.mutate(deletingTeamId)} data-testid="button-confirm-delete-team">
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BuildOpsPanel() {
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [connStatus, setConnStatus] = useState<"idle" | "ok" | "error">("idle");
  const [connError, setConnError] = useState<string | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState("");

  const { data: storedClientId } = useQuery<{ value: string | null }>({ queryKey: ["/api/settings/buildopsClientId"] });
  const { data: storedTenantId } = useQuery<{ value: string | null }>({ queryKey: ["/api/settings/buildopsTenantId"] });
  const { data: storedDeptId } = useQuery<{ value: string | null }>({ queryKey: ["/api/settings/buildopsDefaultDepartmentId"] });
  const { data: storedVerified } = useQuery<{ value: string | null }>({ queryKey: ["/api/settings/buildopsConnectionVerified"] });
  const { data: lastSync } = useQuery<{ createdAt: string; message: string; action: string } | null>({ queryKey: ["/api/buildops/last-sync"] });
  const { data: departments } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/buildops/departments"],
    enabled: connStatus === "ok",
  });

  useEffect(() => { if (storedClientId?.value) setClientId(storedClientId.value); }, [storedClientId]);
  useEffect(() => { if (storedTenantId?.value) setTenantId(storedTenantId.value); }, [storedTenantId]);
  useEffect(() => { if (storedDeptId?.value) setSelectedDeptId(storedDeptId.value); }, [storedDeptId]);
  useEffect(() => { if (storedVerified?.value === "true") setConnStatus("ok"); }, [storedVerified]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/settings/buildopsClientId", { value: clientId });
      if (clientSecret) await apiRequest("PUT", "/api/settings/buildopsClientSecret", { value: clientSecret });
      await apiRequest("PUT", "/api/settings/buildopsTenantId", { value: tenantId });
      if (selectedDeptId) await apiRequest("PUT", "/api/settings/buildopsDefaultDepartmentId", { value: selectedDeptId });
      await apiRequest("PUT", "/api/settings/buildopsConnectionVerified", { value: "false" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/buildopsClientId"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/buildopsTenantId"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/buildopsDefaultDepartmentId"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/buildopsConnectionVerified"] });
      setConnStatus("idle");
      setConnError(null);
      toast({ title: "Settings saved", description: "Run Test Connection to re-verify before syncing." });
    },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/buildops/test", {});
      return res.json();
    },
    onSuccess: async (data) => {
      if (data.ok) {
        setConnStatus("ok");
        setConnError(null);
        await apiRequest("PUT", "/api/settings/buildopsConnectionVerified", { value: "true" });
        queryClient.invalidateQueries({ queryKey: ["/api/settings/buildopsConnectionVerified"] });
        queryClient.invalidateQueries({ queryKey: ["/api/buildops/departments"] });
      } else {
        setConnStatus("error");
        setConnError(data.error ?? "Connection failed");
        await apiRequest("PUT", "/api/settings/buildopsConnectionVerified", { value: "false" });
        queryClient.invalidateQueries({ queryKey: ["/api/settings/buildopsConnectionVerified"] });
      }
    },
    onError: async (err: any) => {
      setConnStatus("error");
      setConnError(err.message);
      await apiRequest("PUT", "/api/settings/buildopsConnectionVerified", { value: "false" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/buildopsConnectionVerified"] });
    },
  });

  const syncPullMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/buildops/sync-pull", {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/last-sync"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      const parts = [`${data.created} imported`, `${data.updated} updated`];
      if (data.inactive > 0) parts.push(`${data.inactive} inactive`);
      toast({ title: "Sync complete", description: `${parts.join(", ")} of ${data.total} BuildOps customers` });
    },
    onError: (err: any) => toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
  });

  const syncRepresentativesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/buildops/sync-representatives", {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/last-sync"] });
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/reps-for-matching"] });
      if (data.total === 0) {
        toast({ title: "No employees found", description: "BuildOps returned 0 employees. The /v1/employees endpoint may not be available for this account.", variant: "destructive" });
      } else {
        toast({ title: "Employees synced", description: `${data.created} new, ${data.updated} updated — ${data.total} total employees from BuildOps` });
      }
    },
    onError: (err: any) => toast({ title: "Employee sync failed", description: err.message, variant: "destructive" }),
  });

  const { data: buildopsEmployeeList, isLoading: employeesLoading } = useQuery<any[]>({
    queryKey: ["/api/buildops/employees"],
    staleTime: 60 * 1000,
  });

  const updateEmployeeTypeMutation = useMutation({
    mutationFn: async ({ id, employmentType }: { id: number; employmentType: string }) => {
      const res = await apiRequest("PATCH", `/api/buildops/employees/${id}`, { employmentType });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/employees"] });
      toast({ title: "Employment type updated" });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const [diagResult, setDiagResult] = useState<any>(null);
  const diagnoseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/buildops/diagnose-employees");
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || e.message); }
      return res.json();
    },
    onSuccess: (data) => setDiagResult(data),
    onError: (err: any) => toast({ title: "Diagnostic failed", description: err.message, variant: "destructive" }),
  });

  const pushAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/buildops/push-all", {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/last-sync"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Push complete", description: `${data.pushed} pushed, ${data.errors} errors, ${data.skipped} already synced` });
    },
    onError: (err: any) => toast({ title: "Push failed", description: err.message, variant: "destructive" }),
  });

  const syncPropertiesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/buildops/sync-properties", {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/last-sync"] });
      toast({ title: "Properties synced", description: `${data.total} properties: ${data.created} created, ${data.updated} updated, ${data.geocoded ?? 0} geocoded` });
    },
    onError: (err: any) => toast({ title: "Property sync failed", description: err.message, variant: "destructive" }),
  });

  const geocodeBuildingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/buildops/geocode-buildings", {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Map coordinates updated", description: `${data.geocoded} buildings geocoded, ${data.failed} could not be resolved` });
    },
    onError: (err: any) => toast({ title: "Geocoding failed", description: err.message, variant: "destructive" }),
  });

  const syncJobsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/buildops/sync-jobs", {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/last-sync"] });
      toast({ title: "Jobs synced", description: `${data.created} created, ${data.updated} updated, ${data.skipped || (data.total - data.created - data.updated)} skipped of ${data.total} total` });
    },
    onError: (err: any) => toast({ title: "Jobs sync failed", description: err.message, variant: "destructive" }),
  });

  const syncInvoicesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/buildops/sync-invoices", {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/last-sync"] });
      toast({ title: "Invoices synced", description: `${data.created} created, ${data.updated} updated, ${data.skipped || (data.total - data.created - data.updated)} skipped of ${data.total} total` });
    },
    onError: (err: any) => toast({ title: "Invoices sync failed", description: err.message, variant: "destructive" }),
  });

  const syncAgreementsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/buildops/sync-agreements", {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/last-sync"] });
      toast({ title: "Agreements synced", description: `${data.created} created, ${data.updated} updated, ${data.skipped || (data.total - data.created - data.updated)} skipped of ${data.total} total` });
    },
    onError: (err: any) => toast({ title: "Agreements sync failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-heading">BuildOps Integration</CardTitle>
              <CardDescription className="text-xs">Connect M5 Services CRM to BuildOps for customer and quote sync</CardDescription>
            </div>
            {connStatus === "ok" && (
              <Badge className="ml-auto bg-green-100 text-green-700 border-green-200 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </Badge>
            )}
            {connStatus === "error" && (
              <Badge className="ml-auto bg-red-100 text-red-700 border-red-200 gap-1" variant="outline">
                <AlertCircle className="h-3 w-3" /> Error
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Client ID</label>
              <Input
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="Enter BuildOps Client ID"
                data-testid="input-buildops-client-id"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Client Secret</label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={clientSecret}
                  onChange={e => setClientSecret(e.target.value)}
                  placeholder={storedClientId?.value ? "Leave blank to keep existing secret" : "Enter BuildOps Client Secret"}
                  className="pr-10"
                  data-testid="input-buildops-client-secret"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tenant ID</label>
              <Input
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
                placeholder="Enter BuildOps Tenant ID"
                data-testid="input-buildops-tenant-id"
              />
            </div>
            {connStatus === "ok" && departments && departments.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Default Department (for Quotes)</label>
                <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                  <SelectTrigger data-testid="select-buildops-department">
                    <SelectValue placeholder="Select a department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Required when pushing estimates as quotes to BuildOps.</p>
              </div>
            )}
            {connError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {connError}
              </p>
            )}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => saveSettingsMutation.mutate()}
                disabled={saveSettingsMutation.isPending}
                size="sm"
                data-testid="button-save-buildops-settings"
              >
                {saveSettingsMutation.isPending ? "Saving..." : "Save Credentials"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || !clientId || !tenantId}
                data-testid="button-test-buildops"
              >
                {testMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />}
                Test Connection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-heading">Data Sync</CardTitle>
              <CardDescription className="text-xs">
                {lastSync
                  ? `Last sync: ${new Date(lastSync.createdAt).toLocaleString()} — ${lastSync.message}`
                  : "No sync history yet"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {connStatus !== "ok" && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Sync is locked until the connection is verified. Save credentials and click "Test Connection" above.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                Pull Customers
              </h4>
              <p className="text-xs text-muted-foreground">Import BuildOps customers and refresh all fields. Updates name, phone, address, status on every run.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => syncPullMutation.mutate()}
                disabled={syncPullMutation.isPending || connStatus !== "ok"}
                data-testid="button-buildops-sync-pull"
              >
                {syncPullMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                {syncPullMutation.isPending ? "Syncing..." : "Sync Customers"}
              </Button>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Sync Properties
              </h4>
              <p className="text-xs text-muted-foreground">Pull BuildOps properties into CRM buildings. Stores address, property type, and geocodes coordinates for the portfolio map.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => syncPropertiesMutation.mutate()}
                disabled={syncPropertiesMutation.isPending || connStatus !== "ok"}
                data-testid="button-buildops-sync-properties"
              >
                {syncPropertiesMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5 mr-1.5" />}
                {syncPropertiesMutation.isPending ? "Syncing..." : "Sync Properties"}
              </Button>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Fix Map Coordinates
              </h4>
              <p className="text-xs text-muted-foreground">Geocode any buildings that have a manually-entered address but are missing map coordinates. Add addresses directly on each building card in the client's Portfolio Map tab, then run this to batch-geocode any that were missed.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => geocodeBuildingsMutation.mutate()}
                disabled={geocodeBuildingsMutation.isPending}
                data-testid="button-geocode-buildings"
              >
                {geocodeBuildingsMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5 mr-1.5" />}
                {geocodeBuildingsMutation.isPending ? "Geocoding..." : "Fix Map Coordinates"}
              </Button>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Sync Employees
              </h4>
              <p className="text-xs text-muted-foreground">Pull M5 employees from BuildOps to enable account manager matching. Uses the /v1/employees endpoint.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => syncRepresentativesMutation.mutate()}
                disabled={syncRepresentativesMutation.isPending || connStatus !== "ok"}
                data-testid="button-buildops-sync-representatives"
              >
                {syncRepresentativesMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Users className="h-3.5 w-3.5 mr-1.5" />}
                {syncRepresentativesMutation.isPending ? "Syncing..." : "Sync Employees"}
              </Button>
            </div>

            {/* ── Employee Capacity Type Management ── */}
            {(employeesLoading || (buildopsEmployeeList && buildopsEmployeeList.length > 0)) && (
              <div className="col-span-full border rounded-lg p-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Capacity Type
                    </h4>
                    {!employeesLoading && buildopsEmployeeList && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100">
                          {buildopsEmployeeList.filter((e: any) => (e.employmentType ?? "full_time") === "full_time").length} full-time
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100">
                          {buildopsEmployeeList.filter((e: any) => e.employmentType === "part_time").length} part-time
                        </Badge>
                        {buildopsEmployeeList.some((e: any) => e.employmentType === "exclude") && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                            {buildopsEmployeeList.filter((e: any) => e.employmentType === "exclude").length} excluded
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    <strong>Full-time</strong> — counts toward 40h/week capacity.{" "}
                    <strong>Part-time</strong> — shown in drill-downs, excluded from capacity math.{" "}
                    <strong>Exclude</strong> — hidden from all staffing metrics entirely.
                  </p>
                </div>

                {employeesLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-9 w-full" />)}</div>
                ) : (
                  <div className="border rounded-md divide-y divide-muted overflow-hidden max-h-64 overflow-y-auto">
                    {buildopsEmployeeList!.map((emp: any) => {
                      const type: string = emp.employmentType ?? "full_time";
                      const dotCls =
                        type === "full_time" ? "bg-blue-500" :
                        type === "part_time" ? "bg-amber-400" :
                                               "bg-muted-foreground/40";
                      return (
                        <div key={emp.id} className="flex items-center gap-3 px-3 py-2 bg-card">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{emp.name}</p>
                            {emp.title && <p className="text-xs text-muted-foreground truncate">{emp.title}</p>}
                          </div>
                          <Select
                            value={type}
                            onValueChange={(val) => updateEmployeeTypeMutation.mutate({ id: emp.id, employmentType: val })}
                            disabled={updateEmployeeTypeMutation.isPending}
                          >
                            <SelectTrigger className="w-28 h-7 text-xs shrink-0" data-testid={`select-emp-type-${emp.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full_time">Full-time</SelectItem>
                              <SelectItem value="part_time">Part-time</SelectItem>
                              <SelectItem value="exclude">Exclude</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3 shrink-0" />
                  Changes apply immediately to CEO dashboard capacity calculations.
                </p>
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Diagnose Employee API
              </h4>
              <p className="text-xs text-muted-foreground">Probes 6 potential BuildOps endpoints and shows the raw HTTP status and response body — helps identify the correct API path for M5 employee data.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => { setDiagResult(null); diagnoseMutation.mutate(); }}
                disabled={diagnoseMutation.isPending || connStatus !== "ok"}
                data-testid="button-buildops-diagnose"
              >
                {diagnoseMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1.5" />}
                {diagnoseMutation.isPending ? "Probing endpoints…" : "Run Diagnostics"}
              </Button>
              {diagResult && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Tenant ID: <span className="font-mono">{diagResult.tenantId}</span></p>
                  {diagResult.probes?.map((p: any) => (
                    <div key={p.endpoint} className={`rounded border p-2 text-xs font-mono space-y-1 ${p.status === 200 ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-muted"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground truncate">{p.endpoint}</span>
                        <span className={`font-bold shrink-0 ${p.status === 200 ? "text-green-600" : p.status === 400 ? "text-yellow-600" : p.status === 404 ? "text-orange-500" : p.status === 403 ? "text-red-500" : "text-muted-foreground"}`}>
                          {p.status} {p.statusText} <span className="text-muted-foreground font-normal">({p.elapsed}ms)</span>
                        </span>
                      </div>
                      {p.status === 200 && p.parsed && (
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-semibold text-green-700 dark:text-green-400">
                            items returned: {p.parsed.items?.length ?? (Array.isArray(p.parsed) ? p.parsed.length : "?")} / totalCount: {p.parsed.totalCount ?? "?"}
                          </div>
                          {p.topLevelKeys?.length > 0 && (
                            <div className="text-[10px] text-blue-600 dark:text-blue-400">
                              response keys: [{p.topLevelKeys.join(", ")}]
                            </div>
                          )}
                          {p.respHeaders && Object.keys(p.respHeaders).map(h => (
                            <div key={h} className="text-[10px] text-purple-600 dark:text-purple-400">hdr {h}: {p.respHeaders[h]}</div>
                          ))}
                        </div>
                      )}
                      <pre className="whitespace-pre-wrap break-all text-[10px] text-muted-foreground max-h-40 overflow-y-auto bg-muted/50 rounded p-1">{p.bodyPreview}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Push to BuildOps hidden until production-ready */}
            {false && (
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                Push to BuildOps
              </h4>
              <p className="text-xs text-muted-foreground">Push M5 customers that haven't been synced yet to BuildOps as new records.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => pushAllMutation.mutate()}
                disabled={pushAllMutation.isPending || connStatus !== "ok"}
                data-testid="button-buildops-push-all"
              >
                {pushAllMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                {pushAllMutation.isPending ? "Pushing..." : "Push Customers"}
              </Button>
            </div>
            )}
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                Sync Jobs
              </h4>
              <p className="text-xs text-muted-foreground">Pull all BuildOps jobs with revenue, costs, and status into the CRM.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => syncJobsMutation.mutate()}
                disabled={syncJobsMutation.isPending || connStatus !== "ok"}
                data-testid="button-buildops-sync-jobs"
              >
                {syncJobsMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Briefcase className="h-3.5 w-3.5 mr-1.5" />}
                {syncJobsMutation.isPending ? "Syncing..." : "Sync Jobs"}
              </Button>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                Sync Invoices
              </h4>
              <p className="text-xs text-muted-foreground">Pull all BuildOps invoices with amounts, status, and due dates.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => syncInvoicesMutation.mutate()}
                disabled={syncInvoicesMutation.isPending || connStatus !== "ok"}
                data-testid="button-buildops-sync-invoices"
              >
                {syncInvoicesMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Receipt className="h-3.5 w-3.5 mr-1.5" />}
                {syncInvoicesMutation.isPending ? "Syncing..." : "Sync Invoices"}
              </Button>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-primary" />
                Sync Agreements
              </h4>
              <p className="text-xs text-muted-foreground">Pull BuildOps service agreements with contract dates and scheduling state.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => syncAgreementsMutation.mutate()}
                disabled={syncAgreementsMutation.isPending || connStatus !== "ok"}
                data-testid="button-buildops-sync-agreements"
              >
                {syncAgreementsMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <FileSignature className="h-3.5 w-3.5 mr-1.5" />}
                {syncAgreementsMutation.isPending ? "Syncing..." : "Sync Agreements"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <BuildOpsSyncAudit />
    </div>
  );
}

function BuildOpsSyncAudit() {
  const { data: clients } = useQuery<any[]>({ queryKey: ["/api/clients"] });
  const linkedClients = (clients ?? [])
    .filter((c: any) => c.buildopsId)
    .sort((a: any, b: any) => {
      const aTime = a.buildopsLastSyncedAt ? new Date(a.buildopsLastSyncedAt).getTime() : 0;
      const bTime = b.buildopsLastSyncedAt ? new Date(b.buildopsLastSyncedAt).getTime() : 0;
      return bTime - aTime;
    });

  if (linkedClients.length === 0) return null;

  const activeCount = linkedClients.filter((c: any) => c.buildopsStatus !== "inactive").length;
  const inactiveCount = linkedClients.filter((c: any) => c.buildopsStatus === "inactive").length;

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-heading">BuildOps Sync Audit</CardTitle>
            <CardDescription className="text-xs">
              {linkedClients.length} linked clients — {activeCount} active, {inactiveCount} inactive
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="max-h-[400px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">Client</th>
                <th className="pb-2 pr-4">BuildOps Status</th>
                <th className="pb-2">Last Synced</th>
              </tr>
            </thead>
            <tbody>
              {linkedClients.map((client: any) => (
                <tr key={client.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{client.name}</td>
                  <td className="py-2 pr-4">
                    {client.buildopsStatus === "inactive" ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">Inactive</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">Active</span>
                    )}
                  </td>
                  <td className="py-2 text-muted-foreground text-xs">
                    {client.buildopsLastSyncedAt
                      ? new Date(client.buildopsLastSyncedAt).toLocaleString()
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface LinkedCustomer {
  buildopsId: string;
  buildopsName: string;
  buildopsEmail: string | null;
  buildopsPhone: string | null;
  buildopsStatus: string | null;
  crmClientId: number | null;
  crmClientName: string | null;
  matched: boolean;
}

interface UnlinkedCrmClient {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

interface DuplicateClientDetail {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  buildopsId: string | null;
  industry: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  serviceNeeds: string[] | null;
  annualRevenue: string | null;
  tier: string | null;
  logoUrl: string | null;
}

interface DuplicateGroup {
  name: string;
  clients: DuplicateClientDetail[];
}

interface LinkedDataResponse {
  customers: LinkedCustomer[];
  unlinkedCrmClients: UnlinkedCrmClient[];
  totalBuildOps: number;
  totalMatched: number;
  totalUnmatched: number;
  duplicateGroups: DuplicateGroup[];
}

function BuildOpsMatchingPanel() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "matched" | "unmatched">("all");
  const [search, setSearch] = useState("");
  const [matchingBuildopsId, setMatchingBuildopsId] = useState<string | null>(null);
  const [selectedCrmClientId, setSelectedCrmClientId] = useState<string>("");

  const { data, isLoading, error } = useQuery<LinkedDataResponse>({
    queryKey: ["/api/buildops/linked-data"],
  });

  const matchMutation = useMutation({
    mutationFn: async ({ crmClientId, buildopsId }: { crmClientId: number; buildopsId: string }) => {
      const res = await apiRequest("POST", "/api/buildops/match-client", { crmClientId, buildopsId });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/linked-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setMatchingBuildopsId(null);
      setSelectedCrmClientId("");
      toast({ title: "Matched successfully" });
    },
    onError: (err: any) => toast({ title: "Match failed", description: err.message, variant: "destructive" }),
  });

  const unmatchMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest("POST", `/api/buildops/unmatch-client/${clientId}`, {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/linked-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Unmatched successfully" });
    },
    onError: (err: any) => toast({ title: "Unmatch failed", description: err.message, variant: "destructive" }),
  });

  const [mergePreview, setMergePreview] = useState<{ group: DuplicateGroup; keepId: number; deleteId: number } | null>(null);
  const [fieldChoices, setFieldChoices] = useState<Record<string, string>>({});

  const mergeMutation = useMutation({
    mutationFn: async ({ keepClientId, deleteClientId, fieldChoices: fc }: { keepClientId: number; deleteClientId: number; fieldChoices?: Record<string, string> }) => {
      const res = await apiRequest("POST", "/api/buildops/merge-duplicate", { keepClientId, deleteClientId, fieldChoices: fc });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/linked-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setMergePreview(null);
      setFieldChoices({});
      toast({ title: "Duplicates merged successfully" });
    },
    onError: (err: any) => toast({ title: "Merge failed", description: err.message, variant: "destructive" }),
  });

  const filteredCustomers = (data?.customers ?? []).filter(c => {
    if (filter === "matched" && !c.matched) return false;
    if (filter === "unmatched" && c.matched) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.buildopsName.toLowerCase().includes(q) ||
        (c.buildopsEmail ?? "").toLowerCase().includes(q) ||
        (c.crmClientName ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  if (isLoading) {
    return (
      <Card className="border-none shadow-sm bg-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading BuildOps data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-none shadow-sm bg-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            Failed to load BuildOps data. Make sure credentials are configured and connection is verified.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="border-none shadow-sm bg-card">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <LinkIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-heading">BuildOps Customer Matching</CardTitle>
            <CardDescription className="text-xs">
              {data ? `${data.totalMatched} matched, ${data.totalUnmatched} unmatched of ${data.totalBuildOps} BuildOps customers` : "Match or unmatch BuildOps customers to your CRM clients"}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/buildops/linked-data"] })}
            data-testid="button-refresh-linked-data"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] h-8"
            data-testid="input-search-linked-data"
          />
          <div className="flex gap-1">
            {(["all", "matched", "unmatched"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
                data-testid={`button-filter-${f}`}
              >
                {f === "all" ? `All (${data?.totalBuildOps ?? 0})` : f === "matched" ? `Matched (${data?.totalMatched ?? 0})` : `Unmatched (${data?.totalUnmatched ?? 0})`}
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {search ? "No results match your search" : "No BuildOps customers found"}
              </div>
            ) : (
              <table className="w-full text-sm min-w-[560px]">
                <thead className="bg-muted/40 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">BuildOps Customer</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">CRM Match</th>
                    <th className="text-left px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right px-3 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider w-[120px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCustomers.map(c => (
                    <tr key={c.buildopsId} className="hover:bg-muted/20" data-testid={`row-linked-${c.buildopsId}`}>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-sm truncate max-w-[200px]">{c.buildopsName}</p>
                        {c.buildopsEmail && <p className="text-xs text-muted-foreground truncate">{c.buildopsEmail}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        {c.matched ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            <span className="text-sm truncate max-w-[180px]">{c.crmClientName}</span>
                          </div>
                        ) : matchingBuildopsId === c.buildopsId ? (
                          <div className="flex items-center gap-1.5">
                            <Select value={selectedCrmClientId} onValueChange={setSelectedCrmClientId}>
                              <SelectTrigger className="h-7 text-xs w-[180px]" data-testid={`select-match-client-${c.buildopsId}`}>
                                <SelectValue placeholder="Select CRM client..." />
                              </SelectTrigger>
                              <SelectContent>
                                {(data?.unlinkedCrmClients ?? []).map(cl => (
                                  <SelectItem key={cl.id} value={String(cl.id)}>
                                    {cl.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="h-7 px-2"
                              disabled={!selectedCrmClientId || matchMutation.isPending}
                              onClick={() => matchMutation.mutate({ crmClientId: parseInt(selectedCrmClientId), buildopsId: c.buildopsId })}
                              data-testid={`button-confirm-match-${c.buildopsId}`}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => { setMatchingBuildopsId(null); setSelectedCrmClientId(""); }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No match</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${c.matched ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
                        >
                          {c.matched ? "Linked" : "Unlinked"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {c.matched ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                            onClick={() => c.crmClientId && unmatchMutation.mutate(c.crmClientId)}
                            disabled={unmatchMutation.isPending}
                            data-testid={`button-unmatch-${c.buildopsId}`}
                          >
                            <X className="h-3 w-3" />
                            Unmatch
                          </Button>
                        ) : matchingBuildopsId !== c.buildopsId ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => { setMatchingBuildopsId(c.buildopsId); setSelectedCrmClientId(""); }}
                            data-testid={`button-match-${c.buildopsId}`}
                          >
                            <LinkIcon className="h-3 w-3" />
                            Match
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {(data?.duplicateGroups ?? []).length > 0 && (
          <div className="mt-4 border rounded-lg border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">
                {data!.duplicateGroups.length} Duplicate {data!.duplicateGroups.length === 1 ? "Group" : "Groups"} Detected
              </span>
            </div>
            <p className="text-xs text-amber-700">
              These CRM clients share the same name. Click "Review & Merge" to compare their info side by side, choose which values to keep, and combine them into one record.
            </p>
            {data!.duplicateGroups.map((group, gi) => (
              <div key={gi} className="bg-white rounded-md border border-amber-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">"{group.name}" — {group.clients.length} records</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => {
                      setMergePreview({ group, keepId: group.clients[0].id, deleteId: group.clients[1].id });
                      setFieldChoices({});
                    }}
                    data-testid={`button-review-merge-${gi}`}
                  >
                    <LinkIcon className="h-3 w-3" />
                    Review & Merge
                  </Button>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  {group.clients.map(c => (
                    <div key={c.id} className="flex items-center gap-1.5">
                      <span className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">ID {c.id}</span>
                      {c.email && <span>{c.email}</span>}
                      {c.phone && <span>{c.phone}</span>}
                      {c.buildopsId && <span className="text-green-700">BuildOps ✓</span>}
                      {!c.email && !c.phone && !c.buildopsId && <span className="italic">no extra info</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>

    {mergePreview && (() => {
      const a = mergePreview.group.clients.find(c => c.id === mergePreview.keepId)!;
      const b = mergePreview.group.clients.find(c => c.id === mergePreview.deleteId)!;

      const MERGE_FIELDS: { key: string; label: string }[] = [
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "industry", label: "Industry" },
        { key: "address", label: "Address" },
        { key: "website", label: "Website" },
        { key: "annualRevenue", label: "Annual Revenue" },
        { key: "tier", label: "Tier" },
        { key: "notes", label: "Notes" },
      ];

      return (
        <AlertDialog open onOpenChange={(open) => { if (!open) { setMergePreview(null); setFieldChoices({}); } }}>
          <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base">Merge "{mergePreview.group.name}" Records</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                Compare the two records below. Where both have different values, pick which one to keep. All leads, contacts, estimates, and other records will be combined.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-1 mt-2">
              <div className="grid grid-cols-[140px_1fr_1fr] gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider pb-2 border-b">
                <span>Field</span>
                <span>Record #{a.id}</span>
                <span>Record #{b.id}</span>
              </div>

              {MERGE_FIELDS.map(({ key, label }) => {
                const aVal = (a as any)[key] || "";
                const bVal = (b as any)[key] || "";
                const aStr = String(aVal).trim();
                const bStr = String(bVal).trim();
                const bothHaveValues = !!aStr && !!bStr;
                const conflict = bothHaveValues && aStr !== bStr;
                const chosen = fieldChoices[key];

                return (
                  <div key={key} className={`grid grid-cols-[140px_1fr_1fr] gap-2 py-2 text-sm items-start ${conflict ? "bg-amber-50/60 -mx-2 px-2 rounded" : ""} border-b border-border/40`}>
                    <span className="text-xs font-medium text-muted-foreground pt-0.5">{label}</span>
                    {conflict ? (
                      <>
                        <button
                          onClick={() => setFieldChoices(prev => ({ ...prev, [key]: aStr }))}
                          className={`text-left text-xs p-2 rounded border transition-colors break-words ${chosen === aStr ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border hover:border-primary/40"}`}
                          data-testid={`merge-pick-a-${key}`}
                        >
                          {aStr}
                        </button>
                        <button
                          onClick={() => setFieldChoices(prev => ({ ...prev, [key]: bStr }))}
                          className={`text-left text-xs p-2 rounded border transition-colors break-words ${chosen === bStr ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border hover:border-primary/40"}`}
                          data-testid={`merge-pick-b-${key}`}
                        >
                          {bStr}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`text-xs break-words ${aStr ? "" : "text-muted-foreground italic"}`}>{aStr || "—"}</span>
                        <span className={`text-xs break-words ${bStr ? "" : "text-muted-foreground italic"}`}>{bStr || "—"}</span>
                      </>
                    )}
                  </div>
                );
              })}

              {(a.serviceNeeds?.length || b.serviceNeeds?.length) ? (
                <div className="grid grid-cols-[140px_1fr_1fr] gap-2 py-2 text-sm border-b border-border/40">
                  <span className="text-xs font-medium text-muted-foreground">Service Needs</span>
                  <span className="text-xs">{(a.serviceNeeds || []).join(", ") || "—"}</span>
                  <span className="text-xs">{(b.serviceNeeds || []).join(", ") || "—"}</span>
                </div>
              ) : null}

              <div className="grid grid-cols-[140px_1fr_1fr] gap-2 py-2 text-sm border-b border-border/40">
                <span className="text-xs font-medium text-muted-foreground">BuildOps Link</span>
                <span className="text-xs">{a.buildopsId ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">Linked</Badge> : "—"}</span>
                <span className="text-xs">{b.buildopsId ? <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">Linked</Badge> : "—"}</span>
              </div>
            </div>

            {(() => {
              const conflicts = MERGE_FIELDS.filter(({ key }) => {
                const aStr = String((a as any)[key] || "").trim();
                const bStr = String((b as any)[key] || "").trim();
                return !!aStr && !!bStr && aStr !== bStr;
              });
              const unresolvedCount = conflicts.filter(({ key }) => !fieldChoices[key]).length;

              return (
                <div className="mt-3 space-y-3">
                  {unresolvedCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {unresolvedCount} conflicting {unresolvedCount === 1 ? "field needs" : "fields need"} your choice — click a value above to select it
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded">
                    Record <span className="font-mono font-medium">#{a.id}</span> will be kept as the primary. Any missing info will be filled from <span className="font-mono font-medium">#{b.id}</span>. Service needs will be combined. Notes will be merged. All leads, contacts, and records from both will be combined.
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-merge">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={unresolvedCount > 0 || mergeMutation.isPending}
                      onClick={(e) => {
                        e.preventDefault();
                        mergeMutation.mutate({ keepClientId: a.id, deleteClientId: b.id, fieldChoices });
                      }}
                      data-testid="button-confirm-merge"
                    >
                      {mergeMutation.isPending ? "Merging..." : "Confirm Merge"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </div>
              );
            })()}
          </AlertDialogContent>
        </AlertDialog>
      );
    })()}
    </>
  );
}

// ── Field mapping definitions ────────────────────────────────────────────────
type FieldStatus = "mapped" | "partial" | "unmapped";
interface FieldMapping { crmField: string; status: FieldStatus; note?: string }

const CUSTOMER_FIELD_MAP: Record<string, FieldMapping> = {
  id:              { crmField: "clients.buildopsId", status: "mapped" },
  name:            { crmField: "clients.name", status: "mapped" },
  email:           { crmField: "clients.email", status: "mapped" },
  phonePrimary:    { crmField: "clients.phone", status: "mapped" },
  phoneAlternate:  { crmField: "", status: "unmapped" },
  status:          { crmField: "", status: "unmapped" },
  customerType:    { crmField: "", status: "unmapped" },
  customerNumber:  { crmField: "", status: "unmapped" },
  accountNumber:   { crmField: "", status: "unmapped" },
  addresses:       { crmField: "clients.address (billing addr)", status: "partial", note: "Only billing address used" },
};

const QUOTE_FIELD_MAP: Record<string, FieldMapping> = {
  id:                        { crmField: "leads.buildopsQuoteId", status: "mapped" },
  quoteNumber:               { crmField: "leads.buildopsQuoteNumber", status: "mapped" },
  name:                      { crmField: "leads.title", status: "mapped" },
  status:                    { crmField: "leads.buildopsQuoteStatus", status: "mapped" },
  totalAmountQuoted:         { crmField: "leads.value + buildopsQuoteTotal", status: "mapped" },
  billingCustomerId:         { crmField: "leads.clientId (UUID match)", status: "mapped" },
  billTo:                    { crmField: "leads.clientId (name fallback)", status: "partial", note: "Used when billingCustomerId is null" },
  scopeOfWork:               { crmField: "", status: "unmapped" },
  issueDescription:          { crmField: "", status: "unmapped" },
  description:               { crmField: "", status: "unmapped" },
  propertyId:                { crmField: "leads.buildopsPropertyId → contactBuildings", status: "mapped", note: "Property match tier" },
  dueDate:                   { crmField: "", status: "unmapped" },
  expirationDate:            { crmField: "", status: "unmapped" },
  expirationLength:          { crmField: "", status: "unmapped" },
  subTotal:                  { crmField: "", status: "unmapped" },
  totalEstimatedCost:        { crmField: "", status: "unmapped", note: "Useful for margin calc" },
  totalBudgetedHours:        { crmField: "", status: "unmapped" },
  departmentId:              { crmField: "", status: "unmapped", note: "Could map to serviceType" },
  accountManagerId:          { crmField: "", status: "unmapped", note: "Could map to assignedTo" },
  salesById:                 { crmField: "", status: "unmapped" },
  customerPoNumber:          { crmField: "", status: "unmapped" },
  internalApprovalStatus:    { crmField: "", status: "unmapped" },
  billingStatus:             { crmField: "", status: "unmapped" },
  version:                   { crmField: "", status: "unmapped" },
  serviceAgreementId:        { crmField: "", status: "unmapped" },
  jobTypeId:                 { crmField: "", status: "unmapped" },
  orderedById:               { crmField: "", status: "unmapped" },
  propertyRepId:             { crmField: "", status: "unmapped" },
  audit:                     { crmField: "", status: "unmapped", note: "Contains createdBy/createdDate" },
  taxRateId:                 { crmField: "", status: "unmapped" },
};

const SA_FIELD_MAP: Record<string, FieldMapping> = {
  id:                        { crmField: "buildops_agreements.buildopsId", status: "mapped" },
  agreementNumber:           { crmField: "buildops_agreements.agreementNumber", status: "mapped" },
  name:                      { crmField: "buildops_agreements.agreementName", status: "mapped" },
  status:                    { crmField: "buildops_agreements.status", status: "mapped" },
  startDate:                 { crmField: "buildops_agreements.startDate", status: "mapped" },
  endDate:                   { crmField: "buildops_agreements.endDate", status: "mapped" },
  contractValue:             { crmField: "buildops_agreements.contractValue", status: "mapped" },
  totalAmount:               { crmField: "buildops_agreements.contractValue (fallback)", status: "partial", note: "Used when contractValue is null" },
  frequency:                 { crmField: "buildops_agreements.frequency", status: "mapped" },
  advancedSchedulingState:   { crmField: "buildops_agreements.advancedSchedulingState", status: "mapped" },
  customerId:                { crmField: "buildops_agreements.clientId (UUID match)", status: "mapped" },
};

const JOB_FIELD_MAP: Record<string, FieldMapping> = {
  id:                      { crmField: "buildops_jobs.buildopsId", status: "mapped" },
  jobNumber:               { crmField: "buildops_jobs.jobNumber", status: "mapped" },
  title:                   { crmField: "buildops_jobs.title", status: "mapped" },
  issueDescription:        { crmField: "buildops_jobs.issueDescription", status: "mapped" },
  status:                  { crmField: "buildops_jobs.status", status: "mapped" },
  priority:                { crmField: "buildops_jobs.priority", status: "mapped" },
  jobTypeName:             { crmField: "buildops_jobs.jobTypeName", status: "mapped" },
  billingType:             { crmField: "buildops_jobs.billingType", status: "mapped", note: "T&M, Fixed, SA, etc." },
  billingStatus:           { crmField: "buildops_jobs.billingStatus", status: "mapped" },
  customerName:            { crmField: "buildops_jobs.customerName", status: "mapped" },
  customerPropertyName:    { crmField: "buildops_jobs.customerPropertyName", status: "mapped" },
  amountQuoted:            { crmField: "buildops_jobs.amountQuoted", status: "mapped" },
  totalAmount:             { crmField: "buildops_jobs.totalAmount", status: "mapped", note: "$0 for T&M until invoiced" },
  costAmount:              { crmField: "buildops_jobs.costAmount", status: "mapped" },
  laborCost:               { crmField: "buildops_jobs.laborCost", status: "mapped" },
  materialCost:            { crmField: "buildops_jobs.materialCost", status: "mapped" },
  grossProfit:             { crmField: "buildops_jobs.grossProfit", status: "mapped" },
  scheduledDate:           { crmField: "buildops_jobs.scheduledDate", status: "mapped", note: "Also checks scheduledStart, scheduledStartDate" },
  scheduledStart:          { crmField: "buildops_jobs.scheduledDate (alias)", status: "partial", note: "Mapped to scheduledDate column" },
  dueDate:                 { crmField: "buildops_jobs.dueDate", status: "mapped" },
  completedDate:           { crmField: "buildops_jobs.completedDate", status: "mapped" },
  customerId:              { crmField: "buildops_jobs.clientId (UUID match)", status: "mapped" },
  customerPropertyId:      { crmField: "buildops_jobs.buildopsPropertyId", status: "mapped" },
  quoteId:                 { crmField: "buildops_jobs.buildopsQuoteId", status: "mapped" },
  serviceAgreementId:      { crmField: "buildops_jobs.buildopsServiceAgreementId + isServiceAgreementJob", status: "mapped" },
};

const INVOICE_FIELD_MAP: Record<string, FieldMapping> = {
  id:              { crmField: "buildops_invoices.buildopsId", status: "mapped" },
  invoiceNumber:   { crmField: "buildops_invoices.invoiceNumber", status: "mapped" },
  status:          { crmField: "buildops_invoices.status", status: "mapped" },
  totalAmount:     { crmField: "buildops_invoices.totalAmount", status: "mapped" },
  subtotal:        { crmField: "buildops_invoices.subtotal", status: "mapped" },
  taxAmount:       { crmField: "buildops_invoices.taxAmount", status: "mapped" },
  customerName:    { crmField: "buildops_invoices.customerName", status: "mapped" },
  jobNumber:       { crmField: "buildops_invoices.jobNumber", status: "mapped" },
  isFinalInvoice:  { crmField: "buildops_invoices.isFinalInvoice", status: "mapped" },
  issuedDate:      { crmField: "buildops_invoices.issuedDate", status: "mapped" },
  dueDate:         { crmField: "buildops_invoices.dueDate", status: "mapped" },
  closedDate:      { crmField: "buildops_invoices.closedDate", status: "mapped" },
  customerId:      { crmField: "buildops_invoices.clientId (UUID match)", status: "mapped" },
  jobId:           { crmField: "buildops_invoices.buildopsJobId", status: "mapped" },
};

const FIELD_STATUS_BADGE: Record<FieldStatus, string> = {
  mapped:   "bg-green-100 text-green-700 border-green-200",
  partial:  "bg-amber-100 text-amber-700 border-amber-200",
  unmapped: "bg-slate-100 text-slate-500 border-slate-200",
};

function formatCellValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") return JSON.stringify(val).slice(0, 80);
  return String(val).slice(0, 80);
}

function AuditTable({ records, detailRecord, fieldMap, entityLabel }: {
  records: any[];
  detailRecord: any | null;
  fieldMap: Record<string, FieldMapping>;
  entityLabel: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | FieldStatus>("all");

  // Build complete set of keys: from listing + detail record
  const listingKeys = Array.from(new Set(records.flatMap(r => Object.keys(r))));
  const detailKeys = detailRecord ? Object.keys(detailRecord) : [];
  const extraDetailKeys = detailKeys.filter(k => !listingKeys.includes(k));
  const allKeys = [...listingKeys, ...extraDetailKeys];

  const filteredKeys = allKeys.filter(k => {
    if (filterStatus === "all") return true;
    const mapping = fieldMap[k];
    if (!mapping) return filterStatus === "unmapped";
    return mapping.status === filterStatus;
  });

  const mappedCount = allKeys.filter(k => fieldMap[k]?.status === "mapped").length;
  const partialCount = allKeys.filter(k => fieldMap[k]?.status === "partial").length;
  const unmappedCount = allKeys.filter(k => !fieldMap[k] || fieldMap[k]?.status === "unmapped").length;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">{allKeys.length} fields from BuildOps API</span>
        <button onClick={() => setFilterStatus("all")} className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${filterStatus === "all" ? "bg-slate-700 text-white border-slate-700" : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"}`}>
          All ({allKeys.length})
        </button>
        <button onClick={() => setFilterStatus("mapped")} className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${filterStatus === "mapped" ? "bg-green-600 text-white border-green-600" : "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"}`}>
          Mapped ({mappedCount})
        </button>
        <button onClick={() => setFilterStatus("partial")} className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${filterStatus === "partial" ? "bg-amber-600 text-white border-amber-600" : "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200"}`}>
          Partial ({partialCount})
        </button>
        <button onClick={() => setFilterStatus("unmapped")} className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${filterStatus === "unmapped" ? "bg-slate-600 text-white border-slate-600" : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"}`}>
          Unmapped ({unmappedCount})
        </button>
      </div>

      {/* Field mapping legend */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/40 px-3 py-2 border-b flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Field Mapping Legend</span>
          <span className="text-xs text-muted-foreground">{entityLabel} fields → CRM fields</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 max-h-56 overflow-y-auto">
          {filteredKeys.map((key, i) => {
            const mapping = fieldMap[key];
            const status: FieldStatus = mapping?.status ?? "unmapped";
            const isFromDetailOnly = extraDetailKeys.includes(key);
            return (
              <div key={key} className={`flex items-start gap-2 px-3 py-1.5 text-xs border-b last:border-b-0 ${i % 2 === 1 ? "border-l" : ""}`}>
                <div className="flex-1 min-w-0">
                  <span className="font-mono font-medium text-slate-700">{key}</span>
                  {isFromDetailOnly && <span className="ml-1 text-[10px] text-blue-500">(detail only)</span>}
                </div>
                {mapping?.crmField ? (
                  <span className="text-slate-500 shrink-0">→ <span className="font-mono text-slate-600">{mapping.crmField}</span></span>
                ) : (
                  <span className={`shrink-0 px-1.5 py-0 rounded border text-[10px] font-medium ${FIELD_STATUS_BADGE[status]}`}>
                    {status === "unmapped" ? "unmapped" : status}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Data table */}
      {records.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/40 px-3 py-2 border-b flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live Data — {records.length} of {entityLabel}s shown
            </span>
            <button onClick={() => setShowAll(v => !v)} className="text-xs text-primary hover:underline">
              {showAll ? "Show fewer" : "Show all fields"}
            </button>
          </div>
          <div className="overflow-x-auto max-h-80">
            <table className="text-xs w-full border-collapse min-w-max">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted/80">
                  {filteredKeys.slice(0, showAll ? undefined : 8).map(key => {
                    const mapping = fieldMap[key];
                    const status: FieldStatus = mapping?.status ?? "unmapped";
                    return (
                      <th key={key} className={`px-3 py-2 text-left font-semibold whitespace-nowrap border-r last:border-r-0 ${
                        status === "mapped" ? "text-green-700 bg-green-50" :
                        status === "partial" ? "text-amber-700 bg-amber-50" :
                        "text-slate-500"
                      }`}>
                        <div>{key}</div>
                        {mapping?.crmField && <div className="text-[10px] font-normal opacity-70">→ {mapping.crmField.split(" ")[0]}</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {records.map((record, ri) => (
                  <tr key={ri} className="border-t hover:bg-muted/30">
                    {filteredKeys.slice(0, showAll ? undefined : 8).map(key => (
                      <td key={key} className="px-3 py-1.5 whitespace-nowrap border-r last:border-r-0 font-mono text-slate-600 max-w-[200px] truncate">
                        {formatCellValue(record[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!showAll && filteredKeys.length > 8 && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/20">
              Showing first 8 of {filteredKeys.length} fields. Click "Show all fields" above to see all.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BuildOpsAuditPanel() {
  const [auditTab, setAuditTab] = useState("quotes");
  const [hasFetched, setHasFetched] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<{
    customers: any[];
    customerDetail: any | null;
    customerCount: number;
    quotes: any[];
    quoteDetail: any | null;
    quoteCount: number;
    serviceAgreements: any[];
    serviceAgreementCount: number;
    jobs: any[];
    jobCount: number;
    jobDetail: any | null;
    invoices: any[];
    invoiceCount: number;
    invoiceDetail: any | null;
  }>({
    queryKey: ["/api/buildops/audit-data"],
    enabled: false,
  });

  const handleFetch = () => {
    setHasFetched(true);
    refetch();
  };

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <GitBranch className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-heading">Data Field Audit</CardTitle>
            <CardDescription className="text-xs">
              View all raw fields returned by the BuildOps API — see what's mapped to your CRM and what isn't. Use this to tell us which fields to wire up.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleFetch}
            disabled={isLoading}
            data-testid="button-buildops-audit-fetch"
          >
            {isLoading ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            {isLoading ? "Fetching..." : hasFetched ? "Refresh Data" : "Fetch Live Data"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {!hasFetched && !isLoading && (
          <div className="text-center py-10 text-muted-foreground">
            <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Click "Fetch Live Data" to pull raw field data from BuildOps</p>
            <p className="text-xs mt-1 opacity-70">Fetches sample records from customers, quotes, jobs, invoices, and service agreements</p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive py-4">
            <AlertCircle className="h-4 w-4" />
            Failed to fetch audit data. Ensure BuildOps is connected.
          </div>
        )}
        {data && (
          <Tabs value={auditTab} onValueChange={setAuditTab}>
            <TabsList className="mb-4 h-9 bg-muted/60 rounded-lg p-1 flex-nowrap gap-1 overflow-x-auto scrollbar-hide">
              <TabsTrigger value="jobs" className="text-xs h-7 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Jobs ({data.jobCount})
              </TabsTrigger>
              <TabsTrigger value="invoices" className="text-xs h-7 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Invoices ({data.invoiceCount})
              </TabsTrigger>
              <TabsTrigger value="service-agreements" className="text-xs h-7 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Service Agmts ({data.serviceAgreementCount ?? data.serviceAgreements.length})
              </TabsTrigger>
              <TabsTrigger value="quotes" className="text-xs h-7 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Quotes ({data.quoteCount})
              </TabsTrigger>
              <TabsTrigger value="customers" className="text-xs h-7 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Customers ({data.customerCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jobs" className="space-y-0 mt-0">
              {data.jobs.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No jobs returned from BuildOps API.</div>
              ) : (
                <AuditTable
                  records={data.jobs}
                  detailRecord={data.jobDetail}
                  fieldMap={JOB_FIELD_MAP}
                  entityLabel="Job"
                />
              )}
            </TabsContent>

            <TabsContent value="invoices" className="space-y-0 mt-0">
              {data.invoices.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No invoices returned from BuildOps API.</div>
              ) : (
                <AuditTable
                  records={data.invoices}
                  detailRecord={data.invoiceDetail}
                  fieldMap={INVOICE_FIELD_MAP}
                  entityLabel="Invoice"
                />
              )}
            </TabsContent>

            <TabsContent value="quotes" className="space-y-0 mt-0">
              <AuditTable
                records={data.quotes}
                detailRecord={data.quoteDetail}
                fieldMap={QUOTE_FIELD_MAP}
                entityLabel="Quote"
              />
            </TabsContent>

            <TabsContent value="customers" className="space-y-0 mt-0">
              <AuditTable
                records={data.customers}
                detailRecord={data.customerDetail}
                fieldMap={CUSTOMER_FIELD_MAP}
                entityLabel="Customer"
              />
            </TabsContent>

            <TabsContent value="service-agreements" className="space-y-0 mt-0">
              {data.serviceAgreements.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No service agreements found.
                </div>
              ) : (
                <AuditTable
                  records={data.serviceAgreements}
                  detailRecord={data.serviceAgreements[0] ?? null}
                  fieldMap={SA_FIELD_MAP}
                  entityLabel="Service Agreement"
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function UserRepRow({ user, onSave, isSaving }: {
  user: User;
  onSave: (userId: string, buildopsRepId: string | null) => void;
  isSaving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(user.buildopsRepId ?? "");

  const displayName = user.firstName || user.lastName
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
    : user.email ?? "—";

  const handleSave = () => {
    const val = inputVal.trim() || null;
    onSave(user.id, val);
    setEditing(false);
  };

  const handleUnlink = () => {
    setInputVal("");
    onSave(user.id, null);
    setEditing(false);
  };

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-3 py-2 font-medium">{displayName}</td>
      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell text-xs">{user.email ?? "—"}</td>
      <td className="px-3 py-2">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input
              className="h-7 text-xs w-56 font-mono"
              placeholder="Paste BuildOps rep ID…"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
              autoFocus
              data-testid={`input-rep-id-${user.id}`}
            />
            <Button size="sm" variant="default" className="h-7 px-2 text-xs" onClick={handleSave} disabled={isSaving} data-testid={`button-save-rep-${user.id}`}>
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setInputVal(user.buildopsRepId ?? ""); setEditing(false); }}>
              Cancel
            </Button>
          </div>
        ) : user.buildopsRepId ? (
          <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400 text-xs font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-mono">{user.buildopsRepId}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">— not linked —</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1">
          {!editing && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => { setInputVal(user.buildopsRepId ?? ""); setEditing(true); }}
              disabled={isSaving}
              data-testid={`button-edit-rep-${user.id}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {user.buildopsRepId && !editing && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-muted-foreground hover:text-destructive"
              onClick={handleUnlink}
              disabled={isSaving}
              data-testid={`button-unlink-rep-${user.id}`}
            >
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function AccountManagerMappingPanel() {
  const { toast } = useToast();

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const autoMatchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/buildops/auto-match-reps", {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json() as Promise<{ matched: number; unmatched: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Auto-match complete", description: `${data.matched} user${data.matched !== 1 ? "s" : ""} matched by email.` });
    },
    onError: (err: any) => toast({ title: "Auto-match failed", description: err.message, variant: "destructive" }),
  });

  const linkRepMutation = useMutation({
    mutationFn: async ({ userId, buildopsRepId }: { userId: string; buildopsRepId: string | null }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/buildops-rep`, { buildopsRepId });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Rep assignment saved" });
    },
    onError: (err: any) => toast({ title: "Failed to update", description: err.message, variant: "destructive" }),
  });

  const linkedCount = allUsers.filter(u => u.buildopsRepId).length;

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Account Manager Mapping</CardTitle>
            {allUsers.length > 0 && (
              <span className="text-xs text-muted-foreground">({linkedCount}/{allUsers.length} linked)</span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => autoMatchMutation.mutate()}
            disabled={autoMatchMutation.isPending || usersLoading}
            data-testid="button-auto-match-reps"
          >
            {autoMatchMutation.isPending ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5 mr-1.5" />}
            Auto-Match by Email
          </Button>
        </div>
        <CardDescription className="text-xs">
          Link each CRM user to their BuildOps rep ID. Paste the ID from BuildOps, or use Auto-Match to link by email automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {usersLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : allUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">No CRM users found.</p>
        ) : (
          <div className="border rounded-md overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left font-semibold px-3 py-2">CRM User</th>
                  <th className="text-left font-semibold px-3 py-2 hidden sm:table-cell">Email</th>
                  <th className="text-left font-semibold px-3 py-2">BuildOps Rep ID</th>
                  <th className="w-[90px] px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allUsers.map(user => (
                  <UserRepRow
                    key={user.id}
                    user={user}
                    onSave={(userId, buildopsRepId) => linkRepMutation.mutate({ userId, buildopsRepId })}
                    isSaving={linkRepMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DataSourcesPanel() {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useQuery<any>({ queryKey: ["/api/admin/data-sources"] });
  const resolveMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/api/admin/merge-conflicts/${id}`, { status }).then(r => r.json()),
    onSuccess: () => { refetch(); toast({ title: "Conflict updated" }); },
  });

  const fmt = (ts: string | null) => ts ? new Date(ts).toLocaleString() : "Never";

  if (isLoading) return <div className="text-xs text-muted-foreground p-4">Loading data sources…</div>;

  const inv = data?.invoices ?? {};
  const jobs = data?.jobs ?? {};
  const conflicts: any[] = data?.conflicts ?? [];
  const importLog: any[] = data?.importLog ?? [];
  const pendingConflicts = conflicts.filter((c: any) => c.status === "pending");

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-heading">Data Sources</CardTitle>
            <CardDescription className="text-xs">
              Central data layer — import history, coverage, and merge conflicts
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Coverage grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoices</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total records</span><span className="font-medium">{inv.total?.toLocaleString() ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">From API sync</span><span className="font-medium">{inv.fromApi?.toLocaleString() ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CSV enriched</span>
                <span className="font-medium text-emerald-700">{inv.fromCsv?.toLocaleString() ?? 0} ({inv.total ? Math.round((inv.hasPaymentData / inv.total) * 100) : 0}%)</span>
              </div>
              <div className="flex justify-between pt-1 border-t"><span className="text-muted-foreground">Last API sync</span><span className="font-medium text-xs">{fmt(inv.lastApiSync)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last CSV upload</span><span className="font-medium text-xs">{fmt(inv.lastCsvSync)}</span></div>
            </div>
          </div>
          <div className="border rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jobs</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total records</span><span className="font-medium">{jobs.total?.toLocaleString() ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">From API sync</span><span className="font-medium">{jobs.fromApi?.toLocaleString() ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CSV enriched</span>
                <span className="font-medium text-emerald-700">{jobs.fromCsv?.toLocaleString() ?? 0} ({jobs.total ? Math.round(((jobs.fromCsv ?? 0) / jobs.total) * 100) : 0}%)</span>
              </div>
              <div className="flex justify-between pt-1 border-t"><span className="text-muted-foreground">Last API sync</span><span className="font-medium text-xs">{fmt(jobs.lastApiSync)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last CSV upload</span><span className="font-medium text-xs">{fmt(jobs.lastCsvSync)}</span></div>
            </div>
          </div>
        </div>

        {/* Recent imports */}
        {importLog.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Imports</p>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-left text-muted-foreground">
                  <th className="pb-1 pr-3">Source</th><th className="pb-1 pr-3">Type</th>
                  <th className="pb-1 pr-3">Processed</th><th className="pb-1 pr-3">Updated</th>
                  <th className="pb-1 pr-3">Conflicts</th><th className="pb-1">Time</th>
                </tr></thead>
                <tbody>
                  {importLog.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-1 pr-3 font-medium">{r.import_source}</td>
                      <td className="py-1 pr-3">{r.entity_type}</td>
                      <td className="py-1 pr-3">{r.records_processed}</td>
                      <td className="py-1 pr-3">{r.records_updated}</td>
                      <td className="py-1 pr-3">{r.conflict_count > 0 ? <span className="text-amber-600 font-medium">{r.conflict_count}</span> : 0}</td>
                      <td className="py-1 text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Merge conflicts */}
        {pendingConflicts.length > 0 ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Pending Conflicts <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{pendingConflicts.length}</span>
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pendingConflicts.map((c: any) => (
                <div key={c.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{c.entity_type} · {c.entity_key}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Field: <span className="font-medium text-foreground">{c.conflict_field}</span></p>
                  <div className="flex gap-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{c.source_a}: {c.value_a}</span>
                    <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">{c.source_b}: {c.value_b}</span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-6 text-xs"
                      onClick={() => resolveMutation.mutate({ id: c.id, status: "resolved" })}>Resolve</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground"
                      onClick={() => resolveMutation.mutate({ id: c.id, status: "ignored" })}>Ignore</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No pending merge conflicts.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  const [cancelInviteId, setCancelInviteId] = useState<number | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [savedPermission, setSavedPermission] = useState<string | null>(null);

  // Health Score Config state
  const [hsWeights, setHsWeights] = useState<Record<string, number>>({ jobFrequency: 25, recency: 15, revenue: 25, emailEngagement: 10, quoteAcceptance: 15, margin: 10 });
  const [hsEnabled, setHsEnabled] = useState<Record<string, boolean>>({ jobFrequency: true, recency: true, revenue: true, emailEngagement: true, quoteAcceptance: true, margin: true });
  const [hsHealthyThreshold, setHsHealthyThreshold] = useState(70);
  const [hsWatchThreshold, setHsWatchThreshold] = useState(40);
  const [hsTrendSensitivity, setHsTrendSensitivity] = useState(5);
  const [hsSettingsLoaded, setHsSettingsLoaded] = useState(false);
  const [isSavingHs, setIsSavingHs] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalcResult, setRecalcResult] = useState<{ updated: number; errors: number; completedAt: string } | null>(null);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);
  const [roleLabelEdits, setRoleLabelEdits] = useState<Record<string, string>>({});
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleDisplayName, setNewRoleDisplayName] = useState("");
  const [deleteRoleKey, setDeleteRoleKey] = useState<string | null>(null);
  const [newIndustryLabel, setNewIndustryLabel] = useState("");
  const { register, handleSubmit, reset, setValue, watch } = useForm({ defaultValues: { email: "", role: "member" } });

  const { data: myPerms } = useQuery<{ role: string; isSuperAdmin: boolean; permissions: Record<string, string> }>({
    queryKey: ["/api/my-permissions"],
  });
  const isSuperAdmin = myPerms?.isSuperAdmin ?? false;
  const { data: buildopsVerifiedSetting } = useQuery<{ value: string | null }>({ queryKey: ["/api/settings/buildopsConnectionVerified"] });
  const isBuildopsVerifiedForPanel = buildopsVerifiedSetting?.value === "true";

  const { data: adminSettings } = useQuery<Record<string, string>>({ queryKey: ["/api/admin-settings"] });
  const { data: lastRecalcData } = useQuery<{ lastRecalcAt: string | null }>({ queryKey: ["/api/admin/last-recalc"] });

  useEffect(() => {
    if (adminSettings && !hsSettingsLoaded) {
      const w = (k: string, def: number) => Math.round(parseFloat(adminSettings[`health.weight.${k}`] ?? String(def / 100)) * 100);
      const e = (k: string) => adminSettings[`health.enabled.${k}`] !== "false";
      setHsWeights({ jobFrequency: w("jobFrequency", 25), recency: w("recency", 15), revenue: w("revenue", 25), emailEngagement: w("emailEngagement", 10), quoteAcceptance: w("quoteAcceptance", 15), margin: w("margin", 10) });
      setHsEnabled({ jobFrequency: e("jobFrequency"), recency: e("recency"), revenue: e("revenue"), emailEngagement: e("emailEngagement"), quoteAcceptance: e("quoteAcceptance"), margin: e("margin") });
      setHsHealthyThreshold(parseInt(adminSettings["health.threshold.healthy"] ?? "70", 10));
      setHsWatchThreshold(parseInt(adminSettings["health.threshold.watch"] ?? "40", 10));
      setHsTrendSensitivity(parseInt(adminSettings["health.trend.sensitivity"] ?? "5", 10));
      setHsSettingsLoaded(true);
    }
  }, [adminSettings, hsSettingsLoaded]);

  if (currentUser && currentUser.role !== "admin" && currentUser.role !== "super_admin") {
    setLocation("/");
    return null;
  }

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isSuperAdmin,
  });

  const { data: invites = [], isLoading: invitesLoading } = useQuery<Invite[]>({
    queryKey: ["/api/invites"],
    enabled: isSuperAdmin,
  });

  const { data: roleConfigs = [] } = useQuery<RoleConfig[]>({
    queryKey: ["/api/role-configs"],
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    const edits: Record<string, string> = {};
    for (const cfg of roleConfigs) {
      if (cfg.roleKey === "super_admin") continue;
      if (!(cfg.roleKey in roleLabelEdits)) edits[cfg.roleKey] = cfg.displayName;
    }
    if (Object.keys(edits).length > 0) setRoleLabelEdits(prev => ({ ...edits, ...prev }));
  }, [roleConfigs]);

  const { data: permissions = [] } = useQuery<RolePermission[]>({
    queryKey: ["/api/permissions"],
    enabled: isSuperAdmin,
  });

  const updateLabelMutation = useMutation({
    mutationFn: ({ roleKey, displayName }: { roleKey: string; displayName: string }) =>
      apiRequest("PATCH", `/api/role-configs/${roleKey}`, { displayName }).then(r => r.json()),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-configs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-permissions"] });
      setSavedLabel(vars.roleKey);
      setTimeout(() => setSavedLabel(null), 2000);
    },
    onError: () => toast({ title: "Error saving label", variant: "destructive" }),
  });

  const createRoleMutation = useMutation({
    mutationFn: (displayName: string) =>
      apiRequest("POST", "/api/role-configs", { displayName }).then(r => r.json()),
    onSuccess: (config: RoleConfig) => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-configs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
      setNewRoleDisplayName("");
      setShowAddRole(false);
      toast({ title: `Role "${config.displayName}" created` });
    },
    onError: (err: any) => toast({ title: err?.message ?? "Error creating role", variant: "destructive" }),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleKey: string) => apiRequest("DELETE", `/api/role-configs/${roleKey}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-configs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteRoleKey(null);
      toast({ title: "Role deleted" });
    },
    onError: () => toast({ title: "Error deleting role", variant: "destructive" }),
  });

  const updatePermissionMutation = useMutation({
    mutationFn: ({ roleKey, module, accessLevel }: { roleKey: string; module: string; accessLevel: string }) =>
      apiRequest("PATCH", "/api/permissions", { roleKey, module, accessLevel }).then(r => r.json()),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-permissions"] });
      setSavedPermission(`${vars.roleKey}-${vars.module}`);
      setTimeout(() => setSavedPermission(null), 2000);
    },
    onError: () => toast({ title: "Error saving permission", variant: "destructive" }),
  });

  const getPermLevel = (roleKey: string, module: string) => {
    const found = permissions.find(p => p.roleKey === roleKey && p.module === module);
    return found?.accessLevel ?? "own_only";
  };

  const getRoleLabel = (roleKey: string) => {
    return roleConfigs.find(c => c.roleKey === roleKey)?.displayName ?? roleKey;
  };

  const nonAdminRoles = roleConfigs.filter(c => c.roleKey !== "admin" && c.roleKey !== "super_admin");
  const editableRoles = roleConfigs.filter(c => c.roleKey !== "super_admin");

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiRequest("PUT", `/api/users/${id}/role`, { role }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role updated" });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, team }: { id: string; team: string | null }) =>
      apiRequest("PATCH", `/api/users/${id}/team`, { team }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ceo/team-performance"] });
    },
    onError: () => toast({ title: "Failed to update team", variant: "destructive" }),
  });

  const updateRevenueTargetMutation = useMutation({
    mutationFn: ({ id, revenueTarget }: { id: string; revenueTarget: number | null }) =>
      apiRequest("PATCH", `/api/users/${id}/revenue-target`, { revenueTarget }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ceo/team-performance"] });
    },
    onError: () => toast({ title: "Failed to update revenue target", variant: "destructive" }),
  });

  const updateHideFromTeamPerfMutation = useMutation({
    mutationFn: ({ id, hide }: { id: string; hide: boolean }) =>
      apiRequest("PATCH", `/api/users/${id}/hide-from-team-performance`, { hide }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ceo/team-performance"] });
    },
    onError: () => toast({ title: "Failed to update team performance visibility", variant: "destructive" }),
  });

  const updateManagerMutation = useMutation({
    mutationFn: ({ id, managerUserId }: { id: string; managerUserId: string | null }) =>
      apiRequest("PATCH", `/api/users/${id}/manager`, { managerUserId }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/org-chart"] });
      toast({ title: "Manager updated" });
    },
    onError: () => toast({ title: "Failed to update manager", variant: "destructive" }),
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

  const { data: industryOptions, isLoading: industryLoading } = useQuery<IndustryOption[]>({
    queryKey: ["/api/industry-options"],
  });

  const addIndustryMutation = useMutation({
    mutationFn: (label: string) => apiRequest("POST", "/api/industry-options", { label }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/industry-options"] });
      setNewIndustryLabel("");
    },
    onError: () => toast({ title: "Failed to add industry", variant: "destructive" }),
  });

  const deleteIndustryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/industry-options/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/industry-options"] }),
    onError: () => toast({ title: "Failed to delete industry", variant: "destructive" }),
  });

  const { data: tierSettings = [], isLoading: tierLoading } = useQuery<{ id: number; tier: string; label: string | null; estimatedValue: string }[]>({
    queryKey: ["/api/value-tier-settings"],
  });

  const [tierInputs, setTierInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    const edits: Record<string, string> = {};
    for (const ts of tierSettings) {
      if (!(ts.tier in tierInputs)) edits[ts.tier] = String(Number(ts.estimatedValue));
    }
    if (Object.keys(edits).length > 0) setTierInputs(prev => ({ ...edits, ...prev }));
  }, [tierSettings]);

  const updateTierMutation = useMutation({
    mutationFn: ({ tier, estimatedValue }: { tier: string; estimatedValue: number }) =>
      apiRequest("PATCH", `/api/value-tier-settings/${encodeURIComponent(tier)}`, { estimatedValue }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/value-tier-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Tier value saved" });
    },
    onError: () => toast({ title: "Failed to save tier value", variant: "destructive" }),
  });

  const [receiptEmailInput, setReceiptEmailInput] = useState("");
  const { data: receiptEmailData } = useQuery<{ key: string; value: string | null }>({
    queryKey: ["/api/settings/receiptEmail"],
  });
  useEffect(() => {
    if (receiptEmailData?.value) setReceiptEmailInput(receiptEmailData.value);
  }, [receiptEmailData]);
  const saveReceiptEmailMutation = useMutation({
    mutationFn: () =>
      apiRequest("PUT", "/api/settings/receiptEmail", { value: receiptEmailInput.trim() }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/receiptEmail"] });
      toast({ title: "Receipt email saved" });
    },
    onError: () => toast({ title: "Failed to save receipt email", variant: "destructive" }),
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
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 gap-6 overflow-x-auto scrollbar-hide flex-nowrap">
          <TabsTrigger value="members" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium gap-2">
            <Users className="h-4 w-4" />
            Team Members
            {isSuperAdmin && <Badge variant="secondary" className="ml-1 h-5 px-1.5">{users.length}</Badge>}
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="teams" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium gap-2" data-testid="tab-teams">
              <Users2 className="h-4 w-4" />
              Teams
            </TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="invites" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium gap-2">
              <Mail className="h-4 w-4" />
              Invitations
              {pendingInvites.length > 0 && (
                <Badge className="ml-1 h-5 px-1.5 bg-primary text-primary-foreground">{pendingInvites.length}</Badge>
              )}
            </TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="permissions" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium gap-2">
              <Settings2 className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="configuration" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium gap-2">
              <Settings2 className="h-4 w-4" />
              Configuration
            </TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="buildops" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium gap-2" data-testid="tab-buildops">
              <Zap className="h-4 w-4" />
              BuildOps
            </TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="orgchart" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium gap-2" data-testid="tab-orgchart">
              <GitBranch className="h-4 w-4" />
              Org Chart
            </TabsTrigger>
          )}
          {(isSuperAdmin || (myPerms?.role === "admin")) && (
            <TabsTrigger value="health-score" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium gap-2" data-testid="tab-health-score">
              <Activity className="h-4 w-4" />
              Health Score
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members" className="pt-4 space-y-3">
          {!isSuperAdmin && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 shrink-0" />
              You can view the team roster. Contact your Super Admin to manage roles or invitations.
            </div>
          )}
          {usersLoading && isSuperAdmin ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : !isSuperAdmin ? (
            <div className="text-sm text-muted-foreground py-4">
              Team member list is visible to Super Admins only.
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm">No team members yet.</p>
          ) : (
            users.map(u => (
              <Card key={u.id} className="border-none shadow-sm bg-card">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={u.profileImageUrl ? `/api/users/${u.id}/avatar-img` : undefined} />
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
                      {u.role === "super_admin" && (
                        <Badge className="ml-2 text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border border-primary/20" variant="outline">Super Admin</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-muted-foreground">Team:</span>
                      <input
                        key={`team-${u.id}-${u.team}`}
                        defaultValue={u.team ?? ""}
                        placeholder="No team"
                        disabled={!isSuperAdmin}
                        onBlur={(e) => {
                          const val = e.target.value.trim() || null;
                          if (val !== (u.team ?? null)) {
                            updateTeamMutation.mutate({ id: u.id, team: val });
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                        className="text-[11px] font-medium text-foreground bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-primary focus:outline-none px-0.5 w-28 placeholder:text-muted-foreground/50"
                        data-testid={`input-team-${u.id}`}
                      />
                    </div>
                    {isSuperAdmin && (
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">Target $:</span>
                          <input
                            key={`target-${u.id}-${u.revenueTarget}`}
                            defaultValue={u.revenueTarget != null ? String(u.revenueTarget) : ""}
                            placeholder="role default"
                            type="number"
                            min={1}
                            onBlur={(e) => {
                              const raw = e.target.value.trim();
                              const val = raw === "" ? null : parseInt(raw, 10);
                              if (raw !== "" && (isNaN(val as number) || (val as number) < 1)) return;
                              if (val !== (u.revenueTarget ?? null)) {
                                updateRevenueTargetMutation.mutate({ id: u.id, revenueTarget: val });
                              }
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                            className="text-[11px] font-medium text-foreground bg-transparent border-b border-dashed border-muted-foreground/30 focus:border-primary focus:outline-none px-0.5 w-24 placeholder:text-muted-foreground/50"
                            data-testid={`input-revenue-target-${u.id}`}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            id={`team-perf-${u.id}`}
                            className="h-4 w-7 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
                            checked={!u.hideFromTeamPerformance}
                            onCheckedChange={(checked) => {
                              updateHideFromTeamPerfMutation.mutate({ id: u.id, hide: !checked });
                            }}
                            data-testid={`switch-team-perf-${u.id}`}
                          />
                          <label htmlFor={`team-perf-${u.id}`} className="text-[10px] text-muted-foreground cursor-pointer select-none">
                            In team perf.
                          </label>
                        </div>
                      </div>
                    )}
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
                        {[{ roleKey: "super_admin", displayName: "Super Admin" }, ...roleConfigs].map(cfg => (
                          <SelectItem key={cfg.roleKey} value={cfg.roleKey}>{cfg.displayName}</SelectItem>
                        ))}
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

        {/* ── Teams Management Tab ─────────────────────────────────────── */}
        <TabsContent value="teams" className="pt-4 space-y-4">
          <TeamsPanel users={users} />
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
                    {isSuperAdmin && (
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    )}
                    {roleConfigs.map(cfg => (
                      <SelectItem key={cfg.roleKey} value={cfg.roleKey}>{cfg.displayName}</SelectItem>
                    ))}
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
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${ROLE_COLORS[inv.role] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {getRoleLabel(inv.role)}
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
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${ROLE_COLORS[inv.role] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {getRoleLabel(inv.role)}
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
                          {getRoleLabel(inv.role)}
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

        <TabsContent value="permissions" className="pt-4 space-y-6">
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-primary" />
                    Roles
                  </CardTitle>
                  <CardDescription className="mt-1">Customize display names and create additional roles for your team.</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  onClick={() => { setShowAddRole(v => !v); setNewRoleDisplayName(""); }}
                  data-testid="button-add-role"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Role
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showAddRole && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/40 bg-primary/5">
                  <Input
                    value={newRoleDisplayName}
                    onChange={(e) => setNewRoleDisplayName(e.target.value)}
                    placeholder="e.g. Field Technician"
                    className="max-w-xs"
                    data-testid="input-new-role-name"
                    onKeyDown={(e) => { if (e.key === "Enter" && newRoleDisplayName.trim()) createRoleMutation.mutate(newRoleDisplayName.trim()); }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    disabled={!newRoleDisplayName.trim() || createRoleMutation.isPending}
                    onClick={() => createRoleMutation.mutate(newRoleDisplayName.trim())}
                    data-testid="button-confirm-add-role"
                  >
                    {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddRole(false)} data-testid="button-cancel-add-role">
                    Cancel
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <Badge className="bg-primary/10 text-primary border-primary/20 border text-xs font-semibold px-2 py-0.5">
                    <Lock className="h-3 w-3 mr-1" />
                    Super Admin
                  </Badge>
                </div>
                <Input value="Super Admin" disabled className="max-w-xs opacity-50" />
                <span className="text-xs text-muted-foreground">Cannot be renamed or deleted</span>
              </div>
              {editableRoles.length > 0 && <Separator />}
              {editableRoles.map((cfg) => (
                <div key={cfg.roleKey} className="flex items-center gap-3">
                  <div className="w-28 shrink-0">
                    <Badge className={`border text-xs font-semibold px-2 py-0.5 max-w-full truncate ${cfg.roleKey === "admin" ? "bg-red-100 text-red-700 border-red-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {cfg.roleKey}
                    </Badge>
                  </div>
                  <Input
                    value={roleLabelEdits[cfg.roleKey] ?? cfg.displayName}
                    onChange={(e) => setRoleLabelEdits(prev => ({ ...prev, [cfg.roleKey]: e.target.value }))}
                    placeholder={cfg.displayName}
                    className="max-w-xs"
                    data-testid={`input-role-label-${cfg.roleKey}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateLabelMutation.isPending}
                    onClick={() => updateLabelMutation.mutate({ roleKey: cfg.roleKey, displayName: roleLabelEdits[cfg.roleKey] ?? cfg.displayName })}
                    className="gap-1.5"
                    data-testid={`button-save-role-label-${cfg.roleKey}`}
                  >
                    {savedLabel === cfg.roleKey ? <Check className="h-3.5 w-3.5 text-green-600" /> : null}
                    {savedLabel === cfg.roleKey ? "Saved" : "Save"}
                  </Button>
                  {cfg.roleKey !== "admin" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteRoleKey(cfg.roleKey)}
                      data-testid={`button-delete-role-${cfg.roleKey}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" />
                Section Access
              </CardTitle>
              <CardDescription>
                Control what each role can see and do in every section. Changes take effect immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-6 py-3 min-w-[180px]">Section</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 min-w-[130px]">Super Admin</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 min-w-[120px]">{getRoleLabel("admin")}</th>
                      {nonAdminRoles.map(cfg => (
                        <th key={cfg.roleKey} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 py-3 min-w-[160px]">
                          <div className="flex items-center justify-center gap-1.5">
                            {cfg.displayName}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {MODULE_DEFS.map((mod) => (
                      <tr key={mod.key} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium">{mod.label}</p>
                          <p className="text-xs text-muted-foreground">{mod.description}</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge className="bg-primary/10 text-primary border-primary/20 border text-xs font-medium gap-1">
                            <Lock className="h-3 w-3" />
                            Full Access
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs font-medium gap-1">
                            <Lock className="h-3 w-3" />
                            Full Access
                          </Badge>
                        </td>
                        {nonAdminRoles.map(cfg => (
                          <td key={cfg.roleKey} className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Select
                                value={getPermLevel(cfg.roleKey, mod.key)}
                                onValueChange={(val) => updatePermissionMutation.mutate({ roleKey: cfg.roleKey, module: mod.key, accessLevel: val })}
                                disabled={updatePermissionMutation.isPending}
                              >
                                <SelectTrigger className="h-8 text-xs w-32" data-testid={`select-perm-${cfg.roleKey}-${mod.key}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACCESS_LEVELS.map(a => (
                                    <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {savedPermission === `${cfg.roleKey}-${mod.key}` && (
                                <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                    {[
                      { label: "Team Management", description: "Invite team members and assign roles" },
                      { label: "Roles & Permissions", description: "Configure role names and module access levels" },
                      { label: "System Configuration", description: "BuildOps integration, value tiers and system settings" },
                    ].map((sys) => (
                      <tr key={sys.label} className="hover:bg-muted/30 transition-colors bg-muted/10">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium">{sys.label}</p>
                          <p className="text-xs text-muted-foreground">{sys.description}</p>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge className="bg-primary/10 text-primary border-primary/20 border text-xs font-medium gap-1">
                            <Lock className="h-3 w-3" />
                            Full Access
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Badge className="bg-slate-100 text-slate-500 border-slate-200 border text-xs font-medium gap-1">
                            <Lock className="h-3 w-3" />
                            No Access
                          </Badge>
                        </td>
                        {nonAdminRoles.map(cfg => (
                          <td key={cfg.roleKey} className="px-4 py-4 text-center">
                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 border text-xs font-medium gap-1">
                              <Lock className="h-3 w-3" />
                              No Access
                            </Badge>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t bg-muted/20 rounded-b-lg">
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {ACCESS_LEVELS.map(a => (
                    <span key={a.value} className="flex items-center gap-1">
                      <span className="font-medium text-foreground">{a.label}:</span> {a.description}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="pt-4 space-y-6">
          {/* Pipeline Stages */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <GitBranch className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-heading">Pipeline Stages</CardTitle>
                  <CardDescription className="text-xs">Configure deal pipeline stages and their order</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <PipelineStagesManager />
            </CardContent>
          </Card>

          {/* Contact Stages */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Users2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-heading">Contact Stages</CardTitle>
                  <CardDescription className="text-xs">Configure contact lifecycle stages</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ContactStagesManager inline />
            </CardContent>
          </Card>

          {/* Deal Tags */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-heading">Deal Tags</CardTitle>
                  <CardDescription className="text-xs">Manage tags used to label deals</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <DealTagsManager />
            </CardContent>
          </Card>

          {/* Value Tier Settings */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-heading">Value Tier Settings</CardTitle>
                  <CardDescription className="text-xs">Set the estimated dollar value for each deal tier. Used in pipeline calculations and sorting company-wide.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {tierLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {(tierSettings.length > 0 ? tierSettings : [
                    { id: 0, tier: "$", label: null, estimatedValue: "25000" },
                    { id: 0, tier: "$$", label: null, estimatedValue: "75000" },
                    { id: 0, tier: "$$$", label: null, estimatedValue: "200000" },
                    { id: 0, tier: "$$$$", label: null, estimatedValue: "500000" },
                  ]).map((ts) => (
                    <div key={ts.tier} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="w-12 text-center">
                        <span className="font-black text-lg text-primary">{ts.tier}</span>
                      </div>
                      <div className="flex-1">
                        <Input
                          data-testid={`input-tier-value-${ts.tier.replace(/\$/g, "s")}`}
                          type="number"
                          min={0}
                          step={1000}
                          value={tierInputs[ts.tier] ?? String(Number(ts.estimatedValue))}
                          onChange={(e) => setTierInputs(prev => ({ ...prev, [ts.tier]: e.target.value }))}
                          onBlur={() => {
                            const val = Number(tierInputs[ts.tier]);
                            if (!isNaN(val) && val >= 0) {
                              updateTierMutation.mutate({ tier: ts.tier, estimatedValue: val });
                            }
                          }}
                          className="h-9 font-mono"
                        />
                      </div>
                      <div className="w-28 text-right">
                        <span className="text-sm text-muted-foreground">
                          {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(tierInputs[ts.tier] ?? ts.estimatedValue))}
                        </span>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-1">Changes take effect immediately across the pipeline and dashboard.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Industry Options */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-heading">Industry Options</CardTitle>
                  <CardDescription className="text-xs">Manage the industry list shown on client records</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {industryLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(industryOptions ?? []).map((opt) => (
                    <div
                      key={opt.id}
                      data-testid={`industry-option-${opt.id}`}
                      className="flex items-center gap-1.5 bg-muted rounded-md px-3 py-1.5 text-sm"
                    >
                      <span>{opt.label}</span>
                      <button
                        data-testid={`delete-industry-${opt.id}`}
                        onClick={() => deleteIndustryMutation.mutate(opt.id)}
                        disabled={deleteIndustryMutation.isPending}
                        className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Input
                  data-testid="input-new-industry"
                  placeholder="New industry label…"
                  value={newIndustryLabel}
                  onChange={(e) => setNewIndustryLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newIndustryLabel.trim()) {
                      addIndustryMutation.mutate(newIndustryLabel.trim());
                    }
                  }}
                  className="max-w-xs"
                />
                <Button
                  data-testid="button-add-industry"
                  onClick={() => {
                    if (newIndustryLabel.trim()) addIndustryMutation.mutate(newIndustryLabel.trim());
                  }}
                  disabled={addIndustryMutation.isPending || !newIndustryLabel.trim()}
                  size="sm"
                >
                  {addIndustryMutation.isPending ? (
                    <Plus className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-1" />
                  )}
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Spend Receipt Email */}
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-heading">Spend Receipt Email</CardTitle>
                  <CardDescription className="text-xs">When a BD spend is logged, a receipt summary will be automatically emailed here. Also requires SMTP credentials set by your administrator.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex gap-2 max-w-md">
                <Input
                  type="email"
                  placeholder="receipts@m5svcs.com"
                  value={receiptEmailInput}
                  onChange={e => setReceiptEmailInput(e.target.value)}
                  data-testid="input-receipt-email"
                />
                <Button
                  onClick={() => saveReceiptEmailMutation.mutate()}
                  disabled={!receiptEmailInput.trim() || saveReceiptEmailMutation.isPending}
                  data-testid="button-save-receipt-email"
                >
                  {saveReceiptEmailMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
              {receiptEmailData?.value && (
                <p className="text-xs text-muted-foreground mt-2">
                  Currently sending receipts to <span className="font-medium text-foreground">{receiptEmailData.value}</span>
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="buildops" className="pt-4">
          <Accordion type="multiple" defaultValue={["connection"]} className="space-y-3">

            {/* ── Group 1: Connection & Sync ──────────────────────────────── */}
            <AccordionItem value="connection" className="border rounded-xl overflow-hidden shadow-sm bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-3 text-left">
                  <div className="bg-primary/10 p-2 rounded-full shrink-0">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Connection &amp; Sync</p>
                    <p className="text-xs text-muted-foreground font-normal">API credentials, sync triggers, and sync history</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0">
                <div className="border-t pt-4 space-y-4">
                  <BuildOpsPanel />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ── Group 2: Data Health ─────────────────────────────────────── */}
            <AccordionItem value="data-health" className="border rounded-xl overflow-hidden shadow-sm bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-3 text-left">
                  <div className="bg-primary/10 p-2 rounded-full shrink-0">
                    <Database className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Data Health</p>
                    <p className="text-xs text-muted-foreground font-normal">API vs CSV coverage, merge conflicts, import log, and field audit</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0">
                <div className="border-t pt-4 space-y-4">
                  <DataSourcesPanel />
                  {isBuildopsVerifiedForPanel ? (
                    <BuildOpsAuditPanel />
                  ) : (
                    <p className="text-sm text-muted-foreground px-6 pb-4">
                      Verify your BuildOps connection to view the data field audit.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ── Group 3: Mappings ────────────────────────────────────────── */}
            <AccordionItem value="mappings" className="border rounded-xl overflow-hidden shadow-sm bg-card">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-colors [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-3 text-left">
                  <div className="bg-primary/10 p-2 rounded-full shrink-0">
                    <GitMerge className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Mappings</p>
                    <p className="text-xs text-muted-foreground font-normal">BuildOps customer matching and account manager linking</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-0 pb-0">
                <div className="border-t pt-4 space-y-4">
                  {isBuildopsVerifiedForPanel ? (
                    <>
                      <BuildOpsMatchingPanel />
                      <AccountManagerMappingPanel />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground px-6 pb-4">
                      Verify your BuildOps connection to manage customer matching and account manager mapping.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </TabsContent>

        <TabsContent value="orgchart" className="pt-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Reporting Structure</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Set who each person reports to. This is independent of system role — two admins can still have a manager relationship.
                </p>
              </div>
            </div>

            {usersLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => {
                  const displayName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || u.id;
                  const currentManagerId = (u as any).managerUserId ?? null;
                  const currentManager = users.find(x => x.id === currentManagerId);
                  const managerName = currentManager
                    ? ([currentManager.firstName, currentManager.lastName].filter(Boolean).join(" ") || currentManager.email || currentManager.id)
                    : null;
                  const eligibleManagers = users.filter(x => x.id !== u.id);

                  return (
                    <div
                      key={u.id}
                      data-testid={`card-orgchart-${u.id}`}
                      className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-4 gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          {u.profileImageUrl && <AvatarImage src={u.profileImageUrl} />}
                          <AvatarFallback className="text-xs">
                            {[u.firstName?.[0], u.lastName?.[0]].filter(Boolean).join("") || u.email?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:block">Reports to:</span>
                        <Select
                          value={currentManagerId ?? "__none__"}
                          onValueChange={(val) =>
                            updateManagerMutation.mutate({ id: u.id, managerUserId: val === "__none__" ? null : val })
                          }
                        >
                          <SelectTrigger
                            data-testid={`select-manager-${u.id}`}
                            className="h-8 text-xs w-44"
                          >
                            <SelectValue placeholder="No manager">
                              {managerName ?? "No manager"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">
                              <span className="text-muted-foreground">No manager</span>
                            </SelectItem>
                            {eligibleManagers.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {[m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || m.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {users.length > 0 && (
              <div className="bg-muted/40 border border-border rounded-lg p-4 text-sm text-muted-foreground flex items-start gap-2">
                <GitBranch className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
                <p>
                  Manager relationships control who receives Weekly Report notifications and can review reports in the Team view.
                  A user with any role (including Admin) can be set as a direct report of another user.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="health-score" className="pt-4">
          {(() => {
            const COMPONENTS = [
              { key: "jobFrequency", label: "Job Frequency" },
              { key: "recency", label: "Recency" },
              { key: "revenue", label: "Revenue" },
              { key: "emailEngagement", label: "Email Engagement" },
              { key: "quoteAcceptance", label: "Quote Acceptance" },
              { key: "margin", label: "Margin" },
            ] as const;

            const enabledKeys = COMPONENTS.filter(c => hsEnabled[c.key]).map(c => c.key);
            const weightSum = enabledKeys.reduce((s, k) => s + (hsWeights[k] ?? 0), 0);
            const weightsValid = Math.abs(weightSum - 100) < 1 && enabledKeys.length > 0;

            const handleWeightChange = (key: string, val: number) => {
              setHsWeights(prev => ({ ...prev, [key]: val }));
            };

            const handleToggle = (key: string, newEnabled: boolean) => {
              const newEnabledState = { ...hsEnabled, [key]: newEnabled };
              setHsEnabled(newEnabledState);
              if (!newEnabled) {
                const activeKeys = COMPONENTS.filter(c => newEnabledState[c.key]).map(c => c.key);
                if (activeKeys.length > 0) {
                  const totalActive = activeKeys.reduce((s, k) => s + (hsWeights[k] ?? 0), 0);
                  const disabledWeight = hsWeights[key] ?? 0;
                  const newWeights = { ...hsWeights };
                  if (totalActive > 0) {
                    for (const k of activeKeys) {
                      newWeights[k] = Math.round(((hsWeights[k] ?? 0) / totalActive) * (totalActive + disabledWeight));
                    }
                  }
                  newWeights[key] = 0;
                  setHsWeights(newWeights);
                }
              }
            };

            const handleReset = () => {
              setHsWeights({ jobFrequency: 25, recency: 15, revenue: 25, emailEngagement: 10, quoteAcceptance: 15, margin: 10 });
              setHsEnabled({ jobFrequency: true, recency: true, revenue: true, emailEngagement: true, quoteAcceptance: true, margin: true });
              setHsHealthyThreshold(70);
              setHsWatchThreshold(40);
              setHsTrendSensitivity(5);
            };

            const handleSave = async () => {
              setIsSavingHs(true);
              try {
                const putSetting = (k: string, v: string) =>
                  apiRequest("PUT", `/api/admin-settings/${encodeURIComponent(k)}`, { value: v });
                await Promise.all([
                  ...COMPONENTS.map(c => putSetting(`health.weight.${c.key}`, String((hsWeights[c.key] ?? 0) / 100))),
                  ...COMPONENTS.map(c => putSetting(`health.enabled.${c.key}`, hsEnabled[c.key] ? "true" : "false")),
                  putSetting("health.threshold.healthy", String(hsHealthyThreshold)),
                  putSetting("health.threshold.watch", String(hsWatchThreshold)),
                  putSetting("health.trend.sensitivity", String(hsTrendSensitivity)),
                ]);
                queryClient.invalidateQueries({ queryKey: ["/api/admin-settings"] });
                toast({ title: "Health score settings saved" });
              } catch {
                toast({ title: "Failed to save settings", variant: "destructive" });
              } finally {
                setIsSavingHs(false);
              }
            };

            const handleRecalculate = async () => {
              setIsRecalculating(true);
              setRecalcResult(null);
              try {
                const res = await apiRequest("POST", "/api/admin/recalculate-health-scores", {});
                const data = await res.json();
                setRecalcResult(data);
                queryClient.invalidateQueries({ queryKey: ["/api/admin/last-recalc"] });
                queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
                toast({ title: `Health scores updated for ${data.updated} accounts` });
              } catch {
                toast({ title: "Recalculation failed", variant: "destructive" });
              } finally {
                setIsRecalculating(false);
              }
            };

            return (
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Health Score Configuration</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Adjust how health scores are computed across your accounts.</p>
                  </div>
                  <button onClick={handleReset} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors" data-testid="button-hs-reset-defaults">
                    Reset to defaults
                  </button>
                </div>

                {/* Component Weights */}
                <Card className="border-border/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Component Weights</CardTitle>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${weightsValid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`} data-testid="text-weight-sum">
                        {weightSum}% of 100%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Active component weights must sum to 100%.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {COMPONENTS.map(({ key, label }) => (
                      <div key={key} className={`space-y-1 ${!hsEnabled[key] ? "opacity-40" : ""}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{label}</span>
                          <span className="text-sm font-semibold tabular-nums" data-testid={`text-weight-${key}`}>{hsWeights[key] ?? 0}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={hsWeights[key] ?? 0}
                          onChange={e => handleWeightChange(key, parseInt(e.target.value))}
                          disabled={!hsEnabled[key]}
                          className="w-full accent-primary"
                          data-testid={`slider-weight-${key}`}
                        />
                      </div>
                    ))}
                    {!weightsValid && (
                      <p className="text-xs text-red-600 dark:text-red-400" data-testid="text-weight-error">
                        Active weights must sum to exactly 100% before saving.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Component Toggles */}
                <Card className="border-border/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Component Toggles</CardTitle>
                    <p className="text-xs text-muted-foreground">Disable components to exclude them from score calculations. Weights will redistribute automatically.</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {COMPONENTS.map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{label}</span>
                          <Switch
                            checked={hsEnabled[key]}
                            onCheckedChange={v => handleToggle(key, v)}
                            data-testid={`switch-enable-${key}`}
                          />
                        </div>
                        {!hsEnabled[key] && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400">Disabling this component redistributes its weight to remaining active components proportionally.</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Score Thresholds */}
                <Card className="border-border/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Score Thresholds</CardTitle>
                    <p className="text-xs text-muted-foreground">Define the score bands for Healthy, Watch, and At Risk accounts.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Healthy above</label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={hsHealthyThreshold}
                          onChange={e => setHsHealthyThreshold(parseInt(e.target.value) || 70)}
                          className="h-8 text-sm"
                          data-testid="input-threshold-healthy"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Watch above</label>
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={hsWatchThreshold}
                          onChange={e => setHsWatchThreshold(parseInt(e.target.value) || 40)}
                          className="h-8 text-sm"
                          data-testid="input-threshold-watch"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">At Risk (auto)</label>
                        <div className="h-8 rounded-md border border-input bg-muted/50 px-3 flex items-center text-sm text-muted-foreground" data-testid="text-threshold-atrisk">
                          Below {hsWatchThreshold}
                        </div>
                      </div>
                    </div>
                    {/* Live preview */}
                    <div className="flex gap-2 mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700`}>Healthy ≥ {hsHealthyThreshold}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700`}>Watch {hsWatchThreshold}–{hsHealthyThreshold - 1}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700`}>At Risk &lt; {hsWatchThreshold}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Trend Sensitivity */}
                <Card className="border-border/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Trend Sensitivity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        value={hsTrendSensitivity}
                        onChange={e => setHsTrendSensitivity(parseInt(e.target.value) || 5)}
                        className="h-8 text-sm w-24"
                        data-testid="input-trend-sensitivity"
                      />
                      <span className="text-sm text-muted-foreground">points needed to show as rising ↑ or declining ↓</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Scores that change less than this amount are shown as flat (→).</p>
                  </CardContent>
                </Card>

                {/* Save button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={isSavingHs || !weightsValid}
                    data-testid="button-hs-save"
                  >
                    {isSavingHs ? "Saving…" : "Save Settings"}
                  </Button>
                </div>

                {/* Recalculation */}
                <Card className="border-border/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Recalculation</CardTitle>
                    <p className="text-xs text-muted-foreground">Run an immediate health score recalculation for all accounts (nightly runs also do this automatically).</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {lastRecalcData?.lastRecalcAt && (
                      <p className="text-xs text-muted-foreground">
                        Last run: {new Date(lastRecalcData.lastRecalcAt).toLocaleString()}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleRecalculate}
                      disabled={isRecalculating}
                      data-testid="button-recalculate-health"
                    >
                      {isRecalculating ? "Recalculating…" : "Recalculate All Scores Now"}
                    </Button>
                    {recalcResult && (
                      <p className="text-xs text-green-700 dark:text-green-400" data-testid="text-recalc-result">
                        ✓ Recalculation complete — {recalcResult.updated} accounts updated{recalcResult.errors > 0 ? `, ${recalcResult.errors} errors` : ""}.
                      </p>
                    )}
                    {isRecalculating && (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary animate-pulse rounded-full w-2/3" />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">Running…</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })()}
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

      <AlertDialog open={!!deleteRoleKey} onOpenChange={(o) => !o && setDeleteRoleKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Any team members currently assigned to <strong>{getRoleLabel(deleteRoleKey ?? "")}</strong> will be reassigned to Member. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteRoleKey && deleteRoleMutation.mutate(deleteRoleKey)}
              data-testid="button-confirm-delete-role"
            >
              Delete Role
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
