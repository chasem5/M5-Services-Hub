import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Trophy, XCircle, BarChart2 } from "lucide-react";
import { format, parseISO } from "date-fns";

const LOSS_REASON_LABELS: Record<string, string> = {
  price: "Price",
  competition: "Competition",
  timing: "Timing",
  no_response: "No Response",
  other: "Other",
  unknown: "Not Captured",
};

const LOSS_REASON_COLORS: Record<string, string> = {
  price: "#ef4444",
  competition: "#f97316",
  timing: "#eab308",
  no_response: "#64748b",
  other: "#8b5cf6",
  unknown: "#94a3b8",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

const monthLabel = (yearMonth: string) => {
  try {
    return format(parseISO(`${yearMonth}-01`), "MMM yy");
  } catch {
    return yearMonth;
  }
};

interface WinLossData {
  wonCount: number;
  lostCount: number;
  wonValue: number;
  lostValue: number;
  winRate: number | null;
  winRateByMonth: { month: string; won: number; lost: number; winRate: number | null }[];
  lossReasons: { reason: string; count: number; totalValue: number }[];
}

function MetricCard({ title, value, sub, icon: Icon, color }: {
  title: string;
  value: string | number | null | undefined;
  sub?: string;
  icon: typeof TrendingUp;
  color?: string;
}) {
  return (
    <Card className="shadow-sm border-border/40 bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 shrink-0 ${color ?? "text-primary"}`} />
      </CardHeader>
      <CardContent>
        <div className={`font-heading font-bold text-xl leading-tight ${color ?? ""}`} data-testid={`text-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {value ?? "—"}
        </div>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function WinLossReport() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams = new URLSearchParams();
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);

  const { data, isLoading, isError } = useQuery<WinLossData>({
    queryKey: ["/api/reports/win-loss", dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/reports/win-loss?${queryParams.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
  });

  const total = (data?.wonCount ?? 0) + (data?.lostCount ?? 0);

  const winLossPieData = [
    { name: "Won", value: data?.wonCount ?? 0, color: "#22c55e" },
    { name: "Lost", value: data?.lostCount ?? 0, color: "#ef4444" },
  ].filter(d => d.value > 0);

  const lossReasonChartData = (data?.lossReasons ?? []).map(r => ({
    name: LOSS_REASON_LABELS[r.reason] ?? r.reason,
    count: r.count,
    value: r.totalValue,
    color: LOSS_REASON_COLORS[r.reason] ?? "#94a3b8",
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-2">
            <BarChart2 className="h-7 w-7 text-primary" />
            Win / Loss Analysis
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track deal outcomes, win rate trends, and loss reason breakdowns</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="w-40"
          placeholder="From"
          data-testid="input-date-from"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="w-40"
          placeholder="To"
          data-testid="input-date-to"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(""); setDateTo(""); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
            data-testid="button-clear-date-filter"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <MetricCard
          title="Deals Won"
          value={isLoading ? undefined : data?.wonCount}
          sub={isLoading ? undefined : fmt(data?.wonValue ?? 0)}
          icon={Trophy}
          color="text-green-600"
        />
        <MetricCard
          title="Deals Lost"
          value={isLoading ? undefined : data?.lostCount}
          sub={isLoading ? undefined : fmt(data?.lostValue ?? 0)}
          icon={XCircle}
          color="text-red-500"
        />
        <MetricCard
          title="Win Rate"
          value={isLoading ? undefined : data?.winRate !== null ? `${data?.winRate}%` : "—"}
          sub={isLoading ? undefined : `${total} total closed deals`}
          icon={TrendingUp}
        />
        <MetricCard
          title="Avg Deal (Won)"
          value={isLoading ? undefined : data?.wonCount ? fmt((data?.wonValue ?? 0) / (data?.wonCount ?? 1)) : "—"}
          sub="Per won deal"
          icon={BarChart2}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card className="shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Win vs. Lost</CardTitle>
            <CardDescription className="text-xs">Count of closed deals by outcome</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : total === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No closed deals in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={winLossPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {winLossPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number | string) => [v, "Deals"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Win Rate Over Time</CardTitle>
            <CardDescription className="text-xs">Monthly win rate percentage</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (data?.winRateByMonth ?? []).length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={(data?.winRateByMonth ?? []).map(d => ({
                  ...d,
                  month: monthLabel(d.month),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number | string, name: string) => {
                      if (name === "winRate") return [`${value}%`, "Win Rate"];
                      return [value, name === "won" ? "Won" : "Lost"];
                    }}
                  />
                  <Line type="monotone" dataKey="winRate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="winRate" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Loss Reason Breakdown</CardTitle>
          <CardDescription className="text-xs">Why deals were lost — count and total deal value</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : isError ? (
            <div className="text-center py-10 text-red-600 text-sm">Failed to load data</div>
          ) : lossReasonChartData.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No lost deals in this period</div>
          ) : (
            <div className="space-y-6">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={lossReasonChartData} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip
                    formatter={(v: number | string, name: string) => [
                      name === "count" ? v : fmt(Number(v)),
                      name === "count" ? "Deals Lost" : "Deal Value",
                    ]}
                  />
                  <Bar dataKey="count" name="count" radius={[0, 4, 4, 0]}>
                    {lossReasonChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-loss-reasons">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="py-2 px-3">Reason</th>
                      <th className="py-2 px-3 text-right">Deals Lost</th>
                      <th className="py-2 px-3 text-right">% of Lost</th>
                      <th className="py-2 px-3 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lossReasonChartData.map((row, i) => {
                      const totalLost = lossReasonChartData.reduce((s, r) => s + r.count, 0);
                      const pct = totalLost > 0 ? Math.round((row.count / totalLost) * 100) : 0;
                      return (
                        <tr key={i} className="border-b hover:bg-muted/50" data-testid={`row-loss-reason-${row.name.toLowerCase().replace(/\s+/g, '-')}`}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
                              <span className="font-medium">{row.name}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{row.count}</td>
                          <td className="py-2.5 px-3 text-right">
                            <Badge variant="outline" className="text-xs">{pct}%</Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{fmt(row.value)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
