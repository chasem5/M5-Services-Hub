import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  CheckSquare,
  Bell,
  MessageSquare,
  Sparkles,
  ChevronUp,
  ChevronDown,
  GripHorizontal,
  Plus,
  Send
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Textarea } from '../../ui/textarea';

type CardType = 'Deal' | 'Client' | 'Quote' | 'Task';

interface BoardCard {
  id: string;
  title: string;
  value?: string;
  type: CardType;
  note: string;
}

const INITIAL_BOARD = {
  wins: [
    { id: '1', title: 'JLL Downtown Tower', value: '$95,375', type: 'Deal' as CardType, note: 'Client confirmed Q2 start' },
    { id: '2', title: 'Beacon Capital Call', type: 'Client' as CardType, note: 'Generally happy, concern over weekend coverage' }
  ],
  active: [
    { id: '3', title: 'JLL Church Quote', value: '$660,000', type: 'Quote' as CardType, note: 'Following up' },
    { id: '4', title: 'Piedmont RFP', type: 'Deal' as CardType, note: 'Working on pricing proposal' }
  ],
  needsAttention: [
    { id: '5', title: 'Cushman & Wakefield', type: 'Client' as CardType, note: '12 days no contact' },
    { id: '6', title: 'Task Backlog', type: 'Task' as CardType, note: '4 overdue tasks blocking client progress' }
  ],
  flagged: [
    { id: '7', title: 'Beacon Capital Pricing', value: '$212,550', type: 'Deal' as CardType, note: 'Need manager input on discount strategy' }
  ]
};

const CHAT_MESSAGES = [
  { id: 1, from: 'manager', name: 'Dan Chen', initials: 'DC', time: 'Mon 9:12 AM', text: "Sarah, I can see your note on the Beacon Capital pricing concern. Have you pulled comparable quotes from similar accounts yet?" },
  { id: 2, from: 'am', name: 'Sarah M.', initials: 'SM', time: 'Mon 9:34 AM', text: "Not yet — wanted to loop you in first before I committed to anything." },
  { id: 3, from: 'manager', name: 'Dan Chen', initials: 'DC', time: 'Mon 9:36 AM', text: "Perfect. Also — great win on JLL Downtown! What was the turning point in that conversation?" }
];

export function KanbanBoard() {
  const [board, setBoard] = useState(INITIAL_BOARD);
  const [status, setStatus] = useState<'draft' | 'ready'>('draft');
  const [expandedBottom, setExpandedBottom] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

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

  const handleMarkReady = () => {
    setStatus('ready');
  };

  return (
    <div className="flex h-screen bg-[#f4f5f7] overflow-hidden font-sans text-slate-900">
      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4 z-10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Weekly Report</h1>
              <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-700">
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium px-1 text-slate-700">Mar 31 – Apr 6</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-700">
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              {status === 'draft' ? (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Draft</Badge>
              ) : (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">Ready for Review</Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mr-4">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> 18 Emails</span>
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> 6 Calls</span>
                <span className="flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5" /> 18/22 Tasks</span>
              </div>
              <Button 
                size="sm" 
                onClick={handleMarkReady}
                disabled={status === 'ready'}
                className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5 text-xs shadow-sm"
              >
                <Bell className="h-3.5 w-3.5" />
                Mark Ready for Review
              </Button>
              <div className="h-8 w-px bg-slate-200 mx-1"></div>
              <Avatar className="h-8 w-8 ring-2 ring-white">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">SM</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex gap-6 h-full min-w-max pb-4">
            
            {/* Wins Column */}
            <div className="w-80 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm text-emerald-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  Wins This Week
                </h3>
                <span className="text-xs font-medium text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{board.wins.length}</span>
              </div>
              <div className="flex-1 bg-emerald-50/50 rounded-xl border border-emerald-100/50 p-2.5 flex flex-col gap-2.5 overflow-y-auto">
                {board.wins.map(card => (
                  <KanbanCard key={card.id} card={card} expanded={expandedCardId === card.id} onToggle={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)} />
                ))}
                <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-emerald-200 text-emerald-600/70 text-xs font-medium hover:bg-emerald-100/50 hover:text-emerald-700 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add card
                </button>
              </div>
            </div>

            {/* Active Column */}
            <div className="w-80 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm text-blue-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Active & Moving
                </h3>
                <span className="text-xs font-medium text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{board.active.length}</span>
              </div>
              <div className="flex-1 bg-blue-50/50 rounded-xl border border-blue-100/50 p-2.5 flex flex-col gap-2.5 overflow-y-auto">
                {board.active.map(card => (
                  <KanbanCard key={card.id} card={card} expanded={expandedCardId === card.id} onToggle={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)} />
                ))}
                <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-blue-200 text-blue-600/70 text-xs font-medium hover:bg-blue-100/50 hover:text-blue-700 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add card
                </button>
              </div>
            </div>

            {/* Needs Attention Column */}
            <div className="w-80 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm text-amber-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  Needs Attention
                </h3>
                <span className="text-xs font-medium text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{board.needsAttention.length}</span>
              </div>
              <div className="flex-1 bg-amber-50/50 rounded-xl border border-amber-100/50 p-2.5 flex flex-col gap-2.5 overflow-y-auto">
                {board.needsAttention.map(card => (
                  <KanbanCard key={card.id} card={card} expanded={expandedCardId === card.id} onToggle={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)} />
                ))}
                <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-amber-200 text-amber-600/70 text-xs font-medium hover:bg-amber-100/50 hover:text-amber-700 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add card
                </button>
              </div>
            </div>

            {/* Flagged Column */}
            <div className="w-80 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-semibold text-sm text-rose-800 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  Flag for Manager
                </h3>
                <span className="text-xs font-medium text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full">{board.flagged.length}</span>
              </div>
              <div className="flex-1 bg-rose-50/50 rounded-xl border border-rose-100/50 p-2.5 flex flex-col gap-2.5 overflow-y-auto">
                {board.flagged.map(card => (
                  <KanbanCard key={card.id} card={card} expanded={expandedCardId === card.id} onToggle={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)} />
                ))}
                <button className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-rose-200 text-rose-600/70 text-xs font-medium hover:bg-rose-100/50 hover:text-rose-700 transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add card
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Panel */}
        <div className={`bg-white border-t border-slate-200 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out shrink-0 z-20 ${expandedBottom ? 'h-64' : 'h-14'}`}>
          <div className="h-14 px-6 flex items-center justify-between cursor-pointer" onClick={() => setExpandedBottom(!expandedBottom)}>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-800 flex items-center gap-2">
                Report Summary
                {expandedBottom ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
              </span>
              <div className="h-4 w-px bg-slate-200"></div>
              <div className="text-xs text-slate-500 truncate max-w-xl">
                {board.wins.length} wins, {board.active.length} active, {board.needsAttention.length} need attention, {board.flagged.length} flagged
              </div>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 gap-1.5 py-1 px-3 cursor-pointer shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> 
              4 coaching nudges
            </Badge>
          </div>
          
          {expandedBottom && (
            <div className="px-6 pb-6 pt-2 h-[calc(100%-3.5rem)] overflow-y-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <CoachingCard 
                  title="Quiet Quotes" 
                  color="bg-blue-50/50 border-blue-100 text-blue-900" 
                  iconColor="text-blue-500"
                  message="3 quotes went quiet this week. Do you have a follow-up plan for each one?" 
                />
                <CoachingCard 
                  title="Win Pattern" 
                  color="bg-emerald-50/50 border-emerald-100 text-emerald-900" 
                  iconColor="text-emerald-500"
                  message="You closed 2 deals. What made those conversations click?" 
                />
                <CoachingCard 
                  title="Task Backlog" 
                  color="bg-amber-50/50 border-amber-100 text-amber-900" 
                  iconColor="text-amber-500"
                  message="4 tasks are still open. Which ones are blocking client progress?" 
                />
                <CoachingCard 
                  title="Client Outreach" 
                  color="bg-purple-50/50 border-purple-100 text-purple-900" 
                  iconColor="text-purple-500"
                  message="You logged 18 emails and 6 calls. Are top accounts getting enough touchpoints?" 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Sidebar: Manager Comments ── */}
      <aside className="w-[280px] shrink-0 flex flex-col border-l border-slate-200 bg-white z-10 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.02)]">
        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
            <MessageSquare className="h-4 w-4 text-slate-400" />
            Manager Notes
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400"></div>
            Dan online
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => {
            const isManager = msg.from === 'manager';
            return (
              <div key={msg.id} className={`flex flex-col gap-1 ${isManager ? 'items-start' : 'items-end'}`}>
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-xs font-medium text-slate-700">{msg.name}</span>
                  <span className="text-[10px] text-slate-400">{msg.time}</span>
                </div>
                <div className={`text-sm p-2.5 rounded-xl max-w-[90%] leading-relaxed shadow-sm ${
                  isManager 
                    ? 'bg-slate-100 text-slate-800 rounded-tl-sm' 
                    : 'bg-slate-800 text-white rounded-tr-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Textarea
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Add a note..."
              className="min-h-[80px] max-h-32 resize-none text-sm border-slate-200 pr-10 py-2.5 rounded-xl focus:ring-slate-200 focus:border-slate-300 shadow-sm"
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
              className="absolute right-2 bottom-2 h-7 w-7 rounded-lg bg-slate-900 hover:bg-slate-800 shadow-sm"
            >
              <Send className="h-3.5 w-3.5 text-white" />
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ── Subcomponents ──

function KanbanCard({ card, expanded, onToggle }: { card: BoardCard, expanded: boolean, onToggle: () => void }) {
  
  const typeStyles = {
    Deal: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Client: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    Quote: 'bg-blue-100 text-blue-700 border-blue-200',
    Task: 'bg-amber-100 text-amber-700 border-amber-200'
  };

  return (
    <div className="group bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden" onClick={onToggle}>
      <div className="absolute top-2 right-2 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripHorizontal className="h-4 w-4" />
      </div>
      
      <div className="flex items-start justify-between mb-2 pr-6">
        <div className="flex flex-col gap-1.5">
          <Badge variant="outline" className={`text-[10px] font-semibold px-1.5 py-0 uppercase tracking-wider ${typeStyles[card.type]} border shadow-none`}>
            {card.type}
          </Badge>
          <h4 className="text-sm font-semibold text-slate-900 leading-tight">{card.title}</h4>
        </div>
      </div>
      
      {card.value && (
        <div className="text-sm font-medium text-slate-600 mb-2">
          {card.value}
        </div>
      )}
      
      <div className={`mt-2 ${expanded ? '' : 'truncate'} text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-2 leading-relaxed`}>
        {card.note}
      </div>
      
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
          <Avatar className="h-5 w-5 border border-slate-200">
            <AvatarFallback className="bg-slate-100 text-slate-600 text-[9px] font-bold">SM</AvatarFallback>
          </Avatar>
          Sarah M.
        </div>
      </div>
    </div>
  );
}

function CoachingCard({ title, message, color, iconColor }: { title: string, message: string, color: string, iconColor: string }) {
  return (
    <div className={`p-4 rounded-xl border ${color} shadow-sm`}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className={`h-4 w-4 ${iconColor}`} />
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <p className="text-xs leading-relaxed opacity-80">{message}</p>
    </div>
  );
}