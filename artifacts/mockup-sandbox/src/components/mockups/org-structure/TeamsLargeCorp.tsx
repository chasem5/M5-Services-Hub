import { useState } from "react";
import {
  Building2, Users, ChevronDown, ChevronRight, MapPin, Phone, Mail,
  Plus, MoreHorizontal, Edit2, StickyNote, ArrowRight, User, Network,
  MoveRight, Star, AlertCircle, Briefcase
} from "lucide-react";

const RED = "#BE1916";

const teams = [
  {
    id: 1,
    name: "Bay Area Portfolio",
    color: "#BE1916",
    notes: "Always request site walk before quoting. Lisa prefers email over calls. Budget cycle resets in Q1.",
    members: [
      {
        id: 10, name: "Lisa Nakamura", title: "Regional VP – West", isPrimary: true, reportsTo: null,
        location: "Embarcadero Center Tower 3", email: "lnakamura@cushwake.com", phone: "(415) 882-4401",
        tier: "A"
      },
      {
        id: 11, name: "James Cho", title: "Sr. Property Manager", isPrimary: false, reportsTo: 10,
        location: "101 California St", email: "jcho@cushwake.com", phone: "(415) 882-4412",
        tier: "A"
      },
      {
        id: 12, name: "Rachel Torres", title: "Property Manager", isPrimary: false, reportsTo: 11,
        location: "225 Bush St", email: "rtorres@cushwake.com", phone: "(415) 882-4433",
        tier: "B"
      },
      {
        id: 13, name: "Derek Singh", title: "Property Manager", isPrimary: false, reportsTo: 11,
        location: "Embarcadero Center Tower 1", email: "dsingh@cushwake.com", phone: "(415) 882-4455",
        tier: "B"
      },
    ],
    buildings: [
      { id: 101, name: "Embarcadero Center Tower 1", address: "1 Embarcadero Ctr, San Francisco, CA", sqft: "620,000", primaryContact: "Derek Singh", type: "Class A Office" },
      { id: 102, name: "Embarcadero Center Tower 3", address: "3 Embarcadero Ctr, San Francisco, CA", sqft: "580,000", primaryContact: "Lisa Nakamura", type: "Class A Office" },
      { id: 103, name: "101 California Street", address: "101 California St, San Francisco, CA", sqft: "430,000", primaryContact: "James Cho", type: "Class A Office" },
      { id: 104, name: "225 Bush Street", address: "225 Bush St, San Francisco, CA", sqft: "295,000", primaryContact: "Rachel Torres", type: "Class A Office" },
    ]
  },
  {
    id: 2,
    name: "East Bay / Walnut Creek",
    color: "#2563EB",
    notes: "Monthly lunch with this team works well — they're all within 10 min of each other. Budget authority sits with Marcus.",
    members: [
      {
        id: 20, name: "Marcus Webb", title: "Area Director", isPrimary: true, reportsTo: null,
        location: "1333 N California Blvd", email: "mwebb@cushwake.com", phone: "(925) 274-0100",
        tier: "A"
      },
      {
        id: 21, name: "Priya Mehta", title: "Property Manager", isPrimary: false, reportsTo: 20,
        location: "2033 N Main St", email: "pmehta@cushwake.com", phone: "(925) 274-0122",
        tier: "B"
      },
      {
        id: 22, name: "Tom Garza", title: "Facilities Coordinator", isPrimary: false, reportsTo: 21,
        location: "1333 N California Blvd", email: "tgarza@cushwake.com", phone: "(925) 274-0155",
        tier: "C"
      },
    ],
    buildings: [
      { id: 201, name: "1333 N California Blvd", address: "1333 N California Blvd, Walnut Creek, CA", sqft: "180,000", primaryContact: "Marcus Webb", type: "Class B Office" },
      { id: 202, name: "2033 N Main Street", address: "2033 N Main St, Walnut Creek, CA", sqft: "95,000", primaryContact: "Priya Mehta", type: "Class B Office" },
    ]
  },
  {
    id: 3,
    name: "South Bay",
    color: "#059669",
    notes: "New team lead as of Jan 2025 — building relationship with Sandra now. Previous contact (Kevin) left company.",
    members: [
      {
        id: 30, name: "Sandra Kim", title: "Portfolio Manager", isPrimary: true, reportsTo: null,
        location: "2 N Market St, San Jose", email: "skim@cushwake.com", phone: "(408) 510-0200",
        tier: "B"
      },
      {
        id: 31, name: "Bryan Nguyen", title: "Property Manager", isPrimary: false, reportsTo: 30,
        location: "10 Almaden Blvd", email: "bnguyen@cushwake.com", phone: "(408) 510-0231",
        tier: "B"
      },
    ],
    buildings: [
      { id: 301, name: "2 N Market Street", address: "2 N Market St, San Jose, CA", sqft: "210,000", primaryContact: "Sandra Kim", type: "Class A Office" },
      { id: 302, name: "10 Almaden Blvd", address: "10 Almaden Blvd, San Jose, CA", sqft: "145,000", primaryContact: "Bryan Nguyen", type: "Class B Office" },
      { id: 303, name: "3055 Olin Ave", address: "3055 Olin Ave, San Jose, CA", sqft: "88,000", primaryContact: "Bryan Nguyen", type: "Industrial" },
    ]
  }
];

type ViewMode = "teams" | "orgchart";

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-700",
    B: "bg-blue-100 text-blue-700",
    C: "bg-gray-100 text-gray-600"
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[tier] || "bg-gray-100 text-gray-600"}`}>{tier}</span>
  );
}

function ContactRow({ member, indent = false, teamColor }: { member: typeof teams[0]["members"][0]; indent?: boolean; teamColor: string }) {
  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 group ${indent ? "ml-7 border-l-2 border-gray-200 pl-4 ml-4" : ""}`}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: teamColor }}>
        {member.name.split(" ").map(n => n[0]).join("")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{member.name}</span>
          <TierBadge tier={member.tier} />
          {member.isPrimary && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
        </div>
        <div className="text-xs text-gray-500 truncate">{member.title}</div>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400 truncate max-w-[140px]">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{member.location.split(",")[0]}</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
        <button className="p-1 rounded hover:bg-gray-200"><Mail className="w-3 h-3 text-gray-500" /></button>
        <button className="p-1 rounded hover:bg-gray-200"><MoveRight className="w-3 h-3 text-gray-500" /></button>
      </div>
    </div>
  );
}

function BuildingRow({ building, teamColor }: { building: typeof teams[0]["buildings"][0]; teamColor: string }) {
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
        <User className="w-3 h-3" />
        <span className="truncate max-w-[100px]">{building.primaryContact}</span>
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
        <button className="p-1 rounded hover:bg-gray-200 text-xs text-gray-500">Reassign</button>
        <button className="p-1 rounded hover:bg-gray-200"><MoreHorizontal className="w-3 h-3 text-gray-500" /></button>
      </div>
    </div>
  );
}

function TeamCard({ team, expanded, onToggle }: { team: typeof teams[0]; expanded: boolean; onToggle: () => void }) {
  const [section, setSection] = useState<"people" | "buildings">("people");
  const topContact = team.members.find(m => m.reportsTo === null);
  const reports = team.members.filter(m => m.reportsTo !== null && (m.reportsTo === topContact?.id));
  const deepReports = team.members.filter(m => reports.map(r => r.id).includes(m.reportsTo!));

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
        onClick={onToggle}
        style={{ borderLeft: `4px solid ${team.color}` }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{team.name}</span>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{team.members.length} people</span>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{team.buildings.length} buildings</span>
          </div>
          {topContact && (
            <div className="text-xs text-gray-500 mt-0.5">Lead: {topContact.name} · {topContact.title}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg hover:bg-gray-200" onClick={e => e.stopPropagation()}>
            <StickyNote className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-gray-200" onClick={e => e.stopPropagation()}>
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
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
            <button
              onClick={() => setSection("people")}
              className={`text-xs font-medium pb-2 pt-1 mr-4 border-b-2 transition-colors ${section === "people" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> People ({team.members.length})</span>
            </button>
            <button
              onClick={() => setSection("buildings")}
              className={`text-xs font-medium pb-2 pt-1 border-b-2 transition-colors ${section === "buildings" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Buildings ({team.buildings.length})</span>
            </button>
          </div>

          <div className="px-2 py-2">
            {section === "people" ? (
              <div>
                {topContact && <ContactRow member={topContact} teamColor={team.color} />}
                {reports.map(r => (
                  <div key={r.id}>
                    <ContactRow member={r} indent teamColor={team.color} />
                    {deepReports.filter(d => d.reportsTo === r.id).map(d => (
                      <div key={d.id} className="ml-8 border-l-2 border-gray-200 pl-4">
                        <ContactRow member={d} teamColor={team.color} />
                      </div>
                    ))}
                  </div>
                ))}
                <div className="mt-2 px-3">
                  <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add person to team
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {team.buildings.map(b => <BuildingRow key={b.id} building={b} teamColor={team.color} />)}
                <div className="mt-2 px-3">
                  <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add building to team
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TeamsLargeCorp() {
  const [view, setView] = useState<ViewMode>("teams");
  const [expanded, setExpanded] = useState<number[]>([1, 2]);

  const toggle = (id: number) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-['Space_Grotesk',sans-serif]">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">C&W</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 font-['Archivo_Black',sans-serif]">Cushman &amp; Wakefield</h1>
            <p className="text-xs text-gray-500">Commercial Real Estate · Tier A · Active Customer</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">9 contacts · 9 buildings across 3 teams</span>
          </div>
        </div>
        {/* Tab bar (simulated, showing Organization tab active) */}
        <div className="flex gap-0 mt-3 border-b border-gray-200 -mb-4">
          {["Overview","Deals","BuildOps","History","Organization","Portfolio Map","Files"].map(t => (
            <div key={t}
              className={`px-3 py-2 text-xs font-medium border-b-2 mr-1 ${t === "Organization" ? "border-red-600 text-red-600" : "border-transparent text-gray-400"}`}
              style={t === "Organization" ? { borderColor: RED, color: RED } : {}}>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Organization tab content */}
      <div className="px-6 py-5">
        {/* View switcher + actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView("teams")}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === "teams" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> Teams</span>
            </button>
            <button
              onClick={() => setView("orgchart")}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === "orgchart" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <span className="flex items-center gap-1.5"><Network className="w-3 h-3" /> Org Chart</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-1.5">
              <Plus className="w-3 h-3" /> Add Person
            </button>
            <button className="text-xs px-3 py-1.5 rounded-lg text-white font-medium flex items-center gap-1.5" style={{ backgroundColor: RED }}>
              <Plus className="w-3 h-3" /> Add Team
            </button>
          </div>
        </div>

        {view === "teams" ? (
          <div className="space-y-3">
            {teams.map(team => (
              <TeamCard
                key={team.id}
                team={team}
                expanded={expanded.includes(team.id)}
                onToggle={() => toggle(team.id)}
              />
            ))}

            {/* Unassigned section */}
            <div className="bg-white border border-dashed border-gray-300 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">2 contacts not assigned to a team</span>
                <button className="ml-auto text-xs text-blue-500 hover:underline">View & assign →</button>
              </div>
            </div>
          </div>
        ) : (
          /* Simplified org chart view */
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-col items-center gap-3">
              {/* Top level */}
              <div className="px-4 py-2.5 rounded-xl border-2 text-center min-w-[180px]" style={{ borderColor: RED }}>
                <div className="text-xs font-bold" style={{ color: RED }}>Lisa Nakamura</div>
                <div className="text-xs text-gray-500">Regional VP – West</div>
                <div className="text-[10px] text-gray-400 mt-0.5 flex items-center justify-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: RED }} />Bay Area</div>
              </div>
              {/* Connector */}
              <div className="w-px h-5 bg-gray-300" />
              {/* Second level */}
              <div className="flex gap-6">
                {[
                  { name: "Marcus Webb", title: "Area Director", color: "#2563EB", team: "East Bay" },
                  { name: "James Cho", title: "Sr. Property Mgr", color: RED, team: "Bay Area" },
                  { name: "Sandra Kim", title: "Portfolio Mgr", color: "#059669", team: "South Bay" },
                ].map(p => (
                  <div key={p.name} className="flex flex-col items-center gap-2">
                    <div className="px-3 py-2 rounded-xl border text-center min-w-[150px] border-gray-200">
                      <div className="text-xs font-semibold text-gray-800">{p.name}</div>
                      <div className="text-[10px] text-gray-500">{p.title}</div>
                      <div className="text-[10px] mt-0.5 flex items-center justify-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span style={{ color: p.color }}>{p.team}</span>
                      </div>
                    </div>
                    <div className="w-px h-4 bg-gray-300" />
                    {/* Third level stubs */}
                    <div className="flex gap-3">
                      {p.name === "James Cho" ? (
                        <>
                          <div className="px-2 py-1.5 rounded-lg border border-gray-200 text-center min-w-[110px]">
                            <div className="text-[10px] font-medium text-gray-700">Rachel Torres</div>
                            <div className="text-[10px] text-gray-400">Property Mgr</div>
                          </div>
                          <div className="px-2 py-1.5 rounded-lg border border-gray-200 text-center min-w-[110px]">
                            <div className="text-[10px] font-medium text-gray-700">Derek Singh</div>
                            <div className="text-[10px] text-gray-400">Property Mgr</div>
                          </div>
                        </>
                      ) : p.name === "Marcus Webb" ? (
                        <div className="px-2 py-1.5 rounded-lg border border-gray-200 text-center min-w-[110px]">
                          <div className="text-[10px] font-medium text-gray-700">Priya Mehta</div>
                          <div className="text-[10px] text-gray-400">Property Mgr</div>
                        </div>
                      ) : (
                        <div className="px-2 py-1.5 rounded-lg border border-gray-200 text-center min-w-[110px]">
                          <div className="text-[10px] font-medium text-gray-700">Bryan Nguyen</div>
                          <div className="text-[10px] text-gray-400">Property Mgr</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4 text-xs text-gray-500 justify-center">
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: RED }} /> Bay Area ({teams[0].members.length})</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-600" /> East Bay ({teams[1].members.length})</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-600" /> South Bay ({teams[2].members.length})</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
