import { useState, useRef, useEffect } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Target, Percent,
  RefreshCw, AlertTriangle, AlertCircle, CheckCircle2,
  Send, Upload, FileSpreadsheet, X, Lock, Bot,
  BarChart2, Repeat2, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Clock, Wrench, Zap, Users, Activity, PhoneCall, Mail, Calendar, Info,
  Minus, Settings2, Package,
  type LucideIcon,
} from "lucide-react";
import {
  useHiringThresholds,
  scoreSignals,
  computeTrendDirection,
  computePersistence,
  buildRecommendationReasons,
  applyScenario,
  type HiringLevel,
} from "@/lib/hiringEngine";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const PRIMARY = "#BE1916";

// ── Types ──────────────────────────────────────────────────────────────────────
interface SparkPoint { label: string; v: number; }
interface LaborAnalytics {
  hasData: boolean;
  totalRows: number;
  overtimeRatePct?: number;
  actualHrs4wk?: number;
  scheduledHrs4wk?: number;
  hrsUtilizationPct?: number | null;
  laborCostCurrentMonth?: number;
  laborCostPriorMonth?: number;
  laborCostChangePct?: number;
  totalLaborCost?: number;
  laborCostSpark?: SparkPoint[];
  error?: string;
}
interface CeoMetrics {
  lastUpdated: string;
  period?: string;
  viewPrior?: boolean;
  isPeriodIncomplete?: boolean;
  dayOfMonth?: number;
  revenue: { current: number; prevMonth: number; changePct: number; up: boolean; monthly: SparkPoint[] };
  saContractRevenue: { current: number; prevMonth: number; changePct: number; up: boolean; activeCount: number; monthly: SparkPoint[] };
  pipeline: { value: number; dealCount: number; monthly: SparkPoint[] };
  quoteConversionRate: { value: number; current30d: number; prev30d: number; changePt: number; up: boolean; monthly: SparkPoint[] };
  collectionsOutstanding: { total: number; bucket030: number; bucket3060: number; bucket6090: number; bucket90plus: number; monthly: SparkPoint[] };
  operationalKpis: {
    dso: { value: number; target: number };
    backlog: { value: number; jobCount: number; target: number };
    recurringRevPct: { value: number; target: number; saMonthlyRecurring?: number };
    utilizationRate: { value: number | null; target: number; source?: string | null };
    quoteConversionRate: { value: number; target: number };
  };
  topCustomers: { name: string; revenue: number; invoiceCount: number }[];
  activeJobs: { total: number; byStatus: { status: string; count: number }[] };
  visitsSync: { totalVisits: number; completedVisits: number };
  labor?: LaborAnalytics | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDollar(v: number) {
  return v >= 1000000 ? `$${(v / 1000000).toFixed(2)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;
}

function fmtChange(pct: number, unit = "%") {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}${unit}`;
}

interface StaffingWeek { label: string; utilPct: number; scheduledHrs: number; techCount: number; visitCount?: number; isFuture: boolean; }
interface StaffingMetrics {
  techCount: number;
  partTimeTechCount: number;
  currentWeekUtilization: number | null;
  rollingAvgUtilization: number | null;
  avgHrsPerTechPerWeek: number | null;
  forwardBookedWeeks: number;
  totalFutureWeeksWithVisits: number;
  hireSignal: 'ok' | 'watch' | 'hire';
  signalPct: number;
  weeklyTrend: StaffingWeek[];
}
interface CrewTech {
  techName: string;
  visitCount: number;
  scheduledMins: number;
  isPartTime: boolean;
  scheduledHrs: number;
  completed: number;
  upcoming: number;
  departments: string[];
  hasTimesheetData: boolean;
  regHrs: number;
  otHrs: number;
  actualHrs: number;
}

interface OpsKpiCard {
  label: string;
  sub?: string;
  value: string;
  target: string;
  change: string;
  up: boolean;
  icon: LucideIcon;
  color: string;
  tip: string;
  progress: number;
  targetPct: number;
  invertProgress?: boolean;
}

// ── Fallback spark data (shown while loading) ─────────────────────────────────
const FALLBACK_SPARK: SparkPoint[] = Array.from({ length: 12 }, (_, i) => ({ label: `M${i + 1}`, v: 0 }));

// ── Team performance data ─────────────────────────────────────────────────────
type ActivityStatus = "active" | "at_risk" | "inactive";
interface CeoTeamMember {
  userId: string;
  name: string;
  initials: string;
  avatarColor: string;
  role: string;
  status: ActivityStatus;
  lastActiveDisplay: string;
  revenueTarget: number;
  revenueMTD: number;
  pipelineValue: number;
  winRate: number | null;
  winRateChange: number | null;
  callsMTD: number;
  meetingsMTD: number;
  proposalsMTD: number;
}

const SUMMARIES: Record<string, string> = {
  daily: `**Revenue vs. Prior Day**\nToday is tracking at $48,320 — up 6.2% from yesterday's $45,500. HVAC preventive maintenance jobs are the primary driver; three large TI completions invoiced this morning.\n\n**Pipeline Health**\nActive pipeline sits at $2.1M across 34 open opportunities. Two deals moved backward from Proposal to Scoping today — both tied to budget approval delays at Cushman & Wakefield East Bay. Eight new leads entered the top of funnel from inbound referrals.\n\n**Win/Loss Trends**\nToday's win rate is 62%. Three estimates converted; two were lost to competitor on price. Average discount on won deals: 4.1% — within acceptable range.\n\n**Top Clients**\nCushman & Wakefield (YTD: $387K) and Prologis (YTD: $294K) remain the top two contributors. Prologis health score improved to 88 after a successful site walk this week.\n\n**Margin & Budget Concerns**\nJob #4471 (HVAC Retrofit — Embarcadero Tower 3) is running 11% over labor estimate. Field lead cites scope creep on ductwork. Needs change order review today.\n\n**Opportunities**\nBrookfield Property Group inquiry came in at $140K estimated value — first contact scheduled tomorrow. Potential to be the 4th Tier-A account this year.`,
  weekly: `**Revenue vs. Prior Week**\nThis week closed at $312,750 — up 11.4% vs. last week's $280,700. Commercial TI completions and two service agreement renewals drove outperformance.\n\n**Pipeline Health**\nPipeline grew to $2.1M (+5.8%). Five new qualified opportunities entered this week. Three deals stalled beyond 21 days — Meridian Group ($85K), Pacific Union ($62K), and a municipal contract ($44K) all need outreach this week.\n\n**Win/Loss Trends**\nWeekly win rate at 58% — slightly below the 61% trailing average. Two losses to lower-cost competitors in HVAC maintenance. Proposal quality may need review for sub-$25K jobs.\n\n**Top Clients by Revenue**\nCushman & Wakefield: $94,200 (this week) | Prologis: $67,800 | Lincoln Properties: $41,200. All three are healthy. JLL's weekly spend dropped 28% — flag for account check-in.\n\n**Margin & Budget Concerns**\nFour jobs are tracking more than 8% below margin estimate. Total exposure: ~$31K. Most are labor overruns. Operations review scheduled for Friday.\n\n**Opportunities & Positives**\nService agreement renewal rate this week: 100% (3 of 3). MRR trending up. Q2 target of $2M revenue is on pace given current run rate.`,
  monthly: `**Revenue vs. Prior Month**\nApril MTD: $1.24M — up 18.7% vs. March ($1.04M). Best month of the year so far. Driven by two large HVAC retrofits completing and a spike in emergency service calls.\n\n**Pipeline Health**\nTotal pipeline: $2.1M across 34 open deals. Average deal age is 18 days — healthy. Two mega-deals ($200K+ combined) entered late-stage this month.\n\n**Win/Loss Trends**\nMonthly win rate: 61% — up 3pp from last month. Win rate on proposals over $50K is 71%. Under $25K: 48% — competitive pressure increasing on small jobs.\n\n**Top Clients by Revenue (MTD)**\n1. Cushman & Wakefield — $387K | 2. Prologis — $294K | 3. Lincoln Properties — $201K | 4. JLL — $118K | 5. Brookfield — $94K.\n\n**Margin & Budget Concerns**\nOverall company margin: 35.1% — just below target of 36%. Six jobs contributed negative variance totaling $48K below plan. Labor productivity on large commercial TI jobs is the primary drag.\n\n**Opportunities & Positives**\nMRR reached $187,400 — a new high. Three new service agreements signed this month. Q2 is on track to beat Q1 by 22% if current momentum holds. Pipeline quality has improved significantly — fewer speculative early-stage deals.`,
};

const ALERTS = [
  { level: "red", icon: AlertCircle, label: "Job #4471 margin 11% below estimate", detail: "HVAC Retrofit — Embarcadero Tower 3. Requires change order review." },
  { level: "red", icon: AlertCircle, label: "JLL weekly spend down 28%", detail: "Account health may be at risk. Schedule check-in with account manager." },
  { level: "amber", icon: AlertTriangle, label: "3 deals stalled 21+ days", detail: "Meridian Group $85K, Pacific Union $62K, Municipal contract $44K." },
  { level: "amber", icon: AlertTriangle, label: "Win rate on sub-$25K jobs: 48%", detail: "Trending down 6pp vs. last quarter. Review pricing strategy." },
  { level: "amber", icon: AlertTriangle, label: "4 jobs tracking 8%+ below margin", detail: "Total exposure ~$31K. Labor overruns on commercial TI work." },
  { level: "green", icon: CheckCircle2, label: "Service agreement renewal rate: 100% this week", detail: "3 of 3 agreements renewed. MRR at all-time high of $187,400." },
  { level: "green", icon: CheckCircle2, label: "Brookfield Property Group — new $140K lead", detail: "First meeting tomorrow. Potential Tier-A account." },
];

type ChatMessage = { role: "user" | "ai"; text: string };
const SAMPLE_CONVERSATION: ChatMessage[] = [
  { role: "user", text: "Why is the margin on Job #4471 so low?" },
  {
    role: "ai",
    text: "Job #4471 (HVAC Retrofit — Embarcadero Tower 3) was estimated at $112,000 with a 36% margin target. Current actuals show labor at $38,400 vs. an estimate of $28,200 — a $10,200 overrun. The field lead noted that ductwork routing was more complex than scoped due to existing infrastructure conflicts discovered on-site. A change order for approximately $14,000 is recommended to bring margin back in line. Without it, the job will close at roughly 25% margin.",
  },
];

type Period = "daily" | "weekly" | "monthly";
type UploadedFile = { name: string; size: string; uploadedAt: string };

const CustomTooltip = ({ active, payload, label, format }: any) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="font-bold text-gray-900">
        {format === "pct" ? `${v}%` : format === "m" ? `$${v}M` : fmtDollar(v)}
      </p>
    </div>
  );
};

const STATUS_CONFIG: Record<ActivityStatus, { label: string; dot: string; badge: string; text: string }> = {
  active: { label: "Active", dot: "bg-emerald-500", badge: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  at_risk: { label: "At Risk", dot: "bg-amber-400", badge: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  inactive: { label: "Inactive", dot: "bg-red-500", badge: "bg-red-50 border-red-200", text: "text-red-700" },
};

// ── Auth guard ────────────────────────────────────────────────────────────────
export default function CEOCommandCenter() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (user && user.role !== "super_admin") navigate("/");
  }, [user, navigate]);

  if (user && user.role !== "super_admin") return null;
  return <CEOCommandCenterInner />;
}

// ── Main page ─────────────────────────────────────────────────────────────────
function CEOCommandCenterInner() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>("monthly");
  const [viewPrior, setViewPrior] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(SAMPLE_CONVERSATION);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [hoveredKpi, setHoveredKpi] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    { name: "BuildOps_JobCostReport_Q1.xlsx", size: "284 KB", uploadedAt: "Apr 1, 2026 — 9:14 AM" },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const { data: metrics, isLoading: metricsLoading } = useQuery<CeoMetrics>({
    queryKey: ["/api/ceo/metrics", period, viewPrior],
    queryFn: () => fetch(`/api/ceo/metrics?period=${period}&viewPrior=${viewPrior}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: staffing, isLoading: staffingLoading } = useQuery<StaffingMetrics>({
    queryKey: ["/api/ceo/staffing"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const [showCrewDrilldown, setShowCrewDrilldown] = useState(false);
  const [crewWeekOffset, setCrewWeekOffset] = useState(0);

  // Hiring decision dashboard state
  const [hiringThresholds, setHiringThresholds, resetHiringThresholds] = useHiringThresholds();
  const [showHiringSettings, setShowHiringSettings] = useState(false);
  const [showWhatChanged, setShowWhatChanged] = useState(false);
  const [showScenario, setShowScenario] = useState(false);
  const [showStubs, setShowStubs] = useState(false);
  const { data: crewByTech, isLoading: crewLoading } = useQuery<{ techs: CrewTech[]; weekOffset: number }>({
    queryKey: ["/api/ceo/crew-by-tech", crewWeekOffset],
    queryFn: () => fetch(`/api/ceo/crew-by-tech?weekOffset=${crewWeekOffset}`).then(r => r.json()),
    enabled: showCrewDrilldown,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: jobMargin, isLoading: jobMarginLoading } = useQuery<{
    hasData: boolean;
    avgMarginPct: number | null;
    totalGrossProfit: number | null;
    totalRevenue: number | null;
    jobCount: number | null;
    totalRows: number;
    monthly: { label: string; v: number }[];
  }>({
    queryKey: ["/api/ceo/job-margin"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: pipelineInvoiceSummary } = useQuery<{
    dealsInvoiced: number; invoiceCount: number; invoicedTotal: number;
    outstandingTotal: number; paidTotal: number;
    paidCount: number; partialCount: number; pendingCount: number;
  }>({
    queryKey: ["/api/ceo/pipeline-invoice-summary"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: teamPerf, isLoading: teamPerfLoading } = useQuery<CeoTeamMember[]>({
    queryKey: ["/api/ceo/team-performance"],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ── Compute live KPI card values from API data ─────────────────────────────
  const rev = metrics?.revenue;
  const sa = metrics?.saContractRevenue;
  const pipe = metrics?.pipeline;
  const qcr = metrics?.quoteConversionRate;
  const ar = metrics?.collectionsOutstanding;
  const opsKpis = metrics?.operationalKpis;

  const liveKpi = {
    revenue: {
      value: rev ? fmtDollar(rev.current) : "—",
      change: rev ? fmtChange(rev.changePct) : "—",
      up: rev?.up ?? true,
    },
    saContractRevenue: {
      value: sa ? fmtDollar(sa.current) : "—",
      change: sa ? fmtChange(sa.changePct) : "—",
      up: sa?.up ?? true,
    },
    pipeline: {
      value: pipe ? fmtDollar(pipe.value) : "—",
      change: pipe ? `${pipe.dealCount} deals` : "—",
      up: true,
    },
    quoteConversionRate: {
      value: qcr ? `${qcr.value}%` : "—",
      change: qcr ? `${qcr.changePt >= 0 ? "+" : ""}${qcr.changePt}pp` : "—",
      up: qcr?.up ?? true,
    },
    collectionsOutstanding: {
      value: ar ? fmtDollar(ar.total) : "—",
      change: ar ? `${ar.bucket90plus > 0 ? fmtDollar(ar.bucket90plus) + " 90d+" : "current"}` : "—",
      up: ar ? (ar.bucket90plus < ar.total * 0.15) : true,
    },
  };

  const summary = SUMMARIES[period];
  const revenueMonthly = rev?.monthly ?? [];
  const revenueHasData = revenueMonthly.length > 0 && revenueMonthly.some(d => d.v > 0);
  const revenueData = revenueHasData ? revenueMonthly : FALLBACK_SPARK;

  function handlePeriodChange(p: Period) {
    setPeriod(p);
    setViewPrior(false);
    setIsRegenerating(true);
    setTimeout(() => setIsRegenerating(false), 1200);
  }

  function handleRegenerate() {
    setIsRegenerating(true);
    setTimeout(() => setIsRegenerating(false), 1800);
  }

  function handleSendMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    setIsSending(true);
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", text }];
    setChatMessages(newMessages);
    setTimeout(() => {
      const aiReply =
        "Based on the current data context, your question touches on a key performance area. " +
        "The most recent figures show that this metric has moved " +
        (Math.random() > 0.5 ? "positively" : "negatively") +
        " relative to the prior period. " +
        "I recommend reviewing the underlying job-level detail in the estimates vs. actuals report. " +
        "Would you like me to highlight the top 3 contributing factors?";
      setChatMessages([...newMessages, { role: "ai", text: aiReply }]);
      setIsSending(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }, 1400);
  }

  const [importStatus, setImportStatus] = useState<{ status: 'idle' | 'uploading' | 'success' | 'error'; message?: string }>({ status: 'idle' });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const now = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

    for (const file of files) {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        const firstLine = text.split(/\r?\n/)[0].toLowerCase();

        // Helper: upload a FormData to an endpoint and handle result
        async function uploadCsv(endpoint: string, label: string, rowLabel: string) {
          setImportStatus({ status: 'uploading' });
          const formData = new FormData();
          formData.append("file", file);
          const resp = await fetch(endpoint, { method: "POST", body: formData });
          const result = await resp.json();
          if (!resp.ok) throw new Error(result.message || 'Import failed');
          setImportStatus({
            status: 'success',
            message: `${label}: ${result.inserted} new + ${result.updated} updated (${result.skipped} skipped). Total: ${result.totalRows.toLocaleString()} ${rowLabel}.`,
          });
          setUploadedFiles(prev => [...prev, {
            name: `${file.name} (${label} Import)`,
            size: file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
            uploadedAt: now,
          }]);
          queryClient.invalidateQueries({ queryKey: ['/api/ceo/metrics'] });
        }

        try {
          // 1. Timesheet CSV — employee name + work date
          const isTimesheetCsv = firstLine.includes("visit id") || firstLine.includes("total duration mins") || firstLine.includes("labor rate group") || (firstLine.includes("employee name") && firstLine.includes("work date"));
          if (isTimesheetCsv) {
            await uploadCsv("/api/buildops/import-timesheets", "Timesheets", "records");
            continue;
          }

          // 2. Invoice CSV — invoice number + issue date
          const isInvoiceCsv = firstLine.includes("invoice number") && firstLine.includes("issue date");
          if (isInvoiceCsv) {
            await uploadCsv("/api/buildops/import-invoices", "Invoices", "invoices");
            continue;
          }

          // 3. SA Contract CSV — agreement number / agreement # / sa number (but NOT SA-jobs which have "is maintenance")
          const isSaContractCsv = (firstLine.includes("agreement number") || firstLine.includes("agreement #") || firstLine.includes("agreement no") || firstLine.includes("sa number"))
            && !firstLine.includes("is maintenance");
          if (isSaContractCsv) {
            await uploadCsv("/api/buildops/import-agreements", "Service Agreements", "agreements");
            continue;
          }

          // 4. Visits CSV — visit number + job number + scheduled for
          const isVisitCsv = firstLine.includes("visit number") && firstLine.includes("job number") && firstLine.includes("scheduled for");
          if (isVisitCsv) {
            await uploadCsv("/api/buildops/import-visits", "Visits", "visits");
            continue;
          }

          // 5. SA-visits/SA-jobs CSV — job number + service agreement number + is maintenance
          const isSaJobCsv = firstLine.includes("job number") && firstLine.includes("service agreement number") && firstLine.includes("is maintenance");
          if (isSaJobCsv) {
            await uploadCsv("/api/buildops/import-jobs", "SA Jobs", "jobs");
            continue;
          }

          // 6. Job Margin / Cost Report CSV — job number + gross profit OR margin
          const isJobMarginCsv = firstLine.includes("job number") && (firstLine.includes("gross profit") || firstLine.includes("margin"));
          if (isJobMarginCsv) {
            await uploadCsv("/api/buildops/import-job-margin", "Job Margin", "jobs");
            queryClient.invalidateQueries({ queryKey: ['/api/ceo/job-margin'] });
            continue;
          }

          // 7. Jobs CSV — job number + (amount quoted OR status), but not visits/invoices/maintenance
          const isJobCsv = firstLine.includes("job number")
            && (firstLine.includes("amount quoted") || firstLine.includes("status"))
            && !firstLine.includes("visit number")
            && !firstLine.includes("invoice number")
            && !firstLine.includes("is maintenance");
          if (isJobCsv) {
            await uploadCsv("/api/buildops/import-jobs", "Jobs", "jobs");
            continue;
          }

          // Unrecognized — store metadata silently (no error)
          {
            setImportStatus({ status: 'uploading' });
            const formData = new FormData();
            formData.append("file", file);
            const resp = await fetch("/api/buildops/import-generic-csv", { method: "POST", body: formData });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result.message || `Server error ${resp.status}`);
            const rowCount = result.rowCount ?? 0;
            setImportStatus({
              status: 'success',
              message: `Stored ${rowCount} rows — column headers logged for future use.`,
            });
            setUploadedFiles(prev => [...prev, {
              name: `${file.name} (Generic CSV)`,
              size: file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
              uploadedAt: now,
            }]);
          }
        } catch (err: any) {
          setImportStatus({ status: 'error', message: err.message || 'Network error' });
        }
        continue;
      }
      // Non-CSV file: add to local list for AI context
      setUploadedFiles(prev => [...prev, {
        name: file.name,
        size: file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`,
        uploadedAt: now,
      }]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function renderSummary(text: string) {
    return text.split("\n\n").map((block, i) => {
      const lines = block.split("\n");
      const heading = lines[0].replace(/\*\*/g, "");
      const body = lines.slice(1).join(" ").replace(/\*\*/g, "");
      return (
        <div key={i} className="mb-4 last:mb-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1">{heading}</p>
          <p className="text-sm text-gray-700 leading-relaxed">{body}</p>
        </div>
      );
    });
  }

  const alertColors: Record<string, { bg: string; border: string; icon: string }> = {
    red: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500" },
    green: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-500" },
  };

  const redCount = ALERTS.filter(a => a.level === "red").length;
  const amberCount = ALERTS.filter(a => a.level === "amber").length;
  const greenCount = ALERTS.filter(a => a.level === "green").length;

  const atRisk = TEAM.filter(m => m.status === "at_risk" || m.status === "inactive");

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
            <Lock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none" style={{ fontFamily: "'Archivo Black', sans-serif", color: "#111" }}>
              CEO Command Center
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Executive intelligence — restricted access</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            {redCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{redCount} danger
              </span>
            )}
            {atRisk.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                <Users className="w-3 h-3" />{atRisk.length} team alerts
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* MTD / Prior toggle — only shown when viewing an incomplete current period */}
            {(metrics?.isPeriodIncomplete || viewPrior) && !metricsLoading && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1" data-testid="toggle-view-prior">
                <button
                  data-testid="button-view-mtd"
                  onClick={() => setViewPrior(false)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${!viewPrior ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {period === 'monthly' ? 'MTD' : period === 'weekly' ? 'WTD' : 'DTD'}
                </button>
                <button
                  data-testid="button-view-prior"
                  onClick={() => setViewPrior(true)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${viewPrior ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Prior
                </button>
              </div>
            )}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(["daily", "weekly", "monthly"] as Period[]).map(p => (
                <button
                  key={p}
                  data-testid={`button-period-${p}`}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-all ${period === p ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 max-w-screen-xl mx-auto space-y-5">

        {/* ── KPI Strip with sparklines ─────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3" data-testid="section-kpi-strip">
          {[
            { label: "Revenue", icon: DollarSign, ...liveKpi.revenue, sparkData: revenueData, fmt: "dollar" },
            { label: "Pipeline", icon: BarChart2, ...liveKpi.pipeline, sparkData: pipe?.monthly ?? FALLBACK_SPARK, fmt: "dollar", sparkNote: "new leads by created date" },
            { label: "Quote Conv.", icon: Target, ...liveKpi.quoteConversionRate, sparkData: qcr?.monthly ?? FALLBACK_SPARK, fmt: "pct", sparkNote: "won/lost by close date" },
            { label: "SA Contract Rev", icon: Repeat2, ...liveKpi.saContractRevenue, sparkData: sa?.monthly ?? FALLBACK_SPARK, fmt: "dollar", sparkNote: "SA-tagged invoice revenue" },
            { label: "AR Outstanding", icon: Percent, ...liveKpi.collectionsOutstanding, sparkData: ar?.monthly ?? FALLBACK_SPARK, fmt: "dollar", sparkNote: undefined },
          ].map(({ label, icon: Icon, value, change, up, sparkData, fmt, sparkNote }: any) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 pt-3.5 pb-0 overflow-hidden" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
                <Icon className="w-3.5 h-3.5 text-gray-300" />
              </div>
              <div className="text-2xl font-black text-gray-900 leading-tight" style={{ fontFamily: "'Archivo Black', sans-serif" }}>{value}</div>
              <div className={`flex items-center gap-1 mt-0.5 mb-1 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {change}
              </div>
              {sparkNote && (
                <p className="text-[9px] text-gray-300 mb-1 leading-none">{sparkNote}</p>
              )}
              <div className="h-12 -mx-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={up ? "#10b981" : PRIMARY} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={up ? "#10b981" : PRIMARY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke={up ? "#10b981" : PRIMARY} strokeWidth={1.5} fill={`url(#grad-${label})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        {/* ── Operational KPIs ─────────────────────────────────────────────── */}
        <div data-testid="section-ops-kpis">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Operational Health</p>
            <span className="text-[10px] text-gray-300">— metrics that drive margin in service businesses</span>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {([
              {
                label: "Job Efficiency",
                sub: "actual vs. expected visit time",
                value: opsKpis?.utilizationRate.value != null ? `${opsKpis.utilizationRate.value}%` : "—",
                target: "85%",
                change: opsKpis?.utilizationRate.source === 'timesheets' ? 'from timesheets' : opsKpis?.utilizationRate.source === 'visits' ? 'from visits' : 'no data',
                up: (opsKpis?.utilizationRate.value ?? 0) >= 70,
                icon: Activity, color: "#3b82f6",
                tip: opsKpis?.utilizationRate.source === 'timesheets'
                  ? "Actual hours worked ÷ scheduled hours (from timesheet import, last 4 weeks). Proxy for labor efficiency when per-visit duration data is unavailable. Target: 85%+."
                  : opsKpis?.utilizationRate.source === 'visits'
                  ? "Actual visit duration ÷ minimum expected visit duration (per-visit average). Measures job execution efficiency — not crew load. Target: 85%+."
                  : "Requires timesheets or BuildOps visits with duration data. Import a timesheet CSV to populate.",
                progress: opsKpis?.utilizationRate.value ?? 0,
                targetPct: opsKpis?.utilizationRate.target ?? 85,
              },
              {
                label: "Days to Collect (DSO)",
                value: opsKpis ? `${opsKpis.dso.value} days` : "—",
                target: "< 30d", change: opsKpis ? (opsKpis.dso.value <= 30 ? "✓ On target" : `${opsKpis.dso.value - 30}d over`) : "—",
                up: opsKpis ? opsKpis.dso.value <= 30 : true, icon: Clock, color: "#f59e0b",
                tip: "Average days from invoice issued to payment received. Target: <30 days.",
                progress: opsKpis ? Math.max(0, 100 - Math.max(0, opsKpis.dso.value - 30) * 2) : 0,
                targetPct: 100, invertProgress: true,
              },
              {
                label: "Quote Conv. Rate",
                value: opsKpis ? `${opsKpis.quoteConversionRate.value}%` : "—",
                target: "70%", change: qcr ? `${qcr.changePt >= 0 ? "+" : ""}${qcr.changePt}pp` : "—",
                up: qcr ? qcr.changePt >= 0 : true, icon: Zap, color: "#8b5cf6",
                tip: "Won leads ÷ (won + lost) leads. Target: 70%+.",
                progress: opsKpis?.quoteConversionRate.value ?? 0,
                targetPct: opsKpis?.quoteConversionRate.target ?? 70,
              },
              {
                label: "Active Job Backlog",
                value: opsKpis ? (
                  opsKpis.backlog.jobCount > 0
                    ? `${opsKpis.backlog.jobCount} jobs · ${fmtDollar(opsKpis.backlog.value)}`
                    : "—"
                ) : "—",
                target: "Minimize",
                change: opsKpis?.backlog.jobCount > 0
                  ? "unstarted approved jobs"
                  : metrics?.activeJobs?.total === 0 ? "import jobs CSV" : "no unstarted jobs",
                up: (opsKpis?.backlog.jobCount ?? 0) === 0,
                icon: BarChart2, color: "#06b6d4",
                tip: "Won/approved jobs that have not yet had a completed field visit. These are queued jobs waiting to be started. Import a BuildOps Jobs CSV to populate.",
                progress: opsKpis?.backlog.jobCount > 0 ? 50 : 100,
                targetPct: 100,
              },
              {
                label: "Recurring Rev %",
                value: opsKpis ? `${opsKpis.recurringRevPct.value}%` : "—",
                target: "40%",
                change: opsKpis?.recurringRevPct.saMonthlyRecurring
                  ? `~${fmtDollar(opsKpis.recurringRevPct.saMonthlyRecurring)}/mo from SAs`
                  : "import SA CSV",
                up: (opsKpis?.recurringRevPct.value ?? 0) > 0,
                icon: Repeat2, color: "#ec4899",
                tip: "Monthly SA contract value ÷ prior month total revenue. Based on active service agreement annual values (import SA CSV to update).",
                progress: opsKpis?.recurringRevPct.value ?? 0,
                targetPct: opsKpis?.recurringRevPct.target ?? 40,
              },
            ] as OpsKpiCard[]).map((k) => {
              const Icon = k.icon;
              const pct = Math.min((k.progress / k.targetPct) * 100, 100);
              const isHovered = hoveredKpi === k.label;
              return (
                <div
                  key={k.label}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5 cursor-default transition-shadow hover:shadow-md relative"
                  data-testid={`ops-kpi-${k.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onMouseEnter={() => setHoveredKpi(k.label)}
                  onMouseLeave={() => setHoveredKpi(null)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${k.color}18` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                    </div>
                    <span className={`text-[10px] font-semibold ${k.up ? "text-emerald-600" : "text-red-500"}`}>{k.change}</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5 leading-tight">{k.label}</p>
                  {k.sub && <p className="text-[9px] text-gray-300 mb-1 leading-tight">{k.sub}</p>}
                  <p className="text-lg font-black text-gray-900 leading-none mb-1" style={{ fontFamily: "'Archivo Black', sans-serif" }}>{k.value}</p>
                  <p className="text-[10px] text-gray-400 mb-2">Target: {k.target}</p>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 90 ? "#10b981" : pct >= 70 ? k.color : "#f59e0b",
                      }}
                    />
                  </div>
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-52 bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl leading-relaxed pointer-events-none">
                      {k.tip}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Hero chart: Revenue trend ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5" data-testid="section-revenue-chart">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Revenue Trend</p>
              <p className="text-2xl font-black text-gray-900" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                {liveKpi.revenue.value}
                <span className={`text-sm font-semibold ml-2 ${liveKpi.revenue.up ? "text-emerald-600" : "text-red-500"}`}>{liveKpi.revenue.change}</span>
              </p>
            </div>
            <span className="text-xs text-gray-400 capitalize">{period} view</span>
          </div>
          <div className="h-48 relative">
            {!revenueHasData && !metricsLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/80 rounded-lg">
                <BarChart2 className="w-6 h-6 text-gray-300 mb-1.5" />
                <p className="text-xs font-semibold text-gray-400">No invoice data for this period</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Sync BuildOps invoices to populate the revenue chart</p>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip format="dollar" />} />
                <Area type="monotone" dataKey="v" stroke={revenueHasData ? PRIMARY : "#e5e7eb"} strokeWidth={2.5} fill="url(#rev-grad)" dot={false} activeDot={{ r: 4, fill: PRIMARY }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Secondary charts ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" data-testid="section-pipeline-chart">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pipeline Value</p>
              <BarChart2 className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-0.5" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              {liveKpi.pipeline.value}
              <span className="text-xs font-semibold ml-1.5 text-emerald-600">{liveKpi.pipeline.change}</span>
            </p>
            <div className="h-28 mt-2 relative">
              {(!pipe?.monthly || !pipe.monthly.some(d => d.v > 0)) && !metricsLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">No pipeline data for period</div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipe?.monthly ?? FALLBACK_SPARK} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip format="dollar" />} />
                  <Bar dataKey="v" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" data-testid="section-winrate-chart">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Quote Conversion Rate</p>
              <Target className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-0.5" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              {liveKpi.quoteConversionRate.value}
              <span className={`text-xs font-semibold ml-1.5 ${liveKpi.quoteConversionRate.up ? "text-emerald-600" : "text-red-500"}`}>{liveKpi.quoteConversionRate.change}</span>
            </p>
            <div className="h-28 mt-2 relative">
              {(!qcr?.monthly || !qcr.monthly.some(d => d.v > 0)) && !metricsLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">No conversion data for period</div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={qcr?.monthly ?? FALLBACK_SPARK} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip format="pct" />} />
                  <ReferenceLine y={70} stroke="#e5e7eb" strokeDasharray="4 4" label={{ value: "Target 70%", fontSize: 9, fill: "#9ca3af" }} />
                  <Line type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2.5, fill: "#8b5cf6" }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" data-testid="section-util-chart">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">AR Outstanding</p>
                <p className="text-[9px] text-gray-400 normal-case">Balance from BuildOps payment data · Sparkline = billed per period</p>
              </div>
              <Activity className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-0.5" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              {liveKpi.collectionsOutstanding.value}
              <span className={`text-xs font-semibold ml-1.5 ${liveKpi.collectionsOutstanding.up ? "text-emerald-600" : "text-red-500"}`}>{liveKpi.collectionsOutstanding.change}</span>
            </p>
            <div className="h-28 mt-2 relative">
              {(!ar?.monthly || ar.monthly.every(d => d.v === 0)) && !metricsLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">No AR data — invoices not synced</div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ar?.monthly ?? FALLBACK_SPARK} margin={{ top: 2, right: 0, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="coll-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip format="dollar" />} />
                  <Area type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={2} fill="url(#coll-grad)" dot={false} activeDot={{ r: 4, fill: "#f59e0b" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {pipelineInvoiceSummary && pipelineInvoiceSummary.dealsInvoiced > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100" data-testid="pipeline-invoice-coverage">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Invoice Coverage — From Pipeline Deals</p>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">{pipelineInvoiceSummary.dealsInvoiced} deals invoiced</span>
                  <span className="text-gray-500">${Math.round(pipelineInvoiceSummary.invoicedTotal / 1000)}K billed</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  {pipelineInvoiceSummary.paidCount > 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">{pipelineInvoiceSummary.paidCount} paid</span>}
                  {pipelineInvoiceSummary.partialCount > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold">{pipelineInvoiceSummary.partialCount} partial</span>}
                  {pipelineInvoiceSummary.pendingCount > 0 && <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-semibold">{pipelineInvoiceSummary.pendingCount} due</span>}
                  {pipelineInvoiceSummary.outstandingTotal > 0 && <span className="text-amber-600 font-bold ml-auto">${Math.round(pipelineInvoiceSummary.outstandingTotal / 1000)}K outstanding</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Margin + signal summary ───────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 col-span-2" data-testid="section-margin-chart">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">SA Contract Revenue</p>
              <Repeat2 className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-0.5" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              {liveKpi.saContractRevenue.value}
              <span className={`text-xs font-semibold ml-1.5 ${liveKpi.saContractRevenue.up ? "text-emerald-600" : "text-red-500"}`}>{liveKpi.saContractRevenue.change}</span>
            </p>
            <div className="h-28 mt-2 relative">
              {(!sa?.monthly || sa.monthly.every(d => d.v === 0)) && !metricsLoading && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400">No SA revenue data — sync agreements</div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(sa?.monthly ?? FALLBACK_SPARK)} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => fmtDollar(v)} />
                  <Tooltip content={<CustomTooltip format="dollar" />} />
                  <Line type="monotone" dataKey="v" stroke={PRIMARY} strokeWidth={2} dot={{ r: 2.5, fill: PRIMARY }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between" data-testid="section-signal-summary">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Signal Summary</p>
            <div className="space-y-3 flex-1">
              {[
                { icon: AlertCircle, label: "Danger", count: redCount, color: "text-red-500", bg: "bg-red-50" },
                { icon: AlertTriangle, label: "Watch", count: amberCount, color: "text-amber-500", bg: "bg-amber-50" },
                { icon: CheckCircle2, label: "Positive", count: greenCount, color: "text-emerald-500", bg: "bg-emerald-50" },
              ].map(({ icon: Icon, label, count, color, bg }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{label}</span>
                  </div>
                  <span className={`text-2xl font-black ${color}`} style={{ fontFamily: "'Archivo Black', sans-serif" }}>{count}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setShowDetail(v => !v); setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }}
              className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-semibold border border-gray-200 rounded-lg py-2 text-gray-600 hover:bg-gray-50 transition-all"
              data-testid="button-show-detail"
            >
              {showDetail ? <><ChevronUp className="w-3.5 h-3.5" />Hide detail</> : <><ChevronDown className="w-3.5 h-3.5" />View detail</>}
            </button>
          </div>
        </div>

        {/* ── Crew Capacity & Hiring Decision Dashboard ─────────────────────── */}
        {(() => {
          const trendData = staffing?.weeklyTrend ?? [];

          // Raw inputs for scoring engine
          const rollingAvgUtilization = staffing?.rollingAvgUtilization ?? staffing?.currentWeekUtilization ?? 0;
          const forwardBookedWeeks = staffing?.forwardBookedWeeks ?? 0;
          const overtimeRatePct = metrics?.labor?.overtimeRatePct ?? 0;
          const actualHrs4wk = metrics?.labor?.actualHrs4wk ?? 0;
          const scheduledHrs4wk = metrics?.labor?.scheduledHrs4wk ?? 0;
          const hasTimesheetHrs = scheduledHrs4wk > 0 && actualHrs4wk > 0;

          // Gauge display value (booked-load if timesheets available, else schedule util)
          const gaugeValue = hasTimesheetHrs
            ? Math.round((scheduledHrs4wk / actualHrs4wk) * 100)
            : rollingAvgUtilization;

          // Run the scoring engine
          const scores = scoreSignals(
            { rollingAvgUtilization, forwardBookedWeeks, overtimeRatePct, actualHrs4wk, scheduledHrs4wk, weeks: trendData },
            hiringThresholds
          );
          const trend = computeTrendDirection(trendData);
          const persistenceWarn = computePersistence(trendData, hiringThresholds.utilWarn);
          const reasons = buildRecommendationReasons(scores, { rollingAvgUtilization, forwardBookedWeeks, overtimeRatePct, actualHrs4wk, scheduledHrs4wk }, hiringThresholds, trend, persistenceWarn);

          // What-changed deltas (last 2 past weeks)
          const pastWeeks = trendData.filter(w => !w.isFuture);
          const prevWeek = pastWeeks.length >= 2 ? pastWeeks[pastWeeks.length - 2] : null;
          const currWeek = pastWeeks.length >= 1 ? pastWeeks[pastWeeks.length - 1] : null;
          const utilDelta = (currWeek && prevWeek) ? currWeek.utilPct - prevWeek.utilPct : null;
          const schedHrsDelta = (currWeek && prevWeek) ? Math.round((currWeek.scheduledHrs - prevWeek.scheduledHrs) * 10) / 10 : null;
          // Forward-booked delta: compare last 2 consecutive forward-booked counts derived from past weeks
          // (we approximate by looking at the count of past weeks above 0% in the last 2 slices of 4-wk windows)
          // Simpler: count consecutive past weeks with visits in the last 4 vs last 5-8 window
          const prevPastWeeks4 = pastWeeks.slice(-8, -4);
          const currPastWeeks4 = pastWeeks.slice(-4);
          const prevFwdProxy = prevPastWeeks4.filter(w => w.utilPct > 0).length;
          const currFwdProxy = currPastWeeks4.filter(w => w.utilPct > 0).length;
          const fwdDelta = pastWeeks.length >= 8 ? forwardBookedWeeks - prevFwdProxy : null;
          // OT delta: no per-week OT in weeklyTrend; we display current OT value with a note
          // For a true delta we'd need 2 timesheet imports — approximate as unavailable week-over-week

          // Recommendation display config
          const levelConfig: Record<HiringLevel, { label: string; pill: string; border: string; bg: string; icon: string; summary: string }> = {
            healthy: {
              label: 'Healthy',
              pill: 'bg-emerald-100 text-emerald-700 border-emerald-200',
              border: 'border-l-emerald-400',
              bg: 'bg-emerald-50/40',
              icon: '✓',
              summary: 'Crew capacity is healthy. No hiring action needed at this time.',
            },
            monitor: {
              label: 'Monitor',
              pill: 'bg-blue-100 text-blue-700 border-blue-200',
              border: 'border-l-blue-400',
              bg: 'bg-blue-50/30',
              icon: '◉',
              summary: 'Capacity signals are elevated. Watch closely over the next few weeks.',
            },
            prepare: {
              label: 'Prepare to Hire',
              pill: 'bg-amber-100 text-amber-700 border-amber-200',
              border: 'border-l-amber-400',
              bg: 'bg-amber-50/30',
              icon: '⚠',
              summary: 'Crew is running near full capacity. Begin the hiring process now to avoid gaps.',
            },
            hire: {
              label: 'Hire Now',
              pill: 'bg-red-100 text-red-700 border-red-200',
              border: 'border-l-red-500',
              bg: 'bg-red-50/30',
              icon: '!',
              summary: 'Crew capacity is critically constrained — sustained over multiple weeks. Add headcount.',
            },
          };
          const cfg = levelConfig[scores.overall];

          const signalLevelColor = (level: HiringLevel) =>
            level === 'hire' ? '#ef4444'
            : level === 'prepare' ? '#f59e0b'
            : level === 'monitor' ? '#3b82f6'
            : '#10b981';

          const driverTileClass = (level: HiringLevel) =>
            level === 'hire' ? 'bg-red-50 border-red-200 text-red-700'
            : level === 'prepare' ? 'bg-amber-50 border-amber-200 text-amber-700'
            : level === 'monitor' ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700';

          const trendIcon = trend === 'rising' ? <TrendingUp className="w-4 h-4" /> : trend === 'falling' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />;

          // Scenario calculator
          const baseTechCount = staffing?.techCount ?? 8;
          const scenarios = [
            { label: '+1 Tech', deltaTechs: 1, deltaWork: 0 },
            { label: '−1 Tech', deltaTechs: -1, deltaWork: 0 },
            { label: '+1 Project Crew', deltaTechs: 2, deltaWork: 5 },
            { label: 'Workload +10%', deltaTechs: 0, deltaWork: 10 },
            { label: 'Workload −10%', deltaTechs: 0, deltaWork: -10 },
          ];

          return (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5" data-testid="section-crew-capacity">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${signalLevelColor(scores.overall)}18` }}>
                    <Users className="w-3.5 h-3.5" style={{ color: signalLevelColor(scores.overall) }} />
                  </div>
                  <span className="text-sm font-bold text-gray-800">Crew Capacity</span>
                  <span className="ml-1 text-[10px] text-gray-400">— multi-signal hiring decision</span>
                  <span className="ml-1 text-gray-300 cursor-default" title="Composite score from 5 signals: rolling utilization, forward booked weeks, OT rate, workload trend, and actual-vs-scheduled stress.">
                    <Info className="w-3 h-3" />
                  </span>
                </div>
                <span
                  className={`flex items-center gap-1.5 text-[11px] font-bold border rounded-full px-3 py-1 ${cfg.pill}`}
                  data-testid="badge-hire-signal"
                >
                  {cfg.icon} {cfg.label}
                </span>
              </div>

              {/* ── 1. Recommendation Card ── */}
              <div className={`border-l-4 rounded-r-lg px-4 py-3 mb-4 ${cfg.border} ${cfg.bg}`} data-testid="hiring-recommendation-card">
                {staffingLoading ? (
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-full" />
                    <div className="h-2.5 bg-gray-100 rounded animate-pulse w-5/6" />
                  </div>
                ) : (
                  <>
                    <p className="text-[12px] font-semibold text-gray-800 mb-2">{cfg.summary}</p>
                    <ul className="space-y-1">
                      {reasons.map((r, i) => (
                        <li key={i} className="text-[11px] text-gray-600 flex gap-1.5">
                          <span className="mt-0.5 flex-shrink-0 text-gray-400">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                    {persistenceWarn > 0 && (
                      <p className="text-[10px] text-gray-400 mt-2 italic">
                        {persistenceWarn >= hiringThresholds.weeksRequired
                          ? `Sustained: elevated for ${persistenceWarn} of last 4 weeks (threshold: ${hiringThresholds.weeksRequired})`
                          : `Spike detected: elevated for ${persistenceWarn} of last 4 weeks — monitoring (threshold: ${hiringThresholds.weeksRequired} to escalate)`}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* ── 2. Driver Stat Tiles ── */}
              <div className="grid grid-cols-4 gap-2 mb-4" data-testid="hiring-driver-tiles">
                {/* Utilization */}
                <div className={`rounded-lg border px-3 py-2 ${driverTileClass(scores.utilLevel)}`} data-testid="driver-tile-util">
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5">4-Wk Util</p>
                  <p className="text-lg font-black leading-none">{staffingLoading ? '—' : `${rollingAvgUtilization}%`}</p>
                  <p className="text-[9px] opacity-70 mt-0.5">warn ≥{hiringThresholds.utilWarn}%</p>
                </div>
                {/* Forward Booked */}
                <div className={`rounded-lg border px-3 py-2 ${driverTileClass(scores.fwdLevel)}`} data-testid="driver-tile-fwd">
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Fwd Booked</p>
                  <p className="text-lg font-black leading-none">{staffingLoading ? '—' : `${forwardBookedWeeks}wk`}</p>
                  <p className="text-[9px] opacity-70 mt-0.5">warn ≥{hiringThresholds.fwdWarn}wk</p>
                </div>
                {/* OT Rate */}
                <div className={`rounded-lg border px-3 py-2 ${driverTileClass(scores.otLevel)}`} data-testid="driver-tile-ot">
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5">OT Rate</p>
                  <p className="text-lg font-black leading-none">{staffingLoading ? '—' : hasTimesheetHrs ? `${overtimeRatePct}%` : '—'}</p>
                  <p className="text-[9px] opacity-70 mt-0.5">{hasTimesheetHrs ? `warn ≥${hiringThresholds.otWarn}%` : 'no timesheet data'}</p>
                </div>
                {/* Trend */}
                <div className={`rounded-lg border px-3 py-2 ${driverTileClass(scores.trendLevel)}`} data-testid="driver-tile-trend">
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Trend</p>
                  <div className="flex items-center gap-1 mt-1">{trendIcon}<p className="text-sm font-bold capitalize leading-none">{trend}</p></div>
                  <p className="text-[9px] opacity-70 mt-0.5">last {trendData.filter(w => !w.isFuture).length} weeks</p>
                </div>
              </div>

              {/* ── 3. What Changed ── */}
              <div className="border-t border-gray-100 pt-3 mb-3">
                <button
                  onClick={() => setShowWhatChanged(v => !v)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors mb-2"
                  data-testid="btn-what-changed"
                >
                  {showWhatChanged ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  What Changed This Week?
                </button>
                {showWhatChanged && (
                  <div className="space-y-1.5" data-testid="what-changed-panel">
                    {utilDelta !== null ? (
                      <>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="w-32 text-gray-500 flex-shrink-0">Utilization</span>
                          <span className={`font-semibold w-14 ${utilDelta > 0 ? 'text-red-600' : utilDelta < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                            {utilDelta > 0 ? '+' : ''}{utilDelta}pp
                          </span>
                          <span className="text-gray-400">{prevWeek?.utilPct}% → {currWeek?.utilPct}% (prior week → latest)</span>
                        </div>
                        {schedHrsDelta !== null && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="w-32 text-gray-500 flex-shrink-0">Scheduled Hrs</span>
                            <span className={`font-semibold w-14 ${schedHrsDelta > 0 ? 'text-amber-600' : schedHrsDelta < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                              {schedHrsDelta > 0 ? '+' : ''}{schedHrsDelta}h
                            </span>
                            <span className="text-gray-400">{prevWeek?.scheduledHrs}h → {currWeek?.scheduledHrs}h vs prior week</span>
                          </div>
                        )}
                        {fwdDelta !== null && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="w-32 text-gray-500 flex-shrink-0">Forward Booked</span>
                            <span className={`font-semibold w-14 ${fwdDelta > 0 ? 'text-amber-600' : fwdDelta < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                              {fwdDelta > 0 ? '+' : ''}{fwdDelta}wk
                            </span>
                            <span className="text-gray-400">consecutive booked weeks vs prior 4-wk window</span>
                          </div>
                        )}
                        {hasTimesheetHrs ? (
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="w-32 text-gray-500 flex-shrink-0">OT Rate (30d)</span>
                            <span className={`font-semibold w-14 ${overtimeRatePct >= hiringThresholds.otCritical ? 'text-red-600' : overtimeRatePct >= hiringThresholds.otWarn ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {overtimeRatePct}%
                            </span>
                            <span className="text-gray-400">rolling 30-day from timesheets (week-over-week OT delta requires 2+ timesheet imports)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="w-32 text-gray-500 flex-shrink-0">OT Rate</span>
                            <span className="font-semibold w-14 text-gray-300">—</span>
                            <span className="text-gray-300 italic">Upload a timesheet CSV to see OT rate</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-[10px] text-gray-300 italic">Need at least 2 weeks of history for week-over-week deltas</p>
                    )}
                  </div>
                )}
              </div>

              {/* ── 4. Weekly Chart + Gauge + Stats ── */}
              <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-3 mb-3">
                {/* Gauge */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative" style={{ width: 160, height: 88 }}>
                    <svg viewBox="0 0 200 110" width="160" height="88">
                      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#f3f4f6" strokeWidth="16" strokeLinecap="round" />
                      {gaugeValue > 0 && (
                        <path
                          d="M 20 100 A 80 80 0 0 1 180 100"
                          fill="none"
                          stroke={signalLevelColor(scores.overall)}
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray={`${Math.PI * 80 * Math.min(gaugeValue / 100, 1)} ${Math.PI * 80}`}
                          style={{ transition: 'stroke-dasharray 0.6s ease' }}
                        />
                      )}
                      <text x="100" y="90" textAnchor="middle" fontSize="28" fontWeight="900" fill={staffingLoading ? '#d1d5db' : signalLevelColor(scores.overall)} fontFamily="'Archivo Black', sans-serif">
                        {staffingLoading ? '—' : `${gaugeValue}%`}
                      </text>
                    </svg>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
                      <span className="text-[9px] text-gray-400">0%</span>
                      <span className="text-[9px] text-gray-400">100%</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-1">
                    {hasTimesheetHrs ? 'Booked Load (4wk)' : '4-Wk Utilization'}
                  </p>
                  <span
                    className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full mt-1 ${hasTimesheetHrs ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}
                    data-testid="badge-gauge-source"
                  >
                    {hasTimesheetHrs ? 'from timesheets' : 'from visit schedule'}
                  </span>
                  {hasTimesheetHrs && (
                    <p className="text-[9px] mt-0.5 text-gray-400">{scheduledHrs4wk}h booked · {actualHrs4wk}h available</p>
                  )}
                  {/* Active Techs + Hrs */}
                  <div className="flex items-center gap-2 mt-3" data-testid="staffing-stat-active-techs">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#6366f115' }}>
                      <Users className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 leading-none">{staffingLoading ? '—' : staffing?.techCount ?? '—'}</p>
                      <p className="text-[10px] text-gray-400">Active Techs</p>
                      {(staffing?.partTimeTechCount ?? 0) > 0 && <p className="text-[9px] text-amber-500">+{staffing!.partTimeTechCount} part-time</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2" data-testid="staffing-stat-avg-hrs">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0ea5e915' }}>
                      <Clock className="w-3.5 h-3.5" style={{ color: '#0ea5e9' }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 leading-none">{staffingLoading ? '—' : staffing?.avgHrsPerTechPerWeek != null ? `${staffing.avgHrsPerTechPerWeek}h` : '—'}</p>
                      <p className="text-[10px] text-gray-400">Avg Hrs/Tech/Wk</p>
                    </div>
                  </div>
                </div>

                {/* Schedule Horizon */}
                <div className="flex flex-col justify-start gap-2">
                  {(() => {
                    const nextFive = trendData.filter(w => w.isFuture).slice(0, 5);
                    const aboveThreshold = nextFive.filter(w => w.utilPct >= 70).length;
                    const gapWeeks = nextFive.filter(w => (w.visitCount ?? 0) === 0 && w.utilPct === 0).length;
                    return (
                      <div data-testid="staffing-stat-schedule-horizon">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Calendar className="w-3.5 h-3.5 text-violet-400" />
                          <p className="text-[10px] font-semibold text-gray-500">Schedule Horizon (next 5 wks)</p>
                        </div>
                        {staffingLoading ? (
                          <div className="flex gap-1">{[0,1,2,3,4].map(i => <div key={i} className="w-9 h-10 rounded bg-gray-100 animate-pulse" />)}</div>
                        ) : nextFive.length === 0 ? (
                          <p className="text-[10px] text-gray-300 italic">No upcoming visits synced</p>
                        ) : (
                          <>
                            <div className="flex gap-1">
                              {nextFive.map((w, i) => {
                                const hasVisits = (w.visitCount ?? 0) > 0 || w.utilPct > 0;
                                const barColor = !hasVisits ? '#e5e7eb' : w.utilPct >= 90 ? '#ef4444' : w.utilPct >= 70 ? '#f59e0b' : '#10b981';
                                const textColor = !hasVisits ? 'text-gray-300' : w.utilPct >= 90 ? 'text-red-600' : w.utilPct >= 70 ? 'text-amber-600' : 'text-emerald-600';
                                return (
                                  <div key={i} className="flex flex-col items-center gap-0.5 w-9" data-testid={`horizon-week-${i}`} title={`${w.label}: ${w.utilPct}% · ${w.scheduledHrs}h scheduled`}>
                                    <div className="w-full rounded-t-sm" style={{ height: 28, backgroundColor: '#f3f4f6', position: 'relative' }}>
                                      <div className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all" style={{ height: `${Math.min(w.utilPct, 100)}%`, backgroundColor: barColor, minHeight: hasVisits ? 3 : 0 }} />
                                    </div>
                                    <p className={`text-[9px] font-bold leading-none ${textColor}`}>{hasVisits ? `${w.utilPct}%` : '—'}</p>
                                    <p className="text-[8px] text-gray-300 leading-none">{w.label}</p>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[9px] text-gray-300 mt-1">{aboveThreshold} of {nextFive.length} wks above 70%{gapWeeks > 0 ? ` · ${gapWeeks} gap wk${gapWeeks > 1 ? 's' : ''}` : ''}</p>
                          </>
                        )}
                        <p className="text-[8px] text-gray-200 mt-0.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-sm bg-gray-200 mr-1 align-middle" />gap
                          <span className="inline-block w-1.5 h-1.5 rounded-sm bg-emerald-400 ml-2 mr-1 align-middle" />&lt;70%
                          <span className="inline-block w-1.5 h-1.5 rounded-sm bg-amber-400 ml-2 mr-1 align-middle" />70–89%
                          <span className="inline-block w-1.5 h-1.5 rounded-sm bg-red-400 ml-2 mr-1 align-middle" />≥90%
                        </p>
                      </div>
                    );
                  })()}
                  {/* Labor stats */}
                  {metrics?.labor?.hasData ? (
                    <div className="border-t border-gray-100 pt-2 flex flex-col gap-2">
                      <div className="flex items-center gap-2" data-testid="labor-stat-ot-rate">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f5910015' }}>
                          <Zap className="w-3.5 h-3.5" style={{ color: '#f59100' }} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800 leading-none">{overtimeRatePct}%</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">OT Rate (30d)</p>
                        </div>
                        {overtimeRatePct >= hiringThresholds.otCritical && (
                          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700">High</span>
                        )}
                        {overtimeRatePct >= hiringThresholds.otWarn && overtimeRatePct < hiringThresholds.otCritical && (
                          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">Watch</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2" data-testid="labor-stat-actual-vs-sched">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#10b98115' }}>
                          <Activity className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800 leading-none">{actualHrs4wk}h <span className="text-gray-400 font-normal">/ {scheduledHrs4wk}h</span></p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Actual vs Sched (4wk)</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-gray-100 pt-2">
                      <p className="text-[10px] text-gray-300 italic">Upload a timesheet CSV to see labor analytics</p>
                    </div>
                  )}
                </div>

                {/* Weekly trend chart */}
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Weekly Utilization</p>
                  <p className="text-[9px] text-gray-300 mb-1">
                    <span className="inline-block w-2 h-2 rounded-sm bg-indigo-400 mr-1 align-middle" />past
                    <span className="inline-block w-2 h-2 rounded-sm bg-emerald-400 ml-2 mr-1 align-middle" />on track
                    <span className="inline-block w-2 h-2 rounded-sm bg-amber-400 ml-2 mr-1 align-middle" />watch
                    <span className="inline-block w-2 h-2 rounded-sm bg-red-400 ml-2 mr-1 align-middle" />critical
                  </p>
                  <div style={{ minHeight: 100 }}>
                    {staffingLoading ? (
                      <div className="h-24 bg-gray-50 rounded animate-pulse" />
                    ) : trendData.length === 0 ? (
                      <div className="h-24 flex flex-col items-center justify-center gap-1">
                        <p className="text-[11px] text-gray-400">Sync visits to populate</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={110}>
                        <BarChart data={trendData} margin={{ top: 2, right: 0, left: -20, bottom: 0 }} barSize={10}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={1} />
                          <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                          <ReferenceLine y={hiringThresholds.utilCritical} stroke="#BE1916" strokeDasharray="4 2" strokeWidth={1} />
                          <ReferenceLine y={hiringThresholds.utilWarn} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
                          <Tooltip
                            content={({ active, payload, label }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0]?.payload as StaffingWeek;
                              return (
                                <div className="bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl space-y-1">
                                  <p className="font-bold">{label} {d?.isFuture ? '(upcoming)' : '(past)'}</p>
                                  <p>Utilization: <span className="font-semibold">{d?.utilPct ?? 0}%</span></p>
                                  <p>Sched hrs: <span className="font-semibold">{d?.scheduledHrs}h</span></p>
                                  <p>Active techs: <span className="font-semibold">{d?.techCount}</span></p>
                                  {d?.visitCount != null && <p>Visits: <span className="font-semibold">{d.visitCount}</span></p>}
                                </div>
                              );
                            }}
                          />
                          <Bar dataKey="utilPct" radius={[3, 3, 0, 0]}>
                            {trendData.map((entry, index) => {
                              const fillColor = entry.isFuture
                                ? entry.utilPct >= hiringThresholds.utilCritical ? '#fca5a5'
                                : entry.utilPct >= hiringThresholds.utilWarn ? '#fcd34d'
                                : (entry.visitCount ?? 0) === 0 && entry.utilPct === 0 ? '#e5e7eb'
                                : '#6ee7b7'
                                : entry.utilPct >= hiringThresholds.utilCritical ? '#BE1916'
                                : entry.utilPct >= hiringThresholds.utilWarn ? '#f59e0b'
                                : '#818cf8';
                              return <Cell key={`cell-${index}`} fill={fillColor} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Tech Workload Drill-Down */}
                  <div className="border-t border-gray-100 pt-2">
                    <button
                      onClick={() => { setShowCrewDrilldown(!showCrewDrilldown); setCrewWeekOffset(0); }}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
                      data-testid="btn-crew-drilldown"
                    >
                      {showCrewDrilldown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showCrewDrilldown ? 'Hide' : 'View'} workload by tech
                    </button>
                    {showCrewDrilldown && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <button onClick={() => setCrewWeekOffset(o => o - 1)} className="p-0.5 rounded hover:bg-gray-100 text-gray-400" data-testid="crew-week-prev">
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[10px] font-semibold text-gray-600">
                            {crewWeekOffset === 0 ? 'This Week' : crewWeekOffset > 0 ? `+${crewWeekOffset} wk${crewWeekOffset !== 1 ? 's' : ''}` : `${crewWeekOffset} wk${crewWeekOffset !== -1 ? 's' : ''}`}
                          </span>
                          <button onClick={() => setCrewWeekOffset(o => o + 1)} className="p-0.5 rounded hover:bg-gray-100 text-gray-400" data-testid="crew-week-next">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {crewLoading ? (
                          <div className="h-20 bg-gray-50 rounded animate-pulse" />
                        ) : !crewByTech?.techs?.length ? (
                          <p className="text-[10px] text-gray-400 italic">No visits scheduled this week</p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {crewByTech.techs.map(t => {
                              const displayHrs = t.hasTimesheetData ? t.actualHrs : t.scheduledHrs;
                              const maxHrs = Math.max(...crewByTech.techs.map(x => x.hasTimesheetData ? x.actualHrs : x.scheduledHrs), 1);
                              const barPct = Math.min((displayHrs / maxHrs) * 100, 100);
                              return (
                                <div key={t.techName} className="flex items-center gap-2" data-testid={`crew-tech-${t.techName}`}>
                                  <div className="w-20 flex-shrink-0">
                                    <div className="text-[10px] text-gray-700 font-medium truncate">{t.techName.split(' ')[0]}</div>
                                    {t.isPartTime && <div className="text-[9px] text-amber-500 font-semibold leading-tight">part-time</div>}
                                  </div>
                                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div className={`h-2 rounded-full ${t.isPartTime ? 'bg-amber-300' : 'bg-indigo-400'}`} style={{ width: `${barPct}%` }} />
                                  </div>
                                  <div className="text-[10px] text-gray-500 text-right flex-shrink-0 min-w-[2.5rem]">
                                    {t.hasTimesheetData ? (
                                      <span>
                                        {t.actualHrs}h
                                        {t.otHrs > 0 && <span className="text-amber-500 ml-0.5">•&nbsp;{t.otHrs}&nbsp;OT</span>}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400" title="scheduled hours (no timesheet data)">{t.scheduledHrs}h <span className="text-[8px]">sched</span></span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-gray-400 w-6 text-right flex-shrink-0">{t.visitCount}v</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Labor Cost Spark */}
                  {metrics?.labor?.hasData && (metrics.labor.laborCostSpark?.length ?? 0) > 0 ? (
                    <div className="border-t border-gray-100 pt-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                        Labor Cost (6mo)
                        <span className="ml-2 font-normal normal-case text-gray-300">from timesheet import</span>
                      </p>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-800">{fmtDollar(metrics.labor.laborCostCurrentMonth ?? 0)}</span>
                        <span className={`text-[10px] font-semibold ${(metrics.labor.laborCostChangePct ?? 0) >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {(metrics.labor.laborCostChangePct ?? 0) >= 0 ? '+' : ''}{metrics.labor.laborCostChangePct?.toFixed(1)}% vs prior
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={55}>
                        <AreaChart data={metrics.labor.laborCostSpark} margin={{ top: 0, right: 0, left: -35, bottom: 0 }}>
                          <defs>
                            <linearGradient id="laborCostGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                          <YAxis hide />
                          <Area type="monotone" dataKey="v" stroke="#f59e0b" strokeWidth={1.5} fill="url(#laborCostGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* ── 5. Settings Panel ── */}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <button
                  onClick={() => setShowHiringSettings(v => !v)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors"
                  data-testid="btn-hiring-settings"
                >
                  {showHiringSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <Settings2 className="w-3 h-3" />
                  Adjust Thresholds
                </button>
                {showHiringSettings && (
                  <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3" data-testid="hiring-settings-panel">
                    {([
                      { key: 'utilWarn', label: 'Utilization Warn (%)', min: 50, max: 99 },
                      { key: 'utilCritical', label: 'Utilization Critical (%)', min: 50, max: 100 },
                      { key: 'fwdWarn', label: 'Forward Booked Warn (wks)', min: 1, max: 10 },
                      { key: 'fwdCritical', label: 'Forward Booked Critical (wks)', min: 1, max: 12 },
                      { key: 'otWarn', label: 'OT Rate Warn (%)', min: 0, max: 30 },
                      { key: 'otCritical', label: 'OT Rate Critical (%)', min: 0, max: 50 },
                      { key: 'weeksRequired', label: 'Weeks Required to Escalate', min: 1, max: 4 },
                    ] as Array<{ key: keyof typeof hiringThresholds; label: string; min: number; max: number }>).map(({ key, label, min, max }) => (
                      <div key={key} className="flex items-center justify-between gap-2">
                        <label className="text-[10px] text-gray-500 flex-1">{label}</label>
                        <input
                          type="number"
                          min={min}
                          max={max}
                          value={hiringThresholds[key]}
                          onChange={e => setHiringThresholds({ ...hiringThresholds, [key]: Number(e.target.value) })}
                          className="w-16 text-center text-[11px] font-semibold border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-indigo-400"
                          data-testid={`input-threshold-${key}`}
                        />
                      </div>
                    ))}
                    <div className="col-span-2 mt-1">
                      <button
                        onClick={() => resetHiringThresholds()}
                        className="text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                        data-testid="btn-reset-thresholds"
                      >
                        Reset to defaults
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 6. Scenario Calculator ── */}
              <div className="border-t border-gray-100 pt-3 mt-1">
                <button
                  onClick={() => setShowScenario(v => !v)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors"
                  data-testid="btn-scenario-calculator"
                >
                  {showScenario ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  What-If Scenarios
                </button>
                {showScenario && (
                  <div className="mt-3" data-testid="scenario-calculator-panel">
                    <p className="text-[10px] text-gray-400 mb-2">Projected utilization and status after applying each scenario. No data is saved.</p>
                    <div className="flex flex-wrap gap-2">
                      {scenarios.map(s => {
                        const projected = applyScenario(rollingAvgUtilization, baseTechCount, s.deltaTechs, s.deltaWork);
                        const projectedScores = scoreSignals(
                          { rollingAvgUtilization: projected, forwardBookedWeeks, overtimeRatePct, actualHrs4wk, scheduledHrs4wk, weeks: trendData },
                          hiringThresholds
                        );
                        const projCfg = levelConfig[projectedScores.overall];
                        return (
                          <div key={s.label} className="flex flex-col items-center gap-0.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-w-[90px]" data-testid={`scenario-${s.label.replace(/\s+/g, '-').toLowerCase()}`}>
                            <span className="text-[10px] font-semibold text-gray-600">{s.label}</span>
                            <span className="text-base font-black text-gray-800">{projected}%</span>
                            <span className={`text-[9px] font-bold border rounded-full px-2 py-0.5 mt-0.5 ${projCfg.pill}`}>{projCfg.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* ── 7. Supporting Indicators (Stubs) ── */}
              <div className="border-t border-gray-100 pt-3 mt-1">
                <button
                  onClick={() => setShowStubs(v => !v)}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 transition-colors"
                  data-testid="btn-supporting-indicators"
                >
                  {showStubs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <Package className="w-3 h-3" />
                  Supporting Indicators
                </button>
                {showStubs && (
                  <div className="mt-3 grid grid-cols-3 gap-2" data-testid="supporting-indicators-panel">
                    {/* TODO: connect to real data source — sold-but-not-scheduled pipeline hours */}
                    <div className="border border-dashed border-gray-300 rounded-lg px-3 py-2 flex flex-col gap-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Sold, Not Scheduled</p>
                      <p className="text-[11px] text-gray-300 italic">No data yet</p>
                      <p className="text-[9px] text-gray-200">Hours sold but not yet placed on calendar. Future: connect to BuildOps job pipeline.</p>
                    </div>
                    {/* TODO: connect to real data source — pipeline uplift toggle */}
                    <div className="border border-dashed border-gray-300 rounded-lg px-3 py-2 flex flex-col gap-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Pipeline Uplift</p>
                      <p className="text-[11px] text-gray-300 italic">Stub toggle</p>
                      <p className="text-[9px] text-gray-200">Adds a configurable % uplift to forward demand for scenario modeling. Future: read from CRM pipeline.</p>
                    </div>
                    {/* TODO: connect to real data source — service vs project split from BuildOps job type */}
                    <div className="border border-dashed border-gray-300 rounded-lg px-3 py-2 flex flex-col gap-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Service / Project Split</p>
                      <p className="text-[11px] text-gray-600 font-semibold">~70% / 30%</p>
                      <p className="text-[9px] text-gray-200">Mocked ratio. Future: read from BuildOps job type flag when reliably populated.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Job Margin ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5" data-testid="section-job-margin">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-4 h-4" style={{ color: PRIMARY }} />
            <span className="text-sm font-bold text-gray-800">Job Margin</span>
            <span className="ml-1 text-[10px] text-gray-400">— avg gross margin % · 6-month trend</span>
          </div>
          {jobMarginLoading ? (
            <div className="h-28 bg-gray-50 rounded animate-pulse" />
          ) : !jobMargin?.hasData ? (
            <div className="h-28 flex flex-col items-center justify-center gap-1">
              <p className="text-[11px] text-gray-400">No job margin data yet</p>
              <p className="text-[10px] text-gray-300">Upload a BuildOps Job Cost / Margin CSV to populate</p>
            </div>
          ) : (
            <div className="flex gap-6">
              {/* Stats */}
              <div className="flex flex-col gap-3 min-w-[130px]">
                <div data-testid="job-margin-avg-pct">
                  <p className="text-2xl font-bold text-gray-900">{jobMargin.avgMarginPct?.toFixed(1)}%</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Avg Gross Margin</p>
                  <p className="text-[10px] text-gray-300">{jobMargin.jobCount?.toLocaleString()} jobs analysed</p>
                </div>
                {jobMargin.totalGrossProfit != null && (
                  <div data-testid="job-margin-gross-profit">
                    <p className="text-sm font-bold text-emerald-700">{fmtDollar(jobMargin.totalGrossProfit)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Total Gross Profit</p>
                  </div>
                )}
                {jobMargin.totalRevenue != null && (
                  <div data-testid="job-margin-total-revenue">
                    <p className="text-xs font-semibold text-gray-600">{fmtDollar(jobMargin.totalRevenue)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Total Revenue</p>
                  </div>
                )}
              </div>
              {/* Sparkline */}
              {(jobMargin.monthly?.length ?? 0) > 0 && (
                <div className="flex-1 flex flex-col gap-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Margin % (6mo)</p>
                  <ResponsiveContainer width="100%" height={90}>
                    <AreaChart data={jobMargin.monthly} margin={{ top: 4, right: 0, left: -35, bottom: 0 }}>
                      <defs>
                        <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="label" tick={{ fontSize: 8, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis hide />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl">
                              <p className="font-bold mb-0.5">{label}</p>
                              <p>Avg Margin: <span className="font-semibold text-emerald-400">{(payload[0]?.value as number)?.toFixed(1)}%</span></p>
                            </div>
                          );
                        }}
                      />
                      <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={1.5} fill="url(#marginGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Team Performance ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm" data-testid="section-team-performance">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: PRIMARY }} />
              <span className="text-sm font-bold text-gray-800">Team Performance</span>
              <span className="ml-1 text-[10px] text-gray-400">— revenue vs. target · activity · pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              {(teamPerf ?? []).filter(m => m.status === "inactive").length > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  {(teamPerf ?? []).filter(m => m.status === "inactive").length} inactive
                </span>
              )}
              {(teamPerf ?? []).filter(m => m.status === "at_risk").length > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  {(teamPerf ?? []).filter(m => m.status === "at_risk").length} at risk
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-5 py-3">Member</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Status</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Revenue vs. Target</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Pipeline</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Win Rate</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Activity (MTD)</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {teamPerfLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" /><div className="space-y-1"><div className="h-3 w-28 bg-gray-100 rounded animate-pulse" /><div className="h-2.5 w-20 bg-gray-100 rounded animate-pulse" /></div></div></td>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5"><div className="h-3 w-16 bg-gray-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : !teamPerf || teamPerf.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">No team members found</td>
                  </tr>
                ) : (
                  teamPerf.map((member, i) => {
                    const sc = STATUS_CONFIG[member.status];
                    const revPct = member.revenueTarget > 0 ? Math.min((member.revenueMTD / member.revenueTarget) * 100, 100) : 0;
                    const isLow = revPct < 70;
                    const isMid = revPct >= 70 && revPct < 90;
                    const barColor = isLow ? "#ef4444" : isMid ? "#f59e0b" : "#10b981";
                    return (
                      <tr key={member.userId} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors ${member.status === "inactive" ? "opacity-80" : ""}`} data-testid={`team-row-${i}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ backgroundColor: member.avatarColor }}>
                              {member.initials}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{member.name}</p>
                              <p className="text-[10px] text-gray-400 capitalize">{member.role.replace(/_/g, " ")}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`flex items-center gap-1.5 text-[11px] font-semibold border rounded-full px-2.5 py-1 w-fit ${sc.badge} ${sc.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-gray-700">{fmtDollar(member.revenueMTD)}</span>
                                <span className="text-[10px] text-gray-400">{Math.round(revPct)}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${revPct}%`, backgroundColor: barColor }} />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">of {fmtDollar(member.revenueTarget)} target</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-semibold text-gray-700">{fmtDollar(member.pipelineValue)}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-gray-700">{member.winRate !== null ? `${member.winRate}%` : "—"}</span>
                            {member.winRateChange !== null && (
                              <span className={`text-[10px] font-semibold ${member.winRateChange > 0 ? "text-emerald-600" : member.winRateChange < 0 ? "text-red-500" : "text-gray-400"}`}>
                                {member.winRateChange > 0 ? `+${member.winRateChange}pp` : member.winRateChange < 0 ? `${member.winRateChange}pp` : "—"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-[11px] text-gray-500">
                              <PhoneCall className="w-3 h-3 text-gray-300" />
                              <span className="font-semibold text-gray-700">{member.callsMTD}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500">
                              <Calendar className="w-3 h-3 text-gray-300" />
                              <span className="font-semibold text-gray-700">{member.meetingsMTD}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500">
                              <Mail className="w-3 h-3 text-gray-300" />
                              <span className="font-semibold text-gray-700">{member.proposalsMTD}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs ${member.status === "inactive" ? "text-red-500 font-semibold" : member.status === "at_risk" ? "text-amber-600 font-semibold" : "text-gray-400"}`}>
                            {member.lastActiveDisplay}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Drill-down detail (toggleable) ───────────────────────────────── */}
        {showDetail && (
          <div ref={detailRef} className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div data-testid="section-alerts">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Proactive Alerts</p>
              <div className="space-y-2">
                {ALERTS.map((alert, i) => {
                  const c = alertColors[alert.level];
                  const Icon = alert.icon;
                  return (
                    <div key={i} className={`flex items-start gap-3 ${c.bg} border ${c.border} rounded-xl px-4 py-3`} data-testid={`alert-${alert.level}-${i}`}>
                      <Icon className={`w-4 h-4 ${c.icon} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-800">{alert.label}</span>
                        <span className="text-xs text-gray-500 ml-2">{alert.detail}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm" data-testid="section-ai-summary">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4" style={{ color: PRIMARY }} />
                  <span className="text-sm font-bold text-gray-800">AI Executive Summary — {period.charAt(0).toUpperCase() + period.slice(1)} View</span>
                </div>
                <button
                  data-testid="button-regenerate-summary"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                  {isRegenerating ? "Generating…" : "Regenerate"}
                </button>
              </div>
              <div className="px-5 py-4">
                {isRegenerating ? (
                  <div className="space-y-2 animate-pulse">
                    {[80, 95, 60, 75, 90].map((w, i) => (
                      <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                ) : (
                  <div>{renderSummary(summary)}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col" style={{ minHeight: 400 }} data-testid="section-ai-chat">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                  <Bot className="w-4 h-4" style={{ color: PRIMARY }} />
                  <span className="text-sm font-bold text-gray-800">Ask the AI</span>
                  <span className="ml-auto text-[10px] text-gray-400 font-medium">Data-grounded answers</span>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 320 }}>
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "ai" && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: PRIMARY }}>
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === "user" ? "text-white rounded-br-sm" : "bg-gray-50 text-gray-700 border border-gray-100 rounded-bl-sm"}`}
                        style={msg.role === "user" ? { backgroundColor: PRIMARY } : {}}
                        data-testid={`chat-message-${msg.role}-${i}`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isSending && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: PRIMARY }}>
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="bg-gray-50 border border-gray-100 rounded-xl rounded-bl-sm px-3.5 py-2.5">
                        <div className="flex gap-1 items-center h-4">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <input
                      data-testid="input-chat-message"
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                      placeholder="Ask about revenue, margin, pipeline…"
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3.5 py-2 outline-none focus:ring-2 focus:border-transparent"
                      disabled={isSending}
                    />
                    <button
                      data-testid="button-send-chat"
                      onClick={handleSendMessage}
                      disabled={isSending || !chatInput.trim()}
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-opacity"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      <Send className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col" data-testid="section-file-upload">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
                  <FileSpreadsheet className="w-4 h-4" style={{ color: PRIMARY }} />
                  <span className="text-sm font-bold text-gray-800">Data Upload</span>
                  <span className="ml-auto text-[10px] text-gray-400 font-medium">Jobs, Visits, SA, Invoices, Timesheets, Job Margin all persisted · unrecognized CSVs logged</span>
                </div>
                <div className="px-5 py-4 flex-1 space-y-4">
                  <div
                    onClick={() => importStatus.status !== 'uploading' && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${importStatus.status === 'uploading' ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                    data-testid="dropzone-file-upload"
                  >
                    {importStatus.status === 'uploading' ? (
                      <>
                        <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                        <p className="text-sm font-semibold text-blue-600">Importing…</p>
                        <p className="text-xs text-blue-400">Parsing and upserting rows to database</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-300" />
                        <p className="text-sm font-semibold text-gray-500">Drop Excel or CSV here</p>
                        <p className="text-xs text-gray-400">.xlsx, .csv — max 25 MB · Jobs, Visits, Invoices, SAs, Timesheets, Job Margin auto-detected · others logged</p>
                        <button data-testid="button-browse-files" className="mt-1 px-4 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all">
                          Browse files
                        </button>
                      </>
                    )}
                    <input ref={fileInputRef} type="file" accept=".xlsx,.csv" multiple onChange={handleFileUpload} className="hidden" data-testid="input-file-upload" />
                  </div>

                  {/* Import status banner */}
                  {importStatus.status === 'success' && (
                    <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-2.5" data-testid="banner-import-success">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-emerald-700">Import successful</p>
                        <p className="text-[11px] text-emerald-600 leading-relaxed">{importStatus.message}</p>
                      </div>
                      <button onClick={() => setImportStatus({ status: 'idle' })} className="text-emerald-300 hover:text-emerald-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {importStatus.status === 'error' && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5" data-testid="banner-import-error">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-[11px] font-bold text-red-700">Import failed</p>
                        <p className="text-[11px] text-red-600 leading-relaxed">{importStatus.message}</p>
                      </div>
                      <button onClick={() => setImportStatus({ status: 'idle' })} className="text-red-300 hover:text-red-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Uploaded ({uploadedFiles.length})</p>
                    <div className="space-y-2">
                      {uploadedFiles.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No files uploaded yet</p>}
                      {uploadedFiles.map((file, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-2.5" data-testid={`file-item-${i}`}>
                          <FileSpreadsheet className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700 truncate">{file.name}</p>
                            <p className="text-[10px] text-gray-400">{file.size} · {file.uploadedAt}</p>
                          </div>
                          <button data-testid={`button-remove-file-${i}`} onClick={() => setUploadedFiles(prev => prev.filter(f => f.name !== file.name))} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                    <p className="text-[11px] text-blue-600 leading-relaxed">
                      <span className="font-bold">Context tip:</span> BuildOps CSVs are automatically detected by column headers and imported to the database — Timesheets, Invoices, Jobs, Visits, Service Agreements, and Job Margin / Cost reports are all persisted. Unrecognized CSVs have their filename and column headers stored for future use.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pb-6" />
      </div>
    </div>
  );
}
