import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Clock, Flame, UserPlus, Zap } from 'lucide-react';
import { Lead, UserRep, EventOption } from '../types';
import { CardScannerModal } from './CardScannerModal';
import { CaptureToolsBar } from './CaptureToolsBar';
import { LeadFormFields } from './LeadFormFields';
import { useLeadForm, PAGE_DEFAULTS } from './useLeadForm';

interface MobileQuickCaptureProps {
  onSaveLead: (lead: Lead) => void;
  currentUser: UserRep;
  currentEvent: EventOption;
  events: EventOption[];
  allLeads?: Lead[];
  onOpenCreateEventModal?: () => void;
  onDone: () => void;
}

export const MobileQuickCapture: React.FC<MobileQuickCaptureProps> = ({
  onSaveLead,
  currentUser,
  currentEvent,
  events,
  allLeads = [],
  onOpenCreateEventModal,
  onDone
}) => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const resetFormRef = useRef<() => void>(() => {});
  const resetTimerRef = useRef<number | null>(null);

  const handleSaved = () => {
    setSavedSuccess(true);
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      setSavedSuccess(false);
      resetFormRef.current();
    }, 1200);
  };

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    },
    []
  );

  const form = useLeadForm({
    currentUser,
    currentEvent,
    defaults: PAGE_DEFAULTS,
    onSaveLead,
    onSaved: handleSaved
  });

  resetFormRef.current = form.resetForm;

  const eventLeads = allLeads.filter(l => l.event === currentEvent.name);
  const recentLeadsForEvent = eventLeads.slice(0, 5);
  const priorityCount = eventLeads.filter(l => l.priority).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.submit();
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 animate-fade-in pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Columna Principal: Formulario de Captura */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Header del Formulario */}
            <div className="bg-white px-4 sm:px-6 py-3 flex items-center justify-between gap-3 border-b border-black/[0.05]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2">
                    <span className="truncate">Captura Rápida de Lead</span>
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      En Vivo
                    </span>
                  </h2>
                </div>
              </div>

              <CaptureToolsBar form={form} />
            </div>

            {/* Estado de Éxito o Formulario */}
            {savedSuccess ? (
              <div className="p-12 text-center space-y-3 animate-scale-up">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">¡Lead Guardado Exitosamente!</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Registrado en tiempo real para{' '}
                  <strong className="text-slate-700">{currentEvent.name}</strong>. Listo para la siguiente entrada.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3">
                <LeadFormFields
                  form={form}
                  events={events}
                  onOpenCreateEventModal={onOpenCreateEventModal}
                />

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Guardar Prospecto</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Sidebar / Información del Evento */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Métricas del Evento
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-[#F5F5F7] p-3 rounded-xl border border-black/[0.04]">
                <span className="text-[10px] font-medium text-slate-500 block">Registrados</span>
                <span className="text-xl font-black text-[#1D1D1F]">{eventLeads.length}</span>
              </div>

              <div className="bg-[#FF9500]/10 p-3 rounded-xl border border-[#FF9500]/20">
                <span className="text-[10px] font-medium text-amber-800 block">VIP / Alta Prioridad</span>
                <span className="text-xl font-black text-amber-900">{priorityCount}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-[#F5F5F7] p-2 rounded-lg border border-black/[0.04] flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Sincronizado automáticamente</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                Capturas Recientes
              </h3>
              <button
                type="button"
                onClick={onDone}
                className="text-xs font-semibold text-primary hover:text-primary-hover cursor-pointer"
              >
                Ver todos
              </button>
            </div>

            {recentLeadsForEvent.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No hay leads capturados aún en este evento.
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeadsForEvent.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-2.5 rounded-xl bg-[#F5F5F7] border border-black/[0.04] text-xs hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <span className="font-bold text-slate-900 truncate">{lead.name}</span>
                      {lead.priority && (
                        <span className="bg-[#FF9500]/15 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 text-[11px] truncate mb-1">
                      {lead.role} · <strong className="text-slate-800">{lead.company}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{lead.capturedAt}</span>
                      <span className="font-medium text-slate-500">{lead.capturedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CardScannerModal
        isOpen={form.isScannerOpen}
        onClose={() => form.setIsScannerOpen(false)}
        onScanSuccess={form.handleScanSuccess}
      />
    </div>
  );
};