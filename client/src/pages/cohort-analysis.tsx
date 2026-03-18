import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CohortData {
  cohort: string;
  clientCount: number;
  totalRevenue: number;
  avgRevenuePerClient: number;
  recentQuarterRevenue: number;
  quarterlyRevenue: Record<string, number>;
}

interface CohortResponse {
  cohorts: CohortData[];
  quarters: string[];
}

const SERVICE_TYPES = [
  { value: "all", label: "All Service Types" },
  { value: "building_engineering", label: "Building Engineering" },
  { value: "facility_solutions", label: "Facility Solutions" },
  { value: "janitorial", label: "Janitorial" },
  { value: "special_projects", label: "Special Projects" },
  { value: "property_assessment", label: "Property Assessment" },
];

const COHORT_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6",
  "#a855f7", "#14b8a6", "#f97316", "#ec4899", "#84cc16",
];

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

export default function CohortAnalysis() {
  const [serviceType, setServiceType] = useState("all");

  const queryParams = new URLSearchParams();
  if (serviceType !== "all") queryParams.set("serviceType", serviceType);

  const { data, isLoading, isError } = useQuery<CohortResponse>({
    queryKey: ["/api/reports/cohort-analysis", serviceType],
    queryFn: async () => {
      const res = await fetch(
        `/api/reports/cohort-analysis?${queryParams.toString()}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to load cohort data");
      return res.json();
    },
  });

  const cohorts = data?.cohorts ?? [];
  const quarters = data?.quarters ?? [];

  const summaryStats = useMemo(() => {
    const totalClients = cohorts.reduce((s, c) => s + c.clientCount, 0);
    const totalRevenue = cohorts.reduce((s, c) => s + c.totalRevenue, 0);
    const avgPerClient = totalClients > 0 ? totalRevenue / totalClients : 0;
    const recentQRevenue = cohorts.reduce((s, c) => s + c.recentQuarterRevenue, 0);
    return { totalClients, totalRevenue, avgPerClient, recentQRevenue };
  }, [cohorts]);

  const chartData = useMemo(() => {
    const runningTotals = new Map<string, number>();
    for (const c of cohorts) {
      runningTotals.set(c.cohort, 0);
    }
    return quarters.map((q) => {
      const entry: Record<string, string | number> = { quarter: q };
      for (const c of cohorts) {
        const prev = runningTotals.get(c.cohort) ?? 0;
        const cumulative = prev + (c.quarterlyRevenue[q] ?? 0);
        runningTotals.set(c.cohort, cumulative);
        entry[c.cohort] = cumulative;
      }
      return entry;
    });
  }, [cohorts, quarters]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-7 w-7 text-primary" />
            Cohort Analysis
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Revenue trajectory by client acquisition quarter
          </p>
        </div>
        <Select value={serviceType} onValueChange={setServiceType}>
          <SelectTrigger className="w-52" data-testid="select-service-type">
            <SelectValue placeholder="Service Type" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Clients</p>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-xl font-heading font-bold mt-1" data-testid="text-cohort-total-clients">
                {summaryStats.totalClients}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Revenue</p>
            {isLoading ? (
              <Skeleton className="h-7 w-24 mt-1" />
            ) : (
              <p className="text-xl font-heading font-bold mt-1" data-testid="text-cohort-total-revenue">
                {fmt(summaryStats.totalRevenue)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Rev / Client</p>
            {isLoading ? (
              <Skeleton className="h-7 w-20 mt-1" />
            ) : (
              <p className="text-xl font-heading font-bold mt-1" data-testid="text-cohort-avg-revenue">
                {fmt(summaryStats.avgPerClient)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Quarter Rev</p>
            {isLoading ? (
              <Skeleton className="h-7 w-20 mt-1" />
            ) : (
              <p className="text-xl font-heading font-bold mt-1" data-testid="text-cohort-recent-revenue">
                {fmt(summaryStats.recentQRevenue)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {isError ? (
        <Card className="shadow-sm bg-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-red-600">Failed to load cohort data</p>
            <p className="text-sm">Please try refreshing the page.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card className="shadow-sm bg-card">
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : cohorts.length === 0 ? (
        <Card className="shadow-sm bg-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No cohort data yet</p>
            <p className="text-sm">Won deals are needed to generate cohort analysis.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="shadow-sm bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cumulative Revenue by Cohort Over Time</CardTitle>
              <CardDescription>Running total invoice revenue per acquisition cohort, by quarter</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <XAxis
                    dataKey="quarter"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtShort}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [fmt(value), name]}
                    labelFormatter={(label) => `Quarter: ${label}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  {cohorts.map((c, i) => (
                    <Bar
                      key={c.cohort}
                      dataKey={c.cohort}
                      stackId="cohort"
                      fill={COHORT_COLORS[i % COHORT_COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Cohort Summary Table</CardTitle>
              <CardDescription>
                Clients grouped by the quarter their first deal was won
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-cohort-summary">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 px-4 font-medium">Cohort</th>
                      <th className="py-2 px-3 font-medium text-right">Clients</th>
                      <th className="py-2 px-3 font-medium text-right">Total Revenue</th>
                      <th className="py-2 px-3 font-medium text-right">Avg / Client</th>
                      <th className="py-2 px-3 font-medium text-right">Current Quarter</th>
                      {quarters.map((q) => (
                        <th key={q} className="py-2 px-3 font-medium text-right text-xs">
                          {q}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cohorts.map((c, i) => (
                      <tr
                        key={c.cohort}
                        className="border-b hover:bg-muted/50"
                        data-testid={`row-cohort-${c.cohort.replace(/\s/g, "-")}`}
                      >
                        <td className="py-2.5 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ background: COHORT_COLORS[i % COHORT_COLORS.length] }}
                            />
                            {c.cohort}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right" data-testid={`text-client-count-${c.cohort.replace(/\s/g, "-")}`}>
                          {c.clientCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono" data-testid={`text-total-rev-${c.cohort.replace(/\s/g, "-")}`}>
                          {fmt(c.totalRevenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {fmt(c.avgRevenuePerClient)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {c.recentQuarterRevenue > 0 ? (
                            <span className="text-green-600 font-medium">
                              {fmt(c.recentQuarterRevenue)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        {quarters.map((q) => {
                          const rev = c.quarterlyRevenue[q] ?? 0;
                          return (
                            <td key={q} className="py-2.5 px-3 text-right font-mono text-xs text-muted-foreground">
                              {rev > 0 ? fmtShort(rev) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/30 font-semibold text-sm">
                      <td className="py-2 px-4">Total</td>
                      <td className="py-2 px-3 text-right">{summaryStats.totalClients}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmt(summaryStats.totalRevenue)}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmt(summaryStats.avgPerClient)}</td>
                      <td className="py-2 px-3 text-right font-mono">{fmt(summaryStats.recentQRevenue)}</td>
                      {quarters.map((q) => {
                        const total = cohorts.reduce(
                          (s, c) => s + (c.quarterlyRevenue[q] ?? 0),
                          0
                        );
                        return (
                          <td key={q} className="py-2 px-3 text-right font-mono text-xs">
                            {total > 0 ? fmtShort(total) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
