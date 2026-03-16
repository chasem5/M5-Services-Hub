import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { MapPin, Building, Briefcase, Info } from "lucide-react";
import type { ContactBuilding, ClientOffice, Lead, Client } from "@shared/schema";

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

interface GeocodedLocation {
  id: number;
  name: string;
  address: string | null;
  lat: string | null;
  lng: string | null;
  type: "building" | "office";
  clientId?: number;
  contactId?: number;
  contactName?: string;
  lead?: Lead;
  client?: Client;
}

function ChangeView({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

const STAGE_COLORS: Record<string, string> = {
  met_introduced: "#94a3b8", // slate
  new_lead: "#3b82f6", // blue
  in_conversation: "#6366f1", // indigo
  qualified: "#8b5cf6", // violet
  proposal_sent: "#a855f7", // purple
  won: "#10b981", // emerald
  lost: "#ef4444", // red
};

export function MapView() {
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery<GeocodedLocation[]>({
    queryKey: ["/api/map-locations"],
    queryFn: async () => {
      const [buildings, offices, leads, clients] = await Promise.all([
        fetch("/api/all-buildings").then(res => res.json()),
        fetch("/api/all-offices").then(res => res.json()),
        fetch("/api/leads").then(res => res.json()),
        fetch("/api/clients").then(res => res.json()),
      ]);

      const clientMap = new Map(clients.map((c: any) => [c.id, c]));
      const leadMap = new Map(leads.map((l: any) => [l.buildingId, l]));

      const buildingItems: GeocodedLocation[] = buildings.map((b: any) => ({
        ...b,
        type: "building" as const,
        lead: leadMap.get(b.id),
        client: clientMap.get(leadMap.get(b.id)?.clientId),
      }));

      const officeItems: GeocodedLocation[] = offices.map((o: any) => ({
        id: o.id,
        name: o.name,
        address: o.address,
        lat: o.lat,
        lng: o.lng,
        type: "office" as const,
        clientId: o.clientId,
        client: clientMap.get(o.clientId),
      }));

      return [...buildingItems, ...officeItems];
    }
  });

  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      if (stageFilter !== "all" && loc.lead?.stage !== stageFilter) return false;
      if (typeFilter !== "all" && loc.type !== typeFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          loc.name.toLowerCase().includes(query) ||
          loc.address?.toLowerCase().includes(query) ||
          loc.client?.name.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [locations, stageFilter, typeFilter, searchQuery]);

  const geocodedLocations = useMemo(() => 
    filteredLocations.filter(loc => loc.lat && loc.lng), 
    [filteredLocations]
  );
  
  const noLocationItems = useMemo(() => 
    filteredLocations.filter(loc => !loc.lat || !loc.lng),
    [filteredLocations]
  );

  const bounds = useMemo(() => {
    if (geocodedLocations.length === 0) return null;
    const latLngs = geocodedLocations.map(loc => [parseFloat(loc.lat!), parseFloat(loc.lng!)] as [number, number]);
    return L.latLngBounds(latLngs);
  }, [geocodedLocations]);

  const getMarkerIcon = (loc: GeocodedLocation) => {
    const color = loc.lead ? STAGE_COLORS[loc.lead.stage] || "#3b82f6" : "#94a3b8";
    
    return L.divIcon({
      className: "custom-div-icon",
      html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; items-center; justify-center; color: white;">
        ${loc.type === 'building' ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22"></line><line x1="15" y1="22" x2="15" y2="22"></line><line x1="12" y1="18" x2="12" y2="18"></line><line x1="12" y1="14" x2="12" y2="14"></line><line x1="12" y1="10" x2="12" y2="10"></line><line x1="12" y1="6" x2="12" y2="6"></line><line x1="8" y1="18" x2="8" y2="18"></line><line x1="8" y1="14" x2="8" y2="14"></line><line x1="8" y1="10" x2="8" y2="10"></line><line x1="8" y1="6" x2="8" y2="6"></line><line x1="16" y1="18" x2="16" y2="18"></line><line x1="16" y1="14" x2="16" y2="14"></line><line x1="16" y1="10" x2="16" y2="10"></line><line x1="16" y1="6" x2="16" y2="6"></line></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'}
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex flex-wrap items-center gap-4 p-4 border-b">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="Search buildings, clients, addresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-map-search"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-stage-filter">
            <SelectValue placeholder="Lead Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="met_introduced">Met / Introduced</SelectItem>
            <SelectItem value="new_lead">Reached Out</SelectItem>
            <SelectItem value="in_conversation">In Conversation</SelectItem>
            <SelectItem value="qualified">Ready for Proposal</SelectItem>
            <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-type-filter">
            <SelectValue placeholder="Location Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="building">Buildings</SelectItem>
            <SelectItem value="office">Offices</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 relative">
          {isLoadingLocations ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <p>Loading map data...</p>
            </div>
          ) : (
            <MapContainer
              center={[39.8283, -98.5795]}
              zoom={4}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ChangeView bounds={bounds} />
              {geocodedLocations.map((loc) => (
                <Marker
                  key={`${loc.type}-${loc.id}`}
                  position={[parseFloat(loc.lat!), parseFloat(loc.lng!)]}
                  icon={getMarkerIcon(loc)}
                >
                  <Popup>
                    <div className="p-1 min-w-[200px]">
                      <h3 className="font-bold text-sm mb-1">{loc.name}</h3>
                      {loc.client && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Briefcase className="h-3 w-3" />
                          <span>{loc.client.name}</span>
                        </div>
                      )}
                      <p className="text-xs mb-2">{loc.address}</p>
                      {loc.lead && (
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="secondary" 
                            style={{ 
                              backgroundColor: STAGE_COLORS[loc.lead.stage] + '20',
                              color: STAGE_COLORS[loc.lead.stage],
                              borderColor: STAGE_COLORS[loc.lead.stage] + '40'
                            }}
                            className="text-[10px] px-1.5 h-4"
                          >
                            {loc.lead.stage.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-xs font-medium truncate flex-1">{loc.lead.title}</span>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2 pt-2 border-t">
                        {loc.client && (
                          <Link href={`/customers/${loc.client.id}`}>
                            <a className="text-xs text-primary hover:underline">View Client</a>
                          </Link>
                        )}
                        {loc.lead && (
                          <Link href="/leads">
                            <a className="text-xs text-primary hover:underline">View Lead</a>
                          </Link>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </main>

        <aside className="w-80 border-l bg-muted/10 overflow-y-auto hidden md:block">
          <div className="p-4 border-b bg-background sticky top-0 z-10">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locations ({filteredLocations.length})
            </h2>
          </div>
          <div className="p-2 space-y-2">
            {noLocationItems.length > 0 && (
              <div className="px-2 py-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">No coordinates</span>
              </div>
            )}
            {noLocationItems.map(loc => (
              <Card key={`${loc.type}-${loc.id}`} className="shadow-none border-dashed bg-transparent">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    {loc.type === 'building' ? <Building className="h-4 w-4 mt-0.5 text-muted-foreground" /> : <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{loc.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{loc.address || "No address"}</p>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded w-fit">
                        <Info className="h-2.5 w-2.5" />
                        Missing coordinates
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {geocodedLocations.length > 0 && (
              <div className="px-2 py-1 mt-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">On Map</span>
              </div>
            )}
            {geocodedLocations.map(loc => (
              <Card key={`${loc.type}-${loc.id}`} className="hover-elevate cursor-pointer">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    {loc.type === 'building' ? <Building className="h-4 w-4 mt-0.5 text-primary" /> : <MapPin className="h-4 w-4 mt-0.5 text-primary" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{loc.name}</p>
                      {loc.client && <p className="text-xs text-muted-foreground truncate">{loc.client.name}</p>}
                      {loc.lead && (
                         <Badge 
                         variant="outline" 
                         style={{ 
                           color: STAGE_COLORS[loc.lead.stage],
                           borderColor: STAGE_COLORS[loc.lead.stage] + '40'
                         }}
                         className="text-[10px] px-1.5 h-4 mt-1"
                       >
                         {loc.lead.stage.replace('_', ' ').toUpperCase()}
                       </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default MapView;
