import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Megaphone, RefreshCw } from "lucide-react";
import { RemindersDropdown } from "@/components/RemindersDropdown";
import { GlobalSearch, GlobalSearchTrigger } from "@/components/GlobalSearch";
import { QuickActionsBar } from "@/components/QuickActionsBar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

function AnnouncementsBadge() {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/announcements/unread-count"],
    refetchInterval: 60000,
  });
  const count = data?.count ?? 0;
  return (
    <Link href="/announcements">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        data-testid="button-announcements-badge"
      >
        <Megaphone className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>
    </Link>
  );
}

function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}hr ago`;
}

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());
  const [, forceUpdate] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setLastRefreshed(new Date());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const triggerRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(0);
    await queryClient.invalidateQueries({});
    setLastRefreshed(new Date());
    setTimeout(() => setIsRefreshing(false), 800);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = mainRef.current;
    if (!el || el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta <= 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    const el = mainRef.current;
    if (el && el.scrollTop > 0) {
      isPulling.current = false;
      setPullDistance(0);
      return;
    }
    const dist = Math.min(delta * 0.5, MAX_PULL);
    setPullDistance(dist);
    if (dist > 10) e.preventDefault();
  }, [isRefreshing]);

  const onTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= PULL_THRESHOLD) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, triggerRefresh]);

  useEffect(() => {
    if (!user || isLoading) return;
    const pendingToken = localStorage.getItem("pendingInviteToken");
    if (!pendingToken) return;
    localStorage.removeItem("pendingInviteToken");
    apiRequest("POST", "/api/invite/consume", { token: pendingToken })
      .then(r => r.json())
      .then(updatedUser => {
        queryClient.setQueryData(["/api/auth/user"], updatedUser);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      })
      .catch(() => {});
  }, [user, isLoading]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = "/api/login";
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider defaultOpen={false} style={style as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <header className="flex items-center justify-between px-4 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="flex items-center gap-3">
              <div className="h-6 w-px bg-border hidden" />
              <GlobalSearchTrigger onClick={() => setSearchOpen(true)} />
            </div>
            <span className="hidden sm:block text-xs text-muted-foreground/50 ml-auto mr-2 tabular-nums select-none">
              Updated {getRelativeTime(lastRefreshed)}
            </span>
            <div className="flex items-center gap-2">
              <QuickActionsBar />
              <span className="hidden md:inline-flex">
                <AnnouncementsBadge />
              </span>
              <RemindersDropdown />
            </div>
          </header>
          <main
            ref={mainRef}
            className="flex-1 overflow-y-auto relative"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Pull-to-refresh indicator */}
            {(pullDistance > 0 || isRefreshing) && (
              <div
                className="absolute left-0 right-0 flex justify-center z-50 pointer-events-none"
                style={{
                  top: isRefreshing ? 12 : Math.max(pullDistance - 36, -36),
                  transition: isRefreshing ? "top 0.2s ease" : undefined,
                }}
              >
                <div className="flex items-center gap-2 bg-background border border-border shadow-md rounded-full px-3 py-1.5">
                  <RefreshCw
                    className="h-4 w-4 text-primary"
                    style={{
                      animation: isRefreshing ? "spin 0.7s linear infinite" : undefined,
                      transform: isRefreshing ? undefined : `rotate(${(pullDistance / PULL_THRESHOLD) * 180}deg)`,
                    }}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {isRefreshing ? "Refreshing…" : pullDistance >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}
                  </span>
                </div>
              </div>
            )}
            <div
              style={{
                transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
                transition: pullDistance === 0 ? "transform 0.25s ease" : undefined,
              }}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}
