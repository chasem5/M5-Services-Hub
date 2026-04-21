import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Sheet, SheetContent, SheetHeader
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail, Phone, ExternalLink, Building2, StickyNote,
  TrendingUp, Calendar, DollarSign, Edit2, ChevronRight,
  ChevronDown, Clock, ArrowUpRight, MapPin, Navigation, X
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClientContact, ContactBuilding, Lead } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

const RED = "#BE1916";

const OFFICE_COLOR_MAP: Record<string, string> = {
  gray: "#6B7280", blue: "#2563EB", green: "#059669",
  amber: "#D97706", red: "#DC2626", purple: "#7C3AED",
};
function officeColorHex(color: string | null | undefined): string {
  if (!color) return "#6B7280";
  return OFFICE_COLOR_MAP[color] ?? "#6B7280";
}

interface Office {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  notes?: string | null;
  color?: string | null;
}

interface ActivityItem {
  type: string;
  label: string;
  detail: string;
  time: string;
}

interface PanelData {
  contact: ClientContact;
  buildings: ContactBuilding[];
  deals: Lead[];
  office: Office | null;
  clientName: string | null;
  reportsToName: string | null;
  recentActivity: ActivityItem[];
  lastContact: string | null;
  lastMeeting: string | null;
}

interface ContactPanelProps {
  contactId: number | null;
  onClose: () => void;
  onOpenBuilding?: (buildingId: number) => void;
  onEdit?: (contact: ClientContact) => void;
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

const activityTypeBg: Record<string, string> = {
  email: "bg-blue-50", meeting: "bg-purple-50", spend: "bg-rose-50", note: "bg-amber-50", deal: "bg-emerald-50",
};

function ActivityIcon({ type }: { type: string }) {
  if (type === "email") return <Mail className="w-3.5 h-3.5 text-blue-500" />;
  if (type === "meeting") return <Calendar className="w-3.5 h-3.5 text-purple-500" />;
  if (type === "spend") return <DollarSign className="w-3.5 h-3.5 text-rose-500" />;
  if (type === "deal") return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
  return <StickyNote className="w-3.5 h-3.5 text-amber-500" />;
}

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
        style={{ outline: `2px solid ${RED}`, outlineOffset: "2px" }}
      />
    );
  }
  return (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
      style={{ backgroundColor: RED }}
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

export function ContactPanel({ contactId, onClose, onOpenBuilding, onEdit }: ContactPanelProps) {
  const [showAllDeals, setShowAllDeals] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<PanelData>({
    queryKey: ["/api/contacts", contactId, "panel-data"],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contactId}/panel-data`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: contactId !== null,
  });

  const saveNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const res = await apiRequest("PATCH", `/api/contacts/${contactId}`, { notes });
      if (!res.ok) throw new Error("Failed to save notes");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", contactId, "panel-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      setEditingNotes(false);
      toast({ title: "Notes saved" });
    },
    onError: () => toast({ title: "Failed to save notes", variant: "destructive" }),
  });

  const contact = data?.contact;
  const buildings = data?.buildings ?? [];
  const deals = data?.deals ?? [];
  const office = data?.office ?? null;
  const clientName = data?.clientName ?? null;
  const reportsToName = data?.reportsToName ?? null;
  const recentActivity = data?.recentActivity ?? [];
  const lastContact = data?.lastContact ?? null;
  const lastMeeting = data?.lastMeeting ?? null;

  const tierColor = contact?.tier === "A" ? "bg-emerald-100 text-emerald-700"
    : contact?.tier === "B" ? "bg-blue-100 text-blue-700"
    : "bg-gray-100 text-gray-600";

  const visibleActivity = showAllActivity ? recentActivity : recentActivity.slice(0, 3);

  return (
    <Sheet open={contactId !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-[480px] max-w-full p-0 flex flex-col overflow-hidden font-sans">
        <SheetHeader className="sr-only">Contact details</SheetHeader>

        {isLoading || !contact ? (
          <PanelSkeleton />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start gap-4 px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="relative flex-shrink-0">
                <ContactAvatar contact={contact} />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">{contact.name}</h2>
                  {contact.tier && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tierColor}`}>
                      {contact.tier}-Tier
                    </span>
                  )}
                </div>
                {contact.title && <p className="text-sm text-gray-600 mt-0.5">{contact.title}</p>}
                {(clientName || office) && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                    {office?.color && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: officeColorHex(office.color) }}
                      />
                    )}
                    {clientName && <span className="font-medium text-gray-700">{clientName}</span>}
                    {clientName && office && <span className="text-gray-300">·</span>}
                    {office && <span>{office.name}</span>}
                  </div>
                )}
                {reportsToName && (
                  <div className="text-xs text-gray-400 mt-0.5">Reports to {reportsToName}</div>
                )}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* Contact info */}
              <div className="px-5 py-4 border-b border-gray-100 space-y-2.5">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 group">
                    <Mail className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    <span className="truncate">{contact.email}</span>
                    <ArrowUpRight className="w-3 h-3 text-gray-300 group-hover:text-blue-400 ml-auto opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-blue-600 group">
                    <Phone className="w-4 h-4 text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                    <span>{contact.phone}</span>
                  </a>
                )}
                {contact.linkedinUrl && (
                  <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700 group">
                    <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>LinkedIn Profile</span>
                    <ArrowUpRight className="w-3 h-3 text-blue-300 group-hover:text-blue-500 ml-auto opacity-0 group-hover:opacity-100 flex-shrink-0" />
                  </a>
                )}
                {!contact.email && !contact.phone && !contact.linkedinUrl && (
                  <p className="text-xs text-gray-400 italic">No contact info on file</p>
                )}
                {(lastContact || lastMeeting) && (
                  <div className="pt-1.5 border-t border-gray-100 space-y-1">
                    {lastContact && (
                      <div className="flex items-center gap-2.5 text-xs text-gray-500">
                        <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>Last email</span>
                        <span className="ml-auto text-gray-400">{lastContact}</span>
                      </div>
                    )}
                    {lastMeeting && (
                      <div className="flex items-center gap-2.5 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>Last meeting</span>
                        <span className="ml-auto text-gray-400">{lastMeeting}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Office Location */}
              {office && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
                    Office Location
                  </h3>
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-start gap-3 p-3 bg-gray-50">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-gray-200">
                        <MapPin className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{office.name}</div>
                        {office.address && <div className="text-xs text-gray-500 mt-0.5">{office.address}</div>}
                        {office.phone && <div className="text-xs text-gray-400 mt-0.5">{office.phone}</div>}
                      </div>
                      {office.address && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(office.address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-shrink-0 w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                          title="Open in Google Maps"
                          data-testid="contact-panel-maps-link"
                        >
                          <Navigation className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                        </a>
                      )}
                    </div>
                    {office.notes && (
                      <div className="px-3 py-2.5 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">💡</span>
                        <p className="text-[11px] text-amber-800 leading-relaxed">{office.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="px-5 py-3 border-b border-gray-100 flex gap-2">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex-1 text-xs py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
                    data-testid="contact-panel-send-email"
                  >
                    <Mail className="w-3 h-3" /> Send Email
                  </a>
                )}
                <button
                  onClick={() => toast({ title: "Log Meeting", description: "Use the Meetings section to log a new meeting." })}
                  className="flex-1 text-xs py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
                  data-testid="contact-panel-log-meeting"
                >
                  <Calendar className="w-3 h-3" /> Log Meeting
                </button>
                <button
                  onClick={() => { if (onEdit) { onEdit(contact); onClose(); } }}
                  className="flex-1 text-xs py-2 rounded-lg border border-[#BE1916] text-[#BE1916] hover:bg-[#BE1916]/5 flex items-center justify-center gap-1.5 transition-colors font-medium"
                  data-testid="contact-panel-edit"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              </div>

              {/* Internal Notes */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Internal Notes</h3>
                  {!editingNotes && (
                    <button
                      onClick={() => { setNotesValue(contact.notes ?? ""); setEditingNotes(true); }}
                      className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
                      data-testid="contact-panel-edit-notes"
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
                        placeholder="Add notes about this contact..."
                        autoFocus
                        data-testid="contact-panel-notes-textarea"
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => saveNotesMutation.mutate(notesValue)}
                          disabled={saveNotesMutation.isPending}
                          className="text-[10px] text-amber-700 font-medium hover:text-amber-900"
                          data-testid="contact-panel-save-notes"
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
                      {contact.notes || <span className="italic text-amber-600">No notes yet — click Edit to add one.</span>}
                    </p>
                  )}
                </div>
              </div>

              {/* Buildings */}
              {buildings.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Buildings Managed
                  </h3>
                  <div className="space-y-2">
                    {buildings.map(b => (
                      <button
                        key={b.id}
                        onClick={() => onOpenBuilding?.(b.id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer group text-left transition-colors"
                        data-testid={`contact-panel-building-${b.id}`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{b.name ?? b.address ?? "Unnamed building"}</div>
                          {b.address && <div className="text-xs text-gray-400 truncate">{b.address}</div>}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Deals */}
              {deals.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Open Deals
                  </h3>
                  <div className="space-y-2">
                    {(showAllDeals ? deals : deals.slice(0, 3)).map(d => (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                        data-testid={`contact-panel-deal-${d.id}`}
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${RED}15` }}>
                          <TrendingUp className="w-3.5 h-3.5" style={{ color: RED }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 truncate">{d.title}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${dealStatusColors[d.stage] ?? "bg-gray-100 text-gray-600"}`}>
                              {stageLabels[d.stage] ?? d.stage}
                            </span>
                          </div>
                          {d.value && Number(d.value) > 0 && (
                            <div className="text-xs text-gray-400 mt-0.5">{formatCurrency(d.value)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    {deals.length > 3 && (
                      <button
                        onClick={() => setShowAllDeals(!showAllDeals)}
                        className="text-xs text-gray-400 hover:text-gray-600 w-full text-center py-1 flex items-center justify-center gap-1"
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${showAllDeals ? "rotate-180" : ""}`} />
                        {showAllDeals ? "Show less" : `Show ${deals.length - 3} more`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {recentActivity.length > 0 && (
                <div className="px-5 py-4 pb-8">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Activity</h3>
                  <div className="space-y-2">
                    {visibleActivity.map((a, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50">
                        <div className={`w-7 h-7 rounded-full ${activityTypeBg[a.type] ?? "bg-gray-50"} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <ActivityIcon type={a.type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-800">{a.label}</span>
                            <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{a.time}</span>
                          </div>
                          {a.detail && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{a.detail}</p>}
                        </div>
                      </div>
                    ))}
                    {recentActivity.length > 3 && (
                      <button
                        onClick={() => setShowAllActivity(!showAllActivity)}
                        className="text-xs text-gray-400 hover:text-gray-600 w-full text-center py-1 flex items-center justify-center gap-1"
                      >
                        <ChevronDown className={`w-3 h-3 transition-transform ${showAllActivity ? "rotate-180" : ""}`} />
                        {showAllActivity ? "Show less" : `Show ${recentActivity.length - 3} more`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {buildings.length === 0 && deals.length === 0 && !contact.notes && recentActivity.length === 0 && (
                <div className="px-5 py-8 text-center text-xs text-gray-400 italic">
                  No additional details linked to this contact yet.
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
