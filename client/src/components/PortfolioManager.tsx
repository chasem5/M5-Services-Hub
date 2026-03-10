import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  X,
  Building2,
  Users,
  Folders,
  Trash2,
  Pencil,
  Check,
  MapPin,
  Search,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { cn } from "@/lib/utils";
import type { BuildingPortfolio, PortfolioBuilding, PortfolioContact, ContactBuilding, ClientContact, Client } from "@shared/schema";

type PortfolioWithDetails = BuildingPortfolio & {
  buildings: PortfolioBuilding[];
  contacts: PortfolioContact[];
};

interface PortfolioManagerProps {
  allContacts: ClientContact[];
  clients: Client[];
  filterClientId?: number;
  allBuildings?: ContactBuilding[];
}

export function PortfolioManager({ allContacts, clients, filterClientId }: PortfolioManagerProps) {
  const { toast } = useToast();

  const [buildingSearch, setBuildingSearch] = useState("");
  const [portfolioSearch, setPortfolioSearch] = useState("");

  const [showNewBuildingForm, setShowNewBuildingForm] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState("");
  const [newBuildingAddress, setNewBuildingAddress] = useState("");
  const [newBuildingLat, setNewBuildingLat] = useState<number | undefined>();
  const [newBuildingLng, setNewBuildingLng] = useState<number | undefined>();
  const [newBuildingClientId, setNewBuildingClientId] = useState<string>("none");
  const [newBuildingContactId, setNewBuildingContactId] = useState<string>("none");

  const [showNewPortfolioForm, setShowNewPortfolioForm] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [newPortfolioClientId, setNewPortfolioClientId] = useState<string>(filterClientId ? String(filterClientId) : "none");
  const [newPortfolioDescription, setNewPortfolioDescription] = useState("");

  const [expandedPortfolioIds, setExpandedPortfolioIds] = useState<Set<number>>(new Set());
  const [dragOverPortfolioId, setDragOverPortfolioId] = useState<number | null>(null);
  const [draggingBuildingId, setDraggingBuildingId] = useState<number | null>(null);

  const [deleteBuildingId, setDeleteBuildingId] = useState<number | null>(null);
  const [deletePortfolioId, setDeletePortfolioId] = useState<number | null>(null);
  const [editingBuildingId, setEditingBuildingId] = useState<number | null>(null);
  const [editBuildingName, setEditBuildingName] = useState("");

  const [editingPortfolioId, setEditingPortfolioId] = useState<number | null>(null);
  const [editPortfolioName, setEditPortfolioName] = useState("");

  const [contactSearch, setContactSearch] = useState<Record<number, string>>({});

  const { data: allBuildings = [], isLoading: buildingsLoading } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/contact-buildings"],
  });

  const portfolioQueryKey = filterClientId
    ? ["/api/portfolios", { clientId: filterClientId }]
    : ["/api/portfolios"];

  const { data: portfoliosRaw = [], isLoading: portfoliosLoading } = useQuery<PortfolioWithDetails[]>({
    queryKey: portfolioQueryKey,
    queryFn: async () => {
      const url = filterClientId ? `/api/portfolios?clientId=${filterClientId}` : "/api/portfolios";
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    },
  });

  const portfolios = portfoliosRaw as PortfolioWithDetails[];

  const createBuildingMutation = useMutation({
    mutationFn: async () => {
      const resolvedClientId = filterClientId
        ? filterClientId
        : newBuildingClientId !== "none" ? parseInt(newBuildingClientId) : null;
      const res = await apiRequest("POST", "/api/contact-buildings", {
        name: newBuildingName.trim(),
        address: newBuildingAddress.trim() || null,
        lat: newBuildingLat ?? null,
        lng: newBuildingLng ?? null,
        clientId: resolvedClientId,
        contactId: newBuildingContactId !== "none" ? parseInt(newBuildingContactId) : null,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create building");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-buildings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/all-buildings"] });
      setNewBuildingName("");
      setNewBuildingAddress("");
      setNewBuildingLat(undefined);
      setNewBuildingLng(undefined);
      setNewBuildingClientId("none");
      setNewBuildingContactId("none");
      setShowNewBuildingForm(false);
      toast({ title: "Building created" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const updateBuildingMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await apiRequest("PUT", `/api/contact-buildings/${id}`, { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-buildings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/all-buildings"] });
      setEditingBuildingId(null);
    },
    onError: () => toast({ title: "Failed to update building", variant: "destructive" }),
  });

  const deleteBuildingMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/contact-buildings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-buildings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/all-buildings"] });
      queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
      setDeleteBuildingId(null);
      toast({ title: "Building deleted" });
    },
    onError: () => toast({ title: "Failed to delete building", variant: "destructive" }),
  });

  const createPortfolioMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/portfolios", {
      name: newPortfolioName.trim(),
      clientId: newPortfolioClientId !== "none" ? parseInt(newPortfolioClientId) : null,
      description: newPortfolioDescription.trim() || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
      setNewPortfolioName("");
      setNewPortfolioClientId(filterClientId ? String(filterClientId) : "none");
      setNewPortfolioDescription("");
      setShowNewPortfolioForm(false);
      toast({ title: "Portfolio created" });
    },
    onError: () => toast({ title: "Failed to create portfolio", variant: "destructive" }),
  });

  const deletePortfolioMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/portfolios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
      setDeletePortfolioId(null);
      toast({ title: "Portfolio deleted" });
    },
    onError: () => toast({ title: "Failed to delete portfolio", variant: "destructive" }),
  });

  const addBuildingToPortfolioMutation = useMutation({
    mutationFn: ({ portfolioId, buildingId }: { portfolioId: number; buildingId: number }) =>
      apiRequest("POST", `/api/portfolios/${portfolioId}/buildings`, { buildingId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
      toast({ title: "Building added to portfolio" });
    },
    onError: () => toast({ title: "Failed to add building", variant: "destructive" }),
  });

  const removeBuildingFromPortfolioMutation = useMutation({
    mutationFn: ({ portfolioId, buildingId }: { portfolioId: number; buildingId: number }) =>
      apiRequest("DELETE", `/api/portfolios/${portfolioId}/buildings/${buildingId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: portfolioQueryKey }),
    onError: () => toast({ title: "Failed to remove building", variant: "destructive" }),
  });

  const addContactMutation = useMutation({
    mutationFn: ({ portfolioId, contactId, role }: { portfolioId: number; contactId: number; role?: string }) =>
      apiRequest("POST", `/api/portfolios/${portfolioId}/contacts`, { contactId, role: role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
    },
    onError: () => toast({ title: "Failed to add contact", variant: "destructive" }),
  });

  const removeContactMutation = useMutation({
    mutationFn: ({ portfolioId, contactId }: { portfolioId: number; contactId: number }) =>
      apiRequest("DELETE", `/api/portfolios/${portfolioId}/contacts/${contactId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: portfolioQueryKey }),
    onError: () => toast({ title: "Failed to remove contact", variant: "destructive" }),
  });

  const updatePortfolioMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      apiRequest("PATCH", `/api/portfolios/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioQueryKey });
      setEditingPortfolioId(null);
    },
    onError: () => toast({ title: "Failed to update portfolio", variant: "destructive" }),
  });

  const companyFilteredBuildings = filterClientId
    ? allBuildings.filter(b => {
        if (b.clientId === filterClientId) return true;
        const contact = allContacts.find(c => c.id === b.contactId);
        return contact?.clientId === filterClientId;
      })
    : allBuildings;

  const filteredBuildings = companyFilteredBuildings.filter(b => {
    if (!buildingSearch) return true;
    const q = buildingSearch.toLowerCase();
    const contact = allContacts.find(c => c.id === b.contactId);
    const company = clients.find(cl => cl.id === (b.clientId ?? contact?.clientId));
    return (
      b.name.toLowerCase().includes(q) ||
      (b.address ?? "").toLowerCase().includes(q) ||
      (company?.name ?? "").toLowerCase().includes(q)
    );
  });

  const companyContacts = filterClientId
    ? allContacts.filter(c => c.clientId === filterClientId)
    : allContacts;

  const filterCompany = filterClientId ? clients.find(c => c.id === filterClientId) : null;

  const filteredPortfolios = portfolios.filter(p => {
    if (!portfolioSearch) return true;
    const q = portfolioSearch.toLowerCase();
    const company = clients.find(c => c.id === p.clientId);
    return p.name.toLowerCase().includes(q) || (company?.name ?? "").toLowerCase().includes(q);
  });

  const portfolioBuildingMap = new Map<number, number[]>();
  portfolios.forEach(p => {
    p.buildings?.forEach(pb => {
      const existing = portfolioBuildingMap.get(pb.buildingId) ?? [];
      portfolioBuildingMap.set(pb.buildingId, [...existing, p.id]);
    });
  });

  const newBuildingContacts = filterClientId
    ? companyContacts
    : newBuildingClientId !== "none"
      ? allContacts.filter(c => c.clientId === parseInt(newBuildingClientId))
      : allContacts;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 pb-6">

      {/* LEFT COLUMN: Buildings Library */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              {filterCompany ? `${filterCompany.name} Buildings` : "Buildings"}
            </span>
            {companyFilteredBuildings.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{companyFilteredBuildings.length}</Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => setShowNewBuildingForm(v => !v)}
            data-testid="button-new-building"
          >
            <Plus className="h-3.5 w-3.5" />
            New Building
          </Button>
        </div>

        {/* New building form */}
        {showNewBuildingForm && (
          <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Building</p>
            <Input
              placeholder="Building name *"
              value={newBuildingName}
              onChange={e => setNewBuildingName(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              data-testid="input-building-name"
            />
            <AddressAutocomplete
              value={newBuildingAddress}
              onChange={(addr, lat, lng) => {
                setNewBuildingAddress(addr);
                setNewBuildingLat(lat);
                setNewBuildingLng(lng);
              }}
              placeholder="Address (optional)"
              className="h-8 text-sm"
            />
            {filterClientId ? (
              <div className="h-8 flex items-center px-3 text-xs bg-muted/50 rounded-md border text-muted-foreground">
                {filterCompany?.name ?? "Company"} <span className="ml-1 text-[10px] opacity-60">(linked automatically)</span>
              </div>
            ) : (
              <Select value={newBuildingClientId} onValueChange={v => { setNewBuildingClientId(v); setNewBuildingContactId("none"); }}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-building-company">
                  <SelectValue placeholder="Link to company (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No company</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {newBuildingContacts.length > 0 && (
              <Select value={newBuildingContactId} onValueChange={setNewBuildingContactId}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-building-contact">
                  <SelectValue placeholder="Link to contact (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No contact</SelectItem>
                  {newBuildingContacts.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => createBuildingMutation.mutate()}
                disabled={!newBuildingName.trim() || createBuildingMutation.isPending}
                data-testid="button-save-building"
              >
                {createBuildingMutation.isPending ? "Creating…" : "Create Building"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setShowNewBuildingForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search buildings..."
            value={buildingSearch}
            onChange={e => setBuildingSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
            data-testid="input-search-buildings"
          />
        </div>

        {/* Building list */}
        {buildingsLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : filteredBuildings.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{buildingSearch ? "No buildings match your search" : "No buildings yet"}</p>
            {!buildingSearch && <p className="text-xs mt-1">Click "New Building" to add one</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBuildings.map(building => {
              const contact = allContacts.find(c => c.id === building.contactId);
              const company = clients.find(cl => cl.id === (building.clientId ?? contact?.clientId));
              const inPortfolios = portfolios.filter(p =>
                p.buildings?.some(pb => pb.buildingId === building.id)
              );
              const isEditing = editingBuildingId === building.id;

              return (
                <div
                  key={building.id}
                  draggable
                  onDragStart={() => setDraggingBuildingId(building.id)}
                  onDragEnd={() => setDraggingBuildingId(null)}
                  className={cn(
                    "border rounded-lg p-3 bg-background hover:bg-muted/30 transition-colors cursor-grab active:cursor-grabbing group",
                    draggingBuildingId === building.id && "opacity-50 ring-2 ring-primary"
                  )}
                  data-testid={`card-building-${building.id}`}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex gap-1.5">
                          <Input
                            autoFocus
                            value={editBuildingName}
                            onChange={e => setEditBuildingName(e.target.value)}
                            className="h-7 text-xs"
                            onKeyDown={e => {
                              if (e.key === "Enter") updateBuildingMutation.mutate({ id: building.id, name: editBuildingName });
                              if (e.key === "Escape") setEditingBuildingId(null);
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateBuildingMutation.mutate({ id: building.id, name: editBuildingName })}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingBuildingId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{building.name}</p>
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            onClick={() => { setEditingBuildingId(building.id); setEditBuildingName(building.name); }}
                            data-testid={`button-edit-building-${building.id}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      {building.address && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          {building.address}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        {company && (
                          <Badge variant="outline" className="h-4 text-[10px] px-1.5 font-normal">
                            {company.name}
                          </Badge>
                        )}
                        {contact && (
                          <Badge variant="secondary" className="h-4 text-[10px] px-1.5 font-normal">
                            <Users className="h-2.5 w-2.5 mr-0.5" />
                            {contact.name}
                          </Badge>
                        )}
                        {inPortfolios.map(p => (
                          <Badge key={p.id} className="h-4 text-[10px] px-1.5 font-normal bg-primary/10 text-primary border-primary/20">
                            <Folders className="h-2.5 w-2.5 mr-0.5" />
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                        onClick={() => setDeleteBuildingId(building.id)}
                        data-testid={`button-delete-building-${building.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Quick-assign to portfolio */}
                  {portfolios.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-1">
                      {portfolios.filter(p => !p.buildings?.some(pb => pb.buildingId === building.id)).map(p => (
                        <button
                          key={p.id}
                          className="text-[10px] text-muted-foreground hover:text-primary border border-dashed border-border hover:border-primary/50 rounded px-1.5 py-0.5 transition-colors flex items-center gap-1"
                          onClick={() => addBuildingToPortfolioMutation.mutate({ portfolioId: p.id, buildingId: building.id })}
                          data-testid={`button-assign-${building.id}-to-${p.id}`}
                        >
                          <Link2 className="h-2.5 w-2.5" />
                          Add to {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Portfolios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folders className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Portfolios</span>
            {portfolios.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{portfolios.length}</Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => setShowNewPortfolioForm(v => !v)}
            data-testid="button-new-portfolio"
          >
            <Plus className="h-3.5 w-3.5" />
            New Portfolio
          </Button>
        </div>

        {/* New portfolio form */}
        {showNewPortfolioForm && (
          <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Portfolio</p>
            <Input
              placeholder="Portfolio name *"
              value={newPortfolioName}
              onChange={e => setNewPortfolioName(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              data-testid="input-portfolio-name"
              onKeyDown={e => e.key === "Enter" && newPortfolioName.trim() && createPortfolioMutation.mutate()}
            />
            <Select value={newPortfolioClientId} onValueChange={setNewPortfolioClientId}>
              <SelectTrigger className="h-8 text-xs" data-testid="select-portfolio-company">
                <SelectValue placeholder="Link to company (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No company</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Description (optional)"
              value={newPortfolioDescription}
              onChange={e => setNewPortfolioDescription(e.target.value)}
              className="h-8 text-xs"
              data-testid="input-portfolio-description"
            />
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => createPortfolioMutation.mutate()}
                disabled={!newPortfolioName.trim() || createPortfolioMutation.isPending}
                data-testid="button-save-portfolio"
              >
                {createPortfolioMutation.isPending ? "Creating…" : "Create Portfolio"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNewPortfolioForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search portfolios..."
            value={portfolioSearch}
            onChange={e => setPortfolioSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
            data-testid="input-search-portfolios"
          />
        </div>

        {/* Portfolio list */}
        {portfoliosLoading ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : filteredPortfolios.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Folders className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">{portfolioSearch ? "No portfolios match your search" : "No portfolios yet"}</p>
            {!portfolioSearch && <p className="text-xs mt-1">Click "New Portfolio" to create one, then drag buildings into it</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPortfolios.map(portfolio => {
              const company = clients.find(c => c.id === portfolio.clientId);
              const isExpanded = expandedPortfolioIds.has(portfolio.id);
              const isEditing = editingPortfolioId === portfolio.id;
              const isDragOver = dragOverPortfolioId === portfolio.id;
              const portfolioBuildings = allBuildings.filter(b =>
                portfolio.buildings?.some(pb => pb.buildingId === b.id)
              );
              const portfolioContactList = portfolio.contacts ?? [];
              const cSearch = contactSearch[portfolio.id] ?? "";
              const contactPool = filterClientId ? companyContacts : allContacts;
              const availableContacts = contactPool.filter(c => {
                const alreadyAdded = portfolioContactList.some(pc => pc.contactId === c.id);
                if (alreadyAdded) return false;
                if (!filterClientId && !cSearch) return false;
                if (!filterClientId && cSearch) {
                  const q = cSearch.toLowerCase();
                  const company = clients.find(cl => cl.id === c.clientId);
                  return c.name.toLowerCase().includes(q) || (c.title ?? "").toLowerCase().includes(q) || (company?.name ?? "").toLowerCase().includes(q);
                }
                if (!cSearch) return true;
                const q = cSearch.toLowerCase();
                return c.name.toLowerCase().includes(q) || (c.title ?? "").toLowerCase().includes(q);
              });

              return (
                <div
                  key={portfolio.id}
                  className={cn(
                    "border rounded-lg bg-background transition-all",
                    isDragOver && "ring-2 ring-primary border-primary bg-primary/5"
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOverPortfolioId(portfolio.id); }}
                  onDragLeave={() => setDragOverPortfolioId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverPortfolioId(null);
                    if (draggingBuildingId !== null) {
                      const alreadyInPortfolio = portfolio.buildings?.some(pb => pb.buildingId === draggingBuildingId);
                      if (!alreadyInPortfolio) {
                        addBuildingToPortfolioMutation.mutate({ portfolioId: portfolio.id, buildingId: draggingBuildingId });
                      }
                    }
                  }}
                  data-testid={`card-portfolio-${portfolio.id}`}
                >
                  {/* Portfolio header */}
                  <div className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex gap-1.5">
                            <Input
                              autoFocus
                              value={editPortfolioName}
                              onChange={e => setEditPortfolioName(e.target.value)}
                              className="h-7 text-xs"
                              onKeyDown={e => {
                                if (e.key === "Enter") updatePortfolioMutation.mutate({ id: portfolio.id, name: editPortfolioName });
                                if (e.key === "Escape") setEditingPortfolioId(null);
                              }}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updatePortfolioMutation.mutate({ id: portfolio.id, name: editPortfolioName })}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingPortfolioId(null)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group/pname">
                            <p className="text-sm font-semibold">{portfolio.name}</p>
                            <button
                              className="opacity-0 group-hover/pname:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                              onClick={() => { setEditingPortfolioId(portfolio.id); setEditPortfolioName(portfolio.name); }}
                              data-testid={`button-edit-portfolio-${portfolio.id}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {company && <Badge variant="outline" className="h-4 text-[10px] px-1.5 font-normal">{company.name}</Badge>}
                          <span className="text-[11px] text-muted-foreground">
                            {portfolioBuildings.length} building{portfolioBuildings.length !== 1 ? "s" : ""}
                            {portfolioContactList.length > 0 && ` · ${portfolioContactList.length} contact${portfolioContactList.length !== 1 ? "s" : ""}`}
                          </span>
                          {isDragOver && (
                            <span className="text-[11px] text-primary font-medium animate-pulse">Drop to add building</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
                          onClick={() => setExpandedPortfolioIds(prev => {
                            const next = new Set(prev);
                            if (next.has(portfolio.id)) next.delete(portfolio.id);
                            else next.add(portfolio.id);
                            return next;
                          })}
                          data-testid={`button-expand-portfolio-${portfolio.id}`}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <button
                          className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          onClick={() => setDeletePortfolioId(portfolio.id)}
                          data-testid={`button-delete-portfolio-${portfolio.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border/50 px-3 py-2 space-y-3">
                      {/* Buildings in this portfolio */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Buildings</p>
                        {portfolioBuildings.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            Drag a building here, or use the "Add to {portfolio.name}" links below each building.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {portfolioBuildings.map(b => (
                              <div key={b.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/40 group/row" data-testid={`row-portfolio-building-${b.id}`}>
                                <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span className="flex-1 truncate">{b.name}</span>
                                {b.address && <span className="text-muted-foreground truncate max-w-[120px] hidden sm:inline">{b.address}</span>}
                                <button
                                  className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                  onClick={() => removeBuildingFromPortfolioMutation.mutate({ portfolioId: portfolio.id, buildingId: b.id })}
                                  data-testid={`button-remove-building-${b.id}-from-${portfolio.id}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Contacts in this portfolio */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Contacts</p>

                        {filterClientId ? (
                          /* Company context: checklist of all company contacts */
                          <div className="border rounded-lg overflow-hidden">
                            {companyContacts.length === 0 ? (
                              <p className="text-xs text-muted-foreground p-3 text-center italic">No contacts for this company yet.</p>
                            ) : (
                              <div className="divide-y max-h-44 overflow-y-auto">
                                {companyContacts.map(c => {
                                  const isAdded = portfolioContactList.some(pc => pc.contactId === c.id);
                                  return (
                                    <div
                                      key={c.id}
                                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors"
                                      data-testid={`row-portfolio-contact-${c.id}`}
                                    >
                                      <button
                                        className={cn(
                                          "h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                          isAdded
                                            ? "bg-primary border-primary text-white"
                                            : "border-border hover:border-primary/50"
                                        )}
                                        onClick={() => {
                                          if (isAdded) {
                                            removeContactMutation.mutate({ portfolioId: portfolio.id, contactId: c.id });
                                          } else {
                                            addContactMutation.mutate({ portfolioId: portfolio.id, contactId: c.id });
                                          }
                                        }}
                                        data-testid={`checkbox-contact-${c.id}-portfolio-${portfolio.id}`}
                                      >
                                        {isAdded && <Check className="h-2.5 w-2.5" />}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">{c.name}</p>
                                        {c.title && <p className="text-[10px] text-muted-foreground truncate">{c.title}</p>}
                                      </div>
                                      {isAdded && (
                                        <span className="text-[10px] text-primary font-medium shrink-0">Added</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* No company context: show added contacts + search to add more */
                          <>
                            {portfolioContactList.length > 0 && (
                              <div className="space-y-1 mb-2">
                                {portfolioContactList.map(pc => {
                                  const c = allContacts.find(x => x.id === pc.contactId);
                                  if (!c) return null;
                                  return (
                                    <div key={pc.contactId} className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/40 group/row" data-testid={`row-portfolio-contact-${pc.contactId}`}>
                                      <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                                      <span className="flex-1 truncate">{c.name}</span>
                                      {pc.role && <span className="text-muted-foreground text-[10px]">{pc.role}</span>}
                                      <button
                                        className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                        onClick={() => removeContactMutation.mutate({ portfolioId: portfolio.id, contactId: pc.contactId })}
                                        data-testid={`button-remove-contact-${pc.contactId}`}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <Input
                              placeholder="Search contacts to add..."
                              value={cSearch}
                              onChange={e => setContactSearch(prev => ({ ...prev, [portfolio.id]: e.target.value }))}
                              className="h-7 text-xs"
                              data-testid={`input-search-contacts-${portfolio.id}`}
                            />
                            {cSearch && availableContacts.length > 0 && (
                              <div className="border rounded overflow-hidden mt-1 max-h-32 overflow-y-auto">
                                {availableContacts.slice(0, 6).map(c => {
                                  const co = clients.find(cl => cl.id === c.clientId);
                                  return (
                                    <button
                                      key={c.id}
                                      className="w-full text-left px-3 py-1.5 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                                      onClick={() => {
                                        addContactMutation.mutate({ portfolioId: portfolio.id, contactId: c.id });
                                        setContactSearch(prev => ({ ...prev, [portfolio.id]: "" }));
                                      }}
                                      data-testid={`option-contact-${c.id}`}
                                    >
                                      <p className="text-xs font-medium">{c.name}</p>
                                      <p className="text-[10px] text-muted-foreground">{[c.title, co?.name].filter(Boolean).join(" · ")}</p>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            {cSearch && availableContacts.length === 0 && (
                              <p className="text-xs text-muted-foreground mt-1 px-1">No contacts found</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Building confirm */}
      <AlertDialog open={deleteBuildingId !== null} onOpenChange={open => { if (!open) setDeleteBuildingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Building?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the building and remove it from any portfolios. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteBuildingId !== null && deleteBuildingMutation.mutate(deleteBuildingId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Portfolio confirm */}
      <AlertDialog open={deletePortfolioId !== null} onOpenChange={open => { if (!open) setDeletePortfolioId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portfolio?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the portfolio and remove all building and contact assignments. The buildings themselves will not be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePortfolioId !== null && deletePortfolioMutation.mutate(deletePortfolioId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
