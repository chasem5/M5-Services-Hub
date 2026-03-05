import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface PagePlaceholderProps {
  title: string;
}

export default function PagePlaceholder({ title }: PagePlaceholderProps) {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-bold tracking-tight" data-testid={`text-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>{title}</h1>
      </div>
      
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The {title} functionality is currently under development. Please check back later.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
             {[1, 2, 3].map((i) => (
               <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
             ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
