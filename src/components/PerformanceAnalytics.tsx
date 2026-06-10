import { useState } from "react";
import { Lead } from "@/lib/db";

interface PerformanceAnalyticsProps {
  leads: Lead[];
}

export function PerformanceAnalytics({ leads }: PerformanceAnalyticsProps) {
  // State for filters
  const [perfFilterDateStart, setPerfFilterDateStart] = useState("");
  const [perfFilterDateEnd, setPerfFilterDateEnd] = useState("");
  const [perfFilterCategory, setPerfFilterCategory] = useState("all");
  const [perfFilterTemplate, setPerfFilterTemplate] = useState("all");
  const [perfFilterPriceMin, setPerfFilterPriceMin] = useState(0);
  const [perfFilterPriceMax, setPerfFilterPriceMax] = useState(1000);

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

  // Funnel helpers
  const hasResponded = (l: Lead) => 
    l.status !== 'not_suitable' && l.status !== 'no_response' && 
    (l.first_response_date !== null || !['new', 'printed', 'delivered'].includes(l.status));
    
  const hasBookedMeeting = (l: Lead) => 
    l.status !== 'not_suitable' && l.status !== 'no_response' && 
    (l.meeting_booked_date !== null || !['new', 'printed', 'delivered', 'responded', 'first_call'].includes(l.status));
    
  const hasSentProposal = (l: Lead) => 
    l.status !== 'not_suitable' && l.status !== 'no_response' && 
    (l.proposal_sent_date !== null || ['proposal_sent', 'follow_up_sent', 'won'].includes(l.status));

  // Filtering
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
  const perfResponseCount = perfFilteredLeads.filter(hasResponded).length;
  const perfMeetingCount = perfFilteredLeads.filter(hasBookedMeeting).length;
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
  const baseTemplateBreakdown: Record<string, { total: number; responded: number; won: number }> = {};
  const variantTemplateBreakdown: Record<string, { total: number; responded: number; won: number }> = {};
  leads.forEach(l => {
    if (l.base_version) {
      const key = l.base_version;
      if (!baseTemplateBreakdown[key]) {
        baseTemplateBreakdown[key] = { total: 0, responded: 0, won: 0 };
      }
      baseTemplateBreakdown[key].total++;
      if (hasResponded(l)) baseTemplateBreakdown[key].responded++;
      if (l.status === 'won') baseTemplateBreakdown[key].won++;
    }

    if (l.full_template_key) {
      const key = l.full_template_key;
      if (!variantTemplateBreakdown[key]) {
        variantTemplateBreakdown[key] = { total: 0, responded: 0, won: 0 };
      }
      variantTemplateBreakdown[key].total++;
      if (hasResponded(l)) variantTemplateBreakdown[key].responded++;
      if (l.status === 'won') variantTemplateBreakdown[key].won++;
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
        <div className="space-y-6">
          {/* Base Template Conversions */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Base Template Conversions</h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="pb-3 font-semibold">Template Version</th>
                    <th className="pb-3 font-semibold text-center">Delivered</th>
                    <th className="pb-3 font-semibold text-center">Responded</th>
                    <th className="pb-3 font-semibold text-center">Won</th>
                    <th className="pb-3 font-semibold text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(baseTemplateBreakdown).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-650 italic">No base template data available yet.</td>
                    </tr>
                  ) : (
                    Object.entries(baseTemplateBreakdown).map(([key, data]) => (
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

          {/* Template Variant Conversions */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Detailed Template Variant Conversions</h3>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500">
                    <th className="pb-3 font-semibold">Variant Key</th>
                    <th className="pb-3 font-semibold text-center">Delivered</th>
                    <th className="pb-3 font-semibold text-center">Responded</th>
                    <th className="pb-3 font-semibold text-center">Won</th>
                    <th className="pb-3 font-semibold text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(variantTemplateBreakdown).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-650 italic">No variant template data available yet.</td>
                    </tr>
                  ) : (
                    Object.entries(variantTemplateBreakdown).map(([key, data]) => (
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
  );
}
