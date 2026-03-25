import { useState } from "react";
import {
  HeartPulse, TrendingUp, TrendingDown, Mail, Calendar, DollarSign,
  Lightbulb, AlertCircle, CheckCircle, Star, Edit2, MoreHorizontal,
  Users, Building2, ArrowUpRight, Zap, StickyNote
} from "lucide-react";

const RED = "#BE1916";

const talkingPoints = [
  { type: "win", text: "Won 4th Floor TI Phase 2 ($184K) — project starts next month. Good moment to ask about Phase 3 planning." },
  { type: "open", text: "Suite 200 Vacant Prep proposal sent 7 days ago ($48K). Follow up — Lisa mentioned they're deciding by end of week." },
  { type: "need", text: "East Bay team (Marcus) mentioned 2 new Concord properties coming online. Proactive quote opportunity." },
  { type: "risk", text: "South Bay team is new (Sandra took over from Kevin in Jan 2025). Relationship still being built — prioritize face time." },
];

const competitors = [
  { name: "ABM Industries", status: "Active", detail: "Handles janitorial at 2 Embarcadero Center — not our buildings but same portfolio" },
  { name: "CBRE GWS", status: "Watch", detail: "Lisa mentioned they got a competing bid for the HVAC contract. Lower price but slower turnaround." },
];

const childClients = [
  { name: "C&W – Sacramento (Stub)", tier: "B", deals: 2, lastActivity: "3 months ago" },
];

const tpStyles: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  win: { bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />, label: "Recent Win" },
  open: { bg: "bg-blue-50 border-blue-200", icon: <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />, label: "Open Opportunity" },
  need: { bg: "bg-amber-50 border-amber-200", icon: <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0" />, label: "Identified Need" },
  risk: { bg: "bg-red-50 border-red-200", icon: <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />, label: "Watch" },
};

function HealthRing({ score, status }: { score: number; status: string }) {
  const color = status === "healthy" ? "#059669" : status === "watch" ? "#D97706" : "#DC2626";
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{score}</span>
        <span className="text-[10px] text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

export function IntelligenceTab() {
  const [healthOverride, setHealthOverride] = useState<"auto" | "healthy" | "watch" | "at_risk">("auto");
  const [editingCompetitor, setEditingCompetitor] = useState(false);

  const status = healthOverride === "auto" ? "healthy" : healthOverride.replace("_", " ");
  const score = healthOverride === "auto" ? 82 : healthOverride === "healthy" ? 82 : healthOverride === "watch" ? 58 : 34;
  const statusColor = status === "healthy" ? "text-emerald-600" : status === "watch" ? "text-amber-600" : "text-red-600";

  return (
    <div className="min-h-screen bg-gray-50 font-['Space_Grotesk',sans-serif]">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">C&W</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 font-['Archivo_Black',sans-serif]">Cushman &amp; Wakefield</h1>
            <p className="text-xs text-gray-500">Commercial Real Estate · Tier A</p>
          </div>
        </div>
        <div className="flex gap-0 mt-3 border-b border-gray-200 -mb-4">
          {["Overview","Organization","Revenue","History","Files","Intelligence"].map(t => (
            <div key={t} className={`px-3 py-2 text-xs font-medium border-b-2 mr-1 ${t === "Intelligence" ? "" : "border-transparent text-gray-400"}`} style={t === "Intelligence" ? { borderColor: RED, color: RED, borderBottomWidth: 2 } : {}}>{t}</div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-3 gap-5">
          {/* Left col */}
          <div className="space-y-4">
            {/* Health score */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Relationship Health</h3>
              <div className="flex items-center gap-4">
                <HealthRing score={score} status={healthOverride === "auto" ? "healthy" : healthOverride.replace("_","")} />
                <div>
                  <div className={`text-base font-bold capitalize ${statusColor}`}>{status}</div>
                  <div className="text-xs text-gray-500 mt-1">Auto-calculated</div>
                  <div className="mt-2">
                    <p className="text-[10px] text-gray-400 mb-1">Override:</p>
                    <div className="flex gap-1">
                      {(["auto","healthy","watch","at_risk"] as const).map(o => (
                        <button key={o} onClick={() => setHealthOverride(o)}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium capitalize transition-colors ${healthOverride === o ? "text-white" : "bg-gray-100 text-gray-500"}`}
                          style={healthOverride === o ? { backgroundColor: RED } : {}}>
                          {o.replace("_"," ")}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Relationship signals */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Signals</h3>
              <div className="space-y-2.5">
                {[
                  { label: "Email frequency", value: "3.2x / week", icon: <Mail className="w-3.5 h-3.5 text-blue-500" />, good: true },
                  { label: "Last meeting", value: "5 days ago", icon: <Calendar className="w-3.5 h-3.5 text-purple-500" />, good: true },
                  { label: "Days since last deal", value: "25 days", icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />, good: true },
                  { label: "BD spend YTD", value: "$3,240 / $5K", icon: <DollarSign className="w-3.5 h-3.5 text-amber-500" />, good: true },
                  { label: "Unanswered emails", value: "1", icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" />, good: false },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 text-xs">
                    {s.icon}
                    <span className="text-gray-500 flex-1">{s.label}</span>
                    <span className={`font-medium ${s.good ? "text-gray-800" : "text-red-600"}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* BD Spend tracker */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">BD Spend 2025</h3>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <div className="text-xl font-bold text-gray-900">$3,240</div>
                  <div className="text-xs text-gray-400">of $5,000 budget</div>
                </div>
                <div className="text-xs text-emerald-600 font-medium">$1,760 remaining</div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: "65%", backgroundColor: RED }} />
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  { label: "Meals & Entertainment", amount: "$2,440" },
                  { label: "Events", amount: "$800" },
                ].map(e => (
                  <div key={e.label} className="flex items-center justify-between text-xs text-gray-500">
                    <span>{e.label}</span><span className="font-medium text-gray-700">{e.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle + Right col */}
          <div className="col-span-2 space-y-4">
            {/* AI Talking Points */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">Talking Points</h3>
                <span className="text-[10px] text-gray-400 ml-1">AI-generated · updated 2h ago</span>
              </div>
              <div className="space-y-2">
                {talkingPoints.map((p, i) => {
                  const s = tpStyles[p.type];
                  return (
                    <div key={i} className={`flex gap-3 p-3 rounded-lg border ${s.bg}`}>
                      {s.icon}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold text-gray-600">{s.label}</span>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">{p.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Competitive intel */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Competitive Intelligence</h3>
                <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit</button>
              </div>
              <div className="space-y-2">
                {competitors.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${c.status === "Active" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{c.status}</div>
                    <div>
                      <div className="text-xs font-semibold text-gray-800">{c.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{c.detail}</div>
                    </div>
                  </div>
                ))}
                <button className="text-xs text-gray-400 hover:text-gray-600">+ Add competitor note</button>
              </div>
            </div>

            {/* Related entities */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Related Companies</h3>
              {childClients.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white text-xs font-bold">CS</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{c.name}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">{c.tier}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">Sub-account</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{c.deals} deals · Last activity {c.lastActivity}</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
              <button className="mt-2 text-xs text-gray-400 hover:text-gray-600">+ Link related company</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
