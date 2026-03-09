import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type PipelineStage } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X } from "lucide-react";

function getStageColors(color: string | null | undefined) {
  switch (color) {
    case "green": return { dot: "bg-green-500", badge: "bg-green-100 text-green-700 border-green-200" };
    case "red": return { dot: "bg-red-500", badge: "bg-red-100 text-red-700 border-red-200" };
    default: return { dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border" };
  }
}

export function PipelineStagesManager() {
  const { toast } = useToast();
  const [newStageLabel, setNewStageLabel] = useState("");
  const [newStageColor, setNewStageColor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const { data: stages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["/api/pipeline-stages"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { label: string; slug: string; color?: string | null }) =>
      apiRequest("POST", "/api/pipeline-stages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
      setNewStageLabel("");
      setNewStageColor(null);
      toast({ title: "Stage created" });
    },
    onError: () => toast({ title: "Failed to create stage", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { label?: string; color?: string | null } }) =>
      apiRequest("PUT", `/api/pipeline-stages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
      setEditingId(null);
    },
    onError: () => toast({ title: "Failed to update stage", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/pipeline-stages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] });
      toast({ title: "Stage deleted" });
    },
    onError: () => toast({ title: "Failed to delete stage", variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) =>
      apiRequest("POST", "/api/pipeline-stages/reorder", { orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pipeline-stages"] }),
  });

  const moveStage = (index: number, dir: "up" | "down") => {
    const newOrder = [...stages];
    const offset = dir === "up" ? -1 : 1;
    const [item] = newOrder.splice(index, 1);
    newOrder.splice(index + offset, 0, item);
    reorderMutation.mutate(newOrder.map(s => s.id));
  };

  const handleCreate = () => {
    if (!newStageLabel.trim()) return;
    const slug = newStageLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    createMutation.mutate({ label: newStageLabel.trim(), slug, color: newStageColor });
  };

  return (
    <div className="space-y-2">
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className="flex items-center gap-2 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            data-testid={`pipeline-stage-row-${stage.id}`}
          >
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveStage(index, "up")}
                disabled={index === 0}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed"
                data-testid={`button-pipeline-stage-up-${stage.id}`}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => moveStage(index, "down")}
                disabled={index === stages.length - 1}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed"
                data-testid={`button-pipeline-stage-down-${stage.id}`}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className={`h-3 w-3 rounded-full flex-shrink-0 ${getStageColors(stage.color).dot}`} />

            {editingId === stage.id ? (
              <Input
                autoFocus
                value={editingLabel}
                onChange={(e) => setEditingLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateMutation.mutate({ id: stage.id, data: { label: editingLabel } });
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="h-7 text-sm flex-1"
                data-testid={`input-pipeline-stage-label-${stage.id}`}
              />
            ) : (
              <span className="flex-1 text-sm font-medium truncate">{stage.label}</span>
            )}

            <select
              value={stage.color ?? "default"}
              onChange={(e) => {
                const val = e.target.value === "default" ? null : e.target.value;
                updateMutation.mutate({ id: stage.id, data: { color: val } });
              }}
              className="text-xs border rounded px-1.5 py-1 bg-background h-7"
              data-testid={`select-pipeline-stage-color-${stage.id}`}
            >
              <option value="default">Default</option>
              <option value="green">Green (Won)</option>
              <option value="red">Red (Lost)</option>
            </select>

            {editingId === stage.id ? (
              <Button
                size="icon"
                variant="default"
                className="h-7 w-7"
                onClick={() => updateMutation.mutate({ id: stage.id, data: { label: editingLabel } })}
                disabled={updateMutation.isPending}
                data-testid={`button-save-pipeline-stage-${stage.id}`}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => { setEditingId(stage.id); setEditingLabel(stage.label); }}
                data-testid={`button-edit-pipeline-stage-${stage.id}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}

            {editingId === stage.id ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground"
                onClick={() => setEditingId(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => deleteMutation.mutate(stage.id)}
                data-testid={`button-delete-pipeline-stage-${stage.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="border-t pt-3 space-y-2">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add New Stage</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Stage name..."
            value={newStageLabel}
            onChange={(e) => setNewStageLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            className="flex-1 h-8"
            data-testid="input-new-pipeline-stage-name"
          />
          <select
            value={newStageColor ?? "default"}
            onChange={(e) => setNewStageColor(e.target.value === "default" ? null : e.target.value)}
            className="text-xs border rounded px-1.5 py-1 bg-background h-8"
            data-testid="select-new-pipeline-stage-color"
          >
            <option value="default">Default</option>
            <option value="green">Green</option>
            <option value="red">Red</option>
          </select>
          <Button
            size="sm"
            className="h-8"
            disabled={!newStageLabel.trim() || createMutation.isPending}
            onClick={handleCreate}
            data-testid="button-add-pipeline-stage"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
