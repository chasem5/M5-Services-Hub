import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  FileText,
  Send,
  CheckSquare,
  Calendar as CalendarIcon,
  Target,
  Sparkles,
  TrendingUp,
  Search,
  X,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  Bell,
  Paperclip,
  CornerUpLeft,
  Activity,
  Hash,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
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

export function WarmCoach() {
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
    <div className="flex h-screen bg-[#fef9f3] overflow-hidden font-sans text-stone-800">

      {/* ── Main Content Column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto pb-32">
          <div className="max-w-3xl mx-auto px-8 py-10 space-y-12">

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Weekly Report</h1>
                  {status === 'draft' && (
                    <Badge variant="secondary" className="bg-stone-200/50 text-stone-700 hover:bg-stone-200/70 border-stone-300/50 rounded-full px-3 font-medium">Draft</Badge>
                  )}
                  {status === 'ready' && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200/70 border-amber-200 rounded-full px-3 gap-1.5 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Review
                    </Badge>
                  )}
                </div>
                <p className="text-stone-500 text-sm font-medium">Sarah Mitchell · Account Manager</p>
              </div>
              <div className="flex items-center gap-2 bg-[#fffdf8] px-3 py-2 rounded-xl border border-stone-200/60 shadow-[0_2px_10px_-4px_rgba(217,119,6,0.05)]">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-3 text-stone-700">Mar 31 – Apr 6, 2026</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </header>

            {/* Activity Snapshot */}
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Activity className="h-4 w-4 text-stone-400" />
                <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-widest">This Week's Activity</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ActivityCard
                  icon={<Mail className="h-5 w-5 text-amber-600" />}
                  label="Emails"
                  value="18"
                  sub="logged this week"
                  bg="bg-amber-100/50"
                />
                <ActivityCard
                  icon={<Phone className="h-5 w-5 text-orange-600" />}
                  label="Phone Calls"
                  value="6"
                  sub="logged this week"
                  bg="bg-orange-100/50"
                />
                <ActivityCard
                  icon={<Hash className="h-5 w-5 text-rose-600" />}
                  label="Other Events"
                  value="5"
                  sub="site visits, notes, etc."
                  bg="bg-rose-100/50"
                />
                <ActivityCard
                  icon={<FileText className="h-5 w-5 text-red-600" />}
                  label="Quotes"
                  value="7 created · 4 sent"
                  sub=""
                  bg="bg-red-100/50"
                />
                <ActivityCard
                  icon={<CheckSquare className="h-5 w-5 text-amber-700" />}
                  label="Tasks Done"
                  value="18 / 22"
                  sub="4 still open"
                  bg="bg-amber-100/80"
                />
                <ActivityCard
                  icon={<Target className="h-5 w-5 text-orange-700" />}
                  label="Deals"
                  value="2 Won · 1 Lost"
                  sub=""
                  bg="bg-orange-100/80"
                />
              </div>
            </section>

            {/* AI Coaching */}
            <section className="space-y-5">
              <div className="flex items-center gap-2.5 text-stone-800">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">Things to Think About</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CoachingCard color="border-amber-400" title="Quiet Quotes"
                  message="3 quotes went quiet this week — Beacon Capital, JLL Church, and Delta Star. Do you have a follow-up plan for each one?" />
                <CoachingCard color="border-orange-400" title="Win Pattern"
                  message="You closed 2 deals this week. What made those conversations click? How can you replicate that next week?" />
                <CoachingCard color="border-rose-400" title="Task Backlog"
                  message="4 tasks are still open from last week. Which ones are blocking client progress vs. waiting on others?" />
                <CoachingCard color="border-red-400" title="Client Outreach Mix"
                  message="You logged 18 emails and 6 calls this week. Are your top accounts getting the right mix of touchpoints?" />
              </div>
            </section>

            {/* Customer Health */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-800">Customer Health Snapshot</h2>
              <Card className="overflow-hidden shadow-[0_2px_10px_-4px_rgba(217,119,6,0.05)] border-stone-200/60 bg-[#fffdf8] rounded-2xl">
                <Table>
                  <TableHeader className="bg-stone-50/50 border-b border-stone-200/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold text-stone-500 text-xs tracking-wider uppercase py-4">Client</TableHead>
                      <TableHead className="font-semibold text-stone-500 text-xs tracking-wider uppercase py-4">Health</TableHead>
                      <TableHead className="font-semibold text-stone-500 text-xs tracking-wider uppercase py-4">Pipeline</TableHead>
                      <TableHead className="font-semibold text-stone-500 text-xs tracking-wider uppercase py-4 text-right">Last Contact</TableHead>
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
                      <TableRow key={row.name} className="text-sm border-stone-100 hover:bg-stone-50/30">
                        <TableCell className="font-medium text-stone-800 py-4">{row.name}</TableCell>
                        <TableCell className="py-4"><HealthBadge status={row.health as any} /></TableCell>
                        <TableCell className="text-stone-600 py-4">{row.pipeline}</TableCell>
                        <TableCell className="text-right text-stone-400 text-xs py-4">{row.last}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </section>

            {/* Report Sections */}
            <section className="space-y-6">
              <h2 className="text-lg font-semibold text-stone-800">Weekly Narrative</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-stone-800">Spotlight Highlights</h2>
              <Card className="shadow-[0_2px_10px_-4px_rgba(217,119,6,0.05)] border-stone-200/60 bg-[#fffdf8] rounded-2xl">
                <CardHeader className="pb-4 border-b border-stone-100 bg-stone-50/30 pt-5 px-6">
                  <CardDescription className="text-stone-500 text-sm">Pin key quotes, deals, or items that need manager attention.</CardDescription>
                  <div className="relative mt-4">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                    <Input placeholder="Search quotes & estimates..." className="pl-10 bg-white border-stone-200 text-sm rounded-xl h-10 shadow-sm focus:ring-amber-100 focus:border-amber-300" />
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
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
        <div className="bg-[#fffdf8]/90 backdrop-blur-xl border-t border-stone-200 px-8 py-4 shadow-[0_-8px_30px_-5px_rgba(217,119,6,0.08)]">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="text-sm text-stone-500 flex items-center gap-2.5 font-medium">
              <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Auto-saved 2 min ago
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="border-stone-200 text-stone-600 hover:bg-stone-100 text-sm h-10 px-5 rounded-xl font-medium">
                Save Draft
              </Button>
              {status === 'draft' ? (
                <Button
                  size="sm"
                  onClick={handleMarkReady}
                  disabled={!isFormValid}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-2 text-sm h-10 px-6 rounded-xl font-medium shadow-sm shadow-amber-600/20"
                >
                  <Bell className="h-4 w-4" />
                  Mark Ready for Review
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-700 font-semibold bg-amber-50 px-4 py-2 rounded-xl">
                  <CheckCircle2 className="h-4 w-4" />
                  Manager notified
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chat Panel ── */}
      <aside className="w-96 flex flex-col border-l border-stone-200/80 bg-[#fbf7f0]">
        {/* Chat header */}
        <div className="px-6 py-5 border-b border-stone-200/60 flex items-center justify-between bg-[#fbf7f0]">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-5 w-5 text-stone-500" />
            <span className="text-base font-semibold text-stone-800">Report Discussion</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-sm font-medium text-stone-500">Dan online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.map((msg) => {
            if ((msg as any).from === 'system') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-xs text-stone-500 bg-stone-200/50 border border-stone-300/30 rounded-full px-4 py-1.5 text-center font-medium">
                    {msg.text}
                  </span>
                </div>
              );
            }
            const isManager = msg.from === 'manager';
            return (
              <div key={msg.id} className="space-y-1.5">
                {msg.highlight && (
                  <div className="ml-10 mb-3 bg-amber-100/50 border border-amber-200/60 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <CornerUpLeft className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Referencing spotlight</span>
                    </div>
                    <p className="text-sm text-stone-800 font-medium">{msg.highlightRef}</p>
                  </div>
                )}
                <div className={`flex gap-3 ${isManager ? '' : 'flex-row-reverse'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm ${
                    isManager ? 'bg-[#fffdf8] text-stone-600 border border-stone-200' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {msg.initials}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[80%] ${isManager ? 'items-start' : 'items-end'}`}>
                    <div className="flex items-baseline gap-2 px-1">
                      <span className="text-sm font-semibold text-stone-800">{msg.name}</span>
                      <span className="text-xs text-stone-400 font-medium">{msg.time}</span>
                    </div>
                    <div className={`rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                      isManager
                        ? 'bg-white text-stone-700 rounded-tl-sm border border-stone-200/60'
                        : 'bg-amber-600 text-white rounded-tr-sm shadow-amber-600/10'
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
        <div className="px-5 py-5 border-t border-stone-200/60 space-y-3 bg-[#fbf7f0]">
          <div className="text-xs font-medium text-stone-500 px-1">Reply as Sarah M.</div>
          <div className="flex items-end gap-2.5">
            <div className="flex-1 relative">
              <Textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[70px] max-h-32 resize-none text-[15px] border-stone-200 bg-white pr-2 py-3 rounded-xl focus:ring-amber-100 focus:border-amber-300 shadow-sm"
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
              className="h-10 w-10 rounded-xl bg-amber-600 hover:bg-amber-700 flex-shrink-0 mb-1 shadow-sm shadow-amber-600/20"
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
          <p className="text-[11px] text-stone-400 px-1 font-medium">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </aside>
    </div>
  );
}

// ── Subcomponents ──

function ActivityCard({ icon, label, value, sub, bg }: { icon: React.ReactNode, label: string, value: string, sub: string, bg: string }) {
  return (
    <div className={`bg-[#fffdf8] border border-stone-200/60 rounded-2xl p-5 shadow-[0_2px_10px_-4px_rgba(217,119,6,0.05)] flex items-start gap-4`}>
      <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">{label}</p>
        <p className="text-lg font-semibold text-stone-800 leading-snug">{value}</p>
        {sub && <p className="text-xs font-medium text-stone-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function CoachingCard({ title, message, color }: { title: string, message: string, color: string }) {
  return (
    <Card className={`shadow-[0_2px_10px_-4px_rgba(217,119,6,0.05)] border-l-[6px] ${color} border-y-stone-200/60 border-r-stone-200/60 overflow-hidden bg-[#fffdf8] rounded-2xl`}>
      <CardContent className="p-5">
        <h3 className="font-semibold text-stone-800 text-[15px] mb-2">{title}</h3>
        <p className="text-[14px] text-stone-600 leading-relaxed font-medium">{message}</p>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ status }: { status: 'Healthy' | 'Watch' | 'At Risk' }) {
  if (status === 'At Risk') return (
    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1.5 pr-3 py-1 rounded-full text-xs font-semibold shadow-sm">
      <AlertTriangle className="h-3.5 w-3.5" /> {status}
    </Badge>
  );
  if (status === 'Watch') return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 pr-3 py-1 rounded-full text-xs font-semibold shadow-sm">
      <AlertCircle className="h-3.5 w-3.5" /> {status}
    </Badge>
  );
  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 pr-3 py-1 rounded-full text-xs font-semibold shadow-sm">
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {status}
    </Badge>
  );
}

function ReportSection({ title, value, onChange, placeholder }: { title: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  const maxLength = 500;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end px-1">
        <label className="text-[15px] font-semibold text-stone-800">{title}</label>
        <span className={`text-xs font-medium ${value.length > maxLength ? 'text-rose-500' : 'text-stone-400'}`}>
          {value.length} / {maxLength}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[140px] resize-none bg-white border-stone-200/80 focus:border-amber-300 focus:ring-amber-100 placeholder:text-stone-300 text-[15px] leading-relaxed rounded-2xl p-4 shadow-sm"
      />
    </div>
  );
}

function HighlightedItem({ title, value, status, note }: { title: string, value: string, status: 'Win' | 'Need Help', note: string }) {
  return (
    <div className="group relative bg-white border border-stone-200/80 rounded-xl p-4 hover:border-stone-300 hover:shadow-md transition-all shadow-sm">
      <button className="absolute right-3 top-3 p-1.5 text-stone-300 opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2.5 flex-wrap">
            <h4 className="font-semibold text-stone-800 text-[15px]">{title}</h4>
            <span className="text-stone-500 text-sm font-medium bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100">{value}</span>
            <Badge variant="secondary" className={`text-xs cursor-pointer flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold ${
              status === 'Win'
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200'
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200'
            }`}>
              {status} <ChevronDown className="h-3 w-3 opacity-60" />
            </Badge>
          </div>
          <p className="text-[14px] text-stone-600 bg-[#fef9f3] px-3.5 py-2.5 rounded-lg border border-stone-100 font-medium">
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}
