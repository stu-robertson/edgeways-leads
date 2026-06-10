import { Milestone } from "@/lib/db";
import { useState } from "react";

interface MotivationMilestonesProps {
  milestones: Milestone[];
  loadingMilestones: boolean;
  onOpenMilestoneModal: (milestone: Milestone | null) => void;
  onArchiveMilestone: (id: string, archived: boolean) => void | Promise<void>;
}

export function MotivationMilestones({
  milestones,
  loadingMilestones,
  onOpenMilestoneModal,
  onArchiveMilestone,
}: MotivationMilestonesProps) {
  const [milestoneFilter, setMilestoneFilter] = useState<'incomplete' | 'completed' | 'all'>('incomplete');

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

  return (
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
          onClick={() => onOpenMilestoneModal(null)}
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
                          onClick={() => onOpenMilestoneModal(m)}
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
                          onClick={() => onArchiveMilestone(m.id, !m.archived)}
                          className="text-slate-500 hover:text-slate-300 p-1.5 bg-slate-950/30 hover:bg-slate-950/80 rounded-lg transition-all"
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
                            onClick={() => onOpenMilestoneModal(m)}
                            className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold animate-pulse"
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
  );
}
