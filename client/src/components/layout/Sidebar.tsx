import { 
  LayoutDashboard, 
  Target, 
  Users, 
  CheckSquare, 
  FileText, 
  Mic,
  ShieldCheck,
  Mail,
  Megaphone,
  HeartPulse,
  ClipboardList,
  TrendingUp,
  BarChart2,
  FileBarChart2,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const ALL_NAV_ITEMS = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/", module: "dashboard" },
  { title: "Deals", icon: Target, url: "/leads", module: "leads" },
  { title: "Customers", icon: Users, url: "/customers", module: "customers" },
  { title: "Tasks", icon: CheckSquare, url: "/tasks", module: "tasks" },
  { title: "Meetings", icon: Mic, url: "/meetings", module: "meetings" },
  { title: "Estimates", icon: FileText, url: "/estimates", module: "estimates" },
  { title: "Email Sync", icon: Mail, url: "/email", module: "email_sync" },
  { title: "Announcements", icon: Megaphone, url: "/announcements", module: "announcements" },
];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  member: "bg-slate-100 text-slate-600 border-slate-200",
};

interface MyPermissions {
  role: string;
  displayName: string;
  permissions: Record<string, string>;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const { setOpenMobile, isMobile } = useSidebar();

  const { data: myPerms } = useQuery<MyPermissions>({
    queryKey: ["/api/my-permissions"],
    enabled: !!user,
    staleTime: 30000,
  });

  const visibleNavItems = ALL_NAV_ITEMS.filter(item => {
    if (!myPerms) return true;
    const level = myPerms.permissions[item.module];
    return level && level !== "none";
  });

  const displayName = myPerms?.displayName ?? user?.role ?? "";

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
    >
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
              {visibleNavItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url === "/estimates" && (location === "/service-catalog" || location === "/proposals"));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.title}
                      className={isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                    >
                      <Link
                        href={item.url}
                        data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <item.icon className={isActive ? "text-primary" : ""} />
                        <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location === "/admin"}
                    tooltip="Admin"
                    className={location === "/admin" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                  >
                    <Link href="/admin" data-testid="link-admin" onClick={() => isMobile && setOpenMobile(false)}>
                      <ShieldCheck className={location === "/admin" ? "text-primary" : ""} />
                      <span className="group-data-[collapsible=icon]:hidden">Team Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/reports/customer-intelligence"}
                  tooltip="Customer Intelligence"
                  className={location === "/reports/customer-intelligence" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                >
                  <Link href="/reports/customer-intelligence" data-testid="link-customer-intelligence" onClick={() => isMobile && setOpenMobile(false)}>
                    <HeartPulse className={location === "/reports/customer-intelligence" ? "text-primary" : ""} />
                    <span className="group-data-[collapsible=icon]:hidden">Customer Intel</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/reports/cohort-analysis"}
                  tooltip="Cohort Analysis"
                  className={location === "/reports/cohort-analysis" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                >
                  <Link href="/reports/cohort-analysis" data-testid="link-cohort-analysis" onClick={() => isMobile && setOpenMobile(false)}>
                    <TrendingUp className={location === "/reports/cohort-analysis" ? "text-primary" : ""} />
                    <span className="group-data-[collapsible=icon]:hidden">Cohort Analysis</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/service-agreements"}
                  tooltip="Service Agreements"
                  className={location === "/service-agreements" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                >
                  <Link href="/service-agreements" data-testid="link-service-agreements" onClick={() => isMobile && setOpenMobile(false)}>
                    <ClipboardList className={location === "/service-agreements" ? "text-primary" : ""} />
                    <span className="group-data-[collapsible=icon]:hidden">Service Agreements</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/reports/revenue-analytics"}
                  tooltip="Revenue Analytics"
                  className={location === "/reports/revenue-analytics" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                >
                  <Link href="/reports/revenue-analytics" data-testid="link-revenue-analytics" onClick={() => isMobile && setOpenMobile(false)}>
                    <TrendingUp className={location === "/reports/revenue-analytics" ? "text-primary" : ""} />
                    <span className="group-data-[collapsible=icon]:hidden">Revenue Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/reports/win-loss"}
                  tooltip="Win/Loss Analysis"
                  className={location === "/reports/win-loss" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                >
                  <Link href="/reports/win-loss" data-testid="link-win-loss" onClick={() => isMobile && setOpenMobile(false)}>
                    <BarChart2 className={location === "/reports/win-loss" ? "text-primary" : ""} />
                    <span className="group-data-[collapsible=icon]:hidden">Win / Loss</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/reports/monthly-review"}
                  tooltip="Monthly Report"
                  className={location === "/reports/monthly-review" ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                >
                  <Link href="/reports/monthly-review" data-testid="link-monthly-report" onClick={() => isMobile && setOpenMobile(false)}>
                    <FileBarChart2 className={location === "/reports/monthly-review" ? "text-primary" : ""} />
                    <span className="group-data-[collapsible=icon]:hidden">Monthly Report</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3 px-2 group-data-[collapsible=icon]:px-0">
          <Link href="/settings" data-testid="link-profile-settings" onClick={() => isMobile && setOpenMobile(false)}>
            <Avatar className="h-9 w-9 border-2 border-primary/20 cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all">
              <AvatarImage src={user?.profileImageUrl ? `/api/users/${user.id}/avatar-img` : undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                <span className="group-data-[collapsible=icon]:hidden">
                  {user?.firstName?.[0] ?? ""}{user?.lastName?.[0] ?? ""}
                </span>
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-semibold truncate">
              {(user?.firstName || user?.lastName)
                ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
                : user?.email}
            </p>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 mt-0.5 font-semibold border ${user?.role ? ROLE_BADGE[user.role] : ""}`}
            >
              {displayName.toUpperCase()}
            </Badge>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
