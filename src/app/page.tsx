"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { defaultLetterTemplate, CATEGORY_METADATA_MAP, getLetterTemplate, toProperCase } from "@/lib/templates";

interface WatchedLocation {
  id: string;
  location: string;
  created_at: string;
}

interface Lead {
  id: string;
  company_number: string;
  name: string;
  incorporation_date: string;
  postcode: string | null;
  address: string | null;
  sic_codes: string | null;
  industry_category: string | null;
  directors: { name: string; address: string }[] | null;
  status: 'new' | 'printed' | 'delivered' | 'interested' | 'meeting' | 'quote' | 'won' | 'lost';
  notes: string | null;
  next_contact_date: string | null;
  delivery_date: string | null;
  created_at: string;
}

interface DiscoveredCompany {
  company_number: string;
  name: string;
  incorporation_date: string;
  postcode: string | null;
  address: string | null;
  sic_codes: string | null;
  industry_category?: string | null;
  is_saved: boolean;
  lead_id: string | null;
  lead_status: Lead["status"] | null;
  lead_notes: string | null;
  lead_next_contact_date: string | null;
}

const renderParagraphs = (text: string, textClassName: string) => {
  const paragraphs = text.split("\n\n");
  return (
    <div className="space-y-3">
      {paragraphs.map((p, idx) => {
        if (!p.trim()) return null;
        return (
          <p key={idx} className={textClassName}>
            {p.trim()}
          </p>
        );
      })}
    </div>
  );
};

const renderBodyContent = (bodyText: string, textClassName: string, category: string | null = null) => {
  const placeholder = "[Offer Card]";
  if (bodyText.includes(placeholder)) {
    const parts = bodyText.split(placeholder);
    const intro = parts[0] || "";
    const outro = parts[1] || "";
    
    // Fetch pricing details based on category
    const meta = category ? CATEGORY_METADATA_MAP[category] : null;
    const price = meta?.price || 300;
    const wasPrice = meta?.wasPrice || 1200;
    const monthlyPrice = meta?.monthlyPrice || 25;
    const pitchTitle = meta?.pitchTitle || "New Business Website Offer";
    
    return (
      <div className="space-y-4">
        {intro.trim() && renderParagraphs(intro, textClassName)}
        
        {/* Highlighted Card */}
        <div 
          className="bg-[#F9F9FA] border border-zinc-200/80 p-5 rounded-[2rem] font-sans shadow-sm w-full relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 my-4 transition-all duration-300 hover:shadow-md"
          style={{ transform: "rotate(-1deg)" }}
        >
          {/* Left block - Info & Badge */}
          <div className="flex-1">
            <span className="inline-block text-[9px] font-bold tracking-wider text-white bg-[#E82264] px-2.5 py-0.5 rounded-full uppercase mb-2">
              Local Business Exclusive
            </span>
            <h3 className="text-sm font-bold text-[#35b0f3] uppercase tracking-wider mb-2">
              {pitchTitle}
            </h3>
            <ul className="space-y-1.5 text-[13px] text-zinc-700">
              <li className="flex items-center gap-2">
                <span className="text-[#35b0f3] font-bold text-sm">✓</span>
                <span>Professional website design</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#35b0f3] font-bold text-sm">✓</span>
                <span>Fully mobile-friendly & optimized</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#35b0f3] font-bold text-sm">✓</span>
                <span>12 months managed hosting included</span>
              </li>
            </ul>
          </div>

          {/* Right block - Price badge */}
          <div className="sm:text-right bg-white/90 border border-zinc-200/80 p-4 rounded-2xl sm:min-w-[185px] shadow-sm flex flex-col justify-center w-full sm:w-auto">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-0.5">Special Price</div>
            <div className="flex items-baseline justify-start sm:justify-end gap-1.5 mb-0.5">
              <span className="text-2xl font-black text-zinc-900">£{price}</span>
              <span className="text-xs text-zinc-400 line-through">was £{wasPrice}</span>
            </div>
            <div className="border-t border-zinc-150/80 pt-1.5 text-[10.5px] text-zinc-500 font-medium leading-tight">
              Or split the cost: <span className="font-bold text-[#35b0f3] block text-[10.5px] mt-0.5">£{monthlyPrice}/month for 12 months</span>
            </div>
          </div>
        </div>

        {outro.trim() && renderParagraphs(outro, textClassName)}
      </div>
    );
  }
  return renderParagraphs(bodyText, textClassName);
};

const MapComponent = ({ leads, onUpdateStatus, onPrintMap }: {
  leads: Lead[];
  onUpdateStatus: (id: string, name: string, status: Lead["status"]) => Promise<void>;
  onPrintMap: () => void;
}) => {
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

  const printedLeads = leads.filter(l => l.status === "printed");

  // Sort them by postcode to group nearby delivery locations
  const sortedPrintedLeads = [...printedLeads].sort((a, b) => {
    const pcA = (a.postcode || "").trim().toUpperCase();
    const pcB = (b.postcode || "").trim().toUpperCase();
    return pcA.localeCompare(pcB);
  });

  // Geocode postcodes using api.postcodes.io
  useEffect(() => {
    if (sortedPrintedLeads.length === 0) return;

    const geocodeLeads = async () => {
      setLoadingCoords(true);
      const newCoords: Record<string, { lat: number; lng: number }> = { ...coordinates };
      let changed = false;

      for (const lead of sortedPrintedLeads) {
        if (!lead.postcode) continue;
        const cleanPostcode = lead.postcode.trim().toUpperCase().replace(/\s+/g, "");
        if (newCoords[cleanPostcode]) continue;

        try {
          const res = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);
          if (res.ok) {
            const data = await res.json();
            if (data.result) {
              newCoords[cleanPostcode] = {
                lat: data.result.latitude,
                lng: data.result.longitude,
              };
              changed = true;
            }
          }
        } catch (err) {
          console.error(`Failed to geocode postcode ${cleanPostcode}:`, err);
        }
      }

      if (changed) {
        setCoordinates(newCoords);
      }
      setLoadingCoords(false);
    };

    geocodeLeads();
  }, [leads, sortedPrintedLeads.length]);

  // Build the list of items with coordinates and numbers
  const listItems = sortedPrintedLeads.map((lead, index) => {
    const cleanPostcode = lead.postcode?.trim().toUpperCase().replace(/\s+/g, "") || "";
    const coords = coordinates[cleanPostcode] || null;
    return { lead, coords, index };
  });

  const geocodedItems = listItems.filter(item => item.coords);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || typeof window === "undefined" || !(window as any).L) return;

    // Destroy existing map instance to re-initialize cleanly
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    const L = (window as any).L;

    // Default center: Tamworth/Wilnecote area (or center of all pins)
    let centerLat = 52.613; // Tamworth latitude
    let centerLng = -1.683; // Tamworth longitude
    let zoomLevel = 13;

    if (geocodedItems.length > 0) {
      const total = geocodedItems.reduce(
        (acc, val) => ({
          lat: acc.lat + val.coords!.lat,
          lng: acc.lng + val.coords!.lng,
        }),
        { lat: 0, lng: 0 }
      );
      centerLat = total.lat / geocodedItems.length;
      centerLng = total.lng / geocodedItems.length;
      zoomLevel = geocodedItems.length === 1 ? 14 : 11;
    }

    // Initialize Leaflet Map
    const map = L.map(mapRef.current).setView([centerLat, centerLng], zoomLevel);
    leafletMapRef.current = map;

    // Use CartoDB Positron light tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    // Clear old markers ref
    markersRef.current = {};

    // Plot markers
    geocodedItems.forEach(({ lead, coords, index }) => {
      const popupContent = `
        <div style="color: #1e293b; font-family: sans-serif; padding: 4px; min-width: 150px;">
          <h4 style="margin: 0 0 4px 0; font-weight: bold; font-size: 13px;">${index + 1}. ${lead.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">Postcode: ${lead.postcode}</p>
          <p style="margin: 0 0 6px 0; font-size: 10px; color: #475569; max-width: 180px;">${lead.address || ""}</p>
          <div style="font-size: 11px; margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
            <strong>Status:</strong> <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px;">${lead.status.toUpperCase()}</span>
          </div>
        </div>
      `;

      // Draw custom numbered marker using L.divIcon
      const numIcon = L.divIcon({
        html: `<div style="
          background-color: #35b0f3;
          color: #ffffff;
          border: 2px solid #ffffff;
          border-radius: 9999px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: sans-serif;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 2px 6px rgba(0,0,0,0.45);
        ">${index + 1}</div>`,
        className: 'leaflet-number-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -10]
      });

      const marker = L.marker([coords!.lat, coords!.lng], { icon: numIcon }).addTo(map);
      marker.bindPopup(popupContent);

      // Store reference to marker
      markersRef.current[lead.id] = marker;
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [leafletLoaded, coordinates, sortedPrintedLeads.length]);

  const handleFlyTo = (item: typeof listItems[0]) => {
    if (leafletMapRef.current && item.coords) {
      leafletMapRef.current.setView([item.coords.lat, item.coords.lng], 15);
      const marker = markersRef.current[item.lead.id];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 h-[85vh] lg:h-[78vh] flex flex-col justify-between map-component-root">
      {/* Print-only title header */}
      <div className="hidden print-title-header mb-5 border-b border-zinc-200 pb-3">
        <h2 className="text-lg font-bold text-zinc-800 font-sans">Delivery Route & Client List</h2>
        <p className="text-[11px] text-zinc-500 mt-1">Postcode-sorted routing sheet for delivering welcome packages.</p>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight font-sans">Monitored Clients Map & Delivery List</h3>
          <p className="text-xs text-slate-400">Showing locations of all leads in &quot;printed&quot; status. Postcode-sorted to optimize your physical delivery route.</p>
        </div>
        <div className="flex gap-2 self-start sm:self-center">
          {loadingCoords && (
            <div className="text-[10px] text-[#35b0f3] font-semibold px-3 py-1 bg-sky-950/40 border border-sky-900/40 rounded-full animate-pulse flex items-center">
              Geocoding postcodes...
            </div>
          )}
          <button
            type="button"
            onClick={onPrintMap}
            className="bg-[#35b0f3] hover:bg-[#35b0f3]/90 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Map
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden map-content-layout">
        {/* Numbered List of Deliveries */}
        <div className="w-full lg:w-80 h-72 lg:h-full flex flex-col bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 overflow-hidden flex-shrink-0 map-delivery-list">
          <div className="flex justify-between items-center mb-3 flex-shrink-0 map-delivery-list-header">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delivery Route ({listItems.length})</h4>
            <span className="text-[10px] text-slate-500 font-semibold">Postcode Ordered</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 delivery-list-scroll-area">
            {listItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <svg className="h-8 w-8 text-slate-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-xs text-slate-600 italic">No leads in &quot;printed&quot; status.</p>
              </div>
            ) : (
              listItems.map((item) => (
                <div 
                  key={item.lead.id} 
                  className={`bg-slate-900/40 border border-slate-850 hover:border-slate-800 rounded-xl p-3 flex gap-3 items-start transition-all duration-150 group delivery-list-card ${
                    item.coords ? 'cursor-pointer hover:bg-slate-900/80' : 'opacity-75'
                  }`}
                  onClick={() => item.coords && handleFlyTo(item)}
                  title={item.coords ? "Click to focus on map" : "Location not geocoded yet"}
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#35b0f3] text-white flex items-center justify-center text-xs font-black shadow-sm group-hover:scale-105 transition-transform delivery-list-badge">
                    {item.index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-white truncate leading-snug mb-1 group-hover:text-[#35b0f3] transition-colors font-sans delivery-list-title">
                      {item.lead.name}
                    </h5>
                    <p className="text-[11px] text-slate-400 leading-normal line-clamp-2 font-sans delivery-list-address" title={item.lead.address || ""}>
                      {item.lead.address || "No address details available"}
                    </p>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-850/50 delivery-list-card-footer">
                      <span className="text-[10px] text-slate-300 font-semibold px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono delivery-list-postcode">
                        {item.lead.postcode || "N/A"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateStatus(item.lead.id, item.lead.name, 'delivered');
                        }}
                        className="bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-emerald-500 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide transition-all active:scale-95 cursor-pointer card-action-no-print"
                      >
                        ✓ Delivered
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Engine Area */}
        <div className="flex-1 h-96 lg:h-full relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 map-print-target">
          {leafletLoaded && geocodedItems.length === 0 && (
            <div className="absolute inset-0 z-[400] flex items-center justify-center bg-slate-950/80 text-slate-500 text-sm p-4 text-center">
              No geocoded printed locations to plot. Ensure postcodes are valid.
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" style={{ minHeight: "350px" }} />
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  // Navigation & Filters
  const [selectedTab, setSelectedTab] = useState<'find' | 'crm' | 'map'>('find');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days'>('7days');
  const [crmStatusFilter, setCrmStatusFilter] = useState<'all' | 'new' | 'printed' | 'delivered' | 'interested' | 'meeting' | 'quote' | 'won' | 'lost'>('all');

  // Delivery date prompt state
  const [deliveryDatePromptLead, setDeliveryDatePromptLead] = useState<{ id: string; name: string } | null>(null);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState("");

  // Label Print States
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);
  const [activePrintType, setActivePrintType] = useState<'letter' | 'labels' | 'map' | null>(null);

  // Letter Generator States
  const [selectedLetterLead, setSelectedLetterLead] = useState<Lead | null>(null);
  const [senderName, setSenderName] = useState("Stuart Robertson");
  const [senderBusinessName, setSenderBusinessName] = useState("Edgeways Digital");
  const [senderPhone, setSenderPhone] = useState("07787 150 385");
  const [senderEmail, setSenderEmail] = useState("stuart@edgewaysdigital.com");
  const [senderWebsite, setSenderWebsite] = useState("www.edgewaysdigital.com");
  const [letterBody, setLetterBody] = useState("");
  const [recipientGreetingName, setRecipientGreetingName] = useState("Business Owner");
  const [loadingDirector, setLoadingDirector] = useState(false);

  const handleOpenLetterGenerator = async (lead: Lead) => {
    setSelectedLetterLead(lead);
    setActivePrintType('letter');
    setRecipientGreetingName("Business Owner");
    
    const initialTemplate = getLetterTemplate(lead.industry_category || "", lead.name, "Business Owner");
    setLetterBody(initialTemplate);
    setLoadingDirector(true);
    
    try {
      const res = await fetch(`/api/leads/officers?company_number=${lead.company_number}`);
      if (res.ok) {
        const data = await res.json();
        if (data.director && data.director.firstName) {
          const name = data.director.firstName;
          setRecipientGreetingName(name);
          
          setLetterBody(prev => {
            const defaultWithPlaceholder = getLetterTemplate(lead.industry_category || "", lead.name, "Business Owner");
            if (prev === defaultWithPlaceholder) {
              return getLetterTemplate(lead.industry_category || "", lead.name, name);
            }
            return prev.replace("Dear Business Owner,", `Dear ${name},`);
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch director:", err);
    } finally {
      setLoadingDirector(false);
    }
  };

  const handlePrintMap = () => {
    setActivePrintType('map');
    setTimeout(() => {
      window.print();
      setActivePrintType(null);
    }, 150);
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        window.location.href = "/login";
      } else {
        triggerAlert("Failed to log out", "error");
      }
    } catch (err) {
      console.error(err);
      triggerAlert("A network error occurred while logging out", "error");
    }
  };

  // DB States
  const [watchedLocations, setWatchedLocations] = useState<WatchedLocation[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  
  // Search & API States
  const [newLocationInput, setNewLocationInput] = useState("");
  const [discoveredCompanies, setDiscoveredCompanies] = useState<DiscoveredCompany[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  
  // Edit States for CRM
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesText, setEditingNotesText] = useState("");
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editingDateValue, setEditingDateValue] = useState("");

  // Notification / Alert state
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Show a temporary banner
  const triggerAlert = useCallback((text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setAlert({ text, type });
    setTimeout(() => setAlert(null), 5000);
  }, []);

  // Fetch watched locations from local DB
  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/watched-locations");
      if (!res.ok) throw new Error("Failed to load locations");
      const data = await res.json();
      setWatchedLocations(data);
    } catch (err) {
      console.error(err);
      triggerAlert("Could not load watched locations", "error");
    }
  }, [triggerAlert]);

  // Fetch leads from local DB
  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed to load leads");
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      console.error(err);
      triggerAlert("Could not load CRM leads", "error");
    }
  }, [triggerAlert]);

  // Initial load
  useEffect(() => {
    fetchLocations();
    fetchLeads();
  }, [fetchLocations, fetchLeads]);

  // Helper: Format YYYY-MM-DD Date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  // Add Watched Location
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = newLocationInput.trim().toUpperCase();
    if (!cleanInput) return;

    try {
      const res = await fetch("/api/watched-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: cleanInput })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add location");
      }

      setWatchedLocations(prev => [...prev, data].sort((a, b) => a.location.localeCompare(b.location)));
      setNewLocationInput("");
      triggerAlert(`Added "${cleanInput}" to watched list`, "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to add location", "error");
    }
  };

  // Delete Watched Location
  const handleDeleteLocation = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/watched-locations?id=${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove location");
      }

      setWatchedLocations(prev => prev.filter(l => l.id !== id));
      triggerAlert(`Stopped watching "${name}"`, "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to remove location", "error");
    }
  };

  // Save Company as CRM Lead
  const handleTrackLead = async (company: DiscoveredCompany) => {
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_number: company.company_number,
          name: company.name,
          incorporation_date: company.incorporation_date,
          postcode: company.postcode,
          address: company.address,
          sic_codes: company.sic_codes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save lead");
      }

      // Refresh leads list
      await fetchLeads();
      
      // Update item in discovery view
      setDiscoveredCompanies(prev => 
        prev.map(c => 
          c.company_number === company.company_number 
            ? { ...c, is_saved: true, lead_id: data.id, lead_status: 'new' }
            : c
        )
      );

      triggerAlert(`Started tracking "${company.name}"`, "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to track lead", "error");
    }
  };

  // Update CRM Lead Status
  const handleUpdateStatus = async (id: string, name: string, status: Lead["status"]) => {
    if (status === 'delivered') {
      setDeliveryDatePromptLead({ id, name });
      setSelectedDeliveryDate(new Date().toISOString().split("T")[0]);
      return;
    }
    try {
      const res = await fetch("/api/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
      triggerAlert(`Updated "${name}" status to ${status}`, "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to update status", "error");
    }
  };

  // Save Delivery Date for Lead (compulsory prompt handler)
  const handleSaveDeliveryDate = async () => {
    if (!deliveryDatePromptLead) return;
    const { id, name } = deliveryDatePromptLead;
    try {
      const res = await fetch("/api/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: 'delivered',
          delivery_date: selectedDeliveryDate || new Date().toISOString().split("T")[0]
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log delivery date");
      }

      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: 'delivered', delivery_date: selectedDeliveryDate } : l));
      setDeliveryDatePromptLead(null);
      triggerAlert(`Marked "${name}" as delivered on ${formatDate(selectedDeliveryDate)}`, "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to log delivery date", "error");
    }
  };

  // Save Notes for Lead
  const handleSaveNotes = async (id: string, name: string) => {
    try {
      const res = await fetch("/api/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes: editingNotesText })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save notes");
      }

      setLeads(prev => prev.map(l => l.id === id ? { ...l, notes: editingNotesText } : l));
      setEditingNotesId(null);
      triggerAlert(`Saved notes for "${name}"`, "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to save notes", "error");
    }
  };

  // Save Callback Date
  const handleSaveCallbackDate = async (id: string, name: string, dateVal: string) => {
    try {
      const res = await fetch("/api/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, next_contact_date: dateVal || null })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save callback date");
      }

      setLeads(prev => prev.map(l => l.id === id ? { ...l, next_contact_date: dateVal || null } : l));
      setEditingDateId(null);
      triggerAlert(`Updated callback date for "${name}"`, "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to set callback date", "error");
    }
  };

  // Remove/Delete Lead from Database
  const handleDeleteLead = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to untrack "${name}"? This removes it from your CRM.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/leads?id=${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete lead");
      }

      setLeads(prev => prev.filter(l => l.id !== id));
      
      // Update discovery state if same company is visible there
      setDiscoveredCompanies(prev => 
        prev.map(c => 
          c.lead_id === id 
            ? { ...c, is_saved: false, lead_id: null, lead_status: null }
            : c
        )
      );

      triggerAlert(`Removed "${name}" from leads`, "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to untrack lead", "error");
    }
  };

  // Query Companies House API for Watched Locations
  const handleScanLeads = async () => {
    if (watchedLocations.length === 0) {
      triggerAlert("Add at least one watched location first!", "warning");
      return;
    }

    setScanning(true);
    setDiscoveredCompanies([]);
    
    // Calculate date filter
    const now = new Date();
    let incorporatedFromDate = "";
    if (dateFilter === "today") {
      incorporatedFromDate = now.toISOString().split("T")[0];
    } else if (dateFilter === "yesterday") {
      const yest = new Date();
      yest.setDate(now.getDate() - 1);
      incorporatedFromDate = yest.toISOString().split("T")[0];
    } else if (dateFilter === "7days") {
      const week = new Date();
      week.setDate(now.getDate() - 7);
      incorporatedFromDate = week.toISOString().split("T")[0];
    } else if (dateFilter === "30days") {
      const month = new Date();
      month.setDate(now.getDate() - 30);
      incorporatedFromDate = month.toISOString().split("T")[0];
    }

    let allResults: DiscoveredCompany[] = [];
    let errorLocations: string[] = [];

    // Scan each location in parallel proxying through backend BFF
    for (let i = 0; i < watchedLocations.length; i++) {
      const loc = watchedLocations[i].location;
      setScanStatus(`Scanning location ${i + 1}/${watchedLocations.length}: ${loc}...`);

      try {
        const url = `/api/search?location=${encodeURIComponent(loc)}&incorporated_from=${incorporatedFromDate}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }

        const data = await res.json();
        const items: DiscoveredCompany[] = data.items || [];
        allResults = [...allResults, ...items];
      } catch (err) {
        console.error(`Failed to scan ${loc}:`, err);
        errorLocations.push(loc);
      }
    }

    // Deduplicate results by company_number
    const uniqueMap = new Map<string, DiscoveredCompany>();
    allResults.forEach(item => {
      uniqueMap.set(item.company_number, item);
    });
    const finalResults = Array.from(uniqueMap.values()).sort(
      (a, b) => b.incorporation_date.localeCompare(a.incorporation_date)
    );

    setDiscoveredCompanies(finalResults);
    setScanning(false);
    setScanStatus(null);

    if (errorLocations.length > 0) {
      triggerAlert(
        `Scan completed with some errors. Failed locations: ${errorLocations.join(", ")}. Check your API key.`,
        "error"
      );
    } else {
      triggerAlert(`Discovered ${finalResults.length} new companies!`, "success");
    }
  };

  // Filtered CRM Leads
  const filteredLeads = leads.filter(l => {
    if (crmStatusFilter === "all") return true;
    return l.status === crmStatusFilter;
  });

  return (
    <div className={`flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans ${activePrintType === 'map' ? 'print-map-mode' : ''}`}>
      
      {/* Toast Alert Banner */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md border transition-all duration-300 flex items-center gap-3 animate-slide-in ${
          alert.type === 'error' ? 'bg-red-950/90 text-red-200 border-red-800' :
          alert.type === 'warning' ? 'bg-amber-950/90 text-amber-200 border-amber-800' :
          'bg-emerald-950/90 text-emerald-200 border-emerald-800'
        }`}>
          <span className="font-medium">{alert.text}</span>
          <button onClick={() => setAlert(null)} className="hover:text-white text-slate-400 font-bold ml-2">&times;</button>
        </div>
      )}

      {/* Sidebar Panel */}
      <aside className="w-full md:w-80 flex-shrink-0 bg-slate-900/40 border-b md:border-b-0 md:border-r border-slate-800/80 backdrop-blur-xl p-6 flex flex-col justify-between">
        <div>
          {/* Brand/Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Edgeways Leads</h1>
              <p className="text-xs text-slate-500">Companies House Monitor</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="space-y-1.5 mb-8">
            <button
              onClick={() => setSelectedTab('find')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                selectedTab === 'find'
                  ? 'bg-slate-800/80 text-white border-l-4 border-indigo-500 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Find Leads
            </button>
            <button
              onClick={() => setSelectedTab('crm')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                selectedTab === 'crm'
                  ? 'bg-slate-800/80 text-white border-l-4 border-indigo-500 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              CRM Lead Manager
              {leads.filter(l => l.status !== 'lost').length > 0 && (
                <span className="ml-auto bg-indigo-500 text-white font-semibold text-xs px-2 py-0.5 rounded-full" title="Total active leads">
                  {leads.filter(l => l.status !== 'lost').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setSelectedTab('map')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                selectedTab === 'map'
                  ? 'bg-slate-800/80 text-white border-l-4 border-indigo-500 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Monitored Map
              {leads.filter(l => l.status === 'printed').length > 0 && (
                <span className="ml-auto bg-[#35b0f3] text-white font-semibold text-xs px-2 py-0.5 rounded-full">
                  {leads.filter(l => l.status === 'printed').length}
                </span>
              )}
            </button>
          </nav>

          {/* Watched Locations Section */}
          <div className="border-t border-slate-850 pt-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Watched Areas</h2>
            
            {/* Add Location Form */}
            <form onSubmit={handleAddLocation} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newLocationInput}
                onChange={e => setNewLocationInput(e.target.value)}
                placeholder="e.g. CB1 or London"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 rounded-xl text-sm font-medium transition-colors shadow-md shadow-indigo-600/10 flex items-center justify-center"
              >
                +
              </button>
            </form>

            {/* Location List */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {watchedLocations.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-2">No areas watched yet. Add one above.</p>
              ) : (
                watchedLocations.map(loc => (
                  <div
                    key={loc.id}
                    className="flex items-center justify-between bg-slate-900/60 border border-slate-850 rounded-xl px-3 py-2 text-sm group"
                  >
                    <span className="font-semibold text-slate-300">{loc.location}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLocation(loc.id, loc.location)}
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150"
                      title="Delete location"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info/Help Section */}
        <div className="border-t border-slate-850 pt-6 mt-6 text-xs text-slate-500 leading-relaxed flex flex-col gap-4">
          <p>This local utility searches the Companies House public ledger to find newly incorporated entities in your monitored postcodes or cities.</p>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-red-400 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm active:scale-95 cursor-pointer no-print"
          >
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {selectedTab === 'find' && (
          <div>
            {/* Header Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Lead Finder</h2>
                <p className="text-sm text-slate-400">Scan monitored locations for newly registered businesses.</p>
              </div>

              {/* Action Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Filter Selection */}
                <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1 text-xs font-medium">
                  {(['today', 'yesterday', '7days', '30days'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setDateFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                        dateFilter === filter
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {filter === '7days' ? 'Last 7 Days' : filter === '30days' ? 'Last 30 Days' : filter}
                    </button>
                  ))}
                </div>

                {/* Scan Button */}
                <button
                  onClick={handleScanLeads}
                  disabled={scanning || watchedLocations.length === 0}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg flex items-center gap-2 ${
                    scanning || watchedLocations.length === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10 active:scale-95'
                  }`}
                >
                  {scanning ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Scanning...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H19" />
                      </svg>
                      Run Daily Scan
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Scan Status Progress Indicator */}
            {scanning && scanStatus && (
              <div className="bg-indigo-950/20 border border-indigo-900/50 p-4 rounded-xl mb-6 text-sm text-indigo-300 flex items-center gap-3 animate-pulse">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{scanStatus}</span>
              </div>
            )}

            {/* Discovered List Section */}
            <div>
              {discoveredCompanies.length === 0 ? (
                <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto mt-12">
                  <svg className="mx-auto h-12 w-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="text-lg font-bold text-slate-300">No scan results yet</h3>
                  <p className="text-slate-500 text-sm mt-2">
                    {watchedLocations.length === 0
                      ? "First add some local postcodes/cities to monitor in the sidebar."
                      : "Choose a date range filter and click 'Run Daily Scan' to fetch new entities from Companies House."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {discoveredCompanies.map(company => (
                    <div
                      key={company.company_number}
                      className="bg-slate-900/30 border border-slate-850 hover:border-slate-800/80 hover:bg-slate-900/50 rounded-2xl p-5 flex flex-col justify-between transition-all group duration-200"
                    >
                      <div>
                        {/* Title & Badge */}
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h4 className="font-bold text-lg text-slate-100 tracking-tight group-hover:text-white transition-colors leading-snug">
                            {company.name}
                          </h4>
                          <span className="flex-shrink-0 text-[10px] font-semibold tracking-wider text-slate-400 bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded-full uppercase">
                            No. {company.company_number}
                          </span>
                        </div>

                        {/* Company Metadata */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-sm text-slate-400 mb-4 border-t border-slate-850/50 pt-3.5">
                          <div className="flex items-center gap-2">
                            <svg className="h-4.5 w-4.5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>Inc. {formatDate(company.incorporation_date)}</span>
                          </div>
                          {company.postcode && (
                            <div className="flex items-center gap-2">
                              <svg className="h-4.5 w-4.5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>Postcode: <strong className="text-slate-300 font-semibold">{company.postcode}</strong></span>
                            </div>
                          )}
                          {company.industry_category && (
                            <div className="flex items-center gap-2 sm:col-span-2">
                              <svg className="h-4.5 w-4.5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              <span>Category: <strong className="px-2 py-0.5 rounded bg-slate-950 border border-slate-850 text-indigo-400 font-mono text-[10px]">{company.industry_category}</strong></span>
                            </div>
                          )}
                          {company.industry_category && CATEGORY_METADATA_MAP[company.industry_category] && (
                            <>
                              <div className="flex items-center gap-2 sm:col-span-2">
                                <svg className="h-4.5 w-4.5 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Value: <strong className={`px-2 py-0.5 rounded text-[10px] border font-mono ${
                                  CATEGORY_METADATA_MAP[company.industry_category].potentialValue === 'Very High' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400' :
                                  CATEGORY_METADATA_MAP[company.industry_category].potentialValue === 'High' ? 'bg-blue-950/40 border-blue-900/50 text-blue-400' :
                                  CATEGORY_METADATA_MAP[company.industry_category].potentialValue === 'Medium' ? 'bg-amber-950/40 border-amber-900/50 text-amber-400' :
                                  'bg-slate-900 border-slate-800 text-slate-400'
                                }`}>{CATEGORY_METADATA_MAP[company.industry_category].potentialValue}</strong></span>
                              </div>
                              <div className="flex items-start gap-2 sm:col-span-2">
                                <svg className="h-4.5 w-4.5 text-slate-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <span className="text-xs text-slate-300">Initial Offer: <span className="text-indigo-400 font-semibold">{CATEGORY_METADATA_MAP[company.industry_category].pitchTitle.replace(" Offer", "")} (£{CATEGORY_METADATA_MAP[company.industry_category].price})</span></span>
                              </div>
                            </>
                          )}
                          {company.sic_codes && (
                            <div className="flex items-start gap-2 sm:col-span-2">
                              <svg className="h-4.5 w-4.5 text-slate-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="line-clamp-2">SIC: {company.sic_codes}</span>
                            </div>
                          )}
                          {company.address && (
                            <div className="flex items-start gap-2 sm:col-span-2">
                              <svg className="h-4.5 w-4.5 text-slate-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                              <span className="line-clamp-2">{company.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between border-t border-slate-850 pt-4 mt-2">
                        <a
                          href={`https://find-and-update.company-information.service.gov.uk/company/${company.company_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
                        >
                          View Official Record
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>

                        {company.is_saved ? (
                          <div className="flex items-center gap-1.5 bg-indigo-950/40 text-indigo-300 border border-indigo-900/50 px-3 py-1.5 rounded-xl text-xs font-semibold">
                            <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Tracked ({company.lead_status})
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTrackLead(company)}
                            className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-600 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95"
                          >
                            Track Lead
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === 'crm' && (
          <div>
            {/* CRM Lead Manager View */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">CRM Lead Manager</h2>
                <p className="text-sm text-slate-400">Track status, record client notes, and set call back dates.</p>
              </div>

              {/* Status Filters */}
              <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex flex-wrap gap-1 text-xs font-medium self-start lg:self-center">
                {(['all', 'new', 'printed', 'delivered', 'interested', 'meeting', 'quote', 'won', 'lost'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setCrmStatusFilter(status)}
                    className={`px-3.5 py-1.5 rounded-lg capitalize transition-colors flex items-center gap-1.5 ${
                      crmStatusFilter === status
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${
                      status === 'all' ? 'bg-indigo-400' :
                      status === 'new' ? 'bg-sky-400' :
                      status === 'printed' ? 'bg-indigo-500' :
                      status === 'delivered' ? 'bg-emerald-500' :
                      status === 'interested' ? 'bg-pink-400' :
                      status === 'meeting' ? 'bg-purple-400' :
                      status === 'quote' ? 'bg-amber-400' :
                      status === 'won' ? 'bg-teal-400' :
                      'bg-rose-500'
                    }`} />
                    {status}
                    {status !== 'all' && leads.filter(l => l.status === status).length > 0 && (
                      <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400">
                        {leads.filter(l => l.status === status).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* CRM Leads List */}
            {filteredLeads.length === 0 ? (
              <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto mt-12">
                <svg className="mx-auto h-12 w-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="text-lg font-bold text-slate-300">No leads found</h3>
                <p className="text-slate-500 text-sm mt-2">
                  {crmStatusFilter !== 'all' 
                    ? `You don't have any leads marked as "${crmStatusFilter}".` 
                    : "You aren't tracking any leads yet. Query Companies House in 'Find Leads' to add some."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select All Checkbox Helper Row */}
                <div className="bg-slate-900/20 border border-slate-850/60 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-slate-400">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedLabelIds.includes(l.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const toAdd = filteredLeads.map(l => l.id);
                          setSelectedLabelIds(prev => Array.from(new Set([...prev, ...toAdd])));
                        } else {
                          const toRemove = filteredLeads.map(l => l.id);
                          setSelectedLabelIds(prev => prev.filter(id => !toRemove.includes(id)));
                        }
                      }}
                      className="h-4.5 w-4.5 rounded border-slate-800 text-indigo-600 bg-slate-950 accent-indigo-500 cursor-pointer"
                    />
                    <span>Select All {filteredLeads.length} Leads in Filter for Address Labels</span>
                  </label>
                  {selectedLabelIds.length > 0 && (
                    <button
                      onClick={() => setSelectedLabelIds([])}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      Clear Selection ({selectedLabelIds.length})
                    </button>
                  )}
                </div>

                {filteredLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="bg-slate-900/40 border border-slate-850 hover:border-slate-800/80 rounded-2xl p-6 transition-all duration-150"
                  >
                    {/* Header: Company Name & Control Badges */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-850/50">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedLabelIds.includes(lead.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLabelIds(prev => [...prev, lead.id]);
                            } else {
                              setSelectedLabelIds(prev => prev.filter(id => id !== lead.id));
                            }
                          }}
                          className="mt-1 h-4.5 w-4.5 rounded border-slate-800 text-indigo-600 bg-slate-950 accent-indigo-500 cursor-pointer flex-shrink-0"
                          title="Select for address labels"
                        />
                        <div>
                          <h3 className="text-lg font-bold text-white tracking-tight leading-snug">{lead.name}</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            No. {lead.company_number} &bull; Incorporated: {formatDate(lead.incorporation_date)}
                          </p>
                        </div>
                      </div>

                      {/* Status selectors & Action options */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status buttons */}
                        <div className="bg-slate-950 p-1 border border-slate-850 rounded-xl flex flex-wrap gap-1 text-[11px] font-semibold">
                          {(['new', 'printed', 'delivered', 'interested', 'meeting', 'quote', 'won', 'lost'] as const).map(st => (
                            <button
                              key={st}
                              onClick={() => handleUpdateStatus(lead.id, lead.name, st)}
                              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                                lead.status === st
                                  ? st === 'new' ? 'bg-sky-500/25 text-sky-300 border border-sky-500/20' :
                                    st === 'printed' ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/20' :
                                    st === 'delivered' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/20' :
                                    st === 'interested' ? 'bg-pink-500/25 text-pink-300 border border-pink-500/20' :
                                    st === 'meeting' ? 'bg-purple-500/25 text-purple-300 border border-purple-500/20' :
                                    st === 'quote' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/20' :
                                    st === 'won' ? 'bg-teal-500/25 text-teal-300 border border-teal-500/20' :
                                    'bg-rose-500/25 text-rose-300 border border-rose-500/20'
                                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>

                        {/* Generate Letter Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenLetterGenerator(lead)}
                          className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                          title="Generate introduction letter"
                        >
                          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {/* Delete Action button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteLead(lead.id, lead.name)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
                          title="Untrack lead"
                        >
                          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Actions row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Left: Contact Info / Address */}
                      <div className="text-sm space-y-3">
                        <div>
                          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">Company Details</span>
                          {lead.postcode && (
                            <p className="text-slate-400">Postcode: <strong className="text-slate-300 font-semibold">{lead.postcode}</strong></p>
                          )}
                          {lead.address && (
                            <p className="text-slate-400 mt-1 line-clamp-3 text-xs leading-relaxed" title={lead.address}>{lead.address}</p>
                          )}
                          {lead.sic_codes && (
                            <p className="text-slate-500 mt-2 text-xs">SIC: {lead.sic_codes}</p>
                          )}
                          {lead.industry_category && (
                            <p className="text-slate-400 mt-2 text-xs flex flex-wrap gap-2 items-center">
                              <span>Category:</span>
                              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-400 font-mono text-[10.5px] font-semibold">{lead.industry_category}</span>
                              {CATEGORY_METADATA_MAP[lead.industry_category] && (
                                <span className={`px-2 py-0.5 rounded text-[10.5px] border font-mono font-semibold ${
                                  CATEGORY_METADATA_MAP[lead.industry_category].potentialValue === 'Very High' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400' :
                                  CATEGORY_METADATA_MAP[lead.industry_category].potentialValue === 'High' ? 'bg-blue-950/40 border-blue-900/50 text-blue-400' :
                                  CATEGORY_METADATA_MAP[lead.industry_category].potentialValue === 'Medium' ? 'bg-amber-950/40 border-amber-900/50 text-amber-400' :
                                  'bg-slate-900 border-slate-800 text-slate-400'
                                }`}>{CATEGORY_METADATA_MAP[lead.industry_category].potentialValue} Value</span>
                              )}
                            </p>
                          )}
                          {lead.industry_category && CATEGORY_METADATA_MAP[lead.industry_category] && (
                            <div className="mt-3 space-y-1.5 border-t border-slate-850/30 pt-3">
                              <p className="text-[11.5px] text-slate-400 leading-normal">
                                <span className="text-slate-500 font-medium block uppercase tracking-wider text-[9px] mb-1">Initial Service Offer</span>
                                <span className="text-indigo-300 font-semibold">{CATEGORY_METADATA_MAP[lead.industry_category].pitchTitle.replace(" Offer", "")} (£{CATEGORY_METADATA_MAP[lead.industry_category].price})</span>
                              </p>
                              {lead.delivery_date && lead.status === 'delivered' && (
                                <p className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                                  <span className="text-[14px]">📅</span> Delivered: {formatDate(lead.delivery_date)}
                                </p>
                              )}
                              <p className="text-[11.5px] text-slate-400 leading-normal">
                                <span className="text-slate-500 font-medium block uppercase tracking-wider text-[9px] mb-1">Future Offerings (upsell)</span>
                                <span className="text-slate-300 font-semibold">{CATEGORY_METADATA_MAP[lead.industry_category].futureNeeds.join(", ")}</span>
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2">
                          <a
                            href={`https://find-and-update.company-information.service.gov.uk/company/${lead.company_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                          >
                            Companies House record &rarr;
                          </a>
                        </div>
                      </div>

                      {/* Middle: Callback / Next Contact Date */}
                      <div className="text-sm">
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-2">Next Action / Callback</span>
                        {editingDateId === lead.id ? (
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={editingDateValue}
                              onChange={e => setEditingDateValue(e.target.value)}
                              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => handleSaveCallbackDate(lead.id, lead.name, editingDateValue)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingDateId(null)}
                              className="text-slate-400 hover:text-slate-200 text-xs px-2"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {lead.next_contact_date ? (
                              <div className="bg-amber-950/20 text-amber-300 border border-amber-900/40 px-3 py-2 rounded-xl flex items-center gap-2 text-xs">
                                <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Follow up: <strong>{formatDate(lead.next_contact_date)}</strong></span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 italic">No call back scheduled</span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDateId(lead.id);
                                setEditingDateValue(lead.next_contact_date || "");
                              }}
                              className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold ml-1.5"
                            >
                              {lead.next_contact_date ? "Edit" : "Set date"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Right: Notes */}
                      <div className="text-sm">
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-2">Internal CRM Notes</span>
                        {editingNotesId === lead.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingNotesText}
                              onChange={e => setEditingNotesText(e.target.value)}
                              rows={3}
                              placeholder="e.g. Spoke to CEO, interested in IT services. Callback next week."
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveNotes(lead.id, lead.name)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                              >
                                Save Notes
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingNotesId(null)}
                                className="text-slate-400 hover:text-slate-200 text-xs px-2"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 text-xs text-slate-300 min-h-16 flex flex-col justify-between group">
                            {lead.notes ? (
                              <p className="whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                            ) : (
                              <p className="text-slate-600 italic">No notes recorded yet.</p>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNotesId(lead.id);
                                setEditingNotesText(lead.notes || "");
                              }}
                              className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold self-start mt-2"
                            >
                              {lead.notes ? "Edit Notes" : "+ Add Notes"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Directors Row */}
                    {lead.directors && lead.directors.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-850/50">
                        <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-2">Directors & Addresses</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {lead.directors.map((dir, dIdx) => (
                            <div key={dIdx} className="bg-slate-950/40 border border-slate-850 rounded-xl p-3 flex flex-col justify-center min-h-[50px]">
                              <div className="text-xs font-bold text-slate-200">{dir.name}</div>
                              <div className="text-[10.5px] text-slate-500 leading-normal mt-1" title={dir.address}>{dir.address}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Sticky bottom selection bar */}
            {selectedLabelIds.length > 0 && (
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center justify-between gap-6 shadow-2xl w-full max-w-xl no-print">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">Address Labels Sheet</span>
                  <span className="text-xs text-slate-400">{selectedLabelIds.length} lead(s) selected</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsLabelsModalOpen(true);
                      setActivePrintType('labels');
                    }}
                    className="bg-[#35b0f3] hover:bg-[#35b0f3]/90 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-sky-500/10 active:scale-95 cursor-pointer"
                  >
                    Generate Label Sheet
                  </button>
                  <button
                    onClick={() => setSelectedLabelIds([])}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'map' && (
          <MapComponent leads={leads} onUpdateStatus={handleUpdateStatus} onPrintMap={handlePrintMap} />
        )}
      </main>

      {/* Modal overlay for Labels Sheet Preview & Setup */}
      {isLabelsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-850 flex items-center justify-between bg-slate-900/60 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">Generate Address Labels</h3>
                <p className="text-xs text-slate-400">Generate a sheet of 21 address labels (3 columns x 7 rows, A4 size).</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-[#35b0f3] hover:bg-[#35b0f3]/90 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Labels Sheet (A4)
                </button>
                <button
                  onClick={() => {
                    setIsLabelsModalOpen(false);
                    setActivePrintType(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Content - Left Pane Controls, Right Pane Preview */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Controls */}
              <div className="w-full md:w-1/3 p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-850 space-y-5 flex-shrink-0">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Print Settings Advisory</h4>
                  <div className="bg-sky-950/20 border border-sky-900/40 p-4 rounded-xl text-xs text-slate-300 space-y-2 leading-relaxed font-sans">
                    <p className="font-semibold text-[#35b0f3] flex items-center gap-1.5">
                      <span>🖨️</span> Page Alignment Setup:
                    </p>
                    <p>To ensure labels line up perfectly with your physical A4 sheets, please apply the following parameters in your browser print dialog:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Margins</strong>: Set to <strong>None</strong> (or Minimum).</li>
                      <li><strong>Scale</strong>: Set to <strong>100%</strong> (Default).</li>
                      <li><strong>Headers & Footers</strong>: <strong>Uncheck</strong>.</li>
                      <li><strong>Background graphics</strong>: <strong>Check</strong>.</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Selected Recipients ({selectedLabelIds.length})</h4>
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                    {leads.filter(l => selectedLabelIds.includes(l.id)).map(lead => (
                      <div key={lead.id} className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">{lead.name}</div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">{lead.postcode}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedLabelIds(prev => prev.filter(id => id !== lead.id))}
                          className="text-slate-500 hover:text-red-400 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-900"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {selectedLabelIds.length === 0 && (
                      <p className="text-xs text-slate-500 italic">No recipients selected. Close this modal and select leads in the list.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid Preview (Mockup of A4 page on-screen) */}
              <div className="flex-1 bg-slate-950 p-6 overflow-auto flex items-start justify-center">
                {(() => {
                  const selectedLeadsList = leads.filter(l => selectedLabelIds.includes(l.id));
                  const pages: Lead[][] = [];
                  for (let i = 0; i < selectedLeadsList.length; i += 21) {
                    pages.push(selectedLeadsList.slice(i, i + 21));
                  }

                  if (pages.length === 0) {
                    return (
                      <div className="text-slate-600 text-sm italic mt-12">No labels to preview.</div>
                    );
                  }

                  const formatAddressParts = (addr: string | null) => {
                    if (!addr) return [];
                    return addr.split(',').map(p => p.trim()).filter(p => {
                      const l = p.toLowerCase();
                      return l !== 'united kingdom' && l !== 'england' && l !== 'uk';
                    });
                  };

                  return (
                    <div className="space-y-8 pb-8 flex flex-col items-center">
                      {pages.map((pageLeads, pageIdx) => (
                        <div key={pageIdx} className="flex flex-col items-center">
                          <span className="text-xs font-semibold text-slate-500 mb-2">Sheet Page {pageIdx + 1} of {pages.length}</span>
                          <div className="bg-white text-zinc-900 shadow-2xl border border-zinc-300 w-[210mm] h-[297mm] p-[15.1mm_7.2mm_15.2mm_7.2mm] grid grid-cols-3 grid-rows-7 gap-x-[2.5mm] gap-y-0 box-border flex-shrink-0">
                            {Array.from({ length: 21 }).map((_, cellIdx) => {
                              const lead = pageLeads[cellIdx];
                              if (lead) {
                                return (
                                  <div key={lead.id} className="w-[63.5mm] h-[38.1mm] p-[5mm_6mm] box-border border border-zinc-100 flex flex-col justify-center overflow-hidden font-sans text-left leading-tight text-zinc-900 bg-white">
                                    <div className="font-bold text-[10px] uppercase tracking-tight text-zinc-800 truncate mb-0.5">{lead.name}</div>
                                    {formatAddressParts(lead.address).map((part, pIdx) => (
                                      <div key={pIdx} className="text-[9px] text-zinc-500 truncate leading-snug">{part}</div>
                                    ))}
                                  </div>
                                );
                              } else {
                                return (
                                  <div key={`empty-${cellIdx}`} className="w-[63.5mm] h-[38.1mm] border border-dashed border-zinc-100 bg-zinc-50/20" />
                                );
                              }
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal overlay for Letter Editor & Preview */}
      {selectedLetterLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-850 flex items-center justify-between bg-slate-900/60">
              <div>
                <h3 className="text-lg font-bold text-white">Generate Introduction Letter</h3>
                <p className="text-xs text-slate-400">Customise and print a letter for {selectedLetterLead.name}.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Letter (A4)
                </button>
                <button
                  onClick={() => setSelectedLetterLead(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Content - Left Pane Editor, Right Pane Preview */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* Editor Form */}
              <div className="w-full md:w-1/2 p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-850 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Letter Details</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 font-semibold block mb-1">Your Name</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={e => setSenderName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold block mb-1">Business Name</label>
                    <input
                      type="text"
                      value={senderBusinessName}
                      onChange={e => setSenderBusinessName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold block mb-1">Your Phone</label>
                    <input
                      type="text"
                      value={senderPhone}
                      onChange={e => setSenderPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold block mb-1">Your Email</label>
                    <input
                      type="text"
                      value={senderEmail}
                      onChange={e => setSenderEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-500 font-semibold block mb-1">Your Website</label>
                    <input
                      type="text"
                      value={senderWebsite}
                      onChange={e => setSenderWebsite(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs text-slate-500 font-semibold block">Greeting Name</label>
                      {loadingDirector && (
                        <span className="text-[10px] text-indigo-400 font-semibold animate-pulse flex items-center gap-1">
                          <svg className="animate-spin h-3 w-3 text-indigo-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Searching director name...
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={recipientGreetingName}
                      onChange={e => {
                        const newName = e.target.value;
                        setRecipientGreetingName(newName);
                        setLetterBody(prev => {
                          return prev.replace(`Dear ${recipientGreetingName},`, `Dear ${newName},`);
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-semibold block mb-1">Letter Body Content</label>
                  <textarea
                    value={letterBody}
                    onChange={e => setLetterBody(e.target.value)}
                    rows={14}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Paper Preview */}
              <div className="w-full md:w-1/2 p-6 bg-slate-950/60 overflow-y-auto flex items-start justify-center">
                <div className="bg-white text-zinc-900 p-8 sm:p-12 w-full max-w-[620px] shadow-2xl rounded-[2rem] border border-zinc-200 font-sans leading-relaxed text-sm">
                  {/* Modern Header */}
                  <div className="flex justify-between items-center mb-6 font-sans">
                    <div>
                      <h1 className="text-xl font-black tracking-tight text-[#35b0f3] mb-0.5">{senderBusinessName}</h1>
                      {senderBusinessName === "Edgeways Digital" && (
                        <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-400">Software &bull; Websites &bull; Apps</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-500 font-semibold block">Hi, I&apos;m {senderName.split(' ')[0]}.</span>
                      </div>
                      <img src="/stuart.jpg" className="w-12 h-12 rounded-full object-cover border border-zinc-200 shadow-sm" alt={senderName} />
                    </div>
                  </div>

                  {/* Date line */}
                  <div className="text-xs text-zinc-400 font-medium mb-3">
                    {formatDate(new Date().toISOString())}
                  </div>

                  {/* Headline & Subheading */}
                  <div className="mb-4">
                    <h2 className="text-lg font-extrabold text-[#35b0f3] leading-snug mb-1">
                      Congratulations on starting {toProperCase(selectedLetterLead.name)}
                    </h2>
                  </div>

                  {/* Letter Content */}
                  {renderBodyContent(letterBody, "text-[#27272a] text-[13.5px] leading-relaxed", selectedLetterLead.industry_category)}

                  {/* Signature */}
                  <div className="mt-6 text-xs text-zinc-500 leading-relaxed">
                    <p className="mb-3 text-zinc-800 text-[13.5px]">Warm regards,</p>
                    <p className="font-bold text-zinc-900 text-sm">{senderName}</p>
                    <p className="text-[#35b0f3] font-semibold">{senderBusinessName}</p>
                  </div>

                  {/* Footer info */}
                  <div className="mt-8 pt-4 border-t border-zinc-150 text-[10px] text-zinc-400 font-sans tracking-wide text-center space-y-1.5">
                    <div>74 Broadlee, Wilnecote, Tamworth, B77 4PG</div>
                    <div className="text-zinc-500 flex justify-center gap-3 text-[9px]">
                      <span>{senderPhone}</span>
                      <span>&bull;</span>
                      <span>{senderEmail}</span>
                      <span>&bull;</span>
                      <span>{senderWebsite}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Print-only container */}
      {selectedLetterLead && activePrintType === 'letter' && (
        <div className="print-container hidden">
          <div className="print-paper bg-white text-zinc-900 p-12 font-sans leading-relaxed text-[14px]">
            <div className="max-w-[620px] mx-auto">
              {/* Modern Header */}
              <div className="flex justify-between items-center mb-6 font-sans">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-[#35b0f3] mb-0.5">{senderBusinessName}</h1>
                  {senderBusinessName === "Edgeways Digital" && (
                    <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-400">Software &bull; Websites &bull; Apps</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 font-semibold block">Hi, I&apos;m {senderName.split(' ')[0]}.</span>
                  </div>
                  <img src="/stuart.jpg" className="w-12 h-12 rounded-full object-cover border border-zinc-200 shadow-sm" alt={senderName} />
                </div>
              </div>

              {/* Date line */}
              <div className="text-xs text-zinc-405 font-medium mb-3">
                {formatDate(new Date().toISOString())}
              </div>

              {/* Headline & Subheading */}
              <div className="mb-4">
                <h2 className="text-lg font-extrabold text-[#35b0f3] leading-snug mb-1">
                  Congratulations on starting {toProperCase(selectedLetterLead.name)}
                </h2>
              </div>

              {/* Letter Content */}
              {renderBodyContent(letterBody, "text-[#27272a] text-[14px] leading-relaxed", selectedLetterLead.industry_category)}

              {/* Signature */}
              <div className="mt-6 text-xs text-zinc-500 leading-relaxed">
                <p className="mb-3 text-zinc-800 text-[14px]">Warm regards,</p>
                <p className="font-bold text-zinc-900 text-sm">{senderName}</p>
                <p className="text-[#35b0f3] font-semibold">{senderBusinessName}</p>
              </div>

              {/* Footer info */}
              <div className="mt-8 pt-4 border-t border-zinc-150 text-[10px] text-zinc-455 font-sans tracking-wide text-center space-y-1.5">
                <div>74 Broadlee, Wilnecote, Tamworth, B77 4PG</div>
                <div className="text-zinc-500 flex justify-center gap-3 text-[9px]">
                  <span>{senderPhone}</span>
                  <span>&bull;</span>
                  <span>{senderEmail}</span>
                  <span>&bull;</span>
                  <span>{senderWebsite}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print-only container for Labels */}
      {activePrintType === 'labels' && selectedLabelIds.length > 0 && (
        <div className="print-labels-container hidden">
          {(() => {
            const selectedLeadsList = leads.filter(l => selectedLabelIds.includes(l.id));
            const pages: Lead[][] = [];
            for (let i = 0; i < selectedLeadsList.length; i += 21) {
              pages.push(selectedLeadsList.slice(i, i + 21));
            }

            const formatAddressParts = (addr: string | null) => {
              if (!addr) return [];
              return addr.split(',').map(p => p.trim()).filter(p => {
                const l = p.toLowerCase();
                return l !== 'united kingdom' && l !== 'england' && l !== 'uk';
              });
            };

            return pages.map((pageLeads, pageIdx) => (
              <div key={pageIdx} className="print-labels-page">
                {Array.from({ length: 21 }).map((_, cellIdx) => {
                  const lead = pageLeads[cellIdx];
                  if (lead) {
                    return (
                      <div key={lead.id} className="print-label-cell">
                        <div className="font-bold text-[10px] uppercase tracking-tight truncate mb-0.5">{lead.name}</div>
                        {formatAddressParts(lead.address).map((part, pIdx) => (
                          <div key={pIdx} className="text-[9px] truncate leading-snug">{part}</div>
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <div key={`empty-${cellIdx}`} className="print-label-cell" />
                    );
                  }
                })}
              </div>
            ));
          })()}
        </div>
      )}

      {/* Modal overlay for Logging Delivery Date */}
      {deliveryDatePromptLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-850 flex items-center justify-between bg-slate-900/60">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📅</span> Log Delivery Date
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Marking <span className="text-indigo-400 font-semibold">{deliveryDatePromptLead.name}</span> as delivered.
                </p>
              </div>
            </div>
            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-2">
                  Delivery Date (Compulsory)
                </label>
                <input
                  type="date"
                  value={selectedDeliveryDate}
                  onChange={(e) => setSelectedDeliveryDate(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                />
              </div>
            </div>
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-850 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeliveryDatePromptLead(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDeliveryDate}
                disabled={!selectedDeliveryDate}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                  selectedDeliveryDate
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                ✓ Confirm Delivery
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
