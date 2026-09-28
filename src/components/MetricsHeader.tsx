import React from 'react';
import { Users, Building2, DollarSign, Star } from 'lucide-react';
import { Lead } from '../types';

interface MetricsHeaderProps {
  leads: Lead[];
}

export const MetricsHeader: React.FC<MetricsHeaderProps> = ({ leads }) => {
  const totalLeads = leads.length;
  const uniqueCompanies = new Set(leads.map(l => l.company.trim().toLowerCase())).size;
  const priorityCount = leads.filter(l => l.priority).length;
  const totalValue = leads.reduce((acc, curr) => acc + (curr.estimatedValue || 35000), 0);
  const formattedValue = `$${(totalValue / 1000000).toFixed(2)}M`;

  return (
    <div className="bg-white rounded-xl border border-black/[0.06] shadow-xs px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* Metric 1: Total Leads */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-max pr-2 sm:pr-4">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
          <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs sm:text-base font-bold text-[#1D1D1F] tracking-tight">{totalLeads}</span>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500">Leads</span>
        </div>
      </div>

      <div className="h-4 w-[1px] bg-black/[0.06] shrink-0" />

      {/* Metric 2: Empresas */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-max px-2 sm:px-4">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#5856D6]/10 text-[#5856D6] flex items-center justify-center shrink-0">
          <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs sm:text-base font-bold text-[#1D1D1F] tracking-tight">{uniqueCompanies}</span>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500">Empresas</span>
        </div>
      </div>

      <div className="h-4 w-[1px] bg-black/[0.06] shrink-0" />

      {/* Metric 3: Pipeline */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-max px-2 sm:px-4">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#34C759]/10 text-[#28A745] flex items-center justify-center shrink-0">
          <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs sm:text-base font-bold text-[#1D1D1F] tracking-tight">{formattedValue}</span>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500">Pipeline</span>
        </div>
      </div>

      <div className="h-4 w-[1px] bg-black/[0.06] shrink-0" />

      {/* Metric 4: Prioritarios */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-max pl-2 sm:pl-4">
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#FF9500]/10 text-[#D97706] flex items-center justify-center shrink-0">
          <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.2]" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs sm:text-base font-bold text-[#D97706] tracking-tight">{priorityCount}</span>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500">Prioritarios</span>
        </div>
      </div>
    </div>
  );
};



