import { useState } from "react";
import { TrendingUp, DollarSign, FileText, CheckCircle, Clock, XCircle, MoreHorizontal, Building2, ChevronDown, Filter } from "lucide-react";

const RED = "#BE1916";

const quotes = [
  { id: "Q-2134", title: "Suite 200 Vacant Prep", building: "1333 N California Blvd, Walnut Creek", status: "sent", amount: 48217, date: "Mar 18, 2025", contact: "Marcus Webb", daysOld: 7 },
  { id: "Q-2128", title: "Lobby Refresh + HVAC Repair", building: "101 California St, San Francisco", status: "draft", amount: 31500, date: "Mar 14, 2025", contact: "James Cho", daysOld: 11 },
  { id: "Q-2119", title: "4th Floor TI – Phase 2", building: "Embarcadero Center Tower 3", status: "accepted", amount: 184600, date: "Feb 28, 2025", contact: "Lisa Nakamura", daysOld: 25 },
  { id: "Q-2103", title: "Night Janitorial Services (Annual)", building: "225 Bush St, San Francisco", status: "accepted", amount: 62400, date: "Feb 15, 2025", contact: "Rachel Torres", daysOld: 38 },
  { id: "Q-2089", title: "Emergency HVAC – CU-03 Replace", building: "2 N Market St, San Jose", status: "expired", amount: 19400, date: "Jan 22, 2025", contact: "Sandra Kim", daysOld: 62 },
  { id: "Q-2077", title: "Roof Inspection + Patch", building: "3055 Olin Ave, San Jose", status: "sent", amount: 8750, date: "Jan 10, 2025", contact: "Bryan Nguyen", daysOld: 74 },
];

const agreements = [
  { name: "Janitorial – Bay Area Portfolio", type: "Monthly", value: "$12,800/mo", buildings: 4, start: "Jan 2024", renews: "Dec 2025" },
  { name: "Preventive Maintenance Program", type: "Quarterly", value: "$6,200/qtr", buildings: 3, start: "Mar 2024", renews: "Mar 2026" },
];

const serviceBreakdown = [
  { label: "Special Projects", amount: 248600, pct: 51, color: RED },
  { label: "Janitorial", amount: 153600, pct: 31, color: "#2563EB" },
  { label: "Facility Solutions", amount: 58200, pct: 12, color: "#059669" },
  { label: "Building Engineering", amount: 26800, pct: 6, color: "#D97706" },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  sent: { label: "Sent", color: "text-blue-700", bg: "bg-blue-50", icon: <Clock className="w-3 h-3" /> },
  draft: { label: "Draft", color: "text-gray-600", bg: "bg-gray-100", icon: <FileText className="w-3 h-3" /> },
  accepted: { label: "Accepted", color: "text-emerald-700", bg: "bg-emerald-50", icon: <CheckCircle className="w-3 h-3" /> },
  expired: { label: "Expired", color: "text-red-700", bg: "bg-red-50", icon: <XCircle className="w-3 h-3" /> },
};

function fmt(n: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n); }

export function RevenueTab() {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? quotes : quotes.filter(q => q.status === filter);
  const totalAccepted = quotes.filter(q => q.status === "accepted").reduce((s, q) => s + q.amount, 0);
  const totalSent = quotes.filter(q => q.status === "sent").reduce((s, q) => s + q.amount, 0);
  const winRate = Math.round(quotes.filter(q => q.status === "accepted").length / quotes.filter(q => q.status !== "draft").length * 100);

  return (
    <div className="min-h-screen bg-gray-50 font-['Space_Grotesk',sans-serif]">
      {/* Header */}
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
            <div key={t} className={`px-3 py-2 text-xs font-medium border-b-2 mr-1 ${t === "Revenue" ? "" : "border-transparent text-gray-400"}`} style={t === "Revenue" ? { borderColor: RED, color: RED, borderBottomWidth: 2 } : {}}>{t}</div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Revenue (LTM)", value: fmt(487200), sub: "↑ 14% vs prior year", color: "text-emerald-600" },
            { label: "Open Quotes", value: fmt(totalSent), sub: `${quotes.filter(q=>q.status==="sent").length} quotes pending`, color: "text-blue-600" },
            { label: "Quote Win Rate", value: `${winRate}%`, sub: "Last 6 months", color: "text-gray-800" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Quotes table */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">BuildOps Quotes</h3>
              <div className="flex gap-1">
                {["all","sent","accepted","draft","expired"].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`text-[10px] px-2 py-1 rounded-md capitalize font-medium transition-colors ${filter === f ? "text-white" : "text-gray-500 hover:bg-gray-100"}`}
                    style={filter === f ? { backgroundColor: RED } : {}}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map(q => {
                const s = statusConfig[q.status];
                return (
                  <div key={q.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800">{q.title}</span>
                        <span className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.icon}{s.label}</span>
                        {q.daysOld > 60 && <span className="text-[10px] text-red-500 font-medium">Overdue</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <Building2 className="w-3 h-3" />{q.building}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{fmt(q.amount)}</div>
                      <div className="text-[10px] text-gray-400">{q.date}</div>
                    </div>
                    <button className="p-1 rounded hover:bg-gray-200 ml-1"><MoreHorizontal className="w-3.5 h-3.5 text-gray-400" /></button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Service breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Revenue by Service (LTM)</h3>
              <div className="space-y-2.5">
                {serviceBreakdown.map(s => (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{s.label}</span>
                      <span className="font-medium text-gray-800">{fmt(s.amount)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Service agreements */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Active Agreements</h3>
              <div className="space-y-3">
                {agreements.map(a => (
                  <div key={a.name} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="text-xs font-semibold text-gray-800 leading-tight">{a.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{a.type} · {a.value}</div>
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-gray-400">
                      <span>{a.buildings} buildings</span>
                      <span>Renews {a.renews}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
