import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft,
  Calculator,
  Search,
  Package,
  AlertCircle,
  CheckCircle2,
  History as HistoryIcon,
  Sparkles,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AddressLink } from "@/components/AddressLink";
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
  CardDescription,
  CardFooter
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertEstimateSchema, 
  type Estimate, 
  type EstimateLineItem, 
  type ServiceCatalogItem,
  type Lead,
  type Client,
  type ContactBuilding
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

export default function EstimateDetail() {
  const [, params] = useRoute("/estimates/:id");
  const id = parseInt(params?.id || "");
  const { toast } = useToast();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientIdForBuilding, setSelectedClientIdForBuilding] = useState<number | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const { data: estimate, isLoading: isLoadingEstimate } = useQuery<Estimate>({
    queryKey: ["/api/estimates", id],
  });

  const { data: lineItems, isLoading: isLoadingItems } = useQuery<EstimateLineItem[]>({
    queryKey: ["/api/estimates", id, "line-items"],
  });

  const { data: catalog } = useQuery<ServiceCatalogItem[]>({
    queryKey: ["/api/service-catalog"],
  });

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const clientIdForBuilding = selectedClientIdForBuilding ?? estimate?.clientId ?? null;
  const { data: buildingsForClient = [] } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/clients", clientIdForBuilding, "all-buildings"],
    enabled: !!clientIdForBuilding,
  });

  const updateEstimateMutation = useMutation({
    mutationFn: async (data: Partial<Estimate>) => {
      const res = await apiRequest("PUT", `/api/estimates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", id] });
      toast({ title: "Success", description: "Estimate updated" });
    },
  });

  const addLineItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/estimates/${id}/line-items`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", id, "line-items"] });
      setIsAddingItem(false);
      setSearchTerm("");
      toast({ title: "Success", description: "Line item added" });
    },
  });

  const deleteLineItemMutation = useMutation({
    mutationFn: async (lineItemId: number) => {
      await apiRequest("DELETE", `/api/estimates/${id}/line-items/${lineItemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", id, "line-items"] });
      toast({ title: "Success", description: "Line item removed" });
    },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/estimates/${id}/ai-generate`, {});
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: async (data) => {
      const updates: any = {};
      if (data.title) updates.title = data.title;
      if (data.scopeOfWork) updates.notes = data.scopeOfWork;
      if (Object.keys(updates).length > 0) {
        await apiRequest("PUT", `/api/estimates/${id}`, updates);
        form.setValue("title", data.title || form.getValues("title"));
        form.setValue("notes", data.scopeOfWork || form.getValues("notes"));
      }
      for (const item of data.lineItems ?? []) {
        await apiRequest("POST", `/api/estimates/${id}/line-items`, {
          estimateId: id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimates", id, "line-items"] });
      toast({ title: "AI scope generated", description: `Added ${data.lineItems?.length ?? 0} line items` });
    },
    onError: (err: any) => toast({ title: "AI generation failed", description: err.message, variant: "destructive" }),
  });

  const pushBuildopsMutation = useMutation({
    mutationFn: async () => {
      toast({ title: "BuildOps Quotes API", description: "Coming soon — Quotes API spec pending", variant: "default" });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertEstimateSchema),
    defaultValues: {
      title: "",
      leadId: undefined as any,
      clientId: undefined as any,
      status: "draft",
      subtotal: "0",
      tax: "0",
      total: "0",
      notes: "",
    },
  });

  useEffect(() => {
    if (estimate) {
      form.reset({
        title: estimate.title,
        leadId: estimate.leadId || undefined as any,
        clientId: estimate.clientId,
        buildingId: estimate.buildingId ?? null,
        status: estimate.status as any,
        subtotal: estimate.subtotal.toString(),
        tax: estimate.tax.toString(),
        total: estimate.total.toString(),
        notes: estimate.notes || "",
      });
    }
  }, [estimate, form]);

  // Re-calculate totals whenever line items or tax change
  useEffect(() => {
    if (lineItems) {
      const subtotal = lineItems.reduce((sum, item) => sum + Number(item.total), 0);
      const taxRate = parseFloat(form.getValues("tax") || "0") / 100;
      const taxAmount = subtotal * taxRate;
      const total = subtotal + taxAmount;

      if (
        subtotal.toString() !== estimate?.subtotal.toString() ||
        total.toString() !== estimate?.total.toString()
      ) {
        updateEstimateMutation.mutate({
          subtotal: subtotal.toFixed(2),
          total: total.toFixed(2),
        });
      }
    }
  }, [lineItems, form.watch("tax")]);

  const handleAddCatalogItem = (item: ServiceCatalogItem) => {
    addLineItemMutation.mutate({
      estimateId: id,
      catalogItemId: item.id,
      description: item.name,
      quantity: "1",
      unitPrice: item.unitPrice.toString(),
      total: item.unitPrice.toString(),
    });
  };

  const handleAddCustomItem = () => {
    addLineItemMutation.mutate({
      estimateId: id,
      description: "Custom Item",
      quantity: "1",
      unitPrice: "0",
      total: "0",
    });
  };

  const filteredCatalog = catalog?.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serviceType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLeadTitle = (leadId: number | null) => {
    if (!leadId) return "N/A";
    return leads?.find(l => l.id === leadId)?.title || "Unknown Lead";
  };

  if (isLoadingEstimate) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-64 col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!estimate) return <div>Estimate not found</div>;

  const currentClient = clients?.find(c => c.id === estimate.clientId);

  return (
    <div className="p-6 space-y-6 bg-muted/30 min-h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/estimates">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-heading font-bold">{estimate.title}</h1>
              <Badge variant="outline" className="capitalize">{estimate.status}</Badge>
            </div>
            <p className="text-muted-foreground">Estimate #{estimate.id} • {currentClient?.name}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => aiGenerateMutation.mutate()}
            disabled={aiGenerateMutation.isPending}
            data-testid="button-ai-generate-scope"
            className="gap-1.5"
          >
            {aiGenerateMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {aiGenerateMutation.isPending ? "Generating..." : "AI Generate Scope"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => pushBuildopsMutation.mutate()}
            disabled={pushBuildopsMutation.isPending}
            data-testid="button-push-buildops-estimate"
            className="gap-1.5"
          >
            <Zap className="h-4 w-4" />
            Push to BuildOps
          </Button>
          {estimate.status === "draft" && (
            <Button 
              variant="outline"
              onClick={() => updateEstimateMutation.mutate({ status: "sent" })}
              data-testid="button-mark-sent"
            >
              Mark as Sent
            </Button>
          )}
          {estimate.status === "sent" && (
            <>
              <Button 
                variant="outline" 
                className="text-green-600 border-green-200 bg-green-50 hover:bg-green-100"
                onClick={() => updateEstimateMutation.mutate({ status: "accepted" })}
                data-testid="button-mark-accepted"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Accepted
              </Button>
              <Button 
                variant="outline" 
                className="text-destructive border-destructive/20 bg-destructive/5"
                onClick={() => updateEstimateMutation.mutate({ status: "rejected" })}
                data-testid="button-mark-rejected"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Rejected
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 gap-6">
          <TabsTrigger value="details" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium">
            <Calculator className="mr-2 h-4 w-4" />
            Estimate Details
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium">
            <HistoryIcon className="mr-2 h-4 w-4" />
            Activity Timeline
          </TabsTrigger>
        </TabsList>

        <div className="py-6">
          <TabsContent value="details" className="m-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Line Items</CardTitle>
                      <CardDescription>Add services and products to this estimate</CardDescription>
                    </div>
                    <Button onClick={() => setIsAddingItem(true)} size="sm" data-testid="button-add-line-item">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {isLoadingItems ? (
                      <Skeleton className="h-32 w-full" />
                    ) : lineItems && lineItems.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[100px] text-right">Qty</TableHead>
                            <TableHead className="w-[120px] text-right">Unit Price</TableHead>
                            <TableHead className="w-[120px] text-right">Total</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.description}</TableCell>
                              <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                              <TableCell className="text-right">${Number(item.unitPrice).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-bold">${Number(item.total).toFixed(2)}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => setDeleteItemId(item.id)}
                                  data-testid={`button-delete-line-${item.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                        <Calculator className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No line items added yet.</p>
                        <Button variant="ghost" onClick={() => setIsAddingItem(true)} className="px-0 h-auto">Add your first item</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Notes & Terms</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form className="space-y-4">
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Textarea 
                                  placeholder="Add scope of work, terms, or internal notes..."
                                  className="min-h-[150px] resize-none"
                                  {...field}
                                  onBlur={() => updateEstimateMutation.mutate({ notes: field.value })}
                                  data-testid="textarea-estimate-notes"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="sticky top-20">
                  <CardHeader>
                    <CardTitle>Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${Number(estimate.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Tax (%)</span>
                      <Input 
                        type="number" 
                        className="w-20 h-8 text-right" 
                        {...form.register("tax")}
                        onBlur={() => updateEstimateMutation.mutate({ tax: form.getValues("tax") })}
                        data-testid="input-estimate-tax"
                      />
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold text-lg">Total</span>
                      <span className="font-bold text-2xl text-primary font-mono">
                        ${Number(estimate.total).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter>
                      <Button 
                        className="w-full h-11" 
                        onClick={() => {
                          const values = form.getValues();
                          updateEstimateMutation.mutate({
                            ...values,
                            status: values.status as any
                          });
                        }}
                        disabled={updateEstimateMutation.isPending}
                        data-testid="button-save-estimate"
                      >
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="font-medium">{currentClient?.name}</p>
                        <p className="text-xs text-muted-foreground">{currentClient?.industry}</p>
                      </div>
                    </div>
                    <div className="text-sm space-y-1">
                      {currentClient?.address && <AddressLink address={currentClient.address} className="text-sm text-muted-foreground" />}
                      <p className="text-muted-foreground">{currentClient?.email}</p>
                      <p className="text-muted-foreground">{currentClient?.phone}</p>
                    </div>
                    {estimate.leadId && (
                      <div className="pt-2">
                        <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Related Lead</p>
                        <Link href="/leads" className="text-sm text-primary hover:underline">
                          {leads?.find(l => l.id === estimate.leadId)?.title || "Unknown Lead"}
                        </Link>
                      </div>
                    )}
                    <div className="pt-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Building (Optional)</p>
                      {buildingsForClient.length > 0 ? (
                        <Select
                          value={estimate.buildingId != null ? String(estimate.buildingId) : "none"}
                          onValueChange={(val) => {
                            const buildingId = val === "none" ? null : parseInt(val);
                            updateEstimateMutation.mutate({ buildingId } as any);
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm" data-testid="select-detail-estimate-building">
                            <SelectValue placeholder="No specific building" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No specific building</SelectItem>
                            {buildingsForClient.map((b) => (
                              <SelectItem key={b.id} value={b.id.toString()}>
                                {b.name}{b.address ? ` · ${b.address}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No buildings in client portfolio</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="pb-0">
                <CardTitle>Estimate Activity</CardTitle>
                <CardDescription>History of changes to this estimate</CardDescription>
              </CardHeader>
              <CardContent className="h-[600px] pt-6">
                <ActivityTimeline entityType="estimate" entityId={id} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Line Item</DialogTitle>
            <DialogDescription>Select from service catalog or add a custom item</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search catalog..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-catalog-search"
              />
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-4 space-y-2">
                {filteredCatalog?.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-accent cursor-pointer transition-colors group"
                    onClick={() => handleAddCatalogItem(item)}
                    data-testid={`catalog-item-${item.id}`}
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.serviceType.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm">${Number(item.unitPrice).toFixed(2)}/{item.unit}</span>
                      <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
                {filteredCatalog?.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">No items match your search.</p>
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="flex-none gap-2">
            <Button variant="outline" onClick={handleAddCustomItem} className="w-full sm:w-auto" data-testid="button-add-custom-item">
              <Package className="mr-2 h-4 w-4" />
              Add Custom Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteItemId !== null} onOpenChange={(open) => { if (!open) setDeleteItemId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Line Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this line item? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteItemId !== null) { deleteLineItemMutation.mutate(deleteItemId); setDeleteItemId(null); } }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ScrollArea({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}
