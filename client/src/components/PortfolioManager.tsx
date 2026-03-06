import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  X,
  ChevronRight,
  Building2,
  Users,
  Folders,
  Trash2,
  Pencil,
  Check,
  MapPin,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BuildingPortfolio, PortfolioBuilding, PortfolioContact, ContactBuilding, ClientContact, Client } from "@shared/schema";

type PortfolioWithDetails = BuildingPortfolio & {
  buildings: PortfolioBuilding[];
  contacts: PortfolioContact[];
};

interface PortfolioManagerProps {
  allBuildings: ContactBuilding[];
  allContacts: ClientContact[];
  clients: Client[];
}

export function PortfolioManager({ allBuildings, allContacts, clients }: PortfolioManagerProps) {
  const { toast } = useToast();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newClientId, setNewClientId] = useState<string>("none");
  const [newDescription, setNewDescription] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  const [buildingSearch, setBuildingSearch] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [newRole, setNewRole] = useState("");

  const { data: portfolios = [], isLoading } = useQuery<BuildingPortfolio[]>({
    queryKey: ["/api/portfolios"],
  });

  const { data: detailPortfolio, isLoading: isLoadingDetail } = useQuery<PortfolioWithDetails>({
    queryKey: ["/api/portfolios", selectedPortfolioId],
    enabled: selectedPortfolioId !== null,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; clientId?: number | null; description?: string | null; createdBy?: string | null }) =>
      apiRequest("POST", "/api/portfolios", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      setShowCreateForm(false);
      setNewName("");
      setNewClientId("none");
      setNewDescription("");
      toast({ title: "Portfolio created" });
    },
    onError: () => toast({ title: "Failed to create portfolio", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BuildingPortfolio> }) =>
      apiRequest("PATCH", `/api/portfolios/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", selectedPortfolioId] });
    },
    onError: () => toast({ title: "Failed to update portfolio", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/portfolios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      setSelectedPortfolioId(null);
      setDeleteConfirmId(null);
      toast({ title: "Portfolio deleted" });
    },
    onError: () => toast({ title: "Failed to delete portfolio", variant: "destructive" }),
  });

  const addBuildingMutation = useMutation({
    mutationFn: ({ portfolioId, buildingId }: { portfolioId: number; buildingId: number }) =>
      apiRequest("POST", `/api/portfolios/${portfolioId}/buildings`, { buildingId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", selectedPortfolioId] });
      setBuildingSearch("");
    },
    onError: () => toast({ title: "Failed to add building", variant: "destructive" }),
  });

  const removeBuildingMutation = useMutation({
    mutationFn: ({ portfolioId, buildingId }: { portfolioId: number; buildingId: number }) =>
      apiRequest("DELETE", `/api/portfolios/${portfolioId}/buildings/${buildingId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/portfolios", selectedPortfolioId] }),
    onError: () => toast({ title: "Failed to remove building", variant: "destructive" }),
  });

  const addContactMutation = useMutation({
    mutationFn: ({ portfolioId, contactId, role }: { portfolioId: number; contactId: number; role?: string }) =>
      apiRequest("POST", `/api/portfolios/${portfolioId}/contacts`, { contactId, role: role || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", selectedPortfolioId] });
      setContactSearch("");
      setNewRole("");
    },
    onError: () => toast({ title: "Failed to add contact", variant: "destructive" }),
  });

  const removeContactMutation = useMutation({
    mutationFn: ({ portfolioId, contactId }: { portfolioId: number; contactId: number }) =>
      apiRequest("DELETE", `/api/portfolios/${portfolioId}/contacts/${contactId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/portfolios", selectedPortfolioId] }),
    onError: () => toast({ title: "Failed to remove contact", variant: "destructive" }),
  });

  function handleCreate() {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      clientId: newClientId !== "none" ? Number(newClientId) : null,
      description: newDescription.trim() || null,
    });
  }

  function handleSaveName() {
    if (!editNameValue.trim() || !selectedPortfolioId) return;
    updateMutation.mutate({ id: selectedPortfolioId, data: { name: editNameValue.trim() } });
    setEditingName(false);
  }

  const assignedBuildingIds = new Set(detailPortfolio?.buildings.map(b => b.buildingId) ?? []);
  const assignedContactIds = new Set(detailPortfolio?.contacts.map(c => c.contactId) ?? []);

  const availableBuildings = allBuildings.filter(b => {
    if (assignedBuildingIds.has(b.id)) return false;
    if (!buildingSearch) return true;
    const q = buildingSearch.toLowerCase();
    const contact = allContacts.find(c => c.id === b.contactId);
    const company = clients.find(cl => cl.id === contact?.clientId);
    return (
      b.name.toLowerCase().includes(q) ||
      (b.address ?? "").toLowerCase().includes(q) ||
      (company?.name ?? "").toLowerCase().includes(q)
    );
  });

  const availableContacts = allContacts.filter(c => {
    if (assignedContactIds.has(c.id)) return false;
    if (!contactSearch) return true;
    const q = contactSearch.toLowerCase();
    const company = clients.find(cl => cl.id === c.clientId);
    return (
      c.name.toLowerCase().includes(q) ||
      (c.title ?? "").toLowerCase().includes(q) ||
      (company?.name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="px-6 pb-2">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Folders className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Building Portfolios</span>
          {portfolios.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{portfolios.length}</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setShowCreateForm(v => !v)}
          data-testid="button-new-portfolio"
        >
          <Plus className="h-3.5 w-3.5" />
          New Portfolio
        </Button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <div className="mb-4 border rounded-lg p-3 bg-muted/30 space-y-2">
          <Input
            placeholder="Portfolio name *"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="h-8 text-sm"
            data-testid="input-portfolio-name"
            onKeyDown={e => e.key === "Enter" && handleCreate()}
          />
          <Select value={newClientId} onValueChange={setNewClientId}>
            <SelectTrigger className="h-8 text-sm" data-testid="select-portfolio-client">
              <SelectValue placeholder="Link to company (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No company</SelectItem>
              {clients.map(cl => (
                <SelectItem key={cl.id} value={String(cl.id)}>{cl.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Description (optional)"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            className="text-sm min-h-[56px] resize-none"
            data-testid="textarea-portfolio-description"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending} data-testid="button-create-portfolio">
              Create
            </Button>
          </div>
        </div>
      )}

      {/* Portfolio cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : portfolios.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-border/50 rounded-lg mb-4">
          <Folders className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No portfolios yet. Create one to group buildings and contacts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
          {portfolios.map(p => {
            const company = clients.find(cl => cl.id === p.clientId);
            return (
              <button
                key={p.id}
                className="text-left border rounded-xl p-3 bg-card hover:shadow-md transition-shadow group"
                onClick={() => setSelectedPortfolioId(p.id)}
                data-testid={`card-portfolio-${p.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    {company && <p className="text-[11px] text-primary truncate mt-0.5">{company.name}</p>}
                    {p.description && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={selectedPortfolioId !== null} onOpenChange={open => { if (!open) setSelectedPortfolioId(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {isLoadingDetail || !detailPortfolio ? (
            <div className="space-y-3 pt-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-start justify-between gap-2">
                  {editingName ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editNameValue}
                        onChange={e => setEditNameValue(e.target.value)}
                        className="h-8 text-sm font-semibold"
                        onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                        autoFocus
                        data-testid="input-edit-portfolio-name"
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSaveName}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <SheetTitle className="flex items-center gap-2 group cursor-pointer" onClick={() => { setEditNameValue(detailPortfolio.name); setEditingName(true); }}>
                      {detailPortfolio.name}
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </SheetTitle>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmId(detailPortfolio.id)}
                    data-testid="button-delete-portfolio"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {clients.find(cl => cl.id === detailPortfolio.clientId) && (
                  <Badge variant="outline" className="w-fit text-xs text-primary border-primary/30">
                    {clients.find(cl => cl.id === detailPortfolio.clientId)?.name}
                  </Badge>
                )}
                {detailPortfolio.description && (
                  <p className="text-sm text-muted-foreground leading-snug">{detailPortfolio.description}</p>
                )}
              </SheetHeader>

              {/* Buildings section */}
              <div className="pt-4 pb-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Buildings ({detailPortfolio.buildings.length})
                  </p>
                </div>

                {detailPortfolio.buildings.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic mb-3">No buildings assigned.</p>
                ) : (
                  <div className="space-y-1.5 mb-3">
                    {detailPortfolio.buildings.map(pb => {
                      const building = allBuildings.find(b => b.id === pb.buildingId);
                      if (!building) return null;
                      const contact = allContacts.find(c => c.id === building.contactId);
                      const company = clients.find(cl => cl.id === contact?.clientId);
                      return (
                        <div key={pb.id} className="flex items-center justify-between gap-2 bg-muted/30 rounded-lg px-3 py-2" data-testid={`row-portfolio-building-${pb.buildingId}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{building.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {building.address && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                                  {building.address}
                                </span>
                              )}
                              {company && (
                                <span className="text-[10px] text-primary shrink-0">{company.name}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeBuildingMutation.mutate({ portfolioId: detailPortfolio.id, buildingId: pb.buildingId })}
                            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                            data-testid={`button-remove-building-${pb.buildingId}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add building */}
                <div className="space-y-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search buildings to add..."
                      value={buildingSearch}
                      onChange={e => setBuildingSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                      data-testid="input-search-buildings"
                    />
                  </div>
                  {buildingSearch && (
                    <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                      {availableBuildings.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">No buildings found</p>
                      ) : (
                        availableBuildings.slice(0, 8).map(b => {
                          const contact = allContacts.find(c => c.id === b.contactId);
                          const company = clients.find(cl => cl.id === contact?.clientId);
                          return (
                            <button
                              key={b.id}
                              className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                              onClick={() => addBuildingMutation.mutate({ portfolioId: detailPortfolio.id, buildingId: b.id })}
                              data-testid={`option-building-${b.id}`}
                            >
                              <p className="text-xs font-medium">{b.name}</p>
                              {company && <p className="text-[10px] text-muted-foreground">{company.name}</p>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Contacts section */}
              <div className="pt-2 border-t mt-2">
                <div className="flex items-center justify-between mb-2 pt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Contacts ({detailPortfolio.contacts.length})
                  </p>
                </div>

                {detailPortfolio.contacts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic mb-3">No contacts assigned.</p>
                ) : (
                  <div className="space-y-1.5 mb-3">
                    {detailPortfolio.contacts.map(pc => {
                      const contact = allContacts.find(c => c.id === pc.contactId);
                      if (!contact) return null;
                      const company = clients.find(cl => cl.id === contact.clientId);
                      return (
                        <div key={pc.id} className="flex items-center justify-between gap-2 bg-muted/30 rounded-lg px-3 py-2" data-testid={`row-portfolio-contact-${pc.contactId}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{contact.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {contact.title && <span className="text-[10px] text-muted-foreground">{contact.title}</span>}
                              {company && <span className="text-[10px] text-primary">{company.name}</span>}
                              {pc.role && <Badge variant="outline" className="text-[9px] h-4 px-1">{pc.role}</Badge>}
                            </div>
                          </div>
                          <button
                            onClick={() => removeContactMutation.mutate({ portfolioId: detailPortfolio.id, contactId: pc.contactId })}
                            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                            data-testid={`button-remove-contact-${pc.contactId}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add contact */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts to add..."
                      value={contactSearch}
                      onChange={e => setContactSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                      data-testid="input-search-contacts"
                    />
                  </div>
                  {contactSearch && (
                    <>
                      <Input
                        placeholder="Role for this portfolio (optional)"
                        value={newRole}
                        onChange={e => setNewRole(e.target.value)}
                        className="h-8 text-xs"
                        data-testid="input-contact-role"
                      />
                      <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                        {availableContacts.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-3 text-center">No contacts found</p>
                        ) : (
                          availableContacts.slice(0, 8).map(c => {
                            const company = clients.find(cl => cl.id === c.clientId);
                            return (
                              <button
                                key={c.id}
                                className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                                onClick={() => addContactMutation.mutate({ portfolioId: detailPortfolio.id, contactId: c.id, role: newRole || undefined })}
                                data-testid={`option-contact-${c.id}`}
                              >
                                <p className="text-xs font-medium">{c.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {[c.title, company?.name].filter(Boolean).join(" · ")}
                                </p>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirm dialog */}
      <AlertDialog open={deleteConfirmId !== null} onOpenChange={open => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portfolio?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the portfolio and remove all building and contact assignments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId !== null && deleteMutation.mutate(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
