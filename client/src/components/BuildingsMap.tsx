import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface MapEntry {
  id: number;
  name: string;
  address?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  notes?: string | null;
  contactName?: string;
  type?: "building" | "office";
}

interface BuildingsMapProps {
  buildings: MapEntry[];
  className?: string;
}

const COLORS = [
  "#BE1916", "#2563EB", "#16A34A", "#9333EA", "#EA580C",
  "#0891B2", "#D97706", "#DB2777", "#065F46", "#7C3AED",
];

const OFFICE_COLOR = "#475569";

function makePinIcon(color: string) {
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

function makeOfficeIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <rect x="2" y="2" width="24" height="24" rx="4" fill="${color}" stroke="white" stroke-width="1.5"/>
    <rect x="7" y="7" width="5" height="5" rx="1" fill="white"/>
    <rect x="16" y="7" width="5" height="5" rx="1" fill="white"/>
    <rect x="7" y="16" width="5" height="5" rx="1" fill="white"/>
    <rect x="16" y="16" width="5" height="5" rx="1" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
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

    const contactNames = [...new Set(mapped.filter(b => b.type !== "office").map(b => b.contactName ?? ""))];
    const markers: L.Marker[] = [];

    mapped.forEach(b => {
      const lat = parseFloat(String(b.lat));
      const lng = parseFloat(String(b.lng));
      if (isNaN(lat) || isNaN(lng)) return;

      let icon: L.DivIcon;
      if (b.type === "office") {
        icon = makeOfficeIcon(OFFICE_COLOR);
      } else {
        const colorIdx = contactNames.indexOf(b.contactName ?? "");
        icon = makePinIcon(COLORS[colorIdx % COLORS.length]);
      }

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 160px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="font-size:10px;padding:2px 6px;border-radius:999px;background:${b.type === "office" ? "#e2e8f0" : "#fee2e2"};color:${b.type === "office" ? "#475569" : "#991b1b"};font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">${b.type === "office" ? "Office" : "Building"}</span>
          </div>
          <p style="font-weight: 700; margin: 0 0 2px; font-size: 14px;">${b.name}</p>
          ${b.contactName && b.type !== "office" ? `<p style="font-size: 11px; color: #666; margin: 0 0 4px;">Contact: ${b.contactName}</p>` : ""}
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
        <p className="text-sm font-medium mt-2">No mapped locations yet</p>
        <p className="text-xs mt-1">Add addresses to offices and buildings to see them here</p>
      </div>
    );
  }

  return <div ref={containerRef} className={`rounded-lg overflow-hidden border border-border ${className}`} style={{ isolation: "isolate" }} />;
}
