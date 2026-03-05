import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Settings2,
  MoreHorizontal, 
  Edit,
  Trash2,
  Package,
  CheckCircle2,
  XCircle
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceCatalogSchema, type ServiceCatalogItem } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";

export default function ServiceCatalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceCatalogItem | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

  const { data: items, isLoading } = useQuery<ServiceCatalogItem[]>({
    queryKey: ["/api/service-catalog"],
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/service-catalog", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-catalog"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Catalog item created successfully",
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

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest("PUT", `/api/service-catalog/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-catalog"] });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: "Success",
        description: "Catalog item updated successfully",
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

  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/service-catalog/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-catalog"] });
      toast({
        title: "Success",
        description: "Catalog item deactivated",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertServiceCatalogSchema),
    defaultValues: {
      name: "",
      serviceType: "facility_solutions",
      description: "",
      unitPrice: "0",
      unit: "hour",
      isActive: true,
    },
  });

  const onSubmit = (data: any) => {
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  };

  const handleEdit = (item: ServiceCatalogItem) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      serviceType: item.serviceType as any,
      description: item.description || "",
      unitPrice: item.unitPrice.toString(),
      unit: item.unit,
      isActive: item.isActive,
    });
    setIsDialogOpen(true);
  };

  const serviceTypes = [
    { value: "building_engineering", label: "Building Engineering" },
    { value: "facility_solutions", label: "Facility Solutions" },
    { value: "janitorial", label: "Janitorial" },
    { value: "special_projects", label: "Special Projects" },
    { value: "property_assessment", label: "Property Assessment" },
  ];

  const filteredItems = items?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || item.serviceType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Service Catalog</h1>
          <p className="text-muted-foreground text-lg">Manage your standard services and pricing</p>
        </div>
        {isAdminOrManager && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="h-11 px-6 font-medium" data-testid="button-add-catalog-item">
                <Plus className="mr-2 h-5 w-5" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingItem ? "Edit Catalog Item" : "Add Catalog Item"}</DialogTitle>
                <DialogDescription>
                  {editingItem ? "Update the details of this service." : "Create a new service for the catalog."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. HVAC Maintenance" {...field} data-testid="input-item-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="serviceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-item-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {serviceTypes.map(type => (
                                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. hour, sqft" {...field} data-testid="input-item-unit" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="unitPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} data-testid="input-item-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the service..." 
                            className="resize-none"
                            {...field} 
                            value={field.value || ""}
                            data-testid="textarea-item-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Controls whether this item is visible in estimates
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-item-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full sm:w-auto h-11 px-8"
                      disabled={createItemMutation.isPending || updateItemMutation.isPending}
                      data-testid="button-submit-item"
                    >
                      {editingItem ? "Update Item" : "Create Item"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-none shadow-sm bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
                data-testid="input-search-catalog"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[200px] h-10" data-testid="select-type-filter">
                  <SelectValue placeholder="All Service Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Service Types</SelectItem>
                  {serviceTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : filteredItems && filteredItems.length > 0 ? (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="font-bold">Item Name</TableHead>
                    <TableHead className="font-bold">Type</TableHead>
                    <TableHead className="font-bold text-right">Unit Price</TableHead>
                    <TableHead className="font-bold">Unit</TableHead>
                    <TableHead className="font-bold">Status</TableHead>
                    {isAdminOrManager && <TableHead className="w-[80px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">{item.description}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.serviceType.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${Number(item.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{item.unit}</span>
                      </TableCell>
                      <TableCell>
                        {item.isActive ? (
                          <div className="flex items-center text-green-600 text-sm">
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            Active
                          </div>
                        ) : (
                          <div className="flex items-center text-muted-foreground text-sm">
                            <XCircle className="mr-1.5 h-4 w-4" />
                            Inactive
                          </div>
                        )}
                      </TableCell>
                      {isAdminOrManager && (
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-item-actions-${item.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[160px]">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="cursor-pointer"
                                onClick={() => handleEdit(item)}
                                data-testid={`button-edit-item-${item.id}`}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Item
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive cursor-pointer"
                                onClick={() => {
                                  if (confirm("Are you sure you want to deactivate this item?")) {
                                    deleteItemMutation.mutate(item.id);
                                  }
                                }}
                                data-testid={`button-delete-item-${item.id}`}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed border-border/50">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No catalog items found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-1">
                {searchTerm || typeFilter !== "all" 
                  ? "Try adjusting your search or filters to find what you're looking for." 
                  : "Get started by adding your first service to the catalog."}
              </p>
              {isAdminOrManager && !searchTerm && typeFilter === "all" && (
                <Button 
                  variant="outline" 
                  className="mt-6 h-10" 
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Item
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
