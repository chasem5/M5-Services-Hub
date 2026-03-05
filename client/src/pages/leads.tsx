import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Lead, 
  Client, 
  User, 
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
  Calendar as CalendarIcon,
  DollarSign
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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

const STAGES = [
  { id: "new_lead", label: "New Lead" },
  { id: "contacted", label: "Contacted" },
  { id: "qualified", label: "Qualified" },
  { id: "proposal_sent", label: "Proposal Sent" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

export default function Leads() {
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
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

  const createLeadMutation = useMutation({
    mutationFn: async (data: InsertLead) => {
      const res = await apiRequest("POST", "/api/leads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setIsAddLeadOpen(false);
      toast({ title: "Success", description: "Lead created successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertLead> }) => {
      const res = await apiRequest("PUT", `/api/leads/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Success", description: "Lead updated successfully" });
    },
  });

  const updateLeadStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}/stage`, { stage });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
  });

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      title: "",
      clientId: undefined,
      stage: "new_lead",
      value: "0",
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

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(value));
  };

  const onSubmit = (data: InsertLead) => {
    createLeadMutation.mutate(data);
  };

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
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.label}
                </SelectItem>
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
                      .map((lead) => (
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
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                <span>{getUserName(lead.assignedTo).split(' ')[0]}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
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
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads?.map((lead) => (
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
                      <TableCell>{getUserName(lead.assignedTo)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
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
            <SheetDescription>
              Enter the details for the new business opportunity.
            </SheetDescription>
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
                    <Select 
                      onValueChange={(val) => field.onChange(parseInt(val))} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-lead-client">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.name}
                          </SelectItem>
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
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.label}
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
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value || undefined}
                    >
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
          {selectedLead && (
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
                  Full details and activity timeline for this opportunity.
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
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
                          onClick={() => updateLeadStageMutation.mutate({ 
                            id: selectedLead.id, 
                            stage: stage.id 
                          })}
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

                <TabsContent value="activity" className="py-4 h-[500px]">
                  <ActivityTimeline entityType="lead" entityId={selectedLead.id} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
