import React from 'react';
import { 
  Calendar, 
  MapPin, 
  Plus, 
  Users, 
  ArrowRight,
  Sparkles,
  Check
} from 'lucide-react';
import { EventOption, Lead } from '../types';

interface EventsViewProps {
  events: EventOption[];
  currentEvent: EventOption;
  leads: Lead[];
  onSelectEvent: (event: EventOption) => void;
  onOpenCreateEventModal: () => void;
  onViewLeadsOfEvent: (event: EventOption) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  currentEvent,
  leads,
  onSelectEvent,
  onOpenCreateEventModal,
  onViewLeadsOfEvent
}) => {
  return (
    <div className="space-y-3 sm:space-y-5 animate-fade-in max-w-6xl mx-auto">
      
      {/* Compact Header Banner */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-black/[0.06] shadow-xs flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#0071E3]/10 text-[#0071E3] rounded-md text-[10px] sm:text-xs font-bold mb-1">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>Gestión de Sedes y Ferias</span>
          </div>
          <h2 className="text-base sm:text-2xl font-bold text-[#1D1D1F] tracking-tight truncate">
            Eventos Comerciales
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 sm:line-clamp-none">
            Segmenta y centraliza los prospectos capturados por sede o feria.
          </p>
        </div>

        {/* Primary Create Event CTA */}
        <button
          onClick={onOpenCreateEventModal}
          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden xs:inline sm:inline">+ Nuevo Evento</span>
          <span className="xs:hidden">+ Evento</span>
        </button>
      </div>

      {/* Events 2-Column Mobile Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3.5 md:gap-4">
        {events.map((evt) => {
          const isCurrent = evt.id === currentEvent.id;
          const eventLeads = leads.filter(l => l.event === evt.name);
          const totalLeads = eventLeads.length;
          const priorityLeads = eventLeads.filter(l => l.priority).length;

          return (
            <div
              key={evt.id}
              className={`
                bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 border transition-all duration-200 flex flex-col justify-between
                ${isCurrent 
                  ? 'border-[#0071E3] ring-1 ring-[#0071E3]/30 shadow-xs' 
                  : 'border-black/[0.06] shadow-2xs hover:border-black/[0.12] hover:shadow-xs'
                }
              `}
            >
              <div className="space-y-2 sm:space-y-3">
                {/* Header Row: Icon & Status Badge */}
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold shrink-0">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-full text-[9px] sm:text-[10px] font-black shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="hidden xs:inline">Activo</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => onSelectEvent(evt)}
                      className="text-[10px] sm:text-xs font-bold text-slate-500 hover:text-[#0071E3] px-2 py-0.5 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] transition-colors cursor-pointer shrink-0"
                    >
                      Activar
                    </button>
                  )}
                </div>

                {/* Event Name & Location */}
                <div>
                  <h3 className="text-xs sm:text-sm md:text-base font-bold text-[#1D1D1F] leading-snug line-clamp-2" title={evt.name}>
                    {evt.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 mt-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{evt.location}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-[#0071E3] mt-0.5 truncate">
                    {evt.dateRange}
                  </div>
                </div>

                {/* Compact Mini Metrics Grid */}
                <div className="grid grid-cols-2 gap-1.5 pt-1.5 sm:pt-2 border-t border-black/[0.04]">
                  <div className="bg-[#FAFBFD] p-1.5 sm:p-2 rounded-xl border border-black/[0.03]">
                    <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tight">Leads</div>
                    <div className="text-xs sm:text-base font-bold text-[#1D1D1F] mt-0.5">{totalLeads}</div>
                  </div>
                  <div className="bg-[#FAFBFD] p-1.5 sm:p-2 rounded-xl border border-black/[0.03]">
                    <div className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tight">VIP</div>
                    <div className="text-xs sm:text-base font-bold text-amber-600 mt-0.5">{priorityLeads}</div>
                  </div>
                </div>
              </div>

              {/* Action Button: View Leads */}
              <div className="pt-2 sm:pt-3 mt-2 border-t border-black/[0.04]">
                <button
                  onClick={() => onViewLeadsOfEvent(evt)}
                  className="w-full py-1.5 sm:py-2 px-2 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-[#1D1D1F] rounded-xl text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Users className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate">Ver Leads ({totalLeads})</span>
                  <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 hidden xs:inline" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Compact "+ Crear Nuevo Evento" Slot in Grid */}
        <div 
          onClick={onOpenCreateEventModal}
          className="rounded-2xl sm:rounded-3xl border-2 border-dashed border-black/[0.08] hover:border-[#0071E3] bg-[#FAFBFD] hover:bg-white p-3 sm:p-5 flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group min-h-[140px] sm:min-h-[180px]"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#0071E3]/10 text-[#0071E3] group-hover:bg-[#0071E3] group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors leading-tight">
              Crear Nuevo Evento
            </div>
            <div className="text-[9px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Añade otra sede o feria
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
