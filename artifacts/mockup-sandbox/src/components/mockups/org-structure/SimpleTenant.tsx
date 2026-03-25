import { useState } from "react";
import {
  Building2, MapPin, Phone, Mail, Plus, MoreHorizontal,
  StickyNote, User, Users, Network, Edit2, Star, ChevronDown
} from "lucide-react";

const RED = "#BE1916";

const company = {
  name: "Vertical Ventures",
  industry: "Technology / SaaS",
  tier: "A",
  status: "Active Customer",
  notes: "Great relationship — Chris signs off on all quotes himself and turns them around fast. Budget owner is in-house. No FM firm.",
  contacts: [
    {
      id: 1, name: "Chris Okafor", title: "Director of Facilities", isPrimary: true,
      reportsTo: null, tier: "A", phone: "(650) 881-2200", email: "cokafor@verticalventures.com",
      locationBuilding: "100 First Street, Suite 2200", notes: "Very responsive. Prefers quick Slack-style texts. Usually responds within an hour."
    },
    {
      id: 2, name: "Maya Patel", title: "Office Manager", isPrimary: false,
      reportsTo: 1, tier: "B", phone: "(650) 881-2201", email: "mpatel@verticalventures.com",
      locationBuilding: "100 First Street, Suite 2200", notes: ""
    },
  ],
  buildings: [
    {
      id: 1, name: "100 First Street, Suite 2200", address: "100 First St, San Francisco, CA 94105",
      sqft: "42,000", type: "Leased Office", notes: "2nd floor loading dock closes at 4pm. Parking is tight — use meter on Howard St. Building manager is Dave (415-555-0123).",
      primaryContact: "Chris Okafor"
    }
  ]
};

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-700",
    B: "bg-blue-100 text-blue-700",
  };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[tier] || "bg-gray-100 text-gray-500"}`}>{tier}</span>;
}

function ContactCard({ contact, allContacts }: { contact: typeof company.contacts[0]; allContacts: typeof company.contacts }) {
  const [expanded, setExpanded] = useState(contact.isPrimary);
  const reportsToName = allContacts.find(c => c.id === contact.reportsTo)?.name;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
        style={{ borderLeft: `4px solid ${contact.isPrimary ? RED : "#94a3b8"}` }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: contact.isPrimary ? RED : "#64748b" }}>
          {contact.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{contact.name}</span>
            <TierBadge tier={contact.tier} />
            {contact.isPrimary && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
          </div>
          <div className="text-xs text-gray-500">
            {contact.title}
            {reportsToName && <span className="text-gray-400"> · Reports to {reportsToName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 rounded-lg hover:bg-gray-200" onClick={e => e.stopPropagation()}>
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "" : "-rotate-90"}`} />
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span>{contact.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 col-span-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">Sits at: {contact.locationBuilding}</span>
            </div>
          </div>
          {contact.notes && (
            <div className="flex gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
              <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">{contact.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BuildingCard({ building }: { building: typeof company.buildings[0] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderLeft: `4px solid #6366f1` }}>
        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4.5 h-4.5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm truncate">{building.name}</div>
          <div className="text-xs text-gray-500 truncate">{building.address}</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{building.sqft} sqft</span>
          <span className="px-1.5 py-0.5 bg-gray-100 rounded-full">{building.type}</span>
        </div>
        <button className="p-1.5 rounded-lg hover:bg-gray-100">
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      <div className="border-t border-gray-100 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <User className="w-3.5 h-3.5 text-gray-400" />
          <span>Primary contact: <span className="font-medium text-gray-800">{building.primaryContact}</span></span>
        </div>
        {building.notes && (
          <div className="flex gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{building.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SimpleTenant() {
  const [view, setView] = useState<"people" | "buildings">("people");

  return (
    <div className="min-h-screen bg-gray-50 font-['Space_Grotesk',sans-serif]">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: RED }}>VV</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 font-['Archivo_Black',sans-serif]">Vertical Ventures</h1>
            <p className="text-xs text-gray-500">{company.industry} · Tier {company.tier} · {company.status}</p>
          </div>
          <div className="ml-auto">
            <span className="text-xs text-gray-400">2 contacts · 1 building · No teams</span>
          </div>
        </div>

        {/* Company notes */}
        <div className="mt-3 flex gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
          <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">{company.notes}</p>
          <button className="ml-auto flex-shrink-0"><Edit2 className="w-3 h-3 text-amber-500" /></button>
        </div>

        {/* Tab bar */}
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

      <div className="px-6 py-5">
        {/* No-teams callout */}
        <div className="mb-4 flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-blue-800 font-medium">No teams set up</p>
            <p className="text-xs text-blue-600">This company has a small footprint — teams aren't needed. Add one if they grow or restructure.</p>
          </div>
          <button className="text-xs px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add Team</button>
        </div>

        {/* View switcher */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView("people")}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === "people" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              <span className="flex items-center gap-1.5"><Users className="w-3 h-3" /> People</span>
            </button>
            <button onClick={() => setView("buildings")}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === "buildings" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              <span className="flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Buildings</span>
            </button>
          </div>

          <div className="flex gap-2">
            {view === "people" ? (
              <button className="text-xs px-3 py-1.5 rounded-lg text-white font-medium flex items-center gap-1.5" style={{ backgroundColor: RED }}>
                <Plus className="w-3 h-3" /> Add Person
              </button>
            ) : (
              <button className="text-xs px-3 py-1.5 rounded-lg text-white font-medium flex items-center gap-1.5" style={{ backgroundColor: RED }}>
                <Plus className="w-3 h-3" /> Add Building
              </button>
            )}
          </div>
        </div>

        {view === "people" ? (
          <div className="space-y-3">
            {company.contacts.map(c => (
              <ContactCard key={c.id} contact={c} allContacts={company.contacts} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {company.buildings.map(b => (
              <BuildingCard key={b.id} building={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
