import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation, useSearch } from "wouter";
import { 
  Building2, 
  Users, 
  Target, 
  FileText, 
  History,
  Phone,
  Mail,
  Globe,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  MoreVertical,
  Edit,
  ArrowLeft,
  ExternalLink,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Star,
  HardHat,
  Wrench,
  Sparkles,
  Zap,
  ClipboardList,
  Paperclip,
  X,
  Map,
  Linkedin,
  AlertCircle,
  RefreshCw,
  Upload,
  Pencil,
  Smartphone,
  DollarSign,
  Trophy,
  TrendingUp,
  ArrowRight,
  Activity,
  Copy,
  MoreHorizontal,
  Folders,
  Briefcase,
  Receipt,
  FileSignature,
  HeartPulse,
  TrendingDown,
  Minus,
} from "lucide-react";
import { SiLinkedin } from "react-icons/si";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip as ReTooltip } from "recharts";
import { BuildOpsIcon } from "@/components/BuildOpsIcon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AttachmentsPanel } from "@/components/AttachmentsPanel";
import { SearchableSelect } from "@/components/SearchableSelect";
import { CardScannerDialog } from "@/components/CardScannerDialog";
import { AddressLink } from "@/components/AddressLink";
import { TierBadge } from "@/components/TierBadge";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertClientContactSchema, 
  insertClientSchema,
  insertClientOfficeSchema,
  type Client, 
  type ClientOffice,
  type ClientContact,
  type BdSpendEntry,
  type Lead, 
  type Estimate,
  type ActivityLog,
  type BuildingPortfolio,
  type ContactStage,
  type IndustryOption
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { OrgChart } from "@/components/OrgChart";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { BuildingsMap } from "@/components/BuildingsMap";
import { PortfolioManager } from "@/components/PortfolioManager";
import { getStageBadgeClass } from "@/components/ContactStagesManager";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { formatPhoneNumber } from "@/lib/phone";


function LinkedInSyncButton({
  contactId,
  linkedinUrl,
  onSuccess,
}: {
  contactId: number;
  linkedinUrl: string;
  onSuccess: (updated: any) => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"idle" | "confirm_credits" | "previewing" | "applying">("idle");
  const [previewData, setPreviewData] = useState<{ updates: Record<string, string>; currentValues: Record<string, string> } | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/contacts/${contactId}/linkedin-enrich`, { linkedinUrl, preview: true });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Preview failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewData(data);
      const initialFields = Object.keys(data.updates).filter(key => {
        const newVal = data.updates[key];
        const oldVal = data.currentValues[key];
        return newVal && newVal !== oldVal;
      });
      setSelectedFields(initialFields);
      setStep("previewing");
    },
    onError: (err: Error) => {
      setStep("idle");
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/contacts/${contactId}/linkedin-enrich`, { 
        linkedinUrl, 
        preview: false, 
        fieldsToUpdate: selectedFields 
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Apply failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      onSuccess(data);
      setStep("idle");
      setPreviewData(null);
      toast({ title: "Profile synced", description: "Contact info has been updated." });
    },
    onError: (err: Error) => {
      setStep("previewing");
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const fieldLabels: Record<string, string> = {
    name: "Full Name",
    title: "Job Title",
    profilePictureUrl: "Profile Photo",
    email: "Email"
  };

  const isDisabled = !linkedinUrl.trim() || previewMutation.isPending || applyMutation.isPending;

  if (step === "idle") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
            Uses your Apollo.io credits. Pulls full name, job title, and profile photo. Email is returned when available in Apollo's database.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900/30"
          disabled={isDisabled}
          onClick={() => setStep("confirm_credits")}
          data-testid={`button-linkedin-sync-${contactId}`}
        >
          <SiLinkedin className="h-3.5 w-3.5 mr-1.5 text-[#0A66C2]" />
          Sync from LinkedIn
        </Button>
      </div>
    );
  }

  if (step === "confirm_credits") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-snug">
            Confirm using Apollo credits to preview available profile updates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="flex-1 h-8 text-xs bg-[#0A66C2] hover:bg-[#004182] text-white"
            disabled={previewMutation.isPending}
            onClick={() => previewMutation.mutate()}
            data-testid={`button-linkedin-sync-confirm-${contactId}`}
          >
            {previewMutation.isPending ? "Contacting Apollo..." : "Yes, use credits + preview changes"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => setStep("idle")}
            disabled={previewMutation.isPending}
            data-testid={`button-linkedin-sync-cancel-${contactId}`}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (step === "previewing" && previewData) {
    const fieldsToShow = Object.keys(previewData.updates).filter(key => {
      if (key === "linkedinUrl") return false;
      const newVal = previewData.updates[key];
      const oldVal = previewData.currentValues[key];
      return newVal && (newVal !== oldVal || !oldVal);
    });

    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 space-y-3">
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Preview Changes</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {fieldsToShow.map(key => (
            <div key={key} className="flex items-start gap-2 p-1.5 rounded bg-amber-100/50 dark:bg-amber-900/40">
              <Checkbox
                id={`field-${key}`}
                checked={selectedFields.includes(key)}
                onCheckedChange={(checked) => {
                  setSelectedFields(prev => 
                    checked ? [...prev, key] : prev.filter(f => f !== key)
                  );
                }}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <label htmlFor={`field-${key}`} className="text-[10px] font-medium text-amber-800 dark:text-amber-300 block">
                  {fieldLabels[key] || key}
                </label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex-1 min-w-0 truncate text-[10px] text-muted-foreground italic">
                    {key === 'profilePictureUrl' ? (
                      previewData.currentValues[key] ? (
                        <img src={previewData.currentValues[key]} className="h-4 w-4 rounded-full inline object-cover" />
                      ) : "—"
                    ) : (previewData.currentValues[key] || "—")}
                  </div>
                  <ChevronRight className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0 truncate text-[10px] font-medium text-amber-900 dark:text-amber-100">
                    {key === 'profilePictureUrl' ? (
                      <img src={previewData.updates[key]} className="h-4 w-4 rounded-full inline object-cover" />
                    ) : previewData.updates[key]}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {fieldsToShow.length === 0 && (
            <p className="text-[10px] text-amber-800/70 dark:text-amber-300/70 italic text-center py-2">
              No new information found in Apollo.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            className="w-full h-8 text-xs bg-[#0A66C2] hover:bg-[#004182] text-white"
            disabled={selectedFields.length === 0 || applyMutation.isPending}
            onClick={() => applyMutation.mutate()}
            data-testid={`button-linkedin-sync-apply-${contactId}`}
          >
            {applyMutation.isPending ? "Applying..." : `Apply ${selectedFields.length} Change${selectedFields.length === 1 ? "" : "s"}`}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-full h-8 text-xs"
            onClick={() => {
              setStep("idle");
              setPreviewData(null);
            }}
            disabled={applyMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

function BuildOpsStatusBadge({ buildopsId, buildopsStatus, showInactive }: { buildopsId?: string | null; buildopsStatus?: string | null; showInactive?: boolean }) {
  if (!buildopsId) return null;
  if (showInactive && buildopsStatus === "inactive") {
    return (
      <Badge variant="outline" className="h-6 text-xs gap-1 px-2 border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800" data-testid="badge-buildops-inactive">
        <Zap className="h-3 w-3" />
        Inactive in BuildOps
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="h-6 text-xs gap-1 px-2 border-green-200 bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800" data-testid="badge-buildops-linked">
      <Zap className="h-3 w-3" />
      BuildOps Linked
    </Badge>
  );
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
  onAddToPortfolio,
}: {
  contact: ClientContact;
  onEdit: (c: ClientContact) => void;
  onDelete: (id: number) => void;
  onAddToPortfolio?: (contactId: number) => void;
}) {
  const [avatarError, setAvatarError] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ label: string; description: string; onConfirm: () => void } | null>(null);
  const { toast } = useToast();

  const { data: contactStages = [] } = useQuery<ContactStage[]>({
    queryKey: ["/api/contact-stages"],
  });

  const { data: cardUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const getUserInitials = (userId: string) => {
    const u = cardUsers.find((u: any) => u.id === userId);
    if (!u) return "?";
    const first = u.firstName?.[0] ?? "";
    const last = u.lastName?.[0] ?? "";
    return (first + last).toUpperCase() || (u.email?.[0]?.toUpperCase() ?? "?");
  };

  const getUserDisplayName = (userId: string) => {
    const u = cardUsers.find((u: any) => u.id === userId);
    if (!u) return userId;
    return u.firstName ? `${u.firstName} ${u.lastName ?? ""}`.trim() : u.email;
  };

  const contactServiceNeeds: string[] = (contact.serviceNeeds as string[] | null) ?? [];

  return (
    <Card className="relative group border-border/50 hover:border-primary/40 transition-colors shadow-none">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex justify-between">
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 text-sm overflow-hidden">
              {(contact as any).profilePictureUrl && !avatarError ? (
                <img
                  src={(contact as any).profilePictureUrl?.startsWith("https://storage.googleapis.com/") ? `/api/contacts/${contact.id}/photo-img` : (contact as any).profilePictureUrl}
                  alt={contact.name}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                contact.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold">{contact.name}</p>
                {contact.isPrimary && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 uppercase">Primary</Badge>
                )}
                {(contact as any).tier && <TierBadge tier={(contact as any).tier} size="xs" />}
                {(contact as any).stageId && (() => {
                  const stage = contactStages.find(s => s.id === (contact as any).stageId);
                  return stage ? (
                    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${getStageBadgeClass(stage.color)}`}>
                      {stage.label}
                    </span>
                  ) : null;
                })()}
                {(contact as any).ownerId && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border/50 bg-muted/40 text-muted-foreground" data-testid={`badge-contact-owner-${contact.id}`}>
                    <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                      {getUserInitials((contact as any).ownerId)}
                    </span>
                    {getUserDisplayName((contact as any).ownerId)}
                  </span>
                )}
                {(contact as any).linkedinUrl && (
                  <a
                    href={(contact as any).linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0A66C2] hover:opacity-80 transition-opacity"
                    onClick={e => e.stopPropagation()}
                    data-testid={`link-linkedin-${contact.id}`}
                  >
                    <SiLinkedin className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{contact.title || "No Title"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" data-testid={`button-contact-more-${contact.id}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(contact)} data-testid={`button-edit-contact-${contact.id}`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Contact
                </DropdownMenuItem>
                {onAddToPortfolio && (
                  <DropdownMenuItem onClick={() => onAddToPortfolio(contact.id)} data-testid={`button-add-to-portfolio-${contact.id}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Portfolio
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={async () => {
                  try {
                    const res = await fetch(`/api/contacts/${contact.id}/vcard`);
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${(contact.name || "contact").replace(/[^a-zA-Z0-9_\-]/g, "_")}.vcf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch { }
                }} data-testid={`button-export-vcard-${contact.id}`}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Export to Phone
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(contact.id)} 
                  className="text-destructive focus:text-destructive"
                  data-testid={`button-delete-contact-${contact.id}`}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Contact
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-1">
          {contact.email && (
            <div className="flex items-center text-sm text-muted-foreground group/email">
              <Mail className="mr-2 h-3.5 w-3.5 shrink-0" />
              <a
                href={`mailto:${contact.email}`}
                className="hover:text-primary hover:underline transition-colors truncate"
                onClick={e => e.stopPropagation()}
                data-testid={`link-email-${contact.id}`}
              >
                {contact.email}
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(contact.email!);
                  toast({ title: "Email copied", description: contact.email });
                }}
                className="ml-1.5 opacity-0 group-hover/email:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                data-testid={`button-copy-email-${contact.id}`}
                title="Copy email"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="mr-2 h-3.5 w-3.5 shrink-0" />{contact.phone}
            </div>
          )}
        </div>

        {/* Service Needs badges */}
        {contactServiceNeeds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {SERVICE_NEEDS.filter(s => contactServiceNeeds.includes(s.key)).map(s => (
              <span key={s.key} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-background ${s.color}`}
                style={{ borderColor: "currentColor", opacity: 0.9 }}
                data-testid={`badge-contact-service-${contact.id}-${s.key}`}>
                <s.Icon className="h-3 w-3" />{s.label}
              </span>
            ))}
          </div>
        )}

      </CardContent>
    </Card>
  );
}

const SERVICE_NEEDS = [
  { key: "building_engineering", label: "Building Engineer", Icon: HardHat, color: "text-orange-500" },
  { key: "facility_solutions", label: "Facility Solutions", Icon: Wrench, color: "text-blue-500" },
  { key: "janitorial", label: "Janitorial", Icon: Sparkles, color: "text-teal-500" },
  { key: "special_projects", label: "Special Projects", Icon: Zap, color: "text-purple-500" },
  { key: "property_assessment", label: "Property Assessment", Icon: ClipboardList, color: "text-primary" },
] as const;

interface EmailMsg {
  id: number;
  direction: string;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  aiSummary: string | null;
  aiSentiment: string | null;
  aiSuggestedTasks: { title: string; priority: string; dueInDays?: number }[] | null;
  requiresResponse: boolean;
  receivedAt: string;
  fullBody: string | null;
}

function ClientEmailsTab({ clientId }: { clientId: number }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data: emails = [], isLoading } = useQuery<EmailMsg[]>({
    queryKey: ["/api/email-messages", clientId],
    queryFn: () => fetch(`/api/email-messages?clientId=${clientId}`, { credentials: "include" }).then(r => r.json()),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-32 text-gray-400"><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Loading emails...</div>;
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center text-gray-400">
        <Mail className="h-10 w-10 mb-3 text-gray-300" />
        <p className="font-medium text-gray-600">No emails linked yet</p>
        <p className="text-sm mt-1">Sync your Gmail to see communication history with this client.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => {
        const sentimentColor = email.aiSentiment === "urgent" || email.aiSentiment === "negative" ? "text-red-600 bg-red-50 border-red-200" : email.aiSentiment === "positive" ? "text-green-700 bg-green-50 border-green-200" : "text-gray-500 bg-gray-50 border-gray-200";
        return (
          <div key={email.id} className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden" data-testid={`email-item-${email.id}`}>
            <div className="px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium border rounded px-1.5 py-0.5 ${email.direction === "inbound" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-gray-600 bg-gray-50 border-gray-200"}`}>
                    {email.direction === "inbound" ? "Inbound" : "Outbound"}
                  </span>
                  {email.aiSentiment && (
                    <span className={`inline-flex items-center text-xs border rounded px-1.5 py-0.5 ${sentimentColor}`}>
                      {email.aiSentiment.charAt(0).toUpperCase() + email.aiSentiment.slice(1)}
                    </span>
                  )}
                  {email.requiresResponse && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                      <AlertCircle className="h-3 w-3" /> Needs Response
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-900 text-sm truncate">{email.subject ?? "(no subject)"}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {email.direction === "inbound" ? `From: ${email.fromName ?? email.fromEmail}` : `To: ${email.fromEmail}`}
                  {" · "}{new Date(email.receivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                {email.aiSummary && (
                  <p className="text-xs text-gray-600 mt-2 leading-relaxed"><span className="font-medium">AI:</span> {email.aiSummary}</p>
                )}
                {(email.aiSuggestedTasks?.length ?? 0) > 0 && (
                  <p className="text-xs text-primary mt-1 font-medium">{email.aiSuggestedTasks!.length} suggested task{email.aiSuggestedTasks!.length !== 1 ? "s" : ""}</p>
                )}
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5"
                onClick={() => setExpandedId(expandedId === email.id ? null : email.id)}
                data-testid={`button-expand-email-${email.id}`}
              >
                {expandedId === email.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
            {expandedId === email.id && email.fullBody && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed max-h-52 overflow-y-auto">{email.fullBody}</pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BuildOpsAgreementsSection({ clientId }: { clientId: number }) {
  const { data: agreements, isLoading } = useQuery<Array<{
    id: string;
    agreementNumber?: number | string;
    name?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    totalAmount?: number;
  }>>({ queryKey: ["/api/clients", clientId, "buildops-agreements"] });

  if (isLoading) return null;
  if (!agreements || agreements.length === 0) return null;

  return (
    <Card className="shadow-sm border-border/40 bg-card">
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <BuildOpsIcon className="h-5 w-5 shrink-0" />
        <CardTitle className="text-base font-semibold">BuildOps Service Agreements</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {agreements.map(sa => (
            <div key={sa.id} className="px-6 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {sa.name ?? (sa.agreementNumber ? `Agreement #${sa.agreementNumber}` : "Unnamed Agreement")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sa.startDate ? new Date(sa.startDate).toLocaleDateString() : "—"}
                  {sa.endDate ? ` → ${new Date(sa.endDate).toLocaleDateString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {sa.totalAmount != null && (
                  <span className="text-sm font-medium">
                    ${sa.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                )}
                {sa.status && (
                  <Badge variant="outline" className="capitalize text-xs">{sa.status.toLowerCase().replace(/_/g, " ")}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id!);
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { user: authUser } = useAuth();
  const isAdminOrManager = authUser?.role === "super_admin" || authUser?.role === "admin" || authUser?.role === "manager";
  const { toast } = useToast();
  const [isAddSpendOpen, setIsAddSpendOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [clientIndustryCustomMode, setClientIndustryCustomMode] = useState(false);
  const { data: industryOptionsList } = useQuery<IndustryOption[]>({ queryKey: ["/api/industry-options"] });
  const industryOptionLabels = industryOptionsList?.map(o => o.label) ?? [];
  const [highlightedContactId, setHighlightedContactId] = useState<number | null>(null);
  const urlInitializedRef = useRef(false);

  useEffect(() => {
    if (urlInitializedRef.current) return;
    const params = new URLSearchParams(searchParams);
    const tab = params.get("tab");
    const contactId = params.get("contactId");
    if (tab) {
      setActiveTab(tab);
      urlInitializedRef.current = true;
    }
    if (contactId) {
      const cid = Number(contactId);
      setHighlightedContactId(cid);
      setTimeout(() => setHighlightedContactId(null), 3000);
      urlInitializedRef.current = true;
    }
  }, [searchParams]);

  const [isEditCompanyOpen, setIsEditCompanyOpen] = useState(false);
  const [spendFormData, setSpendFormData] = useState({ amount: "", category: "meals_entertainment", date: new Date().toISOString().split("T")[0], description: "", contactId: "" });
  const [isSubmittingSpend, setIsSubmittingSpend] = useState(false);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isCardScannerOpen, setIsCardScannerOpen] = useState(false);
  const [isEditContactDialogOpen, setIsEditContactDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ClientContact | null>(null);
  const [orgChartEditId, setOrgChartEditId] = useState<number | null>(null);
  const [isOfficeDialogOpen, setIsOfficeDialogOpen] = useState(false);
  const [isEditOfficeDialogOpen, setIsEditOfficeDialogOpen] = useState(false);
  const [isNewPortfolioDialogOpen, setIsNewPortfolioDialogOpen] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState("");
  const [newPortfolioDesc, setNewPortfolioDesc] = useState("");
  const [newPortfolioBuildings, setNewPortfolioBuildings] = useState<{ name: string; address: string; lat?: number; lng?: number }[]>([]);
  const [editingOffice, setEditingOffice] = useState<ClientOffice | null>(null);
  const [officeLat, setOfficeLat] = useState<number | null>(null);
  const [officeLng, setOfficeLng] = useState<number | null>(null);
  const [editOfficeLat, setEditOfficeLat] = useState<number | null>(null);
  const [editOfficeLng, setEditOfficeLng] = useState<number | null>(null);
  const [defaultOfficeId, setDefaultOfficeId] = useState<number | null>(null);
  const [addContactPortfolioId, setAddContactPortfolioId] = useState<string>("none");
  const [portfolioPickerContactId, setPortfolioPickerContactId] = useState<number | null>(null);
  const [portfolioPickerPortfolioId, setPortfolioPickerPortfolioId] = useState<string>("none");
  const [portfolioPickerRole, setPortfolioPickerRole] = useState<string>("");
  const [logoImgError, setLogoImgError] = useState(false);
  const [contactPhotoPreviewError, setContactPhotoPreviewError] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ label: string; description: string; onConfirm: () => void } | null>(null);
  const [dragContactId, setDragContactId] = useState<number | null>(null);
  const [dragOverOfficeId, setDragOverOfficeId] = useState<number | "unassigned" | null>(null);
  const [orgChartView, setOrgChartView] = useState<"people" | "portfolio">("people");

  // Queries
  const { data: client, isLoading: isLoadingClient } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
  });

  useEffect(() => {
    if (client?.industry && industryOptionLabels.length > 0 && !industryOptionLabels.includes(client.industry)) {
      setClientIndustryCustomMode(true);
    } else {
      setClientIndustryCustomMode(false);
    }
  }, [client?.id]);

  const { data: contacts, isLoading: isLoadingContacts } = useQuery<ClientContact[]>({
    queryKey: ["/api/clients", clientId, "contacts"],
  });

  const { data: offices } = useQuery<ClientOffice[]>({
    queryKey: ["/api/clients", clientId, "offices"],
  });

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    select: (leads) => leads.filter(l => l.clientId === clientId),
  });

  const { data: estimates } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates"],
    select: (estimates) => estimates.filter(e => e.clientId === clientId),
  });

  const { data: activityLogs } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity-logs", "client", clientId],
    queryFn: () =>
      fetch(`/api/activity-logs?entityType=client&entityId=${clientId}`, { credentials: "include" })
        .then(r => r.json()),
  });

  const { data: allClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: clientPortfolios = [] } = useQuery<BuildingPortfolio[]>({
    queryKey: ["/api/portfolios", { clientId }],
    queryFn: async () => {
      const res = await fetch(`/api/portfolios?clientId=${clientId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch portfolios");
      return res.json();
    },
  });

  const { data: allBuildings = [] } = useQuery<Array<{ id: number; name: string; address?: string | null; lat?: string | null; lng?: string | null; notes?: string | null; contactName: string; contactId: number | null; type: "building" | "office" }>>({
    queryKey: ["/api/clients", clientId, "all-buildings"],
  });

  const { data: contactStages = [] } = useQuery<ContactStage[]>({
    queryKey: ["/api/contact-stages"],
  });

  const { data: users = [] } = useQuery<{id: string; firstName: string|null; lastName: string|null; email: string|null}[]>({
    queryKey: ["/api/users"],
  });

  const getUserDisplayName = (userId: string) => {
    const u = users.find(u => u.id === userId);
    if (!u) return "Unknown";
    return `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || "Unknown";
  };

  const getUserInitials = (userId: string) => {
    const u = users.find(u => u.id === userId);
    if (!u) return "?";
    const first = u.firstName?.[0] ?? "";
    const last = u.lastName?.[0] ?? "";
    return (first + last).toUpperCase() || (u.email?.[0]?.toUpperCase() ?? "?");
  };

  const createPortfolioWithBuildingsMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; buildings: { name: string; address: string; lat?: number; lng?: number }[] }) => {
      const portRes = await apiRequest("POST", "/api/portfolios", {
        name: data.name,
        clientId: clientId ? Number(clientId) : null,
        description: data.description || null,
      });
      if (!portRes.ok) throw new Error("Failed to create portfolio");
      const portfolio = await portRes.json();
      for (const row of data.buildings.filter(b => b.address?.trim())) {
        try {
          const buildingRes = await apiRequest("POST", "/api/contact-buildings", {
            name: row.name.trim() || null,
            address: row.address.trim(),
            lat: row.lat ?? null,
            lng: row.lng ?? null,
            contactId: null,
          });
          const building = await buildingRes.json();
          await apiRequest("POST", `/api/portfolios/${portfolio.id}/buildings`, { buildingId: building.id });
        } catch {
          // skip failed rows
        }
      }
      return portfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", { clientId }] });
      queryClient.invalidateQueries({ queryKey: ["/api/contact-buildings"] });
      setIsNewPortfolioDialogOpen(false);
      setNewPortfolioName("");
      setNewPortfolioDesc("");
      setNewPortfolioBuildings([]);
      toast({ title: "Portfolio created" });
    },
    onError: () => toast({ title: "Failed to create portfolio", variant: "destructive" }),
  });

  const { data: allContacts = [] } = useQuery<ClientContact[]>({
    queryKey: ["/api/client-contacts"],
  });

  const { data: spendEntries = [], isLoading: isLoadingSpend } = useQuery<BdSpendEntry[]>({
    queryKey: ["/api/clients", clientId, "spend"],
  });

  // Mutations
  const updateClientMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/clients/${clientId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      toast({ title: "Success", description: "Client updated successfully" });
      setIsEditCompanyOpen(false);
    },
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/contacts`, data);
      return res.json();
    },
    onSuccess: async (newContact: ClientContact) => {
      if (addContactPortfolioId !== "none") {
        await apiRequest("POST", `/api/portfolios/${addContactPortfolioId}/contacts`, { contactId: newContact.id, role: null });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolios", { clientId }] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      setIsContactDialogOpen(false);
      setAddContactPortfolioId("none");
      contactForm.reset();
      toast({ title: "Success", description: "Contact added successfully" });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      toast({ title: "Success", description: "Contact deleted successfully" });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async ({ contactId, data }: { contactId: number; data: Partial<ClientContact> }) => {
      const res = await apiRequest("PUT", `/api/clients/${clientId}/contacts/${contactId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      setOrgChartEditId(null);
      toast({ title: "Updated", description: "Contact updated successfully" });
    },
  });

  const saveEditContactMutation = useMutation({
    mutationFn: async (data: Partial<ClientContact> & { id: number }) => {
      const { id: contactId, ...fields } = data;
      const res = await apiRequest("PUT", `/api/clients/${clientId}/contacts/${contactId}`, fields);
      return res.json();
    },
    onSuccess: (updated: ClientContact) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", updated.clientId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      setIsEditContactDialogOpen(false);
      setEditingContact(null);
      toast({ title: "Saved", description: "Contact updated successfully" });
    },
  });

  const updateServiceNeedsMutation = useMutation({
    mutationFn: async (serviceNeeds: string[]) => {
      const res = await apiRequest("PUT", `/api/clients/${clientId}`, { serviceNeeds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
  });

  const toggleServiceNeed = (key: string) => {
    const current: string[] = client?.serviceNeeds ?? [];
    const updated = current.includes(key)
      ? current.filter(s => s !== key)
      : [...current, key];
    updateServiceNeedsMutation.mutate(updated);
  };

  const createOfficeMutation = useMutation({
    mutationFn: async (data: { name: string; address?: string; phone?: string; lat?: number | null; lng?: number | null }) => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/offices`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "offices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "all-buildings"] });
      setIsOfficeDialogOpen(false);
      officeForm.reset({ name: "", address: "", phone: "" });
      setOfficeLat(null); setOfficeLng(null);
      toast({ title: "Office added", description: "The office/division has been created." });
    },
  });

  const updateOfficeMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; address?: string; phone?: string; lat?: number | null; lng?: number | null }) => {
      const { id, ...fields } = data;
      const res = await apiRequest("PUT", `/api/clients/${clientId}/offices/${id}`, fields);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "offices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "all-buildings"] });
      setIsEditOfficeDialogOpen(false);
      setEditingOffice(null);
      setEditOfficeLat(null); setEditOfficeLng(null);
      toast({ title: "Office updated" });
    },
  });

  const deleteOfficeMutation = useMutation({
    mutationFn: async (officeId: number) => {
      await apiRequest("DELETE", `/api/clients/${clientId}/offices/${officeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "offices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      toast({ title: "Office deleted", description: "Contacts have been moved to unassigned." });
    },
  });

  const verifyEmploymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/clients/${clientId}/verify-employment`);
      if (!res.ok) throw new Error((await res.json()).message || "Verification failed");
      return res.json() as Promise<{ contactId: number; name: string; status: string; currentEmployer: string | null }[]>;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
      const active = results.filter(r => r.status === "active").length;
      const left = results.filter(r => r.status === "likely_left").length;
      const unverified = results.filter(r => r.status === "unverified").length;
      toast({
        title: "Employment verified",
        description: `${active} active, ${left} may have left, ${unverified} open to work`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    },
  });

  const moveContactToOfficeMutation = useMutation({
    mutationFn: async ({ contactId, officeId }: { contactId: number; officeId: number | null }) => {
      const res = await apiRequest("PATCH", `/api/contacts/${contactId}`, { officeId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
    },
    onError: () => {
      toast({ title: "Move failed", description: "Could not move contact.", variant: "destructive" });
    },
  });

  const openAddContactForOffice = (officeId: number | null) => {
    setDefaultOfficeId(officeId);
    contactForm.setValue("officeId" as any, officeId ?? undefined);
    setIsContactDialogOpen(true);
  };

  const openEditOffice = (office: ClientOffice) => {
    setEditingOffice(office);
    editOfficeForm.reset({ name: office.name, address: office.address || "", phone: office.phone || "" });
    setEditOfficeLat(office.lat ? parseFloat(String(office.lat)) : null);
    setEditOfficeLng(office.lng ? parseFloat(String(office.lng)) : null);
    setIsEditOfficeDialogOpen(true);
  };

  // Forms
  const clientForm = useForm({
    resolver: zodResolver(insertClientSchema),
    resetOptions: { keepDirtyValues: true },
    values: client ? {
      name: client.name,
      industry: client.industry || "",
      address: client.address || "",
      phone: client.phone || "",
      email: client.email || "",
      website: client.website || "",
      notes: client.notes || "",
      tier: (client as any).tier ?? null,
      annualRevenue: (client as any).annualRevenue ?? null,
      logoUrl: (client as any).logoUrl ?? "",
    } : {
      name: "",
      industry: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      notes: "",
      tier: null,
      annualRevenue: null,
      logoUrl: "",
    },
  });

  const contactForm = useForm({
    resolver: zodResolver(insertClientContactSchema),
    defaultValues: {
      clientId,
      name: "",
      title: "",
      email: "",
      phone: "",
      isPrimary: false,
      tier: null as string | null,
      stageId: null as number | null,
      ownerId: null as string | null,
      reportsTo: undefined as number | undefined,
      serviceNeeds: [] as string[],
      profilePictureUrl: "" as any,
    },
  });

  const editContactForm = useForm({
    defaultValues: {
      name: "",
      title: "",
      email: "",
      phone: "",
      isPrimary: false,
      tier: null as string | null,
      stageId: null as number | null,
      ownerId: null as string | null,
      reportsTo: null as number | null,
      officeId: null as number | null,
      clientId: clientId,
      serviceNeeds: [] as string[],
      linkedinUrl: "",
      profilePictureUrl: "" as any,
    },
  });

  const officeForm = useForm({
    defaultValues: { name: "", address: "", phone: "" },
  });

  const editOfficeForm = useForm({
    defaultValues: { name: "", address: "", phone: "" },
  });

  const openEditContact = (contact: ClientContact) => {
    setEditingContact(contact);
    editContactForm.reset({
      name: contact.name,
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
      isPrimary: contact.isPrimary,
      tier: (contact as any).tier ?? null,
      stageId: (contact as any).stageId ?? null,
      ownerId: (contact as any).ownerId ?? null,
      reportsTo: contact.reportsTo ?? null,
      officeId: contact.officeId ?? null,
      clientId: contact.clientId,
      serviceNeeds: (contact.serviceNeeds as string[] | null) ?? [],
      linkedinUrl: (contact as any).linkedinUrl || "",
      profilePictureUrl: (contact as any).profilePictureUrl || "",
    });
    setContactPhotoPreviewError(false);
    setIsEditContactDialogOpen(true);
  };

  const watchedEditCompanyId = editContactForm.watch("clientId");

  const onSaveEditContact = (data: any) => {
    if (!editingContact) return;
    saveEditContactMutation.mutate({ id: editingContact.id, ...data });
  };

  const onUpdateClient = (data: any) => {
    updateClientMutation.mutate(data);
  };

  const onAddContact = (data: any) => {
    createContactMutation.mutate(data);
  };

  if (isLoadingClient) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold">Customer not found</h2>
        <Button variant="ghost" onClick={() => setLocation("/customers")}>Back to Customers</Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/customers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 text-xl overflow-hidden border">
          {(client as any).logoUrl && !logoImgError ? (
            <img
              src={`/api/clients/${clientId}/logo-img`}
              alt={client.name}
              className="h-full w-full object-contain"
              onError={() => setLogoImgError(true)}
              data-testid="img-client-logo"
            />
          ) : (
            client.name[0].toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-heading font-bold" data-testid="text-client-name">{client.name}</h1>
            <Badge variant="outline" className="h-6">Customer ID: {client.id}</Badge>
            {(client as any).tier && <TierBadge tier={(client as any).tier} />}
            {(client as any).buildopsId && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span data-testid="badge-buildops-synced" className="cursor-default">
                      <BuildOpsIcon className="h-5 w-5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Synced with BuildOps</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">{client.industry || "No industry specified"}</p>
            <BuildOpsStatusBadge buildopsId={(client as any).buildopsId} buildopsStatus={(client as any).buildopsStatus} showInactive={isAdminOrManager} />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0 gap-1 md:gap-6 overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap">
            <Building2 className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap">
            <Users className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="deals" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap">
            <Target className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Leads</span>
          </TabsTrigger>
          <TabsTrigger value="estimates" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap">
            <FileText className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Estimates</span>
          </TabsTrigger>
          <TabsTrigger value="orgchart" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap">
            <GitBranch className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Org Chart</span>
          </TabsTrigger>
          <TabsTrigger value="portfolio-map" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap" data-testid="tab-portfolio-map">
            <Map className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Portfolio Map</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap">
            <History className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="emails" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap" data-testid="tab-emails">
            <Mail className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Emails</span>
          </TabsTrigger>
          <TabsTrigger value="attachments" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap">
            <Paperclip className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Files</span>
          </TabsTrigger>
          {client?.buildopsId && (
            <>
              <TabsTrigger value="buildops-jobs" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap" data-testid="tab-buildops-jobs">
                <Briefcase className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Jobs</span>
              </TabsTrigger>
              <TabsTrigger value="buildops-invoices" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap" data-testid="tab-buildops-invoices">
                <Receipt className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Invoices</span>
              </TabsTrigger>
              <TabsTrigger value="buildops-agreements" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap" data-testid="tab-buildops-agreements">
                <FileSignature className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Agreements</span>
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="intelligence" className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none h-12 px-3 font-medium shrink-0 whitespace-nowrap" data-testid="tab-intelligence">
            <HeartPulse className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Intelligence</span>
          </TabsTrigger>
        </TabsList>

        <div className="py-6">
          {/* ── Edit Company Dialog ── */}
          <Dialog open={isEditCompanyOpen} onOpenChange={setIsEditCompanyOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Company Info</DialogTitle>
                <DialogDescription>Update company details. Changes are saved immediately.</DialogDescription>
              </DialogHeader>
              <Form {...clientForm}>
                <form onSubmit={clientForm.handleSubmit(onUpdateClient)} className="space-y-4 pt-2">
                  {/* Logo Section */}
                  <div className="space-y-3 pb-4 border-b">
                    <FormLabel>Company Logo</FormLabel>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden border">
                        {clientForm.watch("logoUrl") ? (
                          <img
                            src={clientForm.watch("logoUrl")?.startsWith("https://storage.googleapis.com/") ? `/api/clients/${clientId}/logo-img?v=${encodeURIComponent(clientForm.watch("logoUrl") || "")}` : clientForm.watch("logoUrl") || ""}
                            alt="Logo Preview"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Building2 className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={async () => {
                              const website = clientForm.getValues("website");
                              if (!website) {
                                toast({ title: "No website", description: "Please enter a website URL first", variant: "destructive" });
                                return;
                              }
                              try {
                                const domain = new URL(website.startsWith("http") ? website : `https://${website}`).hostname.replace("www.", "");
                                toast({ title: "Fetching logo...", description: "Looking up logo for " + domain });
                                const res = await fetch(`/api/fetch-logo?domain=${encodeURIComponent(domain)}&clientId=${clientId}`, { credentials: "include" });
                                if (!res.ok) throw new Error("Not found");
                                const data = await res.json();
                                clientForm.setValue("logoUrl", data.url, { shouldDirty: true });
                                setLogoImgError(false);
                                toast({ title: "Logo found", description: "Click Save Changes to keep it." });
                              } catch (e) {
                                toast({ title: "Logo not found", description: "Could not find a logo. Try uploading one manually.", variant: "destructive" });
                              }
                            }}
                            data-testid="button-logo-autofetch"
                          >
                            <Globe className="h-3.5 w-3.5 mr-1.5" />
                            Auto-fetch
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => document.getElementById("logo-upload-dialog")?.click()}
                            data-testid="button-logo-upload"
                          >
                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                            Upload
                          </Button>
                          <input
                            id="logo-upload-dialog"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const formData = new FormData();
                              formData.append("logo", file);
                              try {
                                const res = await fetch(`/api/clients/${clientId}/logo`, {
                                  method: "POST",
                                  body: formData,
                                  credentials: "include",
                                });
                                if (!res.ok) throw new Error("Upload failed");
                                const data = await res.json();
                                clientForm.setValue("logoUrl", data.url);
                                queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
                                toast({ title: "Logo uploaded", description: "Company logo has been updated." });
                              } catch (err) {
                                toast({ title: "Upload failed", description: "Could not upload logo. Please try again.", variant: "destructive" });
                              }
                            }}
                          />
                        </div>
                        {clientForm.watch("logoUrl") && (
                          <button
                            type="button"
                            className="text-[11px] text-muted-foreground hover:text-destructive w-fit transition-colors"
                            onClick={() => clientForm.setValue("logoUrl", "")}
                            data-testid="button-logo-remove"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={clientForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-1 md:col-span-2">
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-edit-client-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clientForm.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Industry</FormLabel>
                            <Link to="/settings" className="text-xs text-primary hover:underline">Manage options →</Link>
                          </div>
                          <Select
                            value={clientIndustryCustomMode ? "__custom__" : (field.value || "")}
                            onValueChange={(val) => {
                              if (val === "__none__") {
                                setClientIndustryCustomMode(false);
                                field.onChange("");
                              } else if (val === "__custom__") {
                                setClientIndustryCustomMode(true);
                                field.onChange("");
                              } else {
                                setClientIndustryCustomMode(false);
                                field.onChange(val);
                              }
                            }}
                          >
                            <SelectTrigger data-testid="select-edit-client-industry">
                              <SelectValue placeholder="Select industry..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— None —</SelectItem>
                              {industryOptionLabels.map(v => (
                                <SelectItem key={v} value={v}>{v}</SelectItem>
                              ))}
                              <SelectItem value="__custom__">Custom...</SelectItem>
                            </SelectContent>
                          </Select>
                          {clientIndustryCustomMode && (
                            <Input
                              className="mt-2"
                              placeholder="Type custom industry..."
                              value={field.value || ""}
                              onChange={(e) => field.onChange(e.target.value)}
                              data-testid="input-edit-client-industry"
                            />
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clientForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="www.example.com" {...field} data-testid="input-company-website" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clientForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 000-0000" {...field} data-testid="input-edit-client-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clientForm.control}
                      name="annualRevenue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Revenue ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="1000"
                              placeholder="e.g. 120000"
                              {...field}
                              value={field.value ?? ""}
                              data-testid="input-edit-client-annual-revenue"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={clientForm.control}
                    name={"tier" as any}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Tier</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-client-tier">
                              <SelectValue placeholder="No Tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Tier</SelectItem>
                            <SelectItem value="tier_1">Tier 1 — High Value</SelectItem>
                            <SelectItem value="tier_2">Tier 2 — Medium Value</SelectItem>
                            <SelectItem value="tier_3">Tier 3 — Lower Value</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={clientForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} className="min-h-[100px]" data-testid="textarea-edit-client-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setIsEditCompanyOpen(false)}>Cancel</Button>
                    <Button
                      type="submit"
                      disabled={updateClientMutation.isPending}
                      data-testid="button-save-client-changes"
                    >
                      {updateClientMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <TabsContent value="overview" className="m-0 space-y-6">
            {/* ── Stats Row ── */}
            {(() => {
              const activeLeadsArr = leads?.filter(l => !["won", "lost"].includes(l.stage)) ?? [];
              const pipelineValue = activeLeadsArr.reduce((sum, l) => sum + (parseFloat(l.value ?? "0") || 0), 0);
              const totalBdSpend = spendEntries.reduce((s, e) => s + parseFloat(e.amount), 0);
              const wonCount = leads?.filter(l => l.stage === "won").length ?? 0;
              const fmt = (n: number) => n >= 1000000
                ? `$${(n / 1000000).toFixed(1)}M`
                : n >= 1000
                ? `$${(n / 1000).toFixed(0)}K`
                : `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="shadow-sm border-border/40 bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Active Deals</p>
                      <Target className="h-4 w-4 text-primary shrink-0" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-2xl font-heading font-bold" data-testid="stat-active-deals">{activeLeadsArr.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">In pipeline</p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm border-border/40 bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pipeline Value</p>
                      <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-2xl font-heading font-bold" data-testid="stat-pipeline-value">{pipelineValue > 0 ? fmt(pipelineValue) : "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Estimated total</p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm border-border/40 bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total BD Spend</p>
                      <DollarSign className="h-4 w-4 text-primary shrink-0" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-2xl font-heading font-bold" data-testid="stat-total-spend">{totalBdSpend > 0 ? fmt(totalBdSpend) : "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Business development</p>
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm border-border/40 bg-card">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Won Deals</p>
                      <Trophy className="h-4 w-4 text-primary shrink-0" />
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <p className="text-2xl font-heading font-bold" data-testid="stat-won-deals">{wonCount}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Closed won</p>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {/* ── BuildOps Service Agreements ── */}
            {(client as any).buildopsId && (
              <BuildOpsAgreementsSection clientId={clientId} />
            )}

            {/* ── Two-column section ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: Company Info + Service Needs */}
              <div className="lg:col-span-3 space-y-6">
                {/* Read-only Company Info */}
                <Card className="shadow-sm border-border/40 bg-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base font-semibold">Company Info</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditCompanyOpen(true)}
                      data-testid="button-edit-company-info"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Industry", value: client.industry || null },
                      { label: "Phone", value: client.phone ? formatPhoneNumber(client.phone) : null },
                      { label: "Annual Revenue", value: client.annualRevenue && parseFloat(client.annualRevenue) > 0 ? `$${parseFloat(client.annualRevenue).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : null },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-start gap-3">
                        <span className="text-xs font-medium text-muted-foreground w-28 shrink-0 pt-0.5">{label}</span>
                        <span className="text-sm text-foreground">{value ?? <span className="text-muted-foreground italic">Not set</span>}</span>
                      </div>
                    ))}
                    {/* Website — clickable */}
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-28 shrink-0 pt-0.5">Website</span>
                      {client.website ? (
                        <a
                          href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1 min-w-0 overflow-hidden"
                          data-testid="link-company-website"
                        >
                          <span className="truncate">{client.website}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Not set</span>
                      )}
                    </div>
                    {/* Tier */}
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-28 shrink-0 pt-0.5">Tier</span>
                      {client.tier ? <TierBadge tier={client.tier} /> : <span className="text-sm text-muted-foreground italic">Not set</span>}
                    </div>
                    {/* Notes */}
                    {client.notes && (
                      <div className="flex items-start gap-3">
                        <span className="text-xs font-medium text-muted-foreground w-28 shrink-0 pt-0.5">Notes</span>
                        <span className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{client.notes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Service Needs */}
                <Card className="shadow-sm border-border/40 bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Service Needs</CardTitle>
                    <CardDescription>Which M5 services does this company require?</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {SERVICE_NEEDS.map(({ key, label, Icon, color }) => {
                      const isChecked = (client.serviceNeeds ?? []).includes(key);
                      return (
                        <div
                          key={key}
                          role="checkbox"
                          aria-checked={isChecked}
                          tabIndex={0}
                          onClick={() => !updateServiceNeedsMutation.isPending && toggleServiceNeed(key)}
                          onKeyDown={(e) => e.key === " " && !updateServiceNeedsMutation.isPending && toggleServiceNeed(key)}
                          data-testid={`toggle-service-need-${key}`}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer select-none ${
                            isChecked
                              ? "bg-primary/8 border border-primary/20"
                              : "hover:bg-muted/60 border border-transparent"
                          } ${updateServiceNeedsMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-primary border-primary" : "border-input"}`}>
                            {isChecked && <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </div>
                          <div className={`h-7 w-7 rounded flex items-center justify-center shrink-0 ${isChecked ? "bg-primary/10" : "bg-muted"}`}>
                            <Icon className={`h-3.5 w-3.5 ${isChecked ? color : "text-muted-foreground"}`} />
                          </div>
                          <span className={`text-sm font-medium ${isChecked ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Right: Offices Preview + Recent Activity */}
              <div className="lg:col-span-2 space-y-6">
                {/* Offices Preview */}
                <Card className="shadow-sm border-border/40 bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Offices</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {offices && offices.length > 0 ? (
                      <>
                        <div className="divide-y divide-border/60">
                          {offices.slice(0, 4).map((office) => (
                            <div key={office.id} className="flex items-start gap-3 px-6 py-3" data-testid={`office-preview-${office.id}`}>
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{office.name}</p>
                                {office.address && (
                                  <p className="text-xs text-muted-foreground truncate">{office.address}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="px-6 py-3 border-t border-border/60">
                          <button
                            onClick={() => setActiveTab("contacts")}
                            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                            data-testid="link-view-all-offices"
                          >
                            View all offices
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="px-6 pb-6 text-sm text-muted-foreground italic">No offices yet.</div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="shadow-sm border-border/40 bg-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {activityLogs && activityLogs.length > 0 ? (
                      <>
                        <div className="divide-y divide-border/60">
                          {activityLogs.slice(0, 5).map((log) => {
                            const actionLabel: Record<string, string> = {
                              created: "Record created",
                              updated: "Info updated",
                              stage_updated: "Stage changed",
                              deleted: "Record deleted",
                              note_added: "Note added",
                              contact_added: "Contact added",
                            };
                            const entityLabel: Record<string, string> = {
                              client: "Company", lead: "Deal", contact: "Contact",
                              task: "Task", estimate: "Estimate",
                            };
                            const label = `${entityLabel[log.entityType] ?? log.entityType} — ${actionLabel[log.action] ?? log.action}`;
                            return (
                              <div key={log.id} className="flex items-start gap-3 px-6 py-3" data-testid={`activity-preview-${log.id}`}>
                                <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-foreground leading-snug">{label}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="px-6 py-3 border-t border-border/60">
                          <button
                            onClick={() => setActiveTab("activity")}
                            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                            data-testid="link-view-full-timeline"
                          >
                            View full timeline
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="px-6 pb-6 text-sm text-muted-foreground italic">No activity yet.</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* ── Active Deals full-width card ── */}
            {(() => {
              const activeDeals = leads?.filter(l => !["won", "lost"].includes(l.stage)) ?? [];
              const stageColors: Record<string, string> = {
                met_introduced: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                new_lead: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
                in_conversation: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
                qualified: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
                proposal_sent: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
                won: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                lost: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
              };
              const stageLabels: Record<string, string> = {
                met_introduced: "Met / Introduced", new_lead: "Reached Out", in_conversation: "In Conversation",
                qualified: "Ready for Proposal", proposal_sent: "Proposal Sent", won: "Won", lost: "Lost",
              };
              const fmtVal = (v: string | null | undefined) => {
                const n = parseFloat(v ?? "0");
                if (!n) return null;
                return n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n.toLocaleString("en-US")}`;
              };
              return (
                <Card className="shadow-sm border-border/40 bg-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">Active Deals</CardTitle>
                      <Badge variant="secondary" className="text-xs">{activeDeals.length}</Badge>
                    </div>
                    {activeDeals.length > 0 && (
                      <button
                        onClick={() => setActiveTab("deals")}
                        className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                        data-testid="link-view-all-deals"
                      >
                        View all
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    {activeDeals.length > 0 ? (
                      <div className="divide-y divide-border/60">
                        {activeDeals.slice(0, 3).map((deal) => {
                          const daysOpen = deal.createdAt ? differenceInDays(new Date(), new Date(deal.createdAt)) : null;
                          const val = fmtVal(deal.value);
                          return (
                            <div key={deal.id} className="flex items-center gap-3 px-6 py-3" data-testid={`deal-preview-${deal.id}`}>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{deal.title}</p>
                                {daysOpen !== null && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{daysOpen} {daysOpen === 1 ? "day" : "days"} open</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {val && <span className="text-sm font-semibold tabular-nums">{val}</span>}
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${stageColors[deal.stage] ?? "bg-muted text-muted-foreground"}`}>
                                  {stageLabels[deal.stage] ?? deal.stage}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="px-6 pb-6 flex items-center gap-3">
                        <p className="text-sm text-muted-foreground italic">No active deals.</p>
                        <Link href="/leads">
                          <Button variant="outline" size="sm" data-testid="button-create-deal">
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Create one
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="contacts" className="m-0 space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Contacts &amp; Offices</h3>
                <p className="text-sm text-muted-foreground">Organize contacts by office or division</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-10 px-4"
                  onClick={() => setIsNewPortfolioDialogOpen(true)}
                  data-testid="button-new-portfolio"
                >
                  <Folders className="mr-2 h-4 w-4" />
                  New Portfolio
                </Button>
                <Button
                  variant="outline"
                  className="h-10 px-4"
                  onClick={() => setIsOfficeDialogOpen(true)}
                  data-testid="button-add-office"
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  Add Office
                </Button>
                <Button
                  variant="outline"
                  className="h-10 px-4"
                  onClick={() => setIsCardScannerOpen(true)}
                  data-testid="button-scan-business-card"
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  Scan Card
                </Button>
                <Button
                  className="h-10 px-4"
                  onClick={() => openAddContactForOffice(null)}
                  data-testid="button-add-contact"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </div>
            </div>

            {isLoadingContacts ? (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Offices with their contacts */}
                {(offices || []).map(office => {
                  const officeContacts = (contacts || []).filter(c => c.officeId === office.id);
                  return (
                    <Card
                      key={office.id}
                      className={`border-none shadow-sm bg-card transition-colors ${dragOverOfficeId === office.id ? "ring-2 ring-primary/50 bg-primary/5" : ""}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOverOfficeId(office.id); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverOfficeId(null); }}
                      onDrop={(e) => { e.preventDefault(); if (dragContactId !== null) moveContactToOfficeMutation.mutate({ contactId: dragContactId, officeId: office.id }); setDragContactId(null); setDragOverOfficeId(null); }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-base">{office.name}</h4>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                {office.address && <AddressLink address={office.address} showIcon className="text-xs text-muted-foreground" iconClassName="h-3 w-3" />}
                                {office.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{office.phone}</span>}
                                <span>{officeContacts.length} contact{officeContacts.length !== 1 ? "s" : ""}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-muted-foreground hover:text-foreground text-xs"
                              onClick={() => openAddContactForOffice(office.id)}
                              data-testid={`button-add-contact-to-office-${office.id}`}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add Contact
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  data-testid={`button-office-menu-${office.id}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditOffice(office)}
                                  data-testid={`button-edit-office-${office.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Office
                                </DropdownMenuItem>
                                {officeContacts.filter((c: any) => c.linkedinUrl).length > 0 && (
                                  <DropdownMenuItem
                                    onClick={async () => {
                                      const withLinkedin = officeContacts.filter((c: any) => c.linkedinUrl);
                                      toast({ title: `Syncing ${withLinkedin.length} LinkedIn profile${withLinkedin.length !== 1 ? "s" : ""}...` });
                                      for (const c of withLinkedin) {
                                        try {
                                          await apiRequest("POST", `/api/contacts/${c.id}/linkedin-enrich`, { linkedinUrl: (c as any).linkedinUrl, preview: false });
                                          await new Promise(r => setTimeout(r, 500));
                                        } catch {}
                                      }
                                      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
                                      toast({ title: "LinkedIn sync complete", description: `Updated ${withLinkedin.length} contact${withLinkedin.length !== 1 ? "s" : ""}` });
                                    }}
                                    data-testid={`button-bulk-linkedin-${office.id}`}
                                  >
                                    <SiLinkedin className="h-4 w-4 mr-2 text-[#0A66C2]" />
                                    Sync LinkedIn for All Contacts
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setDeleteConfirm({
                                      label: `Delete "${office.name}"`,
                                      description: "Contacts assigned to this office will become unassigned. This cannot be undone.",
                                      onConfirm: () => deleteOfficeMutation.mutate(office.id),
                                    });
                                  }}
                                  data-testid={`button-delete-office-${office.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Office
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {officeContacts.length === 0 ? (
                          <div className="py-6 text-center border-2 border-dashed border-border/40 rounded-lg">
                            <p className="text-sm text-muted-foreground">No contacts in this office yet.</p>
                            <Button variant="ghost" size="sm" className="mt-2 h-8 text-xs" onClick={() => openAddContactForOffice(office.id)}>
                              <Plus className="mr-1 h-3 w-3" />Add Contact
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {officeContacts.map(contact => (
                              <div
                                key={contact.id}
                                draggable
                                onDragStart={() => setDragContactId(contact.id)}
                                onDragEnd={() => { setDragContactId(null); setDragOverOfficeId(null); }}
                                className={`transition-all rounded-lg ${dragContactId === contact.id ? "opacity-40" : ""} ${highlightedContactId === contact.id ? "ring-2 ring-primary/60 ring-offset-2" : ""}`}
                                data-testid={`drag-contact-${contact.id}`}
                              >
                                <ContactCard
                                  contact={contact}
                                  onEdit={openEditContact}
                                  onDelete={(id) => { setDeleteConfirm({ label: "Delete contact", description: "This will permanently remove the contact and cannot be undone.", onConfirm: () => deleteContactMutation.mutate(id) }); }}
                                  onAddToPortfolio={clientPortfolios.length > 0 ? (id) => { setPortfolioPickerContactId(id); setPortfolioPickerPortfolioId("none"); setPortfolioPickerRole(""); } : undefined}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Unassigned contacts */}
                {(() => {
                  const unassigned = (contacts || []).filter(c => !c.officeId);
                  const hasOffices = (offices || []).length > 0;
                  if (!hasOffices && unassigned.length === 0) {
                    return (
                      <div className="text-center py-16 bg-muted/20 rounded-lg border-2 border-dashed border-border/50">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                        <h3 className="text-lg font-semibold">No offices or contacts yet</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mb-4 text-sm">Create an office to organize your contacts, or add a contact directly.</p>
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="outline" onClick={() => setIsOfficeDialogOpen(true)}>
                            <Building2 className="mr-2 h-4 w-4" />Add Office
                          </Button>
                          <Button onClick={() => openAddContactForOffice(null)}>
                            <Plus className="mr-2 h-4 w-4" />Add Contact
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  if (unassigned.length === 0) return null;
                  return (
                    <Card
                      className={`border-none shadow-sm bg-card transition-colors ${dragOverOfficeId === "unassigned" ? "ring-2 ring-muted-foreground/30 bg-muted/10" : ""}`}
                      onDragOver={(e) => { e.preventDefault(); setDragOverOfficeId("unassigned"); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverOfficeId(null); }}
                      onDrop={(e) => { e.preventDefault(); if (dragContactId !== null) moveContactToOfficeMutation.mutate({ contactId: dragContactId, officeId: null }); setDragContactId(null); setDragOverOfficeId(null); }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded bg-muted flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-base text-muted-foreground">Unassigned</h4>
                            <p className="text-xs text-muted-foreground">{unassigned.length} contact{unassigned.length !== 1 ? "s" : ""} not linked to an office</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {unassigned.map(contact => (
                            <div
                              key={contact.id}
                              draggable
                              onDragStart={() => setDragContactId(contact.id)}
                              onDragEnd={() => { setDragContactId(null); setDragOverOfficeId(null); }}
                              className={`transition-all rounded-lg ${dragContactId === contact.id ? "opacity-40" : ""} ${highlightedContactId === contact.id ? "ring-2 ring-primary/60 ring-offset-2" : ""}`}
                              data-testid={`drag-contact-${contact.id}`}
                            >
                              <ContactCard
                                contact={contact}
                                onEdit={openEditContact}
                                onDelete={(id) => { setDeleteConfirm({ label: "Delete contact", description: "This will permanently remove the contact and cannot be undone.", onConfirm: () => deleteContactMutation.mutate(id) }); }}
                                onAddToPortfolio={clientPortfolios.length > 0 ? (id) => { setPortfolioPickerContactId(id); setPortfolioPickerPortfolioId("none"); setPortfolioPickerRole(""); } : undefined}
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            )}

            {/* Card Scanner Dialog */}
            <CardScannerDialog
              open={isCardScannerOpen}
              onClose={() => {
                setIsCardScannerOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
              }}
              clients={allClients}
              defaultClientId={String(clientId)}
            />

            {/* Add Contact Dialog */}
            <Dialog open={isContactDialogOpen} onOpenChange={(open) => { setIsContactDialogOpen(open); if (!open) setDefaultOfficeId(null); }}>
              <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add Contact</DialogTitle>
                  <DialogDescription>Add a new contact person for {client.name}.</DialogDescription>
                </DialogHeader>
                <Form {...contactForm}>
                  <form onSubmit={contactForm.handleSubmit(onAddContact)} className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
                    <FormField control={contactForm.control} name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input placeholder="Enter contact name" {...field} data-testid="input-contact-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={contactForm.control} name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl><Input placeholder="e.g. Operations Manager" {...field} value={field.value || ""} data-testid="input-contact-title" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={contactForm.control} name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl><Input placeholder="email@example.com" {...field} value={field.value || ""} data-testid="input-contact-email" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField control={contactForm.control} name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="555-0123" 
                                {...field} 
                                value={field.value || ""} 
                                onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                                data-testid="input-contact-phone" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField control={contactForm.control} name={"linkedinUrl" as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <SiLinkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                            LinkedIn Profile URL
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://linkedin.com/in/username"
                              {...field}
                              value={field.value || ""}
                              data-testid="input-contact-linkedin"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {(offices || []).length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Office / Division</label>
                        <Select
                          onValueChange={(val) => (contactForm as any).setValue("officeId", val === "none" ? null : parseInt(val))}
                          defaultValue={defaultOfficeId?.toString() || "none"}
                        >
                          <SelectTrigger data-testid="select-contact-office">
                            <SelectValue placeholder="Select office (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No office (unassigned)</SelectItem>
                            {(offices || []).map(o => (
                              <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <FormField control={contactForm.control} name="reportsTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reports To</FormLabel>
                          <SearchableSelect
                            options={[
                              { value: "none", label: "No manager (top level)" },
                              ...(contacts || []).map(c => ({ value: c.id.toString(), label: c.name, sublabel: c.title ?? undefined }))
                            ]}
                            value={field.value?.toString() || "none"}
                            onChange={(val) => field.onChange(val === "none" ? undefined : parseInt(val))}
                            placeholder="Select manager (optional)"
                            searchPlaceholder="Search contacts..."
                            data-testid="select-contact-reports-to"
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Service Needs */}
                    <div>
                      <FormLabel className="text-sm font-medium">Service Needs</FormLabel>
                      <p className="text-xs text-muted-foreground mb-2 mt-0.5">Which M5 services does this contact require?</p>
                      <div className="grid grid-cols-1 gap-2">
                        {SERVICE_NEEDS.map(s => {
                          const current: string[] = (contactForm.watch("serviceNeeds") as string[]) ?? [];
                          const checked = current.includes(s.key);
                          return (
                            <div
                              key={s.key}
                              role="checkbox"
                              aria-checked={checked}
                              tabIndex={0}
                              className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors select-none ${checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                              onClick={() => {
                                const next = checked ? current.filter(k => k !== s.key) : [...current, s.key];
                                contactForm.setValue("serviceNeeds", next);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === " " || e.key === "Enter") {
                                  const next = checked ? current.filter(k => k !== s.key) : [...current, s.key];
                                  contactForm.setValue("serviceNeeds", next);
                                }
                              }}
                              data-testid={`toggle-add-contact-service-${s.key}`}
                            >
                              <s.Icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                              <span className="text-sm">{s.label}</span>
                              {checked && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <FormField control={contactForm.control} name={"tier" as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Tier</FormLabel>
                          <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-contact-tier">
                                <SelectValue placeholder="No Tier" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Tier</SelectItem>
                              <SelectItem value="tier_1">Tier 1 — High Value</SelectItem>
                              <SelectItem value="tier_2">Tier 2 — Medium Value</SelectItem>
                              <SelectItem value="tier_3">Tier 3 — Lower Value</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={contactForm.control} name={"stageId" as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Stage</FormLabel>
                          <Select
                            value={field.value != null ? String(field.value) : "none"}
                            onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-add-contact-stage">
                                <SelectValue placeholder="No stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No stage</SelectItem>
                              {contactStages.map(s => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${getStageBadgeClass(s.color)}`}>
                                    {s.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={contactForm.control} name={"ownerId" as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Relationship Owner</FormLabel>
                          <Select
                            value={field.value ?? "none"}
                            onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-add-contact-owner">
                                <SelectValue placeholder="Unassigned" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {users.map(u => (
                                <SelectItem key={u.id} value={u.id}>
                                  {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={contactForm.control} name="isPrimary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-contact-primary" />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Primary Contact</FormLabel>
                            <FormDescription>Mark this person as the main point of contact.</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    {clientPortfolios.length > 0 && (
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">Assign to Portfolio <span className="text-muted-foreground font-normal">(optional)</span></label>
                        <Select value={addContactPortfolioId} onValueChange={setAddContactPortfolioId}>
                          <SelectTrigger data-testid="select-add-contact-portfolio">
                            <SelectValue placeholder="Select portfolio (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No portfolio</SelectItem>
                            {clientPortfolios.map(p => (
                              <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <DialogFooter className="pt-4">
                      <Button type="submit" className="w-full h-11" disabled={createContactMutation.isPending} data-testid="button-submit-contact">
                        {createContactMutation.isPending ? "Adding..." : "Add Contact"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Add to Portfolio Dialog */}
            <Dialog open={portfolioPickerContactId !== null} onOpenChange={open => { if (!open) { setPortfolioPickerContactId(null); setPortfolioPickerPortfolioId("none"); setPortfolioPickerRole(""); } }}>
              <DialogContent className="sm:max-w-[380px]">
                <DialogHeader>
                  <DialogTitle>Add to Portfolio</DialogTitle>
                  <DialogDescription>
                    Assign {contacts?.find(c => c.id === portfolioPickerContactId)?.name ?? "this contact"} to a portfolio for {client?.name}.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Portfolio</label>
                    <Select value={portfolioPickerPortfolioId} onValueChange={setPortfolioPickerPortfolioId}>
                      <SelectTrigger data-testid="select-portfolio-picker">
                        <SelectValue placeholder="Select a portfolio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a portfolio…</SelectItem>
                        {clientPortfolios.map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Role in Portfolio <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <Input
                      placeholder="e.g. Decision Maker, Facility Manager"
                      value={portfolioPickerRole}
                      onChange={e => setPortfolioPickerRole(e.target.value)}
                      data-testid="input-portfolio-picker-role"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setPortfolioPickerContactId(null); setPortfolioPickerPortfolioId("none"); setPortfolioPickerRole(""); }}>Cancel</Button>
                  <Button
                    disabled={portfolioPickerPortfolioId === "none"}
                    onClick={async () => {
                      if (!portfolioPickerContactId || portfolioPickerPortfolioId === "none") return;
                      await apiRequest("POST", `/api/portfolios/${portfolioPickerPortfolioId}/contacts`, { contactId: portfolioPickerContactId, role: portfolioPickerRole.trim() || null });
                      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", { clientId }] });
                      setPortfolioPickerContactId(null);
                      setPortfolioPickerPortfolioId("none");
                      setPortfolioPickerRole("");
                      const contactName = contacts?.find(c => c.id === portfolioPickerContactId)?.name ?? "Contact";
                      const portfolioName = clientPortfolios.find(p => String(p.id) === portfolioPickerPortfolioId)?.name ?? "portfolio";
                      toast({ title: "Added to portfolio", description: `${contactName} added to ${portfolioName}` });
                    }}
                    data-testid="button-confirm-add-to-portfolio"
                  >
                    Add to Portfolio
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Office Dialog */}
            <Dialog open={isOfficeDialogOpen} onOpenChange={setIsOfficeDialogOpen}>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle>Add Office / Division</DialogTitle>
                  <DialogDescription>Create a new office or division to organize contacts.</DialogDescription>
                </DialogHeader>
                <form onSubmit={officeForm.handleSubmit((d) => createOfficeMutation.mutate({ ...d, lat: officeLat, lng: officeLng }))} className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Name <span className="text-destructive">*</span></label>
                    <Input {...officeForm.register("name", { required: true })} placeholder="e.g. Downtown Office, West Division" data-testid="input-office-name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Address</label>
                    <AddressAutocomplete
                      value={officeForm.watch("address") || ""}
                      onChange={(addr, lat, lng) => {
                        officeForm.setValue("address", addr);
                        if (lat !== undefined) setOfficeLat(lat);
                        if (lng !== undefined) setOfficeLng(lng);
                      }}
                      placeholder="Search address..."
                      data-testid="input-office-address"
                    />
                    {officeLat && <p className="text-[11px] text-green-600 mt-1">📍 Location confirmed</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone</label>
                    <Input 
                      {...officeForm.register("phone")} 
                      onChange={(e) => officeForm.setValue("phone", formatPhoneNumber(e.target.value))}
                      placeholder="555-0100" 
                      data-testid="input-office-phone" 
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-11" disabled={createOfficeMutation.isPending} data-testid="button-submit-office">
                      {createOfficeMutation.isPending ? "Creating..." : "Create Office"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Office Dialog */}
            <Dialog open={isEditOfficeDialogOpen} onOpenChange={setIsEditOfficeDialogOpen}>
              <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                  <DialogTitle>Edit Office</DialogTitle>
                  <DialogDescription>Update the details for this office or division.</DialogDescription>
                </DialogHeader>
                <form onSubmit={editOfficeForm.handleSubmit((d) => editingOffice && updateOfficeMutation.mutate({ id: editingOffice.id, ...d, lat: editOfficeLat, lng: editOfficeLng }))} className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Name <span className="text-destructive">*</span></label>
                    <Input {...editOfficeForm.register("name", { required: true })} data-testid="input-edit-office-name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Address</label>
                    <AddressAutocomplete
                      value={editOfficeForm.watch("address") || ""}
                      onChange={(addr, lat, lng) => {
                        editOfficeForm.setValue("address", addr);
                        if (lat !== undefined) setEditOfficeLat(lat);
                        if (lng !== undefined) setEditOfficeLng(lng);
                      }}
                      placeholder="Search address..."
                      data-testid="input-edit-office-address"
                    />
                    {editOfficeLat && <p className="text-[11px] text-green-600 mt-1">📍 Location confirmed</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Phone</label>
                    <Input 
                      {...editOfficeForm.register("phone")} 
                      onChange={(e) => editOfficeForm.setValue("phone", formatPhoneNumber(e.target.value))}
                      placeholder="555-0123"
                      data-testid="input-edit-office-phone" 
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full h-11" disabled={updateOfficeMutation.isPending} data-testid="button-submit-edit-office">
                      {updateOfficeMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* New Portfolio Dialog */}
            <Dialog open={isNewPortfolioDialogOpen} onOpenChange={(open) => { setIsNewPortfolioDialogOpen(open); if (!open) { setNewPortfolioName(""); setNewPortfolioDesc(""); setNewPortfolioBuildings([]); } }}>
              <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                  <DialogTitle>New Portfolio</DialogTitle>
                  <DialogDescription>Create a building portfolio linked to this company.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Portfolio Name <span className="text-destructive">*</span></label>
                    <Input
                      placeholder="e.g. Downtown Campus, West Side Properties"
                      value={newPortfolioName}
                      onChange={e => setNewPortfolioName(e.target.value)}
                      data-testid="input-new-portfolio-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Description</label>
                    <Textarea
                      placeholder="Optional notes about this portfolio..."
                      value={newPortfolioDesc}
                      onChange={e => setNewPortfolioDesc(e.target.value)}
                      className="min-h-[60px] resize-none"
                      data-testid="textarea-new-portfolio-desc"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Buildings</label>
                      <button
                        type="button"
                        onClick={() => setNewPortfolioBuildings(prev => [...prev, { name: "", address: "" }])}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                        data-testid="button-add-portfolio-building"
                      >
                        <Plus className="h-3 w-3" />
                        Add Building
                      </button>
                    </div>
                    {newPortfolioBuildings.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No buildings yet — click "Add Building" above to include addresses.</p>
                    )}
                    <div className="space-y-3">
                      {newPortfolioBuildings.map((row, i) => (
                        <div key={i} className="flex gap-2 items-start">
                          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            <AddressAutocomplete
                              value={row.address}
                              onChange={(addr, lat, lng) => setNewPortfolioBuildings(prev => prev.map((r, idx) => idx === i ? { ...r, address: addr, lat, lng } : r))}
                              placeholder="Address *"
                              className="h-8 text-sm"
                              data-testid={`input-portfolio-building-address-${i}`}
                            />
                            <Input
                              placeholder="Building name (optional)"
                              value={row.name}
                              onChange={e => setNewPortfolioBuildings(prev => prev.map((r, idx) => idx === i ? { ...r, name: e.target.value } : r))}
                              className="h-8 text-sm"
                              data-testid={`input-portfolio-building-name-${i}`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setNewPortfolioBuildings(prev => prev.filter((_, idx) => idx !== i))}
                            className="mt-1.5 h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                            data-testid={`button-remove-portfolio-building-${i}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewPortfolioDialogOpen(false)}>Cancel</Button>
                  <Button
                    disabled={!newPortfolioName.trim() || createPortfolioWithBuildingsMutation.isPending}
                    onClick={() => createPortfolioWithBuildingsMutation.mutate({ name: newPortfolioName, description: newPortfolioDesc, buildings: newPortfolioBuildings })}
                    data-testid="button-create-new-portfolio"
                  >
                    {createPortfolioWithBuildingsMutation.isPending ? "Creating…" : "Create Portfolio"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="deals" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Sales Deals</CardTitle>
                  <CardDescription>Pipeline opportunities associated with this client</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {leads && leads.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <Table className="min-w-[500px]">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-bold">Deal Title</TableHead>
                          <TableHead className="font-bold">Stage</TableHead>
                          <TableHead className="font-bold text-right">Value</TableHead>
                          <TableHead className="font-bold">Created At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((lead) => (
                          <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setLocation(`/leads?id=${lead.id}`)}>
                            <TableCell className="font-medium text-primary underline underline-offset-4">{lead.title}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">{lead.stage.replace("_", " ")}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${parseFloat(lead.value as string).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(lead.createdAt), "MMM d, yyyy")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-semibold">No deals found</h3>
                    <p className="text-muted-foreground">There are no sales opportunities currently linked to this client.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="estimates" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Estimates</CardTitle>
                  <CardDescription>Job estimates and cost breakdowns</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {estimates && estimates.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <Table className="min-w-[500px]">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-bold">Estimate Title</TableHead>
                          <TableHead className="font-bold">Status</TableHead>
                          <TableHead className="font-bold text-right">Total</TableHead>
                          <TableHead className="font-bold">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {estimates.map((estimate) => (
                          <TableRow key={estimate.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setLocation(`/estimates/${estimate.id}`)}>
                            <TableCell className="font-medium text-primary underline underline-offset-4">{estimate.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{estimate.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              ${parseFloat(estimate.total as string).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(estimate.createdAt), "MMM d, yyyy")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-muted/20 rounded-lg">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="text-lg font-semibold">No estimates found</h3>
                    <p className="text-muted-foreground">No estimates have been created for this client yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orgchart" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="flex flex-row items-start justify-between pb-4">
                <div>
                  <CardTitle>{orgChartView === "people" ? "Organization Chart" : "Portfolio View"}</CardTitle>
                  <CardDescription>
                    {orgChartView === "people"
                      ? "Visual hierarchy of contacts. Click any node to view details or change reporting relationships."
                      : "Portfolios and their associated buildings and contacts."}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div className="flex rounded-md border border-border overflow-hidden">
                    <button
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium transition-colors",
                        orgChartView === "people"
                          ? "bg-primary text-white"
                          : "bg-background text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setOrgChartView("people")}
                      data-testid="button-org-view-people"
                    >
                      People
                    </button>
                    <button
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium border-l border-border transition-colors",
                        orgChartView === "portfolio"
                          ? "bg-primary text-white"
                          : "bg-background text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setOrgChartView("portfolio")}
                      data-testid="button-org-view-portfolio"
                    >
                      Portfolio
                    </button>
                  </div>
                  {orgChartView === "people" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyEmploymentMutation.mutate()}
                        disabled={verifyEmploymentMutation.isPending}
                        data-testid="button-verify-employment"
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${verifyEmploymentMutation.isPending ? "animate-spin" : ""}`} />
                        {verifyEmploymentMutation.isPending ? "Verifying..." : "Verify via LinkedIn"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsContactDialogOpen(true)}
                        data-testid="button-add-contact-org"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contact
                      </Button>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {orgChartView === "people" ? (
                  isLoadingContacts ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-muted-foreground text-sm">Loading org chart...</div>
                    </div>
                  ) : (
                    <OrgChart
                      contacts={contacts || []}
                      offices={offices || []}
                      onUpdateReportsTo={(contactId, reportsTo) => {
                        updateContactMutation.mutate({
                          contactId,
                          data: { reportsTo: reportsTo },
                        });
                      }}
                      onEditContact={openEditContact}
                      isUpdating={updateContactMutation.isPending}
                    />
                  )
                ) : (
                  /* Portfolio View */
                  clientPortfolios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                      <Folders className="h-10 w-10 opacity-20" />
                      <p className="text-sm">No portfolios yet — create one in the Portfolio tab.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {clientPortfolios.map((portfolio: any) => {
                        const portfolioBuildings = (portfolio.buildings ?? []).map((pb: any) =>
                          allBuildings.find((b: any) => b.id === pb.buildingId)
                        ).filter(Boolean);
                        const portfolioContacts = (portfolio.contacts ?? []).map((pc: any) =>
                          (contacts || []).find((c: any) => c.id === pc.contactId)
                        ).filter(Boolean);
                        return (
                          <div key={portfolio.id} className="border rounded-lg bg-card overflow-hidden" data-testid={`card-portfolio-view-${portfolio.id}`}>
                            <div className="bg-muted/40 px-4 py-2.5 border-b">
                              <p className="text-sm font-semibold flex items-center gap-2">
                                <Folders className="h-4 w-4 text-primary" />
                                {portfolio.name}
                              </p>
                            </div>
                            <div className="p-4 space-y-4">
                              {/* Buildings */}
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Buildings</p>
                                {portfolioBuildings.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">No buildings assigned</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {portfolioBuildings.map((b: any) => (
                                      <div key={b.id} className="flex items-start gap-2 text-xs">
                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                        <div>
                                          <p className="font-medium">{b.name || b.address || "Unnamed Building"}</p>
                                          {b.name && b.address && <p className="text-[10px] text-muted-foreground truncate">{b.address}</p>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {/* Contacts */}
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contacts</p>
                                {portfolioContacts.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">No contacts assigned</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {portfolioContacts.map((c: any) => (
                                      <div key={c.id} className="flex items-center gap-1.5 bg-muted rounded-full px-2.5 py-1 text-xs">
                                        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-semibold text-primary shrink-0">
                                          {c.name.charAt(0)}
                                        </div>
                                        <div>
                                          <span className="font-medium">{c.name}</span>
                                          {c.title && <span className="text-muted-foreground ml-1 text-[10px]">· {c.title}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio-map" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  Portfolio Map
                </CardTitle>
                <CardDescription>
                  Offices and buildings for {client.name} — {allBuildings.filter(b => b.lat).length} of {allBuildings.length} location{allBuildings.length !== 1 ? "s" : ""} mapped
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <BuildingsMap
                  buildings={allBuildings}
                  className="h-[520px] w-full"
                />
                {allBuildings.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {allBuildings.map(b => (
                      <div key={`${b.type}-${b.id}`} className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${b.lat ? "border-border bg-card" : "border-dashed border-border/50 bg-muted/20"}`}
                        data-testid={`map-list-item-${b.type}-${b.id}`}>
                        {b.type === "office"
                          ? <Building2 className={`h-4 w-4 mt-0.5 shrink-0 ${b.lat ? "text-slate-500" : "text-muted-foreground/50"}`} />
                          : <MapPin className={`h-4 w-4 mt-0.5 shrink-0 ${b.lat ? "text-primary" : "text-muted-foreground/50"}`} />
                        }
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium truncate">{b.name || b.address || "Unnamed Building"}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${b.type === "office" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"}`}>
                              {b.type === "office" ? "Office" : "Building"}
                            </span>
                            {(b as any).propertyType && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 font-medium capitalize">
                                {(b as any).propertyType.replace(/_/g, " ")}
                              </span>
                            )}
                            {isAdminOrManager && (b as any).buildopsIsInactive && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 font-medium">
                                Inactive in BuildOps
                              </span>
                            )}
                          </div>
                          {b.type === "building" && <p className="text-[11px] text-muted-foreground truncate">{b.contactName}</p>}
                          {b.address && <AddressLink address={b.address} className="text-xs text-muted-foreground mt-0.5 truncate" />}
                          {!b.lat && <p className="text-[10px] text-amber-500 mt-0.5 italic">No location — edit to add address</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company Portfolios section */}
            <Card className="border-none shadow-sm bg-card mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Company Portfolios</CardTitle>
                <CardDescription>Manage building portfolios linked to {client.name}</CardDescription>
              </CardHeader>
              <CardContent className="pb-6 px-0">
                <PortfolioManager
                  filterClientId={clientId}
                  allBuildings={(allBuildings as any[]).filter(b => b.type === "building").map(b => ({
                    id: b.id,
                    name: b.name,
                    address: b.address ?? null,
                    lat: b.lat ?? null,
                    lng: b.lng ?? null,
                    notes: null,
                    contactId: b.contactId,
                    createdAt: new Date(),
                  }))}
                  allContacts={contacts ?? []}
                  clients={client ? [client] : []}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="pb-0">
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>Complete history of interactions and changes</CardDescription>
              </CardHeader>
              <CardContent className="h-[600px] pt-6">
                <ActivityTimeline entityType="client" entityId={clientId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader className="pb-0">
                <CardTitle>Email History</CardTitle>
                <CardDescription>Gmail communications linked to this client, analyzed by AI</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ClientEmailsTab clientId={clientId} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments" className="m-0">
            <Card className="border-none shadow-sm bg-card">
              <CardHeader>
                <CardTitle>Files & Photos</CardTitle>
                <CardDescription>Manage documents and site photos for this client</CardDescription>
              </CardHeader>
              <CardContent>
                <AttachmentsPanel entityType="client" entityId={clientId} />
              </CardContent>
            </Card>
          </TabsContent>

          {client?.buildopsId && (
            <>
              <TabsContent value="buildops-jobs" className="m-0">
                <BuildOpsJobsTab clientId={clientId} />
              </TabsContent>
              <TabsContent value="buildops-invoices" className="m-0">
                <BuildOpsInvoicesTab clientId={clientId} />
              </TabsContent>
              <TabsContent value="buildops-agreements" className="m-0">
                <BuildOpsAgreementsTab clientId={clientId} />
              </TabsContent>
            </>
          )}
          <TabsContent value="intelligence" className="m-0">
            <IntelligenceTab clientId={clientId} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditContactDialogOpen} onOpenChange={(open) => {
        setIsEditContactDialogOpen(open);
        if (!open) setEditingContact(null);
      }}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact info or move them to a different company.
            </DialogDescription>
          </DialogHeader>
          <Form {...editContactForm}>
            <form onSubmit={editContactForm.handleSubmit(onSaveEditContact)} className="space-y-4 py-2 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editContactForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact name" {...field} data-testid="input-edit-contact-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editContactForm.control}
                  name={"profilePictureUrl" as any}
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Profile Photo</FormLabel>
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full overflow-hidden border bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {field.value && !contactPhotoPreviewError ? (
                            <img
                              src={field.value?.startsWith("https://storage.googleapis.com/") && editingContact ? `/api/contacts/${editingContact.id}/photo-img` : field.value}
                              className="h-full w-full object-cover"
                              onError={() => setContactPhotoPreviewError(true)}
                            />
                          ) : (
                            editContactForm.watch("name")
                              ?.split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "?"
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {field.value
                            ? <span className="flex items-center gap-1"><SiLinkedin className="h-3 w-3 text-[#0A66C2]" /> Synced from LinkedIn</span>
                            : "Use the LinkedIn sync button to pull a profile photo"}
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editContactForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Operations Manager" {...field} value={field.value || ""} data-testid="input-edit-contact-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editContactForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" {...field} value={field.value || ""} data-testid="input-edit-contact-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editContactForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="555-0123" 
                          {...field} 
                          value={field.value || ""} 
                          onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                          data-testid="input-edit-contact-phone" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* LinkedIn URL + Sync */}
              <div className="space-y-2">
                <FormField
                  control={editContactForm.control}
                  name={"linkedinUrl" as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <SiLinkedin className="h-3.5 w-3.5 text-[#0A66C2]" />
                        LinkedIn Profile URL
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://linkedin.com/in/username"
                          {...field}
                          value={field.value || ""}
                          data-testid="input-edit-contact-linkedin"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {editingContact && (
                  <LinkedInSyncButton
                    contactId={editingContact.id}
                    linkedinUrl={editContactForm.watch("linkedinUrl" as any) || ""}
                    onSuccess={(updated) => {
                      if (updated.title) editContactForm.setValue("title" as any, updated.title);
                      if (updated.email) editContactForm.setValue("email" as any, updated.email);
                      if (updated.phone) editContactForm.setValue("phone" as any, updated.phone);
                      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "contacts"] });
                      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
                    }}
                  />
                )}
              </div>

              {(offices || []).length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Office / Division</label>
                  <Select
                    onValueChange={(val) => editContactForm.setValue("officeId" as any, val === "none" ? null : parseInt(val))}
                    value={editContactForm.watch("officeId" as any)?.toString() || "none"}
                  >
                    <SelectTrigger data-testid="select-edit-contact-office">
                      <SelectValue placeholder="Select office (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No office (unassigned)</SelectItem>
                      {(offices || []).map(o => (
                        <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <FormField
                control={editContactForm.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(parseInt(val));
                        editContactForm.setValue("reportsTo", null);
                      }}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-contact-company">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allClients.map(c => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {watchedEditCompanyId !== clientId && (
                      <p className="text-xs text-amber-600 font-medium mt-1">
                        This contact will be moved to the selected company.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editContactForm.control}
                name="reportsTo"
                render={({ field }) => {
                  const companyContacts = allContacts.filter(
                    c => c.clientId === watchedEditCompanyId && c.id !== editingContact?.id
                  );
                  return (
                    <FormItem>
                      <FormLabel>Reports To</FormLabel>
                      <SearchableSelect
                        options={[
                          { value: "none", label: "No manager (top level)" },
                          ...companyContacts.map(c => ({ value: c.id.toString(), label: c.name, sublabel: c.title ?? undefined }))
                        ]}
                        value={field.value != null ? field.value.toString() : "none"}
                        onChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                        placeholder="No manager (top level)"
                        searchPlaceholder="Search contacts..."
                        data-testid="select-edit-contact-reports-to"
                      />
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Service Needs */}
              <div>
                <FormLabel className="text-sm font-medium">Service Needs</FormLabel>
                <p className="text-xs text-muted-foreground mb-2 mt-0.5">Which M5 services does this contact require?</p>
                <div className="grid grid-cols-1 gap-2">
                  {SERVICE_NEEDS.map(s => {
                    const current: string[] = (editContactForm.watch("serviceNeeds") as string[]) ?? [];
                    const checked = current.includes(s.key);
                    return (
                      <div
                        key={s.key}
                        role="checkbox"
                        aria-checked={checked}
                        tabIndex={0}
                        className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors select-none ${checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                        onClick={() => {
                          const next = checked ? current.filter(k => k !== s.key) : [...current, s.key];
                          editContactForm.setValue("serviceNeeds", next);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            const next = checked ? current.filter(k => k !== s.key) : [...current, s.key];
                            editContactForm.setValue("serviceNeeds", next);
                          }
                        }}
                        data-testid={`toggle-edit-contact-service-${s.key}`}
                      >
                        <s.Icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                        <span className="text-sm">{s.label}</span>
                        {checked && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <FormField
                control={editContactForm.control}
                name={"tier" as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Tier</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-contact-tier">
                          <SelectValue placeholder="No Tier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Tier</SelectItem>
                        <SelectItem value="tier_1">Tier 1 — High Value</SelectItem>
                        <SelectItem value="tier_2">Tier 2 — Medium Value</SelectItem>
                        <SelectItem value="tier_3">Tier 3 — Lower Value</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editContactForm.control}
                name={"stageId" as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Stage</FormLabel>
                    <Select
                      value={field.value != null ? String(field.value) : "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-contact-stage">
                          <SelectValue placeholder="No stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No stage</SelectItem>
                        {contactStages.map(s => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${getStageBadgeClass(s.color)}`}>
                              {s.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editContactForm.control}
                name={"ownerId" as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship Owner</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-contact-owner">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editContactForm.control}
                name="isPrimary"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-edit-contact-primary"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Primary Contact</FormLabel>
                      <FormDescription>
                        Mark as the main point of contact for their company.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditContactDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveEditContactMutation.isPending}
                  data-testid="button-save-edit-contact"
                >
                  {saveEditContactMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteConfirm?.label}</AlertDialogTitle>
            <AlertDialogDescription>{deleteConfirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { deleteConfirm?.onConfirm(); setDeleteConfirm(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BuildOpsJobsTab({ clientId }: { clientId: number }) {
  const { data: jobs, isLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "buildops-jobs"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/buildops-jobs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });

  const fmt = (v: string | number | null | undefined) => {
    if (v == null) return "—";
    const n = typeof v === "string" ? parseFloat(v) : v;
    return isNaN(n) ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString();
  };

  const statusColor = (s: string | null | undefined) => {
    if (!s) return "bg-gray-100 text-gray-700";
    const sl = s.toLowerCase();
    if (sl === "open") return "bg-blue-100 text-blue-700";
    if (sl === "closed" || sl === "complete") return "bg-green-100 text-green-700";
    if (sl === "canceled" || sl === "cancelled") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  if (isLoading) return <Card className="border-none shadow-sm bg-card"><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>;

  const sorted = [...(jobs ?? [])].sort((a, b) => (b.jobNumber || "").localeCompare(a.jobNumber || "", undefined, { numeric: true }));
  const totalQuoted = sorted.reduce((sum, j) => sum + (parseFloat(j.amountQuoted) || 0), 0);
  const totalCost = sorted.reduce((sum, j) => sum + (parseFloat(j.costAmount) || 0), 0);

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> BuildOps Jobs</CardTitle>
            <CardDescription>{sorted.length} jobs synced from BuildOps</CardDescription>
          </div>
          {sorted.length > 0 && (
            <div className="flex gap-4 text-sm">
              <div><span className="text-muted-foreground">Total Quoted:</span> <span className="font-semibold">{fmt(totalQuoted)}</span></div>
              <div><span className="text-muted-foreground">Total Cost:</span> <span className="font-semibold">{fmt(totalCost)}</span></div>
              <div><span className="text-muted-foreground">Margin:</span> <span className="font-semibold">{fmt(totalQuoted - totalCost)}</span></div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No jobs synced yet</p>
            <p className="text-sm">Run "Sync Jobs" from Admin → BuildOps to pull job data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-buildops-jobs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3 font-medium">Job #</th>
                  <th className="py-2 px-3 font-medium">Title</th>
                  <th className="py-2 px-3 font-medium">Type</th>
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 px-3 font-medium text-right">Revenue</th>
                  <th className="py-2 px-3 font-medium text-right">Labor</th>
                  <th className="py-2 px-3 font-medium text-right">Material</th>
                  <th className="py-2 px-3 font-medium text-right">Cost</th>
                  <th className="py-2 px-3 font-medium text-right">Margin</th>
                  <th className="py-2 px-3 font-medium">Property</th>
                  <th className="py-2 px-3 font-medium">Scheduled</th>
                  <th className="py-2 px-3 font-medium">Completed</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((job: any) => {
                  const quoted = parseFloat(job.amountQuoted) || 0;
                  const cost = parseFloat(job.costAmount) || 0;
                  const margin = quoted - cost;
                  return (
                    <tr key={job.id} className="border-b hover:bg-muted/50" data-testid={`row-job-${job.id}`}>
                      <td className="py-2.5 px-3 font-mono font-medium">{job.jobNumber || "—"}</td>
                      <td className="py-2.5 px-3 max-w-[250px] truncate">{job.title || job.issueDescription || "—"}</td>
                      <td className="py-2.5 px-3 text-xs">{job.jobTypeName || "—"}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className={cn("text-xs", statusColor(job.status))}>{job.status || "Unknown"}</Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{fmt(job.totalAmount ?? job.amountQuoted)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{fmt(job.laborCost)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{fmt(job.materialCost)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{fmt(job.costAmount)}</td>
                      <td className={cn("py-2.5 px-3 text-right font-mono", margin > 0 ? "text-green-600" : margin < 0 ? "text-red-600" : "")}>{fmt(margin)}</td>
                      <td className="py-2.5 px-3 text-xs max-w-[150px] truncate">{job.customerPropertyName || "—"}</td>
                      <td className="py-2.5 px-3 text-xs">{fmtDate(job.scheduledDate || job.dueDate)}</td>
                      <td className="py-2.5 px-3 text-xs">{fmtDate(job.completedDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BuildOpsInvoicesTab({ clientId }: { clientId: number }) {
  const { data: invoices, isLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "buildops-invoices"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/buildops-invoices`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return res.json();
    },
  });

  const fmt = (v: string | number | null | undefined) => {
    if (v == null) return "—";
    const n = typeof v === "string" ? parseFloat(v) : v;
    return isNaN(n) ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString();
  };

  const deriveStatus = (inv: any) => {
    const raw = (inv.status || "").toLowerCase();
    if (raw === "void" || raw === "voided") return "void";
    if (raw === "draft") return "draft";
    if (inv.closedDate) return "paid";
    if (inv.dueDate) {
      const due = new Date(inv.dueDate);
      due.setHours(23, 59, 59, 999);
      if (due < new Date()) return "overdue";
    }
    return "unpaid";
  };

  const statusColor = (s: string) => {
    if (s === "paid") return "bg-green-100 text-green-700";
    if (s === "draft") return "bg-blue-100 text-blue-700";
    if (s === "overdue") return "bg-red-100 text-red-700";
    if (s === "void") return "bg-gray-100 text-gray-500";
    return "bg-amber-100 text-amber-700";
  };

  if (isLoading) return <Card className="border-none shadow-sm bg-card"><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>;

  const sorted = [...(invoices ?? [])].sort((a, b) => (b.invoiceNumber || "").localeCompare(a.invoiceNumber || "", undefined, { numeric: true }));
  const totalAmount = sorted.reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) || 0), 0);

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> BuildOps Invoices</CardTitle>
            <CardDescription>{sorted.length} invoices synced from BuildOps</CardDescription>
          </div>
          {sorted.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Total Invoiced:</span> <span className="font-semibold">{fmt(totalAmount)}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No invoices synced yet</p>
            <p className="text-sm">Run "Sync Invoices" from Admin → BuildOps to pull invoice data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-buildops-invoices">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3 font-medium">Invoice #</th>
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 px-3 font-medium text-right">Amount</th>
                  <th className="py-2 px-3 font-medium text-right">Tax</th>
                  <th className="py-2 px-3 font-medium">Job #</th>
                  <th className="py-2 px-3 font-medium">Issued</th>
                  <th className="py-2 px-3 font-medium">Due</th>
                  <th className="py-2 px-3 font-medium">Closed</th>
                  <th className="py-2 px-3 font-medium">Final</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((inv: any) => {
                  const displayStatus = deriveStatus(inv);
                  return (
                  <tr key={inv.id} className="border-b hover:bg-muted/50" data-testid={`row-invoice-${inv.id}`}>
                    <td className="py-2.5 px-3 font-mono font-medium">{inv.invoiceNumber || "—"}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className={cn("text-xs", statusColor(displayStatus))}>{displayStatus}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{fmt(inv.totalAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{fmt(inv.taxAmount)}</td>
                    <td className="py-2.5 px-3 font-mono text-xs">{inv.jobNumber || "—"}</td>
                    <td className="py-2.5 px-3 text-xs">{fmtDate(inv.issuedDate)}</td>
                    <td className="py-2.5 px-3 text-xs">{fmtDate(inv.dueDate)}</td>
                    <td className="py-2.5 px-3 text-xs">{fmtDate(inv.closedDate)}</td>
                    <td className="py-2.5 px-3 text-xs">{inv.isFinalInvoice ? <Badge variant="outline" className="bg-green-100 text-green-700 text-xs">Final</Badge> : "—"}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BuildOpsAgreementsTab({ clientId }: { clientId: number }) {
  const [showAll, setShowAll] = useState(false);
  const { data: agreements, isLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", clientId, "buildops-agreements"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/buildops-agreements`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch agreements");
      return res.json();
    },
  });

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString();
  };

  const deriveAgrStatus = (agr: any) => {
    const state = (agr.advancedSchedulingState || "").toLowerCase();
    if (state === "canceled" || state === "cancelled") return "canceled";
    if (agr.endDate && new Date(agr.endDate) < new Date()) return "expired";
    if (state === "active" || state === "confirmed") return "active";
    if (state === "draft" || state === "pending") return "draft";
    if (state) return state;
    return "unknown";
  };

  const stateColor = (s: string) => {
    if (s === "active" || s === "confirmed") return "bg-green-100 text-green-700";
    if (s === "canceled" || s === "cancelled") return "bg-red-100 text-red-700";
    if (s === "draft" || s === "pending") return "bg-blue-100 text-blue-700";
    if (s === "expired") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-700";
  };

  if (isLoading) return <Card className="border-none shadow-sm bg-card"><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>;

  const allSorted = [...(agreements ?? [])].sort((a, b) => {
    const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
    const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
    return bDate - aDate;
  });
  const sorted = showAll ? allSorted : allSorted.filter(a => {
    const s = deriveAgrStatus(a);
    return s === "active" || s === "draft" || s === "confirmed";
  });
  const activeCount = allSorted.filter(a => deriveAgrStatus(a) === "active").length;

  return (
    <Card className="border-none shadow-sm bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5" /> Service Agreements</CardTitle>
            <CardDescription>{activeCount} active of {allSorted.length} total agreements</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAll(!showAll)} data-testid="button-toggle-agreements-filter">
            {showAll ? "Show Active" : "Show All"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileSignature className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No service agreements synced yet</p>
            <p className="text-sm">Run "Sync Agreements" from Admin → BuildOps to pull agreement data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-buildops-agreements">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 px-3 font-medium">Agreement #</th>
                  <th className="py-2 px-3 font-medium">Name</th>
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 px-3 font-medium text-right">Contract Value</th>
                  <th className="py-2 px-3 font-medium">Frequency</th>
                  <th className="py-2 px-3 font-medium">Start Date</th>
                  <th className="py-2 px-3 font-medium">End Date</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((agr: any) => {
                  const agrStatus = deriveAgrStatus(agr);
                  return (
                  <tr key={agr.id} className="border-b hover:bg-muted/50" data-testid={`row-agreement-${agr.id}`}>
                    <td className="py-2.5 px-3 font-mono font-medium">{agr.agreementNumber || "—"}</td>
                    <td className="py-2.5 px-3">{agr.agreementName || "—"}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className={cn("text-xs", stateColor(agrStatus))}>{agrStatus}</Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{agr.contractValue ? `$${parseFloat(agr.contractValue).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</td>
                    <td className="py-2.5 px-3 text-xs">{agr.frequency || "—"}</td>
                    <td className="py-2.5 px-3 text-xs">{fmtDate(agr.startDate)}</td>
                    <td className="py-2.5 px-3 text-xs">{fmtDate(agr.endDate)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface IntelData {
  hitRate: number | null;
  wonCount: number;
  lostCount: number;
  openCount: number;
  pipelineValue: number;
  ltv: number;
  mrr: number;
  activeJobs: number;
  completedJobs: number;
  avgMonthlyJobs: number;
  revenueTrend: { month: string; revenue: number }[];
  trendDirection: "growing" | "flat" | "declining";
  healthScore: number;
  healthStatus: "healthy" | "watch" | "at_risk";
  dealStages: { stage: string; count: number }[];
  jobsAboveAvg: boolean;
}

const fmtCur = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

function IntelligenceTab({ clientId }: { clientId: number }) {
  const { data, isLoading, isError } = useQuery<IntelData>({
    queryKey: ["/api/clients", clientId, "intelligence"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}/intelligence`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load intelligence data");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="shadow-sm bg-card"><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (isError) return <div className="text-center text-red-600 py-12">Failed to load intelligence data. Please try again.</div>;
  if (!data) return <div className="text-center text-muted-foreground py-12">No intelligence data available.</div>;

  const healthColor = data.healthStatus === "healthy" ? "text-green-600" : data.healthStatus === "watch" ? "text-amber-600" : "text-red-600";
  const healthBg = data.healthStatus === "healthy" ? "bg-green-100" : data.healthStatus === "watch" ? "bg-amber-100" : "bg-red-100";
  const healthLabel = data.healthStatus === "healthy" ? "Healthy" : data.healthStatus === "watch" ? "Watch" : "At Risk";
  const trendLabel = data.trendDirection === "growing" ? "Growing" : data.trendDirection === "declining" ? "Declining" : "Stable";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold", healthBg, healthColor)} data-testid="badge-client-health">
          <HeartPulse className="h-4 w-4" />
          {healthLabel} ({data.healthScore}/4)
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {data.trendDirection === "growing" && <TrendingUp className="h-4 w-4 text-green-600" />}
          {data.trendDirection === "declining" && <TrendingDown className="h-4 w-4 text-red-600" />}
          {data.trendDirection === "flat" && <Minus className="h-4 w-4" />}
          Revenue: {trendLabel}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Lifetime Value</p>
            <p className="text-2xl font-heading font-bold mt-1" data-testid="text-ltv">{fmtCur(data.ltv)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pipeline Value</p>
            <p className="text-2xl font-heading font-bold mt-1" data-testid="text-pipeline">{fmtCur(data.pipelineValue)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Monthly Recurring</p>
            <p className="text-2xl font-heading font-bold mt-1" data-testid="text-mrr">{fmtCur(data.mrr)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Hit Rate</p>
            <p className="text-2xl font-heading font-bold mt-1" data-testid="text-hit-rate">
              {data.hitRate !== null ? `${data.hitRate}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{data.wonCount}W / {data.lostCount}L</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Open Deals</p>
            <p className="text-2xl font-heading font-bold mt-1" data-testid="text-open-deals">{data.openCount}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Jobs</p>
            <p className="text-2xl font-heading font-bold mt-1" data-testid="text-active-jobs">{data.activeJobs}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed Jobs</p>
            <p className="text-2xl font-heading font-bold mt-1" data-testid="text-completed-jobs">{data.completedJobs}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Monthly Jobs</p>
            <p className="text-2xl font-heading font-bold mt-1" data-testid="text-avg-jobs">{data.avgMonthlyJobs}</p>
          </CardContent>
        </Card>
      </div>

      {data.revenueTrend.length > 0 && (
        <Card className="shadow-sm bg-card">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-3">Revenue Trend (12 months)</p>
            <div className="h-48" data-testid="chart-revenue-trend">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.revenueTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#BE1916" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#BE1916" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <ReTooltip formatter={(v: number) => [fmtCur(v), "Revenue"]} labelFormatter={(l: string) => `Month: ${l}`} />
                  <Area type="monotone" dataKey="revenue" stroke="#BE1916" fill="url(#revenueGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm bg-card">
        <CardContent className="p-4">
          <p className="text-sm font-semibold mb-2">Health Score Breakdown</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Revenue trend positive</span>
              {data.trendDirection === "growing"
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : <X className="h-4 w-4 text-red-400" />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active pipeline deals</span>
              {data.openCount > 0
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : <X className="h-4 w-4 text-red-400" />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Jobs above average ({data.avgMonthlyJobs}/mo)</span>
              {data.jobsAboveAvg
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : <X className="h-4 w-4 text-red-400" />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Hit rate above 50%</span>
              {data.hitRate !== null && data.hitRate > 50
                ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                : <X className="h-4 w-4 text-red-400" />}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
