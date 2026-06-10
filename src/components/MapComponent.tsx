import { useRef, useEffect, useState, useMemo } from "react";
import { Lead } from "@/lib/db";
import { toProperCase } from "@/lib/templates";

interface MapComponentProps {
  leads: Lead[];
  onUpdateStatus: (id: string, name: string, status: Lead["status"]) => void | Promise<void>;
  onPrintMap: () => void;
}

export const MapComponent = ({ leads, onUpdateStatus, onPrintMap }: MapComponentProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [coordinates, setCoordinates] = useState<Record<string, { lat: number; lng: number }>>({});
  const [loadingCoords, setLoadingCoords] = useState(false);

  // Load Leaflet CSS and JS dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  const printedLeads = useMemo(() => leads.filter(l => l.status === "printed"), [leads]);

  // Sort them by postcode to group nearby delivery locations
  const sortedPrintedLeads = useMemo(() => {
    return [...printedLeads].sort((a, b) => {
      const pcA = (a.postcode || "").trim().toUpperCase();
      const pcB = (b.postcode || "").trim().toUpperCase();
      return pcA.localeCompare(pcB);
    });
  }, [printedLeads]);

  // Geocode location postcodes using Postcodes.io API
  useEffect(() => {
    if (printedLeads.length === 0) return;

    const postcodesToFetch = printedLeads
      .map(l => l.postcode?.trim().toUpperCase())
      .filter((pc): pc is string => !!pc && !coordinates[pc]);

    if (postcodesToFetch.length === 0) return;

    const fetchCoords = async () => {
      setLoadingCoords(true);
      try {
        const uniquePostcodes = Array.from(new Set(postcodesToFetch));
        const res = await fetch("https://api.postcodes.io/postcodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postcodes: uniquePostcodes }),
        });

        if (res.ok) {
          const data = await res.json();
          const newCoords: Record<string, { lat: number; lng: number }> = {};
          if (data.result && Array.isArray(data.result)) {
            data.result.forEach((item: any) => {
              if (item.result) {
                newCoords[item.query.trim().toUpperCase()] = {
                  lat: item.result.latitude,
                  lng: item.result.longitude,
                };
              }
            });
          }
          setCoordinates(prev => ({ ...prev, ...newCoords }));
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      } finally {
        setLoadingCoords(false);
      }
    };

    fetchCoords();
  }, [printedLeads, coordinates]);

  // Render or update leaflet map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || typeof window === "undefined") return;

    const L = (window as any).L;
    if (!L) return;

    // Center on Tamworth/Wilnecote or first printed lead location
    let center: [number, number] = [52.6146, -1.6738]; // default Wilnecote
    const validPostcodes = printedLeads
      .map(l => l.postcode?.trim().toUpperCase())
      .filter((pc): pc is string => !!pc && !!coordinates[pc]);

    if (validPostcodes.length > 0) {
      const firstPC = validPostcodes[0];
      center = [coordinates[firstPC].lat, coordinates[firstPC].lng];
    }

    if (!leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current).setView(center, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(leafletMapRef.current);
    } else {
      // If map exists, pan to center if center changed
      const currentCenter = leafletMapRef.current.getCenter();
      if (Math.abs(currentCenter.lat - center[0]) > 0.01 || Math.abs(currentCenter.lng - center[1]) > 0.01) {
        leafletMapRef.current.setView(center, 13);
      }
    }

    // Clear all existing markers from the map before drawing the fresh ones
    Object.keys(markersRef.current).forEach(id => {
      markersRef.current[id].remove();
    });
    markersRef.current = {};

    // Add fresh markers with correct numbering
    printedLeads.forEach(lead => {
      const pc = lead.postcode?.trim().toUpperCase();
      if (!pc || !coordinates[pc]) return;

      const { lat, lng } = coordinates[pc];
      const idx = sortedPrintedLeads.findIndex(l => l.id === lead.id) + 1;
      
      // Custom div icon for nice appearance
      const iconHtml = `
        <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#35b0f3] text-white font-bold text-xs shadow-md border-2 border-white">
          ${idx}
        </div>
      `;
      
      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-leaflet-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(leafletMapRef.current);
      
      // Popup content
      const popupContent = `
        <div class="p-2 text-zinc-950 max-w-[200px]">
          <h4 class="font-bold text-sm mb-1">${toProperCase(lead.name)}</h4>
          <p class="text-xs text-zinc-500 mb-2">${lead.address || "No address"}</p>
          <div class="flex gap-1.5 mt-2">
            <button 
              onclick="window.leafletUpdateLeadStatus('${lead.id}', 'delivered')"
              class="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] px-2 py-1 rounded transition-all cursor-pointer"
            >
              Mark Delivered
            </button>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
      markersRef.current[lead.id] = marker;
    });

    // Attach global helper callback for marker popup click handler
    (window as any).leafletUpdateLeadStatus = (id: string, status: any) => {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        onUpdateStatus(id, lead.name, status);
      }
    };
  }, [leafletLoaded, printedLeads, sortedPrintedLeads, coordinates, leads, onUpdateStatus]);

  return (
    <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 map-component-root space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Delivery Route & Map</h3>
          <p className="text-xs text-slate-400">Showing printed leads grouped by postcode for efficient manual delivery.</p>
        </div>
        <button
          onClick={onPrintMap}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer no-print"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Map & List
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 map-content-layout">
        {/* Left Side: Map viewport */}
        <div className="w-full lg:w-3/5 h-[450px] map-print-target rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative z-10">
          {!leafletLoaded ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              <span className="animate-pulse">Loading map dependencies...</span>
            </div>
          ) : (
            <div ref={mapRef} className="w-full h-full" />
          )}
          {loadingCoords && (
            <div className="absolute top-3 right-3 bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-xl text-[10px] text-indigo-400 font-semibold z-20 shadow-lg animate-pulse flex items-center gap-1">
              Geocoding postcodes...
            </div>
          )}
        </div>

        {/* Right Side: Delivery List */}
        <div className="w-full lg:w-2/5 map-delivery-list flex flex-col h-[450px]">
          <div className="flex justify-between items-center mb-3 map-delivery-list-header">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Queue</h4>
            <span className="text-[10px] text-slate-500 font-bold">{sortedPrintedLeads.length} leads in queue</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 delivery-list-scroll-area">
            {sortedPrintedLeads.map((lead, index) => (
              <div 
                key={lead.id} 
                className="bg-slate-950/40 border border-slate-850 p-3.5 rounded-xl flex items-start gap-3.5 relative overflow-hidden group hover:border-slate-800 transition-all delivery-list-card shadow-sm"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center group-hover:bg-[#35b0f3] group-hover:text-white group-hover:border-[#35b0f3] transition-colors delivery-list-badge">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-xs text-white truncate leading-tight mb-0.5 delivery-list-title">
                    {toProperCase(lead.name)}
                  </h5>
                  <p className="text-[10.5px] text-slate-400 line-clamp-2 leading-relaxed delivery-list-address">
                    {lead.address || "No address details available."}
                  </p>
                  <div className="flex items-center justify-between border-t border-slate-900/50 mt-2.5 pt-2 delivery-list-card-footer">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-850 text-slate-400 text-[9px] font-bold font-mono tracking-wide delivery-list-postcode uppercase">
                      {lead.postcode || "N/A"}
                    </span>
                    <button
                      onClick={() => onUpdateStatus(lead.id, lead.name, "delivered")}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 rounded-lg hover:bg-emerald-950/20 border border-transparent hover:border-emerald-900/30 transition-all cursor-pointer no-print"
                    >
                      Deliver ✓
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {sortedPrintedLeads.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-850 rounded-2xl bg-slate-900/10">
                <span className="text-2xl mb-2">📦</span>
                <p className="text-xs text-slate-500 italic max-w-[200px]">No printed letters in the queue. Print a letter in CRM to queue it for delivery.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
