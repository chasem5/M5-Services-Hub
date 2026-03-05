import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Lead, 
  Client, 
  User,
  Task,
  insertLeadSchema,
  InsertLead
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
  Target
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

const STAGES = [
  { id: "new_lead", label: "New Lead" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal_sent", label: "Proposal Sent" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

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
  const { toast } = useToast();

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

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      title: "",
      clientId: undefined,
      stage: "new_lead",
      value: "0",
      confidenceScore: 50,
      tags: [],
      notes: "",
      assignedTo: undefined,
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
              {STAGES.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
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
            {STAGES.map((stage) => (
              <div
                key={stage.id}
                className="flex flex-col w-80 min-w-80 bg-muted/50 rounded-lg border border-border/50 shadow-sm"
              >
                <div className="p-3 flex items-center justify-between border-b bg-background/50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{stage.label}</h3>
                    <Badge variant="secondary" className="h-5 px-1.5 min-w-[1.25rem] flex items-center justify-center font-bold">
                      {filteredLeads?.filter(l => l.stage === stage.id).length || 0}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Sort by Value</DropdownMenuItem>
                      <DropdownMenuItem>Sort by Date</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-3">
                    {filteredLeads
                      ?.filter((l) => l.stage === stage.id)
                      .map((lead) => {
                        const score = lead.confidenceScore ?? 50;
                        const leadTasks = getLeadTasks(lead.id);
                        return (
                          <Card
                            key={lead.id}
                            className="hover-elevate cursor-pointer border-border/60 shadow-sm transition-shadow hover:shadow-md"
                            onClick={() => setSelectedLead(lead)}
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
            ))}
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
                        onClick={() => setSelectedLead(lead)}
                        data-testid={`row-lead-${lead.id}`}
                      >
                        <TableCell className="font-medium">{lead.title}</TableCell>
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
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} defaultValue={field.value?.toString()}>
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
                          {STAGES.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
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
      <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedLead && (() => {
            const score = selectedLead.confidenceScore ?? 50;
            const leadTasks = getLeadTasks(selectedLead.id);
            return (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="capitalize">
                      {selectedLead.stage.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">ID: #{selectedLead.id}</span>
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
                      {leadTasks.length > 0 && (
                        <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                          {leadTasks.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="activity">Timeline</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Client</p>
                        <p className="font-medium text-sm">{getClientName(selectedLead.clientId)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Value</p>
                        <p className="font-mono text-sm font-bold text-primary">{formatCurrency(selectedLead.value)}</p>
                      </div>
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
                        <span className={`text-sm font-bold ${getConfidenceColor(score)}`}>{score}%</span>
                      </div>
                      <Progress value={score} className="h-2" />
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[score]}
                        onValueChange={([val]) => {
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
                      <FormLabel>Change Stage</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {STAGES.map((stage) => (
                          <Button
                            key={stage.id}
                            variant={selectedLead.stage === stage.id ? "secondary" : "outline"}
                            size="sm"
                            className="justify-start font-medium"
                            onClick={() => updateLeadStageMutation.mutate({ id: selectedLead.id, stage: stage.id })}
                          >
                            <div className={`h-2 w-2 rounded-full mr-2 ${selectedLead.stage === stage.id ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                            {stage.label}
                          </Button>
                        ))}
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
                  </TabsContent>

                  <TabsContent value="tasks" className="py-4 space-y-3">
                    {leadTasks.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No tasks linked to this lead.</p>
                        <p className="text-xs mt-1">Create a task and associate it with this lead.</p>
                      </div>
                    ) : (
                      leadTasks.map((task) => {
                        const StatusIcon = statusIcons[task.status];
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
                                    <span className="text-[10px] text-muted-foreground">
                                      Due {new Date(task.dueDate).toLocaleDateString()}
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
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
