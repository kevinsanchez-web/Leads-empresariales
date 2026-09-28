import React from 'react';
import { Zap, ChevronRight } from 'lucide-react';
import { Lead } from '../types';
import { INTEREST_OPTIONS } from '../data/mockData';

interface InteresesViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export const InteresesView: React.FC<InteresesViewProps> = ({ leads, onSelectLead }) => {
  const totalLeadsCount = leads.length || 1;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Simple Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/60">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900">Intereses Tecnológicos</h2>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200/60">
          {INTEREST_OPTIONS.length} Categorías
        </span>
      </div>

      {/* Grid of Interests */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
        {INTEREST_OPTIONS.map((interest) => {
          const matchingLeads = leads.filter(l => l.interests.includes(interest));
          const percentage = Math.round((matchingLeads.length / totalLeadsCount) * 100);

          return (
            <div 
              key={interest} 
              className="bg-white rounded-2xl border border-slate-200/60 p-3 sm:p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-slate-100 mb-1.5 sm:mb-2 gap-1">
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs sm:text-base text-slate-900 truncate" title={interest}>
                      {interest}
                    </h3>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium">{percentage}% de leads</span>
                  </div>
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] sm:text-xs shrink-0">
                    {matchingLeads.length}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2 sm:mb-3">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-300" 
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>

                {/* Prospects list */}
                <div className="space-y-1 sm:space-y-1.5">
                  {matchingLeads.length === 0 ? (
                    <div className="text-[10px] sm:text-xs text-slate-400 py-3 text-center font-medium">Sin leads</div>
                  ) : (
                    matchingLeads.slice(0, 3).map(lead => (
                      <button
                        key={lead.id}
                        onClick={() => onSelectLead(lead)}
                        className="w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div className="min-w-0 pr-1">
                          <div className="text-[10px] sm:text-xs font-bold text-slate-900 truncate">{lead.name}</div>
                          <div className="text-[9px] sm:text-[10px] text-slate-500 truncate">{lead.company}</div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                      </button>
                    ))
                  )}
                  {matchingLeads.length > 3 && (
                    <div className="text-[9px] sm:text-[10px] text-slate-400 text-center font-medium">
                      +{matchingLeads.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
