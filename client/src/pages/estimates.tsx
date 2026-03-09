import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  FileText,
  MoreHorizontal, 
  Edit,
  Trash2,
  ExternalLink,
  Filter,
  Users,
  Building2,
  Calendar,
  DollarSign
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEstimateSchema, type Estimate, type Lead, type Client, type ContactBuilding } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Estimates() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedClientIdForBuilding, setSelectedClientIdForBuilding] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: estimates, isLoading: isLoadingEstimates } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates"],
  });

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: buildingsForClient = [] } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/clients", selectedClientIdForBuilding, "all-buildings"],
    enabled: !!selectedClientIdForBuilding,
  });

  const createEstimateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/estimates", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Estimate created successfully",
      });
      setLocation(`/estimates/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteEstimateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/estimates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates"] });
      toast({
        title: "Success",
        description: "Estimate deleted successfully",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertEstimateSchema),
    defaultValues: {
      title: "",
      leadId: undefined as any,
      clientId: undefined as any,
      buildingId: null as any,
      status: "draft",
      subtotal: "0",
      tax: "0",
      total: "0",
      notes: "",
    },
  });

  const getClientName = (clientId: number) => {
    return clients?.find(c => c.id === clientId)?.name || "Unknown Client";
  };

  const getLeadTitle = (leadId: number | null) => {
    if (!leadId) return "N/A";
    return leads?.find(l => l.id === leadId)?.title || "Unknown Lead";
  };

  const filteredEstimates = estimates?.filter(estimate => {
    const matchesSearch = estimate.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getClientName(estimate.clientId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || estimate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: "draft", label: "Draft", color: "bg-slate-500" },
    { value: "sent", label: "Sent", color: "bg-blue-500" },
    { value: "accepted", label: "Accepted", color: "bg-green-600" },
    { value: "rejected", label: "Rejected", color: "bg-destructive" },
  ];

  const onSubmit = (data: any) => {
    // If lead is selected, auto-fill client if not specified
    if (data.leadId && !data.clientId) {
      const lead = leads?.find(l => l.id === data.leadId);
      if (lead?.clientId) {
        data.clientId = lead.clientId;
      }
    }
    createEstimateMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Estimates</h1>
          <p className="text-muted-foreground text-lg">Create and manage job estimates for clients</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 font-medium" data-testid="button-add-estimate">
              <Plus className="mr-2 h-5 w-5" />
              New Estimate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Estimate</DialogTitle>
              <DialogDescription>
                Set up a new estimate. You can add line items in the next step.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimate Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Quarterly HVAC Service" {...field} data-testid="input-estimate-title" />
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
                        onValueChange={(val) => {
                          const id = parseInt(val);
                          field.onChange(id);
                          setSelectedClientIdForBuilding(id);
                          form.setValue("buildingId", null);
                        }} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-estimate-client">
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
                {selectedClientIdForBuilding && buildingsForClient.length > 0 && (
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
                            <SelectTrigger data-testid="select-estimate-building">
                              <SelectValue placeholder="No specific building" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No specific building</SelectItem>
                            {buildingsForClient.map((b) => (
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
                  control={form.control}
                  name="leadId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Lead (Optional)</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          const id = parseInt(val);
                          field.onChange(id);
                          // Auto-select client if lead is selected
                          const lead = leads?.find(l => l.id === id);
                          if (lead?.clientId) {
                            form.setValue("clientId", lead.clientId);
                          }
                        }} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-estimate-lead">
                            <SelectValue placeholder="Link to a lead" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {leads?.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id.toString()}>
                              {lead.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto h-11 px-8"
                    disabled={createEstimateMutation.isPending}
                    data-testid="button-submit-estimate"
                  >
                    {createEstimateMutation.isPending ? "Creating..." : "Create & Build"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search estimates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
                data-testid="input-search-estimates"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-10" data-testid="select-status-filter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEstimates ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : filteredEstimates && filteredEstimates.length > 0 ? (
            <div className="rounded-md border border-border/50 overflow-x-auto">
              <Table className="min-w-[550px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">Title</TableHead>
                    <TableHead className="font-bold">Client</TableHead>
                    <TableHead className="font-bold text-right">Total</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Created</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEstimates.map((estimate) => (
                    <TableRow key={estimate.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <Link 
                          href={`/estimates/${estimate.id}`}
                          className="text-primary hover:underline font-bold"
                          data-testid={`link-estimate-detail-${estimate.id}`}
                        >
                          {estimate.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          {getClientName(estimate.clientId)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        ${Number(estimate.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {estimate.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(estimate.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-estimate-actions-${estimate.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/estimates/${estimate.id}`} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit/Build
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive cursor-pointer"
                              onClick={() => setDeleteId(estimate.id)}
                              data-testid={`button-delete-estimate-${estimate.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed border-border/50">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No estimates found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-1">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filters." 
                  : "Start creating your first job estimate."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button 
                  variant="outline" 
                  className="mt-6 h-10" 
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Estimate
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this estimate? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId !== null) { deleteEstimateMutation.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
