import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Start typing an address...",
  className,
  "data-testid": testId,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 4) { setResults([]); setIsOpen(false); return; }
    setIsLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1&countrycodes=us`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setIsOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 400);
  };

  const handleSelect = (result: NominatimResult) => {
    setQuery(result.display_name);
    onChange(result.display_name, parseFloat(result.lat), parseFloat(result.lon));
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={className}
          data-testid={testId}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-md shadow-lg overflow-hidden">
          {results.map(r => (
            <button
              key={r.place_id}
              type="button"
              className="flex items-start gap-2 w-full px-3 py-2.5 text-left hover:bg-muted transition-colors text-sm border-b border-border/50 last:border-0"
              onClick={() => handleSelect(r)}
              data-testid={`address-option-${r.place_id}`}
            >
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="line-clamp-2 leading-snug">{r.display_name}</span>
            </button>
          ))}
          <div className="px-3 py-1.5 bg-muted/30 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground">Powered by OpenStreetMap</p>
          </div>
        </div>
      )}
    </div>
  );
}
