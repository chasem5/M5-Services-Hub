import { useState, useRef } from "react";
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
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Linkedin,
} from "lucide-react";
import { SiLinkedin } from "react-icons/si";

// ── CSV utilities ────────────────────────────────────────────────────────────

function escapeCSV(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function rowToCSV(row: unknown[]): string {
  return row.map(escapeCSV).join(",");
}

function buildCSV(headers: string[], rows: unknown[][]): string {
  return [rowToCSV(headers), ...rows.map(rowToCSV)].join("\n");
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (line[i] === "," && !inQuotes) {
      result.push(cur); cur = "";
    } else {
      cur += line[i];
    }
  }
  result.push(cur);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map(line => {
    const vals = parseCSVRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] ?? "").trim(); });
    return obj;
  });
}
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

interface ImportResult {
  created: number;
  errors: string[];
  type: "companies" | "contacts";
}

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null);
  const companiesFileRef = useRef<HTMLInputElement>(null);
  const contactsFileRef = useRef<HTMLInputElement>(null);
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

  const exportCompanies = () => {
    if (!clients?.length) { toast({ title: "No companies to export" }); return; }
    const csv = buildCSV(
      ["name", "industry", "address", "phone", "email", "website", "notes"],
      clients.map(c => [c.name, c.industry, c.address, c.phone, c.email, c.website, c.notes])
    );
    downloadCSV("m5-companies.csv", csv);
  };

  const exportContacts = () => {
    if (!allContacts.length) { toast({ title: "No contacts to export" }); return; }
    const csv = buildCSV(
      ["company_name", "name", "title", "email", "phone", "is_primary"],
      allContacts.map(c => [
        clients?.find(cl => cl.id === c.clientId)?.name ?? "",
        c.name, c.title, c.email, c.phone,
        c.isPrimary ? "true" : "false",
      ])
    );
    downloadCSV("m5-contacts.csv", csv);
  };

  const downloadCompaniesTemplate = () => {
    const csv = buildCSV(
      ["name", "industry", "address", "phone", "email", "website", "notes"],
      [["Acme Corp", "Facility Management", "123 Main St", "555-1234", "info@acme.com", "acme.com", "Sample note"]]
    );
    downloadCSV("m5-companies-template.csv", csv);
  };

  const downloadContactsTemplate = () => {
    const csv = buildCSV(
      ["company_name", "name", "title", "email", "phone", "is_primary"],
      [["Acme Corp", "Jane Smith", "Property Manager", "jane@acme.com", "555-5678", "true"]]
    );
    downloadCSV("m5-contacts-template.csv", csv);
  };

  const handleImportFile = async (file: File, type: "companies" | "contacts") => {
    const text = await file.text();
    const rows = parseCSV(text);
    if (!rows.length) {
      toast({ title: "Empty or invalid CSV", description: "Make sure the file has a header row and at least one data row.", variant: "destructive" });
      return;
    }
    setIsImporting(true);
    try {
      const endpoint = type === "companies" ? "/api/clients/import" : "/api/client-contacts/import";
      const res = await apiRequest("POST", endpoint, { rows });
      const result = await res.json();
      setImportResult({ ...result, type });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

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
      {/* Hidden file inputs for import */}
      <input
        ref={companiesFileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file, "companies");
          e.target.value = "";
        }}
        data-testid="input-import-companies-file"
      />
      <input
        ref={contactsFileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file, "contacts");
          e.target.value = "";
        }}
        data-testid="input-import-contacts-file"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold">Customers</h1>
          <p className="text-muted-foreground text-lg">Manage your customer database and relationships</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import / Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 px-4 font-medium" disabled={isImporting} data-testid="button-import-export">
                {isImporting ? (
                  <><Upload className="mr-2 h-4 w-4 animate-pulse" />Importing...</>
                ) : (
                  <><FileText className="mr-2 h-4 w-4" />Import / Export<ChevronDown className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" /> Companies
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={exportCompanies} data-testid="button-export-companies">
                <Download className="mr-2 h-4 w-4" /> Export Companies CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => companiesFileRef.current?.click()} data-testid="button-import-companies">
                <Upload className="mr-2 h-4 w-4" /> Import Companies CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadCompaniesTemplate} data-testid="button-template-companies">
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Download Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" /> Contacts
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={exportContacts} data-testid="button-export-contacts">
                <Download className="mr-2 h-4 w-4" /> Export Contacts CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => contactsFileRef.current?.click()} data-testid="button-import-contacts">
                <Upload className="mr-2 h-4 w-4" /> Import Contacts CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadContactsTemplate} data-testid="button-template-contacts">
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Download Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
                        <TableHead className="font-bold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => (
                        <TableRow
                          key={contact.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedContact(contact)}
                          data-testid={`row-contact-${contact.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {contact.profilePictureUrl ? (
                                <img
                                  src={contact.profilePictureUrl}
                                  alt={contact.name}
                                  className="h-8 w-8 rounded-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                  {contact.name.charAt(0).toUpperCase()}
                                </div>
                              )}
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
                          <TableCell onClick={(e) => e.stopPropagation()}>
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
                          <TableCell>
                            {contact.employmentStatus === "active" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Active
                              </span>
                            )}
                            {contact.employmentStatus === "likely_left" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3" />May have left
                              </span>
                            )}
                            {contact.employmentStatus === "unverified" && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-500 dark:text-blue-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />Open to Work
                              </span>
                            )}
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

      {/* Contact Profile Dialog */}
      <Dialog open={!!selectedContact} onOpenChange={(open) => { if (!open) setSelectedContact(null); }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {selectedContact && (() => {
            const sc = selectedContact;
            const initials = sc.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <>
                {/* Header band */}
                <div className="bg-primary/8 border-b px-6 pt-6 pb-5">
                  <div className="flex items-start gap-4">
                    {sc.profilePictureUrl ? (
                      <img src={sc.profilePictureUrl} alt={sc.name} className="h-16 w-16 rounded-full object-cover ring-2 ring-border shrink-0" />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-primary/10 ring-2 ring-border flex items-center justify-center text-primary font-bold text-xl shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-lg leading-tight">{sc.name}</h2>
                        {sc.isPrimary && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
                            <Star className="h-2.5 w-2.5 fill-current" />Primary
                          </span>
                        )}
                        {sc.linkedinUrl && (
                          <a href={sc.linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} data-testid={`link-linkedin-profile-${sc.id}`}>
                            <SiLinkedin className="h-4 w-4 text-[#0A66C2]" />
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{sc.title || <span className="italic">No title</span>}</p>
                      {/* Employment status */}
                      <div className="mt-2">
                        {sc.employmentStatus === "active" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600 dark:text-green-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Active
                          </span>
                        )}
                        {sc.employmentStatus === "likely_left" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3" />May have left
                          </span>
                        )}
                        {sc.employmentStatus === "unverified" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-500 dark:text-blue-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />Open to Work
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                  {/* Company */}
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Link
                      href={`/customers/${sc.clientId}`}
                      className="text-sm text-primary hover:underline font-medium"
                      onClick={() => setSelectedContact(null)}
                      data-testid={`link-profile-company-${sc.id}`}
                    >
                      {getCompanyName(sc.clientId)}
                    </Link>
                  </div>
                  {/* Email */}
                  {sc.email ? (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${sc.email}`} className="text-sm hover:underline" data-testid={`link-profile-email-${sc.id}`}>{sc.email}</a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground italic">No email on file</span>
                    </div>
                  )}
                  {/* Phone */}
                  {sc.phone ? (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${sc.phone}`} className="text-sm hover:underline" data-testid={`link-profile-phone-${sc.id}`}>{sc.phone}</a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground italic">No phone on file</span>
                    </div>
                  )}
                  {/* LinkedIn URL text */}
                  {sc.linkedinUrl && (
                    <div className="flex items-center gap-3">
                      <Linkedin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <a href={sc.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate" data-testid={`link-profile-linkedin-${sc.id}`}>
                        {sc.linkedinUrl.replace("https://www.linkedin.com/in/", "")}
                      </a>
                    </div>
                  )}
                  {/* Service Needs */}
                  {sc.serviceNeeds && sc.serviceNeeds.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Service Needs</p>
                      <div className="flex flex-wrap gap-1.5">
                        {sc.serviceNeeds.map((need: string) => (
                          <Badge key={need} variant="secondary" className="text-xs capitalize">
                            {need.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Go to full company profile */}
                  <div className="pt-2 border-t">
                    <Link
                      href={`/customers/${sc.clientId}`}
                      onClick={() => setSelectedContact(null)}
                      data-testid={`button-view-company-${sc.id}`}
                    >
                      <button className="w-full h-9 text-sm rounded-md border border-border hover:bg-muted/50 transition-colors flex items-center justify-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        View full company profile
                      </button>
                    </Link>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Import Result Dialog */}
      <Dialog open={!!importResult} onOpenChange={(open) => { if (!open) setImportResult(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {importResult && importResult.errors.length === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              Import Complete
            </DialogTitle>
            <DialogDescription>
              {importResult?.type === "companies" ? "Companies" : "Contacts"} import finished.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Records created</span>
              <span className="text-2xl font-bold text-green-700 dark:text-green-400">{importResult?.created ?? 0}</span>
            </div>
            {importResult && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {importResult.errors.length} row{importResult.errors.length !== 1 ? "s" : ""} skipped
                </p>
                <div className="max-h-48 overflow-y-auto rounded border bg-muted/30 p-2 space-y-1">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-muted-foreground font-mono">{err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setImportResult(null)} data-testid="button-close-import-result">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
