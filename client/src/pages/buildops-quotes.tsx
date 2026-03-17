import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Search,
  RefreshCw,
  ExternalLink,
  FileText,
  Link2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UnifiedQuote {
  id: string;
  quoteNumber: number | null;
  name: string | null;
  status: string | null;
  totalAmount: number | null;
  expirationDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  buildopsCustomerId: string | null;
  customerName: string | null;
  crmClientId: number | null;
  linkedEstimateId: number | null;
  linkedEstimateTitle: string | null;
  linkedEstimateStatus: string | null;
}

interface QuotesListResponse {
  items: UnifiedQuote[];
  totalCount: number;
  buildopsConfigured: boolean;
}

function statusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  const s = status.toLowerCase().replace(/\s+/g, "");
  if (["approved", "jobadded", "won", "converted", "projectadded"].includes(s)) return "default";
  if (["rejected", "declined", "lost", "cancelled"].includes(s)) return "destructive";
  if (s === "expired") return "secondary";
  return "outline";
}

function statusLabel(status: string | null): string {
  if (!status) return "Unknown";
  const s = status.toLowerCase().replace(/\s+/g, "");
  if (["approved", "jobadded", "won", "converted", "projectadded"].includes(s)) return "Won";
  if (["rejected", "declined", "lost"].includes(s)) return "Lost";
  if (s === "cancelled") return "Cancelled";
  if (s === "expired") return "Expired";
  if (["draft", "new"].includes(s)) return "Draft";
  if (s === "open") return "Open";
  // humanise camelCase/run-on strings back to readable
  return status.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
}

function formatCurrency(val: number | null): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft / New / Open" },
  { value: "sent", label: "Sent / Pending" },
  { value: "won", label: "Won / Approved" },
  { value: "lost", label: "Lost / Rejected" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

function matchesStatusFilter(status: string | null, filter: string): boolean {
  if (filter === "all") return true;
  const s = (status ?? "").toLowerCase().replace(/\s+/g, "");
  if (filter === "draft") return ["draft", "new", "open"].includes(s);
  if (filter === "sent") return ["sent", "senttocustomer", "customerviewed", "submitted", "pending", "review", "awaitingapproval"].includes(s);
  if (filter === "won") return ["approved", "jobadded", "won", "converted", "projectadded"].includes(s);
  if (filter === "lost") return ["rejected", "declined", "lost"].includes(s);
  if (filter === "expired") return s === "expired";
  if (filter === "cancelled") return s === "cancelled";
  return true;
}

export default function BuildOpsQuotes() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [linkedFilter, setLinkedFilter] = useState<"all" | "linked" | "unlinked">("all");

  const { data, isLoading, error, refetch } = useQuery<QuotesListResponse>({
    queryKey: ["/api/buildops/quotes-list"],
    staleTime: 60000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/buildops/sync-quotes");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildops/quotes-list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Sync Complete",
        description: `${result.created ?? 0} created, ${result.updated ?? 0} updated`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter(q => {
      if (!matchesStatusFilter(q.status, statusFilter)) return false;
      if (linkedFilter === "linked" && !q.linkedEstimateId) return false;
      if (linkedFilter === "unlinked" && q.linkedEstimateId) return false;
      if (search) {
        const s = search.toLowerCase();
        const nameMatch = q.name?.toLowerCase().includes(s);
        const customerMatch = q.customerName?.toLowerCase().includes(s);
        const numMatch = q.quoteNumber != null && String(q.quoteNumber).includes(s);
        if (!nameMatch && !customerMatch && !numMatch) return false;
      }
      return true;
    });
  }, [data?.items, statusFilter, linkedFilter, search]);

  if (!data?.buildopsConfigured && !isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
        <p className="font-medium">BuildOps not configured</p>
        <p className="text-sm mt-1">Set up BuildOps credentials in Admin → Integrations to view quotes.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search quotes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-quotes-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" data-testid="select-quotes-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={linkedFilter} onValueChange={v => setLinkedFilter(v as any)}>
          <SelectTrigger className="w-44" data-testid="select-quotes-linked">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quotes</SelectItem>
            <SelectItem value="linked">Linked to CRM</SelectItem>
            <SelectItem value="unlinked">Not in CRM</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-quotes-refresh"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            data-testid="button-quotes-sync"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Syncing…" : "Sync to CRM"}
          </Button>
        </div>
      </div>

      {/* Summary counts */}
      {data && !isLoading && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span data-testid="text-quotes-total-count">
            <strong className="text-foreground">{filtered.length}</strong> of {data.totalCount} quotes
          </span>
          <span>
            <strong className="text-foreground">{data.items.filter(q => q.linkedEstimateId).length}</strong> linked to CRM estimates
          </span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-16">#</TableHead>
              <TableHead>Quote Name</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-28 text-right">Total</TableHead>
              <TableHead className="w-28">Expires</TableHead>
              <TableHead>CRM Estimate</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            )}
            {!isLoading && error && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-destructive">
                  <AlertCircle className="h-5 w-5 mx-auto mb-1" />
                  {(error as Error).message}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No quotes match your filters
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.map(q => (
              <TableRow
                key={q.id}
                className="hover:bg-muted/30 transition-colors"
                data-testid={`row-quote-${q.id}`}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {q.quoteNumber != null ? `#${q.quoteNumber}` : "—"}
                </TableCell>
                <TableCell>
                  <span className="font-medium" data-testid={`text-quote-name-${q.id}`}>
                    {q.name ?? <span className="text-muted-foreground italic">Untitled</span>}
                  </span>
                </TableCell>
                <TableCell>
                  {q.crmClientId ? (
                    <Link href={`/clients/${q.crmClientId}`}>
                      <span
                        className="text-primary hover:underline cursor-pointer font-medium"
                        data-testid={`link-quote-customer-${q.id}`}
                      >
                        {q.customerName ?? "—"}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-muted-foreground" data-testid={`text-quote-customer-${q.id}`}>
                      {q.customerName ?? "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(q.status)} data-testid={`badge-quote-status-${q.id}`}>
                    {statusLabel(q.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums" data-testid={`text-quote-total-${q.id}`}>
                  {formatCurrency(q.totalAmount)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground" data-testid={`text-quote-expiry-${q.id}`}>
                  {formatDate(q.expirationDate)}
                </TableCell>
                <TableCell>
                  {q.linkedEstimateId ? (
                    <Link href={`/estimates/${q.linkedEstimateId}`}>
                      <span
                        className="flex items-center gap-1 text-primary hover:underline cursor-pointer text-sm"
                        data-testid={`link-quote-estimate-${q.id}`}
                      >
                        <Link2 className="h-3 w-3 shrink-0" />
                        {q.linkedEstimateTitle ?? `Estimate #${q.linkedEstimateId}`}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground" data-testid={`text-quote-nolink-${q.id}`}>
                      Not linked
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <a
                    href={`https://app.buildops.com/quotes/${q.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in BuildOps"
                    data-testid={`link-quote-buildops-${q.id}`}
                  >
                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer info */}
      {data && !isLoading && data.items.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing BuildOps quotes. Use "Sync to CRM" to pull quote data into CRM deals.
        </p>
      )}
    </div>
  );
}
