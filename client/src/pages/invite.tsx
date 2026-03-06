import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiReplit } from "react-icons/si";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full access — manage all data and team members",
  manager: "Can view all data across the team",
  member: "Access to your own assigned leads, tasks, and customers",
};

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [consumed, setConsumed] = useState(false);

  const { data: invite, isLoading, error } = useQuery<{ email: string; role: string; roleDisplayName: string }>({
    queryKey: ["/api/invite", token],
    queryFn: async () => {
      const res = await fetch(`/api/invite/${token}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Invalid invite");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const consumeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/invite/consume", { token });
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      setConsumed(true);
      toast({ title: "Welcome to M5 Services CRM!", description: "Your account is set up and ready." });
      setTimeout(() => setLocation("/"), 1800);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Could not accept invite", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!authLoading && user && invite && !consumed && !consumeMutation.isPending && !consumeMutation.isSuccess) {
      consumeMutation.mutate();
    }
  }, [authLoading, user, invite, consumed]);

  const handleAccept = () => {
    localStorage.setItem("pendingInviteToken", token!);
    window.location.href = "/api/login";
  };

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invite) {
    const message = (error as Error)?.message || "This invite link is invalid or has expired.";
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex justify-center">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-xl">Invite Unavailable</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Contact your administrator for a new invite link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (consumed || consumeMutation.isSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-xl">You're all set!</CardTitle>
            <CardDescription>Redirecting you to the dashboard...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (user && consumeMutation.isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <CardTitle className="text-xl">Setting up your account...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-primary/10">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="flex justify-center mb-1">
            <img src="/logo.webp" alt="M5 Services" className="h-14 w-auto" />
          </div>
          <CardTitle className="text-2xl font-heading font-bold">You've Been Invited</CardTitle>
          <CardDescription>
            Join the <span className="font-semibold text-foreground">M5 Services CRM</span> team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide font-medium mb-0.5">Invited Email</p>
                <p className="font-semibold">{invite.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide font-medium mb-0.5">Your Role</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-semibold">{invite.roleDisplayName}</Badge>
                  {DEFAULT_ROLE_DESCRIPTIONS[invite.role] && (
                    <span className="text-muted-foreground text-xs">{DEFAULT_ROLE_DESCRIPTIONS[invite.role]}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button className="w-full h-11 text-base font-medium" onClick={handleAccept} data-testid="button-accept-invite">
            <SiReplit className="mr-2 h-5 w-5" />
            Accept Invite &amp; Sign In
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You'll be asked to sign in with Google, GitHub, or email.
            <br />No Replit experience needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
