import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { 
  Building2, 
  Users, 
  Target, 
  FileText, 
  History,
  Phone,
  Mail,
  Globe,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  MoreVertical,
  Edit,
  ArrowLeft,
  ExternalLink,
  GitBranch,
  ChevronDown,
  Star
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertClientContactSchema, 
  insertClientSchema,
  type Client, 
  type ClientContact, 
  type Lead, 
  type Estimate,
  type ActivityLog
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { OrgChart } from "@/components/OrgChart";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id!);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [orgChartEditId, setOrgChartEditId] = useState<number | null>(null);

  // Queries
  const { data: client, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
  });

  const { data: contacts, isLoading: isLoadingContacts } = useQuery<ClientContact[]>({
    queryKey: ["/api/clients", clientId, "contacts"],
  });

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    select: (leads) => leads.filter(l => l.clientId === clientId),
  });

  const { data: estimates } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates"],
    select: (estimates) => estimates.filter(e => e.clientId === clientId),
  });

  const { data: activityLogs } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", { entityType: "client", entityId: clientId }],
  });

  const { data: allClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: allContacts = [] } = useQuery<ClientContact[]>({
    queryKey: ["/api/client-contacts"],
  });

  // Mutations
  const updateClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/clients/${clientId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      toast({ title: "Success", description: "Client updated successfully" });
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/contacts`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      setIsContactDialogOpen(false);
      contactForm.reset();
      toast({ title: "Success", description: "Contact added successfully" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      toast({ title: "Success", description: "Contact deleted successfully" });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ contactId, data }: { contactId: number; data: Partial<ClientContact> }) => {
      const res = await apiRequest("PUT", `/api/clients/${clientId}/contacts/${contactId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      setOrgChartEditId(null);
      toast({ title: "Updated", description: "Contact updated successfully" });
    },
  });

  const saveEditContactMutation = useMutation({
    mutationFn: async (data: Partial<ClientContact> & { id: number }) => {
      const { id: contactId, ...fields } = data;
      const res = await apiRequest("PUT", `/api/clients/${clientId}/contacts/${contactId}`, fields);
      return res.json();
    },
    onSuccess: (updated: ClientContact) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", updated.clientId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      setIsEditContactDialogOpen(false);
      setEditingContact(null);
      toast({ title: "Saved", description: "Contact updated successfully" });
    },
  });

  // Forms
  const clientForm = useForm({
    resolver: zodResolver(insertClientSchema),
    values: client ? {
      name: client.name,
      industry: client.industry || "",
      address: client.address || "",
      phone: client.phone || "",
      email: client.email || "",
      website: client.website || "",
      notes: client.notes || "",
    } : {
      name: "",
      industry: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      notes: "",
    },
  });

  const contactForm = useForm({
    resolver: zodResolver(insertClientContactSchema),
    defaultValues: {
      clientId,
      name: "",
      title: "",
      email: "",
      phone: "",
      isPrimary: false,
      reportsTo: undefined as number | undefined,
    },
  });

  const editContactForm = useForm({
    defaultValues: {
      name: "",
      title: "",
      email: "",
      phone: "",
      isPrimary: false,
      reportsTo: undefined as number | undefined,
      clientId: clientId,
    },
  });

  const openEditContact = (contact: ClientContact) => {
    setEditingContact(contact);
    editContactForm.reset({
      name: contact.name,
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
      isPrimary: contact.isPrimary,
      reportsTo: contact.reportsTo ?? undefined,
      clientId: contact.clientId,
    });
    setIsEditContactDialogOpen(true);
  };

  const watchedEditCompanyId = editContactForm.watch("clientId");

  const onSaveEditContact = (data: any) => {
    if (!editingContact) return;
    saveEditContactMutation.mutate({ id: editingContact.id, ...data });
  };

  const onUpdateClient = (data: any) => {
    updateClientMutation.mutate(data);
  };

  const onAddContact = (data: any) => {
    createContactMutation.mutate(data);
  };

  if (isLoadingClient) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold">Customer not found</h2>
        <Button variant="ghost" onClick={() => setLocation("/customers")}>Back to Customers</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/customers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-heading font-bold">{client.name}</h1>
            <Badge variant="outline" className="h-6">Customer ID: {client.id}</Badge>
          </div>
          <p className="text-muted-foreground">{client.industry || "No industry specified"}</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 gap-6">
          <TabsTrigger value="overview" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium">
            <Building2 className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium">
            <Users className="mr-2 h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="leads" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium">
            <Target className="mr-2 h-4 w-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="estimates" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium">
            <FileText className="mr-2 h-4 w-4" />
            Estimates
          </TabsTrigger>
          <TabsTrigger value="orgchart" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium">
            <GitBranch className="mr-2 h-4 w-4" />
            Org Chart
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium">
            <History className="mr-2 h-4 w-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        <div className="py-6">
          <TabsContent value="overview" className="m-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-none shadow-sm bg-card">
                <CardHeader>
                  <CardTitle>Company Profile</CardTitle>
                  <CardDescription>View and edit detailed company information</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...clientForm}>
                    <form onSubmit={clientForm.handleSubmit(onUpdateClient)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={clientForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="col-span-1 md:col-span-2">
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-edit-client-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={clientForm.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-edit-client-industry" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={clientForm.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-edit-client-website" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={clientForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-edit-client-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={clientForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Email</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-edit-client-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={clientForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[100px]" data-testid="textarea-edit-client-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clientForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Internal Notes</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[100px]" data-testid="textarea-edit-client-notes" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end pt-4">
                        <Button 
                          type="submit" 
                          className="h-11 px-8"
                          disabled={updateClientMutation.isPending}
                          data-testid="button-save-client-changes"
                        >
                          {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-none shadow-sm bg-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">Location</p>
                        <p className="text-muted-foreground">{client.address || "No address"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">Website</p>
                        {client.website ? (
                          <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center">
                            {client.website} <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        ) : "No website"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium">Phone</p>
                        <p className="text-muted-foreground">{client.phone || "No phone"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-primary/5 text-primary-foreground border-primary/10">
                   <CardHeader className="pb-2 text-primary">
                    <CardTitle className="text-lg font-bold">Client Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-medium text-foreground">
                      <span>Total Leads</span>
                      <Badge variant="secondary">{leads?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium text-foreground">
                      <span>Total Estimates</span>
                      <Badge variant="secondary">{estimates?.length || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium text-foreground">
                      <span>Primary Contact</span>
                      <span className="text-muted-foreground">
                        {contacts?.find(c => c.isPrimary)?.name || "Not set"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle>Client Contacts</CardTitle>
                  <CardDescription>Manage key people and their contact information</CardDescription>
                </div>
                <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-10 px-4" data-testid="button-add-contact">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Contact
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add Contact</DialogTitle>
                      <DialogDescription>Add a new contact person for {client.name}.</DialogDescription>
                    </DialogHeader>
                    <Form {...contactForm}>
                      <form onSubmit={contactForm.handleSubmit(onAddContact)} className="space-y-4 py-4">
                        <FormField
                          control={contactForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter contact name" {...field} data-testid="input-contact-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={contactForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Title</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Operations Manager" {...field} value={field.value || ""} data-testid="input-contact-title" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={contactForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input placeholder="email@example.com" {...field} value={field.value || ""} data-testid="input-contact-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={contactForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                  <Input placeholder="555-0123" {...field} value={field.value || ""} data-testid="input-contact-phone" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={contactForm.control}
                          name="reportsTo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reports To</FormLabel>
                              <Select
                                onValueChange={(val) => field.onChange(val === "none" ? undefined : parseInt(val))}
                                value={field.value?.toString() || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-contact-reports-to">
                                    <SelectValue placeholder="Select manager (optional)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">No manager (top level)</SelectItem>
                                  {(contacts || []).map(c => (
                                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}{c.title ? ` — ${c.title}` : ""}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={contactForm.control}
                          name="isPrimary"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-contact-primary"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Primary Contact</FormLabel>
                                <FormDescription>
                                  Mark this person as the main point of contact for this client.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <DialogFooter className="pt-4">
                          <Button 
                            type="submit" 
                            className="w-full h-11"
                            disabled={createContactMutation.isPending}
                            data-testid="button-submit-contact"
                          >
                            {createContactMutation.isPending ? "Adding..." : "Add Contact"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoadingContacts ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : contacts && contacts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contacts.map((contact) => (
                      <Card key={contact.id} className="relative overflow-hidden group border-border/50 hover:border-primary/50 transition-colors shadow-none">
                        <CardContent className="p-4">
                          <div className="flex justify-between">
                            <div className="flex gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {contact.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold">{contact.name}</p>
                                  {contact.isPrimary && (
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 uppercase">Primary</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{contact.title || "No Title"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => openEditContact(contact)}
                                data-testid={`button-edit-contact-${contact.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => {
                                  if (confirm("Delete this contact?")) {
                                    deleteContactMutation.mutate(contact.id);
                                  }
                                }}
                                data-testid={`button-delete-contact-${contact.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2">
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed border-border/50">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-semibold">No contacts yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mb-4">Add your first contact person for this company.</p>
                    <Button variant="outline" onClick={() => setIsContactDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Contact
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Sales Leads</CardTitle>
                  <CardDescription>Pipeline opportunities associated with this client</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {leads && leads.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-bold">Lead Title</TableHead>
                          <TableHead className="font-bold">Stage</TableHead>
                          <TableHead className="font-bold text-right">Value</TableHead>
                          <TableHead className="font-bold">Created At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((lead) => (
                          <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setLocation(`/leads?id=${lead.id}`)}>
                            <TableCell className="font-medium text-primary underline underline-offset-4">{lead.title}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">{lead.stage.replace("_", " ")}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${parseFloat(lead.value as string).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(lead.createdAt), "MMM d, yyyy")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-semibold">No leads found</h3>
                    <p className="text-muted-foreground">There are no sales opportunities currently linked to this client.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estimates" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Estimates</CardTitle>
                  <CardDescription>Job estimates and cost breakdowns</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {estimates && estimates.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-bold">Estimate Title</TableHead>
                          <TableHead className="font-bold">Status</TableHead>
                          <TableHead className="font-bold text-right">Total</TableHead>
                          <TableHead className="font-bold">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {estimates.map((estimate) => (
                          <TableRow key={estimate.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setLocation(`/estimates/${estimate.id}`)}>
                            <TableCell className="font-medium text-primary underline underline-offset-4">{estimate.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{estimate.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              ${parseFloat(estimate.total as string).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(estimate.createdAt), "MMM d, yyyy")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-semibold">No estimates found</h3>
                    <p className="text-muted-foreground">No estimates have been created for this client yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orgchart" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="flex flex-row items-start justify-between pb-4">
                <div>
                  <CardTitle>Organization Chart</CardTitle>
                  <CardDescription>
                    Visual hierarchy of contacts. Click any node to view details or change reporting relationships.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsContactDialogOpen(true)}
                  data-testid="button-add-contact-org"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingContacts ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground text-sm">Loading org chart...</div>
                  </div>
                ) : (
                  <OrgChart
                    contacts={contacts || []}
                    onUpdateReportsTo={(contactId, reportsTo) => {
                      updateContactMutation.mutate({
                        contactId,
                        data: { reportsTo: reportsTo ?? undefined },
                      });
                    }}
                    onEditContact={openEditContact}
                    isUpdating={updateContactMutation.isPending}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="pb-0">
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>Complete history of interactions and changes</CardDescription>
              </CardHeader>
              <CardContent className="h-[600px] pt-6">
                <ActivityTimeline entityType="client" entityId={clientId} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditContactDialogOpen} onOpenChange={(open) => {
        setIsEditContactDialogOpen(open);
        if (!open) setEditingContact(null);
      }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact info or move them to a different company.
            </DialogDescription>
          </DialogHeader>
          <Form {...editContactForm}>
            <form onSubmit={editContactForm.handleSubmit(onSaveEditContact)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editContactForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact name" {...field} data-testid="input-edit-contact-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editContactForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Operations Manager" {...field} value={field.value || ""} data-testid="input-edit-contact-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editContactForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} value={field.value || ""} data-testid="input-edit-contact-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editContactForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="555-0123" {...field} value={field.value || ""} data-testid="input-edit-contact-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editContactForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(parseInt(val));
                        editContactForm.setValue("reportsTo", undefined);
                      }}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-contact-company">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allClients.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {watchedEditCompanyId !== clientId && (
                      <p className="text-xs text-amber-600 font-medium mt-1">
                        This contact will be moved to the selected company.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editContactForm.control}
                name="reportsTo"
                render={({ field }) => {
                  const companyContacts = allContacts.filter(
                    c => c.clientId === watchedEditCompanyId && c.id !== editingContact?.id
                  );
                  return (
                    <FormItem>
                      <FormLabel>Reports To</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "none" ? undefined : parseInt(val))}
                        value={field.value?.toString() || "none"}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-contact-reports-to">
                            <SelectValue placeholder="No manager (top level)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No manager (top level)</SelectItem>
                          {companyContacts.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {c.name}{c.title ? ` — ${c.title}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={editContactForm.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-edit-contact-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Primary Contact</FormLabel>
                      <FormDescription>
                        Mark as the main point of contact for their company.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditContactDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveEditContactMutation.isPending}
                  data-testid="button-save-edit-contact"
                >
                  {saveEditContactMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
