import React from 'react';
import { UserPlus, X } from 'lucide-react';
import { Lead, UserRep, EventOption } from '../types';
import { CardScannerModal } from './CardScannerModal';
import { CaptureToolsBar } from './CaptureToolsBar';
import { LeadFormFields } from './LeadFormFields';
import { useLeadForm, MODAL_DEFAULTS } from './useLeadForm';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLead: (newLead: Lead) => void;
  currentUser: UserRep;
  events: EventOption[];
  currentEvent: EventOption;
  onOpenCreateEventModal?: () => void;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({
  isOpen,
  onClose,
  onSaveLead,
  currentUser,
  events,
  currentEvent,
  onOpenCreateEventModal
}) => {
  const form = useLeadForm({
    currentUser,
    currentEvent,
    defaults: MODAL_DEFAULTS,
    onSaveLead,
    onSaved: onClose
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.submit();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        <div className="px-5 sm:px-6 py-4 bg-white border-b border-black/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-primary text-white flex items-center justify-center font-bold shrink-0 shadow-[0_2px_8px_rgba(0,113,227,0.25)]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#1D1D1F] leading-tight truncate">
                Nuevo Lead Comercial
              </h2>
              <p className="text-xs text-slate-500 truncate">Registro rápido y sincronización con IA</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CaptureToolsBar form={form} />

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-500 hover:text-[#1D1D1F] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 sm:px-6 py-3 space-y-3 flex-1">
          <LeadFormFields
            form={form}
            events={events}
            onOpenCreateEventModal={onOpenCreateEventModal}
          />

          <div className="pt-3 pb-1 border-t border-black/5 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              Guardar Lead
            </button>
          </div>
        </form>
      </div>

      <CardScannerModal
        isOpen={form.isScannerOpen}
        onClose={() => form.setIsScannerOpen(false)}
        onScanSuccess={form.handleScanSuccess}
      />
    </div>
  );
};