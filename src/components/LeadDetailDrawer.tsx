import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Star,
  Calendar,
  Sparkles,
  Mail,
  Phone,
  Clock,
  QrCode,
  Trash2,
  AlertTriangle,
  MessageCircle,
  FileText,
  LucideIcon,
  LayoutGrid
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Lead, LeadStatus } from '../types';
import { LeadDrawerTabContent } from './LeadDrawerTabContent';
import {
  useLeadDrawer,
  getInitials,
  buildVCard,
  LEAD_STATUSES,
  DrawerTab,
  DrawerModal
} from './useLeadDrawer';

export interface LeadDetailDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateLead: (updated: Lead) => void;
  onDeleteLead?: (id: string) => void;
  currentUser: string;
  onGoToLeadsView?: () => void;
}

/* ═══════════════ Header ═══════════════ */

interface HeaderProps {
  lead: Lead;
  onTogglePriority: () => void;
  onOpenQr: () => void;
  /** Si no se pasa, el botón de eliminar no se muestra. */
  onRequestDelete?: () => void;
  onClose: () => void;
  onGoToLeadsView?: () => void;
}

const LeadDrawerHeader: React.FC<HeaderProps> = ({ lead, onTogglePriority, onOpenQr, onRequestDelete, onClose, onGoToLeadsView }) => (
  <div className="flex items-start justify-between pb-3 border-b border-black/[0.05] gap-2 shrink-0">
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071E3] to-[#5856D6] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
        {getInitials(lead.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm sm:text-base font-bold text-[#1D1D1F] leading-tight truncate">{lead.name}</h2>
          <button
            onClick={onTogglePriority}
            className="text-slate-300 hover:text-[#FF9500] cursor-pointer transition-colors p-0.5 shrink-0"
            title={lead.priority ? 'Quitar prioridad' : 'Marcar prioridad'}
          >
            <Star className={`w-3.5 h-3.5 ${lead.priority ? 'fill-[#FF9500] text-[#FF9500]' : ''}`} />
          </button>
        </div>
        <div className="text-xs font-semibold text-[#0071E3] truncate">
          {lead.company} <span className="text-slate-400 font-normal">• {lead.role}</span>
        </div>
      </div>
    </div>

    <div className="flex items-center gap-1 shrink-0">
      {onGoToLeadsView && (
        <button
          onClick={onGoToLeadsView}
          className="hidden h-7 items-center gap-1 rounded-lg bg-[#F5F5F7] px-2 text-slate-600 transition-colors hover:bg-[#EBEBEF] sm:flex"
          title="Ver en Personas"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="text-[10px] font-semibold">Personas</span>
        </button>
      )}

      <button
        onClick={onOpenQr}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F5F7] text-slate-600 transition-colors hover:bg-[#EBEBEF]"
        title="Código QR vCard"
      >
        <QrCode className="h-3.5 w-3.5" />
      </button>

      {onRequestDelete && (
        <button
          onClick={onRequestDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F5F7] text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          title="Eliminar lead"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      <button
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F5F5F7] text-slate-500 transition-colors hover:bg-[#EBEBEF] hover:text-[#1D1D1F]"
        title="Cerrar panel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);

/* ═══════════════ Acciones rápidas: estado, agendar y contacto ═══════════════ */

interface ContactActionProps {
  /** Si es undefined, el botón se muestra deshabilitado. */
  href?: string;
  external?: boolean;
  title?: string;
  label: string;
  disabledLabel: string;
  Icon: LucideIcon;
  activeClassName: string;
  activeIconClassName: string;
}

const ContactAction: React.FC<ContactActionProps> = ({
  href,
  external,
  title,
  label,
  disabledLabel,
  Icon,
  activeClassName,
  activeIconClassName
}) => {
  if (!href) {
    return (
      <div className="py-1.5 px-2 bg-slate-100 text-slate-400 rounded-xl font-medium flex items-center justify-center gap-1.5 text-xs text-center select-none">
        <Icon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
        <span>{disabledLabel}</span>
      </div>
    );
  }

  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={`py-1.5 px-2 border rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs active:scale-95 text-center truncate ${activeClassName}`}
      title={title}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${activeIconClassName}`} />
      <span className="truncate">{label}</span>
    </a>
  );
};

interface QuickActionsProps {
  lead: Lead;
  onStatusChange: (status: LeadStatus) => void;
  onSchedule: () => void;
}

const LeadQuickActions: React.FC<QuickActionsProps> = ({ lead, onStatusChange, onSchedule }) => (
  <div className="py-2.5 space-y-2 border-b border-black/[0.04] shrink-0 text-xs">
    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Estado:</span>
        <select
          value={lead.status}
          onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
          className="bg-[#F5F5F7] hover:bg-[#EBEBEF] border border-black/[0.06] rounded-xl px-2.5 py-1 font-bold text-[#1D1D1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#0071E3] cursor-pointer transition-colors"
        >
          {LEAD_STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onSchedule}
        className="px-2.5 py-1 bg-[#5856D6]/10 hover:bg-[#5856D6]/20 text-[#5856D6] rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs shrink-0 active:scale-95"
        title="Agendar reunión"
      >
        <Calendar className="w-3.5 h-3.5 text-[#5856D6] shrink-0" />
        <span>Agendar</span>
      </button>
    </div>

    <div className="grid grid-cols-3 gap-1.5">
      <ContactAction
        href={lead.phone ? `tel:${lead.phone}` : undefined}
        title={`Llamar a ${lead.phone}`}
        label="Llamar"
        disabledLabel="Sin Tel"
        Icon={Phone}
        activeClassName="bg-[#34C759]/10 hover:bg-[#34C759]/20 text-[#28A745] border-[#34C759]/20"
        activeIconClassName="text-[#28A745]"
      />
      <ContactAction
        href={lead.phone ? `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}` : undefined}
        external
        title="Abrir chat en WhatsApp"
        label="WhatsApp"
        disabledLabel="WhatsApp"
        Icon={MessageCircle}
        activeClassName="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#1EBE5D] border-[#25D366]/20"
        activeIconClassName="text-[#25D366]"
      />
      <ContactAction
        href={lead.email ? `mailto:${lead.email}` : undefined}
        title={`Enviar email a ${lead.email}`}
        label="Email"
        disabledLabel="Sin Email"
        Icon={Mail}
        activeClassName="bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] border-[#0071E3]/20"
        activeIconClassName="text-[#0071E3]"
      />
    </div>
  </div>
);

/* ═══════════════ Navegación por pestañas ═══════════════ */

const buildTabs = (historyCount: number): {
  id: DrawerTab;
  label: string;
  Icon: LucideIcon;
  minWidth: string;
  activeText: string;
  iconColor: string;
}[] => [
  { id: 'resumen', label: 'Datos', Icon: FileText, minWidth: 'min-w-[75px]', activeText: 'text-[#1D1D1F]', iconColor: '' },
  { id: 'actividad', label: `Notas (${historyCount})`, Icon: Clock, minWidth: 'min-w-[90px]', activeText: 'text-[#1D1D1F]', iconColor: '' },
  { id: 'ia', label: 'IA Assistant', Icon: Sparkles, minWidth: 'min-w-[105px]', activeText: 'text-[#0071E3]', iconColor: 'text-[#0071E3]' }
];

const LeadDrawerTabs: React.FC<{ activeTab: DrawerTab; historyCount: number; onChange: (tab: DrawerTab) => void }> = ({
  activeTab,
  historyCount,
  onChange
}) => (
  <div className="flex bg-[#F5F5F7] p-1 rounded-xl my-2 shrink-0 border border-black/[0.03] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {buildTabs(historyCount).map(({ id, label, Icon, minWidth, activeText, iconColor }) => (
      <button
        key={id}
        onClick={() => onChange(id)}
        className={`flex-1 ${minWidth} py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
          activeTab === id ? `bg-white ${activeText} shadow-xs font-bold` : 'text-slate-500 hover:text-[#1D1D1F]'
        }`}
      >
        <Icon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
        <span>{label}</span>
      </button>
    ))}
  </div>
);

/* ═══════════════ Modales ═══════════════ */

const ScheduleMeetingModal: React.FC<{
  companyName: string;
  onClose: () => void;
  onConfirm: (meetingDate: string, meetingNotes: string) => void;
}> = ({ companyName, onClose, onConfirm }) => {
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(meetingDate, meetingNotes);
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-black/[0.08] bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/[0.05] pb-2.5">
          <h3 className="text-sm font-bold text-[#1D1D1F]">Agendar Reunión</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-700">Fecha y Hora</label>
            <input
              type="datetime-local"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full rounded-xl border border-black/[0.06] bg-[#F5F5F7] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-700">Notas de la Reunión</label>
            <textarea
              rows={2}
              placeholder={`Ej: Demo técnica para ${companyName}`}
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              className="w-full rounded-xl border border-black/[0.06] bg-[#F5F5F7] px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl bg-[#F5F5F7] px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-[#EBEBEF]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-[#0071E3] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0077ED]"
            >
              Agendar
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

const QrModal: React.FC<{ lead: Lead; onClose: () => void }> = ({ lead, onClose }) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xs space-y-3 rounded-2xl border border-black/[0.08] bg-white p-5 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/[0.05] pb-2">
          <h3 className="text-xs font-bold text-[#1D1D1F]">vCard Contacto QR</h3>
          <button onClick={onClose} className="cursor-pointer text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-500">Escanea para guardar el contacto en tu teléfono.</p>

        <div className="mx-auto inline-block rounded-xl border border-black/[0.06] bg-white p-3 shadow-inner">
          <QRCodeCanvas value={buildVCard(lead)} size={160} level="M" includeMargin={true} />
        </div>

        <div className="rounded-xl bg-[#F5F5F7] p-2 text-xs font-bold text-[#1D1D1F]">
          {lead.name} • {lead.company}
        </div>

        <button
          onClick={onClose}
          className="w-full cursor-pointer rounded-xl bg-[#0071E3] py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0077ED]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

const DeleteLeadModal: React.FC<{
  lead: Lead;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ lead, onCancel, onConfirm }) => {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm space-y-3 rounded-2xl border border-black/[0.08] bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-[#1D1D1F]">¿Eliminar lead?</h3>
            <p className="mt-0.5 text-xs leading-snug text-slate-500">
              Se borrará permanentemente <strong className="text-slate-800">{lead.name}</strong> ({lead.company}).
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-xl bg-[#F5F5F7] px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-[#EBEBEF]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-rose-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

/* ═══════════════ Componente principal ═══════════════ */

export const LeadDetailDrawerContent: React.FC<Omit<LeadDetailDrawerProps, 'lead'> & { lead: Lead }> = ({
  lead,
  onClose,
  onUpdateLead,
  onDeleteLead,
  currentUser,
  onGoToLeadsView
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('resumen');
  const [activeModal, setActiveModal] = useState<DrawerModal | null>(null);

  const drawer = useLeadDrawer(lead, currentUser, onUpdateLead);
  const closeModal = () => setActiveModal(null);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white p-4">
      <LeadDrawerHeader
        lead={lead}
        onTogglePriority={drawer.actions.togglePriority}
        onOpenQr={() => setActiveModal('qr')}
        onRequestDelete={onDeleteLead ? () => setActiveModal('delete') : undefined}
        onClose={onClose}
        onGoToLeadsView={onGoToLeadsView}
      />

      <LeadQuickActions
        lead={lead}
        onStatusChange={drawer.actions.changeStatus}
        onSchedule={() => setActiveModal('schedule')}
      />

      <LeadDrawerTabs activeTab={activeTab} historyCount={lead.history.length} onChange={setActiveTab} />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 text-xs">
        <LeadDrawerTabContent activeTab={activeTab} lead={lead} drawer={drawer} />
      </div>

      {activeModal === 'schedule' && (
        <ScheduleMeetingModal
          companyName={lead.company}
          onClose={closeModal}
          onConfirm={(date, notes) => {
            drawer.actions.scheduleMeeting(date, notes);
            closeModal();
          }}
        />
      )}

      {activeModal === 'qr' && <QrModal lead={lead} onClose={closeModal} />}

      {activeModal === 'delete' && (
        <DeleteLeadModal
          lead={lead}
          onCancel={closeModal}
          onConfirm={() => {
            onDeleteLead?.(lead.id);
            closeModal();
            onClose();
          }}
        />
      )}
    </div>
  );
};

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({ lead, ...rest }) => {
  if (!lead) return null;
  return <LeadDetailDrawerContent lead={lead} {...rest} />;
};