import { useQuery } from "@tanstack/react-query";
import {
  Sheet, SheetContent, SheetHeader
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail, Phone, ExternalLink, Building2, StickyNote,
  TrendingUp, Calendar, DollarSign, Edit2, ChevronRight,
  ChevronDown, Clock, ArrowUpRight, MapPin, Navigation
} from "lucide-react";
import { useState } from "react";
import type { ClientContact, ContactBuilding, Lead } from "@shared/schema";

interface Office {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
}

interface PanelData {
  contact: ClientContact;
  buildings: ContactBuilding[];
  deals: Lead[];
  office: Office | null;
}

interface ContactPanelProps {
  contactId: number | null;
  onClose: () => void;
  onOpenBuilding?: (buildingId: number) => void;
}

function fmt(n: number | string | null | undefined) {
  if (!n) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n));
}

const stageLabels: Record<string, string> = {
  new_lead: "New Lead", qualifying: "Qualifying", proposal_sent: "Proposal Sent",
  negotiating: "Negotiating", won: "Won", lost: "Lost",
};

const dealStatusColors: Record<string, string> = {
  new_lead: "bg-gray-100 text-gray-600",
  qualifying: "bg-blue-100 text-blue-700",
  proposal_sent: "bg-purple-100 text-purple-700",
  negotiating: "bg-amber-100 text-amber-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

function ContactAvatar({ contact }: { contact: ClientContact }) {
  const [failed, setFailed] = useState(false);
  const src = contact.profilePictureUrl;
  const photoSrc = src?.startsWith("https://storage.googleapis.com/")
    ? `/api/contacts/${contact.id}/photo-img`
    : src;
  if (photoSrc && !failed) {
    return (
      <img
        src={photoSrc}
        alt={contact.name}
        onError={() => setFailed(true)}
        className="w-16 h-16 rounded-full object-cover flex-shrink-0"
        style={{ outline: "2px solid #BE1916", outlineOffset: "2px" }}
      />
    );
  }
  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
      style={{ backgroundColor: "#BE1916" }}
    >
      {contact.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="p-5 space-y-4">
      <div className="flex gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function ContactPanel({ contactId, onClose, onOpenBuilding }: ContactPanelProps) {
  const [showAllDeals, setShowAllDeals] = useState(false);

  const { data, isLoading } = useQuery<PanelData>({
    queryKey: ["/api/contacts", contactId, "panel-data"],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}/panel-data`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: contactId !== null,
  });

  const contact = data?.contact;
  const buildings = data?.buildings ?? [];
  const deals = data?.deals ?? [];
  const office = data?.office ?? null;

  const tierColor = contact?.tier === "A" ? "bg-emerald-100 text-emerald-700"
    : contact?.tier === "B" ? "bg-blue-100 text-blue-700"
    : "bg-gray-100 text-gray-600";

  return (
    <Sheet open={contactId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-[480px] max-w-full p-0 flex flex-col overflow-hidden font-sans">
        <SheetHeader className="sr-only">Contact details</SheetHeader>

        {isLoading || !contact ? (
          <PanelSkeleton />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-border/50">
              <div className="relative">
                <ContactAvatar contact={contact} />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-background" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground leading-tight">{contact.name}</h2>
                  {contact.tier && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tierColor}`}>
                      {contact.tier}-Tier
                    </span>
                  )}
                </div>
                {contact.title && <p className="text-sm text-muted-foreground mt-0.5">{contact.title}</p>}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/50">
              {/* Contact info */}
              <div className="px-5 py-4 space-y-2.5">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm text-foreground hover:text-primary group">
                    <Mail className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                    <span className="truncate">{contact.email}</span>
                    <ArrowUpRight className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100" />
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm text-foreground hover:text-primary group">
                    <Phone className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                    <span>{contact.phone}</span>
                  </a>
                )}
                {contact.linkedinUrl && (
                  <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700 group">
                    <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>LinkedIn Profile</span>
                    <ArrowUpRight className="w-3 h-3 text-blue-300 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100" />
                  </a>
                )}
                {!contact.email && !contact.phone && !contact.linkedinUrl && (
                  <p className="text-xs text-muted-foreground italic">No contact info on file</p>
                )}
              </div>

              {/* Office Location */}
              {office && (
                <div className="px-5 py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                    Office Location
                  </h3>
                  <div className="rounded-xl border border-border/60 overflow-hidden">
                    <div className="flex items-start gap-3 p-3 bg-muted/30">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-background border border-border/50">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground">{office.name}</div>
                        {office.address && <div className="text-xs text-muted-foreground mt-0.5">{office.address}</div>}
                        {office.phone && <div className="text-xs text-muted-foreground mt-0.5">{office.phone}</div>}
                      </div>
                      {office.address && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(office.address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-shrink-0 w-7 h-7 rounded-lg bg-background border border-border/50 flex items-center justify-center hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                          title="Open in Google Maps"
                          data-testid={`contact-panel-maps-link`}
                        >
                          <Navigation className="w-3.5 h-3.5 text-muted-foreground group-hover:text-blue-500" />
                        </a>
                      )}
                    </div>
                    <div className="px-3 py-2 bg-amber-50 border-t border-amber-100 dark:bg-amber-950/20 dark:border-amber-800/30 flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0 text-sm">💡</span>
                      <p className="text-[11px] text-amber-800 dark:text-amber-200 leading-relaxed">
                        Drop in at their office for a quick hello — unannounced visits build rapport.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div className="px-5 py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Internal Notes
                  </h3>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 dark:bg-amber-950/20 dark:border-amber-800/40">
                    <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{contact.notes}</p>
                  </div>
                </div>
              )}

              {/* Buildings */}
              {buildings.length > 0 && (
                <div className="px-5 py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Buildings Managed
                  </h3>
                  <div className="space-y-2">
                    {buildings.map(b => (
                      <button
                        key={b.id}
                        onClick={() => onOpenBuilding?.(b.id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-muted/40 cursor-pointer group text-left transition-colors"
                        data-testid={`contact-panel-building-${b.id}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{b.name ?? b.address ?? "Unnamed building"}</div>
                          {b.address && b.name && <div className="text-xs text-muted-foreground truncate">{b.address}</div>}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked deals */}
              {deals.length > 0 && (
                <div className="px-5 py-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Linked Deals
                  </h3>
                  <div className="space-y-2">
                    {(showAllDeals ? deals : deals.slice(0, 3)).map(d => (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors"
                        data-testid={`contact-panel-deal-${d.id}`}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
                          <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground truncate">{d.title}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${dealStatusColors[d.stage] ?? "bg-gray-100 text-gray-600"}`}>
                              {stageLabels[d.stage] ?? d.stage}
                            </span>
                          </div>
                          {d.value && Number(d.value) > 0 && (
                            <div className="text-xs text-muted-foreground mt-0.5">{fmt(d.value)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {deals.length > 3 && (
                      <button
                        onClick={() => setShowAllDeals(!showAllDeals)}
                        className="text-xs text-muted-foreground hover:text-foreground w-full text-center py-1 flex items-center justify-center gap-1"
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${showAllDeals ? "rotate-180" : ""}`} />
                        {showAllDeals ? "Show less" : `Show ${deals.length - 3} more`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {buildings.length === 0 && deals.length === 0 && !contact.notes && (
                <div className="px-5 py-8 text-center text-xs text-muted-foreground italic">
                  No buildings or deals linked to this contact yet.
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
