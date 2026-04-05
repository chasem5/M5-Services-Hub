import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Mail, 
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
  Clock
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';

export function WeeklyReport() {
  const [bdText, setBdText] = useState("Met with the facilities team at Beacon Capital. They are generally happy with our janitorial services but expressed some concern over weekend coverage. I promised to review staffing and follow up by Wednesday. Also had a good introductory call with the new property manager at 100 Main St.");
  const [quotesText, setQuotesText] = useState("");
  const [jobsText, setJobsText] = useState("");
  const [saText, setSaText] = useState("");

  const isFormValid = bdText.trim().length > 0 || quotesText.trim().length > 0 || jobsText.trim().length > 0 || saText.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center pb-24 font-sans text-slate-900">
      <div className="w-full max-w-5xl px-6 py-10 space-y-10">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Weekly Report</h1>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
                Draft
              </Badge>
            </div>
            <p className="text-slate-500 text-sm">Account Manager Coaching & Activity Review</p>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border shadow-sm">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">Week of Mar 31 – Apr 6, 2026</span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-700">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Activity Snapshot */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={<Mail className="h-4 w-4 text-blue-500" />} label="Emails Sent" value="24" trend="up" />
            <StatCard icon={<FileText className="h-4 w-4 text-indigo-500" />} label="Quotes Created" value="7" />
            <StatCard icon={<Send className="h-4 w-4 text-sky-500" />} label="Quotes Sent" value="4" />
            <StatCard icon={<CheckSquare className="h-4 w-4 text-emerald-500" />} label="Tasks Completed" value="18 / 22" />
            <StatCard icon={<CalendarIcon className="h-4 w-4 text-purple-500" />} label="Meetings Held" value="3" />
            <StatCard icon={<Target className="h-4 w-4 text-amber-500" />} label="Deals" value="2 W | 1 L" />
          </div>
        </section>

        {/* AI Coaching */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-medium">Things to Think About</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CoachingCard 
              color="border-blue-400"
              title="Quiet Quotes"
              message="3 quotes went quiet this week — Beacon Capital, JLL Church, and Delta Star. Do you have a follow-up plan for each one?"
            />
            <CoachingCard 
              color="border-emerald-400"
              title="Win Pattern"
              message="You closed 2 deals this week. What made those conversations click? How can you replicate that next week?"
            />
            <CoachingCard 
              color="border-amber-400"
              title="Task Backlog"
              message="4 tasks are still open from last week. Which ones are blocking client progress vs. waiting on others?"
            />
            <CoachingCard 
              color="border-purple-400"
              title="Meeting Ratio"
              message="3 meetings this week — are you getting enough face time with your top 5 accounts?"
            />
          </div>
        </section>

        {/* Customer Health */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-800">Customer Health Snapshot</h2>
          <Card className="overflow-hidden shadow-sm border-slate-200">
            <Table>
              <TableHeader className="bg-slate-50 border-b border-slate-100">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium text-slate-500">Client</TableHead>
                  <TableHead className="font-medium text-slate-500">Health</TableHead>
                  <TableHead className="font-medium text-slate-500">Pipeline</TableHead>
                  <TableHead className="font-medium text-slate-500 text-right">Last Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Cushman and Wakefield</TableCell>
                  <TableCell><HealthBadge status="At Risk" /></TableCell>
                  <TableCell>$84,000</TableCell>
                  <TableCell className="text-right text-slate-500 flex items-center justify-end gap-1"><Clock className="h-3 w-3" /> 12 days ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">JLL Church</TableCell>
                  <TableCell><HealthBadge status="Watch" /></TableCell>
                  <TableCell>$660,000</TableCell>
                  <TableCell className="text-right text-slate-500 flex items-center justify-end gap-1"><Clock className="h-3 w-3" /> 3 days ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Beacon Capital</TableCell>
                  <TableCell><HealthBadge status="Healthy" /></TableCell>
                  <TableCell>$212,550</TableCell>
                  <TableCell className="text-right text-slate-500 flex items-center justify-end gap-1"><Clock className="h-3 w-3" /> 1 day ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Piedmont Office Realty</TableCell>
                  <TableCell><HealthBadge status="Healthy" /></TableCell>
                  <TableCell>$145,200</TableCell>
                  <TableCell className="text-right text-slate-500 flex items-center justify-end gap-1"><Clock className="h-3 w-3" /> 4 days ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">CBRE Downtown</TableCell>
                  <TableCell><HealthBadge status="Healthy" /></TableCell>
                  <TableCell>$95,000</TableCell>
                  <TableCell className="text-right text-slate-500 flex items-center justify-end gap-1"><Clock className="h-3 w-3" /> 2 days ago</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </section>

        {/* Report Sections */}
        <section className="space-y-6">
          <h2 className="text-lg font-medium text-slate-800">Weekly Narrative</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReportSection 
              title="BD & CSM" 
              value={bdText} 
              onChange={setBdText} 
              placeholder="Describe your business development and customer success activities this week..." 
            />
            <ReportSection 
              title="Quotes" 
              value={quotesText} 
              onChange={setQuotesText} 
              placeholder="What quotes are active? Any updates on pending approvals?" 
            />
            <ReportSection 
              title="Jobs" 
              value={jobsText} 
              onChange={setJobsText} 
              placeholder="Summarize active jobs, any issues or milestones this week?" 
            />
            <ReportSection 
              title="Service Agreements" 
              value={saText} 
              onChange={setSaText} 
              placeholder="Any SA renewals, concerns, or new agreements this week?" 
            />
          </div>
        </section>

        {/* Spotlight Highlights */}
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-800">Spotlight Highlights</h2>
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardDescription className="text-slate-500">Pin key quotes, deals, or items that need manager attention.</CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Search quotes & estimates..." className="pl-9 bg-white border-slate-200" />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <HighlightedItem 
                title="JLL Downtown Tower Maintenance Package"
                value="$95,375"
                status="Win"
                note="Client confirmed Q2 start. Great win for the team."
              />
              <HighlightedItem 
                title="Beacon Capital Annual Janitorial"
                value="$212,550"
                status="Need Help"
                note="Pricing concern. Need manager input on discount strategy."
              />
            </CardContent>
          </Card>
        </section>

      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-2">
          <div className="text-sm text-slate-500 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Auto-saved 2 min ago
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-slate-300 text-slate-700 bg-white hover:bg-slate-50">
              Save Draft
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" disabled={!isFormValid}>
              Submit Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponents

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend?: 'up' | 'down' }) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
        <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 mb-1">
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="text-xl font-semibold text-slate-900">{value}</span>
            {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 text-rose-500" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CoachingCard({ title, message, color }: { title: string, message: string, color: string }) {
  return (
    <Card className={`shadow-sm border-l-4 ${color} border-y-slate-200 border-r-slate-200 overflow-hidden`}>
      <CardContent className="p-4 sm:p-5">
        <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ status }: { status: 'Healthy' | 'Watch' | 'At Risk' }) {
  if (status === 'At Risk') {
    return (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1 pr-2">
        <AlertTriangle className="h-3 w-3" /> {status}
      </Badge>
    );
  }
  if (status === 'Watch') {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 pr-2">
        <AlertCircle className="h-3 w-3" /> {status}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 pr-2 font-normal">
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {status}
    </Badge>
  );
}

function ReportSection({ title, value, onChange, placeholder }: { title: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  const maxLength = 500;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <label className="text-sm font-medium text-slate-700">{title}</label>
        <span className={`text-xs ${value.length > maxLength ? 'text-rose-500' : 'text-slate-400'}`}>
          {value.length} / {maxLength}
        </span>
      </div>
      <Textarea 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[140px] resize-none border-slate-200 focus:border-blue-400 focus:ring-blue-100 placeholder:text-slate-300 text-sm leading-relaxed"
      />
    </div>
  );
}

function HighlightedItem({ title, value, status, note }: { title: string, value: string, status: 'Win' | 'Need Help', note: string }) {
  return (
    <div className="group relative bg-white border border-slate-200 rounded-lg p-3 sm:p-4 hover:border-slate-300 transition-colors">
      <button className="absolute right-2 top-2 p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all">
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pr-8">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-medium text-slate-900">{title}</h4>
            <span className="text-slate-500 font-medium">{value}</span>
            <Badge 
              variant="secondary" 
              className={`text-xs cursor-pointer flex items-center gap-1 ${
                status === 'Win' 
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' 
                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200'
              }`}
            >
              {status} <ChevronDown className="h-3 w-3 opacity-70" />
            </Badge>
          </div>
          <div className="text-sm text-slate-600 bg-slate-50 p-2.5 rounded-md border border-slate-100 mt-2">
            <span className="font-medium text-slate-700">Note:</span> {note}
          </div>
        </div>
      </div>
    </div>
  );
}
