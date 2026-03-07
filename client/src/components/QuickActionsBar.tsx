import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Target, Users, Building2, CheckSquare, CreditCard, Phone, Calendar as CalendarIcon, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
import type { Client, ClientContact, Lead, PipelineStage, User } from "@shared/schema";
import { CardScannerDialog } from "@/components/CardScannerDialog";

export type ActiveDialog = "deal" | "contact" | "company" | "task" | "activity" | null;

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
          setTimeout(() => setActiveDialog("contact"), 100);
        }}
      />
      <AddCompanyDialog
        open={activeDialog === "company"}
        onClose={close}
        onAddContact={(clientId) => {
          close();
          setTimeout(() => setActiveDialog("contact"), 100);
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
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [contactId, setContactId] = useState("");
  const [stage, setStage] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [value, setValue] = useState("");

  const reset = () => {
    setTitle(""); setClientId(""); setContactId(""); setStage(""); setServiceType(""); setValue("");
  };

  const clientOptions = clients.map(c => ({ value: String(c.id), label: c.name }));
  const contactOptions = (clientId
    ? allContacts.filter(c => c.clientId === parseInt(clientId))
    : allContacts
  ).map(c => ({ value: String(c.id), label: c.name, sublabel: c.title ?? undefined }));
  const stageOptions = stages.map(s => ({ value: s.slug, label: s.label }));

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/leads", {
        title: title.trim(),
        clientId: clientId ? parseInt(clientId) : undefined,
        contactId: contactId ? parseInt(contactId) : null,
        stage: stage || (stages[0]?.slug ?? "new_lead"),
        serviceType: serviceType || null,
        value: value || "0",
        valueType: "fixed",
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
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add Deal</DialogTitle>
          <DialogDescription>Create a new sales opportunity in the pipeline.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-sm font-medium">Deal Title <span className="text-destructive">*</span></Label>
            <Input
              className="mt-1.5"
              placeholder="e.g. HVAC Maintenance Contract"
              value={title}
              onChange={e => setTitle(e.target.value)}
              data-testid="input-quick-deal-title"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Company</Label>
            <div className="mt-1.5">
              <SearchableSelect
                options={[{ value: "", label: "No company" }, ...clientOptions]}
                value={clientId}
                onChange={(v) => { setClientId(v); setContactId(""); }}
                placeholder="Select company..."
                searchPlaceholder="Search companies..."
                data-testid="select-quick-deal-client"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Contact</Label>
            <div className="mt-1.5">
              <SearchableSelect
                options={[{ value: "", label: "No contact" }, ...contactOptions]}
                value={contactId}
                onChange={setContactId}
                placeholder="Select contact..."
                searchPlaceholder="Search contacts..."
                data-testid="select-quick-deal-contact"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium">Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger className="mt-1.5" data-testid="select-quick-deal-stage">
                  <SelectValue placeholder="Select stage..." />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">Value ($)</Label>
              <Input
                className="mt-1.5"
                type="number"
                placeholder="0"
                value={value}
                onChange={e => setValue(e.target.value)}
                data-testid="input-quick-deal-value"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Service Type</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger className="mt-1.5" data-testid="select-quick-deal-service">
                <SelectValue placeholder="Select service type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="building_engineering">Building Engineering</SelectItem>
                <SelectItem value="facility_solutions">Facility Solutions</SelectItem>
                <SelectItem value="janitorial">Janitorial</SelectItem>
                <SelectItem value="special_projects">Special Projects</SelectItem>
                <SelectItem value="property_assessment">Property Assessment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
            data-testid="button-quick-deal-submit"
          >
            {mutation.isPending ? "Adding..." : "Add Deal"}
          </Button>
        </DialogFooter>
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
