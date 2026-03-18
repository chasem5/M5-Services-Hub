import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface ReleaseNote {
  id: number;
  title: string;
  message: string | null;
  createdAt: string;
  isRead: boolean;
  type: string;
}

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  const { data: release } = useQuery<ReleaseNote | null>({
    queryKey: ["/api/announcements/latest-release-notes"],
    refetchInterval: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (release && !release.isRead) {
      setOpen(true);
    }
  }, [release]);

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/announcements/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/latest-release-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/unread-count"] });
    },
  });

  const handleDismiss = () => {
    if (release) {
      markReadMutation.mutate(release.id);
    }
    setOpen(false);
  };

  if (!release || release.isRead) return null;

  const bullets = (release.message ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-md" data-testid="dialog-whats-new">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-heading text-lg leading-tight">
                What's New
              </DialogTitle>
              {release.createdAt && (
                <p className="text-xs text-muted-foreground">{formatDate(release.createdAt)}</p>
              )}
            </div>
            <Badge variant="outline" className="ml-auto text-[10px] font-semibold text-primary border-primary/30 bg-primary/5">
              {release.title}
            </Badge>
          </div>
        </DialogHeader>

        {bullets.length > 0 ? (
          <ul className="space-y-2.5 mt-1" data-testid="list-whats-new-bullets">
            {bullets.map((line, i) => {
              const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("*");
              const text = isBullet ? line.replace(/^[•\-*]\s*/, "") : line;
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="text-foreground/90 leading-relaxed">{text}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">{release.message}</p>
        )}

        <div className="flex justify-end mt-2">
          <Button
            onClick={handleDismiss}
            disabled={markReadMutation.isPending}
            data-testid="button-whats-new-dismiss"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
