import React from 'react';
import {
  Calendar,
  MapPin,
  Plus,
  Users,
  ArrowRight
} from 'lucide-react';
import { EventOption, Lead } from '../types';
import { eventDateRangeForDisplay } from '../utils/date';
import { EventMiniCalendar } from './EventMiniCalendar';

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
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto">

      {/* Compact Header Banner */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-black/[0.06] shadow-xs flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-accent-light text-accent rounded-md text-[10px] sm:text-xs font-bold mb-1">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>Eventos y Sedes</span>
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
          type="button"
          onClick={onOpenCreateEventModal}
          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">+ Nuevo Evento</span>
          <span className="xs:hidden">+ Evento</span>
        </button>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-black/[0.06] px-5 py-10 text-center">
          <div className="w-10 h-10 rounded-2xl bg-accent-light text-accent flex items-center justify-center mx-auto">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-[#1D1D1F] mt-3">Todavía no hay eventos</p>
          <p className="text-xs text-slate-500 mt-1">
            Crea la primera sede o feria para empezar a capturar leads.
          </p>
        </div>
      ) : (
        /* Events 2-Column Mobile Grid */
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3.5 md:gap-4">
          {events.map((evt) => {
            const isCurrent = evt.id === currentEvent.id;
            const eventLeads = leads.filter(l => l.event === evt.name);
            const totalLeads = eventLeads.length;
            const priorityLeads = eventLeads.filter(l => l.priority).length;
            // El mini calendario solo se dibuja si el rango es interpretable; si no, la
            // tarjeta se queda con la fecha en texto. El criterio es el mismo que usa
            // `EventMiniCalendar`, para que ambos caigan siempre igual.
            const hasMiniCalendar = Boolean(eventDateRangeForDisplay(evt.dateRange));

            return (
              <div
                key={evt.id}
                className={`
                  bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 border transition-all duration-200 flex flex-col justify-between
                  ${isCurrent
                    ? 'border-accent ring-1 ring-accent shadow-xs'
                    : 'border-black/[0.06] shadow-2xs hover:border-black/[0.12] hover:shadow-xs'
                  }
                `}
              >
                <div className="space-y-2 sm:space-y-3">
                  {/* Header Row: Icon & Status Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-accent-light text-accent flex items-center justify-center font-bold shrink-0">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>

                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-full text-[9px] sm:text-[10px] font-black shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="hidden xs:inline">Activo</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectEvent(evt)}
                        aria-label={`Activar ${evt.name}`}
                        className="text-[10px] sm:text-xs font-bold text-slate-500 hover:text-accent px-2 py-0.5 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] transition-colors cursor-pointer shrink-0"
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
                    {hasMiniCalendar ? (
                      <>
                        {/* En móvil el calendario no cabe: se muestra solo el rango. */}
                        <div className="text-[10px] sm:text-xs font-semibold text-accent mt-1 truncate sm:hidden">
                          {evt.dateRange}
                        </div>
                        <EventMiniCalendar dateRange={evt.dateRange} />
                      </>
                    ) : (
                      <div className="text-[10px] sm:text-xs font-semibold text-accent mt-1 truncate">
                        {evt.dateRange}
                      </div>
                    )}
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
                    type="button"
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
        </div>
      )}

    </div>
  );
};