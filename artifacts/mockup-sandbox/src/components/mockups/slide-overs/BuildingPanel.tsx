import { useState } from "react";
import {
  X, MapPin, Building2, Star, StickyNote, Edit2,
  ChevronRight, Clock, FileText, CheckCircle,
  Phone, Mail
} from "lucide-react";

const RED = "#BE1916";

const building = {
  name: "101 California Street",
  address: "101 California St",
  city: "San Francisco, CA 94111",
  type: "Class A Office",
  sqft: "430,000",
  team: "Bay Area Portfolio",
  teamColor: "#BE1916",
  notes: "New security badge system — call ahead before sending crew. Loading dock available 6am–3pm weekdays only. Building management requires 48h notice for any work in occupied suites.",
};

const contacts = [
  { id: 11, name: "James Cho", title: "Sr. Property Manager", photo: "https://randomuser.me/api/portraits/men/32.jpg", tier: "A", isPrimary: true },
  { id: 10, name: "Lisa Nakamura", title: "Regional VP – West", photo: "https://randomuser.me/api/portraits/women/45.jpg", tier: "A", isPrimary: false },
];

const quotes = [
  { id: "Q-2128", title: "Lobby Refresh + HVAC Repair", status: "draft", amount: 31500, date: "Mar 14, 2025" },
  { id: "Q-2103", title: "Night Janitorial Services (Annual)", status: "accepted", amount: 62400, date: "Feb 15, 2025" },
  { id: "Q-2089", title: "4th Floor Suite 420 TI Scoping", status: "sent", amount: 0, date: "Mar 22, 2025" },
];

const jobs = [
  { id: "J-8821", title: "Emergency HVAC – Unit 3F", status: "completed", completedDate: "Mar 18, 2025", amount: 4200, type: "Maintenance" },
  { id: "J-8804", title: "Common Area Lighting Replacement", status: "completed", completedDate: "Mar 5, 2025", amount: 8750, type: "Special Project" },
  { id: "J-8776", title: "Monthly Janitorial — February", status: "invoiced", completedDate: "Mar 1, 2025", amount: 5200, type: "Janitorial" },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  sent: { label: "Sent", color: "text-blue-700", bg: "bg-blue-50", icon: <Clock className="w-3 h-3" /> },
  draft: { label: "Draft", color: "text-gray-600", bg: "bg-gray-100", icon: <FileText className="w-3 h-3" /> },
  accepted: { label: "Accepted", color: "text-emerald-700", bg: "bg-emerald-50", icon: <CheckCircle className="w-3 h-3" /> },
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50", icon: <CheckCircle className="w-3 h-3" /> },
  invoiced: { label: "Invoiced", color: "text-purple-700", bg: "bg-purple-50", icon: <FileText className="w-3 h-3" /> },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function ContactRow({ c }: { c: typeof contacts[0] }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer group">
      {c.photo && !photoFailed
        ? <img src={c.photo} alt={c.name} onError={() => setPhotoFailed(true)} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        : <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{c.name[0]}</div>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
          {c.isPrimary && <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" title="Primary contact" />}
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.tier === "A" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>{c.tier}</span>
        </div>
        <div className="text-xs text-gray-400 truncate">{c.title}{c.isPrimary && " · Primary"}</div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
        <button className="p-1 rounded hover:bg-gray-200"><Mail className="w-3 h-3 text-gray-500" /></button>
        <button className="p-1 rounded hover:bg-gray-200"><Phone className="w-3 h-3 text-gray-500" /></button>
        <button className="p-1 rounded hover:bg-gray-200"><ChevronRight className="w-3 h-3 text-gray-500" /></button>
      </div>
    </div>
  );
}

export function BuildingPanel() {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(building.notes);
  const [activeTab, setActiveTab] = useState<"quotes" | "jobs">("quotes");

  const totalJobRevenue = jobs.reduce((s, j) => s + j.amount, 0);
  const openQuotesValue = quotes.filter(q => q.status === "sent").reduce((s, q) => s + q.amount, 0);

  return (
    <div className="min-h-screen bg-gray-100 font-['Space_Grotesk',sans-serif] flex items-start justify-end">
      <div className="fixed inset-0 bg-gray-100 opacity-60" />

      <div className="relative w-[520px] h-screen bg-white shadow-2xl flex flex-col overflow-hidden border-l border-gray-200">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-gray-900 font-['Archivo_Black',sans-serif] truncate">{building.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span>{building.address}, {building.city}</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{building.type}</span>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{building.sqft} sqft</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ backgroundColor: `${building.teamColor}15`, color: building.teamColor }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: building.teamColor }} />
                  {building.team}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button className="text-[11px] px-2 py-1 rounded-lg hover:bg-gray-100 text-gray-500 border border-gray-200">
                Reassign team
              </button>
              <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: "Open Quotes", value: fmt(openQuotesValue), color: "text-blue-600" },
              { label: "Revenue (jobs)", value: fmt(totalJobRevenue), color: "text-emerald-600" },
              { label: "Active Contacts", value: String(contacts.length), color: "text-gray-800" },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Building notes */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Building Notes</h3>
              {!editingNotes && <button onClick={() => setEditingNotes(true)} className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"><Edit2 className="w-2.5 h-2.5" /> Edit</button>}
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              {editingNotes ? (
                <div className="flex-1">
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full text-xs text-amber-900 bg-transparent border-none outline-none resize-none leading-relaxed" />
                  <button onClick={() => setEditingNotes(false)} className="text-[10px] text-amber-700 font-medium">Save</button>
                </div>
              ) : (
                <p className="text-xs text-amber-800 leading-relaxed">{notes}</p>
              )}
            </div>
          </div>

          {/* Contacts */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacts at This Building</h3>
              <button className="text-[10px] text-gray-400 hover:text-gray-600">+ Assign contact</button>
            </div>
            <div className="space-y-2">
              {contacts.map(c => <ContactRow key={c.id} c={c} />)}
            </div>
          </div>

          {/* BuildOps data tabs */}
          <div className="px-5 py-4">
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 mb-4 w-fit">
              {(["quotes", "jobs"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${activeTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                  {t === "quotes" ? `BuildOps Quotes (${quotes.length})` : `Job History (${jobs.length})`}
                </button>
              ))}
            </div>

            {activeTab === "quotes" ? (
              <div className="space-y-2">
                {quotes.map(q => {
                  const s = statusConfig[q.status];
                  return (
                    <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <div className={`w-7 h-7 rounded-full ${s.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>{s.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900">{q.title}</span>
                          <span className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{q.id} · {q.date}</div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 flex-shrink-0">
                        {q.amount > 0 ? fmt(q.amount) : <span className="text-gray-400 text-xs font-normal">TBD</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.map(j => {
                  const s = statusConfig[j.status];
                  return (
                    <div key={j.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <div className={`w-7 h-7 rounded-full ${s.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>{s.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{j.title}</span>
                          <span className={`flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{j.id} · {j.type} · {j.completedDate}</div>
                      </div>
                      <div className="text-sm font-bold text-gray-900 flex-shrink-0">{fmt(j.amount)}</div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Total shown</span>
                  <span className="font-semibold text-gray-800">{fmt(totalJobRevenue)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
