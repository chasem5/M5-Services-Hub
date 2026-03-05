import { useState, useEffect } from "react";
import { ClientContact } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Mail, Phone, UserCircle2, Star, Edit2, Check, AlertTriangle } from "lucide-react";

interface OrgChartProps {
  contacts: ClientContact[];
  onUpdateReportsTo: (contactId: number, reportsTo: number | null) => void;
  onEditContact: (contact: ClientContact) => void;
  isUpdating: boolean;
}

interface OrgNodeProps {
  contact: ClientContact;
  contacts: ClientContact[];
  onUpdateReportsTo: (contactId: number, reportsTo: number | null) => void;
  onEditContact: (contact: ClientContact) => void;
  isUpdating: boolean;
  ancestors?: Set<number>;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function getDescendantIds(contactId: number, contacts: ClientContact[]): Set<number> {
  const result = new Set<number>();
  const queue = [contactId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = contacts.filter(c => c.reportsTo === current && !result.has(c.id));
    for (const child of children) {
      result.add(child.id);
      queue.push(child.id);
    }
  }
  return result;
}

function OrgNode({ contact, contacts, onUpdateReportsTo, onEditContact, isUpdating, ancestors = new Set() }: OrgNodeProps) {
  const [editingReportsTo, setEditingReportsTo] = useState(false);
  const [pendingReportsTo, setPendingReportsTo] = useState<string>(
    contact.reportsTo?.toString() || "none"
  );

  useEffect(() => {
    setPendingReportsTo(contact.reportsTo?.toString() || "none");
  }, [contact.reportsTo]);

  const descendantIds = getDescendantIds(contact.id, contacts);
  const eligibleManagers = contacts.filter(
    c => c.id !== contact.id && !descendantIds.has(c.id)
  );

  const nextAncestors = new Set(Array.from(ancestors).concat(contact.id));
  const children = contacts.filter(
    c => c.reportsTo === contact.id && !ancestors.has(c.id)
  );

  const handleSaveReportsTo = () => {
    const val = pendingReportsTo === "none" ? null : parseInt(pendingReportsTo);
    onUpdateReportsTo(contact.id, val);
    setEditingReportsTo(false);
  };

  return (
    <div className="flex flex-col items-center">
      <Popover>
        <PopoverTrigger asChild>
          <Card
            className="w-48 cursor-pointer border border-border hover:border-primary/60 hover:shadow-md transition-all bg-card shadow-sm group"
            data-testid={`org-node-${contact.id}`}
          >
            <CardContent className="p-3 flex flex-col items-center text-center gap-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-sm group-hover:bg-primary/20 transition-colors">
                {getInitials(contact.name)}
              </div>
              <div>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <p className="font-bold text-sm leading-tight">{contact.name}</p>
                  {contact.isPrimary && (
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                  )}
                </div>
                {contact.title && (
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">{contact.title}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="center">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {getInitials(contact.name)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-bold">{contact.name}</p>
                  {contact.isPrimary && (
                    <Badge className="text-[10px] h-4 px-1.5 uppercase">Primary</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{contact.title || "No title"}</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {contact.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                <span>{contact.phone}</span>
              </div>
            )}
            {!contact.email && !contact.phone && (
              <p className="text-sm text-muted-foreground italic">No contact info</p>
            )}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full mb-3"
                onClick={() => onEditContact(contact)}
                data-testid={`button-edit-contact-org-${contact.id}`}
              >
                <Edit2 className="mr-2 h-3.5 w-3.5" />
                Edit Contact Info
              </Button>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reports To</p>
              {editingReportsTo ? (
                <div className="flex gap-2">
                  <Select value={pendingReportsTo} onValueChange={setPendingReportsTo}>
                    <SelectTrigger className="h-8 text-sm flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No manager (top level)</SelectItem>
                      {eligibleManagers.map(m => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.name}{m.title ? ` — ${m.title}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={handleSaveReportsTo}
                    disabled={isUpdating}
                    data-testid={`button-save-reports-to-${contact.id}`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm">
                    {contact.reportsTo
                      ? contacts.find(c => c.id === contact.reportsTo)?.name || "Unknown"
                      : <span className="text-muted-foreground italic">Top level</span>
                    }
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setPendingReportsTo(contact.reportsTo?.toString() || "none");
                      setEditingReportsTo(true);
                    }}
                    data-testid={`button-edit-reports-to-${contact.id}`}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="w-px h-6 bg-border" />
          <div className="relative flex items-start justify-center gap-0">
            {children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{
                  left: `calc(50% - (${children.length - 1} * 100px))`,
                  width: `calc((${children.length - 1}) * 200px)`,
                }}
              />
            )}
            {children.map((child, idx) => (
              <div key={child.id} className="flex flex-col items-center px-4">
                <div className="w-px h-6 bg-border" />
                <OrgNode
                  contact={child}
                  contacts={contacts}
                  onUpdateReportsTo={onUpdateReportsTo}
                  onEditContact={onEditContact}
                  isUpdating={isUpdating}
                  ancestors={nextAncestors}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function detectCycles(contacts: ClientContact[]): boolean {
  for (const contact of contacts) {
    const visited = new Set<number>();
    let current: number | null | undefined = contact.reportsTo;
    while (current != null) {
      if (visited.has(current)) return true;
      visited.add(current);
      current = contacts.find(c => c.id === current)?.reportsTo;
    }
  }
  return false;
}

export function OrgChart({ contacts, onUpdateReportsTo, onEditContact, isUpdating }: OrgChartProps) {
  const hasCycles = detectCycles(contacts);
  const rootContacts = contacts.filter(c => !c.reportsTo);
  const displayRoots = rootContacts.length > 0 ? rootContacts : contacts;

  if (contacts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <UserCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No contacts to display</p>
        <p className="text-sm">Add contacts in the Contacts tab to build the org chart.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto min-h-[400px] py-8">
      {hasCycles && (
        <div className="flex items-start gap-3 mb-6 mx-8 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Circular reporting relationship detected</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Click any contact node and use the "Reports To" editor to fix the hierarchy.
            </p>
          </div>
        </div>
      )}
      <div className="flex gap-16 justify-center min-w-max px-8">
        {displayRoots.map(root => (
          <OrgNode
            key={root.id}
            contact={root}
            contacts={contacts}
            onUpdateReportsTo={onUpdateReportsTo}
            onEditContact={onEditContact}
            isUpdating={isUpdating}
          />
        ))}
      </div>
    </div>
  );
}
