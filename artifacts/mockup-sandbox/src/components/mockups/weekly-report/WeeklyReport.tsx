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
  DollarSign,
  Users,
  BarChart2,
  ArrowUpRight,
  RefreshCw,
  Flame,
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

export function WeeklyReport() {
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
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden font-sans text-slate-900">

      {/* ── Main Content Column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="max-w-3xl mx-auto px-6 py-8 space-y-10">

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Weekly Report</h1>
                  {status === 'draft' && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Draft</Badge>
                  )}
                  {status === 'ready' && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Ready for Review
                    </Badge>
                  )}
                </div>
                <p className="text-slate-400 text-sm">Sarah Mitchell · Account Manager</p>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border shadow-sm">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2">Mar 31 – Apr 6, 2026</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </header>

            {/* Activity Snapshot */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">This Week's Activity</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <ActivityCard
                  icon={<Mail className="h-4 w-4 text-blue-500" />}
                  label="Emails"
                  value="18"
                  sub="logged this week"
                  bg="bg-blue-50"
                />
                <ActivityCard
                  icon={<Phone className="h-4 w-4 text-violet-500" />}
                  label="Phone Calls"
                  value="6"
                  sub="logged this week"
                  bg="bg-violet-50"
                />
                <ActivityCard
                  icon={<Users className="h-4 w-4 text-sky-500" />}
                  label="Accounts Touched"
                  value="14"
                  sub="unique clients"
                  bg="bg-sky-50"
                />
                <ActivityCard
                  icon={<FileText className="h-4 w-4 text-indigo-500" />}
                  label="Quotes"
                  value="7 created · 4 sent"
                  sub=""
                  bg="bg-indigo-50"
                />
                <ActivityCard
                  icon={<CheckSquare className="h-4 w-4 text-emerald-500" />}
                  label="Tasks Done"
                  value="18 / 22"
                  sub="4 still open"
                  bg="bg-emerald-50"
                />
                <ActivityCard
                  icon={<Target className="h-4 w-4 text-amber-500" />}
                  label="Deals"
                  value="2 Won · 1 Lost"
                  sub=""
                  bg="bg-amber-50"
                />
                <ActivityCard
                  icon={<DollarSign className="h-4 w-4 text-green-600" />}
                  label="Revenue Closed"
                  value="$95,375"
                  sub="this week"
                  bg="bg-green-50"
                />
                <ActivityCard
                  icon={<BarChart2 className="h-4 w-4 text-orange-500" />}
                  label="Active Proposals"
                  value="$382,550"
                  sub="11 open proposals"
                  bg="bg-orange-50"
                />
                <ActivityCard
                  icon={<Hash className="h-4 w-4 text-teal-500" />}
                  label="Other Events"
                  value="5"
                  sub="site visits, notes, etc."
                  bg="bg-teal-50"
                />
              </div>
            </section>

            {/* Revenue Snapshot */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide">Revenue Snapshot</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Month-to-date */}
                <Card className="shadow-sm border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">April Closed</p>
                        <p className="text-xl font-bold text-slate-900">$95,375</p>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Monthly Goal</span>
                        <span className="font-medium text-slate-700">$200,000</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '48%' }} />
                      </div>
                      <p className="text-[11px] text-slate-400">48% · 24 days left</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quarter-to-date */}
                <Card className="shadow-sm border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Q2 Closed</p>
                        <p className="text-xl font-bold text-slate-900">$312,000</p>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <BarChart2 className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Quarter Goal</span>
                        <span className="font-medium text-slate-700">$650,000</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '48%' }} />
                      </div>
                      <p className="text-[11px] text-slate-400">48% · 86 days left</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Recurring MRR */}
                <Card className="shadow-sm border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Recurring MRR</p>
                        <p className="text-xl font-bold text-slate-900">$18,200</p>
                      </div>
                      <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 text-violet-600" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Active SAs</span>
                        <span className="font-medium text-slate-700">7 agreements</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 px-1.5 py-0">
                          2 renewing in 30d
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* AI Coaching */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-medium">Things to Think About</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <CoachingCard color="border-blue-400" title="Quiet Quotes"
                  message="3 quotes went quiet this week — Beacon Capital, JLL Church, and Delta Star. Do you have a follow-up plan for each one?" />
                <CoachingCard color="border-emerald-400" title="Win Pattern"
                  message="You closed 2 deals this week. What made those conversations click? How can you replicate that next week?" />
                <CoachingCard color="border-amber-400" title="Task Backlog"
                  message="4 tasks are still open from last week. Which ones are blocking client progress vs. waiting on others?" />
                <CoachingCard color="border-purple-400" title="Client Outreach Mix"
                  message="You logged 18 emails and 6 calls this week. Are your top accounts getting the right mix of touchpoints?" />
              </div>
            </section>

            {/* Customer Health */}
            <section className="space-y-3">
              <h2 className="text-base font-medium text-slate-800">Customer Health Snapshot</h2>
              <Card className="overflow-hidden shadow-sm border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium text-slate-500 text-xs">Client</TableHead>
                      <TableHead className="font-medium text-slate-500 text-xs">Health</TableHead>
                      <TableHead className="font-medium text-slate-500 text-xs">MRR</TableHead>
                      <TableHead className="font-medium text-slate-500 text-xs">Open Quotes</TableHead>
                      <TableHead className="font-medium text-slate-500 text-xs">Pipeline</TableHead>
                      <TableHead className="font-medium text-slate-500 text-xs text-right">Last Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { name: 'Cushman and Wakefield', health: 'At Risk', mrr: '$4,200', openQuotes: 3, pipeline: '$84,000', last: '12 days ago' },
                      { name: 'JLL Church', health: 'Watch', mrr: '$2,800', openQuotes: 5, pipeline: '$660,000', last: '3 days ago' },
                      { name: 'Beacon Capital', health: 'Healthy', mrr: '$6,500', openQuotes: 2, pipeline: '$212,550', last: '1 day ago' },
                      { name: 'Piedmont Office Realty', health: 'Healthy', mrr: '$3,100', openQuotes: 1, pipeline: '$145,200', last: '4 days ago' },
                      { name: 'CBRE Downtown', health: 'Healthy', mrr: '$1,600', openQuotes: 0, pipeline: '$95,000', last: '2 days ago' },
                    ].map((row) => (
                      <TableRow key={row.name} className="text-sm">
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell><HealthBadge status={row.health as any} /></TableCell>
                        <TableCell className="text-slate-600 font-medium">{row.mrr}</TableCell>
                        <TableCell>
                          {row.openQuotes > 0
                            ? <span className="text-xs font-medium text-indigo-600">{row.openQuotes} open</span>
                            : <span className="text-xs text-slate-300">—</span>
                          }
                        </TableCell>
                        <TableCell className="text-slate-600">{row.pipeline}</TableCell>
                        <TableCell className="text-right text-slate-400 text-xs">{row.last}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </section>

            {/* Proposal Aging */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-slate-800">Proposal Aging</h2>
                <span className="text-xs text-slate-400">11 open proposals · avg. 14 days</span>
              </div>
              <Card className="shadow-sm border-slate-200">
                <CardContent className="p-4 space-y-3">
                  {[
                    { client: 'Beacon Capital', title: 'Annual Janitorial Agreement', value: '$212,550', days: 36, status: 'hot' },
                    { client: 'JLL Church', title: 'Bathroom Project', value: '$28,400', days: 21, status: 'warm' },
                    { client: 'Cushman and Wakefield', title: 'Clear Debris from Roof', value: '$8,700', days: 19, status: 'warm' },
                    { client: 'Delta Star Inc.', title: 'Landscaping Clean Up', value: '$4,200', days: 12, status: 'new' },
                    { client: 'Patelco Credit Union', title: 'Branch Refresh', value: '$31,600', days: 9, status: 'new' },
                  ].map((p) => (
                    <div key={p.title} className="flex items-center gap-3">
                      <AgingDot days={p.days} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-slate-800 truncate">{p.title}</span>
                          <span className="text-xs text-slate-400 shrink-0">{p.client}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold text-slate-800">{p.value}</div>
                        <div className={`text-[11px] ${p.days > 30 ? 'text-rose-500' : p.days > 15 ? 'text-amber-500' : 'text-slate-400'}`}>
                          {p.days}d out
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            {/* Report Sections */}
            <section className="space-y-5">
              <h2 className="text-base font-medium text-slate-800">Weekly Narrative</h2>
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
              <h2 className="text-base font-medium text-slate-800">Spotlight Highlights</h2>
              <Card className="shadow-sm border-slate-200">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                  <CardDescription className="text-slate-400 text-xs">Pin key quotes, deals, or items that need manager attention.</CardDescription>
                  <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search quotes & estimates..." className="pl-9 bg-white border-slate-200 text-sm" />
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
        <div className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-3 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.05)]">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Auto-saved 2 min ago
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs">
                Save Draft
              </Button>
              {status === 'draft' ? (
                <Button
                  size="sm"
                  onClick={handleMarkReady}
                  disabled={!isFormValid}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs"
                >
                  <Bell className="h-3.5 w-3.5" />
                  Mark Ready for Review
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Manager notified
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chat Panel ── */}
      <aside className="w-80 flex flex-col border-l border-slate-200 bg-white">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-800">Report Discussion</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-slate-400">Dan online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map((msg) => {
            if ((msg as any).from === 'system') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-3 py-1 text-center leading-relaxed">
                    {msg.text}
                  </span>
                </div>
              );
            }
            const isManager = msg.from === 'manager';
            return (
              <div key={msg.id} className="space-y-1">
                {msg.highlight && (
                  <div className="ml-8 mb-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CornerUpLeft className="h-3 w-3 text-blue-400" />
                      <span className="text-xs text-blue-500 font-medium">Referencing spotlight</span>
                    </div>
                    <p className="text-xs text-blue-700 font-medium">{msg.highlightRef}</p>
                  </div>
                )}
                <div className={`flex gap-2.5 ${isManager ? '' : 'flex-row-reverse'}`}>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    isManager ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {msg.initials}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[78%] ${isManager ? 'items-start' : 'items-end'}`}>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-medium text-slate-700">{msg.name}</span>
                      <span className="text-[10px] text-slate-400">{msg.time}</span>
                    </div>
                    <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      isManager
                        ? 'bg-slate-100 text-slate-800 rounded-tl-sm'
                        : 'bg-blue-600 text-white rounded-tr-sm'
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
        <div className="px-3 py-3 border-t border-slate-100 space-y-2">
          <div className="text-xs text-slate-400 px-1">Reply as Sarah M.</div>
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[60px] max-h-32 resize-none text-sm border-slate-200 pr-2 py-2 rounded-xl"
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
              className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-700 flex-shrink-0 mb-0.5"
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
          <p className="text-[10px] text-slate-300 px-1">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </aside>
    </div>
  );
}

// ── Subcomponents ──

function ActivityCard({ icon, label, value, sub, bg }: { icon: React.ReactNode, label: string, value: string, sub: string, bg: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start gap-3`}>
      <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide leading-none mb-1">{label}</p>
        <p className="text-sm font-semibold text-slate-900 leading-snug">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CoachingCard({ title, message, color }: { title: string, message: string, color: string }) {
  return (
    <Card className={`shadow-sm border-l-4 ${color} border-y-slate-200 border-r-slate-200 overflow-hidden`}>
      <CardContent className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm mb-1">{title}</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ status }: { status: 'Healthy' | 'Watch' | 'At Risk' }) {
  if (status === 'At Risk') return (
    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1 pr-2 text-xs">
      <AlertTriangle className="h-3 w-3" /> {status}
    </Badge>
  );
  if (status === 'Watch') return (
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 pr-2 text-xs">
      <AlertCircle className="h-3 w-3" /> {status}
    </Badge>
  );
  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 pr-2 text-xs font-normal">
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {status}
    </Badge>
  );
}

function AgingDot({ days }: { days: number }) {
  if (days > 30) return (
    <div className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0 mt-0.5" />
  );
  if (days > 15) return (
    <div className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0 mt-0.5" />
  );
  return (
    <div className="h-2.5 w-2.5 rounded-full bg-slate-200 shrink-0 mt-0.5" />
  );
}

function ReportSection({ title, value, onChange, placeholder }: { title: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  const maxLength = 500;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <label className="text-sm font-medium text-slate-700">{title}</label>
        <span className={`text-xs ${value.length > maxLength ? 'text-rose-500' : 'text-slate-300'}`}>
          {value.length} / {maxLength}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[120px] resize-none border-slate-200 focus:border-blue-400 focus:ring-blue-100 placeholder:text-slate-300 text-sm leading-relaxed"
      />
    </div>
  );
}

function HighlightedItem({ title, value, status, note }: { title: string, value: string, status: 'Win' | 'Need Help', note: string }) {
  return (
    <div className="group relative bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
      <button className="absolute right-2 top-2 p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-50 rounded transition-all">
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-2 pr-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h4 className="font-medium text-slate-900 text-sm">{title}</h4>
            <span className="text-slate-400 text-sm">{value}</span>
            <Badge variant="secondary" className={`text-xs cursor-pointer flex items-center gap-1 ${
              status === 'Win'
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200'
                : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200'
            }`}>
              {status} <ChevronDown className="h-3 w-3 opacity-60" />
            </Badge>
          </div>
          <p className="text-xs text-slate-500 bg-slate-50 px-2.5 py-2 rounded-md border border-slate-100">
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}
