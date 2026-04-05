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
  Flag,
  PenLine
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/accordion';

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

export function DashboardFirst() {
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
    <div className="flex h-screen bg-[#f1f5f9] overflow-hidden font-sans text-slate-900">
      
      {/* ── Main Content Column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Sticky Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 shadow-sm flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Weekly Report</h1>
                {status === 'draft' && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 font-medium">Draft</Badge>
                )}
                {status === 'ready' && (
                  <Badge variant="secondary" className="bg-teal-100 text-teal-700 hover:bg-teal-100 border-teal-200 gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Review
                  </Badge>
                )}
              </div>
              <p className="text-slate-500 text-sm font-medium">Sarah Mitchell <span className="mx-1.5 text-slate-300">|</span> Account Manager</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center bg-slate-100/50 p-1 rounded-lg border border-slate-200">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-white rounded-md">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-3 flex flex-col items-center justify-center">
                <span className="text-sm font-semibold text-slate-800 leading-tight">Mar 31 – Apr 6</span>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider leading-none">2026</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-white rounded-md">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700 font-medium">
                Save Draft
              </Button>
              {status === 'draft' ? (
                <Button
                  size="sm"
                  onClick={handleMarkReady}
                  disabled={!isFormValid}
                  className="bg-teal-600 hover:bg-teal-700 text-white gap-2 font-medium shadow-sm transition-all"
                >
                  <Bell className="h-4 w-4" />
                  Mark Ready
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-teal-600 font-semibold bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100">
                  <CheckCircle2 className="h-4 w-4" />
                  Sent to Manager
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-4xl mx-auto space-y-8 pb-12">

            {/* SECTION 1: Activity Heatmap & KPIs */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-500" /> Activity Breakdown
                </h2>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">This Week</span>
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-6">
                {/* Horizontal Bar Chart (Inline CSS) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-slate-600 flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400"/> Emails (18)</div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{width: '60%'}}></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-slate-600 flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400"/> Calls (6)</div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{width: '20%'}}></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-slate-600 flex items-center gap-2"><Hash className="h-4 w-4 text-slate-400"/> Events (5)</div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{width: '16%'}}></div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                {/* KPI Pills Row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg"><FileText className="h-4 w-4 text-indigo-600" /></div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Quotes</p>
                      <p className="text-sm font-bold text-slate-900">7 Created <span className="text-slate-300 font-normal mx-1">/</span> 4 Sent</p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="flex-1 flex items-center gap-3 pl-4">
                    <div className="p-2 bg-emerald-50 rounded-lg"><CheckSquare className="h-4 w-4 text-emerald-600" /></div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tasks</p>
                      <p className="text-sm font-bold text-slate-900">18 Done <span className="text-slate-300 font-normal mx-1">/</span> 22 Total</p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="flex-1 flex items-center gap-3 pl-4">
                    <div className="p-2 bg-rose-50 rounded-lg"><Target className="h-4 w-4 text-rose-600" /></div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Deals</p>
                      <p className="text-sm font-bold text-slate-900">2 Won <span className="text-slate-300 font-normal mx-1">/</span> 1 Lost</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 2: Client Health Radar */}
            <section className="space-y-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Flag className="h-4 w-4 text-teal-500" /> Client Health Radar
              </h2>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="grid grid-cols-[1fr_2fr_120px] gap-4 mb-3 px-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client Account</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health Score</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Last Contact</div>
                </div>
                <div className="space-y-1">
                  <HealthRow name="Cushman and Wakefield" health="At Risk" score={25} lastContact="12 days" />
                  <HealthRow name="JLL Church" health="Watch" score={60} lastContact="3 days" />
                  <HealthRow name="Beacon Capital" health="Healthy" score={90} lastContact="1 day" />
                  <HealthRow name="Piedmont Office Realty" health="Healthy" score={95} lastContact="4 days" />
                  <HealthRow name="CBRE Downtown" health="Healthy" score={85} lastContact="2 days" />
                </div>
              </div>
            </section>

            {/* SECTION 3: Spotlight Highlights */}
            <section className="space-y-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Search className="h-4 w-4 text-teal-500" /> Spotlight Highlights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 font-semibold shadow-none">Win</Badge>
                      <span className="text-sm font-bold text-slate-600">$95,375</span>
                    </div>
                    <CardTitle className="text-lg leading-tight">JLL Downtown Tower Maintenance Package</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      Client confirmed Q2 start. Great win for the team.
                    </p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start mb-2">
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 font-semibold shadow-none">Need Help</Badge>
                      <span className="text-sm font-bold text-slate-600">$212,550</span>
                    </div>
                    <CardTitle className="text-lg leading-tight">Beacon Capital Annual Janitorial</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      Pricing concern. Need manager input on discount strategy.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* SECTION 4: Narrative Accordions */}
            <section className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-teal-500" /> Context & Narrative
                </h2>
                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm">Optional context</span>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <Accordion type="multiple" className="w-full" defaultValue={['item-bd']}>
                  <AccordionItem value="item-bd" className="border-b border-slate-100 px-2">
                    <AccordionTrigger className="hover:no-underline py-4 px-2 text-sm font-semibold text-slate-800 data-[state=open]:text-teal-700 transition-colors group">
                      <div className="flex items-center gap-3 text-left">
                        <span>Business Development & CSM</span>
                        {bdText && <span className="text-xs font-normal text-slate-400 truncate max-w-md hidden md:inline-block group-data-[state=open]:opacity-0 transition-opacity">
                          {bdText.substring(0, 60)}...
                        </span>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-4 pt-2">
                      <Textarea 
                        value={bdText} 
                        onChange={(e) => setBdText(e.target.value)}
                        className="min-h-[100px] bg-slate-50 border-slate-200 focus-visible:ring-teal-500 text-sm leading-relaxed"
                        placeholder="Add context on BD activities..."
                      />
                    </AccordionContent>
                  </AccordionItem>
                  
                  <AccordionItem value="item-quotes" className="border-b border-slate-100 px-2">
                    <AccordionTrigger className="hover:no-underline py-4 px-2 text-sm font-semibold text-slate-800 data-[state=open]:text-teal-700 transition-colors group">
                      <div className="flex items-center gap-3 text-left">
                        <span>Quotes & Estimates</span>
                        {quotesText && <span className="text-xs font-normal text-slate-400 truncate max-w-md hidden md:inline-block group-data-[state=open]:opacity-0 transition-opacity">
                          {quotesText.substring(0, 60)}...
                        </span>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-4 pt-2">
                      <Textarea 
                        value={quotesText} 
                        onChange={(e) => setQuotesText(e.target.value)}
                        className="min-h-[100px] bg-slate-50 border-slate-200 focus-visible:ring-teal-500 text-sm leading-relaxed"
                        placeholder="What quotes are active? Any updates?"
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-jobs" className="border-b border-slate-100 px-2">
                    <AccordionTrigger className="hover:no-underline py-4 px-2 text-sm font-semibold text-slate-800 data-[state=open]:text-teal-700 transition-colors group">
                      <div className="flex items-center gap-3 text-left">
                        <span>Active Jobs</span>
                        {jobsText && <span className="text-xs font-normal text-slate-400 truncate max-w-md hidden md:inline-block group-data-[state=open]:opacity-0 transition-opacity">
                          {jobsText.substring(0, 60)}...
                        </span>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-4 pt-2">
                      <Textarea 
                        value={jobsText} 
                        onChange={(e) => setJobsText(e.target.value)}
                        className="min-h-[100px] bg-slate-50 border-slate-200 focus-visible:ring-teal-500 text-sm leading-relaxed"
                        placeholder="Summarize active jobs, issues, milestones..."
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-sa" className="border-none px-2">
                    <AccordionTrigger className="hover:no-underline py-4 px-2 text-sm font-semibold text-slate-800 data-[state=open]:text-teal-700 transition-colors group">
                      <div className="flex items-center gap-3 text-left">
                        <span>Service Agreements</span>
                        {saText && <span className="text-xs font-normal text-slate-400 truncate max-w-md hidden md:inline-block group-data-[state=open]:opacity-0 transition-opacity">
                          {saText.substring(0, 60)}...
                        </span>}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-2 pb-4 pt-2">
                      <Textarea 
                        value={saText} 
                        onChange={(e) => setSaText(e.target.value)}
                        className="min-h-[100px] bg-slate-50 border-slate-200 focus-visible:ring-teal-500 text-sm leading-relaxed"
                        placeholder="SA renewals, concerns, new agreements..."
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </section>

            {/* SECTION 5: AI Coaching */}
            <section className="space-y-4 pt-4 border-t border-slate-200">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="ai-coaching" className="border-none bg-indigo-50/50 rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                  <AccordionTrigger className="hover:no-underline px-5 py-4 data-[state=open]:bg-indigo-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-slate-800 text-sm">AI Coaching Insights</span>
                      <Badge className="ml-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none shadow-none text-xs">4 items</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-5 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                      <CoachingCard color="border-indigo-400 bg-white" title="Quiet Quotes" 
                        message="3 quotes went quiet this week — Beacon Capital, JLL Church, and Delta Star. Follow-up plan?" />
                      <CoachingCard color="border-emerald-400 bg-white" title="Win Pattern" 
                        message="You closed 2 deals this week. What made those conversations click?" />
                      <CoachingCard color="border-amber-400 bg-white" title="Task Backlog" 
                        message="4 tasks still open from last week. Which ones are blocking progress?" />
                      <CoachingCard color="border-blue-400 bg-white" title="Client Outreach Mix" 
                        message="18 emails and 6 calls. Are your top accounts getting the right mix?" />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

          </div>
        </div>
      </div>

      {/* ── Chat Panel (Right Side) ── */}
      <aside className="w-80 flex flex-col border-l border-slate-200 bg-white shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)] z-20">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-bold text-slate-900">Manager Discussion</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-100">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Dan Online</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50">
          {messages.map((msg) => {
            if ((msg as any).from === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-6">
                  <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 shadow-sm rounded-full px-4 py-1.5 text-center">
                    {msg.text}
                  </span>
                </div>
              );
            }
            const isManager = msg.from === 'manager';
            return (
              <div key={msg.id} className="space-y-1.5">
                {msg.highlight && (
                  <div className="ml-10 mb-2 bg-white border border-slate-200 shadow-sm rounded-lg p-2.5 relative">
                    <div className="absolute -left-2.5 top-3 h-px w-2.5 bg-slate-200"></div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CornerUpLeft className="h-3 w-3 text-teal-500" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referencing Highlight</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium leading-snug">{msg.highlightRef}</p>
                  </div>
                )}
                <div className={`flex gap-3 ${isManager ? '' : 'flex-row-reverse'}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm border ${
                    isManager ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-teal-50 text-teal-700 border-teal-100'
                  }`}>
                    {msg.initials}
                  </div>
                  <div className={`flex flex-col gap-1 max-w-[80%] ${isManager ? 'items-start' : 'items-end'}`}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-slate-700">{msg.name}</span>
                      <span className="text-[10px] font-medium text-slate-400">{msg.time}</span>
                    </div>
                    <div className={`px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                      isManager
                        ? 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-none'
                        : 'bg-teal-600 text-white rounded-2xl rounded-tr-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Reply as Sarah M..."
                className="min-h-[44px] max-h-32 py-3 px-4 resize-none text-sm border-slate-200 focus-visible:ring-teal-500 rounded-xl bg-slate-50 shadow-inner"
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
              className="h-11 w-11 rounded-xl bg-teal-600 hover:bg-teal-700 shadow-sm flex-shrink-0 transition-transform active:scale-95"
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
          <p className="text-[10px] font-medium text-center text-slate-400 mt-2">Press Enter to send · Shift+Enter for line break</p>
        </div>
      </aside>
    </div>
  );
}

// ── Subcomponents ──

function HealthRow({ name, health, score, lastContact }: { name: string, health: string, score: number, lastContact: string }) {
  let colorClass = "bg-emerald-500";
  if (health === "At Risk") colorClass = "bg-rose-500";
  if (health === "Watch") colorClass = "bg-amber-500";

  return (
    <div className="group flex items-center grid grid-cols-[1fr_2fr_120px] gap-4 py-2 px-2 hover:bg-slate-50 rounded-lg transition-colors">
      <div className="font-semibold text-sm text-slate-800 truncate">{name}</div>
      <div className="flex items-center gap-3">
        <div className="w-16 flex-shrink-0">
          {health === "At Risk" && <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] py-0 h-5 w-full justify-center">At Risk</Badge>}
          {health === "Watch" && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 h-5 w-full justify-center">Watch</Badge>}
          {health === "Healthy" && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 h-5 w-full justify-center">Healthy</Badge>}
        </div>
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${score}%` }}></div>
        </div>
      </div>
      <div className="text-right text-xs font-medium text-slate-500 flex items-center justify-end gap-1.5">
        <AlertCircle className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" /> {lastContact}
      </div>
    </div>
  );
}

function CoachingCard({ title, message, color }: { title: string, message: string, color: string }) {
  return (
    <Card className={`shadow-sm border-l-4 ${color} border-y-slate-200 border-r-slate-200 overflow-hidden`}>
      <CardContent className="p-4">
        <h3 className="font-bold text-slate-800 text-sm mb-1.5">{title}</h3>
        <p className="text-xs font-medium text-slate-600 leading-relaxed">{message}</p>
      </CardContent>
    </Card>
  );
}
