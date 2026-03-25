import { useState } from "react";
import {
  Building2, Users, ChevronDown, ChevronRight, MapPin,
  Mail, Plus, MoreHorizontal, StickyNote, User, Network,
  MoveRight, Star, AlertCircle
} from "lucide-react";

const RED = "#BE1916";

const teams = [
  {
    id: 1, name: "Bay Area Portfolio", color: "#BE1916",
    notes: "Always request site walk before quoting. Lisa prefers email over calls. Budget cycle resets in Q1.",
    members: [
      { id: 10, name: "Lisa Nakamura", title: "Regional VP – West", isPrimary: true, reportsTo: null, location: "Embarcadero Center Tower 3", email: "lnakamura@cushwake.com", phone: "(415) 882-4401", tier: "A", photo: "https://randomuser.me/api/portraits/women/45.jpg" },
      { id: 11, name: "James Cho", title: "Sr. Property Manager", isPrimary: false, reportsTo: 10, location: "101 California St", email: "jcho@cushwake.com", phone: "(415) 882-4412", tier: "A", photo: "https://randomuser.me/api/portraits/men/32.jpg" },
      { id: 12, name: "Rachel Torres", title: "Property Manager", isPrimary: false, reportsTo: 11, location: "225 Bush St", email: "rtorres@cushwake.com", phone: "(415) 882-4433", tier: "B", photo: "https://randomuser.me/api/portraits/women/28.jpg" },
      { id: 13, name: "Derek Singh", title: "Property Manager", isPrimary: false, reportsTo: 11, location: "Embarcadero Center Tower 1", email: "dsingh@cushwake.com", phone: "(415) 882-4455", tier: "B", photo: "https://randomuser.me/api/portraits/men/19.jpg" },
    ],
    buildings: [
      { id: 101, name: "Embarcadero Center Tower 1", address: "1 Embarcadero Ctr, San Francisco, CA", sqft: "620,000", primaryContact: "Derek Singh", type: "Class A Office" },
      { id: 102, name: "Embarcadero Center Tower 3", address: "3 Embarcadero Ctr, San Francisco, CA", sqft: "580,000", primaryContact: "Lisa Nakamura", type: "Class A Office" },
      { id: 103, name: "101 California Street", address: "101 California St, San Francisco, CA", sqft: "430,000", primaryContact: "James Cho", type: "Class A Office" },
      { id: 104, name: "225 Bush Street", address: "225 Bush St, San Francisco, CA", sqft: "295,000", primaryContact: "Rachel Torres", type: "Class A Office" },
    ]
  },
  {
    id: 2, name: "East Bay / Walnut Creek", color: "#2563EB",
    notes: "Monthly lunch with this team works well — they're all within 10 min of each other. Budget authority sits with Marcus.",
    members: [
      { id: 20, name: "Marcus Webb", title: "Area Director", isPrimary: true, reportsTo: null, location: "1333 N California Blvd", email: "mwebb@cushwake.com", phone: "(925) 274-0100", tier: "A", photo: "https://randomuser.me/api/portraits/men/41.jpg" },
      { id: 21, name: "Priya Mehta", title: "Property Manager", isPrimary: false, reportsTo: 20, location: "2033 N Main St", email: "pmehta@cushwake.com", phone: "(925) 274-0122", tier: "B", photo: "https://randomuser.me/api/portraits/women/33.jpg" },
      { id: 22, name: "Tom Garza", title: "Facilities Coordinator", isPrimary: false, reportsTo: 21, location: "1333 N California Blvd", email: "tgarza@cushwake.com", phone: "(925) 274-0155", tier: "C", photo: "https://randomuser.me/api/portraits/men/55.jpg" },
    ],
    buildings: [
      { id: 201, name: "1333 N California Blvd", address: "1333 N California Blvd, Walnut Creek, CA", sqft: "180,000", primaryContact: "Marcus Webb", type: "Class B Office" },
      { id: 202, name: "2033 N Main Street", address: "2033 N Main St, Walnut Creek, CA", sqft: "95,000", primaryContact: "Priya Mehta", type: "Class B Office" },
    ]
  },
  {
    id: 3, name: "South Bay", color: "#059669",
    notes: "New team lead as of Jan 2025 — building relationship with Sandra now. Previous contact (Kevin) left company.",
    members: [
      { id: 30, name: "Sandra Kim", title: "Portfolio Manager", isPrimary: true, reportsTo: null, location: "2 N Market St, San Jose", email: "skim@cushwake.com", phone: "(408) 510-0200", tier: "B", photo: "https://randomuser.me/api/portraits/women/12.jpg" },
      { id: 31, name: "Bryan Nguyen", title: "Property Manager", isPrimary: false, reportsTo: 30, location: "10 Almaden Blvd", email: "bnguyen@cushwake.com", phone: "(408) 510-0231", tier: "B", photo: "https://randomuser.me/api/portraits/men/67.jpg" },
    ],
    buildings: [
      { id: 301, name: "2 N Market Street", address: "2 N Market St, San Jose, CA", sqft: "210,000", primaryContact: "Sandra Kim", type: "Class A Office" },
      { id: 302, name: "10 Almaden Blvd", address: "10 Almaden Blvd, San Jose, CA", sqft: "145,000", primaryContact: "Bryan Nguyen", type: "Class B Office" },
      { id: 303, name: "3055 Olin Ave", address: "3055 Olin Ave, San Jose, CA", sqft: "88,000", primaryContact: "Bryan Nguyen", type: "Industrial" },
    ]
  }
];

type ViewMode = "teams" | "orgchart";
type Member = typeof teams[0]["members"][0];

function Avatar({ member, size = "sm", teamColor }: { member: Member; size?: "sm" | "md" | "lg"; teamColor: string }) {
  const [failed, setFailed] = useState(false);
  const dims = size === "lg" ? "w-14 h-14" : size === "md" ? "w-10 h-10" : "w-8 h-8";
  const text = size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-xs";
  const initials = member.name.split(" ").map((n: string) => n[0]).join("");
  if (member.photo && !failed) {
    return (
      <img src={member.photo} alt={member.name} onError={() => setFailed(true)}
        className={`${dims} rounded-full object-cover flex-shrink-0 ring-2 ring-white`} />
    );
  }
  return (
    <div className={`${dims} rounded-full flex items-center justify-center text-white ${text} font-bold flex-shrink-0`}
      style={{ backgroundColor: teamColor }}>
      {initials}
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = { A: "bg-emerald-100 text-emerald-700", B: "bg-blue-100 text-blue-700", C: "bg-gray-100 text-gray-600" };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[tier] || "bg-gray-100 text-gray-600"}`}>{tier}</span>;
}

function ContactRow({ member, indent = false, teamColor }: { member: Member; indent?: boolean; teamColor: string }) {
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 group ${indent ? "border-l-2 border-gray-200 ml-6 pl-3" : ""}`}>
      <Avatar member={member} size="sm" teamColor={teamColor} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{member.name}</span>
          <TierBadge tier={member.tier} />
          {member.isPrimary && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
        </div>
        <div className="text-xs text-gray-500 truncate">{member.title}</div>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400 truncate max-w-[130px]">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{member.location.split(",")[0]}</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
        <button className="p-1 rounded hover:bg-gray-200"><Mail className="w-3 h-3 text-gray-500" /></button>
        <button className="p-1 rounded hover:bg-gray-200 text-[10px] text-gray-500 whitespace-nowrap">Move team</button>
      </div>
    </div>
  );
}

function BuildingRow({ building }: { building: typeof teams[0]["buildings"][0] }) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 group">
      <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-3.5 h-3.5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{building.name}</div>
        <div className="text-xs text-gray-500 truncate">{building.address}</div>
      </div>
      <div className="text-xs text-gray-400 hidden sm:block">{building.sqft} sqft</div>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <User className="w-3 h-3" /><span className="truncate max-w-[100px]">{building.primaryContact}</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
        <button className="p-1 rounded hover:bg-gray-200 text-[10px] text-gray-500">Reassign</button>
        <button className="p-1 rounded hover:bg-gray-200"><MoreHorizontal className="w-3 h-3 text-gray-500" /></button>
      </div>
    </div>
  );
}

function TeamCard({ team, expanded, onToggle }: { team: typeof teams[0]; expanded: boolean; onToggle: () => void }) {
  const [section, setSection] = useState<"people" | "buildings">("people");
  const topContact = team.members.find(m => m.reportsTo === null);
  const reports = team.members.filter(m => m.reportsTo === topContact?.id);
  const deepReports = team.members.filter(m => reports.map(r => r.id).includes(m.reportsTo!));

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none" onClick={onToggle} style={{ borderLeft: `4px solid ${team.color}` }}>
        <div className="flex -space-x-2">
          {team.members.slice(0, 3).map(m => <Avatar key={m.id} member={m} size="sm" teamColor={team.color} />)}
          {team.members.length > 3 && <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-600 font-medium ring-2 ring-white">+{team.members.length - 3}</div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{team.name}</span>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{team.members.length} people</span>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{team.buildings.length} buildings</span>
          </div>
          {topContact && <div className="text-xs text-gray-500 mt-0.5">Lead: {topContact.name} · {topContact.title}</div>}
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg hover:bg-gray-200" onClick={e => e.stopPropagation()}><StickyNote className="w-3.5 h-3.5 text-gray-400" /></button>
          <button className="p-1.5 rounded-lg hover:bg-gray-200" onClick={e => e.stopPropagation()}><MoreHorizontal className="w-4 h-4 text-gray-400" /></button>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100">
          {team.notes && (
            <div className="mx-4 my-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
              <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">{team.notes}</p>
            </div>
          )}
          <div className="flex border-b border-gray-100 px-4">
            {(["people","buildings"] as const).map(s => (
              <button key={s} onClick={() => setSection(s)}
                className={`text-xs font-medium pb-2 pt-1 mr-4 border-b-2 transition-colors capitalize ${section === s ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"}`}>
                <span className="flex items-center gap-1">
                  {s === "people" ? <Users className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                  {s === "people" ? `People (${team.members.length})` : `Buildings (${team.buildings.length})`}
                </span>
              </button>
            ))}
          </div>
          <div className="px-2 py-2">
            {section === "people" ? (
              <div>
                {topContact && <ContactRow member={topContact} teamColor={team.color} />}
                {reports.map(r => (
                  <div key={r.id}>
                    <ContactRow member={r} indent teamColor={team.color} />
                    {deepReports.filter(d => d.reportsTo === r.id).map(d => (
                      <div key={d.id} className="ml-6 border-l-2 border-gray-200 pl-3">
                        <ContactRow member={d} teamColor={team.color} />
                      </div>
                    ))}
                  </div>
                ))}
                <div className="mt-2 px-3"><button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add person to team</button></div>
              </div>
            ) : (
              <div>
                {team.buildings.map(b => <BuildingRow key={b.id} building={b} />)}
                <div className="mt-2 px-3"><button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"><Plus className="w-3 h-3" /> Add building to team</button></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OrgNode({ member, teamColor }: { member: Member; teamColor: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col items-center px-2 py-2 rounded-xl border border-gray-200 bg-white min-w-[130px] shadow-sm hover:shadow-md transition-shadow">
      {member.photo && !failed
        ? <img src={member.photo} alt={member.name} onError={() => setFailed(true)} className="w-12 h-12 rounded-full object-cover mb-2" style={{ outline: `2px solid ${teamColor}`, outlineOffset: "2px" }} />
        : <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold mb-2" style={{ backgroundColor: teamColor }}>
            {member.name.split(" ").map((n: string) => n[0]).join("")}
          </div>
      }
      <div className="text-[11px] font-semibold text-gray-900 text-center leading-tight">{member.name}</div>
      <div className="text-[10px] text-gray-500 text-center">{member.title}</div>
      <div className="mt-1 flex items-center gap-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: teamColor }} />
        <span className="text-[9px]" style={{ color: teamColor }}>
          {teams.find(t => t.members.some(m => m.id === member.id))?.name?.split(" ")[0]}
        </span>
      </div>
      {member.isPrimary && <Star className="w-3 h-3 fill-amber-400 text-amber-400 mt-0.5" />}
    </div>
  );
}

export function TeamsLargeCorp() {
  const [view, setView] = useState<ViewMode>("teams");
  const [expanded, setExpanded] = useState<number[]>([1, 2]);
  const toggle = (id: number) => setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="min-h-screen bg-gray-50 font-['Space_Grotesk',sans-serif]">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">C&W</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 font-['Archivo_Black',sans-serif]">Cushman &amp; Wakefield</h1>
            <p className="text-xs text-gray-500">Commercial Real Estate · Tier A · Active Customer</p>
          </div>
          <div className="ml-auto"><span className="text-xs text-gray-400">9 contacts · 9 buildings · 3 teams</span></div>
        </div>
        <div className="flex gap-0 mt-3 border-b border-gray-200 -mb-4">
          {["Overview","Organization","Revenue","History","Files","Intelligence"].map(t => (
            <div key={t} className={`px-3 py-2 text-xs font-medium border-b-2 mr-1 ${t === "Organization" ? "border-red-600" : "border-transparent text-gray-400"}`} style={t === "Organization" ? { borderColor: RED, color: RED } : {}}>{t}</div>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(["teams","orgchart"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                <span className="flex items-center gap-1.5">
                  {v === "teams" ? <><Users className="w-3 h-3" /> Teams</> : <><Network className="w-3 h-3" /> Org Chart</>}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 flex items-center gap-1.5"><Plus className="w-3 h-3" /> Add Person</button>
            <button className="text-xs px-3 py-1.5 rounded-lg text-white font-medium flex items-center gap-1.5" style={{ backgroundColor: RED }}><Plus className="w-3 h-3" /> Add Team</button>
          </div>
        </div>

        {view === "teams" ? (
          <div className="space-y-3">
            {teams.map(team => <TeamCard key={team.id} team={team} expanded={expanded.includes(team.id)} onToggle={() => toggle(team.id)} />)}
            <div className="bg-white border border-dashed border-gray-300 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">2 contacts not assigned to a team</span>
                <button className="ml-auto text-xs text-blue-500 hover:underline">View &amp; assign →</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-auto">
            <div className="flex flex-col items-center gap-2 min-w-[700px]">
              {/* Lisa — top */}
              <OrgNode member={teams[0].members[0]} teamColor={RED} />
              <div className="w-px h-5 bg-gray-300" />
              {/* Level 2: Marcus, James, Sandra */}
              <div className="flex gap-8 items-start">
                {[
                  { member: teams[1].members[0], color: "#2563EB", reports: [teams[1].members[1], teams[1].members[2]] },
                  { member: teams[0].members[1], color: RED, reports: [teams[0].members[2], teams[0].members[3]] },
                  { member: teams[2].members[0], color: "#059669", reports: [teams[2].members[1]] },
                ].map(({ member, color, reports }) => (
                  <div key={member.id} className="flex flex-col items-center gap-2">
                    <OrgNode member={member} teamColor={color} />
                    <div className="w-px h-4 bg-gray-300" />
                    <div className="flex gap-3">
                      {reports.map(r => <OrgNode key={r.id} member={r} teamColor={color} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-gray-500 justify-center flex-wrap">
              {teams.map(t => (
                <span key={t.id} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name} ({t.members.length})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
