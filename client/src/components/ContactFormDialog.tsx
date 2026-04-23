import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientContactSchema } from "@shared/schema";
import type { Client, ClientContact, ContactStage, User } from "@shared/schema";
import { HardHat, Wrench, Sparkles, Zap, ClipboardList, CheckCircle2, AlertTriangle } from "lucide-react";
import { SiLinkedin } from "react-icons/si";
import { Link } from "wouter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPhoneNumber } from "@/lib/phone";
import { getStageBadgeClass } from "@/components/ContactStagesManager";

const SERVICE_NEEDS = [
  { key: "building_engineering", label: "Building Engineer", Icon: HardHat, color: "text-orange-500" },
  { key: "facility_solutions", label: "Facility Solutions", Icon: Wrench, color: "text-blue-500" },
  { key: "janitorial", label: "Janitorial", Icon: Sparkles, color: "text-teal-500" },
  { key: "special_projects", label: "Special Projects", Icon: Zap, color: "text-purple-500" },
  { key: "property_assessment", label: "Property Assessment", Icon: ClipboardList, color: "text-primary" },
] as const;

interface ContactFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When set, company selector is hidden and contact is created under this client */
  fixedClientId?: number;
  fixedClientName?: string;
  /** Extra fields only relevant when inside a client page */
  offices?: { id: number; name: string }[];
  defaultOfficeId?: number | null;
  siblingContacts?: ClientContact[];
  onSuccess?: (contact: ClientContact) => void;
}

export function ContactFormDialog({
  open,
  onClose,
  fixedClientId,
  fixedClientName,
  offices,
  defaultOfficeId,
  siblingContacts,
  onSuccess,
}: ContactFormDialogProps) {
  const { toast } = useToast();
  const [duplicateWarning, setDuplicateWarning] = useState<{
    id: number; name: string; clientId: number; clientName?: string;
  } | null>(null);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !fixedClientId,
  });
  const { data: contactStages = [] } = useQuery<ContactStage[]>({
    queryKey: ["/api/contact-stages"],
  });
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const form = useForm({
    resolver: zodResolver(insertClientContactSchema),
    defaultValues: {
      name: "",
      title: "",
      email: "",
      phone: "",
      clientId: fixedClientId as number | undefined,
      isPrimary: false,
      serviceNeeds: [] as string[],
      stageId: null as number | null,
      ownerId: null as string | null,
      profilePictureUrl: "",
      linkedinUrl: "",
      tier: null as string | null,
      reportsTo: undefined as number | undefined,
      officeId: defaultOfficeId ?? (undefined as number | undefined),
    },
  });

  const reset = () => {
    form.reset({
      name: "", title: "", email: "", phone: "",
      clientId: fixedClientId as number | undefined,
      isPrimary: false, serviceNeeds: [], stageId: null, ownerId: null,
      profilePictureUrl: "", linkedinUrl: "", tier: null,
      reportsTo: undefined,
      officeId: defaultOfficeId ?? undefined,
    });
    setDuplicateWarning(null);
    setIsCreatingCompany(false);
    setNewCompanyName("");
    setCreatedClientId(null);
  };

  const createCompanyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/clients", { name: name.trim() });
      return res.json() as Promise<Client>;
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setCreatedClientId(newClient.id);
      (form as any).setValue("clientId", newClient.id);
      setIsCreatingCompany(false);
    },
    onError: () => toast({ title: "Failed to create company", variant: "destructive" }),
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: any) => {
      const clientId = fixedClientId ?? createdClientId ?? data.clientId;
      if (!clientId) throw new Error("A company is required");
      const payload = {
        ...data,
        linkedinUrl: data.linkedinUrl || null,
        profilePictureUrl: data.profilePictureUrl || null,
        tier: data.tier === "none" ? null : (data.tier || null),
        reportsTo: data.reportsTo || null,
        serviceNeeds: data.serviceNeeds || [],
        officeId: data.officeId || null,
      };
      const res = await apiRequest("POST", `/api/clients/${clientId}/contacts`, payload);
      return res.json() as Promise<ClientContact>;
    },
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Contact added successfully" });
      onSuccess?.(contact);
      reset();
      onClose();
    },
    onError: (err: Error) => toast({ title: err.message || "Failed to add contact", variant: "destructive" }),
  });

  const checkDuplicate = async (email: string) => {
    if (!email.trim()) { setDuplicateWarning(null); return; }
    try {
      const res = await apiRequest("GET", `/api/contacts/check-duplicate?email=${encodeURIComponent(email.trim())}`);
      const data = await res.json();
      setDuplicateWarning(data.exists ? data.contact : null);
    } catch {}
  };

  const clientSelectOptions = [
    { value: "__new__", label: "+ Create new company..." },
    ...clients.map(c => ({ value: String(c.id), label: c.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogDescription>
            {fixedClientName
              ? `Add a new contact person for ${fixedClientName}.`
              : "Create a new contact and associate them with a company."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => createContactMutation.mutate(data))}
            className="space-y-4 py-2 overflow-y-auto flex-1 pr-1"
          >
            {/* Name */}
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Enter contact name" {...field} data-testid="input-contact-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Company selector (hidden when fixedClientId is set) */}
            {!fixedClientId && (
              <>
                <FormField control={form.control} name={"clientId" as any} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company <span className="text-destructive">*</span></FormLabel>
                    <SearchableSelect
                      options={clientSelectOptions}
                      value={createdClientId ? String(createdClientId) : (field.value?.toString() || "")}
                      onChange={(val) => {
                        if (val === "__new__") {
                          setIsCreatingCompany(true);
                          field.onChange(undefined);
                        } else {
                          setIsCreatingCompany(false);
                          setCreatedClientId(null);
                          field.onChange(val ? parseInt(val) : undefined);
                        }
                      }}
                      placeholder="Select or create company..."
                      searchPlaceholder="Search companies..."
                      data-testid="select-contact-company"
                    />
                    <FormMessage />
                  </FormItem>
                )} />
                {isCreatingCompany && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="New company name"
                      value={newCompanyName}
                      onChange={e => setNewCompanyName(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newCompanyName.trim() || createCompanyMutation.isPending}
                      onClick={() => createCompanyMutation.mutate(newCompanyName)}
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
              </>
            )}

            {/* Title */}
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Job Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Operations Manager" {...field} value={field.value || ""} data-testid="input-contact-title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="email@example.com"
                      {...field}
                      value={field.value || ""}
                      onBlur={(e) => { field.onBlur(); checkDuplicate(e.target.value); }}
                      data-testid="input-contact-email"
                    />
                  </FormControl>
                  {duplicateWarning && (
                    <p className="mt-1 text-[10px] text-yellow-600 font-medium flex items-center gap-1 leading-tight">
                      <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                      Already exists: {duplicateWarning.name}
                      {duplicateWarning.clientName ? ` at ${duplicateWarning.clientName}` : ""} —{" "}
                      <Link
                        href={`/customers/${duplicateWarning.clientId}?contactId=${duplicateWarning.id}`}
                        className="underline ml-0.5"
                        onClick={onClose}
                      >
                        View them
                      </Link>
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(555) 012-3456"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                      data-testid="input-contact-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* LinkedIn */}
            <FormField control={form.control} name={"linkedinUrl" as any} render={({ field }) => (
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
            )} />

            {/* Profile Picture */}
            <FormField control={form.control} name="profilePictureUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Profile Picture URL</FormLabel>
                <div className="flex items-center gap-3">
                  <FormControl>
                    <Input
                      placeholder="https://example.com/photo.jpg"
                      {...field}
                      value={field.value || ""}
                      data-testid="input-contact-photo"
                    />
                  </FormControl>
                  {field.value && (
                    <img
                      src={field.value}
                      alt="Preview"
                      className="h-10 w-10 rounded-full object-cover border"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )} />

            {/* Office (only when offices are passed) */}
            {offices && offices.length > 0 && (
              <FormField control={form.control} name={"officeId" as any} render={({ field }) => (
                <FormItem>
                  <FormLabel>Office / Division</FormLabel>
                  <Select
                    value={field.value != null ? String(field.value) : "none"}
                    onValueChange={(val) => field.onChange(val === "none" ? null : parseInt(val))}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-contact-office">
                        <SelectValue placeholder="Select office (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No office (unassigned)</SelectItem>
                      {offices.map(o => (
                        <SelectItem key={o.id} value={o.id.toString()}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Reports To (only when sibling contacts are passed) */}
            {siblingContacts && siblingContacts.length > 0 && (
              <FormField control={form.control} name="reportsTo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reports To</FormLabel>
                  <SearchableSelect
                    options={[
                      { value: "none", label: "No manager (top level)" },
                      ...siblingContacts.map(c => ({
                        value: c.id.toString(),
                        label: c.name,
                        sublabel: c.title ?? undefined,
                      })),
                    ]}
                    value={field.value?.toString() || "none"}
                    onChange={(val) => field.onChange(val === "none" ? undefined : parseInt(val))}
                    placeholder="Select manager (optional)"
                    searchPlaceholder="Search contacts..."
                    data-testid="select-contact-reports-to"
                  />
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {/* Service Needs */}
            <div>
              <FormLabel className="text-sm font-medium">Service Needs</FormLabel>
              <p className="text-xs text-muted-foreground mb-2 mt-0.5">Which M5 services does this contact require?</p>
              <div className="grid grid-cols-1 gap-2">
                {SERVICE_NEEDS.map(s => {
                  const current: string[] = (form.watch("serviceNeeds") as string[]) ?? [];
                  const checked = current.includes(s.key);
                  return (
                    <div
                      key={s.key}
                      role="checkbox"
                      aria-checked={checked}
                      tabIndex={0}
                      className={`flex items-center gap-3 p-2.5 rounded-md border cursor-pointer transition-colors select-none ${checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                      onClick={() => form.setValue("serviceNeeds", checked ? current.filter(k => k !== s.key) : [...current, s.key])}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          form.setValue("serviceNeeds", checked ? current.filter(k => k !== s.key) : [...current, s.key]);
                        }
                      }}
                    >
                      <s.Icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                      <span className="text-sm">{s.label}</span>
                      {checked && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tier */}
            <FormField control={form.control} name={"tier" as any} render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Tier</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  value={field.value ?? "none"}
                >
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
            )} />

            {/* Stage */}
            {contactStages.length > 0 && (
              <FormField control={form.control} name={"stageId" as any} render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Stage</FormLabel>
                  <Select
                    value={field.value != null ? String(field.value) : "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? null : parseInt(v))}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-contact-stage">
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
              )} />
            )}

            {/* Relationship Owner */}
            <FormField control={form.control} name={"ownerId" as any} render={({ field }) => (
              <FormItem>
                <FormLabel>Relationship Owner</FormLabel>
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-contact-owner">
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
            )} />

            {/* Primary Contact */}
            <FormField control={form.control} name="isPrimary" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} data-testid="checkbox-contact-primary" />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Primary Contact</FormLabel>
                  <FormDescription>Mark this person as the main point of contact.</FormDescription>
                </div>
              </FormItem>
            )} />

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                className="w-full h-11"
                disabled={createContactMutation.isPending}
                data-testid="button-submit-contact"
              >
                {createContactMutation.isPending ? "Adding..." : "Add Contact"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
