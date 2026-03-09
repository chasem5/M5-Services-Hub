import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User as UserIcon, Shield, Mail, CheckCircle2, AlertCircle, Loader2, Unlink, CalendarDays, Bell, BellOff, Phone, Camera, LogOut } from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  profileImageUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface CalendarStatus {
  connected: boolean;
  calendarEmail: string | null;
}

interface GmailStatus {
  connected: boolean;
  gmailEmail: string | null;
}

export default function Settings() {
  const { user: currentUser, logout } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: currentUser?.firstName || "",
      lastName: currentUser?.lastName || "",
      phone: currentUser?.phone || "",
      profileImageUrl: currentUser?.profileImageUrl || "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const res = await apiRequest("PATCH", "/api/users/me", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated", description: "Your personal information has been successfully updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" });
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload avatar");
      }
      return res.json();
    },
    onSuccess: (data) => {
      form.setValue("profileImageUrl", data.url);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Avatar uploaded", description: "Your profile picture has been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to upload avatar", description: error.message, variant: "destructive" });
    },
  });

  const { data: gmailStatus, isLoading: gmailLoading } = useQuery<GmailStatus>({
    queryKey: ["/api/auth/gmail/status"],
    enabled: !!currentUser,
  });

  const { data: calendarStatus, isLoading: calendarLoading } = useQuery<CalendarStatus>({
    queryKey: ["/api/auth/calendar/status"],
    enabled: !!currentUser,
  });

  const [notificationPermission, setNotificationPermission] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push notifications not supported");
      }
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") {
        throw new Error("Permission not granted");
      }
      const registration = await navigator.serviceWorker.ready;
      const res = await apiRequest("GET", "/api/push/vapid-public-key", undefined);
      const { publicKey } = await res.json();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      await apiRequest("POST", "/api/push/subscribe", subscription);
    },
    onSuccess: () => {
      setIsSubscribed(true);
      toast({ title: "Notifications enabled", description: "You will now receive push notifications." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to enable notifications", description: error.message, variant: "destructive" });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await apiRequest("DELETE", "/api/push/unsubscribe", { endpoint: subscription.endpoint });
        await subscription.unsubscribe();
      }
    },
    onSuccess: () => {
      setIsSubscribed(false);
      toast({ title: "Notifications disabled" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to disable notifications", description: error.message, variant: "destructive" });
    },
  });

  const disconnectGmailMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/auth/gmail/disconnect", undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/gmail/status"] });
      toast({ title: "Gmail disconnected" });
    },
    onError: () => toast({ title: "Failed to disconnect Gmail", variant: "destructive" }),
  });

  const disconnectCalendarMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/auth/calendar/disconnect", undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/calendar/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      toast({ title: "Google Calendar disconnected" });
    },
    onError: () => toast({ title: "Failed to disconnect Calendar", variant: "destructive" }),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get("gmail");
    const calendarParam = params.get("calendar");
    if (gmailParam === "connected") {
      toast({ title: "Gmail connected successfully", description: "Your inbox is ready to sync." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/gmail/status"] });
      window.history.replaceState({}, "", "/settings");
    } else if (gmailParam === "error") {
      toast({ title: "Gmail connection failed", description: "Please try again.", variant: "destructive" });
      window.history.replaceState({}, "", "/settings");
    }
    if (calendarParam === "connected") {
      toast({ title: "Google Calendar connected", description: "You can now sync meetings to your calendar." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/calendar/status"] });
      window.history.replaceState({}, "", "/settings");
    } else if (calendarParam === "error") {
      toast({ title: "Calendar connection failed", description: "Please try again.", variant: "destructive" });
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const handleConnectGmail = async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/gmail/connect", undefined);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Could not start Gmail connection", description: data.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Gmail connection error", description: err.message, variant: "destructive" });
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/calendar/connect", undefined);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Could not start Calendar connection", description: data.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Calendar connection error", description: err.message, variant: "destructive" });
    }
  };

  if (!currentUser) return null;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-heading font-bold text-primary tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your personal account preferences.</p>
      </div>

      <div className="grid gap-8">
        {/* Profile Card */}
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit((values) => updateProfileMutation.mutate(values))} className="space-y-6">
                <div className="flex flex-col md:flex-row items-start gap-8">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20">
                      <AvatarImage src={form.watch("profileImageUrl") || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                        {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => document.getElementById("avatar-upload")?.click()}
                        disabled={uploadAvatarMutation.isPending}
                        data-testid="button-upload-avatar"
                      >
                        {uploadAvatarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        Upload Photo
                      </Button>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadAvatarMutation.mutate(file);
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 flex-1 w-full max-w-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <UserIcon className="h-3 w-3" /> First Name
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your first name" data-testid="input-first-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                              <UserIcon className="h-3 w-3" /> Last Name
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter your last name" data-testid="input-last-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3 w-3" /> Phone Number
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter your phone number" data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="profileImageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Camera className="h-3 w-3" /> Profile Picture URL
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter image URL" data-testid="input-profile-image-url" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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

                    <div className="pt-4 flex items-center gap-3">
                      <Button
                        type="submit"
                        className="w-full md:w-auto px-8"
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Changes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                        onClick={() => logout()}
                        data-testid="button-sign-out"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Gmail Connection Card */}
        <Card className="shadow-sm border-2 border-primary/5 overflow-hidden">
          <CardHeader className="bg-muted/30 pb-6 border-b">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">Gmail Connection</CardTitle>
                <CardDescription>Connect your Gmail to sync emails and receive AI follow-up reminders</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {gmailLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Checking connection...</span>
              </div>
            ) : gmailStatus?.connected ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Connected</p>
                    <p className="text-sm text-muted-foreground">{gmailStatus.gmailEmail}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                  onClick={() => disconnectGmailMutation.mutate()}
                  disabled={disconnectGmailMutation.isPending}
                  data-testid="button-disconnect-gmail"
                >
                  <Unlink className="h-4 w-4" />
                  {disconnectGmailMutation.isPending ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Not connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your Gmail to sync emails, match client communications, and get AI-powered follow-up reminders when clients haven't heard back in 2 days.
                    </p>
                  </div>
                </div>
                <Button
                  className="gap-2 bg-primary hover:bg-primary/90 text-white shrink-0"
                  onClick={handleConnectGmail}
                  data-testid="button-connect-gmail"
                >
                  <Mail className="h-4 w-4" />
                  Connect Gmail
                </Button>
              </div>
            )}
            {!gmailStatus?.connected && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  <strong>One-time setup required:</strong> Your admin needs to configure Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) in the app settings before Gmail connections will work.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Calendar Connection Card */}
        <Card className="shadow-sm border-2 border-primary/5 overflow-hidden">
          <CardHeader className="bg-muted/30 pb-6 border-b">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">Google Calendar</CardTitle>
                <CardDescription>Connect your Google Calendar to sync meetings and view upcoming events</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {calendarLoading ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Checking connection...</span>
              </div>
            ) : calendarStatus?.connected ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Connected</p>
                    <p className="text-sm text-muted-foreground">{calendarStatus.calendarEmail}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                  onClick={() => disconnectCalendarMutation.mutate()}
                  disabled={disconnectCalendarMutation.isPending}
                  data-testid="button-disconnect-calendar"
                >
                  <Unlink className="h-4 w-4" />
                  {disconnectCalendarMutation.isPending ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Not connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your Google Calendar to sync meeting notes directly as calendar events and view upcoming events in the Meetings page.
                    </p>
                  </div>
                </div>
                <Button
                  className="gap-2 bg-primary hover:bg-primary/90 text-white shrink-0"
                  onClick={handleConnectCalendar}
                  data-testid="button-connect-calendar"
                >
                  <CalendarDays className="h-4 w-4" />
                  Connect Calendar
                </Button>
              </div>
            )}
            {!calendarStatus?.connected && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">
                  <strong>Setup note:</strong> Before connecting, add <code className="bg-blue-100 px-1 rounded">https://M5App.replit.app/api/auth/calendar/callback</code> as an authorized redirect URI in your Google Cloud Console OAuth app.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Push Notifications Card */}
        <Card className="shadow-sm border-2 border-primary/5 overflow-hidden">
          <CardHeader className="bg-muted/30 pb-6 border-b">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-2 rounded-full">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">Push Notifications</CardTitle>
                <CardDescription>Receive real-time alerts for new leads, tasks, and announcements</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${isSubscribed ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {isSubscribed ? <Bell className="h-5 w-5 text-green-600" /> : <BellOff className="h-5 w-5 text-gray-400" />}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{isSubscribed ? "Enabled" : "Disabled"}</p>
                  <p className="text-sm text-muted-foreground">
                    {notificationPermission === 'denied'
                      ? "Notifications are blocked by your browser. Please enable them in your browser settings."
                      : isSubscribed
                        ? "You are currently receiving push notifications on this device."
                        : "Enable notifications to stay updated on leads assigned to you and team announcements."}
                  </p>
                </div>
              </div>
              <Button
                variant={isSubscribed ? "outline" : "default"}
                className="gap-2 shrink-0"
                onClick={() => isSubscribed ? unsubscribeMutation.mutate() : subscribeMutation.mutate()}
                disabled={subscribeMutation.isPending || unsubscribeMutation.isPending || notificationPermission === 'denied'}
                data-testid="button-toggle-notifications"
              >
                {isSubscribed ? (
                  <>
                    <BellOff className="h-4 w-4" />
                    Disable Notifications
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" />
                    Enable Notifications
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
