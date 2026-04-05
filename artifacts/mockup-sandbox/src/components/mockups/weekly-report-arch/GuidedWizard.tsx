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
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  CornerUpLeft,
  Activity,
  Hash,
  CheckCircle2,
  Flag,
  MessageCircle,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardDescription } from '../../ui/card';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';

const STEPS = [
  { id: 1, title: 'Your Week at a Glance' },
  { id: 2, title: 'Things to Think About' },
  { id: 3, title: 'Customer Health Check' },
  { id: 4, title: 'Your Narrative' },
  { id: 5, title: 'Spotlight & Submit' },
];

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

export function GuidedWizard() {
  const [currentStep, setCurrentStep] = useState(4); // Default to Narrative per requirements

  const [bdText, setBdText] = useState("Met with the facilities team at Beacon Capital. They are generally happy with our janitorial services but expressed some concern over weekend coverage. I promised to review staffing and follow up by Wednesday. Also had a good introductory call with the new property manager at 100 Main St.");
  const [quotesText, setQuotesText] = useState("");
  const [jobsText, setJobsText] = useState("");
  const [saText, setSaText] = useState("");
  
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  
  const [expandedCoaching, setExpandedCoaching] = useState<number | null>(null);

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
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
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* ── Main Content Area (Wizard) ── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header / Stepper */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 shrink-0 z-10 flex flex-col items-center">
          <div className="w-full max-w-3xl">
            <h1 className="text-xl font-semibold mb-6 text-center">Weekly Report: Mar 31 – Apr 6</h1>
            
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-slate-100 -z-10 rounded-full"></div>
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-blue-500 -z-10 rounded-full transition-all duration-300"
                style={{ width: ((currentStep - 1) / (STEPS.length - 1)) * 100 + '%' }}
              ></div>
              
              {STEPS.map((step) => {
                const isCompleted = step.id < currentStep;
                const isCurrent = step.id === currentStep;
                
                return (
                  <div key={step.id} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => setCurrentStep(step.id)}>
                    <div className={\`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 bg-white
                      \${isCompleted ? 'border-2 border-blue-500 text-blue-600' : ''}
                      \${isCurrent ? 'border-2 border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200' : ''}
                      \${!isCompleted && !isCurrent ? 'border-2 border-slate-200 text-slate-400' : ''}
                    \`}>
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : step.id}
                    </div>
                    <span className={\`text-[11px] font-medium max-w-[80px] text-center leading-tight transition-colors duration-300
                      \${isCurrent ? 'text-blue-700' : isCompleted ? 'text-slate-600' : 'text-slate-400'}
                    \`}>
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-10">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[400px] transition-all duration-300 ease-in-out">
              
              {/* Step 1: Activity Snapshot */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">Your Week at a Glance</h2>
                    <p className="text-slate-500">Review your logged activity before adding context.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <ActivityCard icon={<Mail className="h-5 w-5 text-blue-500" />} label="Emails" value="18" sub="logged this week" bg="bg-blue-50" />
                    <ActivityCard icon={<Phone className="h-5 w-5 text-violet-500" />} label="Phone Calls" value="6" sub="logged this week" bg="bg-violet-50" />
                    <ActivityCard icon={<Hash className="h-5 w-5 text-teal-500" />} label="Other Events" value="5" sub="site visits, notes, etc." bg="bg-teal-50" />
                    <ActivityCard icon={<FileText className="h-5 w-5 text-indigo-500" />} label="Quotes" value="7 created" sub="4 sent" bg="bg-indigo-50" />
                    <ActivityCard icon={<CheckSquare className="h-5 w-5 text-emerald-500" />} label="Tasks Done" value="18 / 22" sub="4 still open" bg="bg-emerald-50" />
                    <ActivityCard icon={<Target className="h-5 w-5 text-amber-500" />} label="Deals" value="2 Won" sub="1 Lost" bg="bg-amber-50" />
                  </div>
                </div>
              )}

              {/* Step 2: AI Coaching */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-8">
                    <div className="mx-auto w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-3">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">Things to Think About</h2>
                    <p className="text-slate-500">AI-generated prompts based on this week's data. Jot down quick thoughts.</p>
                  </div>

                  <div className="space-y-4">
                    <CoachingPrompt 
                      id={1} title="Quiet Quotes" 
                      message="3 quotes went quiet this week — Beacon Capital, JLL Church, and Delta Star. Do you have a follow-up plan for each one?"
                      expanded={expandedCoaching === 1}
                      onToggle={() => setExpandedCoaching(expandedCoaching === 1 ? null : 1)}
                    />
                    <CoachingPrompt 
                      id={2} title="Win Pattern" 
                      message="You closed 2 deals this week. What made those conversations click? How can you replicate that next week?"
                      expanded={expandedCoaching === 2}
                      onToggle={() => setExpandedCoaching(expandedCoaching === 2 ? null : 2)}
                    />
                    <CoachingPrompt 
                      id={3} title="Task Backlog" 
                      message="4 tasks are still open from last week. Which ones are blocking client progress vs. waiting on others?"
                      expanded={expandedCoaching === 3}
                      onToggle={() => setExpandedCoaching(expandedCoaching === 3 ? null : 3)}
                    />
                    <CoachingPrompt 
                      id={4} title="Client Outreach Mix" 
                      message="You logged 18 emails and 6 calls this week. Are your top accounts getting the right mix of touchpoints?"
                      expanded={expandedCoaching === 4}
                      onToggle={() => setExpandedCoaching(expandedCoaching === 4 ? null : 4)}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Customer Health */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">Customer Health Check</h2>
                    <p className="text-slate-500">Flag any accounts that need manager attention this week.</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-3 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <div>Client</div>
                      <div className="w-24 text-center">Health</div>
                      <div className="w-24 text-right">Pipeline</div>
                      <div className="w-12 text-center">Flag</div>
                    </div>
                    
                    <HealthRow name="Cushman and Wakefield" health="At Risk" pipeline="$84,000" flagged={false} />
                    <HealthRow name="JLL Church" health="Watch" pipeline="$660,000" flagged={false} />
                    <HealthRow name="Beacon Capital" health="Healthy" pipeline="$212,550" flagged={true} />
                    <HealthRow name="Piedmont Office Realty" health="Healthy" pipeline="$145,200" flagged={false} />
                    <HealthRow name="CBRE Downtown" health="Healthy" pipeline="$95,000" flagged={false} />
                  </div>
                </div>
              )}

              {/* Step 4: Narrative */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">Your Narrative</h2>
                    <p className="text-slate-500">Provide qualitative context for your manager.</p>
                  </div>

                  <div className="space-y-8">
                    <ReportSection 
                      title="Business Development & Customer Success" 
                      value={bdText} onChange={setBdText} 
                      placeholder="Describe your key meetings and relationship-building activities..." 
                    />
                    <ReportSection 
                      title="Active Quotes & Proposals" 
                      value={quotesText} onChange={setQuotesText} 
                      placeholder="What quotes are moving forward? Any blockers?" 
                    />
                    <ReportSection 
                      title="Jobs in Progress" 
                      value={jobsText} onChange={setJobsText} 
                      placeholder="Summarize active jobs, any issues or milestones..." 
                    />
                    <ReportSection 
                      title="Service Agreements" 
                      value={saText} onChange={setSaText} 
                      placeholder="Upcoming renewals or newly signed agreements..." 
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Spotlight & Submit */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">Spotlight & Submit</h2>
                    <p className="text-slate-500">Final review. Pin specific items for your manager to see.</p>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input placeholder="Search quotes, jobs, or clients to pin..." className="pl-10 py-6 bg-slate-50 border-slate-200 text-sm rounded-xl focus-visible:ring-blue-500" />
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-slate-700">Pinned Items</h4>
                      <HighlightedItem title="JLL Downtown Tower Maintenance Package" value="$95,375" status="Win" note="Client confirmed Q2 start. Great win for the team." />
                      <HighlightedItem title="Beacon Capital Annual Janitorial" value="$212,550" status="Need Help" note="Pricing concern. Need manager input on discount strategy." />
                    </div>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 text-blue-500">
                      <Send className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">Ready to send?</h3>
                    <p className="text-sm text-slate-600 mb-6">Your manager will be notified and can review your report.</p>
                    
                    <div className="flex gap-3 w-full justify-center">
                      <Button variant="outline" className="w-1/3 bg-white">Save Draft</Button>
                      <Button className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200">Mark Ready for Review</Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Footer / Navigation */}
        <div className="bg-white border-t border-slate-200 px-8 py-4 shrink-0 flex items-center justify-between">
          <div>
            {currentStep > 1 ? (
              <Button variant="ghost" onClick={handleBack} className="text-slate-600 hover:bg-slate-50 gap-2">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <Button variant="ghost" disabled className="invisible">Back</Button>
            )}
          </div>
          
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Auto-saved just now
          </div>

          <div>
            {currentStep < 5 ? (
              <Button onClick={handleNext} className="bg-slate-900 hover:bg-slate-800 text-white gap-2 px-6">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button disabled className="invisible">Next</Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Chat Panel ── */}
      <aside className="w-[340px] flex flex-col border-l border-slate-200 bg-white shrink-0 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.05)] z-20">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Dan Chen</h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Online
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 bg-slate-50/30">
          {messages.map((msg) => {
            const isManager = msg.from === 'manager';
            return (
              <div key={msg.id} className="space-y-1.5">
                {msg.highlight && (
                  <div className="ml-10 mb-2 bg-blue-50/80 border border-blue-100 rounded-lg p-2.5 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CornerUpLeft className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-[11px] text-blue-600 font-semibold uppercase tracking-wide">Referencing</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium truncate">{msg.highlightRef}</p>
                  </div>
                )}
                <div className={\`flex gap-3 \${isManager ? '' : 'flex-row-reverse'}\`}>
                  <div className={\`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 shadow-sm \${
                    isManager ? 'bg-white text-indigo-700 border border-slate-200' : 'bg-blue-600 text-white'
                  }\`}>
                    {msg.initials}
                  </div>
                  <div className={\`flex flex-col gap-1 max-w-[75%] \${isManager ? 'items-start' : 'items-end'}\`}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-slate-700">{msg.name}</span>
                      <span className="text-[10px] text-slate-400">{msg.time}</span>
                    </div>
                    <div className={\`px-3.5 py-2.5 text-sm leading-relaxed shadow-sm \${
                      isManager
                        ? 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm'
                        : 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                    }\`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Message input */}
        <div className="px-4 py-4 border-t border-slate-200 bg-white">
          <div className="relative">
            <Textarea
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Reply to Dan..."
              className="min-h-[80px] max-h-32 resize-none text-sm border-slate-200 bg-slate-50 focus:bg-white pr-12 py-3 rounded-xl focus-visible:ring-blue-500 transition-colors"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!chatMessage.trim()}
              className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:bg-slate-300"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-2">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </aside>

    </div>
  );
}

// ── Subcomponents ──

function ActivityCard({ icon, label, value, sub, bg }: { icon: React.ReactNode, label: string, value: string, sub: string, bg: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center gap-4 hover:border-slate-200 transition-colors">
      <div className={\`h-12 w-12 rounded-xl \${bg} flex items-center justify-center flex-shrink-0\`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900 leading-none mb-1">{value}</p>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function CoachingPrompt({ id, title, message, expanded, onToggle }: { id: number, title: string, message: string, expanded: boolean, onToggle: () => void }) {
  return (
    <div className={\`border rounded-xl transition-all duration-200 \${expanded ? 'border-blue-300 bg-blue-50/30 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}\`}>
      <div 
        className="p-4 cursor-pointer flex items-start gap-4"
        onClick={onToggle}
      >
        <div className="mt-0.5 flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="font-medium text-slate-900 text-sm">{title}</h4>
            <div className={\`text-xs font-medium px-2 py-0.5 rounded-full transition-colors \${expanded ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}\`}>
              {expanded ? 'Collapse' : 'Add Note'}
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>
      
      {expanded && (
        <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <Textarea 
            placeholder="Jot down a quick note for your report..." 
            className="min-h-[80px] text-sm bg-white border-blue-200 focus-visible:ring-blue-500" 
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

function HealthRow({ name, health, pipeline, flagged: initialFlagged }: { name: string, health: string, pipeline: string, flagged: boolean }) {
  const [flagged, setFlagged] = useState(initialFlagged);
  
  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 p-3 items-center border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
      <div className="font-medium text-sm text-slate-900 truncate">{name}</div>
      <div className="w-24 flex justify-center">
        {health === 'At Risk' ? (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-medium text-[10px] w-full justify-center">At Risk</Badge>
        ) : health === 'Watch' ? (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium text-[10px] w-full justify-center">Watch</Badge>
        ) : (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium text-[10px] w-full justify-center">Healthy</Badge>
        )}
      </div>
      <div className="w-24 text-right text-sm text-slate-600 font-medium">{pipeline}</div>
      <div className="w-12 flex justify-center">
        <button 
          onClick={() => setFlagged(!flagged)}
          className={\`p-1.5 rounded-md transition-colors \${flagged ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'}\`}
        >
          <Flag className={\`h-4 w-4 \${flagged ? 'fill-current' : ''}\`} />
        </button>
      </div>
    </div>
  );
}

function ReportSection({ title, value, onChange, placeholder }: { title: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-800 block">{title}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[140px] resize-none border-slate-200 focus:border-blue-500 focus:ring-blue-100 text-sm leading-relaxed p-4 rounded-xl shadow-sm"
      />
    </div>
  );
}

function HighlightedItem({ title, value, status, note }: { title: string, value: string, status: 'Win' | 'Need Help', note: string }) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group">
      <button className="absolute right-3 top-3 p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all">
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-center gap-3 mb-2 pr-8">
        <Badge variant="secondary" className={\`text-[10px] uppercase tracking-wider px-2 py-0.5 \${
          status === 'Win'
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-amber-100 text-amber-800'
        }\`}>
          {status}
        </Badge>
        <span className="text-sm font-semibold text-slate-700">{value}</span>
      </div>
      
      <h4 className="font-semibold text-slate-900 text-base mb-2">{title}</h4>
      
      <div className="bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100 text-sm text-slate-600 italic">
        "{note}"
      </div>
    </div>
  );
}
