import { useState, useRef, lazy, Suspense, useMemo } from "react";
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
  ChevronUp,
  ArrowUpDown,
  Linkedin,
  X,
  DollarSign,
  Landmark,
  Target,
  ChevronRight,
  Map,
  LayoutGrid,
  Layers,
} from "lucide-react";
import { SiLinkedin } from "react-icons/si";
const MapView = lazy(() => import("@/pages/map").then(m => ({ default: m.MapView })));

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
import { AddressLink } from "@/components/AddressLink";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { TierBadge } from "@/components/TierBadge";
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
import { insertClientSchema, type Client, type ClientContact, type BdSpendEntry, type ContactBuilding, type ClientOffice, type Lead, type Estimate } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioManager } from "@/components/PortfolioManager";

interface ImportResult {
  created: number;
  errors: string[];
  type: "companies" | "contacts";
}

// ── BuildingsList component ───────────────────────────────────────────────────
interface BuildingsListProps {
  buildings: ContactBuilding[];
  offices: ClientOffice[];
  contacts: ClientContact[];
  clients: Client[];
  leads: Lead[];
  estimates: Estimate[];
  search: string;
}

function BuildingsList({ buildings, offices, contacts, clients: clientsList, leads, estimates, search }: BuildingsListProps) {
  const filteredOffices = offices.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    const company = clientsList.find(cl => cl.id === o.clientId);
    return (
      o.name.toLowerCase().includes(q) ||
      (o.address ?? "").toLowerCase().includes(q) ||
      (company?.name ?? "").toLowerCase().includes(q)
    );
  });

  const filtered = buildings.filter(b => {
    if (!search) return true;
    const q = search.toLowerCase();
    const contact = contacts.find(c => c.id === b.contactId);
    const company = clientsList.find(cl => cl.id === contact?.clientId);
    return (
      b.name.toLowerCase().includes(q) ||
      (b.address ?? "").toLowerCase().includes(q) ||
      (contact?.name ?? "").toLowerCase().includes(q) ||
      (company?.name ?? "").toLowerCase().includes(q) ||
      (b.notes ?? "").toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0 && filteredOffices.length === 0) {
    return (
      <div className="text-center py-16">
        <Landmark className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="font-medium text-muted-foreground">
          {search ? "No locations match your search." : "No buildings or offices yet."}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Add offices on a company's detail page, and buildings from a contact's profile.
        </p>
      </div>
    );
  }

  return (
    <div>
    {filteredOffices.length > 0 && (
      <div className="px-6 pt-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          Office Locations
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredOffices.map(office => {
            const company = clientsList.find(cl => cl.id === office.clientId);
            return (
              <div
                key={`office-${office.id}`}
                className="bg-muted/30 border border-dashed rounded-xl p-4 flex flex-col gap-2"
                data-testid={`card-office-${office.id}`}
              >
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm leading-tight truncate">{office.name}</h3>
                    {office.address && (
                      <AddressLink address={office.address} className="text-[11px] text-muted-foreground leading-tight mt-0.5" />
                    )}
                  </div>
                </div>
                {company && (
                  <Link
                    href={`/customers/${company.id}`}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline truncate"
                    data-testid={`link-office-company-${office.id}`}
                  >
                    <ChevronRight className="h-3 w-3 shrink-0" />
                    {company.name}
                  </Link>
                )}
                {office.phone && (
                  <span className="text-[11px] text-muted-foreground">{office.phone}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}
    {filtered.length > 0 && (
      <div>
        <div className="px-6 pt-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5" />
            Contact Buildings
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 px-6 pb-6">
      {filtered.map(building => {
        const contact = contacts.find(c => c.id === building.contactId);
        const company = clientsList.find(cl => cl.id === contact?.clientId);
        const linkedLeads = leads.filter(l => l.buildingId === building.id);
        const linkedEstimates = estimates.filter(e => e.buildingId === building.id);
        const leadCount = linkedLeads.length;
        const estimateCount = linkedEstimates.length;
        const totalValue = linkedLeads.reduce((sum, l) => sum + Number(l.value), 0)
          + linkedEstimates.reduce((sum, e) => sum + Number(e.total), 0);

        return (
          <div
            key={building.id}
            className="bg-card border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
            data-testid={`card-building-${building.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm leading-tight truncate">{building.name}</h3>
                {building.address && (
                  <div className="flex items-start gap-1 mt-1">
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    <AddressLink address={building.address} className="text-[11px] text-muted-foreground leading-tight" />
                  </div>
                )}
              </div>
              {(leadCount > 0 || estimateCount > 0) && (
                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                  ${totalValue.toLocaleString()}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {company && (
                <Link
                  href={`/customers/${company.id}`}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline truncate"
                  data-testid={`link-building-company-${building.id}`}
                >
                  <Building2 className="h-3 w-3 shrink-0" />
                  {company.name}
                </Link>
              )}
              {contact && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3 shrink-0" />
                  {contact.name}{contact.title ? ` · ${contact.title}` : ""}
                </div>
              )}
            </div>
            {building.notes && (
              <p className="text-[11px] text-muted-foreground italic border-t pt-2 leading-snug">{building.notes}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {leadCount > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full" data-testid={`badge-building-leads-${building.id}`}>
                  <Target className="h-2.5 w-2.5" />
                  {leadCount} lead{leadCount !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground/60">No leads</span>
              )}
              {estimateCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full" data-testid={`badge-building-estimates-${building.id}`}>
                  <FileText className="h-2.5 w-2.5" />
                  {estimateCount} estimate{estimateCount !== 1 ? "s" : ""}
                </span>
              )}
              {company && (
                <Link
                  href={`/customers/${company.id}`}
                  className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                  data-testid={`link-building-view-${building.id}`}
                >
                  View <ChevronRight className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>
          </div>
        );
      })}
        </div>
      </div>
    )}
    </div>
  );
}

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [buildingSearch, setBuildingSearch] = useState("");
  const [buildingViewMode, setBuildingViewMode] = useState<"list" | "map">("list");
  const [contactSearch, setContactSearch] = useState("");
  const [contactCompanyFilter, setContactCompanyFilter] = useState("all");
  const [contactStatusFilter, setContactStatusFilter] = useState("all");
  const [contactSortField, setContactSortField] = useState<"name" | "company" | "title" | "status" | "spend">("name");
  const [contactSortDir, setContactSortDir] = useState<"asc" | "desc">("asc");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [contactTierFilter, setContactTierFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null);
  const [logSpendContactId, setLogSpendContactId] = useState<number | null>(null);
  const [spendForm, setSpendForm] = useState({ amount: "", category: "meals_entertainment", date: new Date().toISOString().split("T")[0], description: "" });
  const [isLoggingSpend, setIsLoggingSpend] = useState(false);
  const companiesFileRef = useRef<HTMLInputElement>(null);
  const contactsFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: allContacts = [], isLoading: isLoadingContacts } = useQuery<ClientContact[]>({
    queryKey: ["/api/client-contacts"],
  });

  const { data: clientSpendTotals = [] } = useQuery<{ clientId: number; total: string }[]>({
    queryKey: ["/api/spend/client-totals"],
  });

  const { data: contactSpendTotals = [] } = useQuery<{ contactId: number; total: string }[]>({
    queryKey: ["/api/spend/contact-totals"],
  });

  const { data: allBuildings = [], isLoading: isLoadingBuildings } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/all-buildings"],
  });

  const { data: allOffices = [] } = useQuery<ClientOffice[]>({
    queryKey: ["/api/all-offices"],
  });

  const { data: allLeads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: allEstimates = [] } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates"],
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
      tier: null as string | null,
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
    const matchesTier = tierFilter === "all" || client.tier === tierFilter;
    return matchesSearch && matchesIndustry && matchesTier;
  });

  const getCompanyName = (clientId: number) =>
    clients?.find(c => c.id === clientId)?.name ?? "Unknown Company";

  const spendByClientId = Object.fromEntries(clientSpendTotals.map(t => [t.clientId, parseFloat(t.total)]));
  const spendByContactId = Object.fromEntries(contactSpendTotals.map(t => [t.contactId, parseFloat(t.total)]));

  const formatMoney = (v: number | null | undefined) =>
    v != null && v > 0 ? `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—";

  const getRoiBadge = (revenue: string | null | undefined, spend: number) => {
    if (!revenue || spend <= 0) return null;
    const rev = parseFloat(revenue);
    if (rev <= 0) return null;
    const ratio = rev / spend;
    const label = `${ratio.toFixed(1)}× ROI`;
    if (ratio >= 3) return { label, color: "text-green-700 bg-green-50 border-green-200" };
    if (ratio >= 1) return { label, color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { label, color: "text-red-700 bg-red-50 border-red-200" };
  };

  const statusOrder: Record<string, number> = { active: 0, likely_left: 1, unverified: 2 };
  const filteredContacts = allContacts
    .filter(contact => {
      const term = contactSearch.toLowerCase();
      const matchesSearch =
        contact.name.toLowerCase().includes(term) ||
        (contact.email ?? "").toLowerCase().includes(term) ||
        (contact.title ?? "").toLowerCase().includes(term) ||
        getCompanyName(contact.clientId).toLowerCase().includes(term);
      const matchesCompany =
        contactCompanyFilter === "all" || contact.clientId === Number(contactCompanyFilter);
      const matchesStatus =
        contactStatusFilter === "all" ||
        (contactStatusFilter === "none" ? !contact.employmentStatus : contact.employmentStatus === contactStatusFilter);
      const matchesTier = contactTierFilter === "all" || contact.tier === contactTierFilter;
      return matchesSearch && matchesCompany && matchesStatus && matchesTier;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (contactSortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (contactSortField === "company") {
        cmp = getCompanyName(a.clientId).localeCompare(getCompanyName(b.clientId));
      } else if (contactSortField === "title") {
        cmp = (a.title ?? "").localeCompare(b.title ?? "");
      } else if (contactSortField === "status") {
        const aOrder = a.employmentStatus ? (statusOrder[a.employmentStatus] ?? 9) : 9;
        const bOrder = b.employmentStatus ? (statusOrder[b.employmentStatus] ?? 9) : 9;
        cmp = aOrder - bOrder;
      } else if (contactSortField === "spend") {
        cmp = (spendByContactId[a.id] ?? 0) - (spendByContactId[b.id] ?? 0);
      }
      return contactSortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div className="p-4 md:p-6 space-y-6">
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
                        <AddressAutocomplete
                          value={field.value || ""}
                          onChange={(addr) => field.onChange(addr)}
                          placeholder="Search address..."
                          data-testid="input-customer-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="annualRevenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Revenue from This Client ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1000"
                          placeholder="e.g. 120000"
                          {...field}
                          value={field.value ?? ""}
                          data-testid="input-customer-annual-revenue"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Tier</FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer-tier">
                            <SelectValue placeholder="No Tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Tier</SelectItem>
                          <SelectItem value="tier_1">Tier 1 — High Value</SelectItem>
                          <SelectItem value="tier_2">Tier 2 — Medium Value</SelectItem>
                          <SelectItem value="tier_3">Tier 3 — Lower Value</SelectItem>
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
          <TabsTrigger value="buildings" className="flex items-center gap-2" data-testid="tab-buildings">
            <Landmark className="h-4 w-4" />
            Buildings
            {(allBuildings.length + allOffices.length) > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{allBuildings.length + allOffices.length}</Badge>
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
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="w-[140px] h-10" data-testid="select-tier-filter">
                    <SelectValue placeholder="All Tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="tier_1">Tier 1</SelectItem>
                    <SelectItem value="tier_2">Tier 2</SelectItem>
                    <SelectItem value="tier_3">Tier 3</SelectItem>
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
                <div className="rounded-md border border-border/50 overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold">Company Name</TableHead>
                        <TableHead className="font-bold">Tier</TableHead>
                        <TableHead className="font-bold">Industry</TableHead>
                        <TableHead className="font-bold">Contact Info</TableHead>
                        <TableHead className="font-bold">Address</TableHead>
                        <TableHead className="font-bold">Revenue</TableHead>
                        <TableHead className="font-bold">BD Spend</TableHead>
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
                            <TierBadge tier={client.tier} data-testid={`badge-tier-${client.id}`} />
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
                              {client.address
                                ? <AddressLink address={client.address} className="text-muted-foreground text-sm" />
                                : <span className="italic">No address</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium" data-testid={`text-revenue-${client.id}`}>
                              {client.annualRevenue && parseFloat(client.annualRevenue) > 0
                                ? `$${parseFloat(client.annualRevenue).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/yr`
                                : <span className="text-muted-foreground italic text-xs">Not set</span>}
                            </span>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const spend = spendByClientId[client.id] ?? 0;
                              const roi = getRoiBadge(client.annualRevenue, spend);
                              return (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium" data-testid={`text-spend-${client.id}`}>
                                    {formatMoney(spend)}
                                  </span>
                                  {roi && (
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${roi.color}`} data-testid={`badge-roi-${client.id}`}>
                                      {roi.label}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
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
            <CardHeader className="pb-3 space-y-3">
              {/* Search + filters row */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="pl-10 h-10"
                    data-testid="input-search-contacts"
                  />
                </div>
                {/* Company filter */}
                <Select value={contactCompanyFilter} onValueChange={setContactCompanyFilter}>
                  <SelectTrigger className="w-[180px] h-10" data-testid="select-contact-company-filter">
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {clients?.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Status filter */}
                <Select value={contactStatusFilter} onValueChange={setContactStatusFilter}>
                  <SelectTrigger className="w-[160px] h-10" data-testid="select-contact-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="likely_left">May have left</SelectItem>
                    <SelectItem value="unverified">Open to Work</SelectItem>
                    <SelectItem value="none">Not verified</SelectItem>
                  </SelectContent>
                </Select>
                {/* Tier filter */}
                <Select value={contactTierFilter} onValueChange={setContactTierFilter}>
                  <SelectTrigger className="w-[140px] h-10" data-testid="select-contact-tier-filter">
                    <SelectValue placeholder="All Tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="tier_1">Tier 1</SelectItem>
                    <SelectItem value="tier_2">Tier 2</SelectItem>
                    <SelectItem value="tier_3">Tier 3</SelectItem>
                  </SelectContent>
                </Select>
                {/* Clear filters button — only shown when any filter is active */}
                {(contactSearch || contactCompanyFilter !== "all" || contactStatusFilter !== "all" || contactTierFilter !== "all") && (
                  <button
                    onClick={() => { setContactSearch(""); setContactCompanyFilter("all"); setContactStatusFilter("all"); setContactTierFilter("all"); }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground h-10 px-3 rounded-md border border-border/50 hover:bg-muted/50 transition-colors"
                    data-testid="button-clear-contact-filters"
                  >
                    <X className="h-3 w-3" />Clear
                  </button>
                )}
                <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
                  {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingContacts ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredContacts.length > 0 ? (
                <div className="rounded-md border border-border/50 overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        {(["name", "company", "title"] as const).map(field => {
                          const labels = { name: "Name", company: "Company", title: "Title" };
                          const active = contactSortField === field;
                          return (
                            <TableHead
                              key={field}
                              className="font-bold cursor-pointer select-none hover:text-foreground"
                              onClick={() => {
                                if (active) setContactSortDir(d => d === "asc" ? "desc" : "asc");
                                else { setContactSortField(field); setContactSortDir("asc"); }
                              }}
                              data-testid={`th-sort-${field}`}
                            >
                              <span className="inline-flex items-center gap-1">
                                {labels[field]}
                                {active
                                  ? contactSortDir === "asc"
                                    ? <ChevronUp className="h-3.5 w-3.5" />
                                    : <ChevronDown className="h-3.5 w-3.5" />
                                  : <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />}
                              </span>
                            </TableHead>
                          );
                        })}
                        <TableHead className="font-bold">Contact Info</TableHead>
                        <TableHead className="font-bold">Tier</TableHead>
                        {(["status", "spend"] as const).map(field => {
                          const labels = { status: "Status", spend: "BD Spend" };
                          const active = contactSortField === field;
                          return (
                            <TableHead
                              key={field}
                              className="font-bold cursor-pointer select-none hover:text-foreground"
                              onClick={() => {
                                if (active) setContactSortDir(d => d === "asc" ? "desc" : "asc");
                                else { setContactSortField(field); setContactSortDir("asc"); }
                              }}
                              data-testid={`th-sort-${field}`}
                            >
                              <span className="inline-flex items-center gap-1">
                                {labels[field]}
                                {active
                                  ? contactSortDir === "asc"
                                    ? <ChevronUp className="h-3.5 w-3.5" />
                                    : <ChevronDown className="h-3.5 w-3.5" />
                                  : <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />}
                              </span>
                            </TableHead>
                          );
                        })}
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
                            <TierBadge tier={contact.tier} data-testid={`badge-contact-tier-${contact.id}`} />
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
                          <TableCell>
                            <span className="text-sm font-medium" data-testid={`text-contact-spend-${contact.id}`}>
                              {formatMoney(spendByContactId[contact.id])}
                            </span>
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

        {/* ── Buildings Tab ── */}
        <TabsContent value="buildings">
          <Card className="border-none shadow-sm bg-card">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {buildingViewMode === "list" && (
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by building name, address, company..."
                      value={buildingSearch}
                      onChange={(e) => setBuildingSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-building-search"
                    />
                  </div>
                )}
                <div className="flex items-center gap-1 ml-auto shrink-0 border rounded-lg p-0.5 bg-muted/40">
                  <button
                    onClick={() => setBuildingViewMode("list")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${buildingViewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    data-testid="button-view-list"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    List
                  </button>
                  <button
                    onClick={() => setBuildingViewMode("map")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${buildingViewMode === "map" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    data-testid="button-view-map"
                  >
                    <Map className="h-3.5 w-3.5" />
                    Map
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {buildingViewMode === "map" ? (
                <div className="rounded-b-lg overflow-hidden" style={{ height: "580px" }}>
                  <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading map...</div>}>
                    <MapView />
                  </Suspense>
                </div>
              ) : (
                <>
                  <div className="pt-4 pb-2 border-b">
                    <PortfolioManager
                      allBuildings={allBuildings}
                      allContacts={allContacts}
                      clients={clients ?? []}
                    />
                  </div>
                  {isLoadingBuildings ? (
                    <div className="p-6 space-y-3">
                      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                    </div>
                  ) : (
                    <BuildingsList
                      buildings={allBuildings}
                      offices={allOffices}
                      contacts={allContacts}
                      clients={clients ?? []}
                      leads={allLeads}
                      estimates={allEstimates}
                      search={buildingSearch}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contact Profile Dialog */}
      <Dialog open={!!selectedContact} onOpenChange={(open) => { if (!open) setSelectedContact(null); }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <DialogTitle className="sr-only">{selectedContact?.name ?? "Contact"} Profile</DialogTitle>
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
                  {/* BD Spend */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">BD Spend</span>
                        <span className="text-sm font-semibold text-primary" data-testid={`text-dialog-spend-${sc.id}`}>
                          {formatMoney(spendByContactId[sc.id])}
                        </span>
                      </div>
                      <button
                        onClick={() => setLogSpendContactId(logSpendContactId === sc.id ? null : sc.id)}
                        className="text-xs text-primary hover:underline font-medium"
                        data-testid={`button-log-spend-${sc.id}`}
                      >
                        {logSpendContactId === sc.id ? "Cancel" : "Log Spend"}
                      </button>
                    </div>
                    {logSpendContactId === sc.id && (
                      <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Amount ($)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={spendForm.amount}
                              onChange={e => setSpendForm(f => ({ ...f, amount: e.target.value }))}
                              className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              data-testid="input-spend-amount"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
                            <input
                              type="date"
                              value={spendForm.date}
                              onChange={e => setSpendForm(f => ({ ...f, date: e.target.value }))}
                              className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              data-testid="input-spend-date"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
                          <select
                            value={spendForm.category}
                            onChange={e => setSpendForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            data-testid="select-spend-category"
                          >
                            <option value="meals_entertainment">Meals & Entertainment</option>
                            <option value="gifts">Gifts</option>
                            <option value="travel">Travel</option>
                            <option value="events">Events</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
                          <input
                            type="text"
                            placeholder="e.g. Lunch at Nobu"
                            value={spendForm.description}
                            onChange={e => setSpendForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            data-testid="input-spend-description"
                          />
                        </div>
                        <button
                          disabled={!spendForm.amount || isLoggingSpend}
                          onClick={async () => {
                            if (!spendForm.amount) return;
                            setIsLoggingSpend(true);
                            try {
                              await apiRequest("POST", `/api/clients/${sc.clientId}/spend`, {
                                contactId: sc.id,
                                amount: spendForm.amount,
                                category: spendForm.category,
                                date: new Date(spendForm.date).toISOString(),
                                description: spendForm.description || null,
                              });
                              queryClient.invalidateQueries({ queryKey: ["/api/spend/client-totals"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/spend/contact-totals"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/clients", sc.clientId, "spend"] });
                              setSpendForm({ amount: "", category: "meals_entertainment", date: new Date().toISOString().split("T")[0], description: "" });
                              setLogSpendContactId(null);
                              toast({ title: "Spend logged", description: `$${parseFloat(spendForm.amount).toFixed(0)} recorded` });
                            } catch (err: any) {
                              toast({ title: "Error", description: err.message, variant: "destructive" });
                            } finally {
                              setIsLoggingSpend(false);
                            }
                          }}
                          className="w-full h-8 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                          data-testid="button-submit-spend"
                        >
                          {isLoggingSpend ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )}
                  </div>
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
