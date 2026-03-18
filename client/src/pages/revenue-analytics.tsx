import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  DollarSign,
  FileBarChart,
  RefreshCw,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

interface MrrArrData {
  mrr: number;
  arr: number;
  activeAgreementCount: number;
  earliestStart: string | null;
  latestEnd: string | null;
}

interface ServiceMixItem {
  category: string;
  revenue: number;
  percentage: number;
}

interface ServiceMixData {
  mix: ServiceMixItem[];
  totalRevenue: number;
  syncedAt: string;
}

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ec4899",
  "#64748b",
];

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

function safeDate(s: string | null): string {
  if (!s) return "—";
  try {
    return format(parseISO(s), "MMM yyyy");
  } catch {
    return "—";
  }
}

export default function RevenueAnalytics() {
  const { data: mrrData, isLoading: mrrLoading } = useQuery<MrrArrData>({
    queryKey: ["/api/analytics/mrr-arr"],
  });

  const { data: mixData, isLoading: mixLoading } = useQuery<ServiceMixData>({
    queryKey: ["/api/analytics/service-mix"],
  });

  const pieData = (mixData?.mix ?? []).map((item, i) => ({
    ...item,
    color: COLORS[i % COLORS.length],
  }));

  const hasMixData = pieData.length > 0;
  const hasMrrData = (mrrData?.activeAgreementCount ?? 0) > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" />
            Revenue Analytics
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Recurring revenue and service mix from BuildOps agreements and invoices
          </p>
        </div>
      </div>

      {/* MRR / ARR Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Recurring Revenue
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm bg-card" data-testid="card-mrr">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Monthly Recurring Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mrrLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <p className="text-2xl font-heading font-bold" data-testid="text-mrr-value">
                    {fmt(mrrData?.mrr ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasMrrData
                      ? "Based on active service agreements"
                      : "No active agreements with contract values"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-card" data-testid="card-arr">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Annual Recurring Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mrrLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <p className="text-2xl font-heading font-bold" data-testid="text-arr-value">
                    {fmt(mrrData?.arr ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total active contract value (annual)
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-card" data-testid="card-active-agreements">
            <CardHeader className="pb-2">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Active Agreements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mrrLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <p className="text-2xl font-heading font-bold" data-testid="text-active-agreement-count">
                    {mrrData?.activeAgreementCount ?? 0}
                  </p>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {mrrData?.earliestStart && (
                      <p>From: {safeDate(mrrData.earliestStart)}</p>
                    )}
                    {mrrData?.latestEnd && (
                      <p>Through: {safeDate(mrrData.latestEnd)}</p>
                    )}
                    {!mrrData?.earliestStart && !mrrData?.latestEnd && (
                      <p>No date coverage data</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {!mrrLoading && !hasMrrData && (
          <p className="text-sm text-muted-foreground mt-3 bg-muted/40 border rounded-lg p-3">
            MRR/ARR will populate automatically when BuildOps service agreements are synced and have contract values set to active status.
          </p>
        )}
      </div>

      {/* Service Mix Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          Service Mix
        </h2>

        {mixLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm bg-card">
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card className="shadow-sm bg-card">
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : !hasMixData ? (
          <Card className="shadow-sm bg-card">
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileBarChart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No invoice data yet</p>
              <p className="text-sm mt-1">
                Service mix will appear once BuildOps invoices are synced.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Donut Chart */}
            <Card className="shadow-sm bg-card" data-testid="card-service-mix-donut">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Revenue by Service Type</CardTitle>
                <CardDescription className="text-xs">
                  Total invoiced: {fmt(mixData?.totalRevenue ?? 0)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="revenue"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [fmt(value), name]}
                      labelFormatter={() => ""}
                    />
                    <Legend
                      formatter={(value) => (
                        <span className="text-xs text-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Bar Chart + Table */}
            <Card className="shadow-sm bg-card" data-testid="card-service-mix-bar">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Revenue Breakdown</CardTitle>
                <CardDescription className="text-xs">
                  Sorted by invoiced revenue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={pieData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis
                      type="number"
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {pieData.map((entry, idx) => (
                        <Cell key={`bar-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="space-y-1.5 pt-1">
                  {pieData.map((item, idx) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between text-sm"
                      data-testid={`row-service-mix-${idx}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-block h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate text-muted-foreground">{item.category}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs">{fmt(item.revenue)}</span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 font-normal">
                          {item.percentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!mixLoading && mixData?.syncedAt && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Last BuildOps sync: {format(parseISO(mixData.syncedAt), "MMM d, yyyy h:mm a")}
          </p>
        )}
      </div>
    </div>
  );
}
