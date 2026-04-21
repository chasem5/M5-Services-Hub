import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Target, Users, Building2, CheckSquare, CreditCard, Phone, Calendar as CalendarIcon, AlertTriangle, Receipt, Camera, Upload, X, FileText as FilePdf, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, SERVICE_TYPE_OPTIONS } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPhoneNumber } from "@/lib/phone";
import type { Client, ClientContact, ContactBuilding, Lead, PipelineStage, User } from "@shared/schema";
import { insertLeadSchema, type InsertLead } from "@shared/schema";
import { CardScannerDialog } from "@/components/CardScannerDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const TIER_OPTIONS = ["$", "$$", "$$$", "$$$$"] as const;

export type ActiveDialog = "deal" | "contact" | "company" | "task" | "activity" | "spend" | null;

interface QuickActionsBarProps {
  externalDialog?: ActiveDialog;
  onExternalOpen?: (d: ActiveDialog) => void;
  showButton?: boolean;
}

export function QuickActionsBar({ externalDialog, onExternalOpen, showButton = true }: QuickActionsBarProps) {
  const { toast } = useToast();
  const [internalDialog, setInternalDialog] = useState<ActiveDialog>(null);

  const [scannerOpen, setScannerOpen] = useState(false);

  const isExternal = externalDialog !== undefined && onExternalOpen !== undefined;
  const activeDialog = isExternal ? externalDialog : internalDialog;
  const open = (d: ActiveDialog) => isExternal ? onExternalOpen!(d) : setInternalDialog(d);
  const close = () => isExternal ? onExternalOpen!(null) : setInternalDialog(null);

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: allContacts = [] } = useQuery<ClientContact[]>({ queryKey: ["/api/client-contacts"] });
  const { data: stages = [] } = useQuery<PipelineStage[]>({ queryKey: ["/api/pipeline-stages"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });

  return (
    <>
      {showButton && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              className="h-8 w-8 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-quick-actions"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => open("activity")} data-testid="quick-action-activity">
              <Phone className="mr-2 h-4 w-4 text-primary" />
              Log Activity
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => open("deal")} data-testid="quick-action-deal">
              <Target className="mr-2 h-4 w-4 text-primary" />
              Add Deal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => open("contact")} data-testid="quick-action-contact">
              <Users className="mr-2 h-4 w-4 text-primary" />
              Add Contact
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => open("company")} data-testid="quick-action-company">
              <Building2 className="mr-2 h-4 w-4 text-primary" />
              Add Company
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => open("task")} data-testid="quick-action-task">
              <CheckSquare className="mr-2 h-4 w-4 text-primary" />
              Add Task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => open("spend")} data-testid="quick-action-spend">
              <Receipt className="mr-2 h-4 w-4 text-primary" />
              Log Spend
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setScannerOpen(true)} data-testid="quick-action-scan">
              <CreditCard className="mr-2 h-4 w-4 text-primary" />
              Scan Card
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <CardScannerDialog open={scannerOpen} onClose={() => setScannerOpen(false)} clients={clients} />

      <AddDealDialog
        open={activeDialog === "deal"}
        onClose={close}
        clients={clients}
        allContacts={allContacts}
        stages={stages}
        users={users}
      />
      <AddContactDialog
        open={activeDialog === "contact"}
        onClose={close}
        clients={clients}
        onAddAnotherContact={(clientId) => {
          close();
          setTimeout(() => open("contact"), 100);
        }}
      />
      <AddCompanyDialog
        open={activeDialog === "company"}
        onClose={close}
        onAddContact={(clientId) => {
          close();
          setTimeout(() => open("contact"), 100);
        }}
      />
      <AddTaskDialog
        open={activeDialog === "task"}
        onClose={close}
        clients={clients}
        allContacts={allContacts}
        leads={[]}
      />
      <LogActivityDialog
        open={activeDialog === "activity"}
        onClose={close}
      />
      <LogSpendDialog
        open={activeDialog === "spend"}
        onClose={close}
        clients={clients}
        allContacts={allContacts}
      />
    </>
  );
}

function AddDealDialog({
  open,
  onClose,
  clients,
  allContacts,
  stages,
  users,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  allContacts: ClientContact[];
  stages: PipelineStage[];
  users: User[];
}) {
  const { toast } = useToast();
  const [formServiceTypes, setFormServiceTypes] = useState<string[]>([]);
  const [valueType, setValueType] = useState<"fixed" | "potential">("fixed");
  const [valueTier, setValueTier] = useState<string | null>(null);
  const [confidenceStatus, setConfidenceStatus] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  const form = useForm<InsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      title: "",
      clientId: undefined,
      buildingId: null,
      stage: stages[0]?.slug ?? "met_introduced",
      valueType: "fixed",
      value: "0",
      valueTier: null,
      tier: null,
      confidenceScore: 50,
      tags: [],
      notes: "",
      assignedTo: undefined,
      contractType: "one_time",
      recurringFrequency: null,
      contractStartDate: null,
      renewalDate: null,
    },
  });

  const { data: buildingsForClient = [] } = useQuery<ContactBuilding[]>({
    queryKey: ["/api/clients", selectedClientId, "all-buildings"],
    enabled: !!selectedClientId,
  });

  const { data: dealTags = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ["/api/deal-tags"],
  });

  const contactsForClient = selectedClientId
    ? allContacts.filter(c => c.clientId === selectedClientId)
    : [];

  const addTag = (val: string) => {
    const t = val.trim().toLowerCase();
    if (t && !formTags.includes(t)) setFormTags(prev => [...prev, t]);
    setTagInput("");
  };
  const removeTag = (t: string) => setFormTags(prev => prev.filter(x => x !== t));

  const reset = () => {
    form.reset({ title: "", clientId: undefined, buildingId: null, stage: stages[0]?.slug ?? "met_introduced", valueType: "fixed", value: "0", valueTier: null, tier: null, confidenceScore: 50, tags: [], notes: "", assignedTo: undefined, contractType: "one_time", recurringFrequency: null, contractStartDate: null, renewalDate: null });
    setFormServiceTypes([]);
    setValueType("fixed");
    setValueTier(null);
    setConfidenceStatus(null);
    setTagInput("");
    setFormTags([]);
    setSelectedClientId(null);
  };

  const mutation = useMutation({
    mutationFn: async (data: InsertLead) => {
      const res = await apiRequest("POST", "/api/leads", {
        ...data,
        tags: formTags,
        confidenceStatus,
        serviceTypes: formServiceTypes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Deal created" });
      reset();
      onClose();
    },
    onError: () => toast({ title: "Failed to create deal", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Deal</DialogTitle>
          <DialogDescription>Create a new sales opportunity in the pipeline.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4 py-2">

            {/* Title */}
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g. HVAC Maintenance Contract" {...field} data-testid="input-quick-deal-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Company */}
            <FormField control={form.control} name="clientId" render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={clients.map(c => ({ value: c.id.toString(), label: c.name }))}
                    value={field.value?.toString() ?? ""}
                    onChange={(val) => {
                      const id = parseInt(val);
                      field.onChange(id || undefined);
                      setSelectedClientId(id || null);
                      form.setValue("buildingId", null);
                      form.setValue("contactId", null);
                    }}
                    placeholder="Select company..."
                    searchPlaceholder="Search companies..."
                    data-testid="select-quick-deal-client"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Contact (shown only when company selected and has contacts) */}
            {selectedClientId && contactsForClient.length > 0 && (
              <FormField control={form.control} name="contactId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact (Optional)</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                    value={field.value != null ? String(field.value) : "none"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-quick-deal-contact">
                        <SelectValue placeholder="No specific contact" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No specific contact</SelectItem>
                      {contactsForClient.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}{c.title ? ` · ${c.title}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Services */}
            <div className="space-y-2">
              <Label>Services (Optional)</Label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_TYPE_OPTIONS.map((opt) => {
                  const selected = formServiceTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormServiceTypes(prev => selected ? prev.filter(s => s !== opt.value) : [...prev, opt.value])}
                      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${selected ? opt.color + " border-transparent" : "bg-muted/30 text-muted-foreground border-border/50 hover:border-border"}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Building (shown only when company selected and has buildings) */}
            {selectedClientId && buildingsForClient.length > 0 && (
              <FormField control={form.control} name="buildingId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Building (Optional)</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                    value={field.value != null ? String(field.value) : "none"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-quick-deal-building">
                        <SelectValue placeholder="No specific building" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No specific building</SelectItem>
                      {buildingsForClient.map(b => (
                        <SelectItem key={b.id} value={b.id.toString()}>
                          <span className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {b.name}{b.address ? ` · ${b.address}` : ""}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Stage */}
            <FormField control={form.control} name="stage" render={({ field }) => (
              <FormItem>
                <FormLabel>Stage</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-quick-deal-stage">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {stages.map(s => (
                      <SelectItem key={s.id} value={s.slug}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Contract Type */}
            <div className="space-y-4 rounded-lg border p-3 bg-muted/30">
              <FormField control={form.control} name="contractType" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Contract Type</FormLabel>
                  <FormControl>
                    <div className="flex items-center bg-muted rounded-md p-0.5 border w-fit">
                      <button
                        type="button"
                        onClick={() => { field.onChange("one_time"); form.setValue("recurringFrequency", null); form.setValue("contractStartDate", null); form.setValue("renewalDate", null); }}
                        className={`px-3 py-1 text-sm rounded font-medium transition-colors ${field.value === "one_time" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                      >
                        One-Time
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange("recurring")}
                        className={`px-3 py-1 text-sm rounded font-medium transition-colors ${field.value === "recurring" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                      >
                        Recurring
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {form.watch("contractType") === "recurring" && (
                <div className="grid gap-4 pt-2">
                  <FormField control={form.control} name="recurringFrequency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="contractStartDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="renewalDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Renewal Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              )}
            </div>

            {/* Value */}
            <div className="space-y-2">
              <Label>Value</Label>
              <div className="flex items-center bg-muted rounded-md p-0.5 border w-fit">
                <button
                  type="button"
                  onClick={() => { setValueType("fixed"); form.setValue("valueType", "fixed"); form.setValue("valueTier", null); setValueTier(null); }}
                  className={`px-3 py-1 text-sm rounded font-medium transition-colors ${valueType === "fixed" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                >
                  Price
                </button>
                <button
                  type="button"
                  onClick={() => { setValueType("potential"); form.setValue("valueType", "potential"); form.setValue("value", "0"); }}
                  className={`px-3 py-1 text-sm rounded font-medium transition-colors ${valueType === "potential" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                >
                  Potential
                </button>
              </div>
              {valueType === "fixed" ? (
                <FormField control={form.control} name="value" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                        <Input type="number" step="0.01" className="pl-6" {...field} data-testid="input-quick-deal-value" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ) : (
                <div className="flex gap-2">
                  {TIER_OPTIONS.map(tier => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => { setValueTier(tier); form.setValue("valueTier", tier as any); }}
                      className={`flex-1 py-2 text-sm font-bold rounded-md border transition-colors ${valueTier === tier ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/40"}`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Confidence Status */}
            <div className="space-y-3">
              <Label>Confidence Status</Label>
              <div className="flex items-center bg-muted rounded-md p-0.5 border w-fit">
                <button type="button" onClick={() => setConfidenceStatus("undecided")}
                  className={`px-3 py-1 text-sm rounded font-medium transition-colors ${confidenceStatus === "undecided" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
                  Undecided
                </button>
                <button type="button" onClick={() => setConfidenceStatus("needs_work")}
                  className={`px-3 py-1 text-sm rounded font-medium transition-colors ${confidenceStatus === "needs_work" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
                  Needs Work
                </button>
                <button type="button" onClick={() => setConfidenceStatus(null)}
                  className={`px-3 py-1 text-sm rounded font-medium transition-colors ${confidenceStatus === null ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
                  Set Score
                </button>
              </div>
            </div>

            {!confidenceStatus && (
              <FormField control={form.control} name="confidenceScore" render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Confidence Score</FormLabel>
                    <span className="text-sm font-bold">{field.value ?? 50}%</span>
                  </div>
                  <FormControl>
                    <Slider min={0} max={100} step={5} value={[field.value ?? 50]} onValueChange={([v]) => field.onChange(v)} />
                  </FormControl>
                </FormItem>
              )} />
            )}

            {/* Lead Tier */}
            <FormField control={form.control} name="tier" render={({ field }) => (
              <FormItem>
                <FormLabel>Lead Tier</FormLabel>
                <Select onValueChange={(v) => field.onChange(v === "none" ? null : v)} value={field.value ?? "none"}>
                  <FormControl>
                    <SelectTrigger data-testid="select-quick-deal-tier">
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
            )} />

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Add a tag and press Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
                    }}
                    list="quick-deal-tags-list"
                  />
                  <datalist id="quick-deal-tags-list">
                    {dealTags.map(t => <option key={t.id} value={t.name} />)}
                  </datalist>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => addTag(tagInput)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1 pl-2 pr-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="rounded-sm hover:bg-muted p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Assigned To */}
            <FormField control={form.control} name="assignedTo" render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned To</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || undefined}>
                  <FormControl>
                    <SelectTrigger data-testid="select-quick-deal-assignee">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Notes */}
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Additional details..." className="resize-none" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { reset(); onClose(); }}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-quick-deal-submit">
                {mutation.isPending ? "Adding..." : "Add Deal"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddContactDialog({
  open,
  onClose,
  clients,
  onAddAnotherContact,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  onAddAnotherContact?: (clientId: number) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [duplicateContact, setDuplicateContact] = useState<{ id: number; name: string; clientId: number; clientName?: string } | null>(null);
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);

  const checkContactDuplicate = async (emailVal: string) => {
    if (!emailVal.trim()) {
      setDuplicateContact(null);
      return;
    }
    try {
      const res = await apiRequest("GET", `/api/contacts/check-duplicate?email=${encodeURIComponent(emailVal.trim())}`);
      const data = await res.json();
      if (data.exists) {
        setDuplicateContact(data.contact);
      } else {
        setDuplicateContact(null);
      }
    } catch (err) {
      console.error("Duplicate contact check failed", err);
    }
  };

  const reset = () => {
    setName(""); setTitle(""); setEmail(""); setDuplicateContact(null); setPhone(""); setLinkedinUrl("");
    setClientId(""); setNewCompanyName(""); setIsCreatingCompany(false); setCreatedClientId(null);
  };

  const clientOptions = [
    { value: "__new__", label: "+ Create new company..." },
    ...clients.map(c => ({ value: String(c.id), label: c.name })),
  ];

  const createCompanyMutation = useMutation({
    mutationFn: async (companyName: string) => {
      const res = await apiRequest("POST", "/api/clients", { name: companyName.trim() });
      return res.json() as Promise<Client>;
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setCreatedClientId(newClient.id);
      setClientId(String(newClient.id));
      setIsCreatingCompany(false);
    },
    onError: () => toast({ title: "Failed to create company", variant: "destructive" }),
  });

  const createContactMutation = useMutation({
    mutationFn: async () => {
      const finalClientId = createdClientId ?? (clientId && clientId !== "__new__" ? parseInt(clientId) : null);
      if (!finalClientId) throw new Error("A company is required");
      const res = await apiRequest("POST", `/api/clients/${finalClientId}/contacts`, {
        name: name.trim(),
        title: title.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        isPrimary: false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      toast({ title: "Contact added" });
      reset();
      onClose();
    },
    onError: (err: Error) => toast({ title: err.message || "Failed to add contact", variant: "destructive" }),
  });

  const handleClientChange = (val: string) => {
    if (val === "__new__") {
      setIsCreatingCompany(true);
      setClientId("__new__");
    } else {
      setClientId(val);
      setIsCreatingCompany(false);
      setCreatedClientId(null);
    }
  };

  const resolvedClientId = createdClientId ?? (clientId && clientId !== "__new__" ? parseInt(clientId) : null);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>Add a new person to your contact database.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></Label>
            <Input
              className="mt-1.5"
              placeholder="Jane Smith"
              value={name}
              onChange={e => setName(e.target.value)}
              data-testid="input-quick-contact-name"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Job Title</Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Facility Manager"
              value={title}
              onChange={e => setTitle(e.target.value)}
              data-testid="input-quick-contact-title"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <Input
                className="mt-1.5"
                type="email"
                placeholder="jane@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={e => checkContactDuplicate(e.target.value)}
                data-testid="input-quick-contact-email"
              />
              {duplicateContact && (
                <p className="mt-1 text-[10px] text-yellow-600 font-medium flex items-center gap-1 leading-tight">
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                  A contact with this email already exists: {duplicateContact.name} {duplicateContact.clientName ? `at ${duplicateContact.clientName}` : ""} — 
                  <Link href={`/customers/${duplicateContact.clientId}?contactId=${duplicateContact.id}`} className="underline ml-0.5" onClick={onClose}>
                    View them
                  </Link>
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Phone</Label>
              <Input
                className="mt-1.5"
                placeholder="(555) 000-0000"
                value={phone}
                onChange={e => setPhone(formatPhoneNumber(e.target.value))}
                data-testid="input-quick-contact-phone"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">LinkedIn URL</Label>
            <Input
              className="mt-1.5"
              placeholder="https://linkedin.com/in/..."
              value={linkedinUrl}
              onChange={e => setLinkedinUrl(e.target.value)}
              data-testid="input-quick-contact-linkedin"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Company</Label>
            <div className="mt-1.5">
              <SearchableSelect
                options={clientOptions}
                value={clientId}
                onChange={handleClientChange}
                placeholder="Select or create company..."
                searchPlaceholder="Search companies..."
                data-testid="select-quick-contact-client"
              />
            </div>
          </div>
          {isCreatingCompany && (
            <div className="flex gap-2">
              <Input
                placeholder="New company name"
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
                data-testid="input-quick-contact-new-company"
              />
              <Button
                type="button"
                size="sm"
                disabled={!newCompanyName.trim() || createCompanyMutation.isPending}
                onClick={() => createCompanyMutation.mutate(newCompanyName)}
                data-testid="button-quick-contact-create-company"
              >
                {createCompanyMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          )}
          {createdClientId && (
            <p className="text-xs text-green-600 font-medium">
              Company created — contact will be linked to it.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button
            onClick={() => createContactMutation.mutate()}
            disabled={!name.trim() || !resolvedClientId || createContactMutation.isPending}
            data-testid="button-quick-contact-submit"
          >
            {createContactMutation.isPending ? "Adding..." : "Add Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddCompanyDialog({
  open,
  onClose,
  onAddContact,
}: {
  open: boolean;
  onClose: () => void;
  onAddContact?: (clientId: number) => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: number; name: string } | null>(null);
  const [industry, setIndustry] = useState("");
  const [notes, setNotes] = useState("");
  const [tier, setTier] = useState("");
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);
  const [createdClientName, setCreatedClientName] = useState("");

  const checkDuplicate = async (nameVal: string) => {
    if (!nameVal.trim()) {
      setDuplicateWarning(null);
      return;
    }
    try {
      const res = await apiRequest("GET", `/api/clients/check-duplicate?name=${encodeURIComponent(nameVal.trim())}`);
      const data = await res.json();
      if (data.exists) {
        setDuplicateWarning(data.client);
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error("Duplicate check failed", err);
    }
  };

  const reset = () => {
    setName(""); setDuplicateWarning(null); setIndustry(""); setNotes(""); setTier("");
    setShowFollowUp(false); setCreatedClientId(null); setCreatedClientName("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/clients", {
        name: name.trim(),
        industry: industry.trim() || null,
        notes: notes.trim() || null,
        tier: tier || null,
      });
      return res.json() as Promise<Client>;
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setCreatedClientId(newClient.id);
      setCreatedClientName(newClient.name);
      setShowFollowUp(true);
    },
    onError: () => toast({ title: "Failed to create company", variant: "destructive" }),
  });

  if (showFollowUp && createdClientId) {
    return (
      <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Company Added!</DialogTitle>
            <DialogDescription>
              <span className="font-semibold">{createdClientName}</span> was created successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <Building2 className="h-12 w-12 text-primary mx-auto mb-3 opacity-80" />
            <p className="text-sm text-muted-foreground">Would you like to add a contact for this company?</p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full"
              onClick={() => {
                reset();
                onAddContact?.(createdClientId);
              }}
              data-testid="button-quick-company-add-contact"
            >
              <Users className="mr-2 h-4 w-4" />
              Add a Contact for {createdClientName}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { reset(); onClose(); }} data-testid="button-quick-company-skip">
              Skip for now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add Company</DialogTitle>
          <DialogDescription>Add a new company to your customer database.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-sm font-medium">Company Name <span className="text-destructive">*</span></Label>
            <Input
              className="mt-1.5"
              placeholder="Acme Corp"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={e => checkDuplicate(e.target.value)}
              data-testid="input-quick-company-name"
            />
            {duplicateWarning && (
              <p className="mt-1 text-xs text-yellow-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                A company named '{duplicateWarning.name}' already exists — 
                <Link href={`/customers/${duplicateWarning.id}`} className="underline ml-1" onClick={onClose}>
                  View it
                </Link>
              </p>
            )}
          </div>
          <div>
            <Label className="text-sm font-medium">Industry</Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Commercial Real Estate"
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              data-testid="input-quick-company-industry"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Company Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger className="mt-1.5" data-testid="select-quick-company-tier">
                <SelectValue placeholder="No Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tier_1">Tier 1 — High Value</SelectItem>
                <SelectItem value="tier_2">Tier 2 — Medium Value</SelectItem>
                <SelectItem value="tier_3">Tier 3 — Lower Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Notes</Label>
            <Textarea
              className="mt-1.5 min-h-[80px]"
              placeholder="Any notes about this company..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              data-testid="textarea-quick-company-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            data-testid="button-quick-company-submit"
          >
            {mutation.isPending ? "Adding..." : "Add Company"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddTaskDialog({
  open,
  onClose,
  clients,
  allContacts,
  leads,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  allContacts: ClientContact[];
  leads: Lead[];
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data: allLeads = [] } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });

  const reset = () => { setTitle(""); setPriority("medium"); setClientId(""); setDueDate(""); };

  const clientOptions = clients.map(c => ({ value: String(c.id), label: c.name }));
  const leadOptions = allLeads.map(l => ({ value: String(l.id), label: l.title }));

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tasks", {
        title: title.trim(),
        priority,
        status: "todo",
        relatedClientId: clientId ? parseInt(clientId) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task created" });
      reset();
      onClose();
    },
    onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>Create a new task or action item.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-sm font-medium">Task Title <span className="text-destructive">*</span></Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. Follow up with client"
              value={title}
              onChange={e => setTitle(e.target.value)}
              data-testid="input-quick-task-title"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-1.5" data-testid="select-quick-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Due Date</Label>
              <Input
                className="mt-1.5"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                data-testid="input-quick-task-due-date"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Related Company</Label>
            <div className="mt-1.5">
              <SearchableSelect
                options={[{ value: "", label: "No company" }, ...clientOptions]}
                value={clientId}
                onChange={setClientId}
                placeholder="Select company..."
                searchPlaceholder="Search companies..."
                data-testid="select-quick-task-client"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
            data-testid="button-quick-task-submit"
          >
            {mutation.isPending ? "Adding..." : "Add Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogSpendDialog({
  open,
  onClose,
  clients,
  allContacts,
}: {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  allContacts: ClientContact[];
}) {
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("meals_entertainment");
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [contactId, setContactId] = useState("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setAmount(""); setCategory("meals_entertainment"); setDate(today);
    setDescription(""); setClientId(""); setContactId("");
    setReceiptPreview(null); setReceiptFileName(null); setReceiptUrl(null);
    setIsUploadingReceipt(false);
  };

  const handleReceiptFile = async (file: File) => {
    setReceiptFileName(file.name);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setReceiptPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
    setIsUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("receipt", file);
      const res = await fetch("/api/spend/upload-receipt", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        setReceiptUrl(data.url);
      } else {
        throw new Error("No URL returned");
      }
    } catch {
      toast({ title: "Failed to upload receipt", variant: "destructive" });
      setReceiptPreview(null); setReceiptFileName(null);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const clearReceipt = () => {
    setReceiptPreview(null); setReceiptFileName(null); setReceiptUrl(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clientOptions = clients.map(c => ({ value: String(c.id), label: c.name }));
  const contactOptions = (clientId
    ? allContacts.filter(c => c.clientId === parseInt(clientId))
    : allContacts
  ).map(c => ({ value: String(c.id), label: c.name, sublabel: c.title ?? undefined }));

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/spend", {
        amount: parseFloat(amount).toFixed(2),
        category,
        date: new Date(date),
        description: description.trim() || null,
        clientId: clientId ? parseInt(clientId) : undefined,
        contactId: contactId ? parseInt(contactId) : null,
        receiptUrl: receiptUrl || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Spend logged", description: receiptUrl ? "Receipt saved and email will be sent." : "Receipt email will be sent if configured." });
      reset();
      onClose();
    },
    onError: () => toast({ title: "Failed to log spend", variant: "destructive" }),
  });

  const isPdf = receiptFileName?.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Log Spend</DialogTitle>
          <DialogDescription>Record a BD expense. A receipt email will be sent automatically if configured.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Amount ($) <span className="text-destructive">*</span></Label>
              <Input
                className="mt-1.5"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                data-testid="input-spend-amount"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Date <span className="text-destructive">*</span></Label>
              <Input
                className="mt-1.5"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                data-testid="input-spend-date"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1.5" data-testid="select-spend-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meals_entertainment">Meals & Entertainment</SelectItem>
                <SelectItem value="gifts">Gifts</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="events">Events</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Company <span className="text-destructive">*</span></Label>
            <div className="mt-1.5">
              <SearchableSelect
                options={[{ value: "", label: "Select company..." }, ...clientOptions]}
                value={clientId}
                onChange={(v) => { setClientId(v); setContactId(""); }}
                placeholder="Select company..."
                searchPlaceholder="Search companies..."
                data-testid="select-spend-client"
              />
            </div>
          </div>
          {clientId && contactOptions.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Contact</Label>
              <div className="mt-1.5">
                <SearchableSelect
                  options={[{ value: "", label: "No contact" }, ...contactOptions]}
                  value={contactId}
                  onChange={setContactId}
                  placeholder="Select contact..."
                  searchPlaceholder="Search contacts..."
                  data-testid="select-spend-contact"
                />
              </div>
            </div>
          )}
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              className="mt-1.5 min-h-[70px]"
              placeholder="e.g. Lunch with facility manager at ABC Building"
              value={description}
              onChange={e => setDescription(e.target.value)}
              data-testid="textarea-spend-description"
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <Label className="text-sm font-medium">Receipt <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleReceiptFile(e.target.files[0])}
              data-testid="input-receipt-camera"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleReceiptFile(e.target.files[0])}
              data-testid="input-receipt-file"
            />

            {receiptFileName ? (
              <div className="mt-1.5 rounded-lg border border-border bg-muted/40 p-2 flex items-start gap-2">
                {isUploadingReceipt ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground w-full">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Uploading receipt...
                  </div>
                ) : receiptPreview && !isPdf ? (
                  <img src={receiptPreview} alt="Receipt" className="h-16 w-16 object-cover rounded-md shrink-0 border" />
                ) : (
                  <div className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center shrink-0">
                    <FilePdf className="h-7 w-7 text-muted-foreground" />
                  </div>
                )}
                {!isUploadingReceipt && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{receiptFileName}</p>
                    <p className="text-[11px] text-green-600 font-medium mt-0.5">Uploaded ✓</p>
                  </div>
                )}
                {!isUploadingReceipt && (
                  <button onClick={clearReceipt} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors" data-testid="button-clear-receipt">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-1.5 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10 border-dashed"
                  onClick={() => cameraInputRef.current?.click()}
                  data-testid="button-receipt-camera"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 h-10 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-receipt-upload"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!amount || parseFloat(amount) <= 0 || !clientId || mutation.isPending || isUploadingReceipt}
            data-testid="button-spend-submit"
          >
            {mutation.isPending ? "Logging..." : "Log Spend"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogActivityDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [activityType, setActivityType] = useState("call");
  const [leadId, setLeadId] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const leadOptions = leads.map(l => {
    const client = clients.find(c => c.id === l.clientId);
    return {
      value: String(l.id),
      label: l.title,
      sublabel: client?.name
    };
  });

  const reset = () => {
    setActivityType("call");
    setLeadId("");
    setNotes("");
    setDate(new Date());
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const endpoint = leadId ? `/api/leads/${leadId}/notes` : "/api/activity-logs";
      const payload = leadId 
        ? { content: notes, type: activityType, date }
        : { entityType: "general", entityId: 0, action: activityType, metadata: { notes, date } };
      
      const res = await apiRequest("POST", endpoint, payload);
      return res.json();
    },
    onSuccess: () => {
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", parseInt(leadId), "notes"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Activity logged" });
      reset();
      onClose();
    },
    onError: () => toast({ title: "Failed to log activity", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
          <DialogDescription>Record a new activity for a deal or general follow-up.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-medium">Activity Type</Label>
            <RadioGroup 
              value={activityType} 
              onValueChange={setActivityType}
              className="grid grid-cols-2 gap-2 mt-1.5"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="call" id="type-call" />
                <Label htmlFor="type-call" className="font-normal cursor-pointer">Call</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="type-email" />
                <Label htmlFor="type-email" className="font-normal cursor-pointer">Email Sent</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="visit" id="type-visit" />
                <Label htmlFor="type-visit" className="font-normal cursor-pointer">Site Visit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="note" id="type-note" />
                <Label htmlFor="type-note" className="font-normal cursor-pointer">Note</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-medium">Related Deal</Label>
            <div className="mt-1.5">
              <SearchableSelect
                options={[{ value: "", label: "No deal (General)" }, ...leadOptions]}
                value={leadId}
                onChange={setLeadId}
                placeholder="Select deal..."
                searchPlaceholder="Search deals..."
                data-testid="select-activity-lead"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Notes <span className="text-destructive">*</span></Label>
            <Textarea
              className="mt-1.5 min-h-[100px]"
              placeholder="What happened? (min 10 characters)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              data-testid="textarea-activity-notes"
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Date</Label>
            <div className="mt-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                    data-testid="button-activity-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={notes.trim().length < 10 || mutation.isPending}
            data-testid="button-activity-submit"
          >
            {mutation.isPending ? "Logging..." : "Log Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
