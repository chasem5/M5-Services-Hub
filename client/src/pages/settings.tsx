import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { User as UserIcon, Shield, Settings2, Mail } from "lucide-react";

export default function Settings() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: currentUser?.role === "admin",
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PUT", `/api/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Role updated",
        description: "User role has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!currentUser) return null;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold text-primary tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and team preferences.</p>
      </div>

      <div className="grid gap-8">
        <Card className="shadow-sm border-2 border-primary/5 overflow-hidden">
          <CardHeader className="bg-muted/30 pb-6 border-b">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <UserIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">My Profile</CardTitle>
                <CardDescription>Your personal account information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20">
                <AvatarImage src={currentUser.profileImageUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="grid gap-4 flex-1 w-full max-w-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <UserIcon className="h-3 w-3" /> First Name
                    </label>
                    <p className="text-lg font-semibold">{currentUser.firstName || "N/A"}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <UserIcon className="h-3 w-3" /> Last Name
                    </label>
                    <p className="text-lg font-semibold">{currentUser.lastName || "N/A"}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Mail className="h-3 w-3" /> Email Address
                  </label>
                  <p className="text-lg font-semibold">{currentUser.email || "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Shield className="h-3 w-3" /> System Role
                  </label>
                  <div className="pt-1">
                    <Badge variant="outline" className="capitalize px-3 py-1 bg-primary/5 border-primary/20 text-primary font-bold">
                      {currentUser.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {currentUser.role === "admin" && (
          <Card className="shadow-sm border-2 border-primary/5 overflow-hidden">
            <CardHeader className="bg-muted/30 pb-6 border-b">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Settings2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-heading">Team Management</CardTitle>
                  <CardDescription>Manage user roles and permissions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6">User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-6"><Skeleton className="h-10 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                        <TableCell className="text-right pr-6"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : users?.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border shadow-sm">
                            <AvatarImage src={user.profileImageUrl || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">
                              {user.firstName} {user.lastName}
                            </span>
                            {user.id === currentUser.id && (
                              <span className="text-[10px] text-primary font-bold uppercase tracking-widest">(You)</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={`capitalize font-bold border-0 ${
                            user.role === 'admin' 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' 
                              : user.role === 'manager'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Select
                          disabled={user.id === currentUser.id || updateRoleMutation.isPending}
                          value={user.role}
                          onValueChange={(value) =>
                            updateRoleMutation.mutate({ userId: user.id, role: value })
                          }
                        >
                          <SelectTrigger className="w-[140px] ml-auto h-9">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
