import { useQuery } from "@tanstack/react-query";
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
import type { ContactBuilding, ClientContact, Lead, BuildopsJob } from "@shared/schema";

interface BuildopsData {
  building: ContactBuilding;
  jobs: BuildopsJob[];
  quotes: Lead[];
}

interface BuildingContacts {
  contacts: ClientContact[];
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

function ContactAvatar({ contact, size = 9 }: { contact: ClientContact; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = (contact as any).profilePictureUrl;
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

  const building = data?.building;
  const jobs = data?.jobs ?? [];
  const quotes = data?.quotes ?? [];
  const contacts = contactsData ?? [];

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
            <div className="px-5 pt-5 pb-4 border-b border-border/50">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-foreground leading-tight truncate">
                    {building.name ?? "Unnamed Building"}
                  </h2>
                  {building.address && (
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{building.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {building.propertyType && (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                        {building.propertyType}
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
                  { label: "Contacts", value: String(contacts.length), color: "text-foreground" },
                ].map(s => (
                  <div key={s.label} className="bg-muted/50 rounded-lg p-2.5 text-center">
                    <div className={`text-base font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/50">
              {/* Building notes */}
              {building.notes && (
                <div className="px-5 py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Building Notes
                  </h3>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 dark:bg-amber-950/20 dark:border-amber-800/40">
                    <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{building.notes}</p>
                  </div>
                </div>
              )}

              {/* Contacts */}
              {contacts.length > 0 && (
                <div className="px-5 py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Contacts at This Building
                  </h3>
                  <div className="space-y-2">
                    {contacts.map((c, i) => (
                      <button
                        key={c.id}
                        onClick={() => onOpenContact?.(c.id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-muted/40 cursor-pointer group text-left transition-colors"
                        data-testid={`building-panel-contact-${c.id}`}
                      >
                        <ContactAvatar contact={c} size={9} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                            {i === 0 && <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" title="Primary contact" />}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{c.title ?? ""}{i === 0 ? " · Primary" : ""}</div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 flex-shrink-0">
                          {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-muted"><Mail className="w-3 h-3 text-muted-foreground" /></a>}
                          {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="p-1 rounded hover:bg-muted"><Phone className="w-3 h-3 text-muted-foreground" /></a>}
                          <ChevronRight className="w-3 h-3 text-muted-foreground self-center" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* BuildOps data tabs */}
              <div className="px-5 py-4 pb-8">
                <div className="flex gap-0.5 bg-muted/60 rounded-lg p-0.5 mb-4 w-fit">
                  {(["quotes", "jobs"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${activeTab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                      data-testid={`building-panel-tab-${t}`}
                    >
                      {t === "quotes" ? `Quotes (${quotes.length})` : `Jobs (${jobs.length})`}
                    </button>
                  ))}
                </div>

                {!building.buildopsId ? (
                  <p className="text-xs text-muted-foreground italic">This building is not linked to BuildOps.</p>
                ) : activeTab === "quotes" ? (
                  quotes.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No quotes found for this property in BuildOps.</p>
                  ) : (
                    <div className="space-y-2">
                      {quotes.map(q => {
                        const s = getQuoteStatus(q.stage);
                        return (
                          <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors" data-testid={`building-panel-quote-${q.id}`}>
                            <div className={`w-7 h-7 rounded-full ${s.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>{s.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-foreground">{q.title}</span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                              </div>
                              {q.buildopsQuoteNumber && (
                                <div className="text-xs text-muted-foreground mt-0.5">#{q.buildopsQuoteNumber}</div>
                              )}
                            </div>
                            <div className="text-sm font-bold text-foreground flex-shrink-0">
                              {Number(q.value) > 0 ? fmt(q.value) : <span className="text-muted-foreground text-xs font-normal">TBD</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  jobs.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No jobs found for this property in BuildOps.</p>
                  ) : (
                    <div className="space-y-2">
                      {jobs.map(j => {
                        const s = getJobStatus(j.status);
                        return (
                          <div key={j.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors" data-testid={`building-panel-job-${j.id}`}>
                            <div className={`w-7 h-7 rounded-full ${s.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>{s.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-foreground">{j.title ?? j.jobNumber ?? "Job"}</span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${s.bg} ${s.color}`}>{s.label}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                {j.jobNumber && <span>#{j.jobNumber}</span>}
                                {j.jobTypeName && <><span>·</span><span>{j.jobTypeName}</span></>}
                                {j.completedDate && <><span>·</span><span>{new Date(j.completedDate).toLocaleDateString()}</span></>}
                              </div>
                            </div>
                            <div className="text-sm font-bold text-foreground flex-shrink-0">
                              {Number(j.totalAmount) > 0 ? fmt(j.totalAmount) : <span className="text-muted-foreground text-xs font-normal">–</span>}
                            </div>
                          </div>
                        );
                      })}
                      {totalJobRevenue > 0 && (
                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Total shown</span>
                          <span className="font-semibold text-foreground">{fmt(totalJobRevenue)}</span>
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
