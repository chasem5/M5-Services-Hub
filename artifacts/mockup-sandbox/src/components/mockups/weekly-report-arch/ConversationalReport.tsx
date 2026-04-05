import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Mail, 
  Phone, 
  Hash, 
  FileText, 
  CheckSquare, 
  Target,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Activity,
  ChevronRight
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Textarea } from '../../ui/textarea';
import { ScrollArea } from '../../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';

const PRELOADED_MESSAGES = [
  {
    id: 1,
    role: 'ai',
    text: "Hi Sarah! It's time for your weekly reflection. I see you've had a busy week with 18 emails, 6 calls, and 5 other events logged.",
    time: "9:00 AM"
  },
  {
    id: 2,
    role: 'ai',
    text: "Let's start with the Beacon Capital pricing concern you flagged. Have you pulled comparable quotes from similar accounts yet to discuss with Dan?",
    time: "9:01 AM"
  },
  {
    id: 3,
    role: 'am',
    text: "Not yet — wanted to loop Dan in first before I committed to anything. I can pull comps and get back to him by EOD today.",
    time: "9:12 AM"
  },
  {
    id: 4,
    role: 'ai',
    text: "Got it. I'll add that to your BD narrative. You also had a great win on JLL Downtown ($95k)! What was the turning point in that conversation?",
    time: "9:12 AM"
  },
  {
    id: 5,
    role: 'am',
    text: "Honestly the site walk made a big difference. Once they saw we already knew the building they stopped shopping on price.",
    time: "9:15 AM"
  },
  {
    id: 6,
    role: 'ai',
    text: "That's a great insight about the site walks. Finally, I noticed 3 quotes went quiet this week — Beacon Capital, JLL Church, and Delta Star. Do you have a follow-up plan?",
    time: "9:16 AM"
  }
];

export function ConversationalReport() {
  const [messages, setMessages] = useState(PRELOADED_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'draft' | 'ready'>('draft');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const newMsg = {
      id: Date.now(),
      role: 'am',
      text: inputValue.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMsg]);
    setInputValue("");
    
    // Simulate AI thinking and replying if it's the first follow up
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'ai',
        text: "Thanks! I've updated the report preview with your latest notes. Review it on the right, and if everything looks good, you can mark it ready for Dan.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-[#f9fafb] font-sans text-slate-900 overflow-hidden">
      
      {/* Left Panel: Conversation Thread */}
      <div className="w-[55%] flex flex-col border-r border-slate-200 bg-[#f4f5f7] relative shadow-[inset_-10px_0_20px_-15px_rgba(0,0,0,0.05)]">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200/60 bg-[#f4f5f7]/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-600/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-slate-900">CoachAI Reflection</h1>
              <p className="text-sm text-slate-500">Mar 31 – Apr 6, 2026</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-8" ref={scrollRef}>
          <div className="space-y-6 max-w-2xl mx-auto">
            {messages.map((msg, i) => {
              const isAi = msg.role === 'ai';
              const showAvatar = isAi && (i === 0 || messages[i-1].role !== 'ai');
              
              return (
                <div key={msg.id} className={`flex ${isAi ? 'justify-start' : 'justify-end'} relative group`}>
                  {isAi && (
                    <div className="w-8 flex-shrink-0 mr-3">
                      {showAvatar && (
                         <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 mt-1">
                           <Sparkles className="h-4 w-4 text-indigo-600" />
                         </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${isAi ? 'items-start' : 'items-end'} max-w-[80%]`}>
                    <div 
                      className={`px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                        isAi 
                          ? 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-200' 
                          : 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {msg.time}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex justify-start relative">
                <div className="w-8 flex-shrink-0 mr-3">
                   <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200 mt-1">
                     <Sparkles className="h-4 w-4 text-indigo-600" />
                   </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-slate-200">
          <div className="max-w-2xl mx-auto">
            <div className="relative shadow-sm rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all bg-white">
              <Textarea 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Respond to CoachAI..."
                className="min-h-[80px] max-h-[200px] resize-none border-0 focus-visible:ring-0 text-[15px] p-4 rounded-xl bg-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <Button 
                  size="icon" 
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  className="h-8 w-8 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center mt-3 font-medium">
              Your manager will see this thread alongside the report.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Live Report Preview */}
      <div className="w-[45%] flex flex-col bg-white relative overflow-hidden">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Report Preview</h2>
            {status === 'draft' ? (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-xs font-medium">
                Draft
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 gap-1 text-xs font-medium">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </Badge>
            )}
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Auto-updating from chat</span>
          </div>
        </div>

        {/* Scrollable Report Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-xl mx-auto space-y-8">
            
            {/* Activity Summary (Compact) */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity Snapshot</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-2xl font-semibold text-slate-900">18</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Emails</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-2xl font-semibold text-slate-900">6</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Calls</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-2xl font-semibold text-slate-900">5</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Other</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-2xl font-semibold text-slate-900">7</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Quotes</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-xl font-semibold text-slate-900 mt-1">18/22</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Tasks Done</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-xl font-semibold text-slate-900 mt-1">2 Won</div>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">Deals</div>
                </div>
              </div>
            </section>

            {/* AI-Generated Narrative */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">BD & CSM Narrative</h3>
              <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-5 space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed relative">
                  <span className="absolute -left-3 top-0 bottom-0 w-0.5 bg-indigo-200 rounded-full" />
                  Not yet pulled comps for Beacon Capital pricing concern — wanted to loop Dan in first before committing. Will pull comps and get back by EOD today.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed relative">
                  <span className="absolute -left-3 top-0 bottom-0 w-0.5 bg-indigo-200 rounded-full" />
                  JLL Downtown ($95k) won because the site walk made a big difference. Once they saw we already knew the building, they stopped shopping on price.
                </p>
                {messages.length > 6 && (
                  <p className="text-sm text-slate-700 leading-relaxed relative animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <span className="absolute -left-3 top-0 bottom-0 w-0.5 bg-indigo-200 rounded-full" />
                    {messages[messages.length - 1].role === 'am' ? messages[messages.length - 1].text : 'Drafting updates based on discussion...'}
                  </p>
                )}
              </div>
            </section>

            {/* Spotlight */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Spotlight Items</h3>
              <div className="space-y-3">
                <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-slate-900 text-sm">JLL Downtown Tower Maintenance Package</h4>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Win</Badge>
                  </div>
                  <div className="text-sm text-slate-500 mb-3">$95,375</div>
                  <div className="bg-slate-50 rounded-md p-3 text-xs text-slate-600 border border-slate-100">
                    Client confirmed Q2 start. Great win for the team.
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-slate-900 text-sm">Beacon Capital Annual Janitorial</h4>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Need Help</Badge>
                  </div>
                  <div className="text-sm text-slate-500 mb-3">$212,550</div>
                  <div className="bg-slate-50 rounded-md p-3 text-xs text-slate-600 border border-slate-100">
                    Pricing concern. Need manager input on discount strategy.
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-white z-10">
          <div className="max-w-xl mx-auto flex flex-col gap-3">
            <Button 
              className={`w-full ${status === 'ready' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'} text-white shadow-sm h-11 text-sm`}
              onClick={() => setStatus(status === 'draft' ? 'ready' : 'draft')}
            >
              {status === 'ready' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Ready for Review
                </>
              ) : (
                'Mark Ready for Review'
              )}
            </Button>
            <p className="text-xs text-center text-slate-500">
              Your replies are actively shaping this report.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
