import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type DealTag } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";

const TAG_COLORS = [
  { value: "gray",   label: "Gray",   cls: "bg-gray-100 text-gray-700 border-gray-200" },
  { value: "blue",   label: "Blue",   cls: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "purple", label: "Purple", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "green",  label: "Green",  cls: "bg-green-100 text-green-700 border-green-200" },
  { value: "amber",  label: "Amber",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "red",    label: "Red",    cls: "bg-red-100 text-red-700 border-red-200" },
];

function getTagClass(color: string | null | undefined): string {
  const found = TAG_COLORS.find(c => c.value === color);
  return found?.cls ?? "bg-gray-100 text-gray-700 border-gray-200";
}

export function DealTagsManager() {
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("gray");

  const { data: tags = [] } = useQuery<DealTag[]>({
    queryKey: ["/api/deal-tags"],
  });

  const createMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      apiRequest("POST", "/api/deal-tags", { name, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-tags"] });
      setNewName("");
      setNewColor("gray");
      toast({ title: "Tag created" });
    },
    onError: (e: any) => {
      const msg = e?.message?.includes("409") ? "Tag already exists" : "Failed to create tag";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/deal-tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deal-tags"] });
      toast({ title: "Tag deleted" });
    },
    onError: () => toast({ title: "Failed to delete tag", variant: "destructive" }),
  });

  const handleCreate = () => {
    const clean = newName.trim().toLowerCase();
    if (!clean) return;
    createMutation.mutate({ name: clean, color: newColor });
  };

  return (
    <div className="space-y-4">
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <div
              key={tag.id}
              data-testid={`deal-tag-chip-${tag.id}`}
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${getTagClass(tag.color)}`}
            >
              <span>{tag.name}</span>
              <button
                data-testid={`button-delete-tag-${tag.id}`}
                onClick={() => deleteMutation.mutate(tag.id)}
                disabled={deleteMutation.isPending}
                className="hover:opacity-70 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tags yet. Add your first tag below.</p>
      )}

      <div className="border-t pt-3 space-y-2">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add New Tag</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Tag name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            className="flex-1 h-8"
            data-testid="input-new-deal-tag-name"
          />
          <select
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="text-xs border rounded px-1.5 py-1 bg-background h-8"
            data-testid="select-new-deal-tag-color"
          >
            {TAG_COLORS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <Button
            size="sm"
            className="h-8"
            disabled={!newName.trim() || createMutation.isPending}
            onClick={handleCreate}
            data-testid="button-add-deal-tag"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
