import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddressLinkProps {
  address: string;
  className?: string;
  iconClassName?: string;
  showIcon?: boolean;
}

export function AddressLink({ address, className, iconClassName, showIcon = false }: AddressLinkProps) {
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noreferrer"
      className={cn("hover:underline hover:text-primary transition-colors inline-flex items-center gap-1", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {showIcon && <MapPin className={cn("h-3 w-3 shrink-0", iconClassName)} />}
      {address}
    </a>
  );
}
