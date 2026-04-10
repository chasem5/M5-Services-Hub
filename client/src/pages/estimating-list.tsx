import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Search, FileText, DollarSign, Clock, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, ChevronRight, Pencil, Trash2,
} from "lucide-react";
import type { Opportunity } from "@shared/schema";

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

const SERVICE_LINE_OPTIONS = [
  "HVAC", "Electrical", "Plumbing", "Fire & Life Safety", "Building Automation",
  "Mechanical", "Energy", "Janitorial", "Landscaping", "General",
];

export default function EstimatingList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null);
  const [form, setForm] = useState({
    name: "", mode: "estimate", scopeOfWork: "", serviceLines: [] as string[],
  });

  const { data: opps = [], isLoading } = useQuery<Opportunity[]>({
    queryKey: ["/api/opportunities"],
  });

  const createMut = useMutation({
    mutationFn: (body: any) => apiRequest("POST", "/api/opportunities", body),
    onSuccess: async (res) => {
      const opp = await res.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      setShowCreate(false);
      setForm({ name: "", mode: "estimate", scopeOfWork: "", serviceLines: [] });
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                data-testid="input-opportunity-name"
                placeholder="e.g. HVAC Replacement — 123 Main St"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm((f) => ({ ...f, mode: v }))}>
                <SelectTrigger data-testid="select-opportunity-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estimate">Estimate (internal costing)</SelectItem>
                  <SelectItem value="quote">Quote (customer-facing)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Scope of Work</Label>
              <Input
                data-testid="input-opportunity-scope"
                placeholder="Brief description of work..."
                value={form.scopeOfWork}
                onChange={(e) => setForm((f) => ({ ...f, scopeOfWork: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Service Lines</Label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_LINE_OPTIONS.map((sl) => (
                  <button
                    key={sl}
                    data-testid={`toggle-service-line-${sl.toLowerCase().replace(/\s+/g, '-')}`}
                    type="button"
                    onClick={() => toggleServiceLine(sl)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.serviceLines.includes(sl)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {sl}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              data-testid="button-create-opportunity-submit"
              disabled={!form.name.trim() || createMut.isPending}
              onClick={() => createMut.mutate(form)}
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
