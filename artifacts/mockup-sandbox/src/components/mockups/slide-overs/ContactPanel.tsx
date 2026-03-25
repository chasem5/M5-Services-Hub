import { useState } from "react";
import {
  X, Mail, Phone, ExternalLink, MapPin, Building2, Star,
  StickyNote, TrendingUp, Calendar, DollarSign, Edit2,
  ChevronRight, ChevronDown, Briefcase, Clock, Users, ArrowUpRight
} from "lucide-react";

const RED = "#BE1916";

const contact = {
  id: 11,
  name: "James Cho",
  title: "Sr. Property Manager",
  company: "Cushman & Wakefield",
  email: "jcho@cushwake.com",
  phone: "(415) 882-4412",
  linkedinUrl: "https://linkedin.com/in/james-cho-cw",
  photo: "https://randomuser.me/api/portraits/men/32.jpg",
  tier: "A",
  stage: "Active",
  stageColor: "bg-emerald-100 text-emerald-700",
  team: "Bay Area Portfolio",
  teamColor: "#BE1916",
  reportsTo: "Lisa Nakamura",
  buildings: [
    { id: 103, name: "101 California Street", address: "101 California St, SF", sqft: "430,000", type: "Class A Office" },
    { id: 102, name: "Embarcadero Center Tower 3", address: "3 Embarcadero Ctr, SF", sqft: "580,000", type: "Class A Office" },
  ],
  notes: "James is the main point of contact for day-to-day work at 101 Cal. Always responds to email within 2 hours. Prefers brief scope summaries before formal proposals. Building engineer background — very detail-oriented on specs.",
  lastContact: "2 days ago",
  lastMeeting: "Mar 20, 2025",
};

const activity = [
  { type: "email", label: "Email to James Cho", detail: "Re: Lobby HVAC quote — itemized breakdown", time: "2 days ago", photo: "https://randomuser.me/api/portraits/men/1.jpg", author: "Chase" },
  { type: "email", label: "Email from James Cho", detail: "Re: Site walk schedule for Embarcadero Tower 1 — next Tuesday works.", time: "4 days ago", photo: "https://randomuser.me/api/portraits/men/32.jpg", author: "James" },
  { type: "meeting", label: "Site walk — Emb. Tower 3", detail: "James, Lisa, Chase · 45 min · Notes captured", time: "Mar 20", photo: "https://randomuser.me/api/portraits/men/32.jpg", author: "James" },
  { type: "spend", label: "BD Spend — Lunch at Ferry Building", detail: "With James Cho · $84.50 · Meals & Entertainment", time: "Mar 12", photo: "https://randomuser.me/api/portraits/men/1.jpg", author: "Chase" },
  { type: "note", label: "Note by Chase", detail: "James flagged a new TI scope coming for suite 420 — watch for RFP.", time: "Mar 8", photo: "https://randomuser.me/api/portraits/men/1.jpg", author: "Chase" },
];

const deals = [
  { id: 1, name: "Suite 200 Vacant Prep", amount: "$48,217", status: "sent", stage: "Proposal Sent" },
  { id: 2, name: "Lobby Refresh + HVAC Repair", amount: "$31,500", status: "draft", stage: "Scoping" },
];

const typeIcon: Record<string, React.ReactNode> = {
  email: <Mail className="w-3.5 h-3.5 text-blue-500" />,
  meeting: <Calendar className="w-3.5 h-3.5 text-purple-500" />,
  spend: <DollarSign className="w-3.5 h-3.5 text-rose-500" />,
  note: <StickyNote className="w-3.5 h-3.5 text-amber-500" />,
};
const typeBg: Record<string, string> = {
  email: "bg-blue-50", meeting: "bg-purple-50", spend: "bg-rose-50", note: "bg-amber-50",
};

function Photo({ src, name, size = 9 }: { src?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const cls = `w-${size} h-${size} rounded-full object-cover flex-shrink-0`;
  if (src && !failed) return <img src={src} alt={name} onError={() => setFailed(true)} className={cls} />;
  return <div className={`${cls} bg-gray-300 flex items-center justify-center text-xs font-bold text-white`}>{name[0]}</div>;
}

function TierBadge({ tier }: { tier: string }) {
  const c: Record<string, string> = { A: "bg-emerald-100 text-emerald-700", B: "bg-blue-100 text-blue-700" };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c[tier] || "bg-gray-100 text-gray-600"}`}>{tier}-Tier</span>;
}

function StatusBadge({ status }: { status: string }) {
  const c: Record<string, string> = { sent: "bg-blue-100 text-blue-700", draft: "bg-gray-100 text-gray-600", accepted: "bg-emerald-100 text-emerald-700" };
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${c[status] || "bg-gray-100 text-gray-600"}`}>{status}</span>;
}

export function ContactPanel() {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(contact.notes);
  const [showAll, setShowAll] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  const visibleActivity = showAll ? activity : activity.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-100 font-['Space_Grotesk',sans-serif] flex items-start justify-end p-0">
      {/* Simulated background page */}
      <div className="fixed inset-0 bg-gray-100 opacity-60 backdrop-blur-sm" />

      {/* Slide-over panel */}
      <div className="relative w-[480px] h-screen bg-white shadow-2xl flex flex-col overflow-hidden border-l border-gray-200">
        {/* Header */}
        <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="relative flex-shrink-0">
            {contact.photo && !photoFailed
              ? <img src={contact.photo} alt={contact.name} onError={() => setPhotoFailed(true)} className="w-16 h-16 rounded-full object-cover" style={{ outline: `2px solid ${RED}`, outlineOffset: "2px" }} />
              : <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: RED }}>{contact.name.split(" ").map(n => n[0]).join("")}</div>
            }
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white" title="Active" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 font-['Archivo_Black',sans-serif]">{contact.name}</h2>
              <TierBadge tier={contact.tier} />
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${contact.stageColor}`}>{contact.stage}</span>
            </div>
            <p className="text-sm text-gray-600 mt-0.5">{contact.title}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{contact.company}</span>
              <span>·</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: contact.teamColor }} />
                <span>{contact.team}</span>
              </div>
            </div>
            {contact.reportsTo && (
              <div className="text-xs text-gray-400 mt-0.5">Reports to {contact.reportsTo}</div>
            )}
          </div>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Contact info */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="space-y-2.5">
              <a href="#" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 group">
                <Mail className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                <span>{contact.email}</span>
                <ArrowUpRight className="w-3 h-3 text-gray-300 group-hover:text-blue-400 ml-auto" />
              </a>
              <a href="#" className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 group">
                <Phone className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                <span>{contact.phone}</span>
              </a>
              <a href="#" className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700 group">
                <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>LinkedIn Profile</span>
                <ArrowUpRight className="w-3 h-3 text-blue-300 group-hover:text-blue-500 ml-auto" />
              </a>
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
              <Clock className="w-3 h-3" /><span>Last contact: {contact.lastContact}</span>
              <span>·</span>
              <Calendar className="w-3 h-3" /><span>Last meeting: {contact.lastMeeting}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 py-3 border-b border-gray-100 flex gap-2">
            <button className="flex-1 text-xs py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5">
              <Mail className="w-3 h-3" /> Send Email
            </button>
            <button className="flex-1 text-xs py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5">
              <Calendar className="w-3 h-3" /> Log Meeting
            </button>
            <button className="flex-1 text-xs py-2 rounded-lg text-white font-medium flex items-center justify-center gap-1.5" style={{ backgroundColor: RED }}>
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          </div>

          {/* Internal Notes */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Internal Notes</h3>
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

          {/* Buildings managed */}
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Buildings Managed</h3>
            <div className="space-y-2">
              {contact.buildings.map(b => (
                <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{b.name}</div>
                    <div className="text-xs text-gray-400 truncate">{b.address} · {b.sqft} sqft</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Open Deals */}
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Open Deals</h3>
            <div className="space-y-2">
              {deals.map(d => (
                <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer group">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${RED}15` }}>
                    <TrendingUp className="w-3.5 h-3.5" style={{ color: RED }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{d.name}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="text-xs text-gray-400">{d.stage} · {d.amount}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div className="px-5 py-4 pb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {visibleActivity.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                  <div className={`w-7 h-7 rounded-full ${typeBg[a.type]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {typeIcon[a.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-800">{a.label}</span>
                      <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{a.time}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{a.detail}</p>
                  </div>
                </div>
              ))}
              {activity.length > 3 && (
                <button onClick={() => setShowAll(!showAll)} className="text-xs text-gray-400 hover:text-gray-600 w-full text-center py-1 flex items-center justify-center gap-1">
                  {showAll ? <><ChevronDown className="w-3 h-3 rotate-180" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show {activity.length - 3} more</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
