import { useState } from "react";

const STAGES = [
  { key: "outreach",       label: "Outreach",       color: "bg-slate-700",   dot: "bg-slate-400",   border: "border-slate-300",  bg: "bg-slate-50",        count: 3,  value: "$284k" },
  { key: "in_conversation",label: "In Conversation", color: "bg-blue-700",    dot: "bg-blue-400",    border: "border-blue-200",   bg: "bg-blue-50/50",      count: 5,  value: "$1.1M" },
  { key: "proposal_sent",  label: "Proposal Sent",  color: "bg-violet-700",  dot: "bg-violet-400",  border: "border-violet-200", bg: "bg-violet-50/50",    count: 4,  value: "$870k" },
  { key: "negotiating",    label: "Negotiating",    color: "bg-amber-600",   dot: "bg-amber-400",   border: "border-amber-200",  bg: "bg-amber-50/50",     count: 2,  value: "$340k" },
  { key: "won",            label: "Won",             color: "bg-emerald-700", dot: "bg-emerald-400", border: "border-emerald-200",bg: "bg-emerald-50/50",   count: 6,  value: "$2.3M" },
  { key: "lost",           label: "Lost",            color: "bg-red-700",     dot: "bg-red-400",     border: "border-red-200",    bg: "bg-red-50/30",       count: 2,  value: "$195k" },
];

type Card = { id: number; title: string; client: string; value: string; rep: string; tag: string; tagColor: string; date: string; health?: string };

const CARDS: Record<string, Card[]> = {
  outreach: [
    { id: 1,  title: "HVAC Overhaul – Meridian Tower",      client: "Meridian Properties", value: "$120k", rep: "JM", tag: "HVAC",        tagColor: "bg-sky-100 text-sky-700",     date: "Oct 30", health: "Healthy"  },
    { id: 2,  title: "Electrical Retrofit – Harbor Lofts",   client: "Harbor Group",        value: "$95k",  rep: "RK", tag: "Electrical",   tagColor: "bg-yellow-100 text-yellow-700", date: "Nov 5"                   },
    { id: 3,  title: "Facility Solutions – Crestwood",       client: "Crestwood Corp",      value: "$69k",  rep: "JM", tag: "Facility",     tagColor: "bg-teal-100 text-teal-700",   date: "Nov 12"                   },
  ],
  in_conversation: [
    { id: 4,  title: "HVAC Replacement – Axis Group HQ",    client: "Axis Group",          value: "$195k", rep: "JM", tag: "HVAC",         tagColor: "bg-sky-100 text-sky-700",     date: "Oct 30", health: "At Risk"  },
    { id: 5,  title: "Plumbing Overhaul – Skyline Tower",   client: "Skyline Capital",     value: "$310k", rep: "RK", tag: "Plumbing",     tagColor: "bg-blue-100 text-blue-700",   date: "Nov 10", health: "Healthy"  },
    { id: 6,  title: "Janitorial Contract – Westfield Mall", client: "Westfield Retail",   value: "$88k",  rep: "AL", tag: "Janitorial",   tagColor: "bg-purple-100 text-purple-700", date: "Nov 15"                  },
    { id: 7,  title: "Fire Safety Audit – Metro Center",    client: "Metro Ventures",      value: "$230k", rep: "JM", tag: "Fire Safety",  tagColor: "bg-red-100 text-red-700",     date: "Nov 20", health: "Healthy"  },
    { id: 8,  title: "Building Engineering – Nexus Bldg",   client: "Nexus Partners",      value: "$275k", rep: "RK", tag: "Engineering",  tagColor: "bg-indigo-100 text-indigo-700", date: "Dec 1"                   },
  ],
  proposal_sent: [
    { id: 9,  title: "HVAC System – Lakeview Office Park",  client: "Lakeview RE",         value: "$320k", rep: "JM", tag: "HVAC",         tagColor: "bg-sky-100 text-sky-700",     date: "Oct 22", health: "At Risk"  },
    { id: 10, title: "Special Projects – Innovation Hub",   client: "Innovation Co.",      value: "$180k", rep: "AL", tag: "Special",      tagColor: "bg-orange-100 text-orange-700", date: "Oct 28", health: "Healthy" },
    { id: 11, title: "Facility Mgmt – Harbor South",        client: "Harbor Group",        value: "$210k", rep: "RK", tag: "Facility",     tagColor: "bg-teal-100 text-teal-700",   date: "Nov 3"                    },
    { id: 12, title: "Electrical Upgrade – Summit Tower",   client: "Summit Dev",          value: "$160k", rep: "JM", tag: "Electrical",   tagColor: "bg-yellow-100 text-yellow-700", date: "Nov 8"                   },
  ],
  negotiating: [
    { id: 13, title: "HVAC Maintenance – Pacific Plaza",    client: "Pacific Trust",       value: "$145k", rep: "RK", tag: "HVAC",         tagColor: "bg-sky-100 text-sky-700",     date: "Oct 18", health: "At Risk"  },
    { id: 14, title: "Facility Services – Greenfield Corp", client: "Greenfield Corp",     value: "$195k", rep: "JM", tag: "Facility",     tagColor: "bg-teal-100 text-teal-700",   date: "Oct 25", health: "Healthy"  },
  ],
  won: [
    { id: 15, title: "Full HVAC – Redwood Campus",          client: "Redwood Tech",        value: "$480k", rep: "JM", tag: "HVAC",         tagColor: "bg-sky-100 text-sky-700",     date: "Oct 1"  },
    { id: 16, title: "Engineering Review – Highpoint",      client: "Highpoint RE",        value: "$210k", rep: "RK", tag: "Engineering",  tagColor: "bg-indigo-100 text-indigo-700", date: "Oct 5" },
    { id: 17, title: "Fire Safety – Lakeview Complex",      client: "Lakeview RE",         value: "$390k", rep: "AL", tag: "Fire Safety",  tagColor: "bg-red-100 text-red-700",     date: "Oct 8"  },
    { id: 18, title: "Facility Solutions – Commerce Sq.",   client: "Commerce Group",      value: "$280k", rep: "JM", tag: "Facility",     tagColor: "bg-teal-100 text-teal-700",   date: "Oct 12" },
    { id: 19, title: "Special Projects – Apex Campus",      client: "Apex Corp",           value: "$510k", rep: "RK", tag: "Special",      tagColor: "bg-orange-100 text-orange-700", date: "Oct 15"},
    { id: 20, title: "Plumbing Reno – Fairview Office",     client: "Fairview RE",         value: "$430k", rep: "JM", tag: "Plumbing",     tagColor: "bg-blue-100 text-blue-700",   date: "Oct 19" },
  ],
  lost: [
    { id: 21, title: "HVAC – Central Towers",               client: "Central Corp",        value: "$120k", rep: "AL", tag: "HVAC",         tagColor: "bg-sky-100 text-sky-700",     date: "Sep 28" },
    { id: 22, title: "Facility Audit – Westgate Park",      client: "Westgate RE",         value: "$75k",  rep: "RK", tag: "Facility",     tagColor: "bg-teal-100 text-teal-700",   date: "Oct 2"  },
  ],
};

const HEALTH: Record<string, string> = {
  Healthy:  "bg-emerald-100 text-emerald-700",
  "At Risk": "bg-amber-100 text-amber-700",
  Dormant:  "bg-red-100 text-red-700",
};

function KanbanCard({ card }: { card: Card }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-3 cursor-pointer group">
      <p className="text-xs font-semibold text-slate-800 leading-snug mb-2 group-hover:text-violet-700 transition-colors">{card.title}</p>
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[8px] shrink-0">
          {card.client.slice(0, 2).toUpperCase()}
        </div>
        <span className="text-[11px] text-slate-500 truncate">{card.client}</span>
      </div>
      <div className="flex items-center gap-1 flex-wrap mb-2.5">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${card.tagColor}`}>{card.tag}</span>
        {card.health && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${HEALTH[card.health]}`}>{card.health}</span>}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">{card.value}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400">{card.date}</span>
          <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-[9px]">{card.rep}</div>
        </div>
      </div>
    </div>
  );
}

export default function KanbanRevamp() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans overflow-hidden">

      {/* Page header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">Pipeline</span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500">22 deals · $5.1M</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-md bg-violet-600 text-white font-medium cursor-pointer">+ New Deal</span>
          <span className="text-xs px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 font-medium cursor-pointer">☰ List</span>
        </div>
      </div>

      {/* Board — horizontal scroll container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 h-full px-3 py-3" style={{ minWidth: "max-content" }}>

          {STAGES.map(stage => {
            const cards = CARDS[stage.key] || [];

            /* ── Collapsed: full-height colored strip with rotated label ── */
            if (collapsed[stage.key]) {
              return (
                <button
                  key={stage.key}
                  onClick={() => setCollapsed(c => ({ ...c, [stage.key]: false }))}
                  title={`Expand ${stage.label}`}
                  className={`flex flex-col items-center justify-between rounded-xl ${stage.color} ${stage.border} border shadow-sm hover:opacity-90 transition-opacity cursor-pointer py-3 shrink-0`}
                  style={{ width: 36 }}
                >
                  {/* deal count at top */}
                  <span className="text-[10px] font-bold text-white/80">{stage.count}</span>

                  {/* rotated stage name fills the space */}
                  <span
                    className="flex-1 flex items-center justify-center text-[11px] font-semibold text-white"
                    style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", letterSpacing: "0.04em" }}
                  >
                    {stage.label}
                  </span>

                  {/* expand chevron at bottom */}
                  <svg className="w-3 h-3 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            }

            /* ── Expanded column ── */
            return (
              <div
                key={stage.key}
                className={`flex flex-col rounded-xl border ${stage.border} shadow-sm shrink-0`}
                style={{ width: 224, minHeight: 0 }}
              >
                {/* Sticky column header */}
                <div className={`${stage.color} text-white rounded-t-xl px-3 py-2.5 shrink-0 flex items-center justify-between`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${stage.dot} ring-1 ring-white/30 shrink-0`} />
                    <span className="text-xs font-bold truncate">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs font-semibold opacity-75">{stage.count}</span>
                    <button
                      onClick={() => setCollapsed(c => ({ ...c, [stage.key]: true }))}
                      className="opacity-60 hover:opacity-100 transition-opacity"
                      title="Collapse"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Value sub-header */}
                <div className={`${stage.bg} px-3 py-1.5 border-b ${stage.border} shrink-0`}>
                  <span className="text-[10px] font-semibold text-slate-500">{stage.value} pipeline</span>
                </div>

                {/* Cards — this column scrolls independently */}
                <div className={`flex-1 overflow-y-auto ${stage.bg} rounded-b-xl`} style={{ minHeight: 0 }}>
                  <div className="flex flex-col gap-2 p-2">
                    {cards.map(card => <KanbanCard key={card.id} card={card} />)}
                    <button className="w-full py-2 rounded-lg border-2 border-dashed border-slate-200 text-[11px] text-slate-400 hover:border-violet-300 hover:text-violet-500 transition-colors bg-white/50">
                      + Add deal
                    </button>
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
