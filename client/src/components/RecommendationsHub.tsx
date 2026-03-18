import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, CheckCircle2, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Recommendation {
  id: string;
  title: string;
  description: string | null;
  priority: "high" | "medium" | "low";
  suggestedType: "company" | "customer";
  suggestedClientIds: number[];
  suggestedClientNames: string[];
}

interface Client {
  id: number;
  name: string | null;
}

type Target = "company" | "all" | "specific";
interface CardState {
  target: Target;
  selectedIds: number[];
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

function defaultCardState(rec: Recommendation): CardState {
  if (rec.suggestedType === "company") return { target: "company", selectedIds: [] };
  if (rec.suggestedClientIds.length > 0) return { target: "specific", selectedIds: rec.suggestedClientIds };
  return { target: "all", selectedIds: [] };
}

function CustomerMultiSelect({
  clients,
  selected,
  onChange,
}: {
  clients: Client[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () => clients.filter(c => (c.name ?? "").toLowerCase().includes(search.toLowerCase())).slice(0, 60),
    [clients, search],
  );

  const selectedNames = clients
    .filter(c => selected.includes(c.id))
    .map(c => c.name ?? `Client ${c.id}`);

  const toggle = (id: number) => {
    if (selected.includes(id)) onChange(selected.filter(x => x !== id));
    else onChange([...selected, id]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-8 text-xs justify-between gap-1 min-w-[180px] max-w-xs font-normal"
          data-testid="btn-customer-multiselect"
        >
          <span className="truncate">
            {selected.length === 0
              ? "Select customers…"
              : selectedNames.slice(0, 2).join(", ") +
                (selectedNames.length > 2 ? ` +${selectedNames.length - 2}` : "")}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          placeholder="Search customers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-7 text-xs mb-2"
        />
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer"
              onClick={() => toggle(c.id)}
            >
              <Checkbox
                checked={selected.includes(c.id)}
                onCheckedChange={() => toggle(c.id)}
                className="h-3.5 w-3.5"
              />
              <span className="text-xs truncate">{c.name ?? `Client ${c.id}`}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No customers found</p>
          )}
        </div>
        {selected.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs w-full"
              onClick={() => onChange([])}
            >
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function RecCard({
  rec,
  clients,
  state,
  onStateChange,
  assigned,
  onAssign,
}: {
  rec: Recommendation;
  clients: Client[];
  state: CardState;
  onStateChange: (state: CardState) => void;
  assigned: boolean;
  onAssign: () => Promise<void>;
}) {
  const [assigning, setAssigning] = useState(false);

  const canAssign = () => {
    if (state.target === "company" || state.target === "all") return true;
    return state.selectedIds.length > 0;
  };

  const doAssign = async () => {
    setAssigning(true);
    try {
      await onAssign();
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Card
      className={cn("shadow-sm bg-card border transition-opacity", assigned && "opacity-60")}
      data-testid={`rec-card-${rec.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-2 mb-1.5">
          <p className={cn("text-sm font-semibold flex-1", assigned && "line-through text-muted-foreground")}>
            {rec.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant="outline"
              className={`text-[9px] px-1.5 py-0 h-3.5 border ${PRIORITY_COLORS[rec.priority]}`}
            >
              {rec.priority}
            </Badge>
            <Sparkles className="h-2.5 w-2.5 text-primary opacity-60" />
          </div>
        </div>

        {rec.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">{rec.description}</p>
        )}

        {rec.suggestedClientNames.length > 0 && (
          <p className="text-[10px] text-muted-foreground mb-2">
            <span className="font-medium">AI suggested for:</span>{" "}
            {rec.suggestedClientNames.slice(0, 3).join(", ")}
            {rec.suggestedClientNames.length > 3 ? ` +${rec.suggestedClientNames.length - 3}` : ""}
          </p>
        )}

        {!assigned && (
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-border/50">
            <Select
              value={state.target}
              onValueChange={v => {
                const next = v as Target;
                onStateChange({ target: next, selectedIds: next !== "specific" ? [] : state.selectedIds });
              }}
            >
              <SelectTrigger className="h-8 text-xs w-36" data-testid={`select-target-${rec.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Company Plan</SelectItem>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="specific">Specific Customer(s)</SelectItem>
              </SelectContent>
            </Select>

            {state.target === "specific" && (
              <CustomerMultiSelect
                clients={clients}
                selected={state.selectedIds}
                onChange={ids => onStateChange({ ...state, selectedIds: ids })}
              />
            )}

            <Button
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90 ml-auto"
              disabled={!canAssign() || assigning}
              onClick={doAssign}
              data-testid={`btn-assign-${rec.id}`}
            >
              {assigning && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {assigning ? "Assigning…" : "Assign"}
            </Button>
          </div>
        )}

        {assigned && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Assigned
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecommendationsHub() {
  const { toast } = useToast();
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>({});
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [assigningAll, setAssigningAll] = useState(false);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setAssignedIds(new Set());
    try {
      const res = await apiRequest("POST", "/api/action-plans/generate-recommendations", {});
      if (!res.ok) throw new Error("Generation failed");
      const data: Recommendation[] = await res.json();
      setRecs(data);
      const states: Record<string, CardState> = {};
      data.forEach(rec => {
        states[rec.id] = defaultCardState(rec);
      });
      setCardStates(states);
    } catch {
      toast({ title: "Failed to generate recommendations", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const invalidateActionPlans = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/action-plans"] });
  };

  const assignRec = async (rec: Recommendation, state: CardState) => {
    const records: Array<{ type: "company" | "customer"; clientId: number | null }> = [];

    if (state.target === "company") {
      records.push({ type: "company", clientId: null });
    } else if (state.target === "all") {
      clients.forEach(c => records.push({ type: "customer", clientId: c.id }));
    } else {
      state.selectedIds.forEach(id => records.push({ type: "customer", clientId: id }));
    }

    if (records.length === 0) return;

    await Promise.all(
      records.map(r =>
        apiRequest("POST", "/api/action-plans", {
          type: r.type,
          clientId: r.clientId,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          status: "open",
          source: "ai",
        }),
      ),
    );

    invalidateActionPlans();
    setAssignedIds(prev => new Set([...prev, rec.id]));
  };

  const handleAssignOne = async (rec: Recommendation) => {
    const state = cardStates[rec.id] ?? defaultCardState(rec);
    await assignRec(rec, state);
    toast({ title: "Assigned", description: `"${rec.title}" added to the action plan.` });
  };

  const handleAssignAll = async () => {
    if (!recs) return;
    const unassigned = recs.filter(r => !assignedIds.has(r.id));
    if (unassigned.length === 0) return;
    setAssigningAll(true);
    try {
      await Promise.all(
        unassigned.map(rec => assignRec(rec, cardStates[rec.id] ?? defaultCardState(rec))),
      );
      toast({
        title: "All assigned",
        description: `${unassigned.length} recommendation${unassigned.length !== 1 ? "s" : ""} added to action plans.`,
      });
    } catch {
      toast({ title: "Some assignments failed", variant: "destructive" });
    } finally {
      setAssigningAll(false);
    }
  };

  const unassignedCount = recs ? recs.filter(r => !assignedIds.has(r.id)).length : 0;

  return (
    <div className="p-6">
      <div className="max-w-3xl">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-heading font-semibold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Recommendations
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate cross-customer recommendations and assign them to customer or company action plans
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {recs && unassignedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={handleAssignAll}
                disabled={assigningAll}
                data-testid="btn-assign-all"
              >
                {assigningAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {assigningAll ? "Assigning…" : `Assign All (${unassignedCount})`}
              </Button>
            )}
            <Button
              size="sm"
              className="h-8 text-xs gap-1 bg-primary hover:bg-primary/90"
              onClick={handleGenerate}
              disabled={generating}
              data-testid="btn-generate-recommendations"
            >
              {generating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {generating ? "Generating…" : recs ? "Regenerate" : "Generate Recommendations"}
            </Button>
          </div>
        </div>

        {generating && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-1" />
                  <Skeleton className="h-3 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!generating && !recs && (
          <div
            className="text-center py-16 border rounded-lg border-dashed border-border/60"
            data-testid="recommendations-empty"
          >
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium">No recommendations yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Generate Recommendations" to get AI-powered cross-customer insights
            </p>
          </div>
        )}

        {!generating && recs && recs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No recommendations were generated. Try again.</p>
          </div>
        )}

        {!generating && recs && recs.length > 0 && (
          <div className="space-y-3">
            {recs.map(rec => (
              <RecCard
                key={rec.id}
                rec={rec}
                clients={clients}
                state={cardStates[rec.id] ?? defaultCardState(rec)}
                onStateChange={state => setCardStates(prev => ({ ...prev, [rec.id]: state }))}
                assigned={assignedIds.has(rec.id)}
                onAssign={() => handleAssignOne(rec)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
