import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Building2, 
  MoreHorizontal, 
  Phone, 
  Mail, 
  Globe, 
  MapPin,
  ExternalLink,
  Trash2,
  Users,
  Star,
} from "lucide-react";
import { Link } from "wouter";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type Client, type ClientContact } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: allContacts = [], isLoading: isLoadingContacts } = useQuery<ClientContact[]>({
    queryKey: ["/api/client-contacts"],
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({ title: "Success", description: "Customer created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Success", description: "Customer deleted successfully" });
    },
  });

  const form = useForm({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      industry: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      notes: "",
    },
  });

  const onSubmit = (data: any) => {
    createClientMutation.mutate(data);
  };

  const industries = Array.from(new Set(clients?.map(c => c.industry).filter(Boolean) || []));

  const filteredClients = clients?.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.industry?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = industryFilter === "all" || client.industry === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  const getCompanyName = (clientId: number) =>
    clients?.find(c => c.id === clientId)?.name ?? "Unknown Company";

  const filteredContacts = allContacts.filter(contact => {
    const term = contactSearch.toLowerCase();
    return (
      contact.name.toLowerCase().includes(term) ||
      contact.email?.toLowerCase().includes(term) ||
      contact.title?.toLowerCase().includes(term) ||
      getCompanyName(contact.clientId).toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Customers</h1>
          <p className="text-muted-foreground text-lg">Manage your customer database and relationships</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 font-medium" data-testid="button-add-customer">
              <Plus className="mr-2 h-5 w-5" />
              Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>
                Create a new customer company. Contacts can be added from the company detail page.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company name" {...field} data-testid="input-customer-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Healthcare" {...field} value={field.value || ""} data-testid="input-customer-industry" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} value={field.value || ""} data-testid="input-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter email address" {...field} value={field.value || ""} data-testid="input-customer-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." {...field} value={field.value || ""} data-testid="input-customer-website" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter physical address" 
                          className="resize-none"
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-customer-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add any additional context..." 
                          className="resize-none"
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-customer-notes"
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
                    disabled={createClientMutation.isPending}
                    data-testid="button-submit-customer"
                  >
                    {createClientMutation.isPending ? "Creating..." : "Create Company"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="companies">
        <TabsList className="mb-4">
          <TabsTrigger value="companies" className="flex items-center gap-2" data-testid="tab-companies">
            <Building2 className="h-4 w-4" />
            Companies
            {clients && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{clients.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2" data-testid="tab-contacts">
            <Users className="h-4 w-4" />
            Contacts
            {allContacts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{allContacts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Companies Tab ── */}
        <TabsContent value="companies">
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email or industry..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                    data-testid="input-search-customers"
                  />
                </div>
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="w-[180px] h-10" data-testid="select-industry-filter">
                    <SelectValue placeholder="All Industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Industries</SelectItem>
                    {industries.map((ind) => (
                      <SelectItem key={ind} value={ind!}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredClients && filteredClients.length > 0 ? (
                <div className="rounded-md border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold">Company Name</TableHead>
                        <TableHead className="font-bold">Industry</TableHead>
                        <TableHead className="font-bold">Contact Info</TableHead>
                        <TableHead className="font-bold">Address</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">
                            <Link 
                              href={`/customers/${client.id}`}
                              className="flex items-center gap-3 text-primary hover:underline group"
                              data-testid={`link-customer-detail-${client.id}`}
                            >
                              <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col gap-1 min-w-0">
                                <span className="text-base">{client.name}</span>
                                {(client.serviceNeeds ?? []).length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {(client.serviceNeeds ?? []).map(need => {
                                      const labels: Record<string, string> = {
                                        building_engineering: "Building Eng.",
                                        facility_solutions: "Facility Sol.",
                                        janitorial: "Janitorial",
                                        special_projects: "Special Proj.",
                                        property_assessment: "Prop. Assessment",
                                      };
                                      return (
                                        <span
                                          key={need}
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                                          data-testid={`badge-service-need-${client.id}-${need}`}
                                        >
                                          {labels[need] ?? need}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell>
                            {client.industry ? (
                              <Badge variant="secondary" className="font-medium px-2.5 py-0.5">
                                {client.industry}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground italic text-sm">Not specified</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5">
                              {client.email && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Mail className="mr-2 h-3.5 w-3.5" />
                                  {client.email}
                                </div>
                              )}
                              {client.phone && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Phone className="mr-2 h-3.5 w-3.5" />
                                  {client.phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="flex items-start text-sm text-muted-foreground line-clamp-2">
                              <MapPin className="mr-2 h-3.5 w-3.5 mt-0.5 shrink-0" />
                              {client.address || <span className="italic">No address</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-customer-actions-${client.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-[160px]">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/customers/${client.id}`} className="cursor-pointer">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive cursor-pointer"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this customer?")) {
                                      deleteClientMutation.mutate(client.id);
                                    }
                                  }}
                                  data-testid={`button-delete-customer-${client.id}`}
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
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No companies found</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mt-1">
                    {searchTerm || industryFilter !== "all" 
                      ? "Try adjusting your search or filters." 
                      : "Get started by adding your first customer company."}
                  </p>
                  {!searchTerm && industryFilter === "all" && (
                    <Button 
                      variant="outline" 
                      className="mt-6 h-10" 
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Company
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contacts Tab ── */}
        <TabsContent value="contacts">
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-10 h-10"
                  data-testid="input-search-contacts"
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingContacts ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredContacts.length > 0 ? (
                <div className="rounded-md border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold">Name</TableHead>
                        <TableHead className="font-bold">Company</TableHead>
                        <TableHead className="font-bold">Title</TableHead>
                        <TableHead className="font-bold">Contact Info</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => (
                        <TableRow key={contact.id} className="hover:bg-muted/30 transition-colors" data-testid={`row-contact-${contact.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                                {contact.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{contact.name}</p>
                                {contact.isPrimary && (
                                  <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                                    <Star className="h-2.5 w-2.5 fill-current" />
                                    Primary
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/customers/${contact.clientId}`}
                              className="flex items-center gap-1.5 text-primary hover:underline text-sm"
                              data-testid={`link-contact-company-${contact.id}`}
                            >
                              <Building2 className="h-3.5 w-3.5" />
                              {getCompanyName(contact.clientId)}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{contact.title || <span className="italic">No title</span>}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {contact.email && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Mail className="mr-2 h-3.5 w-3.5" />
                                  {contact.email}
                                </div>
                              )}
                              {contact.phone && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Phone className="mr-2 h-3.5 w-3.5" />
                                  {contact.phone}
                                </div>
                              )}
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
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No contacts found</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mt-1">
                    {contactSearch
                      ? "Try adjusting your search."
                      : "Add contacts from a company's detail page."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
