import { useState } from "react";
import {
  Mail, Calendar, StickyNote, TrendingUp, DollarSign, Plus,
  ChevronDown, Building2, ArrowRight, Users, Mic
} from "lucide-react";

const RED = "#BE1916";

type FeedItem = {
  id: number;
  type: "email" | "meeting" | "note" | "deal" | "spend";
  date: string;
  dateRaw: number;
  photo?: string;
  author?: string;
  content: string;
  detail?: string;
  contacts?: string[];
  contactPhotos?: string[];
  tag?: string;
};

const feed: FeedItem[] = [
  {
    id: 1, type: "email", date: "Today, 9:42 AM", dateRaw: 0, photo: "https://randomuser.me/api/portraits/women/45.jpg",
    author: "Lisa Nakamura", content: "Re: Site walk schedule for Embarcadero Tower 1",
    detail: "Next Tuesday works great for us — let's plan on 10am. I'll have James there too. Can you bring the assessment checklist?",
    tag: "Inbound"
  },
  {
    id: 2, type: "deal", date: "Yesterday, 2:10 PM", dateRaw: 1,
    content: "Deal stage update: Suite 200 Vacant Prep",
    detail: "Scoping → Proposal Sent · $48,217 · Changed by Chase",
    tag: "Deal"
  },
  {
    id: 3, type: "note", date: "Mar 22 · 4:55 PM", dateRaw: 3, photo: "https://randomuser.me/api/portraits/men/1.jpg",
    author: "Chase Murray", content: "Q1 budget confirmed with Lisa",
    detail: "Lisa confirmed $2.4M is approved for TI work this quarter. They want to move fast on Embarcadero Tower 1 — site walk next week.",
    tag: "Note"
  },
  {
    id: 4, type: "meeting", date: "Mar 20 · 11:00 AM", dateRaw: 5,
    content: "Site walk — Embarcadero Center Tower 3",
    detail: "3 attendees · 45 min · Notes captured",
    contacts: ["Lisa Nakamura", "James Cho", "Chase Murray"],
    contactPhotos: [
      "https://randomuser.me/api/portraits/women/45.jpg",
      "https://randomuser.me/api/portraits/men/32.jpg",
      "https://randomuser.me/api/portraits/men/1.jpg",
    ],
    tag: "Meeting"
  },
  {
    id: 5, type: "spend", date: "Mar 19 · 1:30 PM", dateRaw: 6, photo: "https://randomuser.me/api/portraits/men/41.jpg",
    author: "Marcus Webb", content: "BD Spend: Lunch at Walnut Creek Grill",
    detail: "With Marcus Webb + Priya Mehta · $127.00 · Meals & Entertainment",
    tag: "BD Spend"
  },
  {
    id: 6, type: "email", date: "Mar 18 · 3:12 PM", dateRaw: 7, photo: "https://randomuser.me/api/portraits/men/32.jpg",
    author: "James Cho", content: "Re: Lobby HVAC quote — a few questions",
    detail: "Can you break out the HVAC parts separately from labor? Our procurement team needs it itemized. Also what's the lead time on the compressor unit?",
    tag: "Inbound"
  },
  {
    id: 7, type: "meeting", date: "Mar 15 · 10:00 AM", dateRaw: 10,
    content: "Quarterly business review — Bay Area team",
    detail: "5 attendees · 60 min · Action items created",
    contacts: ["Lisa Nakamura", "James Cho", "Rachel Torres", "Chase Murray"],
    contactPhotos: [
      "https://randomuser.me/api/portraits/women/45.jpg",
      "https://randomuser.me/api/portraits/men/32.jpg",
      "https://randomuser.me/api/portraits/women/28.jpg",
      "https://randomuser.me/api/portraits/men/1.jpg",
    ],
    tag: "Meeting"
  },
  {
    id: 8, type: "note", date: "Mar 14 · 9:00 AM", dateRaw: 11, photo: "https://randomuser.me/api/portraits/men/1.jpg",
    author: "Chase Murray", content: "Call notes: Marcus Webb",
    detail: "East Bay team looking at 2 new properties in Concord. Marcus wants to be quoted proactively before the buildings are under lease. Good opportunity.",
    tag: "Note"
  },
];

const filterTypes = ["All", "Emails", "Meetings", "Notes", "Deals", "BD Spend"];
const filterMap: Record<string, FeedItem["type"][]> = {
  All: ["email","meeting","note","deal","spend"],
  Emails: ["email"], Meetings: ["meeting"], Notes: ["note"], Deals: ["deal"], "BD Spend": ["spend"],
};

const typeStyles: Record<FeedItem["type"], { bg: string; icon: React.ReactNode; tagColor: string }> = {
  email: { bg: "bg-blue-50", icon: <Mail className="w-4 h-4 text-blue-500" />, tagColor: "bg-blue-100 text-blue-700" },
  meeting: { bg: "bg-purple-50", icon: <Calendar className="w-4 h-4 text-purple-500" />, tagColor: "bg-purple-100 text-purple-700" },
  note: { bg: "bg-amber-50", icon: <StickyNote className="w-4 h-4 text-amber-500" />, tagColor: "bg-amber-100 text-amber-800" },
  deal: { bg: "bg-emerald-50", icon: <TrendingUp className="w-4 h-4 text-emerald-500" />, tagColor: "bg-emerald-100 text-emerald-700" },
  spend: { bg: "bg-rose-50", icon: <DollarSign className="w-4 h-4 text-rose-500" />, tagColor: "bg-rose-100 text-rose-700" },
};

function Photo({ src, name, size = 8 }: { src?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const cls = `w-${size} h-${size} rounded-full object-cover flex-shrink-0`;
  if (src && !failed) return <img src={src} alt={name} onError={() => setFailed(true)} className={cls} />;
  return <div className={`${cls} bg-gray-300 flex items-center justify-center text-[10px] font-bold text-white`}>{name[0]}</div>;
}

export function HistoryTab() {
  const [activeFilter, setActiveFilter] = useState("All");
  const types = filterMap[activeFilter];
  const filtered = feed.filter(f => types.includes(f.type));

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
            <div key={t} className={`px-3 py-2 text-xs font-medium border-b-2 mr-1 ${t === "History" ? "" : "border-transparent text-gray-400"}`} style={t === "History" ? { borderColor: RED, color: RED, borderBottomWidth: 2 } : {}}>{t}</div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Filter + Log activity */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {filterTypes.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${activeFilter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="relative group">
            <button className="text-xs px-3 py-1.5 rounded-lg text-white font-medium flex items-center gap-1.5" style={{ backgroundColor: RED }}>
              <Plus className="w-3 h-3" /> Log Activity <ChevronDown className="w-3 h-3" />
            </button>
            <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"><StickyNote className="w-3 h-3 text-amber-500" /> Note</button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"><Calendar className="w-3 h-3 text-purple-500" /> Meeting</button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"><Mic className="w-3 h-3 text-blue-500" /> Call</button>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="max-w-3xl space-y-3">
          {filtered.map(item => {
            const s = typeStyles[item.type];
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full ${s.bg} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-start gap-2 mb-1">
                      {item.photo && <Photo src={item.photo} name={item.author || ""} size={6} />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.author && <span className="text-xs font-semibold text-gray-900">{item.author}</span>}
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.tagColor}`}>{item.tag}</span>
                          <span className="text-[10px] text-gray-400 ml-auto">{item.date}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 mt-0.5 leading-snug">{item.content}</p>
                      </div>
                    </div>
                    {/* Detail */}
                    {item.detail && <p className="text-xs text-gray-500 leading-relaxed mt-1.5 pl-0">{item.detail}</p>}
                    {/* Attendee photos for meetings */}
                    {item.contactPhotos && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex -space-x-1.5">
                          {item.contactPhotos.map((p, i) => <Photo key={i} src={p} name={item.contacts?.[i] || ""} size={6} />)}
                        </div>
                        <span className="text-[10px] text-gray-400">{item.contacts?.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
