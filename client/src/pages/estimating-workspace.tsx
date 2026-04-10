import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Plus, Trash2, Sparkles, Send, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Loader2, Clock, Info, BookOpen, Search, Database,
  FileText, Wand2, User, Building2, Phone, Mail, MapPin, ExternalLink, Hash,
} from "lucide-react";
import type { Opportunity, WorkspaceLine, BtlFee, AiRecommendation, WorkspaceCatalogItem } from "@shared/schema";

const LINE_TYPES = ["labor", "material", "equipment", "subcontract", "fee"];

function fmt(n: number | string | null | undefined, decimals = 2) {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return isNaN(v) ? "0.00" : v.toFixed(decimals);
}

function calcLine(line: WorkspaceLine, laborRate: number) {
  const baseLaborHrs = parseFloat(line.baseLaborHours as unknown as string) || 0;
  const baseMat = parseFloat(line.baseMaterialCost as unknown as string) || 0;
  const bufPct = parseFloat(line.laborBufferPct as unknown as string) || 0;
  const wastePct = parseFloat(line.materialWastePct as unknown as string) || 0;
  const diffPct = parseFloat(line.difficultyPct as unknown as string) || 0;
  const marginPct = parseFloat(line.marginPct as unknown as string) || 30;

  const bufferedLaborHrs = baseLaborHrs * (1 + bufPct / 100) * (1 + diffPct / 100);
  const bufferedLaborCost = bufferedLaborHrs * laborRate;
  const bufferedMat = baseMat * (1 + wastePct / 100);
  const directCost = bufferedLaborCost + bufferedMat;
  const price = marginPct < 100 ? directCost / (1 - marginPct / 100) : directCost;
  const margin = price - directCost;

  return { bufferedLaborHrs, bufferedLaborCost, bufferedMat, directCost, price, margin };
}

function calcBtl(subtotal: number, fees: BtlFee[]) {
  let total = subtotal;
  const applied: Array<{ fee: BtlFee; amount: number }> = [];
  for (const fee of fees) {
    if (!fee.enabled) continue;
    const val = parseFloat(fee.value as unknown as string) || 0;
    const amount = fee.feeType === "pct" ? subtotal * (val / 100) : val;
    applied.push({ fee, amount });
    total += amount;
  }
  return { total, applied };
}

interface LineRowProps {
  line: WorkspaceLine;
  laborRate: number;
  onUpdate: (id: number, data: Partial<WorkspaceLine>) => void;
  onDelete: (id: number) => void;
}

function LineRow({ line, laborRate, onUpdate, onDelete }: LineRowProps) {
  const [expanded, setExpanded] = useState(false);
  const calc = calcLine(line, laborRate);

  return (
    <div className="border rounded-lg bg-card" data-testid={`row-line-${line.id}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((e) => !e)}
          data-testid={`button-expand-line-${line.id}`}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        <Input
          data-testid={`input-line-description-${line.id}`}
          value={line.description}
          onChange={(e) => onUpdate(line.id, { description: e.target.value })}
          className="h-7 text-sm flex-1 border-0 shadow-none px-1 focus-visible:ring-1"
          placeholder="Line description"
        />

        <Select
          value={line.lineType}
          onValueChange={(v) => onUpdate(line.id, { lineType: v })}
        >
          <SelectTrigger data-testid={`select-line-type-${line.id}`} className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LINE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="text-xs font-mono text-right w-20 shrink-0 text-muted-foreground">
          ${fmt(calc.price)}
        </div>

        <Button
          data-testid={`button-delete-line-${line.id}`}
          variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(line.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="border-t px-3 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Labor Hrs</Label>
            <Input
              data-testid={`input-base-labor-hours-${line.id}`}
              type="number" min="0" step="0.5"
              value={line.baseLaborHours as unknown as string}
              onChange={(e) => onUpdate(line.id, { baseLaborHours: e.target.value as any })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Material $</Label>
            <Input
              data-testid={`input-base-material-cost-${line.id}`}
              type="number" min="0" step="10"
              value={line.baseMaterialCost as unknown as string}
              onChange={(e) => onUpdate(line.id, { baseMaterialCost: e.target.value as any })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Labor Buf %</Label>
            <Input
              data-testid={`input-labor-buffer-pct-${line.id}`}
              type="number" min="0" max="100"
              value={line.laborBufferPct as unknown as string}
              onChange={(e) => onUpdate(line.id, { laborBufferPct: e.target.value as any })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Mat Waste %</Label>
            <Input
              data-testid={`input-material-waste-pct-${line.id}`}
              type="number" min="0" max="100"
              value={line.materialWastePct as unknown as string}
              onChange={(e) => onUpdate(line.id, { materialWastePct: e.target.value as any })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Difficulty %</Label>
            <Input
              data-testid={`input-difficulty-pct-${line.id}`}
              type="number" min="0" max="100"
              value={line.difficultyPct as unknown as string}
              onChange={(e) => onUpdate(line.id, { difficultyPct: e.target.value as any })}
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Margin %</Label>
            <Input
              data-testid={`input-margin-pct-${line.id}`}
              type="number" min="0" max="99"
              value={line.marginPct as unknown as string}
              onChange={(e) => onUpdate(line.id, { marginPct: e.target.value as any })}
              className="h-7 text-xs"
            />
          </div>

          {/* Calculated display */}
          <div className="col-span-full grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2 border-t text-xs text-muted-foreground">
            <div><span className="font-medium text-foreground">{fmt(calc.bufferedLaborHrs, 1)} hrs</span><br />buffered labor</div>
            <div><span className="font-medium text-foreground">${fmt(calc.bufferedLaborCost)}</span><br />labor cost</div>
            <div><span className="font-medium text-foreground">${fmt(calc.bufferedMat)}</span><br />material cost</div>
            <div><span className="font-medium text-foreground">${fmt(calc.directCost)}</span><br />direct cost</div>
            <div><span className="font-medium text-green-600">${fmt(calc.margin)}</span><br />margin $</div>
            <div><span className="font-bold text-foreground">${fmt(calc.price)}</span><br />price</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EstimatingWorkspace() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const oppId = parseInt(params.id);

  const [aiOpen, setAiOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncLabel, setSyncLabel] = useState("");
  const [showApprove, setShowApprove] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [laborRate, setLaborRate] = useState(95);
  const [pendingLineUpdates, setPendingLineUpdates] = useState<Record<number, any>>({});
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<string>("all");
  const [scopeText, setScopeText] = useState<string | null>(null);
  const [scopeSaving, setScopeSaving] = useState(false);
  const [customerPanelOpen, setCustomerPanelOpen] = useState(true);

  const { data: opp, isLoading: oppLoading } = useQuery<Opportunity>({
    queryKey: ["/api/opportunities", oppId],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${oppId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    retry: false,
  });

  const { data: lines = [], isLoading: linesLoading } = useQuery<WorkspaceLine[]>({
    queryKey: ["/api/opportunities", oppId, "lines"],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${oppId}/lines`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: btlFees = [] } = useQuery<BtlFee[]>({
    queryKey: ["/api/opportunities", oppId, "btl-fees"],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${oppId}/btl-fees`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: aiRecs = [] } = useQuery<AiRecommendation[]>({
    queryKey: ["/api/opportunities", oppId, "ai-recs"],
    queryFn: async () => {
      const res = await fetch(`/api/opportunities/${oppId}/ai-recs`, { credentials: "include" });
      return res.json();
    },
  });

  const { data: bufferRules } = useQuery<any>({
    queryKey: ["/api/estimating/buffer-rules"],
  });

  const { data: clientData } = useQuery<any>({
    queryKey: ["/api/clients", opp?.clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${opp!.clientId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!opp?.clientId,
  });

  const { data: buildingData } = useQuery<any>({
    queryKey: ["/api/contact-buildings", opp?.buildingId],
    queryFn: async () => {
      const res = await fetch(`/api/contact-buildings`, { credentials: "include" });
      if (!res.ok) return null;
      const all = await res.json();
      return all.find((b: any) => b.id === opp!.buildingId) ?? null;
    },
    enabled: !!opp?.buildingId,
  });

  const { data: catalogItems = [], isLoading: catalogLoading, refetch: refetchCatalog } = useQuery<WorkspaceCatalogItem[]>({
    queryKey: ["/api/estimating/catalog", catalogSearch, catalogTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (catalogSearch) params.set("search", catalogSearch);
      const res = await fetch(`/api/estimating/catalog?${params}`, { credentials: "include" });
      return res.json();
    },
    enabled: showCatalog,
  });

  useEffect(() => {
    if (bufferRules?.laborRate) setLaborRate(parseFloat(bufferRules.laborRate));
  }, [bufferRules]);

  useEffect(() => {
    if (opp && scopeText === null) setScopeText(opp.scopeOfWork ?? "");
  }, [opp]);

  const saveScopeMut = useMutation({
    mutationFn: (text: string) => apiRequest("PATCH", `/api/opportunities/${oppId}`, { scopeOfWork: text || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", oppId] });
      setScopeSaving(false);
    },
    onError: () => setScopeSaving(false),
  });

  const aiScopeMut = useMutation({
    mutationFn: ({ mode }: { mode: "generate" | "improve" }) =>
      apiRequest("POST", `/api/opportunities/${oppId}/ai-scope`, { mode, existing: scopeText }),
    onSuccess: async (res) => {
      const data = await res.json();
      if (data.scope) setScopeText(data.scope);
    },
    onError: (e: any) => toast({ title: "AI scope failed", description: e.message, variant: "destructive" }),
  });

  const updateOppMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", `/api/opportunities/${oppId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/opportunities", oppId] }),
  });

  const addLineMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/opportunities/${oppId}/lines`, {
      description: "New line item",
      lineType: "labor",
      baseLaborHours: "0",
      baseMaterialCost: "0",
      laborBufferPct: bufferRules?.defaultLaborBufferPct ?? "10",
      materialWastePct: bufferRules?.defaultMaterialWastePct ?? "5",
      difficultyPct: "0",
      marginPct: bufferRules?.defaultMarginPct ?? "30",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", oppId, "lines"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateLineMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/lines/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/opportunities", oppId, "lines"] }),
  });

  const deleteLineMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/lines/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/opportunities", oppId, "lines"] }),
  });

  const addFromCatalogMut = useMutation({
    mutationFn: (item: WorkspaceCatalogItem) => {
      const unitCost = parseFloat(item.unitCost as unknown as string) || 0;
      const lineType = item.lineType ?? "material";
      return apiRequest("POST", `/api/opportunities/${oppId}/lines`, {
        description: item.name,
        lineType,
        baseLaborHours: lineType === "labor" ? "1" : "0",
        baseMaterialCost: String(unitCost),
        laborBufferPct: item.defaultLaborBufferPct ?? bufferRules?.defaultLaborBufferPct ?? "10",
        materialWastePct: item.defaultMaterialWastePct ?? bufferRules?.defaultMaterialWastePct ?? "5",
        difficultyPct: "0",
        marginPct: item.defaultMarginPct ?? bufferRules?.defaultMarginPct ?? "30",
        buildopsItemId: item.buildopsItemId ?? null,
        unitPrice: item.unitPrice ?? null,
        quantity: "1",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", oppId, "lines"] });
      setShowCatalog(false);
      toast({ title: "Line added from catalog" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const syncCatalogMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/estimating/catalog/sync", {}),
    onSuccess: async (res) => {
      const data = await res.json();
      await refetchCatalog();
      toast({ title: `Catalog synced from BuildOps`, description: `${data.created} new, ${data.updated} updated (${data.total} total items)` });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  const upsertBtlFeesMut = useMutation({
    mutationFn: (fees: any[]) => apiRequest("PUT", `/api/opportunities/${oppId}/btl-fees`, { fees }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/opportunities", oppId, "btl-fees"] }),
  });

  const aiAnalyzeMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/opportunities/${oppId}/ai-analyze`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", oppId, "ai-recs"] });
      setAiOpen(true);
      toast({ title: "AI analysis complete" });
    },
    onError: (e: any) => toast({ title: "AI Error", description: e.message, variant: "destructive" }),
  });

  const syncMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/opportunities/${oppId}/sync`, { versionLabel: syncLabel || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", oppId] });
      setSyncOpen(false);
      setSyncLabel("");
      toast({ title: "Synced successfully", description: "Opportunity submitted for review." });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  const approveMut = useMutation({
    mutationFn: (status: "approved" | "rejected") =>
      apiRequest("PATCH", `/api/opportunities/${oppId}`, { status, approvalNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities", oppId] });
      setShowApprove(false);
      setApprovalNote("");
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Debounced line update
  function handleLineUpdate(id: number, data: Partial<WorkspaceLine>) {
    setPendingLineUpdates((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...data } }));
    // Update local optimistically
    queryClient.setQueryData(["/api/opportunities", oppId, "lines"], (old: WorkspaceLine[] | undefined) =>
      (old ?? []).map((l) => l.id === id ? { ...l, ...data } : l)
    );
    // Debounce actual save
    clearTimeout((window as any)[`lineTimer_${id}`]);
    (window as any)[`lineTimer_${id}`] = setTimeout(() => {
      updateLineMut.mutate({ id, data });
    }, 800);
  }

  function addBtlFee() {
    const newFee = {
      opportunityId: oppId,
      name: "New Fee",
      feeType: "pct",
      value: "0",
      enabled: true,
    };
    upsertBtlFeesMut.mutate([...btlFees, newFee as any]);
  }

  function updateBtlFee(idx: number, data: Partial<BtlFee>) {
    const updated = btlFees.map((f, i) => i === idx ? { ...f, ...data } : f);
    upsertBtlFeesMut.mutate(updated as any[]);
  }

  function removeBtlFee(idx: number) {
    upsertBtlFeesMut.mutate(btlFees.filter((_, i) => i !== idx) as any[]);
  }

  // Totals
  const subtotal = lines.reduce((sum, l) => sum + calcLine(l, laborRate).price, 0);
  const { total, applied: btlApplied } = calcBtl(subtotal, btlFees);

  const latestAiRec = aiRecs[0];
  const analysis = latestAiRec?.content as any;

  if (oppLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!opp) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Opportunity not found.</p>
        <Button variant="outline" onClick={() => navigate("/estimating")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to list
        </Button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    in_review: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    synced: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            data-testid="button-back-to-estimating"
            variant="ghost" size="icon" className="h-8 w-8 shrink-0"
            onClick={() => navigate("/estimating")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold truncate">{opp.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[opp.status] ?? "bg-gray-100 text-gray-700"}`}>
                {opp.status.replace("_", " ")}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700">
                {opp.mode}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              data-testid="button-ai-analyze"
              variant="outline" size="sm"
              disabled={aiAnalyzeMut.isPending}
              onClick={() => aiAnalyzeMut.mutate()}
              className="gap-1.5 text-xs"
            >
              {aiAnalyzeMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-purple-500" />}
              AI Analyze
            </Button>
            {opp.status === "in_review" && (
              <Button
                data-testid="button-approve-reject"
                variant="outline" size="sm"
                onClick={() => setShowApprove(true)}
                className="gap-1.5 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Review
              </Button>
            )}
            <Button
              data-testid="button-sync-opportunity"
              size="sm"
              disabled={syncMut.isPending || opp.status === "approved"}
              onClick={() => setSyncOpen(true)}
              className="gap-1.5 text-xs"
            >
              {syncMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Submit
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] h-full divide-y lg:divide-y-0 lg:divide-x">
          {/* Left: Line Items */}
          <div className="p-4 sm:p-6 space-y-4 overflow-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Line Items</h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Labor rate</span>
                  <div className="flex items-center gap-0.5">
                    <span className="text-muted-foreground">$</span>
                    <input
                      data-testid="input-labor-rate"
                      type="number" min="50" max="300" step="5"
                      value={laborRate}
                      onChange={(e) => setLaborRate(parseFloat(e.target.value) || 95)}
                      className="w-14 h-6 text-xs border rounded px-1 bg-background"
                    />
                    <span className="text-muted-foreground">/hr</span>
                  </div>
                </div>
                <Button
                  data-testid="button-browse-catalog"
                  size="sm" variant="outline"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => setShowCatalog(true)}
                >
                  <BookOpen className="h-3.5 w-3.5" /> Catalog
                </Button>
                <Button
                  data-testid="button-add-line"
                  size="sm" variant="outline"
                  className="gap-1.5 text-xs h-7"
                  disabled={addLineMut.isPending}
                  onClick={() => addLineMut.mutate()}
                >
                  <Plus className="h-3.5 w-3.5" /> Blank Line
                </Button>
              </div>
            </div>

            {linesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
              </div>
            ) : lines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed rounded-xl text-center">
                <Info className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No line items yet</p>
                <Button
                  data-testid="button-add-first-line"
                  className="mt-3 gap-1.5 text-xs" size="sm" variant="outline"
                  onClick={() => addLineMut.mutate()}
                >
                  <Plus className="h-3.5 w-3.5" /> Add First Line
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {lines.map((line) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    laborRate={laborRate}
                    onUpdate={handleLineUpdate}
                    onDelete={(id) => deleteLineMut.mutate(id)}
                  />
                ))}
              </div>
            )}

            {/* Below-the-line fees */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Below-the-Line Fees</h3>
                <Button
                  data-testid="button-add-btl-fee"
                  size="sm" variant="ghost"
                  className="gap-1.5 text-xs h-6"
                  onClick={addBtlFee}
                >
                  <Plus className="h-3 w-3" /> Add Fee
                </Button>
              </div>
              {btlFees.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No below-the-line fees. Add profit, insurance, or flat fees here.</p>
              ) : (
                <div className="space-y-2">
                  {btlFees.map((fee, idx) => (
                    <div key={idx} className="flex items-center gap-2" data-testid={`row-btl-fee-${idx}`}>
                      <Switch
                        data-testid={`switch-btl-fee-${idx}`}
                        checked={fee.enabled}
                        onCheckedChange={(v) => updateBtlFee(idx, { enabled: v })}
                        className="scale-75"
                      />
                      <Input
                        data-testid={`input-btl-fee-name-${idx}`}
                        value={fee.name}
                        onChange={(e) => updateBtlFee(idx, { name: e.target.value })}
                        className="h-7 text-xs flex-1 border-0 shadow-none px-1 focus-visible:ring-1"
                      />
                      <Select
                        value={fee.feeType}
                        onValueChange={(v) => updateBtlFee(idx, { feeType: v })}
                      >
                        <SelectTrigger data-testid={`select-btl-fee-type-${idx}`} className="h-7 w-20 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pct">%</SelectItem>
                          <SelectItem value="fixed">Fixed $</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        data-testid={`input-btl-fee-value-${idx}`}
                        type="number" min="0"
                        value={fee.value as unknown as string}
                        onChange={(e) => updateBtlFee(idx, { value: e.target.value as any })}
                        className="h-7 text-xs w-20"
                      />
                      <Button
                        data-testid={`button-remove-btl-fee-${idx}`}
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeBtlFee(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totals */}
            <Separator />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">${fmt(subtotal)}</span>
              </div>
              {btlApplied.map(({ fee, amount }) => (
                <div key={fee.name} className="flex justify-between text-muted-foreground text-xs">
                  <span>{fee.name} ({fee.feeType === "pct" ? `${fee.value}%` : "flat"})</span>
                  <span className="font-mono">+${fmt(amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span>Total</span>
                <span data-testid="text-grand-total" className="font-mono text-green-600">${fmt(total)}</span>
              </div>
            </div>

            {/* Scope of Work */}
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Scope of Work</h2>
                  {scopeSaving && <span className="text-[10px] text-muted-foreground">Saving…</span>}
                  {saveScopeMut.isSuccess && !scopeSaving && (
                    <span className="text-[10px] text-green-600 flex items-center gap-0.5">
                      <CheckCircle2 className="h-3 w-3" /> Saved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    data-testid="button-ai-improve-scope"
                    size="sm" variant="outline"
                    className="gap-1.5 text-xs h-7"
                    disabled={aiScopeMut.isPending || !scopeText?.trim()}
                    onClick={() => aiScopeMut.mutate({ mode: "improve" })}
                  >
                    {aiScopeMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3 text-purple-500" />}
                    Improve
                  </Button>
                  <Button
                    data-testid="button-ai-generate-scope"
                    size="sm" variant="outline"
                    className="gap-1.5 text-xs h-7"
                    disabled={aiScopeMut.isPending}
                    onClick={() => aiScopeMut.mutate({ mode: "generate" })}
                  >
                    {aiScopeMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-purple-500" />}
                    Generate
                  </Button>
                </div>
              </div>

              {aiScopeMut.isPending && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" />
                  AI is writing scope of work…
                </div>
              )}

              <Textarea
                data-testid="textarea-scope-of-work"
                placeholder="Describe the scope of work to be performed. This will appear on the customer-facing quote or estimate. Use 'Generate' to create one from your line items, or 'Improve' to polish existing text."
                value={scopeText ?? ""}
                onChange={(e) => setScopeText(e.target.value)}
                onBlur={() => {
                  if (scopeText !== (opp?.scopeOfWork ?? "")) {
                    setScopeSaving(true);
                    saveScopeMut.mutate(scopeText ?? "");
                  }
                }}
                className="resize-none text-sm min-h-[120px]"
                rows={5}
              />
              <p className="text-[11px] text-muted-foreground">
                Scope saves automatically when you click away. Use AI to generate from line items or refine your existing text.
              </p>
            </div>
          </div>

          {/* Right: Customer Info + AI Panel */}
          <div className="p-4 sm:p-6 space-y-4 bg-muted/20 overflow-auto">

            {/* Customer Info Card */}
            <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
              <button
                data-testid="button-toggle-customer-panel"
                type="button"
                onClick={() => setCustomerPanelOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold">
                    {clientData?.name || clientData?.companyName || (opp?.clientId ? "Customer" : "No Customer")}
                  </span>
                </div>
                {customerPanelOpen
                  ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                }
              </button>

              {customerPanelOpen && (
                <div className="border-t px-3 py-3 space-y-3 text-xs">
                  {!opp?.clientId ? (
                    <p className="text-muted-foreground italic">No customer linked to this opportunity.</p>
                  ) : clientData ? (
                    <>
                      {/* Customer core info */}
                      <div className="space-y-1.5">
                        <a
                          href={`/clients/${clientData.id}`}
                          data-testid="link-customer-detail"
                          className="font-semibold text-sm text-foreground hover:text-primary flex items-center gap-1 transition-colors"
                          target="_blank" rel="noreferrer"
                        >
                          {clientData.name || clientData.companyName}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                        {clientData.customerType && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium">
                            {clientData.customerType}
                          </span>
                        )}
                      </div>

                      {/* Contact details */}
                      <div className="space-y-1">
                        {(clientData.phonePrimary || clientData.phone) && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <a href={`tel:${clientData.phonePrimary || clientData.phone}`} className="hover:text-foreground transition-colors">
                              {clientData.phonePrimary || clientData.phone}
                            </a>
                          </div>
                        )}
                        {clientData.email && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <a href={`mailto:${clientData.email}`} className="hover:text-foreground transition-colors truncate">
                              {clientData.email}
                            </a>
                          </div>
                        )}
                        {(clientData.address || clientData.billingAddress) && (
                          <div className="flex items-start gap-1.5 text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>{clientData.address || clientData.billingAddress}</span>
                          </div>
                        )}
                      </div>

                      {/* Property */}
                      {buildingData && (
                        <div className="pt-1 border-t space-y-1">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Property</p>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-medium text-foreground">
                              {buildingData.name || buildingData.buildingName || "Property"}
                            </span>
                          </div>
                          {(buildingData.address || buildingData.streetAddress) && (
                            <div className="flex items-start gap-1.5 text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                              <span>
                                {[buildingData.address || buildingData.streetAddress, buildingData.city, buildingData.state, buildingData.zip]
                                  .filter(Boolean).join(", ")}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quote details from opportunity */}
                      <div className="pt-1 border-t space-y-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Quote Details</p>
                        {opp?.customerPo && (
                          <div className="flex items-center gap-1.5">
                            <Hash className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">PO:</span>
                            <span className="font-medium font-mono">{opp.customerPo}</span>
                          </div>
                        )}
                        {opp?.jobType && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Job type:</span>
                            <span className="font-medium">{opp.jobType}</span>
                          </div>
                        )}
                        {Array.isArray(opp?.serviceLines) && opp.serviceLines.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-muted-foreground">Service lines:</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {(opp.serviceLines as string[]).map((sl) => (
                                <span key={sl} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">{sl}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground py-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading customer…
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <h2 className="text-sm font-semibold">AI Insights</h2>
            </div>

            {!latestAiRec ? (
              <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed rounded-xl">
                <Sparkles className="h-8 w-8 text-purple-300 mb-3" />
                <p className="text-xs text-muted-foreground">Run AI analysis to get scope risk alerts, margin insights, and missing item suggestions.</p>
                <Button
                  data-testid="button-run-ai-analysis"
                  className="mt-3 gap-1.5 text-xs" size="sm"
                  disabled={aiAnalyzeMut.isPending}
                  onClick={() => aiAnalyzeMut.mutate()}
                >
                  {aiAnalyzeMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Analyze Now
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {new Date(latestAiRec.createdAt).toLocaleString()}
                  </p>
                  <Button
                    data-testid="button-refresh-ai-analysis"
                    variant="ghost" size="icon" className="h-6 w-6"
                    disabled={aiAnalyzeMut.isPending}
                    onClick={() => aiAnalyzeMut.mutate()}
                  >
                    {aiAnalyzeMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  </Button>
                </div>

                {/* Scope Risks */}
                {analysis?.scopeRisks?.length > 0 && (
                  <Card className="border-orange-200 dark:border-orange-900/30">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" /> Scope Risks ({analysis.scopeRisks.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-2">
                      {analysis.scopeRisks.map((r: any, i: number) => (
                        <div key={i} data-testid={`ai-scope-risk-${i}`} className="text-xs">
                          <span className={`font-medium ${r.severity === "high" ? "text-red-600" : r.severity === "medium" ? "text-orange-600" : "text-yellow-600"}`}>
                            [{r.severity}]
                          </span>{" "}
                          <span className="text-foreground">{r.issue}</span>
                          <p className="text-muted-foreground mt-0.5">{r.recommendation}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Margin Insights */}
                {analysis?.marginInsights && (
                  <Card className="border-blue-200 dark:border-blue-900/30">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-400">Margin Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 text-xs space-y-1">
                      <p data-testid="ai-margin-assessment" className="text-foreground">{analysis.marginInsights.assessment}</p>
                      <p className="text-muted-foreground">{analysis.marginInsights.suggestion}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Missing Items */}
                {analysis?.missingItems?.length > 0 && (
                  <Card className="border-yellow-200 dark:border-yellow-900/30">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">Possible Missing Items</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 space-y-2">
                      {analysis.missingItems.map((item: any, i: number) => (
                        <div key={i} data-testid={`ai-missing-item-${i}`} className="text-xs">
                          <span className="font-medium text-foreground">{item.item}</span>
                          <p className="text-muted-foreground">{item.reason} · {item.estimatedImpact}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Competitiveness */}
                {analysis?.competitiveness && (
                  <div className="text-xs text-muted-foreground border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">Competitiveness Score</span>
                      <span className="text-lg font-bold text-blue-600">{analysis.competitiveness.score}<span className="text-xs text-muted-foreground">/100</span></span>
                    </div>
                    <p>{analysis.competitiveness.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Catalog Picker Dialog */}
      <Dialog open={showCatalog} onOpenChange={(v) => { setShowCatalog(v); if (!v) { setCatalogSearch(""); setCatalogTypeFilter("all"); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" /> BuildOps Item Catalog
              </DialogTitle>
              <Button
                data-testid="button-sync-catalog"
                size="sm" variant="outline"
                className="gap-1.5 text-xs h-7"
                disabled={syncCatalogMut.isPending}
                onClick={() => syncCatalogMut.mutate()}
              >
                {syncCatalogMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Sync from BuildOps
              </Button>
            </div>
          </DialogHeader>

          {/* Search + Filter bar */}
          <div className="px-4 py-3 border-b shrink-0 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                data-testid="input-catalog-search"
                placeholder="Search items..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Select value={catalogTypeFilter} onValueChange={setCatalogTypeFilter}>
              <SelectTrigger data-testid="select-catalog-type-filter" className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="material">Material</SelectItem>
                <SelectItem value="labor">Labor</SelectItem>
                <SelectItem value="fee">Fee</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
            {catalogLoading ? (
              <div className="space-y-2 py-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : catalogItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Database className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No items in catalog</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Sync from BuildOps" to import your pricebook</p>
              </div>
            ) : (
              (() => {
                const filtered = catalogTypeFilter === "all"
                  ? catalogItems
                  : catalogItems.filter((item) => item.lineType === catalogTypeFilter);
                return filtered.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">No items match that filter</div>
                ) : (
                  filtered.map((item) => {
                    const unitCost = parseFloat(item.unitCost as unknown as string) || 0;
                    const unitPrice = parseFloat(item.unitPrice as unknown as string) || 0;
                    const hasBuildops = !!item.buildopsItemId;
                    const typeColors: Record<string, string> = {
                      material: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                      labor:    "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                      fee:      "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
                      equipment:"bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
                    };
                    return (
                      <button
                        key={item.id}
                        data-testid={`catalog-item-${item.id}`}
                        type="button"
                        disabled={addFromCatalogMut.isPending || !item.isActive}
                        onClick={() => addFromCatalogMut.mutate(item)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border bg-card hover:border-primary/40 hover:bg-muted/30 transition-all flex items-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                            {hasBuildops && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">BuildOps</span>
                            )}
                            {!item.isActive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">Inactive</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColors[item.lineType] ?? "bg-gray-100 text-gray-600"}`}>
                              {item.lineType}
                            </span>
                            {unitCost > 0 && <span className="text-xs text-muted-foreground">Cost: ${unitCost.toFixed(2)}</span>}
                            {unitPrice > 0 && <span className="text-xs text-muted-foreground">Price: ${unitPrice.toFixed(2)}</span>}
                            {item.buildopsCode && <span className="text-xs text-muted-foreground font-mono">{item.buildopsCode}</span>}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                      </button>
                    );
                  })
                );
              })()
            )}
          </div>

          <div className="px-5 py-3 border-t shrink-0 flex justify-between items-center text-xs text-muted-foreground">
            <span>{catalogItems.length} items in catalog</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowCatalog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Dialog */}
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit for Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              This will snapshot the current workspace and submit it for manager approval.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Version Label (optional)</Label>
              <Input
                data-testid="input-sync-version-label"
                placeholder="e.g. Rev A, v1.2, Final..."
                value={syncLabel}
                onChange={(e) => setSyncLabel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncOpen(false)}>Cancel</Button>
            <Button
              data-testid="button-confirm-sync"
              disabled={syncMut.isPending}
              onClick={() => syncMut.mutate()}
            >
              {syncMut.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={showApprove} onOpenChange={setShowApprove}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve or Reject</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              data-testid="textarea-approval-note"
              placeholder="Note (optional)..."
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              className="h-24"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              data-testid="button-reject-opportunity"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              disabled={approveMut.isPending}
              onClick={() => approveMut.mutate("rejected")}
            >
              Reject
            </Button>
            <Button
              data-testid="button-approve-opportunity"
              className="bg-green-600 hover:bg-green-700"
              disabled={approveMut.isPending}
              onClick={() => approveMut.mutate("approved")}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
