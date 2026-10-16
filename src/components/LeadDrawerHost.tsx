import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lead } from '../types';
import { LeadDetailDrawerContent } from './LeadDetailDrawer';
import { DrawerModal } from './useLeadDrawer';

interface LeadDrawerHostProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateLead: (updatedLead: Lead) => void;
  onDeleteLead?: (leadId: string) => void;
  currentUser: string;
  onGoToLeadsView?: () => void;
  /** Modal a abrir al montar la ficha (accion rápida "Agendar" del kanban). */
  initialModal?: DrawerModal | null;
}

export const LeadDrawerHost: React.FC<LeadDrawerHostProps> = ({
  lead,
  onClose,
  onUpdateLead,
  onDeleteLead,
  currentUser,
  onGoToLeadsView,
  initialModal
}) => {
  // La barra baja queda visible y usable con el sheet abierto, así que el sheet se ancla
  // justo encima de ella. Se mide en runtime porque su alto depende del safe area del
  // dispositivo y no de un valor fijo fiable.
  const [bottomNavHeight, setBottomNavHeight] = useState(0);

  useEffect(() => {
    const nav = document.querySelector('[data-bottom-nav]') as HTMLElement | null;
    if (!nav) return undefined;

    const update = () => setBottomNavHeight(nav.offsetHeight);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!lead) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [lead, onClose]);

  if (!lead) return null;

  const panel = (
    <>
      {/* Mobile scrim: solo por debajo de la barra, que queda por encima y clickeable */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs animate-fade-in md:hidden"
        onClick={onClose}
      />

      {/* Móvil (< md): bottom sheet sobre la barra. Escritorio (md+): panel lateral derecho.

          En móvil el alto es FIJO (`h-[85dvh]`), no un tope: con `max-h` la altura la
          decidía el contenido y el panel saltaba de tamaño al cambiar entre Datos,
          Notas e IA Assistant. Los hijos que no deben ceder espacio llevan `shrink-0` y
          el área de pestañas hace el scroll interno.

          `md:h-auto` no sobra: en escritorio el alto lo fijan `md:inset-y-0` +
          `md:bottom-0`, y un elemento posicionado con `top`, `bottom` y `height` deja
          el `height` ganar e ignora `bottom`. Sin ese reset el panel no ocuparía toda
          la ventana. */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${lead.name}`}
        style={{ '--bottom-nav-h': `${bottomNavHeight}px` } as React.CSSProperties}
        className="fixed inset-x-0 bottom-[var(--bottom-nav-h,0px)] z-50 flex h-[85dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-slide-in-up md:inset-x-auto md:inset-y-0 md:bottom-0 md:right-0 md:h-auto md:w-[420px] md:max-w-lg md:animate-slide-in-right md:rounded-none md:rounded-l-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle visual del bottom sheet (solo móvil) */}
        <div className="flex shrink-0 items-center justify-center pt-2 pb-1 md:hidden">
          <span className="h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <LeadDetailDrawerContent
            key={lead.id}
            lead={lead}
            onClose={onClose}
            onUpdateLead={onUpdateLead}
            onDeleteLead={onDeleteLead}
            currentUser={currentUser}
            onGoToLeadsView={onGoToLeadsView}
            initialModal={initialModal}
          />
        </div>
      </aside>
    </>
  );

  return createPortal(panel, document.body);
};
