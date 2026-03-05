import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  FileText, 
  MoreHorizontal, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Send,
  Building2,
  Calendar,
  DollarSign,
  ArrowRight,
  Eye,
  Loader2
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertProposalSchema, 
  type Proposal, 
  type Estimate, 
  type Client,
  type EstimateLineItem
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ProposalPdf } from "@/components/ProposalPdf";

export default function Proposals() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: proposals, isLoading: isLoadingProposals } = useQuery<Proposal[]>({
    queryKey: ["/api/proposals"],
  });

  const { data: estimates } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const createProposalMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/proposals", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Proposal created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Proposal> }) => {
      const res = await apiRequest("PUT", `/api/proposals/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({
        title: "Success",
        description: "Proposal updated",
      });
    },
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/proposals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proposals"] });
      toast({
        title: "Success",
        description: "Proposal deleted successfully",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertProposalSchema),
    defaultValues: {
      title: "",
      estimateId: undefined as any,
      clientId: undefined as any,
      body: "",
      status: "draft",
    },
  });

  const getClientName = (clientId: number) => {
    return clients?.find(c => c.id === clientId)?.name || "Unknown Client";
  };

  const getEstimateTitle = (estimateId: number) => {
    return estimates?.find(e => e.id === estimateId)?.title || "Unknown Estimate";
  };

  const filteredProposals = proposals?.filter(proposal => {
    const matchesSearch = proposal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          getClientName(proposal.clientId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: "draft", label: "Draft", variant: "secondary" },
    { value: "sent", label: "Sent", variant: "default" },
    { value: "signed", label: "Signed", variant: "outline" },
  ];

  const onSubmit = (data: any) => {
    createProposalMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Proposals</h1>
          <p className="text-muted-foreground text-lg">Manage and export client proposals</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 font-medium" data-testid="button-add-proposal">
              <Plus className="mr-2 h-5 w-5" />
              New Proposal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Proposal</DialogTitle>
              <DialogDescription>
                Select an estimate to link. The line items will be auto-populated in the PDF.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proposal Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Service Proposal - ABC Corp" {...field} data-testid="input-proposal-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Estimate</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          const id = parseInt(val);
                          field.onChange(id);
                          const est = estimates?.find(e => e.id === id);
                          if (est) {
                            form.setValue("clientId", est.clientId);
                            if (!form.getValues("title")) {
                              form.setValue("title", `Proposal for ${est.title}`);
                            }
                          }
                        }} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-proposal-estimate">
                            <SelectValue placeholder="Select an estimate" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {estimates?.filter(e => e.status !== "rejected").map((est) => (
                            <SelectItem key={est.id} value={est.id.toString()}>
                              {est.title} (${Number(est.total).toFixed(2)})
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
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scope of Work / Body Text</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detailed scope of work to be included in the proposal..." 
                          className="min-h-[150px] resize-none"
                          {...field}
                          value={field.value || ""}
                          data-testid="textarea-proposal-body"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto h-11 px-8"
                    disabled={createProposalMutation.isPending}
                    data-testid="button-submit-proposal"
                  >
                    {createProposalMutation.isPending ? "Creating..." : "Create Proposal"}
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
                placeholder="Search proposals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
                data-testid="input-search-proposals"
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
          {isLoadingProposals ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : filteredProposals && filteredProposals.length > 0 ? (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">Proposal</TableHead>
                    <TableHead className="font-bold">Client</TableHead>
                    <TableHead className="font-bold">Linked Estimate</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    <TableHead className="font-bold">Created</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.map((proposal) => (
                    <TableRow key={proposal.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">{proposal.title}</span>
                          <span className="text-xs text-muted-foreground">ID: PROP-{proposal.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Building2 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          {getClientName(proposal.clientId)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/estimates/${proposal.estimateId}`}
                          className="text-sm hover:underline flex items-center gap-1"
                        >
                          <FileText className="h-3 w-3" />
                          {getEstimateTitle(proposal.estimateId)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={proposal.status === "signed" ? "outline" : proposal.status === "sent" ? "default" : "secondary"}>
                          {proposal.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(proposal.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DownloadPdfButton proposal={proposal} />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-proposal-actions-${proposal.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[180px]">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {proposal.status === "draft" && (
                                <DropdownMenuItem onClick={() => updateProposalMutation.mutate({ id: proposal.id, data: { status: "sent" } })}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Mark as Sent
                                </DropdownMenuItem>
                              )}
                              {proposal.status === "sent" && (
                                <DropdownMenuItem onClick={() => updateProposalMutation.mutate({ id: proposal.id, data: { status: "signed" } })}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Mark as Signed
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this proposal?")) {
                                    deleteProposalMutation.mutate(proposal.id);
                                  }
                                }}
                                data-testid={`button-delete-proposal-${proposal.id}`}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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
              <h3 className="text-lg font-semibold">No proposals found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-1">
                {searchTerm || statusFilter !== "all" 
                  ? "Try adjusting your search or filters." 
                  : "Start by creating a proposal from an existing estimate."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DownloadPdfButton({ proposal }: { proposal: Proposal }) {
  const { data: estimate } = useQuery<Estimate>({
    queryKey: ["/api/estimates", proposal.estimateId],
  });

  const { data: lineItems } = useQuery<EstimateLineItem[]>({
    queryKey: ["/api/estimates", proposal.estimateId, "line-items"],
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", proposal.clientId],
  });

  if (!estimate || !lineItems || !client) {
    return (
      <Button variant="outline" size="icon" className="h-8 w-8" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <PDFDownloadLink
      document={
        <ProposalPdf 
          title={proposal.title} 
          body={proposal.body} 
          estimate={estimate} 
          lineItems={lineItems} 
          client={client} 
        />
      }
      fileName={`${proposal.title.replace(/\s+/g, "_")}.pdf`}
    >
      {({ loading }) => (
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8" 
          disabled={loading}
          data-testid={`button-download-proposal-${proposal.id}`}
          title="Download PDF"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
