import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, Lead, Client, ClientContact, User, InsertTask, insertTaskSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isBefore, startOfDay } from "date-fns";
import { Link } from "wouter";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Plus,
  Search,
  Calendar as CalendarIcon,
  CheckCircle2,
  Check,
  Trash2,
  X,
  LayoutGrid,
  List,
  Circle,
  Clock,
  AlertCircle,
  User as UserIcon,
  AlignLeft,
  ChevronDown,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ChecklistItem = { id: string; text: string; done: boolean };

const LABEL_COLORS: Record<string, { bg: string; label: string }> = {
  red: { bg: "bg-red-500", label: "Red" },
  orange: { bg: "bg-orange-400", label: "Orange" },
  yellow: { bg: "bg-yellow-400", label: "Yellow" },
  green: { bg: "bg-green-500", label: "Green" },
  blue: { bg: "bg-blue-500", label: "Blue" },
  purple: { bg: "bg-purple-500", label: "Purple" },
};

const PRIORITY_COLORS = {
  low: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
};

const COLUMNS: { id: "todo" | "in_progress" | "done"; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function TaskCardCompact({
  task,
  users,
  leads,
  clients,
  onClick,
  isDragging,
}: {
  task: Task;
  users: User[];
  leads: Lead[];
  clients: Client[];
  onClick: () => void;
  isDragging?: boolean;
}) {
  const assignedUser = users.find((u) => u.id === task.assignedTo);
  const relatedLead = leads.find((l) => l.id === task.relatedLeadId);
  const relatedClient = clients.find((c) => c.id === task.relatedClientId);
  const isOverdue =
    task.dueDate &&
    isBefore(new Date(task.dueDate), startOfDay(new Date())) &&
    task.status !== "done";
  const checklist = (task.checklist as ChecklistItem[]) || [];
  const doneCount = checklist.filter((i) => i.done).length;
  const taskLabels = (task.labels as string[]) || [];

  return (
    <div
      className={cn(
        "bg-white dark:bg-card rounded-lg shadow-sm border border-border/60 cursor-pointer hover:shadow-md transition-all group",
        isDragging && "opacity-50 rotate-1 scale-105 shadow-xl",
        task.status === "done" && "opacity-70"
      )}
      onClick={onClick}
      data-testid={`card-task-${task.id}`}
    >
      {taskLabels.length > 0 && (
        <div className="flex gap-1 px-3 pt-2.5">
          {taskLabels.map((lbl) => (
            <span
              key={lbl}
              className={cn("h-2 rounded-full flex-1 max-w-[40px]", LABEL_COLORS[lbl]?.bg ?? "bg-muted")}
              title={LABEL_COLORS[lbl]?.label}
            />
          ))}
        </div>
      )}
      <div className="p-3 pt-2 space-y-2">
        <p className={cn("text-sm font-medium leading-snug", task.status === "done" && "line-through text-muted-foreground")}>
          {task.title}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant="outline"
            className={cn("px-1.5 py-0 text-[10px] font-bold uppercase", PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS])}
          >
            {task.priority}
          </Badge>
          {relatedLead && (
            <span className="inline-flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/8 border border-primary/20 rounded px-1.5 py-0 leading-5">
              <AlertCircle className="h-2.5 w-2.5" />
              {relatedLead.title}
            </span>
          )}
          {relatedClient && !relatedLead && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0 leading-5">
              {relatedClient.name}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5",
                  isOverdue
                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-2.5 w-2.5" />
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}
            {checklist.length > 0 && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium",
                doneCount === checklist.length ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              )}>
                <CheckCircle2 className="h-2.5 w-2.5" />
                {doneCount}/{checklist.length}
              </span>
            )}
            {task.description && (
              <AlignLeft className="h-3 w-3 text-muted-foreground/50" />
            )}
          </div>
          {assignedUser ? (
            <Avatar className="h-6 w-6 border border-background shadow-sm">
              <AvatarImage src={assignedUser.profileImageUrl || undefined} />
              <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-bold">
                {assignedUser.firstName?.[0]}{assignedUser.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
              <UserIcon className="h-3 w-3 text-muted-foreground/40" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  users,
  leads,
  clients,
  onClick,
}: {
  task: Task;
  users: User[];
  leads: Lead[];
  clients: Client[];
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { status: task.status, sortOrder: task.sortOrder },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="relative group/drag">
        <div
          {...listeners}
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/drag:opacity-30 hover:!opacity-60 cursor-grab z-10 p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5 text-foreground" />
        </div>
        <TaskCardCompact
          task={task}
          users={users}
          leads={leads}
          clients={clients}
          onClick={onClick}
          isDragging={isDragging}
        />
      </div>
    </div>
  );
}

function QuickAddCard({
  status,
  onAdd,
}: {
  status: string;
  onAdd: (title: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  const handleSave = () => {
    if (text.trim()) {
      onAdd(text.trim(), status);
      setText("");
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-full px-2 py-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        onClick={() => setOpen(true)}
        data-testid={`button-quick-add-${status}`}
      >
        <Plus className="h-4 w-4" />
        Add a card
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        className="w-full bg-white dark:bg-card border border-border rounded-lg px-3 py-2 text-sm resize-none shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        placeholder="Enter a title for this card…"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          }
          if (e.key === "Escape") {
            setOpen(false);
            setText("");
          }
        }}
        data-testid={`textarea-quick-add-${status}`}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 text-xs" onClick={handleSave} data-testid={`button-save-quick-add-${status}`}>
          Add card
        </Button>
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={() => { setOpen(false); setText(""); }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { toast } = useToast();
  const [view, setView] = useState<"board" | "list">("board");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });
  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["/api/leads"] });
  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: allContacts = [] } = useQuery<ClientContact[]>({ queryKey: ["/api/client-contacts"] });
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  const addForm = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      checklist: [],
      labels: [],
      sortOrder: 0,
    },
  });

  const watchedCompanyId = addForm.watch("relatedClientId");

  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsAddOpen(false);
      addForm.reset();
      toast({ title: "Task created" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertTask> }) => {
      const res = await apiRequest("PUT", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setSelectedTask(updated);
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, status, sortOrder }: { id: number; status: string; sortOrder: number }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}/move`, { status, sortOrder });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setSelectedTask(null);
      toast({ title: "Task deleted" });
    },
  });

  const quickAddMutation = useMutation({
    mutationFn: async ({ title, status }: { title: string; status: string }) => {
      const colTasks = tasks.filter((t) => t.status === status);
      const maxOrder = colTasks.length > 0 ? Math.max(...colTasks.map((t) => t.sortOrder ?? 0)) : -1;
      const res = await apiRequest("POST", "/api/tasks", {
        title,
        status,
        priority: "medium",
        sortOrder: maxOrder + 1,
        checklist: [],
        labels: [],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const overColumnId = over.data?.current?.status ?? (over.id as string);

    const newStatus = overTask ? overTask.status : overColumnId;
    const colTasks = tasks
      .filter((t) => t.status === newStatus && t.id !== activeTask.id)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    let newOrder = 0;
    if (overTask) {
      const overIdx = colTasks.findIndex((t) => t.id === overTask.id);
      newOrder = overIdx >= 0 ? (overTask.sortOrder ?? 0) - 0.5 : colTasks.length;
    } else {
      newOrder = colTasks.length;
    }

    moveMutation.mutate({ id: activeTask.id, status: newStatus, sortOrder: newOrder });
  };

  const handleDragOver = (_event: DragOverEvent) => {};

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const getColumnTasks = (status: string) =>
    filtered
      .filter((t) => t.status === status)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const updateTaskField = (field: string, value: unknown) => {
    if (!selectedTask) return;
    updateMutation.mutate({ id: selectedTask.id, data: { [field]: value } as any });
  };

  const toggleLabel = (label: string) => {
    if (!selectedTask) return;
    const current = (selectedTask.labels as string[]) || [];
    const next = current.includes(label) ? current.filter((l) => l !== label) : [...current, label];
    updateMutation.mutate({ id: selectedTask.id, data: { labels: next } });
  };

  const addChecklistItem = () => {
    if (!selectedTask || !newChecklistText.trim()) return;
    const current = (selectedTask.checklist as ChecklistItem[]) || [];
    const next = [...current, { id: genId(), text: newChecklistText.trim(), done: false }];
    updateMutation.mutate({ id: selectedTask.id, data: { checklist: next } });
    setNewChecklistText("");
  };

  const toggleChecklistItem = (itemId: string) => {
    if (!selectedTask) return;
    const current = (selectedTask.checklist as ChecklistItem[]) || [];
    const next = current.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i));
    updateMutation.mutate({ id: selectedTask.id, data: { checklist: next } });
  };

  const deleteChecklistItem = (itemId: string) => {
    if (!selectedTask) return;
    const current = (selectedTask.checklist as ChecklistItem[]) || [];
    const next = current.filter((i) => i.id !== itemId);
    updateMutation.mutate({ id: selectedTask.id, data: { checklist: next } });
  };

  const checklist = selectedTask ? ((selectedTask.checklist as ChecklistItem[]) || []) : [];
  const checklistDone = checklist.filter((i) => i.done).length;
  const checklistPct = checklist.length > 0 ? Math.round((checklistDone / checklist.length) * 100) : 0;

  if (isLoadingTasks) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 flex-1 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-background border-b shadow-sm shrink-0">
        <div>
          <h1 className="text-2xl font-heading font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? "s" : ""} total</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks…"
              className="pl-9 w-56 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-task-search"
            />
          </div>
          <div className="flex items-center bg-muted rounded-md p-0.5 border">
            <button
              onClick={() => setView("board")}
              className={cn("px-3 py-1 text-sm rounded font-medium transition-colors flex items-center gap-1.5", view === "board" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
              data-testid="button-view-board"
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
            <button
              onClick={() => setView("list")}
              className={cn("px-3 py-1 text-sm rounded font-medium transition-colors flex items-center gap-1.5", view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
              data-testid="button-view-list"
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
          </div>
          <Button size="sm" onClick={() => setIsAddOpen(true)} data-testid="button-add-task">
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>
      </header>

      {/* Board view */}
      {view === "board" && (
        <div className="flex-1 overflow-x-auto p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
          >
            <div className="flex gap-4 h-full min-h-0" style={{ minWidth: "720px" }}>
              {COLUMNS.map((col) => {
                const colTasks = getColumnTasks(col.id);
                return (
                  <div
                    key={col.id}
                    className="flex flex-col rounded-xl bg-muted/60 border border-border/50 w-72 shrink-0"
                    data-testid={`column-${col.id}`}
                  >
                    <div className="flex items-center justify-between px-3 py-3 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{col.label}</span>
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs font-bold">
                          {colTasks.length}
                        </Badge>
                      </div>
                      <button
                        className="h-6 w-6 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        onClick={() => {
                          addForm.setValue("status", col.id);
                          setIsAddOpen(true);
                        }}
                        data-testid={`button-add-in-column-${col.id}`}
                      >
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      <SortableContext
                        items={colTasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {colTasks.map((task) => (
                          <SortableTaskCard
                            key={task.id}
                            task={task}
                            users={users}
                            leads={leads}
                            clients={clients}
                            onClick={() => setSelectedTask(task)}
                          />
                        ))}
                      </SortableContext>
                      {colTasks.length === 0 && !searchQuery && (
                        <div className="text-center py-6 text-xs text-muted-foreground">
                          No tasks here yet
                        </div>
                      )}
                    </div>

                    <div className="px-2 pb-2 pt-1 border-t border-border/30">
                      <QuickAddCard
                        status={col.id}
                        onAdd={(title, status) => quickAddMutation.mutate({ title, status })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <DragOverlay>
              {activeTask && (
                <div className="rotate-2 scale-105">
                  <TaskCardCompact
                    task={activeTask}
                    users={users}
                    leads={leads}
                    clients={clients}
                    onClick={() => {}}
                    isDragging={false}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-heading font-semibold text-lg">No tasks found</h3>
              <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or add a new task.</p>
            </div>
          ) : (
            <div className="space-y-2 max-w-3xl mx-auto">
              {COLUMNS.map((col) => {
                const colTasks = getColumnTasks(col.id);
                if (colTasks.length === 0) return null;
                return (
                  <div key={col.id} className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1 py-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{col.label}</span>
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{colTasks.length}</Badge>
                    </div>
                    {colTasks.map((task) => {
                      const assignedUser = users.find((u) => u.id === task.assignedTo);
                      const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), startOfDay(new Date())) && task.status !== "done";
                      const labels = (task.labels as string[]) || [];
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 bg-white dark:bg-card border border-border/60 rounded-lg px-4 py-3 cursor-pointer hover:shadow-sm transition-all group"
                          onClick={() => setSelectedTask(task)}
                          data-testid={`row-task-${task.id}`}
                        >
                          <button
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              const next: Record<string, string> = { todo: "in_progress", in_progress: "done", done: "todo" };
                              updateMutation.mutate({ id: task.id, data: { status: next[task.status] as any } });
                            }}
                            data-testid={`button-toggle-${task.id}`}
                          >
                            {task.status === "done"
                              ? <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
                              : task.status === "in_progress"
                              ? <Clock className="h-4.5 w-4.5 text-yellow-500" />
                              : <Circle className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary transition-colors" />}
                          </button>
                          {labels.length > 0 && (
                            <div className="flex gap-0.5 shrink-0">
                              {labels.map((lbl) => (
                                <span key={lbl} className={cn("h-3 w-3 rounded-full", LABEL_COLORS[lbl]?.bg)} />
                              ))}
                            </div>
                          )}
                          <p className={cn("flex-1 text-sm font-medium", task.status === "done" && "line-through text-muted-foreground")}>
                            {task.title}
                          </p>
                          <Badge variant="outline" className={cn("text-[10px] font-bold uppercase shrink-0", PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS])}>
                            {task.priority}
                          </Badge>
                          {task.dueDate && (
                            <span className={cn("text-xs shrink-0", isOverdue ? "text-red-500 font-medium" : "text-muted-foreground")}>
                              {format(new Date(task.dueDate), "MMM d")}
                            </span>
                          )}
                          {assignedUser ? (
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarImage src={assignedUser.profileImageUrl || undefined} />
                              <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-bold">
                                {assignedUser.firstName?.[0]}{assignedUser.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-muted shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Task Sheet */}
      <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Task</SheetTitle>
            <SheetDescription>Fill in the task details.</SheetDescription>
          </SheetHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-5 py-6">
              <FormField
                control={addForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Task title" {...field} data-testid="input-task-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the task…"
                        className="min-h-[80px] resize-none"
                        {...field}
                        value={field.value || ""}
                        data-testid="textarea-task-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Column</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addForm.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-task-assignee">
                          <SelectValue placeholder="Assign user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")} data-testid="button-task-date-picker">
                            {field.value ? format(new Date(field.value), "PPP") : "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="relatedLeadId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Lead</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === "none" ? undefined : parseInt(v))} value={field.value?.toString() || "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-task-lead"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {leads.map((l) => <SelectItem key={l.id} value={l.id.toString()}>{l.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="relatedClientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Company</FormLabel>
                      <Select onValueChange={(v) => { field.onChange(v === "none" ? undefined : parseInt(v)); addForm.setValue("relatedContactId", undefined); }} value={field.value?.toString() || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-task-company"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {clients.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="relatedContactId"
                  render={({ field }) => {
                    const avail = watchedCompanyId ? allContacts.filter((c) => c.clientId === watchedCompanyId) : allContacts;
                    return (
                      <FormItem>
                        <FormLabel>Related Contact</FormLabel>
                        <Select onValueChange={(v) => field.onChange(v === "none" ? undefined : parseInt(v))} value={field.value?.toString() || "none"} disabled={avail.length === 0}>
                          <FormControl>
                            <SelectTrigger data-testid="select-task-contact"><SelectValue placeholder={watchedCompanyId ? "Select contact" : "Select company first"} /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {avail.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}{c.title ? ` – ${c.title}` : ""}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    );
                  }}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-task">
                {createMutation.isPending ? "Creating…" : "Create Task"}
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Task Detail Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedTask && (() => {
            const taskLabels = (selectedTask.labels as string[]) || [];
            const assignedUser = users.find((u) => u.id === selectedTask.assignedTo);
            const relatedLead = leads.find((l) => l.id === selectedTask.relatedLeadId);
            const relatedClient = clients.find((c) => c.id === selectedTask.relatedClientId);
            const relatedContact = allContacts.find((c) => c.id === selectedTask.relatedContactId);
            return (
              <>
                <SheetHeader className="pb-0">
                  <SheetDescription className="sr-only">Task detail</SheetDescription>
                  {/* Color labels */}
                  {taskLabels.length > 0 && (
                    <div className="flex gap-1.5 mb-3">
                      {taskLabels.map((lbl) => (
                        <span key={lbl} className={cn("h-2.5 rounded-full w-10", LABEL_COLORS[lbl]?.bg)} />
                      ))}
                    </div>
                  )}
                  {/* Title inline edit */}
                  {isEditingTitle ? (
                    <input
                      autoFocus
                      className="text-xl font-heading font-bold bg-transparent border-b-2 border-primary outline-none w-full pb-1"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onBlur={() => {
                        if (editTitleValue.trim() && editTitleValue !== selectedTask.title) {
                          updateMutation.mutate({ id: selectedTask.id, data: { title: editTitleValue.trim() } });
                        }
                        setIsEditingTitle(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (editTitleValue.trim() && editTitleValue !== selectedTask.title) {
                            updateMutation.mutate({ id: selectedTask.id, data: { title: editTitleValue.trim() } });
                          }
                          setIsEditingTitle(false);
                        }
                        if (e.key === "Escape") setIsEditingTitle(false);
                      }}
                      data-testid="input-detail-title"
                    />
                  ) : (
                    <SheetTitle
                      className="text-xl cursor-pointer hover:bg-muted/50 rounded px-1 -ml-1 transition-colors"
                      onClick={() => { setIsEditingTitle(true); setEditTitleValue(selectedTask.title); }}
                      data-testid="title-task-detail"
                    >
                      {selectedTask.title}
                    </SheetTitle>
                  )}
                </SheetHeader>

                <div className="space-y-6 mt-4">
                  {/* Labels picker */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Labels</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(LABEL_COLORS).map(([key, { bg, label }]) => {
                        const active = taskLabels.includes(key);
                        return (
                          <button
                            key={key}
                            onClick={() => toggleLabel(key)}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all border",
                              bg,
                              "text-white border-transparent",
                              active ? "opacity-100 ring-2 ring-offset-1 ring-foreground/20" : "opacity-40 hover:opacity-70"
                            )}
                            data-testid={`button-label-${key}`}
                          >
                            {active && <Check className="h-3 w-3" />}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <AlignLeft className="h-3.5 w-3.5" /> Description
                    </p>
                    <Textarea
                      className="resize-none min-h-[80px]"
                      placeholder="Add a description…"
                      value={selectedTask.description || ""}
                      onChange={(e) => updateMutation.mutate({ id: selectedTask.id, data: { description: e.target.value } })}
                      data-testid="textarea-detail-description"
                    />
                  </div>

                  {/* Checklist */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Checklist
                      {checklist.length > 0 && (
                        <span className="ml-auto font-bold text-xs text-foreground">{checklistDone}/{checklist.length}</span>
                      )}
                    </p>
                    {checklist.length > 0 && (
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{ width: `${checklistPct}%` }}
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {checklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group/item">
                          <button
                            onClick={() => toggleChecklistItem(item.id)}
                            className={cn("h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                              item.done ? "bg-green-500 border-green-500" : "border-border hover:border-primary"
                            )}
                            data-testid={`button-checklist-toggle-${item.id}`}
                          >
                            {item.done && <Check className="h-2.5 w-2.5 text-white" />}
                          </button>
                          <span className={cn("flex-1 text-sm", item.done && "line-through text-muted-foreground")}>
                            {item.text}
                          </span>
                          <button
                            onClick={() => deleteChecklistItem(item.id)}
                            className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                            data-testid={`button-checklist-delete-${item.id}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Add an item…"
                        value={newChecklistText}
                        onChange={(e) => setNewChecklistText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); } }}
                        className="h-8 text-sm"
                        data-testid="input-checklist-new"
                      />
                      <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={addChecklistItem} data-testid="button-checklist-add">
                        Add
                      </Button>
                    </div>
                  </div>

                  {/* Status + Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Column</p>
                      <Select
                        value={selectedTask.status}
                        onValueChange={(v) => updateTaskField("status", v)}
                      >
                        <SelectTrigger className="h-9 text-sm" data-testid="select-detail-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority</p>
                      <Select
                        value={selectedTask.priority}
                        onValueChange={(v) => updateTaskField("priority", v)}
                      >
                        <SelectTrigger className="h-9 text-sm" data-testid="select-detail-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Assignee */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned To</p>
                    <Select value={selectedTask.assignedTo || "none"} onValueChange={(v) => updateTaskField("assignedTo", v === "none" ? null : v)}>
                      <SelectTrigger className="h-9 text-sm" data-testid="select-detail-assignee">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Due date */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Due Date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-sm h-9 font-normal" data-testid="button-detail-date-picker">
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                          {selectedTask.dueDate ? format(new Date(selectedTask.dueDate), "PPP") : "No due date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedTask.dueDate ? new Date(selectedTask.dueDate) : undefined}
                          onSelect={(d) => updateTaskField("dueDate", d ?? null)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Related entities */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Related</p>
                    <div className="space-y-2">
                      <Select value={selectedTask.relatedLeadId?.toString() || "none"} onValueChange={(v) => updateTaskField("relatedLeadId", v === "none" ? null : parseInt(v))}>
                        <SelectTrigger className="h-9 text-sm" data-testid="select-detail-lead">
                          <SelectValue placeholder="Lead" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Lead</SelectItem>
                          {leads.map((l) => <SelectItem key={l.id} value={l.id.toString()}>{l.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={selectedTask.relatedClientId?.toString() || "none"} onValueChange={(v) => updateTaskField("relatedClientId", v === "none" ? null : parseInt(v))}>
                        <SelectTrigger className="h-9 text-sm" data-testid="select-detail-client">
                          <SelectValue placeholder="Company" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Company</SelectItem>
                          {clients.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={selectedTask.relatedContactId?.toString() || "none"} onValueChange={(v) => updateTaskField("relatedContactId", v === "none" ? null : parseInt(v))}>
                        <SelectTrigger className="h-9 text-sm" data-testid="select-detail-contact">
                          <SelectValue placeholder="Contact" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Contact</SelectItem>
                          {allContacts.map((c) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}{c.title ? ` – ${c.title}` : ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Links */}
                  {(relatedLead || relatedClient || relatedContact) && (
                    <div className="space-y-1.5 rounded-lg bg-muted/50 border border-border/50 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Quick Links</p>
                      {relatedLead && (
                        <Link href="/leads" className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Lead: {relatedLead.title}
                        </Link>
                      )}
                      {relatedClient && (
                        <Link href={`/customers/${relatedClient.id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <UserIcon className="h-3.5 w-3.5" />
                          {relatedClient.name}
                        </Link>
                      )}
                      {relatedContact && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <UserIcon className="h-3.5 w-3.5 opacity-60" />
                          {relatedContact.name}{relatedContact.title ? ` – ${relatedContact.title}` : ""}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delete */}
                  <div className="pt-2 border-t border-border/50">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => deleteMutation.mutate(selectedTask.id)}
                      disabled={deleteMutation.isPending}
                      data-testid="button-delete-task"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Task
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
