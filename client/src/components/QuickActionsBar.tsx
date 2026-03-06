import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Target, Users, Building2, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
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

type ActiveDialog = "deal" | "contact" | "company" | "task" | null;

export function QuickActionsBar() {
  const { toast } = useToast();
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);

  const open = (d: ActiveDialog) => setActiveDialog(d);
  const close = () => setActiveDialog(null);

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: allContacts = [] } = useQuery<ClientContact[]>({ queryKey: ["/api/client-contacts"] });
  const { data: stages = [] } = useQuery<PipelineStage[]>({ queryKey: ["/api/pipeline-stages"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });

  return (
    <>
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
        </DropdownMenuContent>
      </DropdownMenu>

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
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [clientId, setClientId] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);

  const reset = () => {
    setName(""); setTitle(""); setEmail(""); setPhone(""); setLinkedinUrl("");
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
                data-testid="input-quick-contact-email"
              />
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
  const [industry, setIndustry] = useState("");
  const [notes, setNotes] = useState("");
  const [tier, setTier] = useState("");
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);
  const [createdClientName, setCreatedClientName] = useState("");

  const reset = () => {
    setName(""); setIndustry(""); setNotes(""); setTier("");
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
              data-testid="input-quick-company-name"
            />
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
