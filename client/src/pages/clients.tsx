import { useState, useRef, lazy, Suspense, useMemo, useEffect } from "react";
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
  HardHat,
  Wrench,
  Sparkles,
  Zap,
  ClipboardList,
  Smartphone,
  CreditCard,
  ScanLine,
  Settings,
  Tag,
  Pencil,
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
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/SearchableSelect";
import { formatPhoneNumber } from "@/lib/phone";
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
import { insertClientSchema, insertClientContactSchema, type Client, type ClientContact, type BdSpendEntry, type ContactBuilding, type ClientOffice, type Lead, type Estimate, type ContactStage, type User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioManager } from "@/components/PortfolioManager";
import { CardScannerDialog } from "@/components/CardScannerDialog";
import { ContactStagesManager, getStageBadgeClass } from "@/components/ContactStagesManager";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

const SERVICE_NEEDS = [
  { key: "building_engineering", label: "Building Engineer", Icon: HardHat, color: "text-orange-500" },
  { key: "facility_solutions", label: "Facility Solutions", Icon: Wrench, color: "text-blue-500" },
  { key: "janitorial", label: "Janitorial", Icon: Sparkles, color: "text-teal-500" },
  { key: "special_projects", label: "Special Projects", Icon: Zap, color: "text-purple-500" },
  { key: "property_assessment", label: "Property Assessment", Icon: ClipboardList, color: "text-primary" },
] as const;

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
  const [contactStageFilter, setContactStageFilter] = useState("all");
  const [contactOwnerFilter, setContactOwnerFilter] = useState("all");
  const [stageManagerOpen, setStageManagerOpen] = useState(false);
  const [openStagePickerId, setOpenStagePickerId] = useState<number | null>(null);
  const [openOwnerPickerId, setOpenOwnerPickerId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [vcfImportOpen, setVcfImportOpen] = useState(false);
  const [vcfImportContacts, setVcfImportContacts] = useState<Array<{ name: string | null; title: string | null; email: string | null; phone: string | null; company: string | null; linkedinUrl: string | null }>>([]);
  const [vcfAssignClientId, setVcfAssignClientId] = useState<string>("");
  const [vcfSaving, setVcfSaving] = useState(false);
  const [importPreview, setImportPreview] = useState<{ type: "companies" | "contacts", newItems: any[], matches: any[] } | null>(null);
  const [selectedNewItems, setSelectedNewItems] = useState<any[]>([]);
  const [selectedUpdates, setSelectedUpdates] = useState<Array<{ id: number, data: any }>>([]);
  const [isImportReviewOpen, setIsImportReviewOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null);
  const [logSpendContactId, setLogSpendContactId] = useState<number | null>(null);
  const [spendForm, setSpendForm] = useState({ amount: "", category: "meals_entertainment", date: new Date().toISOString().split("T")[0], description: "" });
  const [isLoggingSpend, setIsLoggingSpend] = useState(false);
  const companiesFileRef = useRef<HTMLInputElement>(null);
  const contactsFileRef = useRef<HTMLInputElement>(null);
  const vcfFileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [isBulkCompanyEditOpen, setIsBulkCompanyEditOpen] = useState(false);
  const [isBulkContactEditOpen, setIsBulkContactEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ label: string; description: string; onConfirm: () => void } | null>(null);

  const bulkDeleteClientsMutation = useMutation({
    mutationFn: (ids: number[]) => apiRequest("DELETE", "/api/clients/bulk", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setSelectedCompanies([]);
      toast({ title: "Companies deleted successfully" });
    },
    onError: (error: Error) => toast({ title: "Bulk delete failed", description: error.message, variant: "destructive" }),
  });

  const bulkDeleteContactsMutation = useMutation({
    mutationFn: (ids: number[]) => apiRequest("DELETE", "/api/contacts/bulk", { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      setSelectedContacts([]);
      toast({ title: "Contacts deleted successfully" });
    },
    onError: (error: Error) => toast({ title: "Bulk delete failed", description: error.message, variant: "destructive" }),
  });

  const bulkUpdateClientsMutation = useMutation({
    mutationFn: ({ ids, data }: { ids: number[], data: any }) => apiRequest("PATCH", "/api/clients/bulk", { ids, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setSelectedCompanies([]);
      setIsBulkCompanyEditOpen(false);
      toast({ title: "Companies updated successfully" });
    },
    onError: (error: Error) => toast({ title: "Bulk update failed", description: error.message, variant: "destructive" }),
  });

  const bulkUpdateContactsMutation = useMutation({
    mutationFn: ({ ids, data }: { ids: number[], data: any }) => apiRequest("PATCH", "/api/contacts/bulk", { ids, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      setSelectedContacts([]);
      setIsBulkContactEditOpen(false);
      toast({ title: "Contacts updated successfully" });
    },
    onError: (error: Error) => toast({ title: "Bulk update failed", description: error.message, variant: "destructive" }),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async ({ clientId, file }: { clientId: number, file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", "client");
      formData.append("entityId", clientId.toString());
      const res = await apiRequest("POST", "/api/attachments/upload", formData);
      const attachment = await res.json();
      await apiRequest("PATCH", `/api/clients/${clientId}`, { logoUrl: attachment.objectKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Logo uploaded successfully" });
    },
    onError: (error: Error) => toast({ title: "Logo upload failed", description: error.message, variant: "destructive" }),
  });

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

  const { data: contactStages = [] } = useQuery<ContactStage[]>({
    queryKey: ["/api/contact-stages"],
  });

  const { data: users = [] } = useQuery<Pick<User, "id" | "firstName" | "lastName" | "email">[]>({
    queryKey: ["/api/users"],
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

  const deleteContactMutation = useMutation({
    mutationFn: (c: { id: number; clientId: number }) => apiRequest("DELETE", `/api/clients/${c.clientId}/contacts/${c.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      toast({ title: "Contact deleted" });
    },
  });

  const exportCompanies = () => {
    if (!clients?.length) { toast({ title: "No companies to export" }); return; }
    const csv = buildCSV(
      ["name", "industry", "address", "phone", "email", "website", "notes", "tier", "annual_revenue", "service_needs"],
      clients.map(c => [
        c.name, c.industry, c.address, c.phone, c.email, c.website, c.notes,
        c.tier ?? "", c.annualRevenue ?? "", (c.serviceNeeds ?? []).join("; ")
      ])
    );
    downloadCSV("m5-companies.csv", csv);
  };

  const exportContacts = () => {
    if (!allContacts.length) { toast({ title: "No contacts to export" }); return; }
    const csv = buildCSV(
      ["company_name", "name", "title", "email", "phone", "is_primary", "linkedin_url", "tier", "service_needs", "employment_status"],
      allContacts.map(c => [
        clients?.find(cl => cl.id === c.clientId)?.name ?? "",
        c.name, c.title, c.email, c.phone,
        c.isPrimary ? "true" : "false",
        c.linkedinUrl ?? "",
        c.tier ?? "",
        (c.serviceNeeds ?? []).join("; "),
        c.employmentStatus ?? ""
      ])
    );
    downloadCSV("m5-contacts.csv", csv);
  };

  const downloadCompaniesTemplate = () => {
    const csv = buildCSV(
      ["name", "industry", "address", "phone", "email", "website", "notes", "tier", "annual_revenue", "service_needs"],
      [["Acme Corp", "Facility Management", "123 Main St", "555-1234", "info@acme.com", "acme.com", "Sample note", "tier_1", "1000000", "janitorial; facility_solutions"]]
    );
    downloadCSV("m5-companies-template.csv", csv);
  };

  const downloadContactsTemplate = () => {
    const csv = buildCSV(
      ["company_name", "name", "title", "email", "phone", "is_primary", "linkedin_url", "tier", "service_needs", "employment_status", "office_name"],
      [["Acme Corp", "Jane Smith", "Property Manager", "jane@acme.com", "555-5678", "true", "https://linkedin.com/in/janesmith", "tier_1", "janitorial", "active", "Main Office"]]
    );
    downloadCSV("m5-contacts-template.csv", csv);
  };

  const handleVcfImport = async (file: File) => {
    const text = await file.text();
    const vcards = text.split(/BEGIN:VCARD/i).slice(1);
    if (!vcards.length) {
      toast({ title: "No contacts found", description: "The file didn't contain any vCard entries", variant: "destructive" });
      return;
    }
    const parsed = vcards.map(block => {
      const get = (key: string) => {
        const m = block.match(new RegExp(`^${key}[^:]*:(.*)$`, "im"));
        return m ? m[1].trim() : null;
      };
      return {
        name: get("FN") || get("N")?.replace(/;/g, " ").trim() || null,
        title: get("TITLE"),
        email: get("EMAIL"),
        phone: get("TEL"),
        company: get("ORG"),
        linkedinUrl: get("URL"),
      };
    }).filter(c => c.name);

    if (!parsed.length) {
      toast({ title: "No contacts found", description: "Could not extract any contacts from the file", variant: "destructive" });
      return;
    }
    setVcfImportContacts(parsed);
    setVcfImportOpen(true);
  };

  const handleImportFile = async (file: File, type: "companies" | "contacts") => {
    try {
      setIsImporting(true);
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) {
        toast({ title: "Import failed", description: "The CSV file is empty or invalid.", variant: "destructive" });
        return;
      }

      const endpoint = type === "companies" ? "/api/clients/import-preview" : "/api/client-contacts/import-preview";
      const res = await apiRequest("POST", endpoint, { rows });
      const result = await res.json();

      setImportPreview({ type, ...result });
      setSelectedNewItems(result.newItems);
      setSelectedUpdates([]);
      setIsImportReviewOpen(true);
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    try {
      setIsImporting(true);
      const endpoint = importPreview.type === "companies" ? "/api/clients/import" : "/api/client-contacts/import";
      const res = await apiRequest("POST", endpoint, { 
        rows: selectedNewItems, 
        updates: selectedUpdates 
      });
      const result = await res.json();
      setImportResult({ ...result, type: importPreview.type });
      setIsImportReviewOpen(false);
      queryClient.invalidateQueries({ queryKey: [importPreview.type === "companies" ? "/api/clients" : "/api/client-contacts"] });
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
      notes: "",
      tier: null as string | null,
      website: "",
      logoUrl: "",
      annualRevenue: null as string | null,
    },
  });

  const onSubmit = (data: any) => {
    createClientMutation.mutate(data);
  };

  const contactForm = useForm({
    resolver: zodResolver(insertClientContactSchema),
    defaultValues: {
      name: "",
      title: "",
      email: "",
      phone: "",
      clientId: undefined as number | undefined,
      isPrimary: false,
      serviceNeeds: [] as string[],
      stageId: null as number | null,
      ownerId: null as string | null,
      profilePictureUrl: "",
    },
  });

  const createContactMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/client-contacts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      setIsAddContactOpen(false);
      contactForm.reset();
      toast({ title: "Contact added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add contact", variant: "destructive" });
    },
  });

  const updateContactStageMutation = useMutation({
    mutationFn: ({ id, stageId }: { id: number; stageId: number | null }) =>
      apiRequest("PATCH", `/api/contacts/${id}`, { stageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      setOpenStagePickerId(null);
    },
    onError: () => toast({ title: "Failed to update stage", variant: "destructive" }),
  });

  const updateContactOwnerMutation = useMutation({
    mutationFn: ({ id, ownerId }: { id: number; ownerId: string | null }) =>
      apiRequest("PATCH", `/api/contacts/${id}`, { ownerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      setOpenOwnerPickerId(null);
    },
    onError: () => toast({ title: "Failed to update owner", variant: "destructive" }),
  });

  const getUserDisplayName = (userId: string | null | undefined) => {
    if (!userId) return null;
    const u = users.find(u => u.id === userId);
    return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : null;
  };

  const getUserInitials = (userId: string | null | undefined) => {
    if (!userId) return null;
    const u = users.find(u => u.id === userId);
    if (!u) return null;
    const first = u.firstName?.[0] ?? "";
    const last = u.lastName?.[0] ?? "";
    return (first + last).toUpperCase() || (u.email?.[0]?.toUpperCase() ?? "?");
  };

  const onAddContact = (data: any) => {
    const payload = {
      ...data,
      linkedinUrl: data.linkedinUrl || null,
      profilePictureUrl: data.profilePictureUrl || null,
      tier: data.tier === "none" ? null : (data.tier || null),
      reportsTo: data.reportsTo || null,
      serviceNeeds: data.serviceNeeds || [],
    };
    createContactMutation.mutate(payload);
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
      const matchesStage = contactStageFilter === "all" ||
        (contactStageFilter === "none" ? !contact.stageId : contact.stageId === Number(contactStageFilter));
      const matchesOwner = contactOwnerFilter === "all" ||
        (contactOwnerFilter === "none" ? !(contact as any).ownerId : (contact as any).ownerId === contactOwnerFilter);
      return matchesSearch && matchesCompany && matchesStatus && matchesTier && matchesStage && matchesOwner;
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
      <input
        ref={vcfFileRef}
        type="file"
        accept=".vcf,.vcard"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleVcfImport(file);
          e.target.value = "";
        }}
        data-testid="input-import-vcf-file"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading font-bold">Customers</h1>
          <p className="text-muted-foreground text-lg">Manage your customer database and relationships</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Import / Export — compact icon button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 text-muted-foreground" disabled={isImporting} data-testid="button-import-export">
                {isImporting ? (
                  <Upload className="h-4 w-4 animate-pulse" />
                ) : (
                  <><ArrowUpDown className="h-4 w-4" /><ChevronDown className="ml-1 h-3 w-3 opacity-60" /></>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                <Building2 className="h-3.5 w-3.5" /> Companies
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={exportCompanies} data-testid="button-export-companies">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => companiesFileRef.current?.click()} data-testid="button-import-companies">
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadCompaniesTemplate} data-testid="button-template-companies">
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2 text-xs">
                <Users className="h-3.5 w-3.5" /> Contacts
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={exportContacts} data-testid="button-export-contacts">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => contactsFileRef.current?.click()} data-testid="button-import-contacts">
                <Upload className="mr-2 h-4 w-4" /> Import CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadContactsTemplate} data-testid="button-template-contacts">
                <FileText className="mr-2 h-4 w-4 text-muted-foreground" /> Template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => vcfFileRef.current?.click()} data-testid="button-import-vcf">
                <Smartphone className="mr-2 h-4 w-4" /> Import vCard (.vcf)
              </DropdownMenuItem>
              {"contacts" in navigator && (
                <DropdownMenuItem onClick={async () => {
                  try {
                    const results = await (navigator as any).contacts.select(["name", "email", "tel", "organization"], { multiple: true });
                    if (!results?.length) return;
                    const parsed = results.map((r: any) => ({
                      name: r.name?.[0] || null,
                      title: null,
                      email: r.email?.[0] || null,
                      phone: r.tel?.[0] || null,
                      company: r.organization?.[0] || null,
                      linkedinUrl: null,
                    })).filter((c: any) => c.name);
                    if (parsed.length) { setVcfImportContacts(parsed); setVcfImportOpen(true); }
                  } catch (e: any) {
                    toast({ title: "Could not open contacts", description: e.message, variant: "destructive" });
                  }
                }} data-testid="button-pick-from-phone">
                  <CreditCard className="mr-2 h-4 w-4" /> Pick from Phone
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Single Add dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 px-4 font-medium" data-testid="button-add-dropdown">
                <Plus className="mr-1.5 h-4 w-4" />Add<ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-company">
                <Building2 className="mr-2 h-4 w-4" /> Add Company
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  contactForm.reset({ name: "", title: "", email: "", phone: "", clientId: contactCompanyFilter !== "all" ? parseInt(contactCompanyFilter) : undefined, isPrimary: false, serviceNeeds: [] });
                  setIsAddContactOpen(true);
                }}
                data-testid="button-add-contact-dropdown"
              >
                <Users className="mr-2 h-4 w-4" /> Add Contact
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsScannerOpen(true)} data-testid="button-scan-card-dropdown">
                <ScanLine className="mr-2 h-4 w-4" /> Scan Card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card Scanner Dialog */}
      <CardScannerDialog open={isScannerOpen} onClose={() => setIsScannerOpen(false)} clients={clients ?? []} />

      {/* Add Company dialog (controlled) */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription>
                Create a new customer company.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
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
                        <Input placeholder="e.g. Property Management" {...field} value={field.value || ""} data-testid="input-customer-industry" />
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
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. acme.com" {...field} value={field.value || ""} data-testid="input-customer-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL</FormLabel>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input placeholder="https://example.com/logo.png" {...field} value={field.value || ""} data-testid="input-customer-logo" />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const website = form.getValues("website");
                              if (website) {
                                const domain = website.replace(/^https?:\/\//, "").split("/")[0];
                                field.onChange(`https://logo.clearbit.com/${domain}`);
                              } else {
                                toast({ title: "Please enter a website first" });
                              }
                            }}
                            data-testid="button-fetch-logo"
                          >
                            <Sparkles className="h-4 w-4 mr-1" />
                            Fetch
                          </Button>
                          <div className="relative">
                            <input
                              type="file"
                              className="hidden"
                              id="logo-upload"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const formData = new FormData();
                                  formData.append("file", file);
                                  formData.append("entityType", "client");
                                  formData.append("entityId", "0"); // Temporary ID for new client
                                  try {
                                    const res = await apiRequest("POST", "/api/attachments/upload", formData);
                                    const attachment = await res.json();
                                    field.onChange(attachment.objectKey);
                                  } catch (err) {
                                    toast({ title: "Upload failed", variant: "destructive" });
                                  }
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById("logo-upload")?.click()}
                              data-testid="button-upload-logo"
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Upload
                            </Button>
                          </div>
                        </div>
                        {field.value && (
                          <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center overflow-hidden">
                            <img
                              src={field.value.startsWith("objects/") ? `/api/attachments/stream/${field.value.split("/").pop()}` : field.value}
                              alt="Logo preview"
                              className="h-full w-full object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          </div>
                        )}
                      </div>
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
                <div className="relative">
                  <div className="rounded-md border border-border/50 overflow-x-auto">
                    <Table className="min-w-[700px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={filteredClients.length > 0 && selectedCompanies.length === filteredClients.length}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedCompanies(filteredClients.map(c => c.id));
                              else setSelectedCompanies([]);
                            }}
                            data-testid="checkbox-select-all-companies"
                          />
                        </TableHead>
                        <TableHead className="font-bold">Company Name</TableHead>
                        <TableHead className="font-bold">Tier</TableHead>
                        <TableHead className="font-bold">Industry</TableHead>
                        <TableHead className="font-bold">Revenue</TableHead>
                        <TableHead className="font-bold">BD Spend</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => (
                        <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <Checkbox
                              checked={selectedCompanies.includes(client.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedCompanies(prev => [...prev, client.id]);
                                else setSelectedCompanies(prev => prev.filter(id => id !== client.id));
                              }}
                              data-testid={`checkbox-select-company-${client.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link 
                              href={`/customers/${client.id}`}
                              className="flex items-center gap-3 text-primary hover:underline group"
                              data-testid={`link-customer-detail-${client.id}`}
                            >
                              <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0 overflow-hidden">
                                {client.logoUrl ? (
                                  <img 
                                    src={client.logoUrl.startsWith("https://storage.googleapis.com/") ? `/api/clients/${client.id}/logo-img` : client.logoUrl} 
                                    alt={client.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  <Building2 className="h-5 w-5" />
                                )}
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
                                    setDeleteConfirm({
                                      label: "Delete company",
                                      description: `Delete "${client.name}"? This will permanently remove the company and cannot be undone.`,
                                      onConfirm: () => deleteClientMutation.mutate(client.id),
                                    });
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

                {selectedCompanies.length > 0 && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border shadow-xl rounded-full px-6 py-3 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2 border-r pr-6">
                      <span className="text-sm font-semibold">{selectedCompanies.length} selected</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => setSelectedCompanies([])}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Popover open={isBulkCompanyEditOpen} onOpenChange={setIsBulkCompanyEditOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9">
                            <Settings className="h-4 w-4 mr-2" />
                            Bulk Edit
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="center">
                          <div className="space-y-4">
                            <h4 className="font-medium">Bulk Edit Companies</h4>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">Industry</label>
                              <Select onValueChange={(val) => {
                                bulkUpdateClientsMutation.mutate({ ids: selectedCompanies, data: { industry: val } });
                              }}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select industry..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {industries.map(ind => (
                                    <SelectItem key={ind} value={ind!}>{ind}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">Tier</label>
                              <Select onValueChange={(val) => {
                                bulkUpdateClientsMutation.mutate({ ids: selectedCompanies, data: { tier: val === "none" ? null : val } });
                              }}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select tier..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Tier</SelectItem>
                                  <SelectItem value="tier_1">Tier 1</SelectItem>
                                  <SelectItem value="tier_2">Tier 2</SelectItem>
                                  <SelectItem value="tier_3">Tier 3</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-9"
                        onClick={() => {
                          setDeleteConfirm({
                            label: `Delete ${selectedCompanies.length} ${selectedCompanies.length === 1 ? "company" : "companies"}`,
                            description: `This will permanently delete ${selectedCompanies.length} ${selectedCompanies.length === 1 ? "company" : "companies"} and cannot be undone.`,
                            onConfirm: () => bulkDeleteClientsMutation.mutate(selectedCompanies),
                          });
                        }}
                        disabled={bulkDeleteClientsMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
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

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 gap-2" data-testid="button-contact-filters">
                      <Tag className="h-4 w-4" />
                      Filters
                      {(() => {
                        let count = 0;
                        if (contactCompanyFilter !== "all") count++;
                        if (contactStatusFilter !== "all") count++;
                        if (contactTierFilter !== "all") count++;
                        if (contactStageFilter !== "all") count++;
                        if (contactOwnerFilter !== "all") count++;
                        return count > 0 ? (
                          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{count}</Badge>
                        ) : null;
                      })()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-4" align="start">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Company</label>
                        <Select value={contactCompanyFilter} onValueChange={setContactCompanyFilter}>
                          <SelectTrigger className="w-full h-9" data-testid="select-contact-company-filter">
                            <SelectValue placeholder="All Companies" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Companies</SelectItem>
                            {clients?.map(c => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Verification Status</label>
                        <Select value={contactStatusFilter} onValueChange={setContactStatusFilter}>
                          <SelectTrigger className="w-full h-9" data-testid="select-contact-status-filter">
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
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Tier</label>
                        <Select value={contactTierFilter} onValueChange={setContactTierFilter}>
                          <SelectTrigger className="w-full h-9" data-testid="select-contact-tier-filter">
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

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Stage</label>
                        <Select value={contactStageFilter} onValueChange={setContactStageFilter}>
                          <SelectTrigger className="w-full h-9" data-testid="select-contact-stage-filter">
                            <SelectValue placeholder="All Stages" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Stages</SelectItem>
                            <SelectItem value="none">No Stage</SelectItem>
                            {contactStages.map(s => (
                              <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Relationship Owner</label>
                        <Select value={contactOwnerFilter} onValueChange={setContactOwnerFilter}>
                          <SelectTrigger className="w-full h-9" data-testid="select-contact-owner-filter">
                            <SelectValue placeholder="All Owners" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Owners</SelectItem>
                            <SelectItem value="none">No Owner</SelectItem>
                            {users.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground"
                  onClick={() => setStageManagerOpen(true)}
                  data-testid="button-manage-contact-stages"
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {(contactSearch || contactCompanyFilter !== "all" || contactStatusFilter !== "all" || contactTierFilter !== "all" || contactStageFilter !== "all" || contactOwnerFilter !== "all") && (
                  <button
                    onClick={() => { setContactSearch(""); setContactCompanyFilter("all"); setContactStatusFilter("all"); setContactTierFilter("all"); setContactStageFilter("all"); setContactOwnerFilter("all"); }}
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
                <div className="relative">
                  <div className="rounded-md border border-border/50 overflow-x-auto">
                    <Table className="min-w-[700px]">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={filteredContacts.length > 0 && selectedContacts.length === filteredContacts.length}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedContacts(filteredContacts.map(c => c.id));
                              else setSelectedContacts([]);
                            }}
                            data-testid="checkbox-select-all-contacts"
                          />
                        </TableHead>
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
                        <TableHead className="font-bold">Stage</TableHead>
                        <TableHead className="font-bold">Owner</TableHead>
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
                        <TableHead className="font-bold w-8"></TableHead>
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
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedContacts(prev => [...prev, contact.id]);
                                else setSelectedContacts(prev => prev.filter(id => id !== contact.id));
                              }}
                              data-testid={`checkbox-select-contact-${contact.id}`}
                            />
                          </TableCell>
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
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Popover
                              open={openStagePickerId === contact.id}
                              onOpenChange={(v) => setOpenStagePickerId(v ? contact.id : null)}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border transition-opacity hover:opacity-80 ${
                                    contact.stageId
                                      ? getStageBadgeClass(contactStages.find(s => s.id === contact.stageId)?.color)
                                      : "bg-muted/60 text-muted-foreground border-border/50"
                                  }`}
                                  data-testid={`button-stage-${contact.id}`}
                                >
                                  {contact.stageId
                                    ? (contactStages.find(s => s.id === contact.stageId)?.label ?? "Unknown")
                                    : <span className="flex items-center gap-1"><Tag className="h-3 w-3" />Stage</span>}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-1" align="start">
                                <button
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/60 text-muted-foreground"
                                  onClick={() => updateContactStageMutation.mutate({ id: contact.id, stageId: null })}
                                >
                                  <Tag className="h-3.5 w-3.5" />No Stage
                                </button>
                                {contactStages.map(stage => (
                                  <button
                                    key={stage.id}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/60"
                                    onClick={() => updateContactStageMutation.mutate({ id: contact.id, stageId: stage.id })}
                                    data-testid={`option-stage-${stage.id}-contact-${contact.id}`}
                                  >
                                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${getStageBadgeClass(stage.color)}`}>
                                      {stage.label}
                                    </span>
                                    {contact.stageId === stage.id && <span className="ml-auto text-primary text-xs">✓</span>}
                                  </button>
                                ))}
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Popover
                              open={openOwnerPickerId === contact.id}
                              onOpenChange={(v) => setOpenOwnerPickerId(v ? contact.id : null)}
                            >
                              <PopoverTrigger asChild>
                                <button
                                  className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
                                  data-testid={`button-owner-${contact.id}`}
                                >
                                  {(contact as any).ownerId ? (
                                    <>
                                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                        {getUserInitials((contact as any).ownerId)}
                                      </span>
                                      <span className="text-foreground font-medium">{getUserDisplayName((contact as any).ownerId)}</span>
                                    </>
                                  ) : (
                                    <span className="text-muted-foreground/60 italic text-[11px]">Unassigned</span>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-1" align="start">
                                <button
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/60 text-muted-foreground"
                                  onClick={() => updateContactOwnerMutation.mutate({ id: contact.id, ownerId: null })}
                                >
                                  <span className="h-5 w-5 rounded-full border-2 border-dashed border-muted-foreground/40" />
                                  Unassigned
                                </button>
                                {users.map(u => (
                                  <button
                                    key={u.id}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/60"
                                    onClick={() => updateContactOwnerMutation.mutate({ id: contact.id, ownerId: u.id })}
                                    data-testid={`option-owner-${u.id}-contact-${contact.id}`}
                                  >
                                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                      {getUserInitials(u.id)}
                                    </span>
                                    <span className="truncate">{`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email}</span>
                                    {(contact as any).ownerId === u.id && <span className="ml-auto text-primary text-xs">✓</span>}
                                  </button>
                                ))}
                              </PopoverContent>
                            </Popover>
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
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-contact-actions-${contact.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => window.location.href = '/clients/' + contact.clientId}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open('/api/contacts/' + contact.id + '/vcard', '_blank')}>
                                  <Smartphone className="mr-2 h-4 w-4" />
                                  Export to Phone
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => {
                                    if (window.confirm("Delete this contact?")) {
                                      deleteContactMutation.mutate({ id: contact.id, clientId: contact.clientId });
                                    }
                                  }}
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

                {selectedContacts.length > 0 && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border shadow-xl rounded-full px-6 py-3 flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2 border-r pr-6">
                      <span className="text-sm font-semibold">{selectedContacts.length} selected</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full"
                        onClick={() => setSelectedContacts([])}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Popover open={isBulkContactEditOpen} onOpenChange={setIsBulkContactEditOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9">
                            <Settings className="h-4 w-4 mr-2" />
                            Bulk Edit
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="center">
                          <div className="space-y-4">
                            <h4 className="font-medium">Bulk Edit Contacts</h4>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">Company</label>
                              <Select onValueChange={(val) => {
                                bulkUpdateContactsMutation.mutate({ ids: selectedContacts, data: { clientId: parseInt(val) } });
                              }}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select company..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {clients?.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">Stage</label>
                              <Select onValueChange={(val) => {
                                bulkUpdateContactsMutation.mutate({ ids: selectedContacts, data: { stageId: val === "none" ? null : parseInt(val) } });
                              }}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select stage..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Stage</SelectItem>
                                  {contactStages.map(s => (
                                    <SelectItem key={s.id} value={String(s.id)}>{s.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-muted-foreground">Tier</label>
                              <Select onValueChange={(val) => {
                                bulkUpdateContactsMutation.mutate({ ids: selectedContacts, data: { tier: val === "none" ? null : val } });
                              }}>
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Select tier..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Tier</SelectItem>
                                  <SelectItem value="tier_1">Tier 1</SelectItem>
                                  <SelectItem value="tier_2">Tier 2</SelectItem>
                                  <SelectItem value="tier_3">Tier 3</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>

                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-9"
                        onClick={() => {
                          setDeleteConfirm({
                            label: `Delete ${selectedContacts.length} ${selectedContacts.length === 1 ? "contact" : "contacts"}`,
                            description: `This will permanently delete ${selectedContacts.length} ${selectedContacts.length === 1 ? "contact" : "contacts"} and cannot be undone.`,
                            onConfirm: () => bulkDeleteContactsMutation.mutate(selectedContacts),
                          });
                        }}
                        disabled={bulkDeleteContactsMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
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
                      : "No contacts yet. Click 'Add Contact' to create one."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Contact Dialog */}
          <Dialog open={isAddContactOpen} onOpenChange={setIsAddContactOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Add Contact</DialogTitle>
                <DialogDescription>Create a new contact and associate them with a company.</DialogDescription>
              </DialogHeader>
              <Form {...contactForm}>
                <form onSubmit={contactForm.handleSubmit(onAddContact)} className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
                  <FormField control={contactForm.control} name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl><Input placeholder="Enter contact name" {...field} data-testid="input-new-contact-name" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={contactForm.control} name={"clientId" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company <span className="text-destructive">*</span></FormLabel>
                        <SearchableSelect
                          options={(clients || []).map(c => ({ value: c.id.toString(), label: c.name }))}
                          value={field.value?.toString() || ""}
                          onChange={(val) => field.onChange(val ? parseInt(val) : undefined)}
                          placeholder="Select company..."
                          searchPlaceholder="Search companies..."
                          data-testid="select-new-contact-company"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={contactForm.control} name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl><Input placeholder="e.g. Operations Manager" {...field} value={field.value || ""} data-testid="input-new-contact-title" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={contactForm.control} name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input placeholder="email@example.com" {...field} value={field.value || ""} data-testid="input-new-contact-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={contactForm.control} name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="(555) 012-3456"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                              data-testid="input-new-contact-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField control={contactForm.control} name={"linkedinUrl" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <SiLinkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                          LinkedIn Profile URL
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://linkedin.com/in/username"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-new-contact-linkedin"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={contactForm.control} name="profilePictureUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Picture URL</FormLabel>
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Input
                              placeholder="https://example.com/photo.jpg"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-new-contact-photo"
                            />
                          </FormControl>
                          {field.value && (
                            <img
                              src={field.value}
                              alt="Preview"
                              className="h-10 w-10 rounded-full object-cover border"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div>
                    <FormLabel className="text-sm font-medium">Service Needs</FormLabel>
                    <p className="text-xs text-muted-foreground mb-2 mt-0.5">Which M5 services does this contact require?</p>
                    <div className="grid grid-cols-1 gap-2">
                      {SERVICE_NEEDS.map(s => {
                        const current: string[] = (contactForm.watch("serviceNeeds") as string[]) ?? [];
                        const checked = current.includes(s.key);
                        return (
                          <div
                            key={s.key}
                            role="checkbox"
                            aria-checked={checked}
                            tabIndex={0}
                            className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors select-none ${checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                            onClick={() => {
                              const next = checked ? current.filter(k => k !== s.key) : [...current, s.key];
                              contactForm.setValue("serviceNeeds", next);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === " " || e.key === "Enter") {
                                const next = checked ? current.filter(k => k !== s.key) : [...current, s.key];
                                contactForm.setValue("serviceNeeds", next);
                              }
                            }}
                            data-testid={`toggle-new-contact-service-${s.key}`}
                          >
                            <s.Icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                            <span className="text-sm">{s.label}</span>
                            {checked && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <FormField control={contactForm.control} name={"tier" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Tier</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-new-contact-tier">
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
                  <FormField control={contactForm.control} name={"stageId" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Stage</FormLabel>
                        <Select
                          value={field.value != null ? String(field.value) : "none"}
                          onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))}
                        >
                          <SelectTrigger data-testid="select-new-contact-stage">
                            <SelectValue placeholder="No stage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No stage</SelectItem>
                            {contactStages.map(s => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${getStageBadgeClass(s.color)}`}>
                                  {s.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField control={contactForm.control} name={"ownerId" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship Owner</FormLabel>
                        <Select
                          value={field.value ?? "none"}
                          onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                        >
                          <SelectTrigger data-testid="select-new-contact-owner">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {users.map(u => (
                              <SelectItem key={u.id} value={u.id}>
                                {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email}
                              </SelectItem>
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
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-new-contact-primary" />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Primary Contact</FormLabel>
                          <FormDescription>Mark this person as the main point of contact.</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-2">
                    <Button type="submit" className="w-full h-11" disabled={createContactMutation.isPending} data-testid="button-submit-new-contact">
                      {createContactMutation.isPending ? "Adding..." : "Add Contact"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <ContactStagesManager open={stageManagerOpen} onOpenChange={setStageManagerOpen} />
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

      {/* Import Review Dialog */}
      <Dialog open={isImportReviewOpen} onOpenChange={setIsImportReviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Review Import — {importPreview ? (importPreview.newItems.length + importPreview.matches.length) : 0} rows</DialogTitle>
            <DialogDescription>
              Review new records and potential updates for existing ones.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8">
            {importPreview && importPreview.newItems.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Plus className="h-4 w-4 text-green-600" />
                    New {importPreview.type} ({importPreview.newItems.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="select-all-new"
                      checked={selectedNewItems.length === importPreview.newItems.length}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedNewItems(importPreview.newItems);
                        else setSelectedNewItems([]);
                      }}
                      data-testid="checkbox-select-all-new"
                    />
                    <label htmlFor="select-all-new" className="text-xs font-medium cursor-pointer">Select all</label>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {importPreview.newItems.map((item, i) => {
                    const name = item.name || item.company_name || item.contact_name || "Unnamed";
                    const isSelected = selectedNewItems.includes(item);
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 rounded border bg-muted/20">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedNewItems([...selectedNewItems, item]);
                            else setSelectedNewItems(selectedNewItems.filter(x => x !== item));
                          }}
                          data-testid={`checkbox-new-item-${i}`}
                        />
                        <span className="text-xs truncate font-medium">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {importPreview && importPreview.matches.length > 0 && (
              <section className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Existing Matches ({importPreview.matches.length})
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    These records already exist. Select ones to update with new data.
                  </p>
                </div>
                <div className="space-y-4">
                  {importPreview.matches.map((match, i) => {
                    const isSelected = selectedUpdates.some(u => u.id === match.existing.id);
                    return (
                      <div key={i} className="border rounded-lg overflow-hidden">
                        <div className="bg-muted/30 p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              id={`match-${i}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedUpdates([...selectedUpdates, { id: match.existing.id, data: match.diff }]);
                                else setSelectedUpdates(selectedUpdates.filter(u => u.id !== match.existing.id));
                              }}
                              data-testid={`checkbox-update-match-${i}`}
                            />
                            <div>
                              <label htmlFor={`match-${i}`} className="text-sm font-bold cursor-pointer block leading-none">
                                {match.existing.name}
                              </label>
                              {match.companyName && (
                                <span className="text-[11px] text-muted-foreground">{match.companyName}</span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">Match Found</Badge>
                        </div>
                        {Object.keys(match.diff).length > 0 ? (
                          <Table>
                            <TableHeader className="bg-muted/10">
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="h-8 text-[10px] uppercase font-bold">Field</TableHead>
                                <TableHead className="h-8 text-[10px] uppercase font-bold">Current Value</TableHead>
                                <TableHead className="h-8 text-[10px] uppercase font-bold">Incoming Value</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(match.diff).map(([field, newVal]) => (
                                <TableRow key={field} className="hover:bg-transparent">
                                  <TableCell className="py-1.5 text-xs font-medium capitalize">{field.replace(/([A-Z])/g, ' $1')}</TableCell>
                                  <TableCell className="py-1.5 text-xs text-muted-foreground italic">
                                    {String((match.existing as any)[field] || "—")}
                                  </TableCell>
                                  <TableCell className="py-1.5 text-xs font-semibold text-primary">
                                    {String(newVal)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="p-3 text-xs text-muted-foreground italic text-center">
                            All incoming fields match existing data or are empty.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <DialogFooter className="p-6 border-t bg-muted/5">
            <Button variant="outline" onClick={() => setIsImportReviewOpen(false)} data-testid="button-cancel-import">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmImport} 
              disabled={isImporting || (selectedNewItems.length === 0 && selectedUpdates.length === 0)}
              data-testid="button-confirm-import"
            >
              {isImporting ? "Importing..." : `Create ${selectedNewItems.length} new + Update ${selectedUpdates.length} existing`}
            </Button>
          </DialogFooter>
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

      {/* vCard Import Dialog */}
      <Dialog open={vcfImportOpen} onOpenChange={(o) => { if (!o) { setVcfImportOpen(false); setVcfAssignClientId(""); } }}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Contacts from vCard</DialogTitle>
            <DialogDescription>
              {vcfImportContacts.length} contact{vcfImportContacts.length !== 1 ? "s" : ""} found. Assign them to a company to save.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 space-y-3 pr-1">
            <div className="space-y-1">
              <label className="text-sm font-medium">Assign all to company <span className="text-destructive">*</span></label>
              <SearchableSelect
                options={(clients ?? []).map(c => ({ value: String(c.id), label: c.name }))}
                value={vcfAssignClientId}
                onChange={setVcfAssignClientId}
                placeholder="Select company..."
                data-testid="select-vcf-company"
              />
            </div>
            <div className="space-y-2">
              {vcfImportContacts.map((c, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm space-y-0.5">
                  <p className="font-medium">{c.name}</p>
                  {c.title && <p className="text-muted-foreground">{c.title}</p>}
                  {c.company && <p className="text-muted-foreground text-xs">From: {c.company}</p>}
                  {c.email && <p className="text-muted-foreground text-xs">{c.email}</p>}
                  {c.phone && <p className="text-muted-foreground text-xs">{c.phone}</p>}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setVcfImportOpen(false); setVcfAssignClientId(""); }} data-testid="button-vcf-cancel">Cancel</Button>
            <Button
              disabled={!vcfAssignClientId || vcfSaving}
              onClick={async () => {
                if (!vcfAssignClientId) return;
                setVcfSaving(true);
                let created = 0;
                for (const c of vcfImportContacts) {
                  if (!c.name) continue;
                  try {
                    await apiRequest("POST", `/api/clients/${vcfAssignClientId}/contacts`, {
                      name: c.name,
                      title: c.title || null,
                      email: c.email || null,
                      phone: c.phone || null,
                      linkedinUrl: c.linkedinUrl || null,
                      isPrimary: false,
                      serviceNeeds: [],
                    });
                    created++;
                  } catch {}
                }
                await queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
                setVcfSaving(false);
                setVcfImportOpen(false);
                setVcfAssignClientId("");
                toast({ title: `${created} contact${created !== 1 ? "s" : ""} imported` });
              }}
              data-testid="button-vcf-save"
            >
              {vcfSaving ? "Saving..." : `Import ${vcfImportContacts.length} Contact${vcfImportContacts.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteConfirm?.label}</AlertDialogTitle>
            <AlertDialogDescription>{deleteConfirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { deleteConfirm?.onConfirm(); setDeleteConfirm(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
