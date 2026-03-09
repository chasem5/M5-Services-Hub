import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type ContactStage } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X } from "lucide-react";

const STAGE_COLORS = [
  { value: "gray",   label: "Gray",   cls: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "blue",   label: "Blue",   cls: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "purple", label: "Purple", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "green",  label: "Green",  cls: "bg-green-100 text-green-700 border-green-200" },
  { value: "amber",  label: "Amber",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "red",    label: "Red",    cls: "bg-red-100 text-red-700 border-red-200" },
];

export function getStageBadgeClass(color: string | null | undefined): string {
  const found = STAGE_COLORS.find(c => c.value === color);
  return found?.cls ?? "bg-gray-100 text-gray-700 border-gray-200";
}

interface Props {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  inline?: boolean;
}

export function ContactStagesManager({ open, onOpenChange, inline }: Props) {
  const { toast } = useToast();
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("gray");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("gray");

  const { data: stages = [] } = useQuery<ContactStage[]>({
    queryKey: ["/api/contact-stages"],
  });

  const createMutation = useMutation({
    mutationFn: (data: { label: string; color: string }) =>
      apiRequest("POST", "/api/contact-stages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-stages"] });
      setNewLabel("");
      setNewColor("gray");
      toast({ title: "Stage created" });
    },
    onError: () => toast({ title: "Failed to create stage", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { label: string; color: string } }) =>
      apiRequest("PUT", `/api/contact-stages/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-stages"] });
      setEditingId(null);
      toast({ title: "Stage updated" });
    },
    onError: () => toast({ title: "Failed to update stage", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/contact-stages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contact-stages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      toast({ title: "Stage deleted" });
    },
    onError: () => toast({ title: "Failed to delete stage", variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: number[]) =>
      apiRequest("POST", "/api/contact-stages/reorder", { orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/contact-stages"] }),
  });

  const moveStage = (index: number, dir: -1 | 1) => {
    const newOrder = [...stages];
    const [item] = newOrder.splice(index, 1);
    newOrder.splice(index + dir, 0, item);
    reorderMutation.mutate(newOrder.map(s => s.id));
  };

  const startEdit = (stage: ContactStage) => {
    setEditingId(stage.id);
    setEditLabel(stage.label);
    setEditColor(stage.color ?? "gray");
  };

  const saveEdit = (id: number) => {
    if (!editLabel.trim()) return;
    updateMutation.mutate({ id, data: { label: editLabel.trim(), color: editColor } });
  };

  const handleCreate = () => {
    if (!newLabel.trim()) return;
    createMutation.mutate({ label: newLabel.trim(), color: newColor });
  };

  const stageList = (
    <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center gap-2 rounded-lg border bg-card p-2">
          <div className="flex flex-col gap-0.5">
            <button
              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() => moveStage(i, -1)}
              disabled={i === 0}
              data-testid={`button-stage-up-${stage.id}`}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={() => moveStage(i, 1)}
              disabled={i === stages.length - 1}
              data-testid={`button-stage-down-${stage.id}`}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {editingId === stage.id ? (
            <>
              <Input
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                className="h-8 flex-1 text-sm"
                data-testid={`input-edit-stage-${stage.id}`}
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") saveEdit(stage.id); if (e.key === "Escape") setEditingId(null); }}
              />
              <Select value={editColor} onValueChange={setEditColor}>
                <SelectTrigger className="h-8 w-28 text-xs" data-testid={`select-edit-stage-color-${stage.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_COLORS.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full border ${c.cls}`}>
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                className="p-1 text-green-600 hover:text-green-700"
                onClick={() => saveEdit(stage.id)}
                data-testid={`button-save-stage-${stage.id}`}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                className="p-1 text-muted-foreground hover:text-foreground"
                onClick={() => setEditingId(null)}
                data-testid={`button-cancel-stage-${stage.id}`}
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <span
                className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${getStageBadgeClass(stage.color)}`}
              >
                {stage.label}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  className="p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => startEdit(stage)}
                  data-testid={`button-edit-stage-${stage.id}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(stage.id)}
                  data-testid={`button-delete-stage-${stage.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  const addForm = (
    <div className="border-t pt-4 space-y-3">
      <Label className="text-sm font-semibold">Add New Stage</Label>
      <div className="flex gap-2">
        <Input
          placeholder="Stage name..."
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          className="flex-1"
          data-testid="input-new-stage-label"
          onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
        />
        <Select value={newColor} onValueChange={setNewColor}>
          <SelectTrigger className="w-28" data-testid="select-new-stage-color">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGE_COLORS.map(c => (
              <SelectItem key={c.value} value={c.value}>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full border ${c.cls}`}>
                  {c.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={!newLabel.trim() || createMutation.isPending}
          data-testid="button-create-stage"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (inline) {
    return (
      <div className="space-y-2">
        {stageList}
        {addForm}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Manage Contact Stages</DialogTitle>
        </DialogHeader>
        {stageList}
        {addForm}
      </DialogContent>
    </Dialog>
  );
}
