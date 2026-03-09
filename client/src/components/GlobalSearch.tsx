import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Target, Building2, UserRound, CheckSquare, FileText } from "lucide-react";
import { Client, ClientContact, Lead, Task, Estimate } from "@shared/schema";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [, setLocation] = useLocation();

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: contacts = [] } = useQuery<ClientContact[]>({ queryKey: ["/api/client-contacts"] });
  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });
  const { data: estimates = [] } = useQuery<Estimate[]>({ queryKey: ["/api/estimates"] });

  const navigate = useCallback((href: string) => {
    setLocation(href);
    onOpenChange(false);
  }, [setLocation, onOpenChange]);

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.name]));

  const substringFilter = (value: string, search: string) => {
    if (!search.trim()) return 1;
    return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg gap-0 max-w-lg">
        <Command
          filter={substringFilter}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
        >
          <CommandInput placeholder="Search companies, contacts, deals, tasks..." data-testid="input-global-search" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Companies */}
            {clients.length > 0 && (
              <CommandGroup heading="Companies">
                {clients.map(client => (
                  <CommandItem
                    key={`client-${client.id}`}
                    value={`company ${client.name} ${client.industry || ""}`}
                    onSelect={() => navigate(`/customers/${client.id}`)}
                    data-testid={`search-result-company-${client.id}`}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{client.name}</p>
                      {client.industry && (
                        <p className="text-xs text-muted-foreground truncate">{client.industry}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {clients.length > 0 && contacts.length > 0 && <CommandSeparator />}

            {/* Contacts */}
            {contacts.length > 0 && (
              <CommandGroup heading="Contacts">
                {contacts.map(contact => (
                  <CommandItem
                    key={`contact-${contact.id}`}
                    value={`contact ${contact.name} ${contact.title || ""} ${contact.email || ""} ${clientMap[contact.clientId] || ""}`}
                    onSelect={() => navigate(`/customers/${contact.clientId}`)}
                    data-testid={`search-result-contact-${contact.id}`}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                      {contact.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{contact.name}</p>
                        {contact.isPrimary && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">Primary</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.title ? `${contact.title} · ` : ""}{clientMap[contact.clientId] || "Unknown company"}
                        {contact.email ? ` · ${contact.email}` : ""}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {leads.length > 0 && (contacts.length > 0 || clients.length > 0) && <CommandSeparator />}

            {/* Deals */}
            {leads.length > 0 && (
              <CommandGroup heading="Deals">
                {leads.map(lead => (
                  <CommandItem
                    key={`lead-${lead.id}`}
                    value={`deal ${lead.title} ${lead.stage || ""} ${clientMap[lead.clientId ?? 0] || ""}`}
                    onSelect={() => navigate(`/leads?id=${lead.id}`)}
                    data-testid={`search-result-lead-${lead.id}`}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Target className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{lead.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.stage?.replace(/_/g, " ")}
                        {lead.clientId && clientMap[lead.clientId] ? ` · ${clientMap[lead.clientId]}` : ""}
                        {lead.value ? ` · $${Number(lead.value).toLocaleString()}` : ""}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {tasks.length > 0 && leads.length > 0 && <CommandSeparator />}

            {/* Tasks */}
            {tasks.length > 0 && (
              <CommandGroup heading="Tasks">
                {tasks.map(task => (
                  <CommandItem
                    key={`task-${task.id}`}
                    value={`task ${task.title} ${task.status || ""} ${task.priority || ""}`}
                    onSelect={() => navigate(`/tasks`)}
                    data-testid={`search-result-task-${task.id}`}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                      <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {STATUS_LABELS[task.status] || task.status}
                        {task.priority ? ` · ${task.priority} priority` : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-5 px-1.5 shrink-0 border-0 ${PRIORITY_COLORS[task.priority] || ""}`}
                    >
                      {task.priority}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {estimates.length > 0 && tasks.length > 0 && <CommandSeparator />}

            {/* Estimates */}
            {estimates.length > 0 && (
              <CommandGroup heading="Estimates">
                {estimates.map(estimate => (
                  <CommandItem
                    key={`estimate-${estimate.id}`}
                    value={`estimate ${estimate.title} ${estimate.status || ""} ${clientMap[estimate.clientId ?? 0] || ""}`}
                    onSelect={() => navigate(`/estimates/${estimate.id}`)}
                    data-testid={`search-result-estimate-${estimate.id}`}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{estimate.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {estimate.status}
                        {estimate.clientId && clientMap[estimate.clientId] ? ` · ${clientMap[estimate.clientId]}` : ""}
                        {estimate.total ? ` · $${Number(estimate.total).toLocaleString()}` : ""}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function GlobalSearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-testid="button-global-search"
      className="hidden md:flex items-center gap-2.5 h-9 pl-3.5 pr-2.5 rounded-full bg-muted/70 hover:bg-muted border border-border/40 hover:border-border/70 transition-all duration-150 text-sm text-muted-foreground w-64 cursor-text shadow-sm"
    >
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
      <span className="flex-1 text-left">Search...</span>
      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-border/60 bg-background/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/70">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}

export function MobileSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-testid="button-mobile-search"
      className="flex md:hidden items-center justify-center h-9 w-9 rounded-full hover:bg-muted transition-colors text-muted-foreground"
      aria-label="Search"
    >
      <Search className="h-5 w-5" />
    </button>
  );
}
