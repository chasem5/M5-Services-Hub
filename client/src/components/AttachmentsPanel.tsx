import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Attachment,
} from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  File, 
  Image as ImageIcon, 
  FileText, 
  Trash2, 
  Upload, 
  Camera, 
  Loader2,
  Paperclip,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface AttachmentsPanelProps {
  entityType: "lead" | "client" | "meeting" | "task";
  entityId: number;
}

export function AttachmentsPanel({ entityType, entityId }: AttachmentsPanelProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ["/api/attachments", entityType, entityId],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      formData.append("entityId", entityId.toString());

      const response = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attachments", entityType, entityId] });
      toast({ title: "File uploaded successfully" });
      setUploadProgress(0);
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadProgress(0);
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/attachments/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attachments", entityType, entityId] });
      toast({ title: "Attachment deleted" });
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setUploadProgress(10);
      // Simulate progress since fetch doesn't support it natively without XHR
      const interval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 500);
      
      try {
        await uploadMutation.mutateAsync(file);
      } finally {
        clearInterval(interval);
      }
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type.includes("pdf")) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Attachments
        </h3>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
          />
          <input
            type="file"
            ref={cameraInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
          />
          
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-1.5"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            data-testid="button-take-photo"
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Take Photo</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            data-testid="button-upload-file"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload File</span>
          </Button>
        </div>
      </div>

      {isUploading && (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading...
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-1" />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-12 w-full bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : attachments.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="p-6 flex flex-col items-center justify-center text-muted-foreground">
            <Paperclip className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-xs">No attachments yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {attachments.map((file) => (
            <div 
              key={file.id} 
              className="group flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
              data-testid={`attachment-item-${file.id}`}
            >
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                {file.fileType.startsWith("image/") ? (
                  <img 
                    src={file.objectKey} 
                    alt={file.fileName} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getFileIcon(file.fileType)
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={file.fileName}>
                  {file.fileName}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatSize(file.fileSize)} · {new Date(file.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  asChild
                  data-testid={`button-view-attachment-${file.id}`}
                >
                  <a href={file.objectKey} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => deleteMutation.mutate(file.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-attachment-${file.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
