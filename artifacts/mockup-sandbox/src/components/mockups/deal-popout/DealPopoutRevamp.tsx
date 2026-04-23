import { useState } from "react";

const activities = [
  {
    id: 1,
    type: "note",
    icon: "📝",
    user: "JM",
    userName: "Jake M.",
    color: "bg-violet-100 text-violet-700",
    text: "Spoke with Sarah about the HVAC scope. She wants a revised proposal that breaks out labor vs. equipment separately. She mentioned their board meets Oct 15 — deadline for submission.",
    time: "2h ago",
    date: "Today",
  },
  {
    id: 2,
    type: "email",
    icon: "✉️",
    user: "JM",
    userName: "Jake M.",
    color: "bg-blue-100 text-blue-700",
    text: "Sent revised scope breakdown to sarah@axisgroup.com",
    time: "3h ago",
    date: "Today",
    subject: "Re: HVAC Proposal – Scope Revision",
  },
  {
    id: 3,
    type: "call",
    icon: "📞",
    user: "RK",
    userName: "Rachel K.",
    color: "bg-green-100 text-green-700",
    text: "30-min call. Confirmed budget range is $180k–$220k. Decision maker is CFO, not Sarah. Need to loop in facilities director next step.",
    time: "Yesterday",
    date: "Yesterday",
  },
  {
    id: 4,
    type: "note",
    icon: "📝",
    user: "JM",
    userName: "Jake M.",
    color: "bg-violet-100 text-violet-700",
    text: "Internal note: competitor (AirServ) also bidding. We have the relationship advantage but need to sharpen pricing.",
    time: "2d ago",
    date: "Oct 8",
    internal: true,
  },
  {
    id: 5,
    type: "meeting",
    icon: "🗓",
    user: "JM",
    userName: "Jake M.",
    color: "bg-amber-100 text-amber-700",
    text: "Site walkthrough with facilities team. Building has 3 AHUs on roof — two need full replacement, one just servicing.",
    time: "4d ago",
    date: "Oct 6",
  },
];

const tasks = [
  { id: 1, done: false, priority: "high", label: "Revised proposal to Sarah by Oct 12", due: "Oct 12", overdue: true },
  { id: 2, done: false, priority: "medium", label: "Schedule intro call with CFO", due: "Oct 14" },
  { id: 3, done: true, priority: "low", label: "Send initial scope deck", due: "Oct 5" },
  { id: 4, done: false, priority: "medium", label: "Follow up on equipment lead time", due: "Oct 20" },
];

const TABS = ["Activity", "Tasks", "Files", "Details"] as const;
type Tab = typeof TABS[number];

const LOG_TYPES = [
  { label: "Note", icon: "📝", color: "hover:bg-violet-50 hover:text-violet-700" },
  { label: "Call", icon: "📞", color: "hover:bg-green-50 hover:text-green-700" },
  { label: "Email", icon: "✉️", color: "hover:bg-blue-50 hover:text-blue-700" },
  { label: "Meeting", icon: "🗓", color: "hover:bg-amber-50 hover:text-amber-700" },
  { label: "Site Visit", icon: "🏗", color: "hover:bg-orange-50 hover:text-orange-700" },
];

const STAGES = ["Outreach", "In Conversation", "Proposal Sent", "Negotiating", "Won", "Lost"];
const STAGE_COLORS: Record<string, string> = {
  "Outreach": "bg-slate-100 text-slate-700 border-slate-200",
  "In Conversation": "bg-blue-100 text-blue-700 border-blue-200",
  "Proposal Sent": "bg-violet-100 text-violet-700 border-violet-200",
  "Negotiating": "bg-amber-100 text-amber-700 border-amber-200",
  "Won": "bg-green-100 text-green-700 border-green-200",
  "Lost": "bg-red-100 text-red-700 border-red-200",
};

export default function DealPopoutRevamp() {
  const [tab, setTab] = useState<Tab>("Activity");
  const [logType, setLogType] = useState<string | null>(null);
  const [logText, setLogText] = useState("");
  const [stage, setStage] = useState("In Conversation");
  const [stageOpen, setStageOpen] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [taskList, setTaskList] = useState(tasks);

  return (
    <div className="flex flex-col h-screen bg-white font-sans text-sm overflow-hidden">

      {/* ── HEADER ────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-200 bg-white space-y-2.5">
        {/* Row 1: stage + ID + edit */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Stage badge — clickable */}
            <div className="relative">
              <button
                onClick={() => setStageOpen(o => !o)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer flex items-center gap-1 transition-colors ${STAGE_COLORS[stage]}`}
              >
                {stage}
                <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {stageOpen && (
                <div className="absolute top-8 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                  {STAGES.map(s => (
                    <button key={s} onClick={() => { setStage(s); setStageOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 ${s === stage ? "font-semibold text-violet-700" : "text-slate-700"}`}>
                      {s === stage && <span className="w-1.5 h-1.5 rounded-full bg-violet-600 inline-block" />}
                      {s !== stage && <span className="w-1.5 h-1.5 rounded-full inline-block" />}
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 font-mono">#DEAL-2047</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors">
              Edit Deal
            </button>
            <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-100 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Row 2: Deal title */}
        <div>
          <h2 className="text-base font-bold text-slate-900 leading-snug">HVAC System Replacement – Axis Group HQ</h2>
        </div>

        {/* Row 3: Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-[10px]">AG</div>
            <span className="font-medium">Axis Group</span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <span className="text-xs text-slate-600 font-medium">$195,000</span>
          <div className="w-px h-3 bg-slate-200" />
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-[10px]">JM</div>
            <span>Jake M.</span>
          </div>
          <div className="w-px h-3 bg-slate-200" />
          <span className="text-xs text-slate-400">Close: Oct 30</span>
        </div>

        {/* Row 4: AI health chip */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium">
            <span>⚡</span>
            <span>At Risk</span>
          </div>
          <p className="text-xs text-slate-500 italic">Proposal overdue — competitor active. Suggested: send revised quote by EOD.</p>
        </div>
      </div>

      {/* ── QUICK-LOG ACTION BAR ───────────────────────────────────── */}
      <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mr-1">Log</span>
          {LOG_TYPES.map(lt => (
            <button
              key={lt.label}
              onClick={() => setLogType(logType === lt.label ? null : lt.label)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-all font-medium
                ${logType === lt.label
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : `bg-white text-slate-600 border-slate-200 ${lt.color}`
                }`}
            >
              <span>{lt.icon}</span>
              <span>{lt.label}</span>
            </button>
          ))}
        </div>
        {logType && (
          <div className="mt-2 flex gap-2">
            <textarea
              value={logText}
              onChange={e => setLogText(e.target.value)}
              placeholder={`Add ${logType.toLowerCase()} details…`}
              className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
              rows={2}
            />
            <div className="flex flex-col gap-1">
              <button
                onClick={() => { setLogType(null); setLogText(""); }}
                className="text-xs px-3 py-1.5 rounded-md bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => { setLogType(null); setLogText(""); }}
                className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── TABS ──────────────────────────────────────────────────── */}
      <div className="px-5 border-b border-slate-200 bg-white">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs font-semibold px-3 py-2.5 border-b-2 transition-colors ${
                tab === t
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
              {t === "Tasks" && <span className="ml-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded-full">4</span>}
              {t === "Activity" && <span className="ml-1 text-[10px] bg-violet-100 text-violet-600 px-1.5 rounded-full">5</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB BODY ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* ACTIVITY TAB */}
        {tab === "Activity" && (
          <div className="px-5 py-3 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Recent Activity</p>
            {activities.map((a, i) => (
              <div key={a.id}>
                {(i === 0 || activities[i - 1].date !== a.date) && (
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-4 mb-2">{a.date}</p>
                )}
                <div className={`flex gap-3 p-3 rounded-lg ${a.internal ? "bg-amber-50 border border-amber-100" : "hover:bg-slate-50"} transition-colors`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${a.color}`}>
                    {a.user}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-slate-700">{a.userName}</span>
                      <span className="text-[10px] text-slate-400">{a.icon} {a.type.charAt(0).toUpperCase() + a.type.slice(1)}</span>
                      {a.internal && <span className="text-[10px] px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded-full font-medium">Internal</span>}
                    </div>
                    {a.subject && <p className="text-[10px] font-medium text-slate-500 mb-0.5">"{a.subject}"</p>}
                    <p className="text-xs text-slate-600 leading-relaxed">{a.text}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{a.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TASKS TAB */}
        {tab === "Tasks" && (
          <div className="px-5 py-3">
            {/* AI next step banner */}
            <div className="mb-3 p-3 rounded-lg bg-violet-50 border border-violet-200 flex items-start gap-2">
              <span className="text-sm">✨</span>
              <div>
                <p className="text-xs font-semibold text-violet-800">AI Suggested Next Step</p>
                <p className="text-xs text-violet-700 mt-0.5">Send revised proposal with separated labor/equipment costs to Sarah before Oct 12 board meeting.</p>
                <button className="mt-1.5 text-[10px] font-semibold text-violet-700 hover:text-violet-900 underline underline-offset-2">Create task →</button>
              </div>
            </div>

            {/* Add task input */}
            <div className="flex gap-2 mb-3">
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="Add a task…"
                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <button className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors">Add</button>
            </div>

            {/* Task list */}
            <div className="space-y-1">
              {taskList.map(t => (
                <div key={t.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg ${t.done ? "opacity-50" : "hover:bg-slate-50"} transition-colors`}>
                  <button
                    onClick={() => setTaskList(prev => prev.map(tt => tt.id === t.id ? { ...tt, done: !tt.done } : tt))}
                    className={`w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${t.done ? "bg-violet-600 border-violet-600" : "border-slate-300 hover:border-violet-400"}`}
                  >
                    {t.done && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${t.done ? "line-through text-slate-400" : "text-slate-700"}`}>{t.label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-medium ${t.overdue ? "text-red-500" : "text-slate-400"}`}>
                        {t.overdue ? "⚠ " : ""}Due {t.due}
                      </span>
                      <span className={`text-[10px] px-1.5 rounded-full font-medium ${
                        t.priority === "high" ? "bg-red-100 text-red-700" :
                        t.priority === "medium" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-500"
                      }`}>{t.priority}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FILES TAB */}
        {tab === "Files" && (
          <div className="px-5 py-4 space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Attachments</p>
            {[
              { name: "HVAC_Proposal_v1.pdf", size: "1.2 MB", date: "Oct 5", icon: "📄" },
              { name: "Site_Walkthrough_Photos.zip", size: "14.8 MB", date: "Oct 6", icon: "📦" },
              { name: "Scope_Breakdown_Draft.xlsx", size: "320 KB", date: "Oct 9", icon: "📊" },
            ].map(f => (
              <div key={f.name} className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                <span className="text-xl">{f.icon}</span>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-700">{f.name}</p>
                  <p className="text-[10px] text-slate-400">{f.size} · Uploaded {f.date}</p>
                </div>
                <button className="text-[10px] text-slate-400 hover:text-slate-600">↓</button>
              </div>
            ))}
            <button className="w-full mt-2 py-2 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400 hover:border-violet-300 hover:text-violet-500 transition-colors">
              + Upload file
            </button>
          </div>
        )}

        {/* DETAILS TAB */}
        {tab === "Details" && (
          <div className="px-5 py-4 space-y-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Deal Info</p>
            {[
              { label: "Client", value: "Axis Group" },
              { label: "Contact", value: "Sarah Chen, VP Facilities" },
              { label: "Value", value: "$195,000" },
              { label: "Service", value: "HVAC – Commercial" },
              { label: "Building", value: "333 Commerce Blvd, Atlanta" },
              { label: "Assigned To", value: "Jake Mitchell" },
              { label: "Created", value: "Sep 22, 2024" },
              { label: "Close Date", value: "Oct 30, 2024" },
              { label: "Source", value: "Referral – Mike T." },
            ].map(f => (
              <div key={f.label} className="flex items-baseline gap-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-20 shrink-0">{f.label}</span>
                <span className="text-xs text-slate-700">{f.value}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <button className="text-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors w-full">
                ✏ Edit Deal Details
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
