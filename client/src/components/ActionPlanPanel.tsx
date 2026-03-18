import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  Plus,
  CheckCircle2,
  Circle,
  X,
  MoreVertical,
  Trash2,
  Pencil,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";

interface ActionPlan {
  id: number;
  type: "customer" | "company";
  clientId: number | null;
  title: string;
  description: string | null;
  priority: "high" | "medium" | "low";
  status: "open" | "done" | "dismissed";
  source: "ai" | "manual";
  dueDate: string | null;
  createdAt: string;
}

interface ActionPlanPanelProps {
  type: "customer" | "company";
  clientId?: number | null;
  className?: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const qKey = (type: string, clientId?: number | null) =>
  ["/api/action-plans", type, clientId ?? "null"];

export function ActionPlanPanel({ type, clientId, className }: ActionPlanPanelProps) {
  const { toast } = useToast();
  const [showCompleted, setShowCompleted] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<ActionPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const autoGenTriggered = useRef(false);

  const [form, setForm] = useState({ title: "", description: "", priority: "medium" as "high" | "medium" | "low", dueDate: "" });

  const params = new URLSearchParams({ type });
  if (clientId != null) params.set("clientId", String(clientId));
  if (showCompleted) params.set("includeCompleted", "true");

  const { data: plans = [], isLoading } = useQuery<ActionPlan[]>({
    queryKey: [...qKey(type, clientId), showCompleted],
    queryFn: async () => {
      const res = await fetch(`/api/action-plans?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load action plans");
      return res.json();
    },
  });

  // Auto-generate on first load if no plans exist (run once per mount)
  useEffect(() => {
    if (!isLoading && plans.length === 0 && !autoGenTriggered.current && !generating) {
      autoGenTriggered.current = true;
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, plans.length]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qKey(type, clientId) });
  };

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/action-plans", data),
    onSuccess: () => { invalidate(); setAddOpen(false); setForm({ title: "", description: "", priority: "medium", dueDate: "" }); },
    onError: () => toast({ title: "Failed to create action plan", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: object }) => apiRequest("PATCH", `/api/action-plans/${id}`, data),
    onSuccess: () => { invalidate(); setEditItem(null); },
    onError: () => toast({ title: "Failed to update action plan", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/action-plans/${id}`),
    onSuccess: () => invalidate(),
    onError: () => toast({ title: "Failed to delete action plan", variant: "destructive" }),
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiRequest("POST", "/api/action-plans/generate", {
        type,
        clientId: clientId ?? null,
      });
      if (!res.ok) throw new Error("Generation failed");
      invalidate();
      toast({ title: "Action plan generated", description: "AI suggestions have been added." });
    } catch {
      toast({ title: "Generation failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusToggle = (plan: ActionPlan) => {
    const nextStatus = plan.status === "done" ? "open" : "done";
    updateMutation.mutate({ id: plan.id, data: { status: nextStatus } });
  };

  const handleDismiss = (plan: ActionPlan) => {
    updateMutation.mutate({ id: plan.id, data: { status: "dismissed" } });
  };

  const openItems = plans.filter(p => p.status === "open");
  const doneItems = plans.filter(p => p.status === "done");
  const dismissedItems = plans.filter(p => p.status === "dismissed");

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    createMutation.mutate({
      type,
      clientId: clientId ?? null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: "open",
      source: "manual",
      dueDate: form.dueDate || null,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !form.title.trim()) return;
    updateMutation.mutate({
      id: editItem.id,
      data: {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        dueDate: form.dueDate || null,
      },
    });
  };

  const openEditDialog = (plan: ActionPlan) => {
    setEditItem(plan);
    setForm({
      title: plan.title,
      description: plan.description ?? "",
      priority: plan.priority,
      dueDate: plan.dueDate ? plan.dueDate.split("T")[0] : "",
    });
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          Action Plan
          {openItems.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{openItems.length}</Badge>
          )}
        </h3>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={handleGenerate}
            disabled={generating}
            data-testid="btn-generate-action-plan"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
            {generating ? "Generating…" : "AI Generate"}
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs gap-1 bg-primary hover:bg-primary/90"
            onClick={() => { setAddOpen(true); setForm({ title: "", description: "", priority: "medium", dueDate: "" }); }}
            data-testid="btn-add-action-plan"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : openItems.length === 0 && !showCompleted ? (
        <div className="text-center py-6 border rounded-lg border-dashed border-border/60">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No open action items</p>
          <p className="text-xs text-muted-foreground mt-0.5">Use AI Generate or Add to create items</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {openItems.map(plan => (
            <PlanRow
              key={plan.id}
              plan={plan}
              onToggle={handleStatusToggle}
              onDismiss={handleDismiss}
              onEdit={openEditDialog}
              onDelete={id => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {(doneItems.length > 0 || dismissedItems.length > 0) && (
        <button
          className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          onClick={() => setShowCompleted(v => !v)}
          data-testid="btn-toggle-completed"
        >
          {showCompleted ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showCompleted ? "Hide" : "Show"} completed / dismissed ({doneItems.length + dismissedItems.length})
        </button>
      )}

      {showCompleted && (doneItems.length > 0 || dismissedItems.length > 0) && (
        <div className="mt-2 space-y-1.5 opacity-60">
          {[...doneItems, ...dismissedItems].map(plan => (
            <PlanRow
              key={plan.id}
              plan={plan}
              onToggle={handleStatusToggle}
              onDismiss={handleDismiss}
              onEdit={openEditDialog}
              onDelete={id => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Action Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-3 mt-2">
            <Input
              placeholder="Action item title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              data-testid="input-action-title"
            />
            <Textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as "high" | "medium" | "low" }))}>
                <SelectTrigger className="flex-1" data-testid="select-action-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                className="flex-1"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                placeholder="Due date"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90">
                {createMutation.isPending ? "Adding…" : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={open => { if (!open) setEditItem(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Action Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3 mt-2">
            <Input
              placeholder="Action item title"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              data-testid="input-edit-action-title"
            />
            <Textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as "high" | "medium" | "low" }))}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                className="flex-1"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90">
                {updateMutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanRow({
  plan,
  onToggle,
  onDismiss,
  onEdit,
  onDelete,
}: {
  plan: ActionPlan;
  onToggle: (p: ActionPlan) => void;
  onDismiss: (p: ActionPlan) => void;
  onEdit: (p: ActionPlan) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      className="flex items-start gap-2 p-2.5 rounded-lg border border-border/50 bg-card hover:border-border transition-colors group"
      data-testid={`action-plan-row-${plan.id}`}
    >
      <button
        onClick={() => onToggle(plan)}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
        data-testid={`btn-toggle-plan-${plan.id}`}
      >
        {plan.status === "done"
          ? <CheckCircle2 className="h-4 w-4 text-green-600" />
          : <Circle className="h-4 w-4" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${plan.status === "done" ? "line-through text-muted-foreground" : ""}`}>
            {plan.title}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className={`text-[9px] px-1 py-0 h-3.5 border ${PRIORITY_COLORS[plan.priority]}`}>
              {plan.priority}
            </Badge>
            {plan.source === "ai" && (
              <Sparkles className="h-2.5 w-2.5 text-primary opacity-70" title="AI generated" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => onEdit(plan)} className="gap-1.5 text-xs cursor-pointer">
                  <Pencil className="h-3 w-3" /> Edit
                </DropdownMenuItem>
                {plan.status !== "dismissed" && (
                  <DropdownMenuItem onClick={() => onDismiss(plan)} className="gap-1.5 text-xs cursor-pointer text-muted-foreground">
                    <X className="h-3 w-3" /> Dismiss
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(plan.id)}
                  className="gap-1.5 text-xs cursor-pointer text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {plan.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{plan.description}</p>
        )}
        {plan.dueDate && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Due {format(new Date(plan.dueDate), "MMM d, yyyy")}
          </p>
        )}
      </div>
    </div>
  );
}
