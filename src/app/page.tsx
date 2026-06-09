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
  status: 'new' | 'printed' | 'delivered' | 'responded' | 'first_call' | 'meeting_booked' | 'meeting_completed' | 'proposal_sent' | 'follow_up_sent' | 'won' | 'lost' | 'not_suitable' | 'no_response';
  notes: string | null;
  next_contact_date: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  delivery_date: string | null;
  base_version: string | null;
  category_variant: string | null;
  full_template_key: string | null;
  offer_price: number | null;
  printed_date: string | null;
  first_response_date: string | null;
  first_call_date: string | null;
  meeting_booked_date: string | null;
  meeting_completed_date: string | null;
  proposal_sent_date: string | null;
  follow_up_sent_date: string | null;
  won_date: string | null;
  lost_date: string | null;
  not_suitable_date: string | null;
  no_response_date: string | null;
  outcome_reason: string | null;
  outcome_reason_other: string | null;
  created_at: string;
}

interface Milestone {
  id: string;
  title: string;
  type: 'activity' | 'conversion' | 'revenue' | 'category';
  metric: string;
  target_value: number;
  current_value?: number;
  reward: string | null;
  completed_date: string | null;
  celebration_notes: string | null;
  archived?: boolean;
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
  onUpdateStatus: (id: string, name: string, status: Lead["status"]) => void | Promise<void>;
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
  const [selectedTab, setSelectedTab] = useState<'find' | 'crm' | 'map' | 'performance' | 'milestones'>('find');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days'>('7days');
  const [crmStatusFilter, setCrmStatusFilter] = useState<'all' | 'new' | 'printed' | 'delivered' | 'responded' | 'first_call' | 'meeting_booked' | 'meeting_completed' | 'proposal_sent' | 'follow_up_sent' | 'won' | 'lost' | 'not_suitable' | 'no_response'>('all');

  // Milestones Tab State
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [milestoneFilter, setMilestoneFilter] = useState<'incomplete' | 'completed' | 'all'>('incomplete');

  // Milestone creation/editing configuration modal state
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [mFormTitle, setMFormTitle] = useState("");
  const [mFormType, setMFormType] = useState<'activity' | 'conversion' | 'revenue' | 'category'>('activity');
  const [mFormMetric, setMFormMetric] = useState("letters_delivered");
  const [mFormTargetValue, setMFormTargetValue] = useState(10);
  const [mFormReward, setMFormReward] = useState("");
  const [mFormArchived, setMFormArchived] = useState(false);
  const [mFormCelebrationNotes, setMFormCelebrationNotes] = useState("");

  // CRM Leads Filtering, Sorting, Pagination, Inline Contact Editing state
  const [crmHideNegativeOutcomes, setCrmHideNegativeOutcomes] = useState(true);
  const [crmSortOrder, setCrmSortOrder] = useState<'incorporation_desc' | 'incorporation_asc' | 'name_asc' | 'next_contact_asc' | 'created_desc'>('incorporation_desc');
  const [crmPageSize, setCrmPageSize] = useState(50);
  const [crmCurrentPage, setCrmCurrentPage] = useState(1);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState("");
  const [editingEmail, setEditingEmail] = useState("");
  const [editingContactName, setEditingContactName] = useState("");

  // Unified Status Change date/notes/outcome picker modal state
  const [statusModalLead, setStatusModalLead] = useState<{ id: string; name: string; targetStatus: Lead['status']; currentStatus: Lead['status'] } | null>(null);
  const [selectedStatusDate, setSelectedStatusDate] = useState("");
  const [outcomeReason, setOutcomeReason] = useState("");
  const [outcomeReasonOther, setOutcomeReasonOther] = useState("");
  const [wonDealValue, setWonDealValue] = useState(300);

  // Performance Tab Filters State
  const [perfFilterDateStart, setPerfFilterDateStart] = useState("");
  const [perfFilterDateEnd, setPerfFilterDateEnd] = useState("");
  const [perfFilterCategory, setPerfFilterCategory] = useState("all");
  const [perfFilterTemplate, setPerfFilterTemplate] = useState("all");
  const [perfFilterPriceMin, setPerfFilterPriceMin] = useState(0);
  const [perfFilterPriceMax, setPerfFilterPriceMax] = useState(1000);

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

  const fetchMilestones = useCallback(async () => {
    setLoadingMilestones(true);
    try {
      const res = await fetch("/api/milestones");
      if (!res.ok) throw new Error("Failed to load milestones");
      const data = await res.json();
      setMilestones(data);
    } catch (err) {
      console.error(err);
      triggerAlert("Could not load motivation milestones", "error");
    } finally {
      setLoadingMilestones(false);
    }
  }, [triggerAlert]);

  // Initial load
  useEffect(() => {
    fetchLocations();
    fetchLeads();
    fetchMilestones();
  }, [fetchLocations, fetchLeads, fetchMilestones]);

  // Save Phone & Email for Lead inline
  const handleSaveContactInfo = async (id: string) => {
    try {
      const res = await fetch("/api/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          phone: editingPhone,
          email: editingEmail,
          contact_name: editingContactName
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save contact info");
      }

      setLeads(prev => prev.map(l => l.id === id ? { ...l, phone: editingPhone, email: editingEmail, contact_name: editingContactName } : l));
      setEditingContactId(null);
      triggerAlert("Contact info updated successfully", "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to update contact info", "error");
    }
  };

  // Archive / Unarchive Milestone
  const handleArchiveMilestone = async (id: string, archived: boolean) => {
    try {
      const res = await fetch("/api/milestones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, archived })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update archive status");
      }

      const updated = await res.json();
      setMilestones(prev => prev.map(m => m.id === id ? updated : m));
      triggerAlert(archived ? "Milestone archived" : "Milestone unarchived", "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to update archive status", "error");
    }
  };

  // Milestone modal control
  const handleOpenMilestoneModal = (milestone: Milestone | null) => {
    setEditingMilestone(milestone);
    if (milestone) {
      setMFormTitle(milestone.title);
      setMFormType(milestone.type);
      setMFormMetric(milestone.metric);
      setMFormTargetValue(milestone.target_value);
      setMFormReward(milestone.reward || "");
      setMFormArchived(milestone.archived || false);
      setMFormCelebrationNotes(milestone.celebration_notes || "");
    } else {
      setMFormTitle("");
      setMFormType("activity");
      setMFormMetric("letters_delivered");
      setMFormTargetValue(10);
      setMFormReward("");
      setMFormArchived(false);
      setMFormCelebrationNotes("");
    }
    setIsMilestoneModalOpen(true);
  };

  // Milestone Save config (Creation / Editing)
  const handleSaveMilestoneConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mFormTitle.trim()) {
      triggerAlert("Title is required", "warning");
      return;
    }

    try {
      const payload = {
        id: editingMilestone ? editingMilestone.id : undefined,
        title: mFormTitle.trim(),
        type: mFormType,
        metric: mFormMetric,
        target_value: Number(mFormTargetValue),
        reward: mFormReward.trim() || null,
        archived: mFormArchived,
        celebration_notes: mFormCelebrationNotes.trim() || null,
        completed_date: editingMilestone ? editingMilestone.completed_date : null
      };

      const endpoint = "/api/milestones";
      const method = editingMilestone ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save milestone");
      }

      const saved = await res.json();
      
      if (editingMilestone) {
        setMilestones(prev => prev.map(m => m.id === editingMilestone.id ? { ...m, ...saved } : m));
        triggerAlert("Milestone updated successfully", "success");
      } else {
        setMilestones(prev => [...prev, saved]);
        triggerAlert("Milestone created successfully", "success");
      }
      setIsMilestoneModalOpen(false);
      setEditingMilestone(null);
    } catch (err: any) {
      triggerAlert(err.message || "Failed to save milestone config", "error");
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm("Are you sure you want to delete this milestone?")) return;
    try {
      const res = await fetch(`/api/milestones?id=${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete milestone");
      }

      setMilestones(prev => prev.filter(m => m.id !== id));
      triggerAlert("Milestone deleted", "success");
      setIsMilestoneModalOpen(false);
      setEditingMilestone(null);
    } catch (err: any) {
      triggerAlert(err.message || "Failed to delete milestone", "error");
    }
  };

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
      
      // Remove item from discovery view so it disappears
      setDiscoveredCompanies(prev => prev.filter(c => c.company_number !== company.company_number));

      triggerAlert(`Started tracking "${company.name}"`, "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to track lead", "error");
    }
  };

  // Mark Company as Unsuitable directly
  const handleMarkUnsuitable = async (company: DiscoveredCompany) => {
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
          sic_codes: company.sic_codes,
          status: 'not_suitable'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to mark as unsuitable");
      }

      // Refresh leads list
      await fetchLeads();
      
      // Remove item from discovery view so it disappears
      setDiscoveredCompanies(prev => prev.filter(c => c.company_number !== company.company_number));

      triggerAlert(`Marked "${company.name}" as unsuitable`, "success");
    } catch (err: any) {
      triggerAlert(err.message || "Failed to mark as unsuitable", "error");
    }
  };

  // Helper to get preceding status date for "Same as previous step" feature
  const getPrecedingStatusDate = (lead: Lead, targetStatus: Lead["status"]) => {
    const order: { status: Lead["status"]; key: keyof Lead }[] = [
      { status: 'printed', key: 'printed_date' },
      { status: 'delivered', key: 'delivery_date' },
      { status: 'responded', key: 'first_response_date' },
      { status: 'first_call', key: 'first_call_date' },
      { status: 'meeting_booked', key: 'meeting_booked_date' },
      { status: 'meeting_completed', key: 'meeting_completed_date' },
      { status: 'proposal_sent', key: 'proposal_sent_date' },
      { status: 'follow_up_sent', key: 'follow_up_sent_date' },
      { status: 'won', key: 'won_date' },
      { status: 'lost', key: 'lost_date' },
      { status: 'not_suitable', key: 'not_suitable_date' },
      { status: 'no_response', key: 'no_response_date' }
    ];

    const targetIndex = order.findIndex(o => o.status === targetStatus);
    if (targetIndex <= 0) return null;

    for (let i = targetIndex - 1; i >= 0; i--) {
      const val = lead[order[i].key];
      if (val) return val as string;
    }
    return null;
  };

  // Update CRM Lead Status (opens modal/prompts for details)
  const handleUpdateStatus = (id: string, name: string, status: Lead["status"]) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    
    setStatusModalLead({ id, name, targetStatus: status, currentStatus: lead.status });
    setSelectedStatusDate(new Date().toISOString().split("T")[0]);
    setOutcomeReason("");
    setOutcomeReasonOther("");
    setWonDealValue(lead.offer_price || 300);
  };

  // Save detailed status change (from modal)
  const handleSaveStatusDetails = async () => {
    if (!statusModalLead) return;
    const { id, name, targetStatus } = statusModalLead;
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    const dateKeyMap: Record<Lead["status"], keyof Lead | null> = {
      new: null,
      printed: "printed_date",
      delivered: "delivery_date",
      responded: "first_response_date",
      first_call: "first_call_date",
      meeting_booked: "meeting_booked_date",
      meeting_completed: "meeting_completed_date",
      proposal_sent: "proposal_sent_date",
      follow_up_sent: "follow_up_sent_date",
      won: "won_date",
      lost: "lost_date",
      not_suitable: "not_suitable_date",
      no_response: "no_response_date"
    };

    const dateField = dateKeyMap[targetStatus];
    const payload: any = {
      id,
      status: targetStatus
    };

    if (dateField && selectedStatusDate) {
      payload[dateField] = selectedStatusDate;
    }

    if (['lost', 'not_suitable', 'no_response'].includes(targetStatus)) {
      payload.outcome_reason = outcomeReason;
      if (outcomeReason === 'Other') {
        payload.outcome_reason_other = outcomeReasonOther;
      }
    }

    if (targetStatus === 'won') {
      payload.offer_price = Number(wonDealValue);
    }

    try {
      const res = await fetch("/api/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status details");
      }

      const updatedLead = await res.json();
      setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updatedLead } : l));
      setStatusModalLead(null);
      triggerAlert(`Updated "${name}" status to ${targetStatus}`, "success");
      
      // Refresh milestones calculation in background
      fetchMilestones();
    } catch (err: any) {
      triggerAlert(err.message || "Failed to update status details", "error");
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
    if (crmStatusFilter === "all") {
      if (crmHideNegativeOutcomes && ['lost', 'not_suitable', 'no_response'].includes(l.status)) {
        return false;
      }
      return true;
    }
    return l.status === crmStatusFilter;
  });

  // Sorted CRM Leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (crmSortOrder === 'incorporation_desc') {
      return new Date(b.incorporation_date).getTime() - new Date(a.incorporation_date).getTime();
    }
    if (crmSortOrder === 'incorporation_asc') {
      return new Date(a.incorporation_date).getTime() - new Date(b.incorporation_date).getTime();
    }
    if (crmSortOrder === 'name_asc') {
      return a.name.localeCompare(b.name);
    }
    if (crmSortOrder === 'next_contact_asc') {
      if (!a.next_contact_date) return 1;
      if (!b.next_contact_date) return -1;
      return new Date(a.next_contact_date).getTime() - new Date(b.next_contact_date).getTime();
    }
    if (crmSortOrder === 'created_desc') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });

  // Paginated CRM Leads
  const totalPages = Math.ceil(sortedLeads.length / crmPageSize) || 1;
  const currentPageSafe = Math.min(crmCurrentPage, totalPages);
  const startIndex = (currentPageSafe - 1) * crmPageSize;
  const paginatedLeads = sortedLeads.slice(startIndex, startIndex + crmPageSize);

  // Performance Analytics computations
  const perfFilteredLeads = leads.filter(l => {
    if (perfFilterDateStart && l.delivery_date) {
      if (new Date(l.delivery_date) < new Date(perfFilterDateStart)) return false;
    }
    if (perfFilterDateEnd && l.delivery_date) {
      if (new Date(l.delivery_date) > new Date(perfFilterDateEnd)) return false;
    }
    if (perfFilterCategory !== "all" && l.industry_category !== perfFilterCategory) {
      return false;
    }
    if (perfFilterTemplate !== "all" && l.base_version !== perfFilterTemplate) {
      return false;
    }
    const offerVal = l.offer_price || 300;
    if (offerVal < perfFilterPriceMin || offerVal > perfFilterPriceMax) {
      return false;
    }
    return true;
  });

  const perfDeliveredCount = perfFilteredLeads.filter(l => l.delivery_date !== null || l.status === 'delivered').length;
  
  const hasResponded = (l: Lead) => l.first_response_date !== null || !['new', 'printed', 'delivered'].includes(l.status);
  const perfResponseCount = perfFilteredLeads.filter(hasResponded).length;
  
  const hasBookedMeeting = (l: Lead) => l.meeting_booked_date !== null || !['new', 'printed', 'delivered', 'responded', 'first_call'].includes(l.status);
  const perfMeetingCount = perfFilteredLeads.filter(hasBookedMeeting).length;
  
  const hasSentProposal = (l: Lead) => l.proposal_sent_date !== null || ['proposal_sent', 'follow_up_sent', 'won'].includes(l.status);
  const perfProposalCount = perfFilteredLeads.filter(hasSentProposal).length;
  
  const perfWonCount = perfFilteredLeads.filter(l => l.status === 'won').length;
  
  const responseRate = perfDeliveredCount > 0 ? Math.round((perfResponseCount / perfDeliveredCount) * 100) : 0;
  const meetingRate = perfResponseCount > 0 ? Math.round((perfMeetingCount / perfResponseCount) * 100) : 0;
  const proposalRate = perfMeetingCount > 0 ? Math.round((perfProposalCount / perfMeetingCount) * 100) : 0;
  const winRate = perfDeliveredCount > 0 ? Math.round((perfWonCount / perfDeliveredCount) * 100) : 0;
  
  const perfTotalRevenue = perfFilteredLeads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.offer_price || 300), 0);
  const perfMrr = perfWonCount * 25;

  const getAverageDays = (startField: keyof Lead, endField: keyof Lead) => {
    let sum = 0;
    let count = 0;
    perfFilteredLeads.forEach(l => {
      const start = l[startField];
      const end = l[endField];
      if (start && end) {
        const diff = new Date(end as string).getTime() - new Date(start as string).getTime();
        const days = Math.round(diff / (1000 * 60 * 60 * 24));
        if (days >= 0) {
          sum += days;
          count++;
        }
      }
    });
    return count > 0 ? Math.round((sum / count) * 10) / 10 : null;
  };

  const avgDaysToRespond = getAverageDays("delivery_date", "first_response_date");
  const avgDaysToWin = getAverageDays("delivery_date", "won_date");

  // Template variations performance breakdown
  const templateBreakdown: Record<string, { total: number; responded: number; won: number }> = {};
  leads.forEach(l => {
    if (l.base_version) {
      const key = l.base_version;
      if (!templateBreakdown[key]) {
        templateBreakdown[key] = { total: 0, responded: 0, won: 0 };
      }
      templateBreakdown[key].total++;
      if (hasResponded(l)) templateBreakdown[key].responded++;
      if (l.status === 'won') templateBreakdown[key].won++;
    }
  });

  // Outcome reasons breakdown
  const outcomeReasonBreakdown: Record<string, number> = {};
  leads.forEach(l => {
    if (['lost', 'not_suitable', 'no_response'].includes(l.status) && l.outcome_reason) {
      const key = `${l.status.replace('_', ' ')}: ${l.outcome_reason}`;
      outcomeReasonBreakdown[key] = (outcomeReasonBreakdown[key] || 0) + 1;
    }
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
              {leads.filter(l => !['lost', 'not_suitable', 'no_response'].includes(l.status)).length > 0 && (
                <span className="ml-auto bg-indigo-500 text-white font-semibold text-xs px-2 py-0.5 rounded-full" title="Total active leads">
                  {leads.filter(l => !['lost', 'not_suitable', 'no_response'].includes(l.status)).length}
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
            <button
              onClick={() => setSelectedTab('performance')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                selectedTab === 'performance'
                  ? 'bg-slate-800/80 text-white border-l-4 border-indigo-500 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Performance Analytics
            </button>
            <button
              onClick={() => setSelectedTab('milestones')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                selectedTab === 'milestones'
                  ? 'bg-slate-800/80 text-white border-l-4 border-indigo-500 shadow-inner'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0H4m8 0h8m-8 0a2 2 0 102 2h-2zm0 0a2 2 0 11-2 2h2z" />
              </svg>
              Motivation Milestones
              {milestones.filter(m => m.completed_date && !m.archived).length > 0 && (
                <span className="ml-auto bg-emerald-500 text-white font-semibold text-xs px-2 py-0.5 rounded-full" title="Completed active milestones">
                  {milestones.filter(m => m.completed_date && !m.archived).length}
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
                                <span className="text-xs text-slate-300">Initial Offer: <span className="text-indigo-400 font-semibold">Website (£300)</span></span>
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
                            Tracked ({company.lead_status?.replace('_', ' ') || ''})
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleMarkUnsuitable(company)}
                              className="bg-red-950/20 hover:bg-red-900 hover:text-white text-red-400 border border-red-900/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              Unsuitable
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTrackLead(company)}
                              className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-600 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer"
                            >
                              Track Lead
                            </button>
                          </div>
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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">CRM Lead Manager</h2>
                <p className="text-sm text-slate-400">Track status, record client notes, and set call back dates.</p>
              </div>

              {/* Status Filters */}
              <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex flex-wrap gap-1 text-xs font-medium self-start lg:self-center">
                {(['all', 'new', 'printed', 'delivered', 'responded', 'first_call', 'meeting_booked', 'meeting_completed', 'proposal_sent', 'follow_up_sent', 'won', 'lost', 'not_suitable', 'no_response'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => {
                      setCrmStatusFilter(status);
                      setCrmCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg capitalize transition-colors flex items-center gap-1.5 ${
                      crmStatusFilter === status
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${
                      status === 'all' ? 'bg-indigo-400' :
                      status === 'new' ? 'bg-sky-400' :
                      status === 'printed' ? 'bg-blue-500' :
                      status === 'delivered' ? 'bg-cyan-500' :
                      status === 'responded' ? 'bg-pink-400' :
                      status === 'first_call' ? 'bg-purple-400' :
                      status === 'meeting_booked' ? 'bg-purple-650' :
                      status === 'meeting_completed' ? 'bg-indigo-600' :
                      status === 'proposal_sent' ? 'bg-amber-400' :
                      status === 'follow_up_sent' ? 'bg-orange-400' :
                      status === 'won' ? 'bg-emerald-400' :
                      status === 'lost' ? 'bg-rose-500' :
                      status === 'not_suitable' ? 'bg-red-500' :
                      'bg-slate-500'
                    }`} />
                    {status.replace('_', ' ')}
                    {status !== 'all' && leads.filter(l => l.status === status).length > 0 && (
                      <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400">
                        {leads.filter(l => l.status === status).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort, Page Size and Filter Toolbar */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-sm">
              <div className="flex flex-wrap items-center gap-4">
                {crmStatusFilter === 'all' && (
                  <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={crmHideNegativeOutcomes}
                      onChange={e => {
                        setCrmHideNegativeOutcomes(e.target.checked);
                        setCrmCurrentPage(1);
                      }}
                      className="h-4.5 w-4.5 rounded border-slate-800 text-indigo-600 bg-slate-950 accent-indigo-500 cursor-pointer"
                    />
                    <span>Hide Lost / Not Suitable / No Response</span>
                  </label>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Sort selector */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Sort by:</span>
                  <select
                    value={crmSortOrder}
                    onChange={e => {
                      setCrmSortOrder(e.target.value as any);
                      setCrmCurrentPage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                  >
                    <option value="incorporation_desc" className="bg-slate-900 text-slate-100">Incorporation Date (Newest)</option>
                    <option value="incorporation_asc" className="bg-slate-900 text-slate-100">Incorporation Date (Oldest)</option>
                    <option value="name_asc" className="bg-slate-900 text-slate-100">Company Name (A-Z)</option>
                    <option value="next_contact_asc" className="bg-slate-900 text-slate-100">Callback Date (Earliest)</option>
                    <option value="created_desc" className="bg-slate-900 text-slate-100">Date Added (Newest)</option>
                  </select>
                </div>

                {/* Page Size selector */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium text-xs uppercase tracking-wider">Page Size:</span>
                  <select
                    value={crmPageSize}
                    onChange={e => {
                      setCrmPageSize(Number(e.target.value));
                      setCrmCurrentPage(1);
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                  >
                    <option value="10" className="bg-slate-900 text-slate-100">10</option>
                    <option value="25" className="bg-slate-900 text-slate-100">25</option>
                    <option value="50" className="bg-slate-900 text-slate-100">50</option>
                    <option value="100" className="bg-slate-900 text-slate-100">100</option>
                  </select>
                </div>
              </div>
            </div>

            {/* CRM Leads List */}
            {sortedLeads.length === 0 ? (
              <div className="bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto mt-12">
                <svg className="mx-auto h-12 w-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="text-lg font-bold text-slate-300">No leads found</h3>
                <p className="text-slate-500 text-sm mt-2">
                  {crmStatusFilter !== 'all' 
                    ? `You don't have any leads marked as "${crmStatusFilter.replace('_', ' ')}".` 
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
                      checked={sortedLeads.length > 0 && sortedLeads.every(l => selectedLabelIds.includes(l.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const toAdd = sortedLeads.map(l => l.id);
                          setSelectedLabelIds(prev => Array.from(new Set([...prev, ...toAdd])));
                        } else {
                          const toRemove = sortedLeads.map(l => l.id);
                          setSelectedLabelIds(prev => prev.filter(id => !toRemove.includes(id)));
                        }
                      }}
                      className="h-4.5 w-4.5 rounded border-slate-800 text-indigo-600 bg-slate-950 accent-indigo-500 cursor-pointer"
                    />
                    <span>Select All {sortedLeads.length} Leads in Filter for Address Labels</span>
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

                {paginatedLeads.map(lead => (
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-white tracking-tight leading-snug">{lead.name}</h3>
                            {!['new', 'printed', 'delivered'].includes(lead.status) && (!lead.phone || !lead.email || !lead.contact_name) && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                                ⚠️ Profile Incomplete
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            No. {lead.company_number} &bull; Incorporated: {formatDate(lead.incorporation_date)}
                          </p>
                        </div>
                      </div>

                      {/* Status selectors & Action options */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status buttons */}
                        <div className="bg-slate-950 p-1 border border-slate-850 rounded-xl flex flex-wrap gap-1 text-[11px] font-semibold">
                          {(['new', 'printed', 'delivered', 'responded', 'first_call', 'meeting_booked', 'meeting_completed', 'proposal_sent', 'follow_up_sent', 'won', 'lost', 'not_suitable', 'no_response'] as const).map(st => (
                            <button
                              key={st}
                              onClick={() => handleUpdateStatus(lead.id, lead.name, st)}
                              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                                lead.status === st
                                  ? st === 'new' ? 'bg-sky-500/25 text-sky-300 border border-sky-500/20' :
                                    st === 'printed' ? 'bg-blue-500/25 text-blue-300 border border-blue-500/20' :
                                    st === 'delivered' ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/20' :
                                    st === 'responded' ? 'bg-pink-500/25 text-pink-300 border border-pink-500/20' :
                                    st === 'first_call' ? 'bg-purple-500/25 text-purple-300 border border-purple-500/20' :
                                    st === 'meeting_booked' ? 'bg-purple-600/25 text-purple-300 border border-purple-650/20' :
                                    st === 'meeting_completed' ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-600/20' :
                                    st === 'proposal_sent' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/20' :
                                    st === 'follow_up_sent' ? 'bg-orange-500/25 text-orange-300 border border-orange-500/20' :
                                    st === 'won' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/20' :
                                    st === 'lost' ? 'bg-rose-500/25 text-rose-300 border border-rose-500/20' :
                                    st === 'not_suitable' ? 'bg-red-500/25 text-red-300 border border-red-500/20' :
                                    'bg-slate-500/25 text-slate-300 border border-slate-500/20'
                                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
                              }`}
                            >
                              {st.replace('_', ' ')}
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
                                <span className="text-indigo-300 font-semibold">Website (£{lead.offer_price || 300})</span>
                              </p>
                              {lead.delivery_date && lead.status === 'delivered' && (
                                <p className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                                  <span className="text-[14px]">📅</span> Delivered: {formatDate(lead.delivery_date)}
                                </p>
                              )}
                              {lead.outcome_reason && (
                                <div className="text-rose-400 text-xs font-semibold bg-rose-955/20 border border-rose-900/30 p-2 rounded-lg mt-2">
                                  Outcome: {lead.outcome_reason} {lead.outcome_reason_other ? `(${lead.outcome_reason_other})` : ''}
                                </div>
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

                      {/* Middle: Callback & Contact Info Editor */}
                      <div className="text-sm space-y-4">
                        <div>
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

                        {/* Phone & Email contact details editor */}
                        <div className="pt-3 border-t border-slate-850/40 space-y-2">
                          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Contact Information</span>
                          {editingContactId === lead.id ? (
                            <div className="space-y-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Contact Person Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Jane Doe"
                                  value={editingContactName}
                                  onChange={e => setEditingContactName(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-750 focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Phone Number</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 07123 456789"
                                  value={editingPhone}
                                  onChange={e => setEditingPhone(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-750 focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5 font-medium">Email Address</label>
                                <input
                                  type="email"
                                  placeholder="e.g. name@company.com"
                                  value={editingEmail}
                                  onChange={e => setEditingEmail(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-750 focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveContactInfo(lead.id)}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingContactId(null)}
                                  className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 text-xs">
                              <p className="text-slate-400 flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">Name:</span>
                                {lead.contact_name ? (
                                  <strong className="text-slate-300 font-semibold">{lead.contact_name}</strong>
                                ) : (
                                  <span className="text-slate-600 italic">Not set</span>
                                )}
                              </p>
                              <p className="text-slate-400 flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">Phone:</span>
                                {lead.phone ? (
                                  <strong className="text-slate-300 font-semibold">{lead.phone}</strong>
                                ) : (
                                  <span className="text-slate-600 italic">Not set</span>
                                )}
                              </p>
                              <p className="text-slate-400 flex items-center gap-1.5">
                                <span className="text-slate-500 font-medium">Email:</span>
                                {lead.email ? (
                                  <a href={`mailto:${lead.email}`} className="text-indigo-400 hover:underline break-all">{lead.email}</a>
                                ) : (
                                  <span className="text-slate-600 italic">Not set</span>
                                )}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingContactId(lead.id);
                                  setEditingPhone(lead.phone || "");
                                  setEditingEmail(lead.email || "");
                                  setEditingContactName(lead.contact_name || "");
                                }}
                                className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold mt-1 block"
                              >
                                Edit Contact Details
                              </button>
                            </div>
                          )}
                        </div>
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

            {/* Pagination Controls */}
            {sortedLeads.length > crmPageSize && (
              <div className="flex items-center justify-between bg-slate-900/20 border border-slate-850/60 rounded-xl px-6 py-4 mt-6 text-sm">
                <div className="text-slate-400">
                  Showing <span className="font-semibold text-white">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold text-white">
                    {Math.min(startIndex + crmPageSize, sortedLeads.length)}
                  </span>{' '}
                  of <span className="font-semibold text-white">{sortedLeads.length}</span> leads
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPageSafe === 1}
                    onClick={() => setCrmCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-400 font-medium">
                    Page {currentPageSafe} of {totalPages}
                  </span>
                  <button
                    disabled={currentPageSafe === totalPages}
                    onClick={() => setCrmCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
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

        {selectedTab === 'performance' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-2">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
                  <span>📊</span> Performance Analytics
                </h2>
                <p className="text-sm text-slate-400">Analyze rates, timelines, template conversions, and deal values.</p>
              </div>
            </div>

            {/* Performance Analytics Filters */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-slate-500 font-semibold block mb-1 uppercase tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={perfFilterDateStart}
                  onChange={e => setPerfFilterDateStart(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-500 font-semibold block mb-1 uppercase tracking-wider">End Date</label>
                <input
                  type="date"
                  value={perfFilterDateEnd}
                  onChange={e => setPerfFilterDateEnd(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-500 font-semibold block mb-1 uppercase tracking-wider">Industry Category</label>
                <select
                  value={perfFilterCategory}
                  onChange={e => setPerfFilterCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-100">All Categories</option>
                  {Array.from(new Set(leads.map(l => l.industry_category).filter(Boolean))).map(cat => (
                    <option key={cat} value={cat || ""} className="bg-slate-900 text-slate-100">{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-500 font-semibold block mb-1 uppercase tracking-wider">Letter Template Version</label>
                <select
                  value={perfFilterTemplate}
                  onChange={e => setPerfFilterTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-100">All Templates</option>
                  {Array.from(new Set(leads.map(l => l.base_version).filter(Boolean))).map(tmpl => (
                    <option key={tmpl} value={tmpl || ""} className="bg-slate-900 text-slate-100">{tmpl}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-slate-500 font-semibold block mb-1 uppercase tracking-wider">Offer Price Range (£)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Min"
                    value={perfFilterPriceMin === 0 ? "" : perfFilterPriceMin}
                    onChange={e => setPerfFilterPriceMin(Number(e.target.value))}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-slate-500 font-bold">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={perfFilterPriceMax === 1000 ? "" : perfFilterPriceMax}
                    onChange={e => setPerfFilterPriceMax(e.target.value === "" ? 1000 : Number(e.target.value))}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Performance Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Revenue */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 text-slate-850 text-7xl font-bold opacity-10 pointer-events-none select-none">£</div>
                <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-2">Total Revenue Won</span>
                <span className="text-2xl font-black text-white">£{perfTotalRevenue.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 block mt-1">Based on manual won deal values</span>
              </div>

              {/* MRR won */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute right-0 bottom-0 text-slate-850 text-7xl font-bold opacity-10 pointer-events-none select-none">M</div>
                <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-2">Monthly Subscription MRR</span>
                <span className="text-2xl font-black text-indigo-400">£{perfMrr.toLocaleString()}/mo</span>
                <span className="text-[10px] text-slate-400 block mt-1">Won client subscription revenue (£25/mo)</span>
              </div>

              {/* Avg Response Time */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
                <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-2">Avg Days to Respond</span>
                <span className="text-2xl font-black text-white">
                  {avgDaysToRespond !== null ? `${avgDaysToRespond} days` : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">From letter delivery to initial enquiry</span>
              </div>

              {/* Avg Win Time */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 relative overflow-hidden">
                <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-2">Avg Days to Win</span>
                <span className="text-2xl font-black text-emerald-400">
                  {avgDaysToWin !== null ? `${avgDaysToWin} days` : 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">From letter delivery to won contract</span>
              </div>
            </div>

            {/* Funnel Progress stack chart */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Pipeline Conversion Funnel</h3>
              <div className="space-y-4">
                {/* 1. Delivered */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">1. Delivered Letters</span>
                    <span className="text-white">{perfDeliveredCount}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-5 rounded-lg overflow-hidden border border-slate-850 flex">
                    <div className="bg-blue-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300" style={{ width: '100%' }}>
                      100%
                    </div>
                  </div>
                </div>

                {/* 2. Responded */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">2. Responses / Enquiries</span>
                    <span className="text-white">{perfResponseCount} <span className="text-slate-500">({responseRate}% Response Rate)</span></span>
                  </div>
                  <div className="w-full bg-slate-950 h-5 rounded-lg overflow-hidden border border-slate-850">
                    <div className="bg-pink-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300" style={{ width: `${responseRate}%` }}>
                      {responseRate}%
                    </div>
                  </div>
                </div>

                {/* 3. Meeting */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">3. Meetings Booked</span>
                    <span className="text-white">{perfMeetingCount} <span className="text-slate-500">({meetingRate}% Response-to-Meeting)</span></span>
                  </div>
                  <div className="w-full bg-slate-950 h-5 rounded-lg overflow-hidden border border-slate-850">
                    <div className="bg-purple-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300" style={{ width: `${responseRate * (meetingRate / 100)}%` }}>
                      {meetingRate}%
                    </div>
                  </div>
                </div>

                {/* 4. Proposal */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">4. Proposals Sent</span>
                    <span className="text-white">{perfProposalCount} <span className="text-slate-500">({proposalRate}% Meeting-to-Proposal)</span></span>
                  </div>
                  <div className="w-full bg-slate-950 h-5 rounded-lg overflow-hidden border border-slate-850">
                    <div className="bg-amber-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300" style={{ width: `${responseRate * (meetingRate / 100) * (proposalRate / 100)}%` }}>
                      {proposalRate}%
                    </div>
                  </div>
                </div>

                {/* 5. Won */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">5. Client Deals Won</span>
                    <span className="text-white">{perfWonCount} <span className="text-slate-500">({winRate}% Win Rate)</span></span>
                  </div>
                  <div className="w-full bg-slate-950 h-5 rounded-lg overflow-hidden border border-slate-850">
                    <div className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300" style={{ width: `${winRate}%` }}>
                      {winRate}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance breakdowns tables grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Template variation conversion */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Template Variation Conversions</h3>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="pb-3 font-semibold">Template Key</th>
                        <th className="pb-3 font-semibold text-center">Delivered</th>
                        <th className="pb-3 font-semibold text-center">Responded</th>
                        <th className="pb-3 font-semibold text-center">Won</th>
                        <th className="pb-3 font-semibold text-right">Win Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(templateBreakdown).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-600 italic">No template tracking data available yet.</td>
                        </tr>
                      ) : (
                        Object.entries(templateBreakdown).map(([key, data]) => (
                          <tr key={key} className="border-b border-slate-850/50 hover:bg-slate-900/20">
                            <td className="py-3 font-mono font-semibold text-indigo-400">{key}</td>
                            <td className="py-3 text-center text-slate-300">{data.total}</td>
                            <td className="py-3 text-center text-slate-300">{data.responded}</td>
                            <td className="py-3 text-center text-slate-300">{data.won}</td>
                            <td className="py-3 text-right text-emerald-400 font-bold">
                              {data.total > 0 ? Math.round((data.won / data.total) * 100) : 0}%
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dead leads reasons */}
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Dead Leads Breakdown by Reason</h3>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500">
                        <th className="pb-3 font-semibold">Stage & Reason</th>
                        <th className="pb-3 font-semibold text-right">Lead Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(outcomeReasonBreakdown).length === 0 ? (
                        <tr>
                          <td colSpan={2} className="py-4 text-center text-slate-650 italic">No logged negative outcome reasons.</td>
                        </tr>
                      ) : (
                        Object.entries(outcomeReasonBreakdown).map(([reason, count]) => (
                          <tr key={reason} className="border-b border-slate-850/50 hover:bg-slate-900/20">
                            <td className="py-3 text-slate-300 font-medium capitalize">{reason}</td>
                            <td className="py-3 text-right text-rose-400 font-bold">{count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'milestones' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-2">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
                  <span>🏆</span> Motivation Milestones
                </h2>
                <p className="text-sm text-slate-400">Set targets, track metrics, and reward progression through the sales funnel.</p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenMilestoneModal(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-600/10 active:scale-95 flex items-center gap-2 self-start lg:self-center cursor-pointer"
              >
                <span>+</span> Add Custom Milestone
              </button>
            </div>

            {/* Filters toggle */}
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1 text-xs font-semibold w-fit">
              {(['incomplete', 'completed', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setMilestoneFilter(f)}
                  className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                    milestoneFilter === f
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f === 'completed' ? 'Completed (Active)' : f}
                </button>
              ))}
            </div>

            {loadingMilestones ? (
              <div className="flex items-center justify-center p-20 text-slate-500">
                <span className="animate-pulse">Loading milestones...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {milestones
                  .filter(m => {
                    if (milestoneFilter === 'incomplete') return !m.completed_date && !m.archived;
                    if (milestoneFilter === 'completed') return m.completed_date && !m.archived;
                    return true;
                  })
                  .map(m => {
                    const percent = m.completed_date ? 100 : Math.min(Math.round(((m.current_value || 0) / m.target_value) * 100), 99);
                    
                    return (
                      <div
                        key={m.id}
                        className={`bg-slate-900/40 border rounded-2xl p-6 flex flex-col justify-between transition-all duration-155 ${
                          m.completed_date 
                            ? m.archived 
                              ? 'border-slate-800 opacity-60' 
                              : 'border-emerald-500/30 bg-emerald-955/5 shadow-lg shadow-emerald-950/5'
                            : 'border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        <div>
                          {/* Header: Type and Action buttons */}
                          <div className="flex justify-between items-start mb-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                              m.type === 'activity' ? 'bg-sky-950/60 border border-sky-900/50 text-sky-400' :
                              m.type === 'conversion' ? 'bg-pink-955/60 border border-pink-900/50 text-pink-400' :
                              m.type === 'revenue' ? 'bg-emerald-950/60 border border-emerald-900/50 text-emerald-400' :
                              'bg-purple-950/60 border border-purple-900/50 text-purple-400'
                            }`}>
                              {m.type}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {/* Edit Milestone */}
                              <button
                                onClick={() => handleOpenMilestoneModal(m)}
                                className="text-slate-500 hover:text-indigo-400 p-1.5 bg-slate-950/30 hover:bg-slate-950/80 rounded-lg transition-all"
                                title="Edit milestone configuration"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>

                              {/* Archive/Unarchive action button */}
                              <button
                                onClick={() => handleArchiveMilestone(m.id, !m.archived)}
                                className="text-slate-505 hover:text-slate-300 p-1.5 bg-slate-950/30 hover:bg-slate-950/80 rounded-lg transition-all"
                                title={m.archived ? "Unarchive milestone" : "Archive milestone"}
                              >
                                {m.archived ? (
                                  <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
                                  </svg>
                                ) : (
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>

                          <h3 className="text-base font-bold text-white mb-1 leading-snug">{m.title}</h3>
                          <p className="text-xs text-slate-500 font-mono mb-4">
                            Metric: {m.metric.replace(/_/g, ' ')} &bull; Target: {m.target_value}
                          </p>

                          {/* Reward area */}
                          {m.reward && (
                            <div className="flex items-center gap-1.5 mb-4 text-xs font-semibold bg-indigo-950/20 border border-indigo-900/30 text-indigo-300 px-3 py-1.5 rounded-xl w-fit">
                              <span>🎁 Reward:</span>
                              <strong>{m.reward}</strong>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 pt-2">
                          {/* Progress/Completion indicators */}
                          {m.completed_date ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold bg-emerald-950/25 border border-emerald-900/30 p-2.5 rounded-xl">
                                <span className="flex items-center gap-1.5">
                                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Completed!
                                </span>
                                <span>{formatDate(m.completed_date)}</span>
                              </div>

                              {/* Celebration success note display */}
                              {m.celebration_notes ? (
                                <p className="text-xs text-slate-400 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                                  &ldquo;{m.celebration_notes}&rdquo;
                                </p>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenMilestoneModal(m)}
                                  className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold"
                                >
                                  + Record celebration memory
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs font-semibold text-slate-400">
                                <span>Progress</span>
                                <span>{m.current_value || 0} / {m.target_value} ({percent}%)</span>
                              </div>
                              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                                <div
                                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {m.archived && (
                            <div className="text-[10px] uppercase font-bold tracking-widest text-amber-500 mt-2">
                              📁 Archived (Hidden in main dashboard)
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
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
                    <div className="mt-8 pt-4 border-t border-zinc-200 text-center">
                      <div className="text-xs text-slate-500 mb-2">
                        74 Broadlee, Wilnecote, Tamworth, B77 4PG
                      </div>

                      <div className="text-sm text-slate-700">
                        <div>{senderPhone}</div>
                        <div>
                          {senderEmail} • {senderWebsite}
                        </div>
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
                      <div
                        key={lead.id}
                        className="print-label-cell overflow-hidden px-2 py-1"
                      >
                        <div className="font-bold text-[12px] uppercase tracking-tight truncate leading-tight mb-0.5">
                          {lead.name}
                        </div>

                        {formatAddressParts(lead.address).map((part, pIdx) => (
                          <div
                            key={pIdx}
                            className="text-[11px] truncate leading-tight"
                          >
                            {part}
                          </div>
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

      {/* Unified Status Logger Modal */}
      {statusModalLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-850 flex items-center justify-between bg-slate-900/60">
              <div>
                <h3 className="text-lg font-bold text-white capitalize flex items-center gap-2">
                  <span>📅</span> Log Status: {statusModalLead.targetStatus.replace('_', ' ')}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Log details for updating <span className="text-indigo-400 font-semibold">{statusModalLead.name}</span>.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {/* Date Input */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold block">
                  Event Date
                </label>
                <input
                  type="date"
                  value={selectedStatusDate}
                  onChange={e => setSelectedStatusDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedStatusDate(new Date().toISOString().split("T")[0])}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold px-2 py-1 rounded transition-colors"
                  >
                    Today
                  </button>
                  {(() => {
                    const lead = leads.find(l => l.id === statusModalLead.id);
                    if (lead) {
                      const precedingDate = getPrecedingStatusDate(lead, statusModalLead.targetStatus);
                      if (precedingDate) {
                        return (
                          <button
                            type="button"
                            onClick={() => setSelectedStatusDate(precedingDate)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold px-2 py-1 rounded transition-colors"
                          >
                            Same as previous ({formatDate(precedingDate)})
                          </button>
                        );
                      }
                    }
                    return null;
                  })()}
                  <button
                    type="button"
                    onClick={() => setSelectedStatusDate("")}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold px-2 py-1 rounded transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Special field for Won deal value */}
              {statusModalLead.targetStatus === 'won' && (
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold block">
                    Agreed Deal Value (£)
                  </label>
                  <input
                    type="number"
                    value={wonDealValue}
                    onChange={e => setWonDealValue(Number(e.target.value))}
                    min={1}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-sans"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Specify the agreed value of the website deal rather than assuming it at the original offer price.
                  </p>
                </div>
              )}

              {/* Special dropdowns for Negative Outcomes */}
              {['lost', 'not_suitable', 'no_response'].includes(statusModalLead.targetStatus) && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold block">
                      Outcome Reason
                    </label>
                    <select
                      value={outcomeReason}
                      onChange={e => setOutcomeReason(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="" className="bg-slate-905 text-slate-100">-- Select a reason --</option>
                      {statusModalLead.targetStatus === 'lost' && (
                        <>
                          <option value="Already has website" className="bg-slate-905 text-slate-100">Already has website</option>
                          <option value="Not interested" className="bg-slate-905 text-slate-100">Not interested</option>
                          <option value="Budget constraint" className="bg-slate-905 text-slate-100">Budget constraint</option>
                          <option value="No need/Too small" className="bg-slate-905 text-slate-100">No need/Too small</option>
                          <option value="Other" className="bg-slate-905 text-slate-100">Other</option>
                        </>
                      )}
                      {statusModalLead.targetStatus === 'not_suitable' && (
                        <>
                          <option value="Not local" className="bg-slate-905 text-slate-100">Not local</option>
                          <option value="Out of business / Inactive" className="bg-slate-905 text-slate-100">Out of business / Inactive</option>
                          <option value="Wrong industry classification" className="bg-slate-905 text-slate-100">Wrong industry classification</option>
                          <option value="Other" className="bg-slate-905 text-slate-100">Other</option>
                        </>
                      )}
                      {statusModalLead.targetStatus === 'no_response' && (
                        <>
                          <option value="No answer phone/email" className="bg-slate-905 text-slate-100">No answer phone/email</option>
                          <option value="Letter returned" className="bg-slate-905 text-slate-100">Letter returned</option>
                          <option value="Other" className="bg-slate-905 text-slate-100">Other</option>
                        </>
                      )}
                    </select>
                  </div>

                  {outcomeReason === 'Other' && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold block">
                        Specify Reason
                      </label>
                      <input
                        type="text"
                        placeholder="Please detail..."
                        value={outcomeReasonOther}
                        onChange={e => setOutcomeReasonOther(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-sans"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-850 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStatusModalLead(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStatusDetails}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all cursor-pointer active:scale-95"
              >
                ✓ Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Config Modal */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-fade-in">
          <form onSubmit={handleSaveMilestoneConfig} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-850 flex items-center justify-between bg-slate-900/60">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>🏆</span> {editingMilestone ? "Edit Milestone" : "Add Motivation Milestone"}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Specify tracked metric targets and rewards to motivate the sales funnel.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-sm">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold block">
                  Milestone Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100 Letters Delivered"
                  value={mFormTitle}
                  onChange={e => setMFormTitle(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Type */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold block">
                    Type
                  </label>
                  <select
                    value={mFormType}
                    onChange={e => setMFormType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="activity" className="bg-slate-900 text-slate-100">Activity</option>
                    <option value="conversion" className="bg-slate-900 text-slate-100">Conversion</option>
                    <option value="revenue" className="bg-slate-900 text-slate-100">Revenue</option>
                    <option value="category" className="bg-slate-900 text-slate-100">Category Unlock</option>
                  </select>
                </div>

                {/* Target Value */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold block">
                    Target Value
                  </label>
                  <input
                    type="number"
                    value={mFormTargetValue}
                    onChange={e => setMFormTargetValue(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>
              </div>

              {/* Metric Select */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold block">
                  Tracked Metric
                </label>
                <select
                  value={mFormMetric}
                  onChange={e => setMFormMetric(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                >
                  <option value="letters_delivered" className="bg-slate-900 text-slate-100">Letters Delivered</option>
                  <option value="follow_ups_sent" className="bg-slate-900 text-slate-100">Follow-ups Sent</option>
                  <option value="first_enquiry" className="bg-slate-900 text-slate-100">First Response/Enquiry</option>
                  <option value="first_meeting" className="bg-slate-900 text-slate-100">First Meeting Booked</option>
                  <option value="first_proposal" className="bg-slate-900 text-slate-100">First Proposal Sent</option>
                  <option value="first_client" className="bg-slate-900 text-slate-100">First Client Won</option>
                  <option value="total_revenue" className="bg-slate-900 text-slate-100">Total Revenue (£)</option>
                  <option value="mrr" className="bg-slate-900 text-slate-100">MRR (£)</option>
                  <option value="first_trades_client" className="bg-slate-900 text-slate-100">First Local Trades Won</option>
                  <option value="first_professional_services_client" className="bg-slate-900 text-slate-100">First Professional Services Won</option>
                  <option value="first_software_project" className="bg-slate-900 text-slate-100">First Software Project Won</option>
                </select>
              </div>

              {/* Reward offered */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold block">
                  Reward Offered
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pizza Party / early finish / champagne"
                  value={mFormReward}
                  onChange={e => setMFormReward(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              {/* Celebration notes */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold block">
                  Celebration / Success Notes
                </label>
                <textarea
                  placeholder="Notes about how this milestone was celebrated..."
                  value={mFormCelebrationNotes}
                  onChange={e => setMFormCelebrationNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              {/* Archived Status */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="mFormArchived"
                  checked={mFormArchived}
                  onChange={e => setMFormArchived(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-800 text-indigo-600 bg-slate-950 accent-indigo-500 cursor-pointer"
                />
                <label htmlFor="mFormArchived" className="text-xs text-slate-300 font-medium select-none cursor-pointer">
                  Archive this milestone (hide from standard motivational list)
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-850 flex justify-between gap-3">
              <div>
                {editingMilestone && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMilestone(editingMilestone.id)}
                    className="bg-red-950/20 border border-red-900/40 hover:bg-red-900 hover:text-white text-red-400 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMilestoneModalOpen(false);
                    setEditingMilestone(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 transition-all cursor-pointer active:scale-95"
                >
                  ✓ Confirm
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
