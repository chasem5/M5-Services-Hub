import { 
  LayoutDashboard, 
  Target, 
  Users, 
  CheckSquare, 
  FileText, 
  BookOpen, 
  ClipboardList, 
  Settings,
  LogOut,
  Mic,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/" },
  { title: "Leads", icon: Target, url: "/leads" },
  { title: "Customers", icon: Users, url: "/customers" },
  { title: "Tasks", icon: CheckSquare, url: "/tasks" },
  { title: "Meetings", icon: Mic, url: "/meetings" },
  { title: "Estimates", icon: FileText, url: "/estimates" },
  { title: "Service Catalog", icon: BookOpen, url: "/service-catalog" },
  { title: "Proposals", icon: ClipboardList, url: "/proposals" },
  { title: "Settings", icon: Settings, url: "/settings" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 px-2 overflow-hidden">
          <img src="/logo.webp" alt="M5 Logo" className="h-8 w-8 min-w-8 object-contain" />
          <span className="font-heading font-bold text-lg truncate group-data-[collapsible=icon]:hidden">
            M5 Services
          </span>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.title}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                        <item.icon className={isActive ? "text-primary" : ""} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3 px-2 group-data-[collapsible=icon]:px-0">
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-muted-foreground truncate uppercase tracking-wider font-medium">
              {user?.role}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => logout()}
            className="text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:hidden"
            data-testid="button-logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
