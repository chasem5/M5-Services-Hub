import { TrendingUp, TrendingDown, Users, Clock, BarChart2, AlertTriangle, CheckCircle2, Info } from "lucide-react";

function SectionLabel({ children, variant }: { children: React.ReactNode; variant: "before" | "after" }) {
  return (
    <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
      variant === "before" ? "text-gray-400" : "text-gray-600"
    }`}>
      {children}
    </p>
  );
}

function StatCard({ variant }: { variant: "before" | "after" }) {
  const labelColor = variant === "before" ? "text-gray-400" : "text-gray-600";
  const subColor = variant === "before" ? "text-gray-300" : "text-gray-500";
  const borderColor = variant === "before" ? "border-gray-100" : "border-gray-200";
  const noteColor = variant === "before" ? "text-gray-300" : "text-gray-500";

  return (
    <div className={`bg-white rounded-xl p-4 border ${borderColor} shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>Revenue Trend</p>
        <BarChart2 className={`w-3.5 h-3.5 ${variant === "before" ? "text-gray-300" : "text-gray-400"}`} />
      </div>

      {/* Metric rows */}
      <div className="space-y-2">
        {[
          { label: "MTD Revenue", value: "$48,079", change: "+12%", up: true },
          { label: "Win Rate", value: "72%", change: "+3pp", up: true },
          { label: "Pipeline", value: "$1.2M", change: "-8%", up: false },
        ].map((item) => (
          <div key={item.label} className={`flex items-center justify-between py-1.5 border-b ${borderColor} last:border-b-0`}>
            <p className={`text-[11px] ${labelColor}`}>{item.label}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-gray-900">{item.value}</p>
              <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${item.up ? "text-emerald-600" : "text-red-500"}`}>
                {item.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {item.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className={`text-[9px] mt-2 italic ${noteColor}`}>Rolling 30-day from BuildOps invoices</p>
    </div>
  );
}

function KpiCard({ variant }: { variant: "before" | "after" }) {
  const labelColor = variant === "before" ? "text-gray-400" : "text-gray-600";
  const subColor = variant === "before" ? "text-gray-300" : "text-gray-500";
  const borderColor = variant === "before" ? "border-gray-100" : "border-gray-200";
  const targetColor = variant === "before" ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`bg-white rounded-xl p-4 border ${borderColor} shadow-sm`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${labelColor} mb-3`}>Operational Health</p>
      <p className={`text-[9px] ${subColor} -mt-2 mb-3`}>Metrics that drive margin in service businesses</p>

      <div className="space-y-3">
        {[
          { label: "Gross Margin", sub: "Revenue minus direct labor & materials", value: "38%", target: ">40%", status: "warn" },
          { label: "Collection Rate", sub: "Invoices paid within 45 days", value: "91%", target: ">90%", status: "good" },
          { label: "OT Rate", sub: "Overtime as % of total labor hours", value: "14%", target: "<15%", status: "warn" },
        ].map((kpi) => (
          <div key={kpi.label} className={`pb-2.5 border-b ${borderColor} last:border-b-0`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${labelColor} leading-tight`}>{kpi.label}</p>
                <p className={`text-[9px] ${subColor} leading-tight mt-0.5`}>{kpi.sub}</p>
              </div>
              <div className="flex flex-col items-end">
                <p className={`text-base font-black leading-none ${kpi.status === "good" ? "text-emerald-600" : "text-amber-500"}`}>{kpi.value}</p>
                <p className={`text-[9px] ${targetColor} mt-0.5`}>Target: {kpi.target}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertStrip({ variant }: { variant: "before" | "after" }) {
  const bgColor = variant === "before" ? "bg-gray-50" : "bg-gray-50";
  const labelColor = variant === "before" ? "text-gray-400" : "text-gray-600";
  const noteColor = variant === "before" ? "text-gray-300" : "text-gray-500";

  return (
    <div className={`rounded-xl border ${variant === "before" ? "border-gray-100" : "border-gray-200"} overflow-hidden shadow-sm`}>
      {/* Header */}
      <div className={`${bgColor} px-3 py-2 flex items-center justify-between border-b ${variant === "before" ? "border-gray-100" : "border-gray-200"}`}>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>Signal Summary</p>
        <span className={`text-[9px] ${noteColor}`}>Live · 5 signals</span>
      </div>

      {/* Alerts */}
      <div className="bg-white divide-y divide-gray-100">
        {[
          { level: "red", icon: AlertTriangle, msg: "OT rate 28% — critically high", detail: "3 techs logged >50h this week" },
          { level: "amber", icon: Info, msg: "Pipeline down 18% MoM", detail: "Check quote conversion funnel" },
          { level: "green", icon: CheckCircle2, msg: "Collection rate on target", detail: "91% invoices paid within 45 days" },
        ].map((a, i) => (
          <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
            <a.icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${a.level === "red" ? "text-red-500" : a.level === "amber" ? "text-amber-500" : "text-emerald-500"}`} />
            <div>
              <p className="text-[11px] font-semibold text-gray-800">{a.msg}</p>
              <p className={`text-[10px] ${variant === "before" ? "text-gray-300" : "text-gray-500"} mt-0.5`}>{a.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamRow({ variant }: { variant: "before" | "after" }) {
  const labelColor = variant === "before" ? "text-gray-400" : "text-gray-600";
  const subColor = variant === "before" ? "text-gray-300" : "text-gray-500";
  const borderColor = variant === "before" ? "border-gray-100" : "border-gray-200";

  const members = [
    { name: "Sarah Chen", role: "super_admin", revenue: "$0", pipeline: "$1.2M", winRate: "—", status: "active" },
    { name: "Marcus R.", role: "manager", revenue: "$42K", pipeline: "$380K", winRate: "67%", status: "at_risk" },
    { name: "Priya M.", role: "member", revenue: "$0", pipeline: "$0", winRate: "—", status: "inactive" },
  ];

  return (
    <div className={`bg-white rounded-xl border ${borderColor} shadow-sm overflow-hidden`}>
      <div className={`px-3 py-2 border-b ${borderColor} flex items-center justify-between`}>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>Team Performance</p>
        <Users className={`w-3.5 h-3.5 ${variant === "before" ? "text-gray-300" : "text-gray-400"}`} />
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className={`border-b ${borderColor}`}>
            {["Name", "Revenue MTD", "Pipeline", "Win Rate", "Status"].map((h) => (
              <th key={h} className={`text-left py-1.5 px-2.5 font-semibold ${variant === "before" ? "text-gray-300" : "text-gray-500"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={i} className={`border-b ${borderColor} last:border-b-0`}>
              <td className="py-2 px-2.5">
                <p className="font-semibold text-gray-800 text-[11px]">{m.name}</p>
                <p className={`text-[9px] ${variant === "before" ? "text-gray-300" : "text-gray-500"} capitalize`}>{m.role.replace("_", " ")}</p>
              </td>
              <td className="py-2 px-2.5 font-semibold text-gray-800">{m.revenue}</td>
              <td className="py-2 px-2.5 text-gray-700">{m.pipeline}</td>
              <td className="py-2 px-2.5 text-gray-700">{m.winRate}</td>
              <td className="py-2 px-2.5">
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                  m.status === "active" ? "bg-emerald-50 text-emerald-700" :
                  m.status === "at_risk" ? "bg-amber-50 text-amber-700" :
                  "bg-red-50 text-red-600"
                }`}>{m.status === "at_risk" ? "at risk" : m.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Panel({ variant }: { variant: "before" | "after" }) {
  const bg = variant === "before" ? "bg-gray-50" : "bg-[#f7f7f8]";
  const headerBg = variant === "before" ? "bg-white border-b border-gray-100" : "bg-white border-b border-gray-200";
  const titleColor = variant === "before" ? "text-gray-400" : "text-gray-600";
  const tagBg = variant === "before" ? "bg-gray-100 text-gray-400" : "bg-gray-200 text-gray-600";

  return (
    <div className={`flex-1 ${bg} flex flex-col min-h-screen`}>
      {/* Mini header */}
      <div className={`${headerBg} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center">
            <span className="text-white text-[9px] font-black">M5</span>
          </div>
          <span className="text-sm font-bold text-gray-900">CEO Command Center</span>
        </div>
        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${tagBg}`}>
          {variant === "before" ? "CURRENT" : "PROPOSED"}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 flex-1">
        <StatCard variant={variant} />
        <KpiCard variant={variant} />
        <AlertStrip variant={variant} />
        <TeamRow variant={variant} />
      </div>
    </div>
  );
}

export function CeoColorRedesign() {
  return (
    <div className="flex min-h-screen font-sans" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <Panel variant="before" />
      <div className="w-px bg-gray-300 flex-shrink-0" />
      <Panel variant="after" />
    </div>
  );
}
