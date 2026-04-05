import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  Bell,
  CornerUpLeft,
  CheckCircle2,
  Send
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardDescription } from '../../ui/card';
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

export function EditorialDoc() {
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
    <div className="flex h-screen bg-white overflow-hidden font-serif text-slate-900">
      
      {/* ── Main Content Column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden border-r border-slate-200">
        
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto pb-24 font-sans">
          <div className="max-w-4xl mx-auto px-10 py-12 space-y-12">

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b-2 border-slate-900">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif">Weekly Report</h1>
                  {status === 'draft' && (
                    <Badge variant="outline" className="rounded-none font-semibold text-xs border-slate-400 text-slate-600 uppercase tracking-widest px-2 py-0.5">Draft</Badge>
                  )}
                  {status === 'ready' && (
                    <Badge variant="outline" className="rounded-none font-semibold text-xs border-green-800 text-green-800 uppercase tracking-widest px-2 py-0.5 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3" /> Ready for Review
                    </Badge>
                  )}
                </div>
                <p className="text-slate-600 text-sm font-medium tracking-wide">Sarah Mitchell <span className="mx-2 text-slate-300">|</span> Account Manager</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold tracking-wide text-slate-800">Mar 31 – Apr 6, 2026</span>
                <div className="flex items-center border border-slate-300">
                  <button className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-r border-slate-300 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </header>

            {/* Activity Snapshot */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-4 pb-2 border-b border-slate-200">This Week's Activity</h2>
              <div className="border border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y md:divide-y-0 divide-slate-200">
                  <ActivityCell label="Emails" value="18" sub="logged this week" />
                  <ActivityCell label="Phone Calls" value="6" sub="logged this week" />
                  <ActivityCell label="Other Events" value="5" sub="site visits, notes" />
                  <ActivityCell label="Quotes" value="7 created" sub="4 sent" className="border-t md:border-t-0" />
                  <ActivityCell label="Tasks Done" value="18 / 22" sub="4 still open" className="border-t md:border-t-0" />
                  <ActivityCell label="Deals" value="2 Won" sub="1 Lost" className="border-t md:border-t-0" />
                </div>
              </div>
            </section>

            {/* AI Coaching */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-4 pb-2 border-b border-slate-200">Things to Think About</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                <CoachingItem num="01" title="Quiet Quotes" message="3 quotes went quiet this week — Beacon Capital, JLL Church, and Delta Star. Do you have a follow-up plan for each one?" />
                <CoachingItem num="02" title="Win Pattern" message="You closed 2 deals this week. What made those conversations click? How can you replicate that next week?" />
                <CoachingItem num="03" title="Task Backlog" message="4 tasks are still open from last week. Which ones are blocking client progress vs. waiting on others?" />
                <CoachingItem num="04" title="Client Outreach Mix" message="You logged 18 emails and 6 calls this week. Are your top accounts getting the right mix of touchpoints?" />
              </div>
            </section>

            {/* Customer Health */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-4 pb-2 border-b border-slate-200">Customer Health Snapshot</h2>
              <div className="border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="hover:bg-transparent border-b border-slate-200">
                      <TableHead className="font-semibold text-slate-700 text-xs uppercase tracking-wider h-10">Client</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs uppercase tracking-wider h-10">Health</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs uppercase tracking-wider h-10">Pipeline</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-xs uppercase tracking-wider h-10 text-right">Last Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: 'Cushman and Wakefield', health: 'At Risk', pipeline: '$84,000', last: '12 days ago' },
                      { name: 'JLL Church', health: 'Watch', pipeline: '$660,000', last: '3 days ago' },
                      { name: 'Beacon Capital', health: 'Healthy', pipeline: '$212,550', last: '1 day ago' },
                      { name: 'Piedmont Office Realty', health: 'Healthy', pipeline: '$145,200', last: '4 days ago' },
                      { name: 'CBRE Downtown', health: 'Healthy', pipeline: '$95,000', last: '2 days ago' },
                    ].map((row, i) => (
                      <TableRow key={row.name} className={`text-sm border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <TableCell className="font-medium text-slate-900 py-3">{row.name}</TableCell>
                        <TableCell className="py-3"><HealthPill status={row.health as any} /></TableCell>
                        <TableCell className="text-slate-600 py-3">{row.pipeline}</TableCell>
                        <TableCell className="text-right text-slate-500 text-xs py-3">{row.last}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* Report Sections */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-4 pb-2 border-b border-slate-200">Weekly Narrative</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ReportSection title="BD & CSM" value={bdText} onChange={setBdText} placeholder="Describe your business development and customer success activities this week..." />
                <ReportSection title="Quotes" value={quotesText} onChange={setQuotesText} placeholder="What quotes are active? Any updates on pending approvals?" />
                <ReportSection title="Jobs" value={jobsText} onChange={setJobsText} placeholder="Summarize active jobs, any issues or milestones this week?" />
                <ReportSection title="Service Agreements" value={saText} onChange={setSaText} placeholder="Any SA renewals, concerns, or new agreements this week?" />
              </div>
            </section>

            {/* Spotlight */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-4 pb-2 border-b border-slate-200">Spotlight Highlights</h2>
              <div className="border border-slate-200 bg-slate-50 p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <p className="text-slate-500 text-sm italic">Pin key quotes, deals, or items that need manager attention.</p>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search records..." className="pl-9 bg-white border-slate-300 text-sm rounded-none focus-visible:ring-0 focus-visible:border-slate-500" />
                  </div>
                </div>
                <div className="space-y-4">
                  <SpotlightItem title="JLL Downtown Tower Maintenance Package" value="$95,375" status="Win" note="Client confirmed Q2 start. Great win for the team." />
                  <SpotlightItem title="Beacon Capital Annual Janitorial" value="$212,550" status="Need Help" note="Pricing concern. Need manager input on discount strategy." />
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-white border-t border-slate-200 px-10 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Auto-saved 2 min ago
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" className="rounded-none border-slate-300 text-slate-700 hover:bg-slate-50 uppercase tracking-widest text-xs font-bold px-6">
                Save Draft
              </Button>
              {status === 'draft' ? (
                <Button
                  onClick={handleMarkReady}
                  disabled={!isFormValid}
                  className="rounded-none bg-green-800 hover:bg-green-900 text-white uppercase tracking-widest text-xs font-bold px-6"
                >
                  Mark Ready for Review
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-green-800 font-bold uppercase tracking-widest">
                  <CheckCircle2 className="h-4 w-4" />
                  Manager notified
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chat Panel ── */}
      <aside className="w-96 flex flex-col bg-slate-50 font-sans">
        {/* Chat header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-bold uppercase tracking-wider text-slate-800">Discussion</span>
            </div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Dan online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map((msg) => {
            if ((msg as any).from === 'system') {
              return (
                <div key={msg.id} className="pt-4 pb-2">
                  <div className="border-t border-slate-200 relative">
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-slate-50 px-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                      System Note
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 text-center mt-4 italic">{msg.text}</p>
                </div>
              );
            }
            return (
              <div key={msg.id} className="space-y-2">
                {msg.highlight && (
                  <div className="pl-4 border-l-2 border-slate-300 mb-3 py-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CornerUpLeft className="h-3 w-3 text-slate-400" />
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Referencing</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">{msg.highlightRef}</p>
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-slate-900">{msg.name}</span>
                      <span className="text-xs text-slate-400">{msg.time}</span>
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message input */}
        <div className="p-6 bg-white border-t border-slate-200">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reply as Sarah M.</div>
          <div className="flex flex-col gap-3">
            <Textarea
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[80px] max-h-40 resize-y text-sm border-slate-300 rounded-none focus-visible:ring-0 focus-visible:border-slate-500 p-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="flex justify-between items-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Enter to send</p>
              <Button
                onClick={handleSendMessage}
                className="rounded-none bg-slate-900 hover:bg-black text-white px-6 uppercase tracking-widest text-xs font-bold"
              >
                Post Reply
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ── Subcomponents ──

function ActivityCell({ label, value, sub, className = "" }: { label: string, value: string, sub: string, className?: string }) {
  return (
    <div className={`p-4 bg-white ${className}`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function CoachingItem({ num, title, message }: { num: string, title: string, message: string }) {
  return (
    <div className="relative pl-6 border-l border-slate-300">
      <span className="absolute -left-3 top-0 bg-white px-1 text-xs font-bold text-slate-400">{num}</span>
      <h3 className="font-bold text-slate-900 text-sm mb-1">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    </div>
  );
}

function HealthPill({ status }: { status: 'Healthy' | 'Watch' | 'At Risk' }) {
  if (status === 'At Risk') return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-red-200 bg-red-50 text-red-700 text-xs font-bold uppercase tracking-wider">
      <AlertTriangle className="h-3 w-3" /> {status}
    </span>
  );
  if (status === 'Watch') return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-amber-200 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider">
      <AlertCircle className="h-3 w-3" /> {status}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-slate-200 bg-white text-slate-700 text-xs font-bold uppercase tracking-wider">
      <div className="h-1.5 w-1.5 rounded-full bg-slate-400" /> {status}
    </span>
  );
}

function ReportSection({ title, value, onChange, placeholder }: { title: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  const maxLength = 500;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end border-b border-slate-200 pb-1">
        <label className="text-sm font-bold text-slate-800">{title}</label>
        <span className={`text-xs font-mono ${value.length > maxLength ? 'text-red-500' : 'text-slate-400'}`}>
          {value.length} / {maxLength}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[120px] resize-y border-none bg-slate-50 focus-visible:ring-1 focus-visible:ring-slate-300 focus-visible:bg-white text-sm leading-relaxed p-3 rounded-none"
      />
    </div>
  );
}

function SpotlightItem({ title, value, status, note }: { title: string, value: string, status: 'Win' | 'Need Help', note: string }) {
  return (
    <div className="group relative bg-white border border-slate-200 p-4 transition-colors hover:border-slate-400">
      <button className="absolute right-3 top-3 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-900 transition-all">
        <X className="h-4 w-4" />
      </button>
      <div className="flex flex-col md:flex-row md:items-start gap-4 pr-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
            <span className="text-slate-500 text-sm font-mono bg-slate-100 px-1">{value}</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${
              status === 'Win'
                ? 'border-green-800 text-green-800'
                : 'border-slate-800 text-slate-800'
            }`}>
              {status}
            </span>
          </div>
          <p className="text-sm text-slate-700 italic border-l-2 border-slate-300 pl-3">
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}
