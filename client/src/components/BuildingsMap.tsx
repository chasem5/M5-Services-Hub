import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface Building {
  id: number;
  name: string;
  address?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  notes?: string | null;
  contactName?: string;
}

interface BuildingsMapProps {
  buildings: Building[];
  className?: string;
}

const COLORS = [
  "#BE1916", "#2563EB", "#16A34A", "#9333EA", "#EA580C",
  "#0891B2", "#D97706", "#DB2777", "#065F46", "#7C3AED",
];

function makeIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

export function BuildingsMap({ buildings, className = "" }: BuildingsMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mapped = buildings.filter(b => b.lat != null && b.lng != null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (mapped.length === 0) {
      map.setView([37.7749, -122.4194], 10);
      return;
    }

    const contactNames = [...new Set(mapped.map(b => b.contactName ?? ""))];
    const markers: L.Marker[] = [];

    mapped.forEach(b => {
      const lat = parseFloat(String(b.lat));
      const lng = parseFloat(String(b.lng));
      if (isNaN(lat) || isNaN(lng)) return;

      const colorIdx = contactNames.indexOf(b.contactName ?? "");
      const color = COLORS[colorIdx % COLORS.length];
      const icon = makeIcon(color);

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 160px;">
          <p style="font-weight: 700; margin: 0 0 2px; font-size: 14px;">${b.name}</p>
          ${b.contactName ? `<p style="font-size: 11px; color: #666; margin: 0 0 4px;">Contact: ${b.contactName}</p>` : ""}
          ${b.address ? `<p style="font-size: 12px; color: #444; margin: 0 0 4px;">${b.address}</p>` : ""}
          ${b.notes ? `<p style="font-size: 11px; color: #666; font-style: italic; margin: 0;">${b.notes}</p>` : ""}
        </div>
      `);
      markers.push(marker);
    });

    if (markers.length === 1) {
      const lat = parseFloat(String(mapped[0].lat));
      const lng = parseFloat(String(mapped[0].lng));
      map.setView([lat, lng], 15);
    } else if (markers.length > 1) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [JSON.stringify(mapped)]);

  if (mapped.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground ${className}`}>
        <p className="text-sm font-medium mt-2">No mapped buildings yet</p>
        <p className="text-xs mt-1">Add building addresses to see them on the map</p>
      </div>
    );
  }

  return <div ref={containerRef} className={`rounded-lg overflow-hidden border border-border ${className}`} />;
}
