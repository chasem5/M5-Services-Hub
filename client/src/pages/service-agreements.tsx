import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  ClipboardList,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronRight,
  TrendingUp,
  Building2,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ServiceAgreement {
  id: number;
  buildopsId: string;
  agreementName: string | null;
  agreementNumber: string | null;
  customerName: string | null;
  status: string | null;
  frequency: string | null;
  startDate: string | null;
  endDate: string | null;
  contractValue: number | null;
  clientId: number | null;
  jobCount: number;
  totalInvoiced: number;
}

interface Summary {
  total: number;
  activeCount: number;
  activeContractValue: number;
  totalInvoiced: number;
}

type SortField = "agreementName" | "customerName" | "status" | "contractValue" | "jobCount" | "totalInvoiced" | "startDate" | "endDate";
type SortDir = "asc" | "desc";

function formatMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return format(new Date(d), "MMM d, yyyy"); } catch { return "—"; }
}

function StatusBadge({ status }: { status: string | null }) {
  const s = status?.toLowerCase() ?? "";
  if (s === "active") return <Badge className="bg-green-100 text-green-700 border-green-200 border font-semibold text-[10px]">Active</Badge>;
  if (s === "expired" || s === "inactive") return <Badge className="bg-orange-100 text-orange-700 border-orange-200 border font-semibold text-[10px]">Expired</Badge>;
  if (s === "cancelled" || s === "canceled") return <Badge className="bg-red-100 text-red-700 border-red-200 border font-semibold text-[10px]">Cancelled</Badge>;
  if (!status) return <Badge variant="outline" className="text-[10px]">Unknown</Badge>;
  return <Badge variant="outline" className="text-[10px] capitalize">{status}</Badge>;
}

export default function ServiceAgreementsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("totalInvoiced");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data, isLoading } = useQuery<{ agreements: ServiceAgreement[]; summary: Summary }>({
    queryKey: ["/api/service-agreements"],
  });

  const agreements = data?.agreements ?? [];
  const summary = data?.summary;

  const filtered = useMemo(() => {
    let list = [...agreements];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        (a.agreementName ?? "").toLowerCase().includes(q) ||
        (a.customerName ?? "").toLowerCase().includes(q) ||
        (a.agreementNumber ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter(a => a.status?.toLowerCase() === statusFilter);
    }
    list.sort((a, b) => {
      let av: any = a[sortField];
      let bv: any = b[sortField];
      if (sortField === "startDate" || sortField === "endDate") {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      }
      av = av ?? (typeof av === "number" ? 0 : "");
      bv = bv ?? (typeof bv === "number" ? 0 : "");
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [agreements, search, statusFilter, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-primary" /> : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  }

  const statuses = ["all", ...Array.from(new Set(agreements.map(a => a.status?.toLowerCase()).filter(Boolean))) as string[]];

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Header */}
      <div className="shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-heading font-bold">Service Agreements</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Total Agreements</span>
              </div>
              <p className="text-2xl font-bold" data-testid="stat-total-agreements">{isLoading ? "…" : summary?.total ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground font-medium">Active</span>
              </div>
              <p className="text-2xl font-bold text-green-700" data-testid="stat-active-agreements">{isLoading ? "…" : summary?.activeCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Active Contract Value/yr</span>
              </div>
              <p className="text-2xl font-bold" data-testid="stat-active-contract-value">
                {isLoading ? "…" : formatMoney(summary?.activeContractValue ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">Total Invoiced</span>
              </div>
              <p className="text-2xl font-bold" data-testid="stat-total-invoiced">
                {isLoading ? "…" : formatMoney(summary?.totalInvoiced ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search agreements, customers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              data-testid="input-search-agreements"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-sm w-[130px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statuses.filter(s => s !== "all").map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} agreement{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading agreements…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <ClipboardList className="h-8 w-8 opacity-30" />
              <p className="text-sm">No service agreements found</p>
              {(search || statusFilter !== "all") && (
                <button onClick={() => { setSearch(""); setStatusFilter("all"); }} className="text-xs text-primary hover:underline">Clear filters</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("agreementName")}>
                        Agreement <SortIcon field="agreementName" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("customerName")}>
                        Customer <SortIcon field="customerName" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("status")}>
                        Status <SortIcon field="status" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">Frequency</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("startDate")}>
                        Start <SortIcon field="startDate" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                      <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("endDate")}>
                        End <SortIcon field="endDate" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      <button className="flex items-center gap-1 ml-auto hover:text-foreground" onClick={() => toggleSort("contractValue")}>
                        Contract/yr <SortIcon field="contractValue" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                      <button className="flex items-center gap-1 ml-auto hover:text-foreground" onClick={() => toggleSort("jobCount")}>
                        Jobs <SortIcon field="jobCount" />
                      </button>
                    </th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                      <button className="flex items-center gap-1 ml-auto hover:text-foreground" onClick={() => toggleSort("totalInvoiced")}>
                        Total Invoiced <SortIcon field="totalInvoiced" />
                      </button>
                    </th>
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((agr, idx) => (
                    <tr
                      key={agr.id}
                      className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${agr.clientId ? "cursor-pointer" : ""}`}
                      data-testid={`row-agreement-${agr.id}`}
                    >
                      <td className="px-4 py-3">
                        {agr.clientId ? (
                          <Link href={`/customers/${agr.clientId}?tab=intelligence`} className="hover:text-primary hover:underline">
                            <div className="font-medium text-sm leading-tight">{agr.agreementName ?? "Unnamed Agreement"}</div>
                            {agr.agreementNumber && <div className="text-[10px] text-muted-foreground">#{agr.agreementNumber}</div>}
                          </Link>
                        ) : (
                          <>
                            <div className="font-medium text-sm leading-tight">{agr.agreementName ?? "Unnamed Agreement"}</div>
                            {agr.agreementNumber && <div className="text-[10px] text-muted-foreground">#{agr.agreementNumber}</div>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{agr.customerName ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={agr.status} /></td>
                      <td className="px-4 py-3 text-sm text-muted-foreground capitalize hidden md:table-cell">{agr.frequency ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{formatDate(agr.startDate)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{formatDate(agr.endDate)}</td>
                      <td className="px-4 py-3 text-right font-medium text-sm">{formatMoney(agr.contractValue)}</td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground hidden md:table-cell" data-testid={`jobs-count-${agr.id}`}>{agr.jobCount}</td>
                      <td className="px-4 py-3 text-right font-semibold text-sm hidden sm:table-cell" data-testid={`total-invoiced-${agr.id}`}>
                        {agr.totalInvoiced > 0 ? (
                          <span className="flex items-center justify-end gap-1">
                            <TrendingUp className="h-3 w-3 text-green-600" />
                            {formatMoney(agr.totalInvoiced)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-2 py-3">
                        {agr.clientId && (
                          <Link href={`/customers/${agr.clientId}?tab=intelligence`}>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
