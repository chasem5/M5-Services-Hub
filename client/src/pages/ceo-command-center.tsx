import { useState, useRef, useEffect } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Target, Percent,
  RefreshCw, AlertTriangle, AlertCircle, CheckCircle2,
  Send, Upload, FileSpreadsheet, X, Lock, Bot,
  BarChart2, Repeat2, ChevronRight, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

const PRIMARY = "#BE1916";

// ── Time-series data ──────────────────────────────────────────────────────────
const REVENUE_MONTHLY = [
  { label: "May", v: 890000 },
  { label: "Jun", v: 940000 },
  { label: "Jul", v: 870000 },
  { label: "Aug", v: 1010000 },
  { label: "Sep", v: 1080000 },
  { label: "Oct", v: 1150000 },
  { label: "Nov", v: 1020000 },
  { label: "Dec", v: 1090000 },
  { label: "Jan", v: 980000 },
  { label: "Feb", v: 1060000 },
  { label: "Mar", v: 1040000 },
  { label: "Apr", v: 1240000 },
];

const REVENUE_WEEKLY = [
  { label: "W1", v: 241000 },
  { label: "W2", v: 258000 },
  { label: "W3", v: 280700 },
  { label: "W4", v: 312750 },
];

const REVENUE_DAILY = [
  { label: "Mon", v: 41200 },
  { label: "Tue", v: 38800 },
  { label: "Wed", v: 45500 },
  { label: "Thu", v: 48320 },
];

const MRR_MONTHLY = [
  { label: "May", v: 148000 },
  { label: "Jun", v: 153000 },
  { label: "Jul", v: 155000 },
  { label: "Aug", v: 159000 },
  { label: "Sep", v: 162000 },
  { label: "Oct", v: 166000 },
  { label: "Nov", v: 169000 },
  { label: "Dec", v: 172000 },
  { label: "Jan", v: 175000 },
  { label: "Feb", v: 180000 },
  { label: "Mar", v: 184000 },
  { label: "Apr", v: 187400 },
];

const WIN_RATE_MONTHLY = [
  { label: "May", v: 54 },
  { label: "Jun", v: 57 },
  { label: "Jul", v: 55 },
  { label: "Aug", v: 59 },
  { label: "Sep", v: 56 },
  { label: "Oct", v: 60 },
  { label: "Nov", v: 58 },
  { label: "Dec", v: 61 },
  { label: "Jan", v: 57 },
  { label: "Feb", v: 59 },
  { label: "Mar", v: 58 },
  { label: "Apr", v: 61 },
];

const PIPELINE_MONTHLY = [
  { label: "May", v: 1.4 },
  { label: "Jun", v: 1.6 },
  { label: "Jul", v: 1.5 },
  { label: "Aug", v: 1.7 },
  { label: "Sep", v: 1.9 },
  { label: "Oct", v: 1.8 },
  { label: "Nov", v: 1.7 },
  { label: "Dec", v: 1.9 },
  { label: "Jan", v: 1.8 },
  { label: "Feb", v: 1.9 },
  { label: "Mar", v: 2.0 },
  { label: "Apr", v: 2.1 },
];

const MARGIN_MONTHLY = [
  { label: "May", v: 36.2 },
  { label: "Jun", v: 35.8 },
  { label: "Jul", v: 34.9 },
  { label: "Aug", v: 36.1 },
  { label: "Sep", v: 35.6 },
  { label: "Oct", v: 36.4 },
  { label: "Nov", v: 35.2 },
  { label: "Dec", v: 35.8 },
  { label: "Jan", v: 34.9 },
  { label: "Feb", v: 35.4 },
  { label: "Mar", v: 35.3 },
  { label: "Apr", v: 35.1 },
];

// ── KPI data ──────────────────────────────────────────────────────────────────
const KPI_DATA = {
  daily: {
    revenue: { value: "$48,320", change: "+6.2%", up: true },
    pipeline: { value: "$2.1M", change: "-3.1%", up: false },
    winRate: { value: "62%", change: "+4pp", up: true },
    mrr: { value: "$187,400", change: "+1.2%", up: true },
    margin: { value: "34.8%", change: "-0.9pp", up: false },
  },
  weekly: {
    revenue: { value: "$312,750", change: "+11.4%", up: true },
    pipeline: { value: "$2.1M", change: "+5.8%", up: true },
    winRate: { value: "58%", change: "-2pp", up: false },
    mrr: { value: "$187,400", change: "+1.2%", up: true },
    margin: { value: "35.6%", change: "+0.4pp", up: true },
  },
  monthly: {
    revenue: { value: "$1.24M", change: "+18.7%", up: true },
    pipeline: { value: "$2.1M", change: "+12.3%", up: true },
    winRate: { value: "61%", change: "+3pp", up: true },
    mrr: { value: "$187,400", change: "+8.9%", up: true },
    margin: { value: "35.1%", change: "-0.2pp", up: false },
  },
};

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

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number, type: "dollar" | "pct" | "m" = "dollar") {
  if (type === "m") return `$${v.toFixed(1)}M`;
  if (type === "pct") return `${v}%`;
  return v >= 1000000
    ? `$${(v / 1000000).toFixed(2)}M`
    : `$${(v / 1000).toFixed(0)}K`;
}

const CustomTooltip = ({ active, payload, label, format }: any) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="font-bold text-gray-900">
        {format === "pct" ? `${v}%` : format === "m" ? `$${v}M` : fmt(v)}
      </p>
    </div>
  );
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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    { name: "BuildOps_JobCostReport_Q1.xlsx", size: "284 KB", uploadedAt: "Apr 1, 2026 — 9:14 AM" },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const kpi = KPI_DATA[period];
  const summary = SUMMARIES[period];

  const revenueData = period === "monthly" ? REVENUE_MONTHLY : period === "weekly" ? REVENUE_WEEKLY : REVENUE_DAILY;

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
        "I recommend reviewing the underlying job-level detail in the estimates vs. actuals report for a complete picture. " +
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
          {/* Alert pills */}
          <div className="hidden sm:flex items-center gap-2">
            {redCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                {redCount} danger
              </span>
            )}
            {amberCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                {amberCount} watch
              </span>
            )}
            {greenCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                {greenCount} positive
              </span>
            )}
          </div>

          {/* Period selector */}
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

        {/* ── KPI strip with sparklines ─────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3" data-testid="section-kpi-strip">
          {[
            { label: "Revenue", icon: DollarSign, ...kpi.revenue, sparkData: revenueData, fmt: "dollar" as const },
            { label: "Pipeline", icon: BarChart2, ...kpi.pipeline, sparkData: PIPELINE_MONTHLY, fmt: "m" as const },
            { label: "Win Rate", icon: Target, ...kpi.winRate, sparkData: WIN_RATE_MONTHLY, fmt: "pct" as const },
            { label: "MRR", icon: Repeat2, ...kpi.mrr, sparkData: MRR_MONTHLY, fmt: "dollar" as const },
            { label: "Margin %", icon: Percent, ...kpi.margin, sparkData: MARGIN_MONTHLY, fmt: "pct" as const },
          ].map(({ label, icon: Icon, value, change, up, sparkData, fmt: fmtType }) => (
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
              {/* Sparkline */}
              <div className="h-12 -mx-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={up ? "#10b981" : PRIMARY} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={up ? "#10b981" : PRIMARY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={up ? "#10b981" : PRIMARY}
                      strokeWidth={1.5}
                      fill={`url(#grad-${label})`}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        {/* ── Hero chart: Revenue trend ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5" data-testid="section-revenue-chart">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Revenue Trend</p>
              <p className="text-2xl font-black text-gray-900" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                {kpi.revenue.value}
                <span className={`text-sm font-semibold ml-2 ${kpi.revenue.up ? "text-emerald-600" : "text-red-500"}`}>
                  {kpi.revenue.change}
                </span>
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
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip format="dollar" />} />
                <Area type="monotone" dataKey="v" stroke={PRIMARY} strokeWidth={2.5} fill="url(#rev-grad)" dot={false} activeDot={{ r: 4, fill: PRIMARY }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Secondary charts row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {/* Pipeline */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" data-testid="section-pipeline-chart">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pipeline Value</p>
              <BarChart2 className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-0.5" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              {kpi.pipeline.value}
              <span className={`text-xs font-semibold ml-1.5 ${kpi.pipeline.up ? "text-emerald-600" : "text-red-500"}`}>{kpi.pipeline.change}</span>
            </p>
            <div className="h-28 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={PIPELINE_MONTHLY.slice(-6)} margin={{ top: 2, right: 0, left: 0, bottom: 0 }} barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip format="m" />} />
                  <Bar dataKey="v" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" data-testid="section-winrate-chart">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Win Rate</p>
              <Target className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-0.5" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              {kpi.winRate.value}
              <span className={`text-xs font-semibold ml-1.5 ${kpi.winRate.up ? "text-emerald-600" : "text-red-500"}`}>{kpi.winRate.change}</span>
            </p>
            <div className="h-28 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={WIN_RATE_MONTHLY.slice(-6)} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[50, 70]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip format="pct" />} />
                  <ReferenceLine y={60} stroke="#e5e7eb" strokeDasharray="4 4" label={{ value: "Target 60%", fontSize: 9, fill: "#9ca3af" }} />
                  <Line type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2.5, fill: "#8b5cf6" }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* MRR */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" data-testid="section-mrr-chart">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">MRR Growth</p>
              <Repeat2 className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-0.5" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              {kpi.mrr.value}
              <span className={`text-xs font-semibold ml-1.5 ${kpi.mrr.up ? "text-emerald-600" : "text-red-500"}`}>{kpi.mrr.change}</span>
            </p>
            <div className="h-28 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MRR_MONTHLY.slice(-6)} margin={{ top: 2, right: 0, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mrr-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip content={<CustomTooltip format="dollar" />} />
                  <Area type="monotone" dataKey="v" stroke="#10b981" strokeWidth={2} fill="url(#mrr-grad)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Margin trend + alert count row ────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {/* Margin chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 col-span-2" data-testid="section-margin-chart">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Gross Margin %</p>
              <Percent className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <p className="text-xl font-black text-gray-900 mb-0.5" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              {kpi.margin.value}
              <span className={`text-xs font-semibold ml-1.5 ${kpi.margin.up ? "text-emerald-600" : "text-red-500"}`}>{kpi.margin.change}</span>
            </p>
            <div className="h-28 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MARGIN_MONTHLY} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[33, 38]} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip format="pct" />} />
                  <ReferenceLine y={36} stroke="#e5e7eb" strokeDasharray="4 4" label={{ value: "Target 36%", fontSize: 9, fill: "#9ca3af" }} />
                  <Line type="monotone" dataKey="v" stroke={PRIMARY} strokeWidth={2} dot={{ r: 2.5, fill: PRIMARY }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alert summary card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col justify-between" data-testid="section-alert-summary">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Signal Summary</p>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Danger</span>
                </div>
                <span className="text-2xl font-black text-red-500" style={{ fontFamily: "'Archivo Black', sans-serif" }}>{redCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Watch</span>
                </div>
                <span className="text-2xl font-black text-amber-500" style={{ fontFamily: "'Archivo Black', sans-serif" }}>{amberCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Positive</span>
                </div>
                <span className="text-2xl font-black text-emerald-500" style={{ fontFamily: "'Archivo Black', sans-serif" }}>{greenCount}</span>
              </div>
            </div>
            <button
              onClick={() => { setShowDetail(v => !v); setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }}
              className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-semibold border border-gray-200 rounded-lg py-2 text-gray-600 hover:bg-gray-50 transition-all"
              data-testid="button-show-detail"
            >
              {showDetail ? <><ChevronUp className="w-3.5 h-3.5" /> Hide detail</> : <><ChevronDown className="w-3.5 h-3.5" /> View detail</>}
            </button>
          </div>
        </div>

        {/* ── Drill-down detail (toggleable) ───────────────────────────────── */}
        {showDetail && (
          <div ref={detailRef} className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Proactive Alerts */}
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

            {/* AI Executive Summary */}
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

            {/* AI Chat + Upload */}
            <div className="grid grid-cols-2 gap-4">
              {/* AI Chat */}
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

              {/* Data Upload */}
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Uploaded files ({uploadedFiles.length})</p>
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
