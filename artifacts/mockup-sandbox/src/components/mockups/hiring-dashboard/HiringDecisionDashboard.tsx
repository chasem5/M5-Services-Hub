import { useState } from "react";
import {
  Users, TrendingUp, TrendingDown, Minus, Clock, Zap, Calendar,
  ChevronDown, ChevronUp, Settings, BarChart3, AlertTriangle,
  CheckCircle, AlertCircle, XCircle, ArrowUp, ArrowDown, Info,
  Activity, Package
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  ReferenceLine, ResponsiveContainer
} from "recharts";

// ─── Mock Data (matches /api/ceo/staffing + /api/ceo/metrics shapes) ───────────
const MOCK_WEEKLY_TREND = [
  { label: "Feb 16", utilPct: 38, scheduledHrs: 138.5, techCount: 12, visitCount: 33, isFuture: false },
  { label: "Feb 23", utilPct: 56, scheduledHrs: 202.5, techCount: 11, visitCount: 38, isFuture: false },
  { label: "Mar 02", utilPct: 71, scheduledHrs: 199.8, techCount: 8,  visitCount: 42, isFuture: false },
  { label: "Mar 09", utilPct: 74, scheduledHrs: 177.0, techCount: 8,  visitCount: 33, isFuture: false },
  { label: "Mar 16", utilPct: 70, scheduledHrs: 196.3, techCount: 10, visitCount: 34, isFuture: false },
  { label: "Mar 23", utilPct: 74, scheduledHrs: 206.0, techCount: 11, visitCount: 36, isFuture: false },
  { label: "Mar 30", utilPct: 56, scheduledHrs: 157.0, techCount: 11, visitCount: 36, isFuture: false },
  { label: "Apr 06", utilPct: 47, scheduledHrs: 130.5, techCount: 8,  visitCount: 22, isFuture: true  },
  { label: "Apr 13", utilPct: 67, scheduledHrs: 134.0, techCount: 5,  visitCount: 18, isFuture: true  },
  { label: "Apr 20", utilPct: 68, scheduledHrs: 108.0, techCount: 4,  visitCount: 16, isFuture: true  },
  { label: "Apr 27", utilPct: 68, scheduledHrs:  82.0, techCount: 3,  visitCount: 14, isFuture: true  },
  { label: "May 04", utilPct: 20, scheduledHrs:   8.0, techCount: 1,  visitCount:  1, isFuture: true  },
];

const MOCK_STAFFING = {
  techCount: 7,
  partTimeTechCount: 4,
  rollingAvgUtilization: 69,
  currentWeekUtilization: 56,
  avgHrsPerTechPerWeek: 27.3,
  forwardBookedWeeks: 5,
  overtimeRatePct: 11.4,
  actualHrs4wk: 1524,
  scheduledHrs4wk: 1507.3,
};

// ─── Scoring Engine ───────────────────────────────────────────────────────────
type Level = "healthy" | "monitor" | "prepare" | "hire";
type TrendDir = "rising" | "flat" | "falling";

interface Thresholds {
  utilWarn: number;     // default 85
  utilCritical: number; // default 90
  fwdWarn: number;      // default 4
  fwdCritical: number;  // default 5
  otWarn: number;       // default 5
  otCritical: number;   // default 10
  weeksRequired: number; // default 3
}

const DEFAULT_THRESHOLDS: Thresholds = {
  utilWarn: 85,
  utilCritical: 90,
  fwdWarn: 4,
  fwdCritical: 5,
  otWarn: 5,
  otCritical: 10,
  weeksRequired: 3,
};

function computeTrendDirection(weeks: typeof MOCK_WEEKLY_TREND): TrendDir {
  const past = weeks.filter(w => !w.isFuture);
  if (past.length < 4) return "flat";
  const first = past.slice(0, Math.floor(past.length / 2));
  const second = past.slice(Math.floor(past.length / 2));
  const avg1 = first.reduce((s, w) => s + w.utilPct, 0) / first.length;
  const avg2 = second.reduce((s, w) => s + w.utilPct, 0) / second.length;
  if (avg2 - avg1 > 5) return "rising";
  if (avg1 - avg2 > 5) return "falling";
  return "flat";
}

function computePersistence(weeks: typeof MOCK_WEEKLY_TREND, threshold: number, lookback = 4): number {
  const past = weeks.filter(w => !w.isFuture).slice(-lookback);
  return past.filter(w => w.utilPct >= threshold).length;
}

function scoreAll(data: typeof MOCK_STAFFING, trend: TrendDir, persistence: { warn: number; critical: number }, weeks: number, thresholds: Thresholds) {
  const { utilWarn, utilCritical, fwdWarn, fwdCritical, otWarn, otCritical, weeksRequired } = thresholds;

  const utilLevel: Level =
    data.rollingAvgUtilization >= utilCritical ? "prepare" :
    data.rollingAvgUtilization >= utilWarn ? "monitor" : "healthy";

  const fwdLevel: Level =
    weeks >= fwdCritical ? "prepare" :
    weeks >= fwdWarn ? "monitor" : "healthy";

  const otLevel: Level =
    data.overtimeRatePct >= otCritical ? "prepare" :
    data.overtimeRatePct >= otWarn ? "monitor" : "healthy";

  const stressLevel: Level =
    data.actualHrs4wk > 0 && (data.actualHrs4wk / data.scheduledHrs4wk) > 1.05 ? "monitor" : "healthy";

  const trendLevel: Level = trend === "rising" ? "monitor" : "healthy";

  // Count warning+ signals
  const signals = [utilLevel, fwdLevel, otLevel, stressLevel, trendLevel];
  const criticals = signals.filter(s => s === "prepare" || s === "hire").length;
  const warnings = signals.filter(s => s === "monitor").length;

  // Sustained critical check (hire now if persistent AND 3+ criticals)
  const sustained = persistence.critical >= weeksRequired;

  let overall: Level;
  if (criticals >= 3 && sustained) overall = "hire";
  else if (criticals >= 2 || (criticals >= 1 && trend === "rising")) overall = "prepare";
  else if (warnings >= 2 || criticals >= 1) overall = "monitor";
  else overall = "healthy";

  return { overall, utilLevel, fwdLevel, otLevel, stressLevel, trendLevel };
}

function buildReasons(
  scores: ReturnType<typeof scoreAll>,
  data: typeof MOCK_STAFFING,
  trend: TrendDir,
  weeks: number,
  persistence: { warn: number; critical: number },
  thresholds: Thresholds
): string[] {
  const reasons: string[] = [];

  if (scores.fwdLevel !== "healthy")
    reasons.push(`Forward backlog at ${weeks} weeks — crew is booked ${weeks >= thresholds.fwdCritical ? "beyond the critical threshold" : "near capacity ahead"}`);
  if (scores.otLevel !== "healthy")
    reasons.push(`Overtime running at ${data.overtimeRatePct}% — ${data.overtimeRatePct >= thresholds.otCritical ? "above the critical" : "above the warning"} threshold of ${data.overtimeRatePct >= thresholds.otCritical ? thresholds.otCritical : thresholds.otWarn}%`);
  if (scores.utilLevel !== "healthy")
    reasons.push(`4-week rolling utilization at ${data.rollingAvgUtilization}% — approaching or exceeding crew capacity`);
  if (scores.stressLevel !== "healthy")
    reasons.push(`Crew worked more hours than scheduled over the last 4 weeks (actual vs scheduled: ${Math.round(data.actualHrs4wk / data.scheduledHrs4wk * 100)}%)`);
  if (trend === "rising")
    reasons.push("Utilization trend is rising — workload is growing over the last several weeks");
  if (scores.overall === "healthy")
    reasons.push("Utilization, overtime, and forward schedule are all within healthy ranges");

  return reasons.slice(0, 3);
}

// ─── Config ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Level, { label: string; color: string; bg: string; border: string; accent: string; icon: React.ElementType; summary: string }> = {
  healthy: {
    label: "Healthy",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    accent: "#10b981",
    icon: CheckCircle,
    summary: "Current workload appears manageable. No immediate hiring pressure.",
  },
  monitor: {
    label: "Monitor",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    accent: "#eab308",
    icon: AlertCircle,
    summary: "One or more warning signs. Keep an eye on trends before committing to headcount.",
  },
  prepare: {
    label: "Prepare to Hire",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    accent: "#f97316",
    icon: AlertTriangle,
    summary: "Multiple capacity signals are elevated. Begin recruitment planning now — hiring takes time.",
  },
  hire: {
    label: "Hire Now",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    accent: "#ef4444",
    icon: XCircle,
    summary: "Crew is running near full capacity across multiple indicators. Delayed hiring will impact service quality.",
  },
};

const LEVEL_ORDER: Level[] = ["healthy", "monitor", "prepare", "hire"];
function levelUp(l: Level): Level {
  const i = LEVEL_ORDER.indexOf(l);
  return LEVEL_ORDER[Math.min(i + 1, 3)];
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DriverTile({ label, value, unit, level, icon: Icon, note }: { label: string; value: string; unit?: string; level: Level; icon: React.ElementType; note?: string }) {
  const cfg = STATUS_CONFIG[level];
  return (
    <div className={`rounded-lg border p-3 flex flex-col gap-1 ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" style={{ color: cfg.accent }} />
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-xl font-black leading-none" style={{ color: cfg.accent, fontFamily: "'Archivo Black', sans-serif" }}>{value}</span>
        {unit && <span className="text-xs text-gray-400 mb-0.5">{unit}</span>}
      </div>
      {note && <span className="text-[9px] text-gray-400">{note}</span>}
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: { title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-600">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function HiringDecisionDashboard() {
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [scenarioDelta, setScenarioDelta] = useState<{ techs: number; workload: number } | null>(null);
  const [pipelineBoost, setPipelineBoost] = useState(false);

  const data = { ...MOCK_STAFFING };
  const trend = computeTrendDirection(MOCK_WEEKLY_TREND);
  const persistenceWarn = computePersistence(MOCK_WEEKLY_TREND, thresholds.utilWarn);
  const persistenceCritical = computePersistence(MOCK_WEEKLY_TREND, thresholds.utilCritical);

  const scores = scoreAll(data, trend, { warn: persistenceWarn, critical: persistenceCritical }, data.forwardBookedWeeks, thresholds);
  const reasons = buildReasons(scores, data, trend, data.forwardBookedWeeks, { warn: persistenceWarn, critical: persistenceCritical }, thresholds);
  const cfg = STATUS_CONFIG[scores.overall];
  const StatusIcon = cfg.icon;

  // Scenario overrides
  let scenarioUtil = data.rollingAvgUtilization;
  let scenarioStatus = scores.overall;
  if (scenarioDelta) {
    const baseCap = data.techCount * 40;
    const newCap = (data.techCount + scenarioDelta.techs) * 40;
    const baseWork = (data.rollingAvgUtilization / 100) * baseCap * (1 + scenarioDelta.workload / 100);
    scenarioUtil = newCap > 0 ? Math.round((baseWork / newCap) * 100) : data.rollingAvgUtilization;
    const scenData = { ...data, rollingAvgUtilization: scenarioUtil, forwardBookedWeeks: data.forwardBookedWeeks };
    const s = scoreAll(scenData, trend, { warn: persistenceWarn, critical: persistenceCritical }, scenData.forwardBookedWeeks, thresholds);
    scenarioStatus = pipelineBoost ? levelUp(s.overall) : s.overall;
  }

  // What Changed (compare last 2 past weeks)
  const pastWeeks = MOCK_WEEKLY_TREND.filter(w => !w.isFuture);
  const thisWk = pastWeeks[pastWeeks.length - 1];
  const lastWk = pastWeeks[pastWeeks.length - 2];
  const utilDelta = thisWk && lastWk ? thisWk.utilPct - lastWk.utilPct : 0;
  const hrsDelta = thisWk && lastWk ? Math.round((thisWk.scheduledHrs - lastWk.scheduledHrs) * 10) / 10 : 0;

  const trendLabel = trend === "rising" ? "Rising ↑" : trend === "falling" ? "Falling ↓" : "Flat →";
  const trendColor = trend === "rising" ? "text-orange-600" : trend === "falling" ? "text-blue-600" : "text-gray-500";

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans">
      <div className="max-w-[1350px] mx-auto space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-gray-800" style={{ fontFamily: "'Archivo Black', sans-serif" }}>Crew Capacity & Hiring</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Multi-signal hiring recommendation · updated weekly</p>
          </div>
          <span className="text-[10px] text-gray-300 border border-gray-100 rounded px-2 py-1">Mock data — matches live API shape</span>
        </div>

        {/* ── 1. Hiring Recommendation Card ── */}
        <div
          className={`rounded-xl border-l-4 border border-r-0 border-t-0 border-b-0 shadow-sm bg-white overflow-hidden`}
          style={{ borderLeftColor: cfg.accent, borderLeftWidth: 5 }}
          data-testid="card-hiring-recommendation"
        >
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${cfg.accent}18` }}>
                  <StatusIcon className="w-5 h-5" style={{ color: cfg.accent }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Hiring Recommendation</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-lg font-black ${cfg.color}`} style={{ fontFamily: "'Archivo Black', sans-serif" }}>{cfg.label}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 max-w-xl">{cfg.summary}</p>
                  <div className="space-y-1.5">
                    {reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-[11px] font-bold mt-0.5" style={{ color: cfg.accent }}>→</span>
                        <span className="text-[11px] text-gray-600">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Persistence badge */}
              <div className="text-right flex-shrink-0">
                {persistenceWarn >= 2 ? (
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 mb-0.5">Persistence</p>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                      {persistenceWarn} of last 4 weeks elevated
                    </span>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 mb-0.5">Persistence</p>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-gray-50 border-gray-200 text-gray-500">
                      Appears temporary — monitoring
                    </span>
                  </div>
                )}
                <p className="text-[9px] text-gray-300 mt-1">{thresholds.weeksRequired} of 4 weeks required to escalate</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. 4 Driver Stats ── */}
        <div className="grid grid-cols-4 gap-3">
          <DriverTile
            label="4-Wk Utilization"
            value={`${data.rollingAvgUtilization}%`}
            level={scores.utilLevel}
            icon={BarChart3}
            note={`Current week: ${data.currentWeekUtilization}%`}
          />
          <DriverTile
            label="Forward Booked"
            value={`${data.forwardBookedWeeks}`}
            unit="weeks"
            level={scores.fwdLevel}
            icon={Calendar}
            note={`Critical at ${thresholds.fwdCritical}+ weeks`}
          />
          <DriverTile
            label="Overtime Rate"
            value={`${data.overtimeRatePct}%`}
            level={scores.otLevel}
            icon={Zap}
            note={`Critical at ${thresholds.otCritical}%+`}
          />
          <DriverTile
            label="Workload Trend"
            value={trendLabel}
            level={scores.trendLevel}
            icon={trend === "rising" ? TrendingUp : trend === "falling" ? TrendingDown : Minus}
            note="vs. 4 weeks ago"
          />
        </div>

        {/* ── 3. What Changed? ── */}
        <CollapsibleSection title="What Changed This Week?" icon={Activity} defaultOpen={true}>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Utilization",
                value: `${thisWk?.utilPct ?? 0}%`,
                delta: utilDelta,
                unit: "pp",
                note: "vs. prior week",
              },
              {
                label: "Overtime Rate",
                value: `${data.overtimeRatePct}%`,
                delta: 1.2,
                unit: "pp",
                note: "vs. prior 30 days",
              },
              {
                label: "Scheduled Hours",
                value: `${thisWk?.scheduledHrs ?? 0}h`,
                delta: hrsDelta,
                unit: "h",
                note: "vs. prior week",
              },
            ].map(item => {
              const improving = item.delta < 0;
              const worsening = item.delta > 0;
              return (
                <div key={item.label} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{item.label}</p>
                  <p className="text-lg font-black text-gray-800" style={{ fontFamily: "'Archivo Black', sans-serif" }}>{item.value}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {worsening ? <ArrowUp className="w-3 h-3 text-orange-500" /> : improving ? <ArrowDown className="w-3 h-3 text-emerald-500" /> : <Minus className="w-3 h-3 text-gray-400" />}
                    <span className={`text-[11px] font-semibold ${worsening ? "text-orange-600" : improving ? "text-emerald-600" : "text-gray-400"}`}>
                      {item.delta > 0 ? "+" : ""}{item.delta}{item.unit} {item.note}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-gray-300 mt-3">Week-over-week comparison uses last 2 completed weeks from the visit schedule.</p>
        </CollapsibleSection>

        {/* ── 4. Weekly Chart + Horizon ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-bold text-gray-800">Weekly Utilization</span>
          </div>
          <p className="text-[9px] text-gray-300 mb-3">visit schedule · full-time techs only · future weeks subject to change</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={MOCK_WEEKLY_TREND} margin={{ top: 2, right: 0, left: -20, bottom: 0 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <ReferenceLine y={thresholds.utilCritical} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
              <ReferenceLine y={thresholds.utilWarn} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-gray-900 text-white text-[11px] rounded-lg px-3 py-2 shadow-xl space-y-0.5">
                      <p className="font-bold">{label} {d?.isFuture ? "(upcoming)" : "(past)"}</p>
                      <p>Utilization: <span className="font-semibold">{d?.utilPct}%</span></p>
                      <p>Scheduled: <span className="font-semibold">{d?.scheduledHrs}h</span></p>
                      <p>Visits: <span className="font-semibold">{d?.visitCount}</span></p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="utilPct" radius={[3, 3, 0, 0]}>
                {MOCK_WEEKLY_TREND.map((entry, i) => {
                  const c = entry.isFuture
                    ? entry.utilPct >= thresholds.utilCritical ? "#fca5a5"
                    : entry.utilPct >= thresholds.utilWarn ? "#fcd34d"
                    : entry.visitCount === 0 ? "#e5e7eb"
                    : "#6ee7b7"
                    : entry.utilPct >= thresholds.utilCritical ? "#ef4444"
                    : entry.utilPct >= thresholds.utilWarn ? "#f59e0b"
                    : "#818cf8";
                  return <Cell key={i} fill={c} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-3 mt-2">
            {[
              { color: "#818cf8", label: "Past · on track" },
              { color: "#6ee7b7", label: "Future · healthy" },
              { color: "#fcd34d", label: `≥${thresholds.utilWarn}% monitor` },
              { color: "#ef4444", label: `≥${thresholds.utilCritical}% critical` },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
                <span className="text-[9px] text-gray-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. Settings Panel ── */}
        <CollapsibleSection title="Adjust Thresholds" icon={Settings}>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: "utilWarn" as keyof Thresholds, label: "Utilization — Warn at", suffix: "%" },
              { key: "utilCritical" as keyof Thresholds, label: "Utilization — Critical at", suffix: "%" },
              { key: "fwdWarn" as keyof Thresholds, label: "Forward Booked — Warn at", suffix: "wks" },
              { key: "fwdCritical" as keyof Thresholds, label: "Forward Booked — Critical at", suffix: "wks" },
              { key: "otWarn" as keyof Thresholds, label: "Overtime Rate — Warn at", suffix: "%" },
              { key: "otCritical" as keyof Thresholds, label: "Overtime Rate — Critical at", suffix: "%" },
              { key: "weeksRequired" as keyof Thresholds, label: "Consecutive Weeks to Escalate", suffix: "wks" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">{f.label}</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    className="w-16 border border-gray-200 rounded px-2 py-1 text-sm font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    value={thresholds[f.key]}
                    onChange={e => setThresholds(t => ({ ...t, [f.key]: Number(e.target.value) }))}
                  />
                  <span className="text-xs text-gray-400">{f.suffix}</span>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setThresholds(DEFAULT_THRESHOLDS)}
            className="mt-4 text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold underline"
          >
            Reset to defaults
          </button>
          <p className="text-[9px] text-gray-300 mt-2">Changes take effect immediately. Settings saved to browser localStorage in the real app.</p>
        </CollapsibleSection>

        {/* ── 6. Scenario Calculator ── */}
        <CollapsibleSection title="What-If Scenarios" icon={BarChart3}>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { label: "+1 Tech", techs: 1, workload: 0 },
              { label: "−1 Tech", techs: -1, workload: 0 },
              { label: "+1 Project Crew (2 techs)", techs: 2, workload: 15 },
              { label: "Workload +10%", techs: 0, workload: 10 },
              { label: "Workload −10%", techs: 0, workload: -10 },
            ].map(s => {
              const active = scenarioDelta?.techs === s.techs && scenarioDelta?.workload === s.workload;
              return (
                <button
                  key={s.label}
                  onClick={() => setScenarioDelta(active ? null : s)}
                  className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"}`}
                >
                  {s.label}
                </button>
              );
            })}
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-gray-500 font-semibold ml-2">
              <input type="checkbox" className="rounded" checked={pipelineBoost} onChange={e => setPipelineBoost(e.target.checked)} />
              Include pipeline (+1 level)
            </label>
          </div>

          {scenarioDelta ? (
            <div className={`rounded-lg border p-4 ${STATUS_CONFIG[scenarioStatus].bg} ${STATUS_CONFIG[scenarioStatus].border}`}>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[10px] text-gray-500 font-semibold">Projected Utilization</p>
                  <p className="text-2xl font-black" style={{ color: STATUS_CONFIG[scenarioStatus].accent, fontFamily: "'Archivo Black', sans-serif" }}>{scenarioUtil}%</p>
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <div>
                  <p className="text-[10px] text-gray-500 font-semibold">Projected Status</p>
                  <span className={`text-sm font-black ${STATUS_CONFIG[scenarioStatus].color}`} style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                    {STATUS_CONFIG[scenarioStatus].label}
                  </span>
                </div>
                <div className="h-10 w-px bg-gray-200" />
                <div>
                  <p className="text-[10px] text-gray-500 font-semibold">Change</p>
                  <p className={`text-sm font-bold ${scenarioUtil < data.rollingAvgUtilization ? "text-emerald-600" : "text-orange-600"}`}>
                    {scenarioUtil > data.rollingAvgUtilization ? "+" : ""}{scenarioUtil - data.rollingAvgUtilization}pp utilization
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 italic">Select a scenario above to see its projected impact.</p>
          )}
          <p className="text-[9px] text-gray-300 mt-2">Scenarios adjust projected utilization and re-score based on current thresholds. Forward booked weeks not modeled.</p>
        </CollapsibleSection>

        {/* ── 7. Supporting Indicators (stubs) ── */}
        <CollapsibleSection title="Supporting Indicators (Partial Data)" icon={Package}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Sold — Not Yet Scheduled", value: null, note: "Connect to BuildOps won jobs without visits", icon: Calendar },
              { label: "Service vs. Project Split", value: "~70% / 30%", note: "Mock ratio — TODO: tag visits by work type in BuildOps", icon: Users },
              { label: "Callbacks & Rework", value: null, note: "Connect to BuildOps visit tags or follow-up reason codes", icon: AlertTriangle },
              { label: "Revenue per Tech (4wk)", value: null, note: "Requires job costing data from timesheet import", icon: BarChart3 },
              { label: "Part-Time / Temp Labor", value: `${data.partTimeTechCount} techs`, note: "Excluded from capacity math — shown for context", icon: Users },
              { label: "Pipeline Uplift", value: pipelineBoost ? "Enabled (+1 level)" : "Disabled", note: "Toggle in Scenario section to include in recommendation", icon: TrendingUp },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className="w-3.5 h-3.5 text-gray-300" />
                    <span className="text-[10px] font-semibold text-gray-400">{s.label}</span>
                  </div>
                  {s.value ? (
                    <p className="text-sm font-bold text-gray-600">{s.value}</p>
                  ) : (
                    <p className="text-[10px] text-gray-300 italic">No data yet</p>
                  )}
                  <p className="text-[9px] text-gray-300 mt-1">{s.note}</p>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* ── 8. Core Stats Row (secondary) ── */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 mb-3">Supporting Stats</p>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Active Techs", value: String(data.techCount), sub: `+ ${data.partTimeTechCount} part-time excluded`, icon: Users, color: "#6366f1" },
              { label: "Avg Hrs / Tech / Week", value: `${data.avgHrsPerTechPerWeek}h`, sub: "rolling 4-week scheduled", icon: Clock, color: "#0ea5e9" },
              { label: "Actual vs Scheduled", value: `${Math.round(data.actualHrs4wk / data.scheduledHrs4wk * 100)}%`, sub: `${data.actualHrs4wk}h actual · ${data.scheduledHrs4wk}h sched`, icon: Activity, color: "#10b981" },
              { label: "Total Future Visits", value: `${MOCK_WEEKLY_TREND.filter(w => w.isFuture).reduce((s, w) => s + w.visitCount, 0)}`, sub: "across 5 upcoming weeks", icon: Calendar, color: "#f59e0b" },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${s.color}15` }}>
                    <Icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-none">{s.value}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                    <p className="text-[9px] text-gray-300">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
