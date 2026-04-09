import { useState } from "react";

type Status = "draft" | "in_progress" | "pending_approval" | "approved" | "synced";

type Opportunity = {
  id: number;
  name: string;
  customer: string;
  property: string;
  serviceLines: string[];
  sellPrice: number;
  margin: number;
  status: Status;
  updatedAt: string;
  mode: "Quote" | "Estimate" | "Both";
};

const OPPS: Opportunity[] = [
  { id: 1, name: "Westgate Office Complex — HVAC + Electrical + Plumbing", customer: "Westgate Building Services", property: "123 Commerce Blvd", serviceLines: ["HVAC", "Electrical", "Plumbing"], sellPrice: 31240, margin: 22.4, status: "pending_approval", updatedAt: "Today, 9:14 AM", mode: "Estimate" },
  { id: 2, name: "Harbor Tower — Cooling Tower Replacement", customer: "Harbor Properties LLC", property: "450 Harbor Dr, Penthouse", serviceLines: ["HVAC"], sellPrice: 54800, margin: 31.2, status: "approved", updatedAt: "Yesterday, 4:31 PM", mode: "Estimate" },
  { id: 3, name: "Metro Plaza — Lighting Retrofit Phase 2", customer: "Metro Commercial", property: "Metro Plaza, Floors 4–9", serviceLines: ["Electrical"], sellPrice: 12350, margin: 38.5, status: "synced", updatedAt: "Apr 7, 2:15 PM", mode: "Quote" },
  { id: 4, name: "Sunrise Medical — Emergency Generator", customer: "Sunrise Medical Group", property: "2200 Health Pkwy", serviceLines: ["Electrical", "HVAC"], sellPrice: 28700, margin: 27.0, status: "in_progress", updatedAt: "Today, 7:02 AM", mode: "Both" },
  { id: 5, name: "Parkview Mall — Fire Suppression Inspection", customer: "Parkview Retail Corp", property: "Parkview Mall", serviceLines: ["Plumbing"], sellPrice: 4200, margin: 45.0, status: "draft", updatedAt: "Apr 6, 11:30 AM", mode: "Quote" },
  { id: 6, name: "City Tower — BAS Integration & Controls", customer: "City Tower Partners", property: "1 City Blvd, All Floors", serviceLines: ["HVAC", "Controls"], sellPrice: 89400, margin: 29.8, status: "in_progress", updatedAt: "Apr 5, 3:45 PM", mode: "Estimate" },
];

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-500/20 text-slate-300 border-slate-500/30" },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  pending_approval: { label: "Pending Approval", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  approved: { label: "Approved", color: "bg-green-500/20 text-green-300 border-green-500/30" },
  synced: { label: "Synced ✓", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};

const SERVICE_LINE_COLORS: Record<string, string> = {
  HVAC: "bg-blue-500/15 text-blue-300",
  Electrical: "bg-yellow-500/15 text-yellow-300",
  Plumbing: "bg-cyan-500/15 text-cyan-300",
  Controls: "bg-violet-500/15 text-violet-300",
};

export function OpportunitiesList() {
  const [filter, setFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [step, setStep] = useState(1);

  const filtered = OPPS.filter(o => {
    if (filter !== "all" && o.status !== filter) return false;
    if (search && !o.name.toLowerCase().includes(search.toLowerCase()) && !o.customer.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: OPPS.length,
    draft: OPPS.filter(o => o.status === "draft").length,
    in_progress: OPPS.filter(o => o.status === "in_progress").length,
    pending_approval: OPPS.filter(o => o.status === "pending_approval").length,
    approved: OPPS.filter(o => o.status === "approved").length,
    synced: OPPS.filter(o => o.status === "synced").length,
  };

  const totalPipeline = OPPS.reduce((sum, o) => sum + o.sellPrice, 0);
  const avgMargin = OPPS.reduce((sum, o) => sum + o.margin, 0) / OPPS.length;

  return (
    <div className="min-h-screen bg-[#0f1117] text-white font-sans flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/10 bg-[#161922]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Opportunities</h1>
            <p className="text-sm text-white/40 mt-0.5">AI-assisted estimating workspace for M5 Services</p>
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
            <span className="text-lg leading-none">+</span>
            New Opportunity
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total Pipeline", value: `$${(totalPipeline / 1000).toFixed(0)}K`, sub: `${OPPS.length} opportunities` },
            { label: "Avg Margin", value: `${avgMargin.toFixed(1)}%`, sub: "across all opps" },
            { label: "Pending Approval", value: String(counts.pending_approval), sub: "need review", color: "text-amber-400" },
            { label: "Synced to BuildOps", value: String(counts.synced), sub: "this month", color: "text-green-400" },
          ].map(k => (
            <div key={k.label} className="bg-[#0f1117] rounded-xl px-4 py-3 border border-white/5">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">{k.label}</div>
              <div className={`text-xl font-bold ${k.color ?? "text-white"}`}>{k.value}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters + search */}
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 rounded-lg p-0.5 text-xs">
            {(["all", "draft", "in_progress", "pending_approval", "approved", "synced"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md capitalize whitespace-nowrap transition-all ${filter === f ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}>
                {f === "all" ? `All (${counts.all})` :
                 f === "in_progress" ? `In Progress (${counts.in_progress})` :
                 f === "pending_approval" ? `Pending (${counts.pending_approval})` :
                 `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})`}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or customer..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="bg-[#161922] border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                <th className="px-4 py-3 text-white/40 font-medium text-xs">Opportunity</th>
                <th className="px-4 py-3 text-white/40 font-medium text-xs">Service Lines</th>
                <th className="px-4 py-3 text-white/40 font-medium text-xs">Mode</th>
                <th className="px-4 py-3 text-white/40 font-medium text-xs text-right">Sell Price</th>
                <th className="px-4 py-3 text-white/40 font-medium text-xs text-right">Margin</th>
                <th className="px-4 py-3 text-white/40 font-medium text-xs">Status</th>
                <th className="px-4 py-3 text-white/40 font-medium text-xs">Updated</th>
                <th className="px-4 py-3 text-white/40 font-medium text-xs"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(opp => {
                const statusCfg = STATUS_CONFIG[opp.status];
                return (
                  <tr key={opp.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="text-white/85 font-medium text-[13px] group-hover:text-white transition-colors">{opp.name}</div>
                      <div className="text-[11px] text-white/35 mt-0.5">{opp.customer} · {opp.property}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {opp.serviceLines.map(sl => (
                          <span key={sl} className={`text-[10px] px-1.5 py-0.5 rounded-full ${SERVICE_LINE_COLORS[sl] ?? "bg-white/10 text-white/50"}`}>{sl}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-full">{opp.mode}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-green-400 font-semibold">
                      ${opp.sellPrice.toLocaleString("en-US")}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-semibold ${opp.margin >= 25 ? "text-green-400" : "text-amber-400"}`}>{opp.margin}%</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-1 rounded-full border ${statusCfg.color}`}>{statusCfg.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-white/30">{opp.updatedAt}</td>
                    <td className="px-4 py-3.5">
                      <button className="text-xs text-white/30 hover:text-blue-400 font-medium transition-colors opacity-0 group-hover:opacity-100">
                        Open →
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-white/30">No opportunities match your filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => { setCreateOpen(false); setStep(1); }}>
          <div className="bg-[#1a1f2e] border border-white/10 rounded-2xl p-6 w-[480px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-white">New Opportunity</h3>
              <div className="text-xs text-white/30">Step {step} of 3</div>
            </div>
            <div className="flex gap-1.5 mb-5">
              {[1,2,3].map(s => (
                <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= step ? "bg-blue-500" : "bg-white/10"}`} />
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Opportunity Name</label>
                  <input placeholder="e.g. Riverside Tower — HVAC Overhaul" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-blue-500/50" />
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Customer</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/60 focus:outline-none focus:border-blue-500/50">
                    <option className="bg-[#1a1f2e]">Westgate Building Services</option>
                    <option className="bg-[#1a1f2e]">Harbor Properties LLC</option>
                    <option className="bg-[#1a1f2e]">Metro Commercial</option>
                    <option className="bg-[#1a1f2e]">Sunrise Medical Group</option>
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Property</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/60 focus:outline-none focus:border-blue-500/50">
                    <option className="bg-[#1a1f2e]">123 Commerce Blvd</option>
                    <option className="bg-[#1a1f2e]">450 Harbor Dr, Penthouse</option>
                    <option className="bg-[#1a1f2e]">Metro Plaza, Floors 4–9</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Service Lines</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["HVAC", "Electrical", "Plumbing", "Controls", "Fire Safety", "Building Automation"].map(sl => (
                      <label key={sl} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors">
                        <input type="checkbox" className="accent-blue-500" defaultChecked={["HVAC", "Electrical"].includes(sl)} />
                        <span className="text-sm text-white/70">{sl}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Quote", "Estimate", "Both"].map(m => (
                      <button key={m} className={`py-2.5 rounded-lg text-sm border transition-all ${m === "Estimate" ? "bg-blue-600 border-blue-500 text-white font-medium" : "bg-white/5 border-white/10 text-white/50 hover:text-white"}`}>{m}</button>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/30 mt-1.5">Quote = fast fixed price. Estimate = full line-item buffer math.</p>
                </div>
                <div>
                  <label className="text-xs text-white/50 block mb-1.5">Scope of Work (optional — paste to analyze with AI)</label>
                  <textarea placeholder="Paste RFP scope, email thread, or notes here..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/70 placeholder:text-white/20 resize-none h-24 focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              {step > 1 && <button onClick={() => setStep(s => s - 1)} className="text-sm text-white/40 hover:text-white px-4 py-2 rounded-lg transition-colors">← Back</button>}
              <div className="flex-1" />
              <button onClick={() => setCreateOpen(false)} className="text-sm text-white/40 hover:text-white px-4 py-2 rounded-lg transition-colors">Cancel</button>
              {step < 3
                ? <button onClick={() => setStep(s => s + 1)} className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-medium transition-colors">Continue →</button>
                : <button onClick={() => setCreateOpen(false)} className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-medium transition-colors">Create & Open Workspace</button>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
