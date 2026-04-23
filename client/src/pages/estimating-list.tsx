import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Search, FileText, DollarSign, Clock, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, ChevronRight, Pencil, Trash2, X, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import type { Opportunity } from "@shared/schema";

// ── Searchable combobox ────────────────────────────────────────────────────────
interface ComboOption { value: string; label: string; sub?: string }

function SearchableCombo({
  value, onValueChange, options, placeholder, testId, disabled,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: ComboOption[];
  placeholder?: string;
  testId?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";
  const q = search.toLowerCase();
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q) || (o.sub ?? "").toLowerCase().includes(q))
    : options;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-testid={testId}
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen((v) => !v); setSearch(""); } }}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedLabel ? "text-foreground truncate" : "text-muted-foreground"}>
          {selectedLabel || placeholder || "Select…"}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                ref={inputRef}
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 h-7 text-xs"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-center text-muted-foreground">No results</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onValueChange(o.value); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-3 py-1.5 text-sm flex flex-col hover:bg-accent hover:text-accent-foreground transition-colors ${o.value === value ? "bg-accent/40 font-medium" : ""}`}
                >
                  <span>{o.label}</span>
                  {o.sub && <span className="text-xs text-muted-foreground">{o.sub}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: "Draft",     color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",  icon: <FileText className="h-3 w-3" /> },
  in_review: { label: "In Review", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <AlertCircle className="h-3 w-3" /> },
  approved:  { label: "Approved",  color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected:  { label: "Rejected",  color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",   icon: <XCircle className="h-3 w-3" /> },
  synced:    { label: "Synced",    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <TrendingUp className="h-3 w-3" /> },
};

const MODE_CONFIG: Record<string, { label: string; color: string }> = {
  estimate: { label: "Estimate", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  quote:    { label: "Quote",    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
};

const PRESET_SERVICE_LINES = [
  "HVAC", "Electrical", "Plumbing", "Fire & Life Safety", "Building Automation",
  "Mechanical", "Energy", "Janitorial", "Landscaping", "Roofing", "Painting",
  "Security", "Pest Control", "Elevator", "General",
];

const JOB_TYPES = [
  "Service", "Project", "Construction", "Maintenance", "Inspection", "Emergency",
  "Capital Improvement", "Retrofit", "Other",
];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-100 text-gray-700", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const cfg = MODE_CONFIG[mode] ?? { label: mode, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function emptyForm() {
  return {
    name: "",
    mode: "estimate",
    clientId: "",
    buildingId: "",
    serviceLines: [] as string[],
    customServiceLine: "",
    projectManagerId: "",
    accountManagerId: "",
    soldById: "",
    jobType: "",
    customerPo: "",
    internalNotes: "",
    scopeOfWork: "",
    teamId: null as number | null,
  };
}

export default function EstimatingList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdminOrManager = user && ["super_admin", "admin", "manager"].includes(user.role ?? "");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null);
  const [form, setForm] = useState(emptyForm());

  const { data: opps = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities"],
  });

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: buildings = [] } = useQuery<any[]>({
    queryKey: ["/api/contact-buildings"],
    enabled: showCreate,
  });

  const { data: teamUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: showCreate,
  });

  const { data: buildopsJobTypes = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/estimating/job-types"],
    enabled: showCreate,
    staleTime: 10 * 60 * 1000,
  });

  const { data: teamsList = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/teams"],
    enabled: !!isAdminOrManager && showCreate,
  });

  const jobTypeOptions = buildopsJobTypes.length > 0
    ? buildopsJobTypes.map((jt) => jt.name)
    : JOB_TYPES;

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/opportunities", body),
    onSuccess: async (res) => {
      const opp = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      setShowCreate(false);
      setForm(emptyForm());
      toast({ title: "Opportunity created" });
      navigate(`/estimating/${opp.id}`);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/opportunities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      setDeleteTarget(null);
      toast({ title: "Deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = opps.filter((o) => {
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const kpis = {
    total: opps.length,
    draft: opps.filter((o) => o.status === "draft").length,
    inReview: opps.filter((o) => o.status === "in_review").length,
    approved: opps.filter((o) => o.status === "approved").length,
  };

  function toggleServiceLine(sl: string) {
    setForm((f) => ({
      ...f,
      serviceLines: f.serviceLines.includes(sl)
        ? f.serviceLines.filter((x) => x !== sl)
        : [...f.serviceLines, sl],
    }));
  }

  function addCustomServiceLine() {
    const val = form.customServiceLine.trim();
    if (!val) return;
    if (!form.serviceLines.includes(val)) {
      setForm((f) => ({ ...f, serviceLines: [...f.serviceLines, val], customServiceLine: "" }));
    } else {
      setForm((f) => ({ ...f, customServiceLine: "" }));
    }
  }

  function removeServiceLine(sl: string) {
    setForm((f) => ({ ...f, serviceLines: f.serviceLines.filter((x) => x !== sl) }));
  }

  function noneToEmpty(val: string) { return val === "__none__" ? "" : val; }

  function handleSubmit() {
    const payload: Record<string, any> = {
      name: form.name.trim(),
      mode: form.mode,
      serviceLines: form.serviceLines,
      scopeOfWork: form.scopeOfWork || null,
      internalNotes: form.internalNotes || null,
      jobType: noneToEmpty(form.jobType) || null,
      customerPo: form.customerPo || null,
    };
    const cid = noneToEmpty(form.clientId);
    const bid = noneToEmpty(form.buildingId);
    const pm = noneToEmpty(form.projectManagerId);
    const am = noneToEmpty(form.accountManagerId);
    const sb = noneToEmpty(form.soldById);
    if (cid) payload.clientId = parseInt(cid);
    if (bid) payload.buildingId = parseInt(bid);
    if (pm) payload.projectManagerId = pm;
    if (am) payload.accountManagerId = am;
    if (sb) payload.soldById = sb;
    if (form.teamId) payload.teamId = form.teamId;
    createMut.mutate(payload);
  }

  // Filter buildings by selected client
  const activeClientId = noneToEmpty(form.clientId);
  const filteredBuildings = activeClientId
    ? buildings.filter((b: any) => String(b.clientId) === activeClientId || String(b.client_id) === activeClientId)
    : buildings;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Estimating &amp; Quoting</h1>
            <p className="text-sm text-muted-foreground mt-0.5">AI-assisted estimates and quotes for facility services</p>
          </div>
          <Button data-testid="button-new-opportunity" onClick={() => setShowCreate(true)} size="sm" className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> New Opportunity
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",     value: kpis.total,    icon: FileText,      color: "text-foreground" },
            { label: "Draft",     value: kpis.draft,    icon: Clock,         color: "text-amber-600" },
            { label: "In Review", value: kpis.inReview, icon: AlertCircle,   color: "text-blue-600" },
            { label: "Approved",  value: kpis.approved, icon: CheckCircle2,  color: "text-green-600" },
          ].map((k) => (
            <Card key={k.label} className="border bg-card">
              <CardContent className="p-4 flex items-center gap-3">
                <k.icon className={`h-5 w-5 shrink-0 ${k.color}`} />
                <div>
                  <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              data-testid="input-search-opportunities"
              placeholder="Search opportunities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="select-status-filter" className="w-full sm:w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="synced">Synced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">No opportunities yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first estimate or quote to get started</p>
            <Button data-testid="button-create-first-opportunity" className="mt-4 gap-1.5" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> New Opportunity
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((opp) => (
              <div
                key={opp.id}
                data-testid={`card-opportunity-${opp.id}`}
                className="group relative bg-card border rounded-xl px-4 py-3 flex items-center gap-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => navigate(`/estimating/${opp.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{opp.name}</span>
                    <ModeBadge mode={opp.mode} />
                    <StatusBadge status={opp.status} />
                  </div>
                  {opp.scopeOfWork && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{opp.scopeOfWork}</p>
                  )}
                  {opp.serviceLines && opp.serviceLines.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {opp.serviceLines.slice(0, 4).map((sl) => (
                        <Badge key={sl} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{sl}</Badge>
                      ))}
                      {opp.serviceLines.length > 4 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">+{opp.serviceLines.length - 4}</Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    data-testid={`button-edit-opportunity-${opp.id}`}
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); navigate(`/estimating/${opp.id}`); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    data-testid={`button-delete-opportunity-${opp.id}`}
                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(opp); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog — BuildOps-style quote creation flow */}
      <Dialog open={showCreate} onOpenChange={(v) => { setShowCreate(v); if (!v) setForm(emptyForm()); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Opportunity</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Row 1: Name + Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="opp-name">Opportunity Name *</Label>
                <Input
                  id="opp-name"
                  data-testid="input-opportunity-name"
                  placeholder="e.g. HVAC Replacement — 123 Main St"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.mode} onValueChange={(v) => setForm((f) => ({ ...f, mode: v }))}>
                  <SelectTrigger data-testid="select-opportunity-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estimate">Estimate</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Row 2: Customer + Property */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <SearchableCombo
                  testId="select-opportunity-client"
                  value={form.clientId}
                  onValueChange={(v) => setForm((f) => ({ ...f, clientId: v, buildingId: "" }))}
                  placeholder="Select customer..."
                  options={[
                    { value: "__none__", label: "No customer" },
                    ...clients.map((c: any) => ({
                      value: String(c.id),
                      label: c.name || c.companyName || `Client #${c.id}`,
                    })),
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Property / Location</Label>
                <SearchableCombo
                  testId="select-opportunity-building"
                  value={form.buildingId}
                  onValueChange={(v) => setForm((f) => ({ ...f, buildingId: v }))}
                  placeholder="Select property..."
                  disabled={!form.clientId && filteredBuildings.length === 0}
                  options={[
                    { value: "__none__", label: "No property" },
                    ...filteredBuildings.map((b: any) => ({
                      value: String(b.id),
                      label: b.name || b.buildingName || b.address || `Property #${b.id}`,
                    })),
                  ]}
                />
              </div>
            </div>

            {/* Row 3: Job Type + Customer PO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Job Type</Label>
                <SearchableCombo
                  testId="select-opportunity-job-type"
                  value={form.jobType}
                  onValueChange={(v) => setForm((f) => ({ ...f, jobType: v }))}
                  placeholder="Select job type..."
                  options={[
                    { value: "__none__", label: "None" },
                    ...jobTypeOptions.map((jt) => ({ value: jt, label: jt })),
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="opp-customer-po">Customer PO</Label>
                <Input
                  id="opp-customer-po"
                  data-testid="input-opportunity-customer-po"
                  placeholder="PO number (optional)"
                  value={form.customerPo}
                  onChange={(e) => setForm((f) => ({ ...f, customerPo: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            {/* Row 4: Service Lines */}
            <div className="space-y-2">
              <Label>Department / Service Lines</Label>
              {/* Selected chips */}
              {form.serviceLines.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {form.serviceLines.map((sl) => (
                    <span
                      key={sl}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground"
                    >
                      {sl}
                      <button
                        type="button"
                        data-testid={`remove-service-line-${sl.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        onClick={() => removeServiceLine(sl)}
                        className="hover:opacity-70 transition-opacity ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Preset chips */}
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SERVICE_LINES.map((sl) => (
                  <button
                    key={sl}
                    data-testid={`toggle-service-line-${sl.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    type="button"
                    disabled={form.serviceLines.includes(sl)}
                    onClick={() => toggleServiceLine(sl)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.serviceLines.includes(sl)
                        ? "opacity-40 cursor-default bg-primary/10 border-primary/20 text-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {sl}
                  </button>
                ))}
              </div>
              {/* Custom service line */}
              <div className="flex gap-2 mt-1">
                <Input
                  data-testid="input-custom-service-line"
                  placeholder="Add custom service line..."
                  value={form.customServiceLine}
                  onChange={(e) => setForm((f) => ({ ...f, customServiceLine: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomServiceLine(); } }}
                  className="h-8 text-sm"
                />
                <Button
                  data-testid="button-add-custom-service-line"
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={addCustomServiceLine}
                  disabled={!form.customServiceLine.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            <Separator />

            {/* Row 5: Managers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { key: "projectManagerId", label: "Project Manager", testId: "select-opportunity-project-manager" },
                { key: "accountManagerId", label: "Account Manager", testId: "select-opportunity-account-manager" },
                { key: "soldById",         label: "Sold By",         testId: "select-opportunity-sold-by" },
              ] as { key: "projectManagerId" | "accountManagerId" | "soldById"; label: string; testId: string }[]).map(({ key, label, testId }) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <SearchableCombo
                    testId={testId}
                    value={form[key]}
                    onValueChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    placeholder="Select..."
                    options={[
                      { value: "__none__", label: "Unassigned" },
                      ...teamUsers.map((u: any) => ({
                        value: String(u.id),
                        label: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : (u.email || String(u.id)),
                        sub: u.firstName && u.lastName ? u.email : undefined,
                      })),
                    ]}
                  />
                </div>
              ))}
            </div>

            <Separator />

            {/* Row 6: Team assignment (admin/manager only) */}
            {isAdminOrManager && teamsList.length > 0 && (
              <div className="space-y-1.5">
                <Label>Team <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                <Select value={form.teamId != null ? String(form.teamId) : "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, teamId: v === "__none__" ? null : parseInt(v) }))}>
                  <SelectTrigger data-testid="select-opportunity-team">
                    <SelectValue placeholder="No team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— No Team —</SelectItem>
                    {teamsList.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Separator />

            {/* Row 7: Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="opp-notes">Internal Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Textarea
                id="opp-notes"
                data-testid="textarea-opportunity-notes"
                placeholder="Internal notes visible only to your team (scope of work can be added after the site walk)..."
                value={form.internalNotes}
                onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value }))}
                className="resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowCreate(false); setForm(emptyForm()); }}>
              Cancel
            </Button>
            <Button
              data-testid="button-create-opportunity-submit"
              disabled={!form.name.trim() || createMut.isPending}
              onClick={handleSubmit}
            >
              {createMut.isPending ? "Creating..." : "Create & Open Workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Opportunity</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also delete all lines, sections, and history.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              data-testid="button-confirm-delete-opportunity"
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
