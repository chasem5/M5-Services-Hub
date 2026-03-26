import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sheet, SheetContent, SheetHeader
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin, Building2, Star, StickyNote, Edit2,
  ChevronRight, Clock, FileText, CheckCircle,
  Phone, Mail, Users
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContactBuilding, ClientContact, Lead, BuildopsJob } from "@shared/schema";

interface BuildopsData {
  building: ContactBuilding;
  jobs: BuildopsJob[];
  quotes: Lead[];
  teamColor: string | null;
}

interface BuildingPanelProps {
  buildingId: number | null;
  onClose: () => void;
  onOpenContact?: (contactId: number) => void;
}

function fmt(n: number | string | null | undefined) {
  if (!n) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n));
}

const quoteStatusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  sent: { label: "Sent", color: "text-blue-700", bg: "bg-blue-50", icon: <Clock className="w-3 h-3" /> },
  draft: { label: "Draft", color: "text-gray-600", bg: "bg-gray-100", icon: <FileText className="w-3 h-3" /> },
  won: { label: "Accepted", color: "text-emerald-700", bg: "bg-emerald-50", icon: <CheckCircle className="w-3 h-3" /> },
  lost: { label: "Lost", color: "text-red-700", bg: "bg-red-50", icon: <FileText className="w-3 h-3" /> },
  proposal_sent: { label: "Sent", color: "text-blue-700", bg: "bg-blue-50", icon: <Clock className="w-3 h-3" /> },
  new_lead: { label: "Draft", color: "text-gray-600", bg: "bg-gray-100", icon: <FileText className="w-3 h-3" /> },
};

const jobStatusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  completed: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50", icon: <CheckCircle className="w-3 h-3" /> },
  invoiced: { label: "Invoiced", color: "text-purple-700", bg: "bg-purple-50", icon: <FileText className="w-3 h-3" /> },
  open: { label: "Open", color: "text-blue-700", bg: "bg-blue-50", icon: <Clock className="w-3 h-3" /> },
  scheduled: { label: "Scheduled", color: "text-amber-700", bg: "bg-amber-50", icon: <Clock className="w-3 h-3" /> },
  cancelled: { label: "Cancelled", color: "text-gray-500", bg: "bg-gray-100", icon: <FileText className="w-3 h-3" /> },
};

function getJobStatus(status: string | null) {
  if (!status) return jobStatusConfig.open;
  return jobStatusConfig[status.toLowerCase()] ?? { label: status, color: "text-gray-600", bg: "bg-gray-100", icon: <Clock className="w-3 h-3" /> };
}
function getQuoteStatus(stage: string | null) {
  if (!stage) return quoteStatusConfig.draft;
  return quoteStatusConfig[stage] ?? quoteStatusConfig.draft;
}

function TierBadge({ tier }: { tier: string | null | undefined }) {
  if (!tier) return null;
  const c: Record<string, string> = {
    A: "bg-emerald-100 text-emerald-700",
    B: "bg-blue-100 text-blue-700",
    C: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c[tier] ?? "bg-gray-100 text-gray-600"}`}>
      {tier}
    </span>
  );
}

function ContactAvatar({ contact, size = 9 }: { contact: ClientContact; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = contact.profilePictureUrl;
  const photoSrc = src?.startsWith("https://storage.googleapis.com/")
    ? `/api/contacts/${contact.id}/photo-img`
    : src;
  const cls = `w-${size} h-${size} rounded-full object-cover flex-shrink-0`;
  if (photoSrc && !failed) {
    return <img src={photoSrc} alt={contact.name} onError={() => setFailed(true)} className={cls} />;
  }
  return (
    <div className={`w-${size} h-${size} rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0`}>
      {contact.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="p-5 space-y-4">
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function BuildingPanel({ buildingId, onClose, onOpenContact }: BuildingPanelProps) {
  const [activeTab, setActiveTab] = useState<"quotes" | "jobs">("quotes");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<BuildopsData>({
    queryKey: ["/api/buildings", buildingId, "buildops-data"],
    queryFn: async () => {
      const res = await fetch(`/api/buildings/${buildingId}/buildops-data`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: buildingId !== null,
  });

  const { data: contactsData } = useQuery<ClientContact[]>({
    queryKey: ["/api/contact-buildings", buildingId, "contacts"],
    queryFn: async () => {
      const res = await fetch(`/api/contact-buildings/${buildingId}/contacts`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: buildingId !== null,
  });

  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await apiRequest("PATCH", `/api/buildings/${buildingId}/notes`, { notes });
      if (!res.ok) throw new Error("Failed to save notes");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings", buildingId, "buildops-data"] });
      setEditingNotes(false);
      toast({ title: "Notes saved" });
    },
    onError: () => toast({ title: "Failed to save notes", variant: "destructive" }),
  });

  const building = data?.building;
  const jobs = data?.jobs ?? [];
  const quotes = data?.quotes ?? [];
  const contacts = contactsData ?? [];
  const teamColor = data?.teamColor ?? null;

  const OFFICE_COLOR_MAP: Record<string, string> = {
    gray: "#6B7280", blue: "#2563EB", green: "#059669",
    amber: "#D97706", red: "#DC2626", purple: "#7C3AED",
  };
  const teamColorHex = teamColor ? (OFFICE_COLOR_MAP[teamColor] ?? "#6B7280") : null;

  const openQuotesValue = quotes.filter(q => q.stage === "proposal_sent" || q.stage === "sent").reduce((s, q) => s + Number(q.value ?? 0), 0);
  const totalJobRevenue = jobs.reduce((s, j) => s + Number(j.totalAmount ?? 0), 0);

  return (
    <Sheet open={buildingId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-[520px] max-w-full p-0 flex flex-col overflow-hidden font-sans">
        <SheetHeader className="sr-only">Building details</SheetHeader>

        {isLoading || !building ? (
          <PanelSkeleton />
        ) : (
          <>
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-gray-900 leading-tight truncate">
                    {building.name ?? "Unnamed Building"}
                  </h2>
                  {building.address && (
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{building.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {teamColorHex && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white"
                        style={{ backgroundColor: teamColorHex }}
                      >
                        {teamColor ? teamColor.charAt(0).toUpperCase() + teamColor.slice(1) : ""} Team
                      </span>
                    )}
                    {building.propertyType && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {building.propertyType}
                      </span>
                    )}
                    {building.sqft && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                        {building.sqft.toLocaleString()} sqft
                      </span>
                    )}
                    {!building.buildopsId && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        No BuildOps link
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label: "Open Quotes", value: openQuotesValue > 0 ? fmt(openQuotesValue) : "–", color: "text-blue-600" },
                  { label: "Job Revenue", value: totalJobRevenue > 0 ? fmt(totalJobRevenue) : "–", color: "text-emerald-600" },
                  { label: "Contacts", value: String(contacts.length), color: "text-gray-800" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-2.5 text-center">
                    <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* Building notes — always shown, editable */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Building Notes</h3>
                  {!editingNotes && (
                    <button
                      onClick={() => { setNotesValue(building.notes ?? ""); setEditingNotes(true); }}
                      className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
                      data-testid="building-panel-edit-notes"
                    >
                      <Edit2 className="w-2.5 h-2.5" /> Edit
                    </button>
                  )}
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                  <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  {editingNotes ? (
                    <div className="flex-1">
                      <textarea
                        value={notesValue}
                        onChange={e => setNotesValue(e.target.value)}
                        rows={4}
                        className="w-full text-xs text-amber-900 bg-transparent border-none outline-none resize-none leading-relaxed"
                        placeholder="Add notes about this building..."
                        autoFocus
                        data-testid="building-panel-notes-textarea"
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => saveNotesMutation.mutate(notesValue)}
                          disabled={saveNotesMutation.isPending}
                          className="text-[10px] text-amber-700 font-medium hover:text-amber-900"
                          data-testid="building-panel-save-notes"
                        >
                          {saveNotesMutation.isPending ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingNotes(false)}
                          className="text-[10px] text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {building.notes || <span className="italic text-amber-600">No notes yet — click Edit to add one.</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Contacts */}
              {contacts.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Contacts at This Building
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {contacts.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => onOpenContact?.(c.id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer group text-left transition-colors"
                        data-testid={`building-panel-contact-${c.id}`}
                      >
                        <ContactAvatar contact={c} size={9} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-gray-900 truncate">{c.name}</span>
                            {i === 0 && <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" title="Primary contact" />}
                            <TierBadge tier={c.tier} />
                          </div>
                          <div className="text-xs text-gray-400 truncate">{c.title ?? ""}{i === 0 ? " · Primary" : ""}</div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 flex-shrink-0">
                          {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-gray-200"><Mail className="w-3 h-3 text-gray-500" /></a>}
                          {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-gray-200"><Phone className="w-3 h-3 text-gray-500" /></a>}
                          <ChevronRight className="w-3 h-3 text-gray-400 self-center" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* BuildOps data tabs */}
              <div className="px-5 py-4 pb-8">
                <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 mb-4 w-fit">
                  {(["quotes", "jobs"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${activeTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      data-testid={`building-panel-tab-${t}`}
                    >
                      {t === "quotes" ? `Quotes (${quotes.length})` : `Jobs (${jobs.length})`}
                    </button>
                  ))}
                </div>

                {!building.buildopsId ? (
                  <p className="text-xs text-gray-400 italic">This building is not linked to BuildOps.</p>
                ) : activeTab === "quotes" ? (
                  quotes.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No quotes found for this property in BuildOps.</p>
                  ) : (
                    <div className="space-y-2">
                      {quotes.map(q => {
                        const s = getQuoteStatus(q.stage);
                        return (
                          <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors" data-testid={`building-panel-quote-${q.id}`}>
                            <div className={`w-7 h-7 rounded-full ${s.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>{s.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-900">{q.title}</span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                              </div>
                              {q.buildopsQuoteNumber && (
                                <div className="text-xs text-gray-400 mt-0.5">#{q.buildopsQuoteNumber}</div>
                              )}
                            </div>
                            <div className="text-sm font-bold text-gray-900 flex-shrink-0">
                              {Number(q.value) > 0 ? fmt(q.value) : <span className="text-gray-400 text-xs font-normal">TBD</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  jobs.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No jobs found for this property in BuildOps.</p>
                  ) : (
                    <div className="space-y-2">
                      {jobs.map(j => {
                        const s = getJobStatus(j.status);
                        return (
                          <div key={j.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors" data-testid={`building-panel-job-${j.id}`}>
                            <div className={`w-7 h-7 rounded-full ${s.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>{s.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-900">{j.title ?? j.jobNumber ?? "Job"}</span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                {j.jobNumber && <span>#{j.jobNumber}</span>}
                                {j.jobTypeName && <><span>·</span><span>{j.jobTypeName}</span></>}
                                {j.completedDate && <><span>·</span><span>{new Date(j.completedDate).toLocaleDateString()}</span></>}
                              </div>
                            </div>
                            <div className="text-sm font-bold text-gray-900 flex-shrink-0">
                              {Number(j.totalAmount) > 0 ? fmt(j.totalAmount) : <span className="text-gray-400 text-xs font-normal">–</span>}
                            </div>
                          </div>
                        );
                      })}
                      {totalJobRevenue > 0 && (
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                          <span>Total shown</span>
                          <span className="font-semibold text-gray-800">{fmt(totalJobRevenue)}</span>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
