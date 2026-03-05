import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiReplit } from "react-icons/si";
import { RemindersDropdown } from "@/components/RemindersDropdown";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg border-2 border-primary/10">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center mb-2">
               <img src="/logo.webp" alt="M5 Services" className="h-16 w-auto" />
            </div>
            <CardTitle className="text-2xl font-heading font-bold">M5 Services CRM</CardTitle>
            <p className="text-muted-foreground">Sign in to manage your operations</p>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <Button 
              className="w-full h-11 text-base font-medium" 
              onClick={() => window.location.href = "/api/login"}
              data-testid="button-login"
            >
              <SiReplit className="mr-2 h-5 w-5" />
              Sign in with Replit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="flex items-center justify-between px-4 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <div className="h-6 w-px bg-border hidden md:block" />
              <h2 className="text-sm font-semibold text-muted-foreground hidden md:block">
                M5 Services Operations
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <RemindersDropdown />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto relative">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
