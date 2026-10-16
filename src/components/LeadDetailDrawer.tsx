import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Star,
  Calendar,
  Sparkles,
  Mail,
  Menu,
  Phone,
  Clock,
  QrCode,
  Trash2,
  AlertTriangle,
  Linkedin,
  MessageCircle,
  FileText,
  LucideIcon,
  LayoutGrid
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Lead, LeadStatus } from '../types';
import { localDateTimeInputNow } from '../utils/date';
import { cleanContact, linkedinSearchUrl } from '../utils/contactInfo';
import { classifyEmail } from '../utils/emailKind';
import { LeadDrawerTabContent } from './LeadDrawerTabContent';
import { RoundedSelect } from './RoundedSelect';
import { useAnchoredPopover } from './useAnchoredPopover';
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
  onUpdateLead: (updatedLead: Lead) => void;
  onDeleteLead?: (id: string) => void;
  currentUser: string;
  onGoToLeadsView?: () => void;
  /** Modal que se abre al montar la ficha (ej. 'schedule' desde una acción rápida del kanban). */
  initialModal?: DrawerModal | null;
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
                  <div className="w-9 h-9 rounded-xl bg-linear-to-br from-primary to-[#5856D6] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
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
        <div className="text-xs font-semibold text-primary truncate">
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

      <ContactChannelsMenu lead={lead} />

      <button
        onClick={onOpenQr}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F5F5F7] text-slate-600 transition-colors hover:bg-[#EBEBEF]"
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
  /** Punto de aviso junto al icono, para señales que no cambian el canal. */
  marker?: React.ReactNode;
}

const ContactAction: React.FC<ContactActionProps> = ({
  href,
  external,
  title,
  label,
  disabledLabel,
  Icon,
  activeClassName,
  activeIconClassName,
  marker
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
      {marker}
      <span className="truncate">{label}</span>
    </a>
  );
};

interface QuickActionsProps {
  lead: Lead;
  onStatusChange: (status: LeadStatus) => void;
  onSchedule: () => void;
}

interface ContactChannel {
  key: string;
  href: string;
  external?: boolean;
  label: string;
  note: string;
  Icon: LucideIcon;
  noteClassName?: string;
}

const whatsappHref = (phone?: string) =>
  phone ? `https://wa.me/${phone.replace(/[^0-9]/g, '')}` : undefined;

/**
 * Estado del botón de email según el tipo de casilla. Con una casilla personal se
 * marca en ámbar, no porque el dato sea malo, sino porque conviene verlo antes de
 * elegir por dónde escribir. Sin correo, el botón queda gris como los demás.
 */
function emailActionProps(lead: Lead): ContactActionProps {
  const email = cleanContact(lead.email);
  const { kind, domain } = classifyEmail(email);
  const isPersonal = kind === 'personal';

  return {
    href: kind === 'sin-email' ? undefined : `mailto:${email}`,
    title: isPersonal
      ? `Correo personal (${domain}). Suele responder más rápido por WhatsApp o llamada.`
      : `Enviar email a ${email}`,
    label: 'Email',
    disabledLabel: 'Sin Email',
    Icon: Mail,
    activeClassName: isPersonal
      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20',
    activeIconClassName: isPersonal ? 'text-amber-600' : 'text-primary',
    marker: isPersonal ? <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-amber-500" /> : undefined
  };
}

/**
 * Estado del botón de LinkedIn. Con perfil guardado abre el perfil; sin él, una
 * búsqueda por nombre y empresa. Queda disponible siempre: es el único canal que no
 * depende de un dato que el lead haya traído capturado.
 */
function linkedinActionProps(lead: Lead): ContactActionProps {
  const profile = cleanContact(lead.linkedinUrl);
  const search = linkedinSearchUrl(lead.name, lead.company);

  return {
    href: profile || search || undefined,
    external: true,
    title: profile ? `Ver el perfil de ${lead.name} en LinkedIn` : `Buscar a ${lead.name} en LinkedIn`,
    label: 'LinkedIn',
    disabledLabel: 'Sin LinkedIn',
    Icon: Linkedin,
    activeClassName: 'bg-primary/10 hover:bg-primary/20 text-[#0A66C2] border-primary/20',
    activeIconClassName: 'text-[#0A66C2]'
  };
}

/**
 * Canales con dato del lead, en el mismo orden que la fila de acciones rápidas.
 * Los que no tienen dato no se listan: un botón que no abre nada no es una opción.
 */
function buildContactChannels(lead: Lead): ContactChannel[] {
  const email = cleanContact(lead.email);
  const { kind, domain } = classifyEmail(email);
  const waHref = whatsappHref(lead.phone);

  const channels: ContactChannel[] = [];
  if (lead.phone) {
    channels.push({ key: 'llamada', href: `tel:${lead.phone}`, label: 'Llamar', note: lead.phone, Icon: Phone });
  }
  if (waHref) {
    channels.push({
      key: 'whatsapp',
      href: waHref,
      external: true,
      label: 'WhatsApp',
      note: lead.phone ?? '',
      Icon: MessageCircle
    });
  }
  if (kind !== 'sin-email') {
    channels.push({
      key: 'email',
      href: `mailto:${email}`,
      label: 'Email',
      note: `${kind === 'personal' ? 'Personal' : 'Corporativo'} · ${domain}`,
      Icon: Mail,
      noteClassName: kind === 'personal' ? 'text-amber-600' : undefined
    });
  }
  if (lead.linkedinUrl) {
    channels.push({
      key: 'linkedin',
      href: lead.linkedinUrl,
      external: true,
      label: 'LinkedIn',
      note: 'Perfil del lead',
      Icon: Linkedin
    });
  } else {
    const search = linkedinSearchUrl(lead.name, lead.company);
    if (search) {
      channels.push({
        key: 'linkedin-busqueda',
        href: search,
        external: true,
        label: 'Buscar en LinkedIn',
        note: 'Sin perfil guardado',
        Icon: Linkedin
      });
    }
  }
  return channels;
}

/**
 * Menú "Contactos" del header: los canales con dato del lead. Existe para lo que
 * la fila de acciones rápidas no cabe (LinkedIn) y para ver el tipo de casilla al
 * elegir por dónde escribir, sin volver a repetir los tres botones de la fila.
 */
const ContactChannelsMenu: React.FC<{ lead: Lead }> = ({ lead }) => {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const channels = buildContactChannels(lead);
  const { anchorRef, popupRef, popupStyle } = useAnchoredPopover(open, close, {
    // Cada fila son 42px (dos líneas de texto con py-1.5) más el py-1 del popup.
    height: channels.length ? channels.length * 42 + 8 : 40,
    width: 240,
    align: 'right'
  });

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Contactos"
        aria-expanded={open}
        title="Contactos"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F5F5F7] text-slate-600 transition-colors hover:bg-[#EBEBEF]"
      >
        <Menu className="h-3.5 w-3.5" />
      </button>
      {open &&
        createPortal(
          <div
            ref={popupRef}
            style={popupStyle}
            className="z-[70] overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-xl"
          >
            {channels.length === 0 ? (
              <p className="px-2.5 py-1.5 text-xs font-medium text-slate-400">Sin datos de contacto</p>
            ) : (
              channels.map((channel) => (
                <a
                  key={channel.key}
                  href={channel.href}
                  {...(channel.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  onClick={close}
                  className="flex items-center gap-2 px-2.5 py-1.5 transition-colors hover:bg-[#F5F5F7]"
                >
                  <channel.Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-800">{channel.label}</span>
                    <span className={`block truncate text-[10px] ${channel.noteClassName ?? 'text-slate-500'}`}>
                      {channel.note}
                    </span>
                  </span>
                </a>
              ))
            )}
          </div>,
          document.body
        )}
    </>
  );
};

const LeadQuickActions: React.FC<QuickActionsProps> = ({ lead, onStatusChange, onSchedule }) => (
  <div className="py-2.5 space-y-2 border-b border-black/[0.04] shrink-0 text-xs">
    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Estado:</span>
        <RoundedSelect
          variant="bare"
          value={lead.status}
          onChange={(val) => onStatusChange(val as LeadStatus)}
          ariaLabel="Estado del lead"
          className="min-w-0"
          buttonClassName="bg-[#F5F5F7] hover:bg-[#EBEBEF] border border-black/[0.06] rounded-xl pl-2.5 pr-7 py-1 font-bold text-[#1D1D1F] text-xs focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          options={LEAD_STATUSES.map((status) => ({ value: status, label: status }))}
        />
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

    <div className="grid grid-cols-4 gap-1.5">
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
        href={whatsappHref(lead.phone)}
        external
        title="Abrir chat en WhatsApp"
        label="WhatsApp"
        disabledLabel="Sin WhatsApp"
        Icon={MessageCircle}
        activeClassName="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#1EBE5D] border-[#25D366]/20"
        activeIconClassName="text-[#25D366]"
      />
      <ContactAction {...emailActionProps(lead)} />
      <ContactAction {...linkedinActionProps(lead)} />
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
  { id: 'ia', label: 'IA Assistant', Icon: Sparkles, minWidth: 'min-w-[105px]', activeText: 'text-primary', iconColor: 'text-primary' }
];

const LeadDrawerTabs: React.FC<{ activeTab: DrawerTab; historyCount: number; onChange: (tab: DrawerTab) => void }> = ({
  activeTab,
  historyCount,
  onChange
}) => (
                <div className="flex bg-[#F5F5F7] p-1 rounded-xl my-2 shrink-0 border border-black/[0.03] overflow-x-auto scrollbar-none">
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
              min={localDateTimeInputNow()}
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full rounded-xl border border-black/[0.06] bg-[#F5F5F7] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-700">Notas de la Reunión</label>
            <textarea
              rows={2}
              placeholder={`Ej: Demo técnica para ${companyName}`}
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              className="w-full rounded-xl border border-black/[0.06] bg-[#F5F5F7] px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
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
              className="cursor-pointer rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-primary-hover"
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
          className="w-full cursor-pointer rounded-xl bg-primary py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover"
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
  onGoToLeadsView,
  initialModal = null
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('resumen');
  const [activeModal, setActiveModal] = useState<DrawerModal | null>(initialModal);

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