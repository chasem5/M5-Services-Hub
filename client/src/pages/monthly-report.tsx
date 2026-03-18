import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileBarChart2,
  Printer,
  DollarSign,
  HeartPulse,
  FileText,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";

interface MBRReport {
  year: number;
  month: number;
  newRevenue: number;
  wonDealsCount: number;
  wonDealsValue: number;
  pipelineAdded: number;
  proposals: {
    sent: number;
    won: number;
    lost: number;
    total: number;
  };
  activeClientsCount: number;
  clientHealth: {
    healthy: number;
    watch: number;
    atRisk: number;
  };
  top5Clients: { clientId: number; name: string; revenue: number }[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

function getDefaultPeriod() {
  const now = new Date();
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();
  return { year, month };
}

function buildYearMonthOptions() {
  const options: { year: number; month: number; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1);
    options.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: format(d, "MMMM yyyy") });
  }
  return options;
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 print:mb-3">
      <Icon className="h-5 w-5 text-primary print:text-black" />
      <h2 className="text-lg font-heading font-semibold">{title}</h2>
    </div>
  );
}

function MetricCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <Card className="shadow-sm bg-card print:shadow-none print:border">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-heading font-bold mt-1 ${accent ?? ""}`} data-testid={`metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}


export default function MonthlyReport() {
  const options = buildYearMonthOptions();
  const def = getDefaultPeriod();
  const [selectedKey, setSelectedKey] = useState(`${def.year}-${def.month}`);

  const [selYear, selMonth] = selectedKey.split("-").map(Number);

  const { data: report, isLoading, isError, refetch } = useQuery<MBRReport>({
    queryKey: ["/api/reports/monthly-business-review", selYear, selMonth],
    retry: 1,
    queryFn: async () => {
      const res = await fetch(
        `/api/reports/monthly-business-review?year=${selYear}&month=${selMonth}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `HTTP ${res.status}`);
      }
      return res.json();
    },
  });

  const handlePrint = () => window.print();

  const monthLabel = report
    ? `${MONTH_NAMES[report.month - 1]} ${report.year}`
    : options.find(o => o.year === selYear && o.month === selMonth)?.label ?? "";

  return (
    <div className="p-4 md:p-6 space-y-6 print:p-0 print:space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-2">
            <FileBarChart2 className="h-7 w-7 text-primary" />
            Monthly Business Review
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Key metrics consolidated for leadership review</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedKey} onValueChange={setSelectedKey}>
            <SelectTrigger className="w-48" data-testid="select-report-month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map(o => (
                <SelectItem key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handlePrint} data-testid="button-print-report">
            <Printer className="h-4 w-4 mr-2" />
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Print header — only visible when printing */}
      <div className="hidden print:block mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Monthly Business Review</h1>
            <p className="text-lg text-gray-600 mt-1">{monthLabel}</p>
          </div>
          <p className="text-sm text-gray-400">Generated {format(new Date(), "MMMM d, yyyy")}</p>
        </div>
        <div className="border-b border-gray-300 mt-3" />
      </div>

      <div className="flex items-center gap-2 print:hidden">
        <p className="text-muted-foreground text-sm font-medium">Showing data for:</p>
        <Badge variant="secondary" className="text-sm">{monthLabel}</Badge>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      )}

      {isError && (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileBarChart2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-red-600 mb-1">Failed to load report</p>
            <p className="text-sm mb-4">The report could not be loaded. Please try again.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
              data-testid="button-retry-monthly-report"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      )}

      {report && (
        <div className="space-y-8 print:space-y-6">

          {/* Section 1: Revenue & Deals */}
          <section>
            <SectionHeader icon={DollarSign} title="Revenue & Deals" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="New Revenue Collected"
                value={fmt(report.newRevenue)}
                sub="BuildOps invoices issued"
              />
              <MetricCard
                label="New Deals Won"
                value={report.wonDealsCount.toString()}
                sub={`Total value: ${fmt(report.wonDealsValue)}`}
                accent="text-green-600"
              />
              <MetricCard
                label="Pipeline Value Added"
                value={fmt(report.pipelineAdded)}
                sub="New active deals created"
              />
              <MetricCard
                label="Active Clients"
                value={report.activeClientsCount.toString()}
                sub="Clients with revenue this month"
                accent="text-primary"
              />
            </div>
          </section>

          <Separator />

          {/* Section 2: Proposals & Estimates */}
          <section>
            <SectionHeader icon={FileText} title="Proposals & Estimates Sent" />
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="Sent"
                value={report.proposals.sent.toString()}
                sub="Proposals + estimates sent out"
                accent="text-blue-600"
              />
              <MetricCard
                label="Won"
                value={report.proposals.won.toString()}
                sub="Signed proposals + accepted estimates"
                accent="text-green-600"
              />
              <MetricCard
                label="Lost"
                value={report.proposals.lost.toString()}
                sub="Rejected estimates"
                accent="text-red-600"
              />
            </div>
          </section>

          <Separator />

          {/* Section 3: Client Health */}
          <section>
            <SectionHeader icon={HeartPulse} title="Client Health Distribution" />
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                label="Healthy"
                value={report.clientHealth.healthy.toString()}
                sub="Consistent revenue & engagement"
                accent="text-green-600"
              />
              <MetricCard
                label="Watch"
                value={report.clientHealth.watch.toString()}
                sub="Declining or inconsistent signals"
                accent="text-amber-600"
              />
              <MetricCard
                label="At Risk"
                value={report.clientHealth.atRisk.toString()}
                sub="Inactive or low-revenue clients"
                accent="text-red-600"
              />
            </div>
          </section>

          <Separator />

          {/* Section 4: Top 5 Clients by Revenue */}
          <section>
            <SectionHeader icon={Trophy} title="Top 5 Clients by Revenue" />
            {report.top5Clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoice data for this month.</p>
            ) : (
              <Card className="shadow-sm print:shadow-none print:border">
                <CardContent className="p-0">
                  <table className="w-full text-sm" data-testid="table-top-clients">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2.5 px-4 font-medium">Rank</th>
                        <th className="py-2.5 px-4 font-medium">Client</th>
                        <th className="py-2.5 px-4 font-medium text-right">Revenue This Month</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.top5Clients.map((c, i) => (
                        <tr key={c.clientId} className="border-b last:border-0 hover:bg-muted/40 print:hover:bg-transparent" data-testid={`row-top-client-${c.clientId}`}>
                          <td className="py-2.5 px-4 text-muted-foreground font-medium">#{i + 1}</td>
                          <td className="py-2.5 px-4 font-medium">{c.name}</td>
                          <td className="py-2.5 px-4 text-right font-mono tabular-nums">{fmt(c.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </section>


        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border { border: 1px solid #e2e8f0 !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:space-y-6 > * + * { margin-top: 1.5rem; }
          .print\\:mb-6 { margin-bottom: 1.5rem; }
          .print\\:mb-3 { margin-bottom: 0.75rem; }
          .print\\:text-black { color: #000 !important; }
          .print\\:hover\\:bg-transparent:hover { background-color: transparent !important; }
          nav, aside, header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
