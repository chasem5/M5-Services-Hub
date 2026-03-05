import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Lead, 
  Client, 
  User,
  Task,
  PipelineStage,
  ContactBuilding,
  insertLeadSchema,
  InsertLead,
  insertTaskSchema,
  InsertTask,
} from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  MoreVertical,
  ChevronRight,
  Filter,
  Users as UsersIcon,
  DollarSign,
  X,
  Tag as TagIcon,
  CheckCircle2,
  Clock,
  Circle,
  Target,
  Settings,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  GripVertical,
  TrendingUp,
  Check,
  CalendarIcon,
  Building2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const STAGE_COLORS = {
  green: {
    column: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
    header: "bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800 rounded-t-lg",
    dot: "bg-green-500",
    badge: "bg-green-100 text-green-800 border-green-200",
    value: "text-green-700 dark:text-green-400",
  },
  red: {
    column: "bg-red-50/60 dark:bg-red-950/20 border-red-200/70 dark:border-red-800/50",
    header: "bg-red-100/70 dark:bg-red-900/30 border-red-200/70 dark:border-red-800/50 rounded-t-lg",
    dot: "bg-red-500",
    badge: "bg-red-100 text-red-700 border-red-200",
    value: "text-red-700 dark:text-red-400",
  },
  default: {
    column: "bg-muted/50 border-border/50",
    header: "bg-background/50 border-b rounded-t-lg",
    dot: "bg-muted-foreground/40",
    badge: "",
    value: "text-muted-foreground",
  },
};

const statusIcons: Record<string, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-700 border-blue-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-red-100 text-red-700 border-red-200",
};

function getConfidenceColor(score: number) {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-500";
}

function getConfidenceBarColor(score: number) {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

export default function Leads() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [tagInput, setTagInput] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [isManageStagesOpen, setIsManageStagesOpen] = useState(false);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [editingStageLabel, setEditingStageLabel] = useState("");
  const [newStageLabel, setNewStageLabel] = useState("");
  const [newStageColor, setNewStageColor] = useState<string | null>(null);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editTagInput, setEditTagInput] = useState("");
  const [editFormTags, setEditFormTags] = useState<string[]>([]);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [selectedClientIdForBuilding, setSelectedClientIdForBuilding] = useState<number | null>(null);
  const [selectedClientIdForBuildingEdit, setSelectedClientIdForBuildingEdit] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: stages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["/api/pipeline-stages"],
  });

  const { data: leads, isLoading: isLoadingLeads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: allBuildings = [] } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/all-buildings"],
  });

  const { data: buildingsForCreate = [] } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/clients", selectedClientIdForBuilding, "all-buildings"],
    enabled: !!selectedClientIdForBuilding,
  });

  const { data: buildingsForEdit = [] } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/clients", selectedClientIdForBuildingEdit, "all-buildings"],
    enabled: !!selectedClientIdForBuildingEdit,
  });

  const getBuildingName = (buildingId: number | null) => {
    if (!buildingId) return null;
    return allBuildings.find(b => b.id === buildingId)?.name ?? null;
  };

  const createLeadMutation = useMutation({
    mutationFn: async (data: InsertLead) => {
      const res = await apiRequest("POST", "/api/leads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsAddLeadOpen(false);
      setFormTags([]);
      setTagInput("");
      toast({ title: "Success", description: "Lead created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertLead> }) => {
      const res = await apiRequest("PUT", `/api/leads/${id}`, data);
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setSelectedLead(updated);
      toast({ title: "Success", description: "Lead updated successfully" });
    },
  });

  const updateLeadStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}/stage`, { stage });
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (selectedLead) setSelectedLead(updated);
    },
  });

  const createStageMutation = useMutation({
    mutationFn: async (data: { label: string; slug: string; color?: string | null }) => {
      const res = await apiRequest("POST", "/api/pipeline-stages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
      setNewStageLabel("");
      setNewStageColor(null);
      toast({ title: "Stage created" });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { label?: string; color?: string | null } }) => {
      const res = await apiRequest("PUT", `/api/pipeline-stages/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
      setEditingStageId(null);
    },
  });

  const deleteStageMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/pipeline-stages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
      toast({ title: "Stage deleted" });
    },
  });

  const reorderStageMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const res = await apiRequest("POST", "/api/pipeline-stages/reorder", { orderedIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsAddTaskOpen(false);
      addTaskForm.reset();
      toast({ title: "Task created", description: "Task linked to this lead." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const moveStage = (index: number, direction: "up" | "down") => {
    const newOrder = [...stages];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    reorderStageMutation.mutate(newOrder.map((s) => s.id));
  };

  const getStageColors = (color: string | null | undefined) =>
    STAGE_COLORS[(color as keyof typeof STAGE_COLORS) ?? "default"] ?? STAGE_COLORS.default;

  const getStageWeightedValue = (slug: string) => {
    const stageLeads = filteredLeads?.filter((l) => l.stage === slug) ?? [];
    return stageLeads.reduce((sum, lead) => {
      const weight = (lead.confidenceScore ?? 50) / 100;
      return sum + Number(lead.value) * weight;
    }, 0);
  };

  const getStageRawValue = (slug: string) => {
    const stageLeads = filteredLeads?.filter((l) => l.stage === slug) ?? [];
    return stageLeads.reduce((sum, lead) => sum + Number(lead.value), 0);
  };

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      title: "",
      clientId: undefined,
      buildingId: null,
      stage: "new_lead",
      value: "0",
      confidenceScore: 50,
      tags: [],
      notes: "",
      assignedTo: undefined,
    },
  });

  const editLeadForm = useForm<Partial<InsertLead>>({
    defaultValues: {
      title: "",
      clientId: undefined,
      buildingId: null,
      value: "0",
      confidenceScore: 50,
      notes: "",
      assignedTo: undefined,
    },
  });

  const addTaskForm = useForm<InsertTask>({
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      status: "todo",
      assignedTo: undefined,
      dueDate: undefined,
      relatedLeadId: undefined,
      relatedClientId: undefined,
    },
  });

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch = lead.title.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === "all" || lead.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const getClientName = (clientId: number | null) => {
    if (!clientId) return "N/A";
    return clients?.find((c) => c.id === clientId)?.name || "Unknown Client";
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const user = users?.find((u) => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
  };

  const formatCurrency = (value: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));

  const addTag = (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean && !formTags.includes(clean)) {
      const next = [...formTags, clean];
      setFormTags(next);
      form.setValue("tags", next);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    const next = formTags.filter((t) => t !== tag);
    setFormTags(next);
    form.setValue("tags", next);
  };

  const onSubmit = (data: InsertLead) => {
    createLeadMutation.mutate({ ...data, tags: formTags });
  };

  const getLeadTasks = (leadId: number) =>
    tasks.filter((t) => t.relatedLeadId === leadId);

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setIsEditingLead(false);
    setIsAddTaskOpen(false);
    setSelectedClientIdForBuildingEdit(lead.clientId ?? null);
    editLeadForm.reset({
      title: lead.title,
      clientId: lead.clientId ?? undefined,
      buildingId: lead.buildingId ?? null,
      value: lead.value,
      confidenceScore: lead.confidenceScore ?? 50,
      notes: lead.notes ?? "",
      assignedTo: lead.assignedTo ?? undefined,
    });
    setEditFormTags(lead.tags ?? []);
  };

  const addEditTag = (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean && !editFormTags.includes(clean)) {
      setEditFormTags((prev) => [...prev, clean]);
    }
    setEditTagInput("");
  };

  const removeEditTag = (tag: string) => setEditFormTags((prev) => prev.filter((t) => t !== tag));

  const saveLeadEdits = (data: Partial<InsertLead>) => {
    if (!selectedLead) return;
    updateLeadMutation.mutate({
      id: selectedLead.id,
      data: { ...data, tags: editFormTags },
    });
    setIsEditingLead(false);
  };

  const detailScore = selectedLead?.confidenceScore ?? 50;
  const detailLeadTasks = selectedLead ? getLeadTasks(selectedLead.id) : [];

  return (
    <div className="flex flex-col h-full bg-muted">
      <header className="flex flex-col gap-4 p-6 bg-background border-b shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Lead Management</h1>
            <p className="text-muted-foreground">Manage your sales pipeline and track opportunities</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-md p-1 border">
              <Button
                variant={view === "kanban" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("kanban")}
                className="h-8"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Board
              </Button>
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView("list")}
                className="h-8"
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsManageStagesOpen(true)}
              data-testid="button-manage-stages"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Stages
            </Button>
            <Button onClick={() => {
              form.reset();
              setFormTags([]);
              setTagInput("");
              setIsAddLeadOpen(true);
            }} data-testid="button-add-lead">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-leads"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.slug}>{stage.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {isLoadingLeads ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ))}
          </div>
        ) : view === "kanban" ? (
          <div className="flex h-full overflow-x-auto p-6 gap-6">
            {stages.map((stage) => {
              const sc = getStageColors(stage.color);
              const weightedVal = getStageWeightedValue(stage.slug);
              const rawVal = getStageRawValue(stage.slug);
              const cardCount = filteredLeads?.filter(l => l.stage === stage.slug).length || 0;
              return (
              <div
                key={stage.id}
                className={`flex flex-col w-80 min-w-80 rounded-lg border shadow-sm ${sc.column}`}
              >
                <div className={`p-3 border-b ${sc.header}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${sc.dot}`} />
                      <h3 className="font-semibold text-sm">{stage.label}</h3>
                      <Badge variant="secondary" className="h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center font-bold text-[10px]">
                        {cardCount}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setIsManageStagesOpen(true)}
                      data-testid={`button-manage-stage-${stage.id}`}
                    >
                      <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Value</span>
                      <span className="text-sm font-bold text-foreground">{formatCurrency(rawVal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                        <TrendingUp className="h-2.5 w-2.5" />
                        Weighted
                      </span>
                      <span className={`text-xs font-semibold ${sc.value}`}>{formatCurrency(weightedVal)}</span>
                    </div>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-3">
                    {filteredLeads
                      ?.filter((l) => l.stage === stage.slug)
                      .map((lead) => {
                        const score = lead.confidenceScore ?? 50;
                        const leadTasks = getLeadTasks(lead.id);
                        return (
                          <Card
                            key={lead.id}
                            className="hover-elevate cursor-pointer border-border/60 shadow-sm transition-shadow hover:shadow-md"
                            onClick={() => openLeadDetail(lead)}
                            data-testid={`card-lead-${lead.id}`}
                          >
                            <CardHeader className="p-3 pb-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-sm leading-tight line-clamp-2">{lead.title}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                <UsersIcon className="h-3 w-3" />
                                {getClientName(lead.clientId)}
                              </p>
                              {lead.buildingId && getBuildingName(lead.buildingId) && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Building2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{getBuildingName(lead.buildingId)}</span>
                                </p>
                              )}
                            </CardHeader>
                            <CardContent className="p-3 pt-2 flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-primary flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {formatCurrency(lead.value)}
                                </span>
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                  {getUserName(lead.assignedTo).split(' ')[0]}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                    <Target className="h-3 w-3" />
                                    Confidence
                                  </span>
                                  <span className={`text-[10px] font-bold ${getConfidenceColor(score)}`}>
                                    {score}%
                                  </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${getConfidenceBarColor(score)}`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              </div>

                              {lead.tags && lead.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {lead.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-medium">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {lead.tags.length > 3 && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                                      +{lead.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}

                              {leadTasks.length > 0 && (
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1 border-t pt-1.5 mt-0.5">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {leadTasks.filter(t => t.status === "done").length}/{leadTasks.length} tasks
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </ScrollArea>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads?.map((lead) => {
                    const score = lead.confidenceScore ?? 50;
                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer"
                        onClick={() => openLeadDetail(lead)}
                        data-testid={`row-lead-${lead.id}`}
                      >
                        <TableCell className="font-medium">
                          <div>
                            {lead.title}
                            {lead.buildingId && getBuildingName(lead.buildingId) && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <Building2 className="h-3 w-3 shrink-0" />
                                {getBuildingName(lead.buildingId)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getClientName(lead.clientId)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {lead.stage.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{formatCurrency(lead.value)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[80px]">
                            <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getConfidenceBarColor(score)}`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${getConfidenceColor(score)}`}>{score}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {lead.tags?.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                            {(lead.tags?.length ?? 0) > 2 && (
                              <Badge variant="outline" className="text-xs">+{(lead.tags?.length ?? 0) - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getUserName(lead.assignedTo)}</TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </main>

      {/* Add Lead Sheet */}
      <Sheet open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Lead</SheetTitle>
            <SheetDescription>Enter the details for the new business opportunity.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. Building Maintenance Q3" {...field} data-testid="input-lead-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select onValueChange={(val) => {
                      const id = parseInt(val);
                      field.onChange(id);
                      setSelectedClientIdForBuilding(id);
                      form.setValue("buildingId", null);
                    }} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lead-client">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {selectedClientIdForBuilding && buildingsForCreate.length > 0 && (
                <FormField
                  control={form.control}
                  name="buildingId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building (Optional)</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                        value={field.value != null ? String(field.value) : "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-building">
                            <SelectValue placeholder="No specific building" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No specific building</SelectItem>
                          {buildingsForCreate.map((b) => (
                            <SelectItem key={b.id} value={b.id.toString()}>
                              <span className="flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                {b.name}{b.address ? ` · ${b.address}` : ""}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-lead-stage">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.slug}>{stage.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Value</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} data-testid="input-lead-value" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="confidenceScore"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Confidence Score</FormLabel>
                      <span className={`text-sm font-bold ${getConfidenceColor(field.value ?? 50)}`}>
                        {field.value ?? 50}%
                      </span>
                    </div>
                    <FormControl>
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[field.value ?? 50]}
                        onValueChange={([val]) => field.onChange(val)}
                        className="mt-2"
                        data-testid="slider-confidence"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Tags</FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    data-testid="input-lead-tag"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => addTag(tagInput)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="rounded-sm hover:bg-muted p-0.5">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-lead-assignee">
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details..."
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-lead-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SheetFooter className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createLeadMutation.isPending}
                  data-testid="button-save-lead"
                >
                  {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Lead Detail Sheet */}
      <Sheet open={!!selectedLead} onOpenChange={(open) => {
        if (!open) {
          setSelectedLead(null);
          setIsEditingLead(false);
          setIsAddTaskOpen(false);
        }
      }}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="capitalize">
                      {selectedLead.stage.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">ID: #{selectedLead.id}</span>
                  </div>
                  {!isEditingLead ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingLead(true)}
                      data-testid="button-edit-lead"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit Lead
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsEditingLead(false);
                          setEditFormTags(selectedLead.tags ?? []);
                          editLeadForm.reset({
                            title: selectedLead.title,
                            clientId: selectedLead.clientId ?? undefined,
                            value: selectedLead.value,
                            confidenceScore: selectedLead.confidenceScore ?? 50,
                            notes: selectedLead.notes ?? "",
                            assignedTo: selectedLead.assignedTo ?? undefined,
                          });
                        }}
                        data-testid="button-cancel-edit-lead"
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={editLeadForm.handleSubmit(saveLeadEdits)}
                        disabled={updateLeadMutation.isPending}
                        data-testid="button-save-lead-edits"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {updateLeadMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
                <SheetTitle className="text-2xl">{selectedLead.title}</SheetTitle>
                <SheetDescription>
                  Full details, tasks, and activity timeline for this opportunity.
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="tasks">
                    Tasks
                    {detailLeadTasks.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                        {detailLeadTasks.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="activity">Timeline</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-6 py-4">
                  {isEditingLead ? (
                    <Form {...editLeadForm}>
                      <form onSubmit={editLeadForm.handleSubmit(saveLeadEdits)} className="space-y-4">
                        <FormField
                          control={editLeadForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} data-testid="input-edit-lead-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={editLeadForm.control}
                            name="clientId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Client</FormLabel>
                                <Select
                                  onValueChange={(val) => {
                                    const id = parseInt(val);
                                    field.onChange(id);
                                    setSelectedClientIdForBuildingEdit(id);
                                    editLeadForm.setValue("buildingId", null);
                                  }}
                                  value={field.value?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-lead-client">
                                      <SelectValue placeholder="Select client" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {clients?.map((c) => (
                                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editLeadForm.control}
                            name="value"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Value ($)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" {...field} value={field.value || ""} data-testid="input-edit-lead-value" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {selectedClientIdForBuildingEdit && buildingsForEdit.length > 0 && (
                          <FormField
                            control={editLeadForm.control}
                            name="buildingId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Building (Optional)</FormLabel>
                                <Select
                                  onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                                  value={field.value != null ? String(field.value) : "none"}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-edit-lead-building">
                                      <SelectValue placeholder="No specific building" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">No specific building</SelectItem>
                                    {buildingsForEdit.map((b) => (
                                      <SelectItem key={b.id} value={b.id.toString()}>
                                        {b.name}{b.address ? ` · ${b.address}` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField
                          control={editLeadForm.control}
                          name="assignedTo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assigned To</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-edit-lead-assignee">
                                    <SelectValue placeholder="Select team member" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users?.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.firstName} {u.lastName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editLeadForm.control}
                          name="confidenceScore"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Confidence Score</FormLabel>
                                <span className={`text-sm font-bold ${getConfidenceColor(field.value ?? 50)}`}>
                                  {field.value ?? 50}%
                                </span>
                              </div>
                              <FormControl>
                                <Slider
                                  min={0} max={100} step={5}
                                  value={[field.value ?? 50]}
                                  onValueChange={([v]) => field.onChange(v)}
                                  data-testid="slider-edit-confidence"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Tags</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add a tag and press Enter"
                              value={editTagInput}
                              onChange={(e) => setEditTagInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === ",") {
                                  e.preventDefault();
                                  addEditTag(editTagInput);
                                }
                              }}
                              data-testid="input-edit-lead-tag"
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => addEditTag(editTagInput)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {editFormTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {editFormTags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1">
                                  {tag}
                                  <button type="button" onClick={() => removeEditTag(tag)} className="rounded-sm hover:bg-muted p-0.5">
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <FormField
                          control={editLeadForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  className="resize-none min-h-[100px]"
                                  {...field}
                                  value={field.value || ""}
                                  data-testid="textarea-edit-lead-notes"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Client</p>
                          <p className="font-medium text-sm">{getClientName(selectedLead.clientId)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Value</p>
                          <p className="font-mono text-sm font-bold text-primary">{formatCurrency(selectedLead.value)}</p>
                        </div>
                        {selectedLead.buildingId && getBuildingName(selectedLead.buildingId) && (
                          <div className="space-y-1 col-span-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> Building
                            </p>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              {getBuildingName(selectedLead.buildingId)}
                            </p>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned To</p>
                          <p className="font-medium text-sm">{getUserName(selectedLead.assignedTo)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Created</p>
                          <p className="font-medium text-sm">{new Date(selectedLead.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Target className="h-3 w-3" /> Confidence Score
                          </p>
                          <span className={`text-sm font-bold ${getConfidenceColor(detailScore)}`}>{detailScore}%</span>
                        </div>
                        <Progress value={detailScore} className="h-2" />
                        <Slider
                          min={0} max={100} step={5}
                          value={[detailScore]}
                          onValueCommit={([val]) => {
                            updateLeadMutation.mutate({ id: selectedLead.id, data: { confidenceScore: val } });
                          }}
                          data-testid="slider-confidence-detail"
                        />
                      </div>

                      {selectedLead.tags && selectedLead.tags.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <TagIcon className="h-3 w-3" /> Tags
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedLead.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Change Stage</p>
                        <div className="grid grid-cols-2 gap-2">
                          {stages.map((stage) => {
                            const sc = getStageColors(stage.color);
                            const isActive = selectedLead.stage === stage.slug;
                            return (
                              <Button
                                key={stage.id}
                                variant={isActive ? "secondary" : "outline"}
                                size="sm"
                                className="justify-start font-medium"
                                onClick={() => updateLeadStageMutation.mutate({ id: selectedLead.id, stage: stage.slug })}
                              >
                                <div className={`h-2 w-2 rounded-full mr-2 ${isActive ? sc.dot : 'bg-muted-foreground/30'}`} />
                                {stage.label}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Internal Notes</p>
                        <Card className="bg-muted">
                          <CardContent className="p-3 text-sm leading-relaxed whitespace-pre-wrap">
                            {selectedLead.notes || "No notes provided."}
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="tasks" className="py-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {detailLeadTasks.length} Task{detailLeadTasks.length !== 1 ? "s" : ""}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddTaskOpen((v) => !v);
                        addTaskForm.reset({
                          title: "",
                          description: "",
                          priority: "medium",
                          status: "todo",
                          relatedLeadId: selectedLead.id,
                          relatedClientId: selectedLead.clientId ?? undefined,
                          assignedTo: undefined,
                          dueDate: undefined,
                        });
                      }}
                      data-testid="button-add-task-to-lead"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Task
                    </Button>
                  </div>

                  {isAddTaskOpen && (
                    <Card className="border-primary/30 bg-primary/3">
                      <CardContent className="p-4">
                        <Form {...addTaskForm}>
                          <form
                            onSubmit={addTaskForm.handleSubmit((data) => {
                              const dueDateRaw = data.dueDate as unknown as string;
                              createTaskMutation.mutate({
                                ...data,
                                relatedLeadId: selectedLead.id,
                                dueDate: dueDateRaw ? new Date(dueDateRaw) : undefined,
                              });
                            })}
                            className="space-y-3"
                          >
                            <FormField
                              control={addTaskForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Task Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. Follow up with client" {...field} value={field.value || ""} data-testid="input-new-task-title" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={addTaskForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                                  <FormControl>
                                    <Textarea className="resize-none min-h-[60px]" {...field} value={field.value || ""} data-testid="textarea-new-task-desc" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <FormField
                                control={addTaskForm.control}
                                name="priority"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Priority</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-new-task-priority">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={addTaskForm.control}
                                name="dueDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Due Date</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="date"
                                        {...field}
                                        value={field.value ? String(field.value).slice(0, 10) : ""}
                                        data-testid="input-new-task-due"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={addTaskForm.control}
                              name="assignedTo"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Assign To <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-new-task-assignee">
                                        <SelectValue placeholder="Select team member" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {users?.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                          {u.firstName} {u.lastName}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <div className="flex gap-2 pt-1">
                              <Button
                                type="submit"
                                size="sm"
                                disabled={createTaskMutation.isPending}
                                className="flex-1"
                                data-testid="button-save-new-task"
                              >
                                {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsAddTaskOpen(false)}
                                data-testid="button-cancel-new-task"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  )}

                  {detailLeadTasks.length === 0 && !isAddTaskOpen ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No tasks linked to this lead yet.</p>
                      <p className="text-xs mt-1">Use the "Add Task" button above to create one.</p>
                    </div>
                  ) : (
                    detailLeadTasks.map((task) => {
                      const StatusIcon = statusIcons[task.status] ?? Circle;
                      return (
                        <Card key={task.id} className={`border-l-4 ${
                          task.status === "done" ? "border-l-green-400 opacity-70" :
                          task.priority === "high" ? "border-l-red-400" :
                          task.priority === "medium" ? "border-l-yellow-400" : "border-l-blue-400"
                        }`} data-testid={`card-lead-task-${task.id}`}>
                          <CardContent className="p-3 flex items-start gap-3">
                            <StatusIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                              task.status === "done" ? "text-green-500" :
                              task.status === "in_progress" ? "text-blue-500" : "text-muted-foreground"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 capitalize ${priorityColors[task.priority]}`}>
                                  {task.priority}
                                </Badge>
                                {task.dueDate && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <CalendarIcon className="h-2.5 w-2.5" />
                                    {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                                {task.assignedTo && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {getUserName(task.assignedTo)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>

                <TabsContent value="activity" className="py-4 h-[500px]">
                  <ActivityTimeline entityType="lead" entityId={selectedLead.id} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Manage Pipeline Stages Dialog */}
      <Dialog open={isManageStagesOpen} onOpenChange={setIsManageStagesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
              Manage Pipeline Stages
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[420px] overflow-y-auto py-2">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                data-testid={`stage-row-${stage.id}`}
              >
                {/* Reorder arrows */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveStage(index, "up")}
                    disabled={index === 0}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed"
                    data-testid={`button-stage-up-${stage.id}`}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveStage(index, "down")}
                    disabled={index === stages.length - 1}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed"
                    data-testid={`button-stage-down-${stage.id}`}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Color indicator */}
                <div className={`h-3 w-3 rounded-full flex-shrink-0 ${getStageColors(stage.color).dot}`} />

                {/* Label — editable inline */}
                {editingStageId === stage.id ? (
                  <Input
                    autoFocus
                    value={editingStageLabel}
                    onChange={(e) => setEditingStageLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateStageMutation.mutate({ id: stage.id, data: { label: editingStageLabel } });
                      }
                      if (e.key === "Escape") setEditingStageId(null);
                    }}
                    className="h-7 text-sm flex-1"
                    data-testid={`input-stage-label-${stage.id}`}
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium truncate">{stage.label}</span>
                )}

                {/* Color picker */}
                <select
                  value={stage.color ?? "default"}
                  onChange={(e) => {
                    const val = e.target.value === "default" ? null : e.target.value;
                    updateStageMutation.mutate({ id: stage.id, data: { color: val } });
                  }}
                  className="text-xs border rounded px-1.5 py-1 bg-background h-7"
                  data-testid={`select-stage-color-${stage.id}`}
                >
                  <option value="default">Default</option>
                  <option value="green">Green (Won)</option>
                  <option value="red">Red (Lost)</option>
                </select>

                {/* Edit / Save button */}
                {editingStageId === stage.id ? (
                  <Button
                    size="icon"
                    variant="default"
                    className="h-7 w-7"
                    onClick={() => updateStageMutation.mutate({ id: stage.id, data: { label: editingStageLabel } })}
                    disabled={updateStageMutation.isPending}
                    data-testid={`button-save-stage-${stage.id}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingStageId(stage.id);
                      setEditingStageLabel(stage.label);
                    }}
                    data-testid={`button-edit-stage-${stage.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}

                {/* Delete button */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete stage "${stage.label}"? Leads in this stage will remain but won't appear in the board.`)) {
                      deleteStageMutation.mutate(stage.id);
                    }
                  }}
                  data-testid={`button-delete-stage-${stage.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Add new stage */}
          <div className="border-t pt-3 space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add New Stage</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Stage name..."
                value={newStageLabel}
                onChange={(e) => setNewStageLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newStageLabel.trim()) {
                    const slug = newStageLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
                    createStageMutation.mutate({ label: newStageLabel.trim(), slug, color: newStageColor });
                  }
                }}
                className="flex-1 h-8"
                data-testid="input-new-stage-name"
              />
              <select
                value={newStageColor ?? "default"}
                onChange={(e) => setNewStageColor(e.target.value === "default" ? null : e.target.value)}
                className="text-xs border rounded px-1.5 py-1 bg-background h-8"
                data-testid="select-new-stage-color"
              >
                <option value="default">Default</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
              </select>
              <Button
                size="sm"
                className="h-8"
                disabled={!newStageLabel.trim() || createStageMutation.isPending}
                onClick={() => {
                  const slug = newStageLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
                  createStageMutation.mutate({ label: newStageLabel.trim(), slug, color: newStageColor });
                }}
                data-testid="button-add-stage"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageStagesOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
