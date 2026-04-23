import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, User as UserIcon, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const profileSetupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().optional(),
});

type ProfileSetupFormValues = z.infer<typeof profileSetupSchema>;

export function ProfileSetupModal() {
  const { toast } = useToast();

  const form = useForm<ProfileSetupFormValues>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  const setupMutation = useMutation({
    mutationFn: async (values: ProfileSetupFormValues) => {
      const res = await apiRequest("PATCH", "/api/users/me", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm"
      data-testid="profile-setup-modal"
    >
      <div className="w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-primary/5 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-full">
              <UserIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-foreground">
                Complete Your Profile
              </h2>
              <p className="text-sm text-muted-foreground">
                Just a few details before you get started
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => setupMutation.mutate(values))}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <UserIcon className="h-3 w-3" />
                        First Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Jane"
                          autoFocus
                          data-testid="input-setup-first-name"
                        />
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
                      <FormLabel className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <UserIcon className="h-3 w-3" />
                        Last Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Smith"
                          data-testid="input-setup-last-name"
                        />
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
                    <FormLabel className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      Phone Number{" "}
                      <span className="text-muted-foreground/60 font-normal">
                        (optional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="(555) 555-5555"
                        data-testid="input-setup-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={setupMutation.isPending}
                  data-testid="button-setup-submit"
                >
                  {setupMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Get Started
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
