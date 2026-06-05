"use client";

import { useState, useEffect, useCallback } from "react";
import { defaultLetterTemplate } from "@/lib/templates";

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
  status: 'new' | 'contacted' | 'interested' | 'ignored';
  notes: string | null;
  next_contact_date: string | null;
  created_at: string;
}

interface DiscoveredCompany {
  company_number: string;
  name: string;
  incorporation_date: string;
  postcode: string | null;
  address: string | null;
  sic_codes: string | null;
  is_saved: boolean;
  lead_id: string | null;
  lead_status: Lead["status"] | null;
  lead_notes: string | null;
  lead_next_contact_date: string | null;
}

const renderBodyContent = (bodyText: string, textClassName: string) => {
  const placeholder = "[Offer Card]";
  if (bodyText.includes(placeholder)) {
    const parts = bodyText.split(placeholder);
    const intro = parts[0] || "";
    const outro = parts[1] || "";
    return (
      <div className="space-y-6">
        {intro.trim() && (
          <div className={`whitespace-pre-wrap ${textClassName}`}>{intro.trim()}</div>
        )}
        
        {/* Highlighted Card */}
        <div className="bg-[#F9F9FA] border border-zinc-200/80 p-6 rounded-[2rem] font-sans shadow-sm w-full">
          <h3 className="text-sm font-bold text-[#35b0f3] uppercase tracking-wider mb-3.5">
            New Business Website Offer
          </h3>
          
          <ul className="space-y-2.5 text-[13px] text-zinc-700">
            <li className="flex items-start gap-2.5">
              <span className="text-[#35b0f3] font-bold text-sm mt-0.5">✓</span>
              <span>Professional website</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#35b0f3] font-bold text-sm mt-0.5">✓</span>
              <span>Mobile friendly</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#35b0f3] font-bold text-sm mt-0.5">✓</span>
              <span>12 months hosting included</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#35b0f3] font-bold text-sm mt-0.5">✓</span>
              <span>
                <strong>£300</strong> <span className="text-zinc-400 font-normal line-through ml-1">instead of £1,200</span>
              </span>
            </li>
          </ul>
          
          <div className="mt-4 pt-4 border-t border-zinc-200/80 flex items-center justify-between text-xs">
            <span className="text-zinc-500 italic">Or pay monthly:</span>
            <span className="font-bold text-[#35b0f3] text-sm">£25/month for 12 months</span>
          </div>
        </div>

        {outro.trim() && (
          <div className={`whitespace-pre-wrap ${textClassName}`}>{outro.trim()}</div>
        )}
      </div>
    );
  }
  return <div className={`whitespace-pre-wrap ${textClassName}`}>{bodyText}</div>;
};

export default function Home() {
  // Navigation & Filters
  const [selectedTab, setSelectedTab] = useState<'find' | 'crm'>('find');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | '30days'>('7days');
  const [crmStatusFilter, setCrmStatusFilter] = useState<'all' | 'new' | 'contacted' | 'interested' | 'ignored'>('all');

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
    setRecipientGreetingName("Business Owner");
    setLetterBody(defaultLetterTemplate(lead.name, "Business Owner"));
    setLoadingDirector(true);
    
    try {
      const res = await fetch(`/api/leads/officers?company_number=${lead.company_number}`);
      if (res.ok) {
        const data = await res.json();
        if (data.director && data.director.firstName) {
          const name = data.director.firstName;
          setRecipientGreetingName(name);
          
          setLetterBody(prev => {
            const defaultWithPlaceholder = defaultLetterTemplate(lead.name, "Business Owner");
            if (prev === defaultWithPlaceholder) {
              return defaultLetterTemplate(lead.name, name);
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
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-950 text-slate-100 font-sans">
      
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
              {leads.filter(l => l.status === 'new').length > 0 && (
                <span className="ml-auto bg-indigo-500 text-white font-semibold text-xs px-2 py-0.5 rounded-full">
                  {leads.filter(l => l.status === 'new').length}
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
        <div className="border-t border-slate-850 pt-6 mt-6 text-xs text-slate-500 leading-relaxed">
          <p>This local utility searches the Companies House public ledger to find newly incorporated entities in your monitored postcodes or cities.</p>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {selectedTab === 'find' ? (
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
        ) : (
          <div>
            {/* CRM Lead Manager View */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">CRM Lead Manager</h2>
                <p className="text-sm text-slate-400">Track status, record client notes, and set call back dates.</p>
              </div>

              {/* Status Filters */}
              <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1 text-xs font-medium self-start lg:self-center">
                {(['all', 'new', 'contacted', 'interested', 'ignored'] as const).map(status => (
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
                      status === 'contacted' ? 'bg-amber-400' :
                      status === 'interested' ? 'bg-emerald-400' :
                      'bg-slate-500'
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
                {filteredLeads.map(lead => (
                  <div
                    key={lead.id}
                    className="bg-slate-900/40 border border-slate-850 hover:border-slate-800/80 rounded-2xl p-6 transition-all duration-150"
                  >
                    {/* Header: Company Name & Control Badges */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-850/50">
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight leading-snug">{lead.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          No. {lead.company_number} &bull; Incorporated: {formatDate(lead.incorporation_date)}
                        </p>
                      </div>

                      {/* Status selectors & Action options */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status buttons */}
                        <div className="bg-slate-950 p-1 border border-slate-850 rounded-xl flex gap-1 text-[11px] font-semibold">
                          {(['new', 'contacted', 'interested', 'ignored'] as const).map(st => (
                            <button
                              key={st}
                              onClick={() => handleUpdateStatus(lead.id, lead.name, st)}
                              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                                lead.status === st
                                  ? st === 'new' ? 'bg-sky-500/25 text-sky-300 border border-sky-500/20' :
                                    st === 'contacted' ? 'bg-amber-500/25 text-amber-300 border border-amber-500/20' :
                                    st === 'interested' ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/20' :
                                    'bg-slate-800 text-slate-300 border border-slate-700/50'
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
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
                  <div className="flex justify-between items-center mb-10 font-sans">
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
                      <img src="/stuart.png" className="w-12 h-12 rounded-full object-cover border border-zinc-200 shadow-sm" alt={senderName} />
                    </div>
                  </div>

                  {/* Date line */}
                  <div className="text-xs text-zinc-400 font-medium mb-6">
                    {formatDate(new Date().toISOString())}
                  </div>

                  {/* Headline & Subheading */}
                  <div className="mb-8">
                    <h2 className="text-xl font-extrabold text-[#35b0f3] leading-snug mb-1.5">
                      Congratulations on starting {selectedLetterLead.name}
                    </h2>
                    <p className="text-[13px] text-zinc-500 font-medium">
                      A quick note from a fellow local business owner.
                    </p>
                  </div>

                  {/* Letter Content */}
                  {renderBodyContent(letterBody, "text-[#27272a] text-[13.5px] leading-relaxed")}

                  {/* Signature */}
                  <div className="mt-10 text-xs text-zinc-500 leading-relaxed">
                    <p className="mb-6 text-zinc-800 text-[13.5px]">Warm regards,</p>
                    <p className="font-bold text-zinc-900 text-sm">{senderName}</p>
                    <p className="text-[#35b0f3] font-semibold">{senderBusinessName}</p>
                  </div>

                  {/* Footer info */}
                  <div className="mt-12 pt-6 border-t border-zinc-150 text-[9px] text-zinc-400 font-sans tracking-wide flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-zinc-500">{senderBusinessName}</span> &bull; 74 Broadlee, Wilnecote, Tamworth, B77 4PG
                    </div>
                    <div className="flex gap-2 text-zinc-500">
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
      {selectedLetterLead && (
        <div className="print-container hidden">
          <div className="print-paper bg-white text-zinc-900 p-12 font-sans leading-relaxed text-[14px]">
            <div className="max-w-[620px] mx-auto">
              {/* Modern Header */}
              <div className="flex justify-between items-center mb-10 font-sans">
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
                  <img src="/stuart.png" className="w-12 h-12 rounded-full object-cover border border-zinc-200 shadow-sm" alt={senderName} />
                </div>
              </div>

              {/* Date line */}
              <div className="text-xs text-zinc-405 font-medium mb-6">
                {formatDate(new Date().toISOString())}
              </div>

              {/* Headline & Subheading */}
              <div className="mb-8">
                <h2 className="text-xl font-extrabold text-[#35b0f3] leading-snug mb-1.5">
                  Congratulations on starting {selectedLetterLead.name}
                </h2>
                <p className="text-[13px] text-zinc-500 font-medium">
                  A quick note from a fellow local business owner.
                </p>
              </div>

              {/* Letter Content */}
              {renderBodyContent(letterBody, "text-[#27272a] text-[14px] leading-relaxed")}

              {/* Signature */}
              <div className="mt-10 text-xs text-zinc-500 leading-relaxed">
                <p className="mb-6 text-zinc-800 text-[14px]">Warm regards,</p>
                <p className="font-bold text-zinc-900 text-sm">{senderName}</p>
                <p className="text-[#35b0f3] font-semibold">{senderBusinessName}</p>
              </div>

              {/* Footer info */}
              <div className="mt-16 pt-6 border-t border-zinc-150 text-[9px] text-zinc-450 font-sans tracking-wide flex justify-between items-center">
                <div>
                  <span className="font-semibold text-zinc-500">{senderBusinessName}</span> &bull; 74 Broadlee, Wilnecote, Tamworth, B77 4PG
                </div>
                <div className="flex gap-2 text-zinc-455">
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

    </div>
  );
}
