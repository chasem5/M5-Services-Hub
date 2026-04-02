import { useState, useRef, useEffect } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Target, Percent,
  RefreshCw, AlertTriangle, AlertCircle, CheckCircle2,
  Send, Upload, FileSpreadsheet, X, Lock, Bot,
  BarChart2, Repeat2, ChevronRight, ChevronDown, ChevronUp,
  Clock, Wrench, Zap, Users, Activity, PhoneCall, Mail, Calendar,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

const PRIMARY = "#BE1916";

// ── Types ──────────────────────────────────────────────────────────────────────
interface SparkPoint { label: string; v: number; }
interface CeoMetrics {
  lastUpdated: string;
  revenue: { current: number; prevMonth: number; changePct: number; up: boolean; monthly: SparkPoint[] };
  saContractRevenue: { current: number; prevMonth: number; changePct: number; up: boolean; activeCount: number; monthly: SparkPoint[] };
  pipeline: { value: number; dealCount: number; monthly: SparkPoint[] };
  quoteConversionRate: { value: number; current30d: number; prev30d: number; changePt: number; up: boolean; monthly: SparkPoint[] };
  collectionsOutstanding: { total: number; bucket030: number; bucket3060: number; bucket6090: number; bucket90plus: number; monthly: SparkPoint[] };
  operationalKpis: {
    dso: { value: number; target: number };
    backlog: { value: number; target: number };
    recurringRevPct: { value: number; target: number };
    utilizationRate: { value: number | null; target: number };
    firstTimeFixRate: { value: number | null; target: number };
    quoteConversionRate: { value: number; target: number };
  };
  topCustomers: { name: string; revenue: number; invoiceCount: number }[];
  activeJobs: { total: number; byStatus: { status: string; count: number }[] };
  visitsSync: { totalVisits: number; completedVisits: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDollar(v: number) {
  return v >= 1000000 ? `$${(v / 1000000).toFixed(2)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`;
}

function fmtChange(pct: number, unit = "%") {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}${unit}`;
}

// ── Fallback spark data (shown while loading) ─────────────────────────────────
const FALLBACK_SPARK: SparkPoint[] = Array.from({ length: 12 }, (_, i) => ({ label: `M${i + 1}`, v: 0 }));

// ── Team performance data ─────────────────────────────────────────────────────
type ActivityStatus = "active" | "at_risk" | "inactive";
interface TeamMember {
  name: string;
  initials: string;
  role: "Account Manager" | "Field Lead" | "Senior AM";
  status: ActivityStatus;
  lastActive: string;
  revenueTarget: number;
  revenueClosed: number;
  pipeline: string;
  winRate: number;
  winRateChange: number;
  calls: number;
  meetings: number;
  proposals: number;
  color: string;
}

const TEAM: TeamMember[] = [
  {
    name: "Sarah Chen",
    initials: "SC",
    role: "Senior AM",
    status: "active",
    lastActive: "Today, 2:14 PM",
    revenueTarget: 400000,
    revenueClosed: 387000,
    pipeline: "$610K",
    winRate: 68,
    winRateChange: 3,
    calls: 24,
    meetings: 11,
    proposals: 9,
    color: "#3b82f6",
  },
  {
    name: "Marcus Rodriguez",
    initials: "MR",
    role: "Account Manager",
    status: "active",
    lastActive: "Today, 11:40 AM",
    revenueTarget: 300000,
    revenueClosed: 294000,
    pipeline: "$480K",
    winRate: 61,
    winRateChange: 1,
    calls: 18,
    meetings: 8,
    proposals: 7,
    color: "#8b5cf6",
  },
  {
    name: "David Park",
    initials: "DP",
    role: "Account Manager",
    status: "at_risk",
    lastActive: "5 days ago",
    revenueTarget: 300000,
    revenueClosed: 201000,
    pipeline: "$310K",
    winRate: 52,
    winRateChange: -4,
    calls: 6,
    meetings: 2,
    proposals: 3,
    color: "#f59e0b",
  },
  {
    name: "Lisa Torres",
    initials: "LT",
    role: "Account Manager",
    status: "active",
    lastActive: "Today, 9:55 AM",
    revenueTarget: 300000,
    revenueClosed: 218000,
    pipeline: "$390K",
    winRate: 58,
    winRateChange: 0,
    calls: 20,
    meetings: 9,
    proposals: 6,
    color: "#10b981",
  },
  {
    name: "James Wu",
    initials: "JW",
    role: "Field Lead",
    status: "active",
    lastActive: "Today, 3:00 PM",
    revenueTarget: 250000,
    revenueClosed: 243000,
    pipeline: "$120K",
    winRate: 74,
    winRateChange: 2,
    calls: 31,
    meetings: 6,
    proposals: 4,
    color: "#06b6d4",
  },
  {
    name: "Tony Reeves",
    initials: "TR",
    role: "Account Manager",
    status: "inactive",
    lastActive: "8 days ago",
    revenueTarget: 280000,
    revenueClosed: 118000,
    pipeline: "$190K",
    winRate: 41,
    winRateChange: -7,
    calls: 3,
    meetings: 1,
    proposals: 1,
    color: "#ef4444",
  },
];

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
  const [period, setPeriod] = useState<Period>("monthly");
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
    queryKey: ["/api/ceo/metrics"],
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
  const revenueData = rev?.monthly ?? FALLBACK_SPARK;

  function handlePeriodChange(p: Period) {
    setPeriod(p);
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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const now = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
    setUploadedFiles(prev => [
      ...prev,
      ...files.map(f => ({
        name: f.name,
        size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
        uploadedAt: now,
      })),
    ]);
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

      <div className="px-6 py-5 max-w-screen-xl mx-auto space-y-5">

        {/* ── KPI Strip with sparklines ─────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3" data-testid="section-kpi-strip">
          {[
            { label: "Revenue", icon: DollarSign, ...liveKpi.revenue, sparkData: revenueData, fmt: "dollar" },
            { label: "Pipeline", icon: BarChart2, ...liveKpi.pipeline, sparkData: pipe?.monthly ?? FALLBACK_SPARK, fmt: "dollar" },
            { label: "Quote Conv.", icon: Target, ...liveKpi.quoteConversionRate, sparkData: qcr?.monthly ?? FALLBACK_SPARK, fmt: "pct" },
            { label: "SA Contract Rev", icon: Repeat2, ...liveKpi.saContractRevenue, sparkData: sa?.monthly ?? FALLBACK_SPARK, fmt: "dollar" },
            { label: "Collections", icon: Percent, ...liveKpi.collectionsOutstanding, sparkData: ar?.monthly ?? FALLBACK_SPARK, fmt: "dollar" },
          ].map(({ label, icon: Icon, value, change, up, sparkData, fmt }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 pt-3.5 pb-0 overflow-hidden" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
                <Icon className="w-3.5 h-3.5 text-gray-300" />
              </div>
              <div className="text-2xl font-black text-gray-900 leading-tight" style={{ fontFamily: "'Archivo Black', sans-serif" }}>{value}</div>
              <div className={`flex items-center gap-1 mt-0.5 mb-2 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {change}
              </div>
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
          <div className="grid grid-cols-6 gap-3">
            {[
              {
                label: "Utilization Rate",
                value: opsKpis?.utilizationRate.value != null ? `${opsKpis.utilizationRate.value}%` : "—",
                target: "85%", change: "+2pp", up: true, icon: Activity, color: "#3b82f6",
                tip: "Actual visit duration ÷ minimum duration. Target: 85%+ (requires visits sync)",
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
                label: "First-Time Fix Rate",
                value: opsKpis?.firstTimeFixRate.value != null ? `${opsKpis.firstTimeFixRate.value}%` : "—",
                target: "90%", change: "+3pp", up: true, icon: Wrench, color: "#10b981",
                tip: "% of jobs resolved with a single visit. Target: 90%+ (requires visits sync)",
                progress: opsKpis?.firstTimeFixRate.value ?? 0,
                targetPct: opsKpis?.firstTimeFixRate.target ?? 90,
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
                label: "Backlog Value",
                value: opsKpis ? fmtDollar(opsKpis.backlog.value) : "—",
                target: "$1M+", change: "+14%", up: true, icon: BarChart2, color: "#06b6d4",
                tip: "Quoted value of open/active jobs (active departments only).",
                progress: opsKpis ? Math.min(opsKpis.backlog.value / opsKpis.backlog.target * 100, 100) : 0,
                targetPct: 100,
              },
              {
                label: "Recurring Rev %",
                value: opsKpis ? `${opsKpis.recurringRevPct.value}%` : "—",
                target: "40%", change: "+2pp", up: true, icon: Repeat2, color: "#ec4899",
                tip: "% of invoiced revenue tagged to service agreement jobs (last 6 months).",
                progress: opsKpis?.recurringRevPct.value ?? 0,
                targetPct: opsKpis?.recurringRevPct.target ?? 40,
              },
            ].map((k) => {
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 leading-tight">{k.label}</p>
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
          <div className="h-48">
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
                <Area type="monotone" dataKey="v" stroke={PRIMARY} strokeWidth={2.5} fill="url(#rev-grad)" dot={false} activeDot={{ r: 4, fill: PRIMARY }} />
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
            <div className="h-28 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(pipe?.monthly ?? FALLBACK_SPARK).slice(-6)} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} barSize={14}>
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
            <div className="h-28 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={(qcr?.monthly ?? FALLBACK_SPARK).slice(-6)} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Collections Outstanding</p>
              <Activity className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-0.5" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              {liveKpi.collectionsOutstanding.value}
              <span className={`text-xs font-semibold ml-1.5 ${liveKpi.collectionsOutstanding.up ? "text-emerald-600" : "text-red-500"}`}>{liveKpi.collectionsOutstanding.change}</span>
            </p>
            <div className="h-28 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(ar?.monthly ?? FALLBACK_SPARK).slice(-6)} margin={{ top: 2, right: 0, left: 4, bottom: 0 }}>
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
            <div className="h-28 mt-2">
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

        {/* ── Team Performance ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm" data-testid="section-team-performance">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: PRIMARY }} />
              <span className="text-sm font-bold text-gray-800">Team Performance</span>
              <span className="ml-1 text-[10px] text-gray-400">— revenue vs. target · activity · pipeline</span>
            </div>
            <div className="flex items-center gap-2">
              {TEAM.filter(m => m.status === "inactive").length > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                  {TEAM.filter(m => m.status === "inactive").length} inactive
                </span>
              )}
              {TEAM.filter(m => m.status === "at_risk").length > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                  {TEAM.filter(m => m.status === "at_risk").length} at risk
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
                {TEAM.map((member, i) => {
                  const sc = STATUS_CONFIG[member.status];
                  const revPct = Math.min((member.revenueClosed / member.revenueTarget) * 100, 100);
                  const isLow = revPct < 70;
                  const isMid = revPct >= 70 && revPct < 90;
                  const barColor = isLow ? "#ef4444" : isMid ? "#f59e0b" : "#10b981";
                  return (
                    <tr key={member.name} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors ${member.status === "inactive" ? "opacity-80" : ""}`} data-testid={`team-row-${i}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ backgroundColor: member.color }}>
                            {member.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{member.name}</p>
                            <p className="text-[10px] text-gray-400">{member.role}</p>
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
                              <span className="text-xs font-semibold text-gray-700">{fmtDollar(member.revenueClosed)}</span>
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
                        <span className="text-sm font-semibold text-gray-700">{member.pipeline}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-700">{member.winRate}%</span>
                          <span className={`text-[10px] font-semibold ${member.winRateChange > 0 ? "text-emerald-600" : member.winRateChange < 0 ? "text-red-500" : "text-gray-400"}`}>
                            {member.winRateChange > 0 ? `+${member.winRateChange}pp` : member.winRateChange < 0 ? `${member.winRateChange}pp` : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <PhoneCall className="w-3 h-3 text-gray-300" />
                            <span className="font-semibold text-gray-700">{member.calls}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Calendar className="w-3 h-3 text-gray-300" />
                            <span className="font-semibold text-gray-700">{member.meetings}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Mail className="w-3 h-3 text-gray-300" />
                            <span className="font-semibold text-gray-700">{member.proposals}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs ${member.status === "inactive" ? "text-red-500 font-semibold" : member.status === "at_risk" ? "text-amber-600 font-semibold" : "text-gray-400"}`}>
                          {member.lastActive}
                        </span>
                      </td>
                    </tr>
                  );
                })}
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
                  <span className="ml-auto text-[10px] text-gray-400 font-medium">Added to AI context</span>
                </div>
                <div className="px-5 py-4 flex-1 space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-all"
                    data-testid="dropzone-file-upload"
                  >
                    <Upload className="w-6 h-6 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-500">Drop Excel or CSV here</p>
                    <p className="text-xs text-gray-400">.xlsx, .csv — max 25 MB</p>
                    <button data-testid="button-browse-files" className="mt-1 px-4 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all">
                      Browse files
                    </button>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.csv" multiple onChange={handleFileUpload} className="hidden" data-testid="input-file-upload" />
                  </div>
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
                      <span className="font-bold">Context tip:</span> Uploaded files are included in AI summary generation and chat for the current session. They are not stored permanently.
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
