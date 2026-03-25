import { useState } from "react";
import {
  Building2, Globe, Phone, Mail, MapPin, TrendingUp, DollarSign,
  Calendar, Clock, Star, StickyNote, Edit2, Users, FileText,
  CheckCircle, ArrowUpRight, MoreHorizontal, HeartPulse
} from "lucide-react";

const RED = "#BE1916";

const contacts = [
  { id: 10, name: "Lisa Nakamura", title: "Regional VP – West", photo: "https://randomuser.me/api/portraits/women/45.jpg", tier: "A", lastContact: "2 days ago" },
  { id: 11, name: "James Cho", title: "Sr. Property Manager", photo: "https://randomuser.me/api/portraits/men/32.jpg", tier: "A", lastContact: "5 days ago" },
  { id: 20, name: "Marcus Webb", title: "Area Director", photo: "https://randomuser.me/api/portraits/men/41.jpg", tier: "A", lastContact: "1 week ago" },
  { id: 21, name: "Priya Mehta", title: "Property Manager", photo: "https://randomuser.me/api/portraits/women/33.jpg", tier: "B", lastContact: "2 weeks ago" },
];

const activity = [
  { type: "email", icon: "mail", color: "text-blue-500 bg-blue-50", label: "Email from Lisa Nakamura", detail: "Re: Site walk schedule for Embarcadero Tower 1 — next Tuesday works for us.", time: "2h ago", photo: "https://randomuser.me/api/portraits/women/45.jpg" },
  { type: "deal", icon: "trending", color: "text-emerald-500 bg-emerald-50", label: "Deal moved to Proposal", detail: "Suite 200 Vacant Prep · $48,217 moved from Scoping → Proposal Sent", time: "Yesterday" },
  { type: "note", icon: "note", color: "text-amber-500 bg-amber-50", label: "Note by Chase", detail: "Confirmed Q1 budget refresh — Lisa's team has $2.4M approved for TI work.", time: "3 days ago" },
  { type: "meeting", icon: "calendar", color: "text-purple-500 bg-purple-50", label: "Meeting logged", detail: "Site walk at Embarcadero Tower 3 · Lisa, James, Chase attended", time: "5 days ago", photo: "https://randomuser.me/api/portraits/men/32.jpg" },
  { type: "spend", icon: "dollar", color: "text-rose-500 bg-rose-50", label: "BD spend logged", detail: "Lunch with Marcus Webb · $127 · Walnut Creek Grill", time: "1 week ago" },
];

function ContactPhoto({ photo, name, size = 10 }: { photo: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const cls = `w-${size} h-${size} rounded-full object-cover ring-2 ring-white`;
  if (!failed) return <img src={photo} alt={name} onError={() => setFailed(true)} className={cls} />;
  return <div className={`w-${size} h-${size} rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white`}>{name[0]}</div>;
}

function TierBadge({ tier }: { tier: string }) {
  const c: Record<string,string> = { A: "bg-emerald-100 text-emerald-700", B: "bg-blue-100 text-blue-700" };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c[tier] || "bg-gray-100 text-gray-500"}`}>{tier}</span>;
}

function ActivityIcon({ type }: { type: string }) {
  if (type === "email") return <Mail className="w-3.5 h-3.5 text-blue-500" />;
  if (type === "deal") return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (type === "note") return <StickyNote className="w-3.5 h-3.5 text-amber-500" />;
  if (type === "meeting") return <Calendar className="w-3.5 h-3.5 text-purple-500" />;
  if (type === "spend") return <DollarSign className="w-3.5 h-3.5 text-rose-500" />;
  return null;
}

const bgMap: Record<string,string> = { email:"bg-blue-50", deal:"bg-emerald-50", note:"bg-amber-50", meeting:"bg-purple-50", spend:"bg-rose-50" };

export function OverviewTab() {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("C&W is our highest-revenue customer. Strong relationship with Lisa on Bay Area portfolio. East Bay team (Marcus) is underserved — good opportunity to grow. Always send branded proposals. Net-30 payment terms agreed.");

  return (
    <div className="min-h-screen bg-gray-50 font-['Space_Grotesk',sans-serif]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold">C&W</div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 font-['Archivo_Black',sans-serif]">Cushman &amp; Wakefield</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Tier A</span>
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><HeartPulse className="w-3.5 h-3.5" /> Healthy</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span>Commercial Real Estate</span>
              <span>·</span>
              <span>Account Mgr: Chase Murray</span>
              <span>·</span>
              <span>Customer since Jan 2021</span>
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ backgroundColor: RED }}>Edit Company</button>
        </div>
        {/* Tabs */}
        <div className="flex gap-0 mt-4 border-b border-gray-200 -mb-4">
          {["Overview","Organization","Revenue","History","Files","Intelligence"].map(t => (
            <div key={t} className={`px-3 py-2 text-xs font-medium border-b-2 mr-1 ${t === "Overview" ? "" : "border-transparent text-gray-400"}`} style={t === "Overview" ? { borderColor: RED, color: RED, borderBottomWidth: 2 } : {}}>{t}</div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Company notes */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <StickyNote className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          {editingNotes ? (
            <div className="flex-1">
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full text-xs text-amber-900 bg-transparent border-none outline-none resize-none leading-relaxed" rows={3} />
              <button onClick={() => setEditingNotes(false)} className="text-xs text-amber-700 font-medium mt-1">Save</button>
            </div>
          ) : (
            <div className="flex-1">
              <p className="text-xs text-amber-900 leading-relaxed">{notes}</p>
              <button onClick={() => setEditingNotes(true)} className="text-[10px] text-amber-600 mt-1 hover:underline flex items-center gap-1"><Edit2 className="w-3 h-3" /> Edit note</button>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Revenue (LTM)", value: "$487,200", sub: "↑ 14% vs prior year", color: "text-emerald-600" },
            { label: "Open Pipeline", value: "$218,400", sub: "6 active deals", color: "text-blue-600" },
            { label: "BD Spend YTD", value: "$3,240", sub: "Budget: $5,000", color: "text-gray-700" },
            { label: "Last Activity", value: "2 days ago", sub: "Email from Lisa N.", color: "text-gray-700" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-5 gap-5">
          {/* Left: Company details */}
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Company Details</h3>
              <div className="space-y-2.5">
                {[
                  { icon: <MapPin className="w-3.5 h-3.5 text-gray-400" />, label: "Headquarters", value: "225 W Wacker Dr, Chicago, IL" },
                  { icon: <Phone className="w-3.5 h-3.5 text-gray-400" />, label: "Main Phone", value: "(312) 470-1800" },
                  { icon: <Globe className="w-3.5 h-3.5 text-gray-400" />, label: "Website", value: "cushmanwakefield.com" },
                  { icon: <DollarSign className="w-3.5 h-3.5 text-gray-400" />, label: "Est. Annual Rev.", value: "$2.4M potential" },
                  { icon: <Building2 className="w-3.5 h-3.5 text-gray-400" />, label: "Portfolio", value: "9 buildings · 3 teams" },
                ].map(d => (
                  <div key={d.label} className="flex gap-2 text-xs">
                    <span className="flex-shrink-0 mt-0.5">{d.icon}</span>
                    <span className="text-gray-500 min-w-[100px]">{d.label}</span>
                    <span className="text-gray-800 font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Service Needs</h3>
              <div className="flex flex-wrap gap-1.5">
                {["Janitorial","Special Projects","Facility Solutions","Building Engineering","Property Assessment"].map(s => (
                  <span key={s} className="px-2 py-1 rounded-full text-[10px] font-medium border border-gray-200 text-gray-600 bg-gray-50">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Contacts + Activity */}
          <div className="col-span-3 space-y-4">
            {/* Key Contacts */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Key Contacts</h3>
                <button className="text-xs text-gray-400 hover:text-gray-600">See all 9 →</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50">
                    <ContactPhoto photo={c.photo} name={c.name} size={9} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                        <TierBadge tier={c.tier} />
                      </div>
                      <div className="text-[10px] text-gray-500 truncate">{c.title}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5"><Clock className="w-2.5 h-2.5" />{c.lastContact}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Activity</h3>
                <button className="text-xs text-gray-400 hover:text-gray-600">Full history →</button>
              </div>
              <div className="space-y-2">
                {activity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                    <div className={`w-7 h-7 rounded-full ${bgMap[a.type]} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <ActivityIcon type={a.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-800">{a.label}</span>
                        <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{a.time}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5 line-clamp-1">{a.detail}</p>
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
