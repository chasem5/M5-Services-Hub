import { useState, useRef } from "react";
import { Camera, Upload, Loader2, RefreshCw, UserPlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client } from "@shared/schema";

interface ScannedFields {
  name: string | null;
  title: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  linkedinUrl: string | null;
  notes: string | null;
}

interface CardScannerDialogProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
}

type Step = "capture" | "scanning" | "review" | "saving";

export function CardScannerDialog({ open, onClose, clients }: CardScannerDialogProps) {
  const { toast } = useToast();
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("capture");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [fields, setFields] = useState<ScannedFields>({
    name: null, title: null, email: null, phone: null, company: null, linkedinUrl: null, notes: null,
  });
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  function reset() {
    setStep("capture");
    setImagePreview(null);
    setImageBase64(null);
    setFields({ name: null, title: null, email: null, phone: null, company: null, linkedinUrl: null, notes: null });
    setSelectedClientId("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function loadFile(file: File) {
    setImageMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  async function scan() {
    if (!imageBase64) return;
    setStep("scanning");
    try {
      const result = await apiRequest("POST", "/api/contacts/scan-image", {
        imageBase64,
        mimeType: imageMime,
      });
      const data: ScannedFields = await result.json();
      setFields(data);
      if (data.company) {
        const match = clients.find(c => c.name.toLowerCase().includes((data.company || "").toLowerCase()));
        if (match) setSelectedClientId(String(match.id));
      }
      setStep("review");
    } catch (e: any) {
      toast({ title: "Scan failed", description: e.message || "Could not extract contact info", variant: "destructive" });
      setStep("capture");
    }
  }

  async function save() {
    if (!selectedClientId) {
      toast({ title: "Select a company", description: "Please assign this contact to a company", variant: "destructive" });
      return;
    }
    if (!fields.name) {
      toast({ title: "Name required", description: "Please enter a contact name", variant: "destructive" });
      return;
    }
    setStep("saving");
    try {
      await apiRequest("POST", `/api/clients/${selectedClientId}/contacts`, {
        name: fields.name,
        title: fields.title || null,
        email: fields.email || null,
        phone: fields.phone || null,
        linkedinUrl: fields.linkedinUrl || null,
        notes: fields.notes || null,
        isPrimary: false,
        serviceNeeds: [],
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/client-contacts"] });
      toast({ title: "Contact saved", description: `${fields.name} has been added` });
      handleClose();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message || "Could not save contact", variant: "destructive" });
      setStep("review");
    }
  }

  const clientOptions = clients.map(c => ({ value: String(c.id), label: c.name }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Scan Contact</DialogTitle>
          <DialogDescription>
            Take a photo of a business card or upload an email signature screenshot
          </DialogDescription>
        </DialogHeader>

        {step === "capture" && (
          <div className="space-y-4">
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full rounded-lg border max-h-52 object-contain bg-muted" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-7 w-7 bg-background/80"
                  onClick={() => { setImagePreview(null); setImageBase64(null); }}
                  data-testid="button-clear-image"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 p-6 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  data-testid="button-use-camera"
                >
                  <Camera className="h-8 w-8" />
                  <span className="font-medium">Take Photo</span>
                  <span className="text-xs">Use camera</span>
                </button>
                <button
                  onClick={() => uploadRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 p-6 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  data-testid="button-upload-screenshot"
                >
                  <Upload className="h-8 w-8" />
                  <span className="font-medium">Upload</span>
                  <span className="text-xs">Screenshot or file</span>
                </button>
              </div>
            )}

            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />
            <input ref={uploadRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose} data-testid="button-scanner-cancel">Cancel</Button>
              <Button onClick={scan} disabled={!imageBase64} data-testid="button-scan-extract">
                Scan & Extract
              </Button>
            </div>
          </div>
        )}

        {step === "scanning" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Scanning with AI...</p>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            {imagePreview && (
              <img src={imagePreview} alt="Scanned" className="w-full rounded-lg border max-h-36 object-contain bg-muted" />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Name</Label>
                <Input
                  value={fields.name || ""}
                  onChange={(e) => setFields(f => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  data-testid="input-scanned-name"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input
                  value={fields.title || ""}
                  onChange={(e) => setFields(f => ({ ...f, title: e.target.value }))}
                  placeholder="Job title"
                  data-testid="input-scanned-title"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  value={fields.email || ""}
                  onChange={(e) => setFields(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@company.com"
                  data-testid="input-scanned-email"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  value={fields.phone || ""}
                  onChange={(e) => setFields(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Phone number"
                  data-testid="input-scanned-phone"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Company <span className="text-destructive">*</span>
                {fields.company && <span className="ml-1 text-muted-foreground/60">(scanned: {fields.company})</span>}
              </Label>
              <SearchableSelect
                options={clientOptions}
                value={selectedClientId}
                onValueChange={setSelectedClientId}
                placeholder="Assign to company..."
                data-testid="select-scanned-company"
              />
            </div>

            <div className="flex justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={reset} data-testid="button-rescan">
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Rescan
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} data-testid="button-review-cancel">Cancel</Button>
                <Button onClick={save} disabled={!fields.name || !selectedClientId} data-testid="button-save-scanned-contact">
                  <UserPlus className="mr-1.5 h-4 w-4" />Save Contact
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "saving" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Saving contact...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
