import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Task, Lead, Client, User, InsertTask, insertTaskSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  Circle, 
  MoreVertical, 
  Filter,
  User as UserIcon,
  Tag,
  AlertCircle
} from "lucide-react";
import { format, isAfter, isBefore, startOfDay, endOfDay, addDays } from "date-fns";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

const priorityColors = {
  low: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

const statusIcons = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

export default function TasksPage() {
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  const addForm = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      assignedTo: undefined,
      relatedLeadId: undefined,
      relatedClientId: undefined,
      dueDate: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsAddOpen(false);
      addForm.reset();
      toast({ title: "Task created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertTask> }) => {
      const res = await apiRequest("PUT", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setSelectedTask(null);
      toast({ title: "Task updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setSelectedTask(null);
      toast({ title: "Task deleted successfully" });
    },
  });

  const toggleStatus = (task: Task) => {
    const nextStatus: Record<string, "todo" | "in_progress" | "done"> = {
      todo: "in_progress",
      in_progress: "done",
      done: "todo",
    };
    updateMutation.mutate({ 
      id: task.id, 
      data: { status: nextStatus[task.status] } 
    });
  };

  if (isLoadingTasks) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Task Management</h1>
          <p className="text-muted-foreground mt-1">Track and manage your operations and team tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={isAddOpen} onOpenChange={setIsAddOpen}>
            <SheetTrigger asChild>
              <Button className="font-medium" data-testid="button-add-task">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Create New Task</SheetTitle>
                <SheetDescription>Fill in the details for the new operational task.</SheetDescription>
              </SheetHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6 py-6">
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
                            placeholder="Describe the task..." 
                            className="min-h-[100px] resize-none" 
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
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-task-priority">
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="assignedTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned To</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-task-assignee">
                                <SelectValue placeholder="Assign user" />
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
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="relatedLeadId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Lead</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(val === "none" ? undefined : parseInt(val))} 
                            value={field.value?.toString() || "none"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-task-lead">
                                <SelectValue placeholder="Select lead" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {leads.map(l => (
                                <SelectItem key={l.id} value={l.id.toString()}>{l.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={addForm.control}
                      name="relatedClientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Client</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(val === "none" ? undefined : parseInt(val))} 
                            value={field.value?.toString() || "none"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-task-client">
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {clients.map(c => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={addForm.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Due Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="button-task-date-picker"
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <SheetFooter>
                    <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-task">
                      {createMutation.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </SheetFooter>
                </form>
              </Form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-muted/30">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search tasks..." 
              className="pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-task-search"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
                <Filter className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="todo">Todo</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-priority">
                <Tag className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-heading font-semibold">No tasks found</h3>
          <p className="text-muted-foreground mt-2 max-w-xs">
            Try adjusting your filters or search query, or create a new task to get started.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => {
            setSearchQuery("");
            setStatusFilter("all");
            setPriorityFilter("all");
          }} data-testid="button-clear-filters">
            Clear all filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => {
            const StatusIcon = statusIcons[task.status as keyof typeof statusIcons];
            const assignedUser = users.find(u => u.id === task.assignedTo);
            const relatedLead = leads.find(l => l.id === task.relatedLeadId);
            const relatedClient = clients.find(c => c.id === task.relatedClientId);
            const isOverdue = task.dueDate && isBefore(new Date(task.dueDate), startOfDay(new Date())) && task.status !== "done";

            return (
              <Card 
                key={task.id} 
                className={cn(
                  "hover-elevate cursor-pointer transition-all border-l-4",
                  task.status === "done" ? "opacity-70 border-l-slate-400" : 
                  task.priority === "high" ? "border-l-red-500 shadow-red-500/5" :
                  task.priority === "medium" ? "border-l-yellow-500 shadow-yellow-500/5" :
                  "border-l-blue-500 shadow-blue-500/5"
                )}
                onClick={() => setSelectedTask(task)}
                data-testid={`card-task-${task.id}`}
              >
                <CardHeader className="p-5 pb-2">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] uppercase font-bold", priorityColors[task.priority as keyof typeof priorityColors])}>
                      {task.priority}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 -mt-1 -mr-1" 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatus(task);
                      }}
                      data-testid={`button-toggle-status-${task.id}`}
                    >
                      <StatusIcon className={cn("h-5 w-5", task.status === "done" ? "text-green-500" : "text-muted-foreground")} />
                    </Button>
                  </div>
                  <CardTitle className={cn("text-lg mt-2 line-clamp-1", task.status === "done" && "line-through")}>
                    {task.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-2">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {task.description || "No description provided."}
                  </p>
                  
                  <div className="flex flex-col gap-2 mt-4">
                    {relatedLead && (
                      <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                        <AlertCircle className="h-3 w-3" />
                        <span>Lead: {relatedLead.title}</span>
                      </div>
                    )}
                    {relatedClient && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserIcon className="h-3 w-3" />
                        <span>Client: {relatedClient.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                    <div className={cn(
                      "flex items-center gap-1.5 text-xs font-medium",
                      isOverdue ? "text-red-500" : "text-muted-foreground"
                    )}>
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date"}
                    </div>
                    {assignedUser ? (
                      <Avatar className="h-7 w-7 border border-background shadow-sm">
                        <AvatarImage src={assignedUser.profileImageUrl || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                          {assignedUser.firstName?.[0]}{assignedUser.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                        <UserIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Detail Sheet */}
      <Sheet open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedTask && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] uppercase font-bold", priorityColors[selectedTask.priority as keyof typeof priorityColors])}>
                    {selectedTask.priority}
                  </Badge>
                  <Select 
                    defaultValue={selectedTask.status} 
                    onValueChange={(val) => updateMutation.mutate({ 
                      id: selectedTask.id, 
                      data: { status: val as any } 
                    })}
                  >
                    <SelectTrigger className="w-[130px] h-8 text-xs font-bold uppercase" data-testid="select-task-detail-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Todo</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <SheetTitle className="text-2xl font-bold mt-4">{selectedTask.title}</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6 py-8">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Description</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedTask.description || "No description provided."}</p>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</h4>
                    <div className="flex items-center gap-2">
                      {users.find(u => u.id === selectedTask.assignedTo) ? (
                        <>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={users.find(u => u.id === selectedTask.assignedTo)?.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {users.find(u => u.id === selectedTask.assignedTo)?.firstName?.[0]}
                              {users.find(u => u.id === selectedTask.assignedTo)?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {users.find(u => u.id === selectedTask.assignedTo)?.firstName} {users.find(u => u.id === selectedTask.assignedTo)?.lastName}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Unassigned</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Due Date</h4>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {selectedTask.dueDate ? format(new Date(selectedTask.dueDate), "PPP") : "No due date"}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Relationships</h4>
                  {selectedTask.relatedLeadId && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Linked Lead</p>
                          <p className="text-sm font-semibold">{leads.find(l => l.id === selectedTask.relatedLeadId)?.title}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/leads`}>View</Link>
                      </Button>
                    </div>
                  )}
                  {selectedTask.relatedClientId && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Linked Client</p>
                          <p className="text-sm font-semibold">{clients.find(c => c.id === selectedTask.relatedClientId)?.name}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/clients`}>View</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <SheetFooter className="mt-8 pt-6 border-t flex flex-row gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 text-destructive hover:bg-destructive hover:text-white"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this task?")) {
                      deleteMutation.mutate(selectedTask.id);
                    }
                  }}
                  data-testid="button-delete-task"
                >
                  Delete Task
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    // This could open another sheet for editing or just close
                    setSelectedTask(null);
                  }}
                  data-testid="button-close-task-detail"
                >
                  Close
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
