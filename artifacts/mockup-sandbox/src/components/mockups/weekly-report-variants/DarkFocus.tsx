import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  FileText,
  Send,
  CheckSquare,
  Target,
  Sparkles,
  Search,
  X,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  Bell,
  CornerUpLeft,
  Activity,
  Hash,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardDescription, CardHeader } from '../../ui/card';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';

const CHAT_MESSAGES = [
  {
    id: 1,
    from: 'manager',
    name: 'Dan Chen',
    initials: 'DC',
    time: 'Mon 9:12 AM',
    text: "Sarah, I can see your note on the Beacon Capital pricing concern in the Spotlight. Have you pulled comparable quotes from similar accounts yet?",
  },
  {
    id: 2,
    from: 'am',
    name: 'Sarah M.',
    initials: 'SM',
    time: 'Mon 9:34 AM',
    text: "Not yet — wanted to loop you in first before I committed to anything. I can pull comps and get back to you by EOD today.",
  },
  {
    id: 3,
    from: 'manager',
    name: 'Dan Chen',
    initials: 'DC',
    time: 'Mon 9:36 AM',
    text: "Perfect. Also — great win on JLL Downtown! What was the turning point in that conversation?",
    highlight: true,
    highlightRef: "JLL Downtown Tower Maintenance Package",
  },
  {
    id: 4,
    from: 'am',
    name: 'Sarah M.',
    initials: 'SM',
    time: 'Mon 9:51 AM',
    text: "Honestly the site walk made a big difference. Once they saw we already knew the building they stopped shopping on price.",
  },
];

export function DarkFocus() {
  const [bdText, setBdText] = useState("Met with the facilities team at Beacon Capital. They are generally happy with our janitorial services but expressed some concern over weekend coverage. I promised to review staffing and follow up by Wednesday. Also had a good introductory call with the new property manager at 100 Main St.");
  const [quotesText, setQuotesText] = useState("");
  const [jobsText, setJobsText] = useState("");
  const [saText, setSaText] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [status, setStatus] = useState<'draft' | 'ready' | 'reviewed'>('draft');

  const isFormValid = bdText.trim().length > 0;

  const handleMarkReady = () => {
    setStatus('ready');
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      from: 'system' as any,
      name: 'System',
      initials: '',
      time: 'Just now',
      text: "Sarah marked this report ready for review. Dan Chen has been notified.",
    }]);
  };

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    setMessages(prev => [...prev, {
      id: prev.length + 1,
      from: 'am',
      name: 'Sarah M.',
      initials: 'SM',
      time: 'Just now',
      text: chatMessage.trim(),
    }]);
    setChatMessage("");
  };

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden font-sans text-slate-100 selection:bg-sky-500/30 selection:text-sky-100">

      {/* ── Main Content Column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Weekly Report</h1>
                  {status === 'draft' && (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20">Draft</Badge>
                  )}
                  {status === 'ready' && (
                    <Badge variant="secondary" className="bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ready for Review
                    </Badge>
                  )}
                </div>
                <p className="text-slate-400 text-sm">Sarah Mitchell · Account Manager</p>
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-md border border-slate-700/50 shadow-sm">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2 text-slate-200">Mar 31 – Apr 6, 2026</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </header>

            {/* Activity Snapshot */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">This Week's Activity</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <ActivityCard
                  icon={<Mail className="h-4 w-4 text-sky-400" />}
                  label="Emails"
                  value="18"
                  sub="logged this week"
                  glowColor="ring-sky-500/20"
                />
                <ActivityCard
                  icon={<Phone className="h-4 w-4 text-violet-400" />}
                  label="Phone Calls"
                  value="6"
                  sub="logged this week"
                  glowColor="ring-violet-500/20"
                />
                <ActivityCard
                  icon={<Hash className="h-4 w-4 text-teal-400" />}
                  label="Other Events"
                  value="5"
                  sub="site visits, notes, etc."
                  glowColor="ring-teal-500/20"
                />
                <ActivityCard
                  icon={<FileText className="h-4 w-4 text-indigo-400" />}
                  label="Quotes"
                  value="7 created · 4 sent"
                  sub=""
                  glowColor="ring-indigo-500/20"
                />
                <ActivityCard
                  icon={<CheckSquare className="h-4 w-4 text-emerald-400" />}
                  label="Tasks Done"
                  value="18 / 22"
                  sub="4 still open"
                  glowColor="ring-emerald-500/20"
                />
                <ActivityCard
                  icon={<Target className="h-4 w-4 text-amber-400" />}
                  label="Deals"
                  value="2 Won · 1 Lost"
                  sub=""
                  glowColor="ring-amber-500/20"
                />
              </div>
            </section>

            {/* AI Coaching */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-200">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-medium">Things to Think About</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CoachingCard color="border-sky-500/70" title="Quiet Quotes"
                  message="3 quotes went quiet this week — Beacon Capital, JLL Church, and Delta Star. Do you have a follow-up plan for each one?" />
                <CoachingCard color="border-emerald-500/70" title="Win Pattern"
                  message="You closed 2 deals this week. What made those conversations click? How can you replicate that next week?" />
                <CoachingCard color="border-amber-500/70" title="Task Backlog"
                  message="4 tasks are still open from last week. Which ones are blocking client progress vs. waiting on others?" />
                <CoachingCard color="border-violet-500/70" title="Client Outreach Mix"
                  message="You logged 18 emails and 6 calls this week. Are your top accounts getting the right mix of touchpoints?" />
              </div>
            </section>

            {/* Customer Health */}
            <section className="space-y-3">
              <h2 className="text-base font-medium text-slate-200">Customer Health Snapshot</h2>
              <Card className="overflow-hidden bg-slate-800/40 border-slate-700/50 backdrop-blur-sm">
                <Table>
                  <TableHeader className="bg-slate-800/80 border-b border-slate-700/80">
                    <TableRow className="hover:bg-transparent border-slate-700/50">
                      <TableHead className="font-medium text-slate-400 text-xs">Client</TableHead>
                      <TableHead className="font-medium text-slate-400 text-xs">Health</TableHead>
                      <TableHead className="font-medium text-slate-400 text-xs">Pipeline</TableHead>
                      <TableHead className="font-medium text-slate-400 text-xs text-right">Last Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: 'Cushman and Wakefield', health: 'At Risk', pipeline: '$84,000', last: '12 days ago' },
                      { name: 'JLL Church', health: 'Watch', pipeline: '$660,000', last: '3 days ago' },
                      { name: 'Beacon Capital', health: 'Healthy', pipeline: '$212,550', last: '1 day ago' },
                      { name: 'Piedmont Office Realty', health: 'Healthy', pipeline: '$145,200', last: '4 days ago' },
                      { name: 'CBRE Downtown', health: 'Healthy', pipeline: '$95,000', last: '2 days ago' },
                    ].map((row) => (
                      <TableRow key={row.name} className="text-sm border-slate-700/50 hover:bg-slate-800/60">
                        <TableCell className="font-medium text-slate-200">{row.name}</TableCell>
                        <TableCell><HealthBadge status={row.health as any} /></TableCell>
                        <TableCell className="text-slate-300">{row.pipeline}</TableCell>
                        <TableCell className="text-right text-slate-500 text-xs">{row.last}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </section>

            {/* Report Sections */}
            <section className="space-y-5">
              <h2 className="text-base font-medium text-slate-200">Weekly Narrative</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ReportSection title="BD & CSM" value={bdText} onChange={setBdText}
                  placeholder="Describe your business development and customer success activities this week..." />
                <ReportSection title="Quotes" value={quotesText} onChange={setQuotesText}
                  placeholder="What quotes are active? Any updates on pending approvals?" />
                <ReportSection title="Jobs" value={jobsText} onChange={setJobsText}
                  placeholder="Summarize active jobs, any issues or milestones this week?" />
                <ReportSection title="Service Agreements" value={saText} onChange={setSaText}
                  placeholder="Any SA renewals, concerns, or new agreements this week?" />
              </div>
            </section>

            {/* Spotlight */}
            <section className="space-y-3">
              <h2 className="text-base font-medium text-slate-200">Spotlight Highlights</h2>
              <Card className="bg-slate-800/40 border-slate-700/50 backdrop-blur-sm">
                <CardHeader className="pb-3 border-b border-slate-700/50 bg-slate-800/80">
                  <CardDescription className="text-slate-400 text-xs">Pin key quotes, deals, or items that need manager attention.</CardDescription>
                  <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input placeholder="Search quotes & estimates..." className="pl-9 bg-slate-900/50 border-slate-700/50 text-slate-200 text-sm focus-visible:ring-sky-500/30 placeholder:text-slate-500" />
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <HighlightedItem title="JLL Downtown Tower Maintenance Package" value="$95,375" status="Win"
                    note="Client confirmed Q2 start. Great win for the team." />
                  <HighlightedItem title="Beacon Capital Annual Janitorial" value="$212,550" status="Need Help"
                    note="Pricing concern. Need manager input on discount strategy." />
                </CardContent>
              </Card>
            </section>

          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-6 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
              Auto-saved 2 min ago
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 bg-slate-800/50 hover:bg-slate-800 hover:text-slate-100 text-xs">
                Save Draft
              </Button>
              {status === 'draft' ? (
                <Button
                  size="sm"
                  onClick={handleMarkReady}
                  disabled={!isFormValid}
                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-medium gap-1.5 text-xs shadow-[0_0_15px_rgba(56,189,248,0.3)] border border-sky-400/50"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Mark Ready for Review
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Manager notified
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chat Panel ── */}
      <aside className="w-80 flex flex-col border-l border-slate-800 bg-[#0c1526]">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-200">Report Discussion</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
            <span className="text-xs text-slate-400">Dan online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
          {messages.map((msg) => {
            if ((msg as any).from === 'system') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-[11px] text-slate-400 bg-slate-800/40 border border-slate-800 rounded-full px-3 py-1 text-center leading-relaxed backdrop-blur-sm">
                    {msg.text}
                  </span>
                </div>
              );
            }
            const isManager = msg.from === 'manager';
            return (
              <div key={msg.id} className="space-y-1.5">
                {msg.highlight && (
                  <div className="ml-8 mb-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-2.5 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CornerUpLeft className="h-3 w-3 text-indigo-400" />
                      <span className="text-xs text-indigo-300 font-medium">Referencing spotlight</span>
                    </div>
                    <p className="text-xs text-indigo-200 font-medium">{msg.highlightRef}</p>
                  </div>
                )}
                <div className={`flex gap-2.5 ${isManager ? '' : 'flex-row-reverse'}`}>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border ${
                    isManager ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                  }`}>
                    {msg.initials}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[82%] ${isManager ? 'items-start' : 'items-end'}`}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-medium text-slate-300">{msg.name}</span>
                      <span className="text-[10px] text-slate-500">{msg.time}</span>
                    </div>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      isManager
                        ? 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/50 shadow-sm'
                        : 'bg-sky-500/20 text-sky-50 rounded-tr-sm border border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.05)]'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message input */}
        <div className="px-3 py-3 border-t border-slate-800 bg-slate-900/40 space-y-2">
          <div className="text-xs text-slate-500 px-1">Reply as Sarah M.</div>
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[60px] max-h-32 resize-none text-sm bg-slate-900/50 border-slate-700/50 text-slate-200 pr-2 py-2 rounded-xl focus-visible:ring-sky-500/30 placeholder:text-slate-500 custom-scrollbar"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
            </div>
            <Button
              size="icon"
              onClick={handleSendMessage}
              className="h-9 w-9 rounded-xl bg-sky-500 hover:bg-sky-400 flex-shrink-0 mb-0.5 text-slate-950 shadow-[0_0_10px_rgba(56,189,248,0.3)] border border-sky-400/50"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-slate-600 px-1">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </aside>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(71, 85, 105, 0.4);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(71, 85, 105, 0.6);
        }
      `}} />
    </div>
  );
}

// ── Subcomponents ──

function ActivityCard({ icon, label, value, sub, glowColor }: { icon: React.ReactNode, label: string, value: string, sub: string, glowColor: string }) {
  return (
    <div className={`bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-sm flex items-start gap-3 transition-colors hover:bg-slate-800/60`}>
      <div className={`h-8 w-8 rounded-lg bg-slate-900 ring-1 ${glowColor} flex items-center justify-center flex-shrink-0 shadow-inner`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider leading-none mb-1.5">{label}</p>
        <p className="text-sm font-semibold text-slate-100 leading-snug">{value}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CoachingCard({ title, message, color }: { title: string, message: string, color: string }) {
  return (
    <Card className={`bg-slate-800/40 backdrop-blur-sm border-l-2 ${color} border-y-slate-700/50 border-r-slate-700/50 overflow-hidden shadow-[inset_1px_0_0_rgba(255,255,255,0.05)] hover:bg-slate-800/60 transition-colors`}>
      <CardContent className="p-4">
        <h3 className="font-medium text-slate-100 text-sm mb-1.5">{title}</h3>
        <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ status }: { status: 'Healthy' | 'Watch' | 'At Risk' }) {
  if (status === 'At Risk') return (
    <Badge variant="outline" className="bg-rose-900/30 text-rose-300 border-rose-800/50 gap-1.5 pr-2 text-xs font-medium backdrop-blur-sm">
      <AlertTriangle className="h-3 w-3" /> {status}
    </Badge>
  );
  if (status === 'Watch') return (
    <Badge variant="outline" className="bg-amber-900/30 text-amber-300 border-amber-800/50 gap-1.5 pr-2 text-xs font-medium backdrop-blur-sm">
      <AlertCircle className="h-3 w-3" /> {status}
    </Badge>
  );
  return (
    <Badge variant="outline" className="bg-emerald-900/20 text-emerald-400 border-emerald-800/40 gap-1.5 pr-2.5 text-xs font-medium backdrop-blur-sm">
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]" /> {status}
    </Badge>
  );
}

function ReportSection({ title, value, onChange, placeholder }: { title: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  const maxLength = 500;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <label className="text-sm font-medium text-slate-300">{title}</label>
        <span className={`text-xs ${value.length > maxLength ? 'text-rose-400' : 'text-slate-500'}`}>
          {value.length} / {maxLength}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[120px] resize-none bg-slate-800/30 border-slate-700/50 focus:border-sky-500/50 focus:ring-sky-500/20 placeholder:text-slate-600 text-slate-200 text-sm leading-relaxed backdrop-blur-sm custom-scrollbar"
      />
    </div>
  );
}

function HighlightedItem({ title, value, status, note }: { title: string, value: string, status: 'Win' | 'Need Help', note: string }) {
  return (
    <div className="group relative bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600/50 transition-colors">
      <button className="absolute right-2 top-2 p-1 text-slate-500 opacity-0 group-hover:opacity-100 hover:text-rose-400 hover:bg-slate-800 rounded transition-all">
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-2 pr-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="font-medium text-slate-200 text-sm">{title}</h4>
            <span className="text-slate-400 text-sm">{value}</span>
            <Badge variant="secondary" className={`text-xs cursor-pointer flex items-center gap-1 font-medium border ${
              status === 'Win'
                ? 'bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/40 border-emerald-800/40'
                : 'bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 border-amber-800/40'
            }`}>
              {status} <ChevronDown className="h-3 w-3 opacity-60" />
            </Badge>
          </div>
          <p className="text-xs text-slate-400 bg-slate-800/50 px-3 py-2 rounded-md border border-slate-700/50">
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}
