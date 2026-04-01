import { useState, useRef, useEffect } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Target, Percent,
  RefreshCw, AlertTriangle, AlertCircle, CheckCircle2,
  Send, Upload, FileSpreadsheet, X, Lock, Bot,
  BarChart2, Repeat2, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";

const PRIMARY = "#BE1916";

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

export default function CEOCommandCenter() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user && user.role !== "super_admin") {
      navigate("/");
    }
  }, [user, navigate]);

  if (user && user.role !== "super_admin") return null;

  return <CEOCommandCenterInner />;
}

function CEOCommandCenterInner() {
  const [period, setPeriod] = useState<Period>("monthly");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(SAMPLE_CONVERSATION);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([
    { name: "BuildOps_JobCostReport_Q1.xlsx", size: "284 KB", uploadedAt: "Apr 1, 2026 — 9:14 AM" },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const kpi = KPI_DATA[period];
  const summary = SUMMARIES[period];

  function handleRegenerate() {
    setIsRegenerating(true);
    setTimeout(() => setIsRegenerating(false), 1800);
  }

  function handlePeriodChange(p: Period) {
    setPeriod(p);
    setIsRegenerating(true);
    setTimeout(() => setIsRegenerating(false), 1200);
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
    const now = new Date().toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
    const newFiles: UploadedFile[] = files.map(f => ({
      name: f.name,
      size: f.size > 1024 * 1024
        ? `${(f.size / 1024 / 1024).toFixed(1)} MB`
        : `${Math.round(f.size / 1024)} KB`,
      uploadedAt: now,
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(name: string) {
    setUploadedFiles(prev => prev.filter(f => f.name !== name));
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

  const alertColors: Record<string, { bg: string; border: string; icon: string; badge: string }> = {
    red: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500", badge: "bg-red-100 text-red-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", badge: "bg-amber-100 text-amber-700" },
    green: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-500", badge: "bg-emerald-100 text-emerald-700" },
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: PRIMARY }}
          >
            <Lock className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1
              className="text-xl font-black tracking-tight leading-none"
              style={{ fontFamily: "'Archivo Black', sans-serif", color: "#111" }}
            >
              CEO Command Center
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Executive intelligence — restricted access</p>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(["daily", "weekly", "monthly"] as Period[]).map(p => (
            <button
              key={p}
              data-testid={`button-period-${p}`}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-all ${
                period === p
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5 max-w-screen-xl mx-auto">

        {/* KPI Strip */}
        <div className="grid grid-cols-5 gap-3" data-testid="section-kpi-strip">
          {[
            { label: "Revenue", icon: DollarSign, ...kpi.revenue },
            { label: "Pipeline Value", icon: BarChart2, ...kpi.pipeline },
            { label: "Win Rate", icon: Target, ...kpi.winRate },
            { label: "MRR", icon: Repeat2, ...kpi.mrr },
            { label: "Avg Margin %", icon: Percent, ...kpi.margin },
          ].map(({ label, icon: Icon, value, change, up }) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3.5"
              data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
                <Icon className="w-3.5 h-3.5 text-gray-300" />
              </div>
              <div className="text-2xl font-black text-gray-900" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                {value}
              </div>
              <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
                {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {change} vs. prior {period === "daily" ? "day" : period === "weekly" ? "week" : "month"}
              </div>
            </div>
          ))}
        </div>

        {/* Alert / Warning Strip */}
        <div data-testid="section-alerts">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Proactive Alerts</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              <span className="text-[10px] text-gray-400">{ALERTS.filter(a => a.level === "red").length} danger</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block ml-2" />
              <span className="text-[10px] text-gray-400">{ALERTS.filter(a => a.level === "amber").length} watch</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ml-2" />
              <span className="text-[10px] text-gray-400">{ALERTS.filter(a => a.level === "green").length} positive</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {ALERTS.map((alert, i) => {
              const c = alertColors[alert.level];
              const Icon = alert.icon;
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${c.bg} border ${c.border} rounded-xl px-4 py-3`}
                  data-testid={`alert-${alert.level}-${i}`}
                >
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
              <span className="text-sm font-bold text-gray-800">
                AI Executive Summary — {period.charAt(0).toUpperCase() + period.slice(1)} View
              </span>
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

        {/* Two-column: Chat + Upload */}
        <div className="grid grid-cols-2 gap-4">

          {/* AI Chat Panel */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col" style={{ minHeight: 420 }} data-testid="section-ai-chat">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <Bot className="w-4 h-4" style={{ color: PRIMARY }} />
              <span className="text-sm font-bold text-gray-800">Ask the AI</span>
              <span className="ml-auto text-[10px] text-gray-400 font-medium">Data-grounded answers</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 340 }}>
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "ai" && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "text-white rounded-br-sm"
                        : "bg-gray-50 text-gray-700 border border-gray-100 rounded-bl-sm"
                    }`}
                    style={msg.role === "user" ? { backgroundColor: PRIMARY } : {}}
                    data-testid={`chat-message-${msg.role}-${i}`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex gap-2 justify-start">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: PRIMARY }}
                  >
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
                  style={{ "--tw-ring-color": PRIMARY } as React.CSSProperties}
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

          {/* Excel / CSV Upload */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col" data-testid="section-file-upload">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
              <FileSpreadsheet className="w-4 h-4" style={{ color: PRIMARY }} />
              <span className="text-sm font-bold text-gray-800">Data Upload</span>
              <span className="ml-auto text-[10px] text-gray-400 font-medium">Added to AI context</span>
            </div>

            <div className="px-5 py-4 flex-1 space-y-4">
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-all"
                data-testid="dropzone-file-upload"
              >
                <Upload className="w-6 h-6 text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">Drop Excel or CSV file here</p>
                <p className="text-xs text-gray-400">.xlsx, .csv — max 25 MB</p>
                <button
                  data-testid="button-browse-files"
                  className="mt-1 px-4 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Browse files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-file-upload"
                />
              </div>

              {/* Uploaded files list */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Uploaded files ({uploadedFiles.length})
                </p>
                <div className="space-y-2">
                  {uploadedFiles.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No files uploaded yet</p>
                  )}
                  {uploadedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-2.5"
                      data-testid={`file-item-${i}`}
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{file.name}</p>
                        <p className="text-[10px] text-gray-400">{file.size} · {file.uploadedAt}</p>
                      </div>
                      <button
                        data-testid={`button-remove-file-${i}`}
                        onClick={() => removeFile(file.name)}
                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                      >
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
    </div>
  );
}
