import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type PipelineStage } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Pencil, Check, X, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function getStageColors(color: string | null | undefined) {
  switch (color) {
    case "green": return { dot: "bg-green-500", badge: "bg-green-100 text-green-700 border-green-200" };
    case "red": return { dot: "bg-red-500", badge: "bg-red-100 text-red-700 border-red-200" };
    default: return { dot: "bg-muted-foreground", badge: "bg-muted text-muted-foreground border-border" };
  }
}

function SortableStageRow({
  stage,
  editingId,
  editingLabel,
  setEditingId,
  setEditingLabel,
  updateMutation,
  deleteMutation,
}: {
  stage: PipelineStage;
  editingId: number | null;
  editingLabel: string;
  setEditingId: (id: number | null) => void;
  setEditingLabel: (label: string) => void;
  updateMutation: { mutate: (args: { id: number; data: { label?: string; color?: string | null; track?: string; defaultProbability?: number } }) => void; isPending: boolean };
  deleteMutation: any;
}) {
  const [localProb, setLocalProb] = useState<string>(String((stage as any).defaultProbability ?? 50));
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const isEditing = editingId === stage.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-1.5 px-2 rounded-lg border bg-card hover:bg-muted/20 transition-colors"
      data-testid={`pipeline-stage-row-${stage.id}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-0.5 rounded cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none shrink-0"
        data-testid={`drag-handle-pipeline-stage-${stage.id}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Color dot */}
      <div className={`h-2 w-2 rounded-full shrink-0 ${getStageColors(stage.color).dot}`} />

      {/* Track badge */}
      <button
        onClick={() => updateMutation.mutate({ id: stage.id, data: { track: stage.track === "deal" ? "relationship" : "deal" } })}
        title={stage.track === "deal" ? "Move to Relationship track" : "Move to Deal track"}
        disabled={updateMutation.isPending}
        data-testid={`badge-track-${stage.id}`}
        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 leading-none cursor-pointer hover:opacity-70 transition-opacity disabled:opacity-40 ${
          stage.track === "deal"
            ? "bg-primary/10 text-primary border border-primary/20"
            : "bg-muted text-muted-foreground border border-border/50"
        }`}
      >
        {stage.track === "deal" ? "Deal" : "Rel"}
      </button>

      {/* Probability input */}
      <div className="flex items-center shrink-0 gap-0.5" title="Win probability">
        <input
          type="number"
          min="0"
          max="100"
          value={localProb}
          onChange={(e) => setLocalProb(e.target.value)}
          onBlur={() => {
            const val = Math.min(100, Math.max(0, parseInt(localProb) || 0));
            setLocalProb(String(val));
            updateMutation.mutate({ id: stage.id, data: { defaultProbability: val } });
          }}
          className="w-9 h-6 text-xs text-center border rounded bg-background px-0.5"
          data-testid={`input-stage-probability-${stage.id}`}
        />
        <span className="text-[10px] text-muted-foreground">%</span>
      </div>

      {/* Label (or inline edit) */}
      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Input
            autoFocus
            value={editingLabel}
            onChange={(e) => setEditingLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateMutation.mutate({ id: stage.id, data: { label: editingLabel } });
              if (e.key === "Escape") setEditingId(null);
            }}
            className="h-6 text-sm flex-1 min-w-0"
            data-testid={`input-pipeline-stage-label-${stage.id}`}
          />
          <Button
            size="icon"
            variant="default"
            className="h-6 w-6 shrink-0"
            onClick={() => updateMutation.mutate({ id: stage.id, data: { label: editingLabel } })}
            disabled={updateMutation.isPending}
            data-testid={`button-save-pipeline-stage-${stage.id}`}
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 text-muted-foreground"
            onClick={() => setEditingId(null)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <span className="flex-1 text-sm font-medium truncate min-w-0">{stage.label}</span>
      )}

      {/* Color select */}
      {!isEditing && (
        <select
          value={stage.color ?? "default"}
          onChange={(e) => {
            const val = e.target.value === "default" ? null : e.target.value;
            updateMutation.mutate({ id: stage.id, data: { color: val } });
          }}
          className="text-xs border rounded px-1 py-0.5 bg-background h-6 shrink-0 w-[72px] text-muted-foreground"
          data-testid={`select-pipeline-stage-color-${stage.id}`}
        >
          <option value="default">Default</option>
          <option value="green">Green</option>
          <option value="red">Red</option>
        </select>
      )}

      {/* Kebab menu */}
      {!isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              data-testid={`button-stage-menu-${stage.id}`}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={() => { setEditingId(stage.id); setEditingLabel(stage.label); }}
              data-testid={`button-edit-pipeline-stage-${stage.id}`}
            >
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => deleteMutation.mutate(stage.id)}
              className="text-destructive focus:text-destructive"
              data-testid={`button-delete-pipeline-stage-${stage.id}`}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
    mutationFn: ({ id, data }: { id: number; data: { label?: string; color?: string | null; track?: string; defaultProbability?: number } }) =>
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

  const makeTrackDragHandler = (track: "relationship" | "deal") => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const trackStages = stages.filter(s => s.track === track);
    const otherTrackStages = stages.filter(s => s.track !== track);
    const oldIndex = trackStages.findIndex(s => s.id === active.id);
    const newIndex = trackStages.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reorderedTrack = arrayMove(trackStages, oldIndex, newIndex);
    const fullOrder = track === "relationship"
      ? [...reorderedTrack, ...otherTrackStages]
      : [...otherTrackStages, ...reorderedTrack];
    reorderMutation.mutate(fullOrder.map(s => s.id));
  };

  const handleCreate = () => {
    if (!newStageLabel.trim()) return;
    const slug = newStageLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
    createMutation.mutate({ label: newStageLabel.trim(), slug, color: newStageColor });
  };

  const relationshipStages = stages.filter(s => s.track === "relationship");
  const dealStages = stages.filter(s => s.track === "deal");

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Relationship Track</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeTrackDragHandler("relationship")}>
          <SortableContext items={relationshipStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {relationshipStages.map((stage) => (
                <SortableStageRow
                  key={stage.id}
                  stage={stage}
                  editingId={editingId}
                  editingLabel={editingLabel}
                  setEditingId={setEditingId}
                  setEditingLabel={setEditingLabel}
                  updateMutation={updateMutation}
                  deleteMutation={deleteMutation}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deal Track</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeTrackDragHandler("deal")}>
          <SortableContext items={dealStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {dealStages.map((stage) => (
                <SortableStageRow
                  key={stage.id}
                  stage={stage}
                  editingId={editingId}
                  editingLabel={editingLabel}
                  setEditingId={setEditingId}
                  setEditingLabel={setEditingLabel}
                  updateMutation={updateMutation}
                  deleteMutation={deleteMutation}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="border-t pt-3 space-y-2">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add New Stage</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Stage name..."
            value={newStageLabel}
            onChange={(e) => setNewStageLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            className="flex-1 h-8 min-w-0"
            data-testid="input-new-pipeline-stage-name"
          />
          <select
            value={newStageColor ?? "default"}
            onChange={(e) => setNewStageColor(e.target.value === "default" ? null : e.target.value)}
            className="text-xs border rounded px-1.5 py-1 bg-background h-8 shrink-0"
            data-testid="select-new-pipeline-stage-color"
          >
            <option value="default">Default</option>
            <option value="green">Green</option>
            <option value="red">Red</option>
          </select>
          <Button
            size="sm"
            className="h-8 shrink-0"
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
