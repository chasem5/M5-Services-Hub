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
  ChevronRight,
  Star,
  HardHat,
  Wrench,
  Sparkles,
  Zap,
  ClipboardList,
  X,
  Home,
  Map,
  Linkedin,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { SiLinkedin } from "react-icons/si";
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
import { AddressLink } from "@/components/AddressLink";
import { TierBadge } from "@/components/TierBadge";
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
  type ContactBuilding,
  type BdSpendEntry,
  type Lead, 
  type Estimate,
  type ActivityLog
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { OrgChart } from "@/components/OrgChart";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { BuildingsMap } from "@/components/BuildingsMap";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function LinkedInSyncButton({
  contactId,
  linkedinUrl,
  onSuccess,
}: {
  contactId: number;
  linkedinUrl: string;
  onSuccess: (updated: any) => void;
}) {
  const { toast } = useToast();
  const [confirmed, setConfirmed] = useState(false);

  const enrichMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/contacts/${contactId}/linkedin-enrich`, { linkedinUrl });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Sync failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      onSuccess(data);
      setConfirmed(false);
      toast({ title: "Profile synced from LinkedIn", description: "Contact info has been updated." });
    },
    onError: (err: Error) => {
      setConfirmed(false);
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  const disabled = !linkedinUrl.trim() || enrichMutation.isPending;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
          Uses your Apollo.io credits. Pulls full name, job title, and profile photo. Email is returned when available in Apollo's database.
        </p>
      </div>
      {!confirmed ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/30"
          disabled={disabled}
          onClick={() => setConfirmed(true)}
          data-testid={`button-linkedin-sync-${contactId}`}
        >
          <SiLinkedin className="h-3.5 w-3.5 mr-1.5 text-[#0A66C2]" />
          Sync from LinkedIn
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1 h-8 text-xs bg-[#0A66C2] hover:bg-[#004182] text-white"
            disabled={enrichMutation.isPending}
            onClick={() => enrichMutation.mutate()}
            data-testid={`button-linkedin-sync-confirm-${contactId}`}
          >
            {enrichMutation.isPending ? "Syncing..." : "Yes, sync from LinkedIn"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => setConfirmed(false)}
            data-testid={`button-linkedin-sync-cancel-${contactId}`}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

function BuildingActivityRow({
  building,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: {
  building: ContactBuilding;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: activity } = useQuery<{ leads: Lead[]; estimates: Estimate[] }>({
    queryKey: ["/api/buildings", building.id, "activity"],
    enabled: isExpanded,
  });

  const totalCount = (activity?.leads.length ?? 0) + (activity?.estimates.length ?? 0);

  return (
    <div className="rounded hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between pl-2 py-1 group/building">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{building.name}</p>
          {building.address && <AddressLink address={building.address} className="text-[11px] text-muted-foreground truncate" />}
          {building.notes && <p className="text-[11px] text-muted-foreground italic truncate">{building.notes}</p>}
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1 mt-0.5 text-[10px] text-primary/70 hover:text-primary font-medium transition-colors"
            data-testid={`button-toggle-building-activity-${building.id}`}
          >
            {isExpanded ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
            {isExpanded ? "Hide" : "Show"} linked activity
            {totalCount > 0 && <span className="text-muted-foreground">· {totalCount} item{totalCount !== 1 ? "s" : ""}</span>}
          </button>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover/building:opacity-100 transition-opacity shrink-0 ml-2">
          <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            onClick={onEdit} data-testid={`button-edit-building-${building.id}`}>
            <Edit className="h-3 w-3" />
          </button>
          <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-destructive"
            onClick={onDelete} data-testid={`button-delete-building-${building.id}`}>
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="pl-3 pb-2 space-y-1.5">
          {!activity ? (
            <p className="text-[10px] text-muted-foreground">Loading...</p>
          ) : activity.leads.length === 0 && activity.estimates.length === 0 ? (
            <p className="text-[10px] text-muted-foreground italic">No leads or estimates linked to this building yet.</p>
          ) : (
            <>
              {activity.leads.map(lead => (
                <div key={lead.id} className="flex items-center gap-2 text-[10px] bg-muted/40 rounded px-2 py-1" data-testid={`building-lead-${building.id}-${lead.id}`}>
                  <Target className="h-2.5 w-2.5 text-primary shrink-0" />
                  <span className="font-medium truncate flex-1">{lead.title}</span>
                  <span className="text-muted-foreground capitalize shrink-0">{lead.stage.replace("_", " ")}</span>
                  <span className="font-mono shrink-0">${Number(lead.value).toLocaleString()}</span>
                </div>
              ))}
              {activity.estimates.map(est => (
                <div key={est.id} className="flex items-center gap-2 text-[10px] bg-muted/40 rounded px-2 py-1" data-testid={`building-estimate-${building.id}-${est.id}`}>
                  <FileText className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate flex-1">{est.title}</span>
                  <span className="text-muted-foreground capitalize shrink-0">{est.status}</span>
                  <span className="font-mono shrink-0">${Number(est.total).toLocaleString()}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: ClientContact;
  onEdit: (c: ClientContact) => void;
  onDelete: (id: number) => void;
}) {
  const [isPortfolioOpen, setIsPortfolioOpen] = useState(false);
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<ContactBuilding | null>(null);
  const [expandedBuildingId, setExpandedBuildingId] = useState<number | null>(null);
  const [addName, setAddName] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addLat, setAddLat] = useState<number | null>(null);
  const [addLng, setAddLng] = useState<number | null>(null);
  const [addNotes, setAddNotes] = useState("");
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLat, setEditLat] = useState<number | null>(null);
  const [editLng, setEditLng] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const { toast } = useToast();

  const { data: buildings = [], isLoading: isLoadingBuildings } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/contacts", contact.id, "buildings"],
    enabled: isPortfolioOpen,
  });

  const addBuildingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/contacts/${contact.id}/buildings`, {
        name: addName.trim(),
        address: addAddress.trim() || null,
        lat: addLat ?? null,
        lng: addLng ?? null,
        notes: addNotes.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id, "buildings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setAddName(""); setAddAddress(""); setAddLat(null); setAddLng(null); setAddNotes("");
      setIsAddingBuilding(false);
    },
    onError: () => { toast({ title: "Failed to add building", variant: "destructive" }); },
  });

  const updateBuildingMutation = useMutation({
    mutationFn: async (b: ContactBuilding) => {
      const res = await apiRequest("PUT", `/api/contacts/${contact.id}/buildings/${b.id}`, {
        name: editName.trim(),
        address: editAddress.trim() || null,
        lat: editLat ?? null,
        lng: editLng ?? null,
        notes: editNotes.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id, "buildings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setEditingBuilding(null);
    },
    onError: () => { toast({ title: "Failed to update building", variant: "destructive" }); },
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: async (buildingId: number) => {
      await apiRequest("DELETE", `/api/contacts/${contact.id}/buildings/${buildingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contact.id, "buildings"] });
    },
  });

  const openEditBuilding = (b: ContactBuilding) => {
    setEditingBuilding(b);
    setEditName(b.name);
    setEditAddress(b.address ?? "");
    setEditLat(b.lat != null ? parseFloat(String(b.lat)) : null);
    setEditLng(b.lng != null ? parseFloat(String(b.lng)) : null);
    setEditNotes(b.notes ?? "");
  };

  const contactServiceNeeds: string[] = (contact.serviceNeeds as string[] | null) ?? [];

  return (
    <Card className="relative group border-border/50 hover:border-primary/40 transition-colors shadow-none">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex justify-between">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 text-sm overflow-hidden">
              {(contact as any).profilePictureUrl ? (
                <img
                  src={(contact as any).profilePictureUrl}
                  alt={contact.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    (e.currentTarget.parentElement as HTMLElement).innerHTML =
                      contact.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                  }}
                />
              ) : (
                contact.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold">{contact.name}</p>
                {contact.isPrimary && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 uppercase">Primary</Badge>
                )}
                {(contact as any).tier && <TierBadge tier={(contact as any).tier} size="xs" />}
                {(contact as any).linkedinUrl && (
                  <a
                    href={(contact as any).linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0A66C2] hover:opacity-80 transition-opacity"
                    onClick={e => e.stopPropagation()}
                    data-testid={`link-linkedin-${contact.id}`}
                  >
                    <SiLinkedin className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{contact.title || "No Title"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(contact)} data-testid={`button-edit-contact-${contact.id}`}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(contact.id)} data-testid={`button-delete-contact-${contact.id}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-1">
          {contact.email && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="mr-2 h-3.5 w-3.5 shrink-0" />{contact.email}
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="mr-2 h-3.5 w-3.5 shrink-0" />{contact.phone}
            </div>
          )}
        </div>

        {/* Service Needs badges */}
        {contactServiceNeeds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {SERVICE_NEEDS.filter(s => contactServiceNeeds.includes(s.key)).map(s => (
              <span key={s.key} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-background ${s.color}`}
                style={{ borderColor: "currentColor", opacity: 0.9 }}
                data-testid={`badge-contact-service-${contact.id}-${s.key}`}>
                <s.Icon className="h-3 w-3" />{s.label}
              </span>
            ))}
          </div>
        )}

        {/* Portfolio toggle */}
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full pt-0.5"
          onClick={() => setIsPortfolioOpen(v => !v)}
          data-testid={`button-toggle-portfolio-${contact.id}`}
        >
          {isPortfolioOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <Home className="h-3.5 w-3.5" />
          Portfolio{!isPortfolioOpen && buildings.length === 0 && !isPortfolioOpen ? "" : ` · ${buildings.length} building${buildings.length !== 1 ? "s" : ""}`}
        </button>

        {/* Portfolio panel */}
        {isPortfolioOpen && (
          <div className="space-y-2 pl-1 border-l-2 border-border/50 ml-1">
            {isLoadingBuildings ? (
              <p className="text-xs text-muted-foreground pl-2 py-1">Loading...</p>
            ) : buildings.length === 0 && !isAddingBuilding ? (
              <p className="text-xs text-muted-foreground pl-2 py-1 italic">No buildings added yet.</p>
            ) : (
              buildings.map(b => (
                <div key={b.id}>
                  {editingBuilding?.id === b.id ? (
                    <div className="space-y-2 pl-2 py-2 rounded-md bg-muted/30 border">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Building name"
                        className="h-7 text-xs" data-testid={`input-edit-building-name-${b.id}`} />
                      <AddressAutocomplete
                        value={editAddress}
                        onChange={(addr, lat, lng) => { setEditAddress(addr); if (lat !== undefined) setEditLat(lat); if (lng !== undefined) setEditLng(lng); }}
                        placeholder="Search address..."
                        className="h-7 text-xs"
                        data-testid={`input-edit-building-address-${b.id}`}
                      />
                      {editLat && <p className="text-[10px] text-green-600 pl-0.5">📍 Location confirmed</p>}
                      <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Notes (optional)"
                        className="h-7 text-xs" data-testid={`input-edit-building-notes-${b.id}`} />
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs px-3"
                          disabled={!editName.trim() || updateBuildingMutation.isPending}
                          onClick={() => updateBuildingMutation.mutate(b)}
                          data-testid={`button-save-building-${b.id}`}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
                          onClick={() => setEditingBuilding(null)} data-testid={`button-cancel-edit-building-${b.id}`}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <BuildingActivityRow
                      building={b}
                      isExpanded={expandedBuildingId === b.id}
                      onToggleExpand={() => setExpandedBuildingId(expandedBuildingId === b.id ? null : b.id)}
                      onEdit={() => openEditBuilding(b)}
                      onDelete={() => deleteBuildingMutation.mutate(b.id)}
                    />
                  )}
                </div>
              ))
            )}

            {/* Add Building inline form */}
            {isAddingBuilding ? (
              <div className="space-y-2 pl-2 py-2 rounded-md bg-muted/20 border border-dashed">
                <Input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Building name *"
                  className="h-7 text-xs" autoFocus data-testid={`input-add-building-name-${contact.id}`} />
                <AddressAutocomplete
                  value={addAddress}
                  onChange={(addr, lat, lng) => { setAddAddress(addr); if (lat !== undefined) setAddLat(lat); if (lng !== undefined) setAddLng(lng); }}
                  placeholder="Search address..."
                  className="h-7 text-xs"
                  data-testid={`input-add-building-address-${contact.id}`}
                />
                {addLat && <p className="text-[10px] text-green-600 pl-0.5">📍 Location confirmed</p>}
                <Input value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder="Notes (optional)"
                  className="h-7 text-xs" data-testid={`input-add-building-notes-${contact.id}`} />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs px-3"
                    disabled={!addName.trim() || addBuildingMutation.isPending}
                    onClick={() => addBuildingMutation.mutate()}
                    data-testid={`button-save-add-building-${contact.id}`}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs px-2"
                    onClick={() => { setIsAddingBuilding(false); setAddName(""); setAddAddress(""); setAddLat(null); setAddLng(null); setAddNotes(""); }}
                    data-testid={`button-cancel-add-building-${contact.id}`}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button type="button"
                className="flex items-center gap-1 pl-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                onClick={() => setIsAddingBuilding(true)}
                data-testid={`button-add-building-${contact.id}`}>
                <Plus className="h-3 w-3" /> Add building
              </button>
            )}
          </div>
        )}
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
  const [isAddSpendOpen, setIsAddSpendOpen] = useState(false);
  const [spendFormData, setSpendFormData] = useState({ amount: "", category: "meals_entertainment", date: new Date().toISOString().split("T")[0], description: "", contactId: "" });
  const [isSubmittingSpend, setIsSubmittingSpend] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [orgChartEditId, setOrgChartEditId] = useState<number | null>(null);
  const [isOfficeDialogOpen, setIsOfficeDialogOpen] = useState(false);
  const [isEditOfficeDialogOpen, setIsEditOfficeDialogOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState<ClientOffice | null>(null);
  const [officeLat, setOfficeLat] = useState<number | null>(null);
  const [officeLng, setOfficeLng] = useState<number | null>(null);
  const [editOfficeLat, setEditOfficeLat] = useState<number | null>(null);
  const [editOfficeLng, setEditOfficeLng] = useState<number | null>(null);
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

  const { data: allBuildings = [] } = useQuery<Array<{ id: number; name: string; address?: string | null; lat?: string | null; lng?: string | null; notes?: string | null; contactName: string; contactId: number | null; type: "building" | "office" }>>({
    queryKey: ["/api/clients", clientId, "all-buildings"],
  });

  const { data: allContacts = [] } = useQuery<ClientContact[]>({
    queryKey: ["/api/client-contacts"],
  });

  const { data: spendEntries = [], isLoading: isLoadingSpend } = useQuery<BdSpendEntry[]>({
    queryKey: ["/api/clients", clientId, "spend"],
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
    mutationFn: async (data: { name: string; address?: string; phone?: string; lat?: number | null; lng?: number | null }) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/offices`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "offices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "all-buildings"] });
      setIsOfficeDialogOpen(false);
      officeForm.reset({ name: "", address: "", phone: "" });
      setOfficeLat(null); setOfficeLng(null);
      toast({ title: "Office added", description: "The office/division has been created." });
    },
  });

  const updateOfficeMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; address?: string; phone?: string; lat?: number | null; lng?: number | null }) => {
      const { id, ...fields } = data;
      const res = await apiRequest("PUT", `/api/clients/${clientId}/offices/${id}`, fields);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "offices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "all-buildings"] });
      setIsEditOfficeDialogOpen(false);
      setEditingOffice(null);
      setEditOfficeLat(null); setEditOfficeLng(null);
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

  const verifyEmploymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/verify-employment`);
      if (!res.ok) throw new Error((await res.json()).message || "Verification failed");
      return res.json() as Promise<{ contactId: number; name: string; status: string; currentEmployer: string | null }[]>;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      const active = results.filter(r => r.status === "active").length;
      const left = results.filter(r => r.status === "likely_left").length;
      const unverified = results.filter(r => r.status === "unverified").length;
      toast({
        title: "Employment verified",
        description: `${active} active, ${left} may have left, ${unverified} open to work`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
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
    setEditOfficeLat(office.lat ? parseFloat(String(office.lat)) : null);
    setEditOfficeLng(office.lng ? parseFloat(String(office.lng)) : null);
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
      tier: (client as any).tier ?? null,
    } : {
      name: "",
      industry: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      notes: "",
      tier: null,
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
      tier: null as string | null,
      reportsTo: undefined as number | undefined,
      serviceNeeds: [] as string[],
    },
  });

  const editContactForm = useForm({
    defaultValues: {
      name: "",
      title: "",
      email: "",
      phone: "",
      isPrimary: false,
      tier: null as string | null,
      reportsTo: null as number | null,
      officeId: null as number | null,
      clientId: clientId,
      serviceNeeds: [] as string[],
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
      tier: (contact as any).tier ?? null,
      reportsTo: contact.reportsTo ?? null,
      officeId: contact.officeId ?? null,
      clientId: contact.clientId,
      serviceNeeds: (contact.serviceNeeds as string[] | null) ?? [],
      linkedinUrl: (contact as any).linkedinUrl || "",
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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-heading font-bold">{client.name}</h1>
            <Badge variant="outline" className="h-6">Customer ID: {client.id}</Badge>
            {(client as any).tier && <TierBadge tier={(client as any).tier} />}
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
          <TabsTrigger value="portfolio-map" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-2 font-medium" data-testid="tab-portfolio-map">
            <Map className="mr-2 h-4 w-4" />
            Portfolio Map
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
                                data-testid="input-edit-client-annual-revenue"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clientForm.control}
                        name={"tier" as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Tier</FormLabel>
                            <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                              <FormControl>
                                <SelectTrigger data-testid="select-edit-client-tier">
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
                        {client.address
                          ? <AddressLink address={client.address} className="text-muted-foreground text-sm" />
                          : <p className="text-muted-foreground">No address</p>}
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

                {/* Spending Card */}
                <Card className="border-none shadow-sm bg-card col-span-full lg:col-span-1">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">BD Spending</CardTitle>
                        <CardDescription>Business development spend vs. revenue</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIsAddSpendOpen(!isAddSpendOpen)} data-testid="button-toggle-add-spend">
                        {isAddSpendOpen ? "Cancel" : "Log Spend"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stats */}
                    {(() => {
                      const totalSpend = spendEntries.reduce((s, e) => s + parseFloat(e.amount), 0);
                      const revenue = client.annualRevenue ? parseFloat(client.annualRevenue) : null;
                      const net = revenue != null ? revenue - totalSpend : null;
                      const roi = revenue != null && totalSpend > 0 ? revenue / totalSpend : null;
                      const roiColor = roi == null ? "" : roi >= 3 ? "text-green-600" : roi >= 1 ? "text-amber-600" : "text-red-600";
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">BD Spend</p>
                            <p className="text-lg font-bold mt-0.5" data-testid="stat-total-spend">{totalSpend > 0 ? `$${totalSpend.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—"}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Annual Revenue</p>
                            <p className="text-lg font-bold mt-0.5" data-testid="stat-annual-revenue">{revenue != null && revenue > 0 ? `$${revenue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—"}</p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net</p>
                            <p className={`text-lg font-bold mt-0.5 ${net != null ? net >= 0 ? "text-green-600" : "text-red-600" : ""}`} data-testid="stat-net">
                              {net != null ? `${net >= 0 ? "+" : ""}$${Math.abs(net).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ROI Ratio</p>
                            <p className={`text-lg font-bold mt-0.5 ${roiColor}`} data-testid="stat-roi">{roi != null ? `${roi.toFixed(1)}×` : "—"}</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Add spend form */}
                    {isAddSpendOpen && (
                      <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Amount ($)</label>
                            <input type="number" min="0" step="0.01" placeholder="0.00"
                              value={spendFormData.amount}
                              onChange={e => setSpendFormData(f => ({ ...f, amount: e.target.value }))}
                              className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              data-testid="input-detail-spend-amount"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground block mb-1">Date</label>
                            <input type="date"
                              value={spendFormData.date}
                              onChange={e => setSpendFormData(f => ({ ...f, date: e.target.value }))}
                              className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                              data-testid="input-detail-spend-date"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Category</label>
                          <select value={spendFormData.category}
                            onChange={e => setSpendFormData(f => ({ ...f, category: e.target.value }))}
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            data-testid="select-detail-spend-category"
                          >
                            <option value="meals_entertainment">Meals & Entertainment</option>
                            <option value="gifts">Gifts</option>
                            <option value="travel">Travel</option>
                            <option value="events">Events</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Contact (optional)</label>
                          <select value={spendFormData.contactId}
                            onChange={e => setSpendFormData(f => ({ ...f, contactId: e.target.value }))}
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            data-testid="select-detail-spend-contact"
                          >
                            <option value="">No specific contact</option>
                            {contacts?.map(c => (
                              <option key={c.id} value={String(c.id)}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Description</label>
                          <input type="text" placeholder="e.g. Lunch at Nobu"
                            value={spendFormData.description}
                            onChange={e => setSpendFormData(f => ({ ...f, description: e.target.value }))}
                            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            data-testid="input-detail-spend-description"
                          />
                        </div>
                        <button
                          disabled={!spendFormData.amount || isSubmittingSpend}
                          onClick={async () => {
                            if (!spendFormData.amount) return;
                            setIsSubmittingSpend(true);
                            try {
                              await apiRequest("POST", `/api/clients/${clientId}/spend`, {
                                amount: spendFormData.amount,
                                category: spendFormData.category,
                                date: new Date(spendFormData.date).toISOString(),
                                description: spendFormData.description || null,
                                contactId: spendFormData.contactId ? parseInt(spendFormData.contactId) : null,
                              });
                              queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "spend"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/spend/client-totals"] });
                              queryClient.invalidateQueries({ queryKey: ["/api/spend/contact-totals"] });
                              setSpendFormData({ amount: "", category: "meals_entertainment", date: new Date().toISOString().split("T")[0], description: "", contactId: "" });
                              setIsAddSpendOpen(false);
                              toast({ title: "Spend logged", description: `$${parseFloat(spendFormData.amount).toFixed(0)} recorded` });
                            } catch (err: any) {
                              toast({ title: "Error", description: err.message, variant: "destructive" });
                            } finally {
                              setIsSubmittingSpend(false);
                            }
                          }}
                          className="w-full h-8 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                          data-testid="button-detail-submit-spend"
                        >
                          {isSubmittingSpend ? "Saving..." : "Save"}
                        </button>
                      </div>
                    )}

                    {/* Spend log */}
                    {spendEntries.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Spend Log</p>
                        <div className="space-y-1.5">
                          {spendEntries.map(entry => {
                            const contactName = entry.contactId ? contacts?.find(c => c.id === entry.contactId)?.name : null;
                            const catLabels: Record<string, string> = {
                              meals_entertainment: "Meals", gifts: "Gifts", travel: "Travel", events: "Events", other: "Other"
                            };
                            return (
                              <div key={entry.id} className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted/30 group" data-testid={`spend-entry-${entry.id}`}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">${parseFloat(entry.amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                      {catLabels[entry.category] ?? entry.category}
                                    </span>
                                    {contactName && <span className="text-muted-foreground text-xs">{contactName}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                    <span>{new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                    {entry.description && <span className="truncate">· {entry.description}</span>}
                                  </div>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (!confirm("Delete this spend entry?")) return;
                                    await apiRequest("DELETE", `/api/spend/${entry.id}`);
                                    queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "spend"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/spend/client-totals"] });
                                    queryClient.invalidateQueries({ queryKey: ["/api/spend/contact-totals"] });
                                  }}
                                  className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                                  data-testid={`button-delete-spend-${entry.id}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {spendEntries.length === 0 && !isAddSpendOpen && (
                      <p className="text-sm text-muted-foreground italic text-center py-4">No spend logged yet. Click "Log Spend" to add an entry.</p>
                    )}
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
                                {office.address && <AddressLink address={office.address} showIcon className="text-xs text-muted-foreground" iconClassName="h-3 w-3" />}
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
              <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                  <DialogDescription>Add a new contact person for {client.name}.</DialogDescription>
                </DialogHeader>
                <Form {...contactForm}>
                  <form onSubmit={contactForm.handleSubmit(onAddContact)} className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
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
                    {/* Service Needs */}
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
                              data-testid={`toggle-add-contact-service-${s.key}`}
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
                              <SelectTrigger data-testid="select-contact-tier">
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
                <form onSubmit={officeForm.handleSubmit((d) => createOfficeMutation.mutate({ ...d, lat: officeLat, lng: officeLng }))} className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Name <span className="text-destructive">*</span></label>
                    <Input {...officeForm.register("name", { required: true })} placeholder="e.g. Downtown Office, West Division" data-testid="input-office-name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Address</label>
                    <AddressAutocomplete
                      value={officeForm.watch("address") || ""}
                      onChange={(addr, lat, lng) => {
                        officeForm.setValue("address", addr);
                        if (lat !== undefined) setOfficeLat(lat);
                        if (lng !== undefined) setOfficeLng(lng);
                      }}
                      placeholder="Search address..."
                      data-testid="input-office-address"
                    />
                    {officeLat && <p className="text-[11px] text-green-600 mt-1">📍 Location confirmed</p>}
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
                <form onSubmit={editOfficeForm.handleSubmit((d) => editingOffice && updateOfficeMutation.mutate({ id: editingOffice.id, ...d, lat: editOfficeLat, lng: editOfficeLng }))} className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Name <span className="text-destructive">*</span></label>
                    <Input {...editOfficeForm.register("name", { required: true })} data-testid="input-edit-office-name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Address</label>
                    <AddressAutocomplete
                      value={editOfficeForm.watch("address") || ""}
                      onChange={(addr, lat, lng) => {
                        editOfficeForm.setValue("address", addr);
                        if (lat !== undefined) setEditOfficeLat(lat);
                        if (lng !== undefined) setEditOfficeLng(lng);
                      }}
                      placeholder="Search address..."
                      data-testid="input-edit-office-address"
                    />
                    {editOfficeLat && <p className="text-[11px] text-green-600 mt-1">📍 Location confirmed</p>}
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => verifyEmploymentMutation.mutate()}
                    disabled={verifyEmploymentMutation.isPending}
                    data-testid="button-verify-employment"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${verifyEmploymentMutation.isPending ? "animate-spin" : ""}`} />
                    {verifyEmploymentMutation.isPending ? "Verifying..." : "Verify via LinkedIn"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsContactDialogOpen(true)}
                    data-testid="button-add-contact-org"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Button>
                </div>
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

          <TabsContent value="portfolio-map" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  Portfolio Map
                </CardTitle>
                <CardDescription>
                  Offices and contact buildings for {client.name} — {allBuildings.filter(b => b.lat).length} of {allBuildings.length} location{allBuildings.length !== 1 ? "s" : ""} mapped
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <BuildingsMap
                  buildings={allBuildings}
                  className="h-[520px] w-full"
                />
                {allBuildings.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {allBuildings.map(b => (
                      <div key={`${b.type}-${b.id}`} className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${b.lat ? "border-border bg-card" : "border-dashed border-border/50 bg-muted/20"}`}
                        data-testid={`map-list-item-${b.type}-${b.id}`}>
                        {b.type === "office"
                          ? <Building2 className={`h-4 w-4 mt-0.5 shrink-0 ${b.lat ? "text-slate-500" : "text-muted-foreground/50"}`} />
                          : <MapPin className={`h-4 w-4 mt-0.5 shrink-0 ${b.lat ? "text-primary" : "text-muted-foreground/50"}`} />
                        }
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium truncate">{b.name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${b.type === "office" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                              {b.type === "office" ? "Office" : "Building"}
                            </span>
                          </div>
                          {b.type === "building" && <p className="text-[11px] text-muted-foreground truncate">{b.contactName}</p>}
                          {b.address && <AddressLink address={b.address} className="text-xs text-muted-foreground mt-0.5 truncate" />}
                          {!b.lat && <p className="text-[10px] text-amber-500 mt-0.5 italic">No location — edit to add address</p>}
                        </div>
                      </div>
                    ))}
                  </div>
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
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact info or move them to a different company.
            </DialogDescription>
          </DialogHeader>
          <Form {...editContactForm}>
            <form onSubmit={editContactForm.handleSubmit(onSaveEditContact)} className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
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

              {/* LinkedIn URL + Sync */}
              <div className="space-y-2">
                <FormField
                  control={editContactForm.control}
                  name={"linkedinUrl" as any}
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
                          data-testid="input-edit-contact-linkedin"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {editingContact && (
                  <LinkedInSyncButton
                    contactId={editingContact.id}
                    linkedinUrl={editContactForm.watch("linkedinUrl" as any) || ""}
                    onSuccess={(updated) => {
                      if (updated.title) editContactForm.setValue("title" as any, updated.title);
                      if (updated.email) editContactForm.setValue("email" as any, updated.email);
                      if (updated.phone) editContactForm.setValue("phone" as any, updated.phone);
                      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
                    }}
                  />
                )}
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

              {/* Service Needs */}
              <div>
                <FormLabel className="text-sm font-medium">Service Needs</FormLabel>
                <p className="text-xs text-muted-foreground mb-2 mt-0.5">Which M5 services does this contact require?</p>
                <div className="grid grid-cols-1 gap-2">
                  {SERVICE_NEEDS.map(s => {
                    const current: string[] = (editContactForm.watch("serviceNeeds") as string[]) ?? [];
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
                          editContactForm.setValue("serviceNeeds", next);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            const next = checked ? current.filter(k => k !== s.key) : [...current, s.key];
                            editContactForm.setValue("serviceNeeds", next);
                          }
                        }}
                        data-testid={`toggle-edit-contact-service-${s.key}`}
                      >
                        <s.Icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                        <span className="text-sm">{s.label}</span>
                        {checked && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <FormField
                control={editContactForm.control}
                name={"tier" as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Tier</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-contact-tier">
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
