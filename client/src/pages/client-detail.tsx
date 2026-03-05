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
  Star,
  HardHat,
  Wrench,
  Sparkles,
  Zap,
  ClipboardList
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
  insertClientOfficeSchema,
  type Client, 
  type ClientOffice,
  type ClientContact, 
  type Lead, 
  type Estimate,
  type ActivityLog
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { OrgChart } from "@/components/OrgChart";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: ClientContact;
  onEdit: (c: ClientContact) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <Card className="relative group border-border/50 hover:border-primary/50 transition-colors shadow-none">
      <CardContent className="p-4">
        <div className="flex justify-between">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
              {contact.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
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
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(contact)}
              data-testid={`button-edit-contact-${contact.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(contact.id)}
              data-testid={`button-delete-contact-${contact.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          {contact.email && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="mr-2 h-3.5 w-3.5 shrink-0" />
              {contact.email}
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="mr-2 h-3.5 w-3.5 shrink-0" />
              {contact.phone}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const SERVICE_NEEDS = [
  { key: "building_engineering", label: "Building Engineer", Icon: HardHat, color: "text-orange-500" },
  { key: "facility_solutions", label: "Facility Solutions", Icon: Wrench, color: "text-blue-500" },
  { key: "janitorial", label: "Janitorial", Icon: Sparkles, color: "text-teal-500" },
  { key: "special_projects", label: "Special Projects", Icon: Zap, color: "text-purple-500" },
  { key: "property_assessment", label: "Property Assessment", Icon: ClipboardList, color: "text-primary" },
] as const;

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id!);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [orgChartEditId, setOrgChartEditId] = useState<number | null>(null);
  const [isOfficeDialogOpen, setIsOfficeDialogOpen] = useState(false);
  const [isEditOfficeDialogOpen, setIsEditOfficeDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<ClientOffice | null>(null);
  const [defaultOfficeId, setDefaultOfficeId] = useState<number | null>(null);

  // Queries
  const { data: client, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
  });

  const { data: contacts, isLoading: isLoadingContacts } = useQuery<ClientContact[]>({
    queryKey: ["/api/clients", clientId, "contacts"],
  });

  const { data: offices } = useQuery<ClientOffice[]>({
    queryKey: ["/api/clients", clientId, "offices"],
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

  const updateServiceNeedsMutation = useMutation({
    mutationFn: async (serviceNeeds: string[]) => {
      const res = await apiRequest("PUT", `/api/clients/${clientId}`, { serviceNeeds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });

  const toggleServiceNeed = (key: string) => {
    const current: string[] = client?.serviceNeeds ?? [];
    const updated = current.includes(key)
      ? current.filter(s => s !== key)
      : [...current, key];
    updateServiceNeedsMutation.mutate(updated);
  };

  const createOfficeMutation = useMutation({
    mutationFn: async (data: { name: string; address?: string; phone?: string }) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/offices`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "offices"] });
      setIsOfficeDialogOpen(false);
      officeForm.reset({ name: "", address: "", phone: "" });
      toast({ title: "Office added", description: "The office/division has been created." });
    },
  });

  const updateOfficeMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; address?: string; phone?: string }) => {
      const { id, ...fields } = data;
      const res = await apiRequest("PUT", `/api/clients/${clientId}/offices/${id}`, fields);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "offices"] });
      setIsEditOfficeDialogOpen(false);
      setEditingOffice(null);
      toast({ title: "Office updated" });
    },
  });

  const deleteOfficeMutation = useMutation({
    mutationFn: async (officeId: number) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/offices/${officeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "offices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      toast({ title: "Office deleted", description: "Contacts have been moved to unassigned." });
    },
  });

  const openAddContactForOffice = (officeId: number | null) => {
    setDefaultOfficeId(officeId);
    contactForm.setValue("officeId" as any, officeId ?? undefined);
    setIsContactDialogOpen(true);
  };

  const openEditOffice = (office: ClientOffice) => {
    setEditingOffice(office);
    editOfficeForm.reset({ name: office.name, address: office.address || "", phone: office.phone || "" });
    setIsEditOfficeDialogOpen(true);
  };

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
      reportsTo: null as number | null,
      officeId: null as number | null,
      clientId: clientId,
    },
  });

  const officeForm = useForm({
    defaultValues: { name: "", address: "", phone: "" },
  });

  const editOfficeForm = useForm({
    defaultValues: { name: "", address: "", phone: "" },
  });

  const openEditContact = (contact: ClientContact) => {
    setEditingContact(contact);
    editContactForm.reset({
      name: contact.name,
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
      isPrimary: contact.isPrimary,
      reportsTo: contact.reportsTo ?? null,
      officeId: contact.officeId ?? null,
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Service Needs</CardTitle>
                    <CardDescription>Which M5 services does this company require?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {SERVICE_NEEDS.map(({ key, label, Icon, color }) => {
                      const isChecked = (client.serviceNeeds ?? []).includes(key);
                      return (
                        <div
                          key={key}
                          role="checkbox"
                          aria-checked={isChecked}
                          tabIndex={0}
                          onClick={() => !updateServiceNeedsMutation.isPending && toggleServiceNeed(key)}
                          onKeyDown={(e) => e.key === " " && !updateServiceNeedsMutation.isPending && toggleServiceNeed(key)}
                          data-testid={`toggle-service-need-${key}`}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer select-none ${
                            isChecked
                              ? "bg-primary/8 border border-primary/20"
                              : "hover:bg-muted/60 border border-transparent"
                          } ${updateServiceNeedsMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-primary border-primary" : "border-input"}`}>
                            {isChecked && <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div className={`h-7 w-7 rounded flex items-center justify-center shrink-0 ${isChecked ? "bg-primary/10" : "bg-muted"}`}>
                            <Icon className={`h-3.5 w-3.5 ${isChecked ? color : "text-muted-foreground"}`} />
                          </div>
                          <span className={`text-sm font-medium ${isChecked ? "text-foreground" : "text-muted-foreground"}`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

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

          <TabsContent value="contacts" className="m-0 space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Contacts &amp; Offices</h3>
                <p className="text-sm text-muted-foreground">Organize contacts by office or division</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-10 px-4"
                  onClick={() => setIsOfficeDialogOpen(true)}
                  data-testid="button-add-office"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Add Office
                </Button>
                <Button
                  className="h-10 px-4"
                  onClick={() => openAddContactForOffice(null)}
                  data-testid="button-add-contact"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </div>
            </div>

            {isLoadingContacts ? (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Offices with their contacts */}
                {(offices || []).map(office => {
                  const officeContacts = (contacts || []).filter(c => c.officeId === office.id);
                  return (
                    <Card key={office.id} className="border-none shadow-sm bg-card">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-base">{office.name}</h4>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                {office.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{office.address}</span>}
                                {office.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{office.phone}</span>}
                                <span>{officeContacts.length} contact{officeContacts.length !== 1 ? "s" : ""}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-muted-foreground hover:text-foreground text-xs"
                              onClick={() => openAddContactForOffice(office.id)}
                              data-testid={`button-add-contact-to-office-${office.id}`}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add Contact
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditOffice(office)}
                              data-testid={`button-edit-office-${office.id}`}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (confirm(`Delete "${office.name}"? Contacts will be moved to unassigned.`)) {
                                  deleteOfficeMutation.mutate(office.id);
                                }
                              }}
                              data-testid={`button-delete-office-${office.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {officeContacts.length === 0 ? (
                          <div className="py-6 text-center border-2 border-dashed border-border/40 rounded-lg">
                            <p className="text-sm text-muted-foreground">No contacts in this office yet.</p>
                            <Button variant="ghost" size="sm" className="mt-2 h-8 text-xs" onClick={() => openAddContactForOffice(office.id)}>
                              <Plus className="mr-1 h-3 w-3" />Add Contact
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {officeContacts.map(contact => (
                              <ContactCard
                                key={contact.id}
                                contact={contact}
                                onEdit={openEditContact}
                                onDelete={(id) => { if (confirm("Delete this contact?")) deleteContactMutation.mutate(id); }}
                              />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Unassigned contacts */}
                {(() => {
                  const unassigned = (contacts || []).filter(c => !c.officeId);
                  const hasOffices = (offices || []).length > 0;
                  if (!hasOffices && unassigned.length === 0) {
                    return (
                      <div className="text-center py-16 bg-muted/20 rounded-lg border-2 border-dashed border-border/50">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                        <h3 className="text-lg font-semibold">No offices or contacts yet</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mb-4 text-sm">Create an office to organize your contacts, or add a contact directly.</p>
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="outline" onClick={() => setIsOfficeDialogOpen(true)}>
                            <Building2 className="mr-2 h-4 w-4" />Add Office
                          </Button>
                          <Button onClick={() => openAddContactForOffice(null)}>
                            <Plus className="mr-2 h-4 w-4" />Add Contact
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  if (unassigned.length === 0) return null;
                  return (
                    <Card className="border-none shadow-sm bg-card">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-base text-muted-foreground">Unassigned</h4>
                            <p className="text-xs text-muted-foreground">{unassigned.length} contact{unassigned.length !== 1 ? "s" : ""} not linked to an office</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {unassigned.map(contact => (
                            <ContactCard
                              key={contact.id}
                              contact={contact}
                              onEdit={openEditContact}
                              onDelete={(id) => { if (confirm("Delete this contact?")) deleteContactMutation.mutate(id); }}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            )}

            {/* Add Contact Dialog */}
            <Dialog open={isContactDialogOpen} onOpenChange={(open) => { setIsContactDialogOpen(open); if (!open) setDefaultOfficeId(null); }}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                  <DialogDescription>Add a new contact person for {client.name}.</DialogDescription>
                </DialogHeader>
                <Form {...contactForm}>
                  <form onSubmit={contactForm.handleSubmit(onAddContact)} className="space-y-4 py-4">
                    <FormField control={contactForm.control} name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input placeholder="Enter contact name" {...field} data-testid="input-contact-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={contactForm.control} name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl><Input placeholder="e.g. Operations Manager" {...field} value={field.value || ""} data-testid="input-contact-title" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={contactForm.control} name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input placeholder="email@example.com" {...field} value={field.value || ""} data-testid="input-contact-email" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={contactForm.control} name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl><Input placeholder="555-0123" {...field} value={field.value || ""} data-testid="input-contact-phone" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {(offices || []).length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Office / Division</label>
                        <Select
                          onValueChange={(val) => (contactForm as any).setValue("officeId", val === "none" ? null : parseInt(val))}
                          defaultValue={defaultOfficeId?.toString() || "none"}
                        >
                          <SelectTrigger data-testid="select-contact-office">
                            <SelectValue placeholder="Select office (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No office (unassigned)</SelectItem>
                            {(offices || []).map(o => (
                              <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <FormField control={contactForm.control} name="reportsTo"
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
                    <FormField control={contactForm.control} name="isPrimary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-contact-primary" />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Primary Contact</FormLabel>
                            <FormDescription>Mark this person as the main point of contact.</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <DialogFooter className="pt-4">
                      <Button type="submit" className="w-full h-11" disabled={createContactMutation.isPending} data-testid="button-submit-contact">
                        {createContactMutation.isPending ? "Adding..." : "Add Contact"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Add Office Dialog */}
            <Dialog open={isOfficeDialogOpen} onOpenChange={setIsOfficeDialogOpen}>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle>Add Office / Division</DialogTitle>
                  <DialogDescription>Create a new office or division to organize contacts.</DialogDescription>
                </DialogHeader>
                <form onSubmit={officeForm.handleSubmit((d) => createOfficeMutation.mutate(d))} className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Name <span className="text-destructive">*</span></label>
                    <Input {...officeForm.register("name", { required: true })} placeholder="e.g. Downtown Office, West Division" data-testid="input-office-name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Address</label>
                    <Input {...officeForm.register("address")} placeholder="123 Main St, City, State" data-testid="input-office-address" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone</label>
                    <Input {...officeForm.register("phone")} placeholder="555-0100" data-testid="input-office-phone" />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-11" disabled={createOfficeMutation.isPending} data-testid="button-submit-office">
                      {createOfficeMutation.isPending ? "Creating..." : "Create Office"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Office Dialog */}
            <Dialog open={isEditOfficeDialogOpen} onOpenChange={setIsEditOfficeDialogOpen}>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle>Edit Office</DialogTitle>
                  <DialogDescription>Update the details for this office or division.</DialogDescription>
                </DialogHeader>
                <form onSubmit={editOfficeForm.handleSubmit((d) => editingOffice && updateOfficeMutation.mutate({ id: editingOffice.id, ...d }))} className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Name <span className="text-destructive">*</span></label>
                    <Input {...editOfficeForm.register("name", { required: true })} data-testid="input-edit-office-name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Address</label>
                    <Input {...editOfficeForm.register("address")} data-testid="input-edit-office-address" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone</label>
                    <Input {...editOfficeForm.register("phone")} data-testid="input-edit-office-phone" />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-11" disabled={updateOfficeMutation.isPending} data-testid="button-submit-edit-office">
                      {updateOfficeMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
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
                    offices={offices || []}
                    onUpdateReportsTo={(contactId, reportsTo) => {
                      updateContactMutation.mutate({
                        contactId,
                        data: { reportsTo: reportsTo },
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

              {(offices || []).length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Office / Division</label>
                  <Select
                    onValueChange={(val) => editContactForm.setValue("officeId" as any, val === "none" ? null : parseInt(val))}
                    value={editContactForm.watch("officeId" as any)?.toString() || "none"}
                  >
                    <SelectTrigger data-testid="select-edit-contact-office">
                      <SelectValue placeholder="Select office (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No office (unassigned)</SelectItem>
                      {(offices || []).map(o => (
                        <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <FormField
                control={editContactForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(parseInt(val));
                        editContactForm.setValue("reportsTo", null);
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
                        onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                        value={field.value != null ? field.value.toString() : "none"}
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
