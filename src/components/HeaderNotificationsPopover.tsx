import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  X, 
  ShieldCheck, 
  Zap 
} from 'lucide-react';
import { Lead, NotificationAlert } from '../types';
import { getNotificationAlerts } from '../utils/notifications';
import { leadHistoryDate, leadTime, leadTimestampNow } from '../utils/date';
import { 
  getNotificationPermissionStatus, 
  requestPushNotificationPermission, 
  sendTestPushNotification, 
  NotificationPermissionStatus 
} from '../utils/pushNotifications';

interface HeaderNotificationsPopoverProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNavigateToNotifications: () => void;
  onUpdateLead: (lead: Lead) => void;
}

export const HeaderNotificationsPopover: React.FC<HeaderNotificationsPopoverProps> = ({
  leads,
  onSelectLead,
  onNavigateToNotifications,
  onUpdateLead
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [pushStatus, setPushStatus] = useState<NotificationPermissionStatus>(() => 
    getNotificationPermissionStatus()
  );
  const [pushTestSent, setPushTestSent] = useState(false);
  
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const alerts = useMemo(() => getNotificationAlerts(leads), [leads]);
  
  const urgentCount = useMemo(() => {
    return alerts.filter(a => a.category === 'overdue' || a.category === 'today' || a.category === 'priority').length;
  }, [alerts]);

  useEffect(() => {
    if (isOpen) {
      setPushStatus(getNotificationPermissionStatus());
    }
  }, [isOpen]);

  const triggerTestFeedback = useCallback(() => {
    setPushTestSent(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setPushTestSent(false), 3000);
  }, []);

  const handleEnablePush = async () => {
    try {
      const res = await requestPushNotificationPermission();
      setPushStatus(res);
      if (res === 'granted') {
        await sendTestPushNotification();
        triggerTestFeedback();
      }
    } catch (error) {
      console.error('Error permisos push:', error);
    }
  };

  const handleTestPush = async () => {
    try {
      await sendTestPushNotification();
      triggerTestFeedback();
    } catch (error) {
      console.error('Error notificación prueba:', error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMarkDone = (e: React.MouseEvent, alert: NotificationAlert) => {
    e.stopPropagation();
    const lead = leads.find(l => l.id === alert.leadId);
    if (!lead) return;

    onUpdateLead({
      ...lead,
      status: lead.status === 'Nuevo' ? 'Contactado' : lead.status,
      nextContactDate: undefined,
      lastContact: leadTimestampNow(),
      history: [
        {
          id: `hist-pop-${Date.now()}`,
          date: leadHistoryDate(),
          time: leadTime(),
          author: 'Sistema',
          text: `Atendido desde campana de notificaciones: ${alert.title}`,
          type: 'note'
        },
        ...(lead.history || [])
      ]
    });
  };

  // Contenido adaptable interno
  const renderContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden bg-white">
      {/* Header Superior con Ajuste Anti-Desbordamiento */}
      <header className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
              Alertas de Seguimiento
            </h3>
            {isMobile && (
              <p className="text-[10px] text-slate-500 font-medium truncate">
                Pendientes y recordatorios
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200/80 text-[10px] font-bold whitespace-nowrap">
            {urgentCount} urgentes
          </span>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar notificaciones"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Banner Notificaciones Push */}
      <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            pushStatus === 'granted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {pushStatus === 'granted' ? <ShieldCheck className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1 truncate">
              <span>Push</span>
              {pushStatus === 'granted' && (
                <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1 rounded-full">
                  ACTIVAS
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              {pushStatus === 'granted' ? 'Alertas activas' : 'Alertas con app cerrada'}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {pushStatus === 'granted' ? (
            <button
              onClick={handleTestPush}
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer"
            >
              {pushTestSent ? '¡Enviada!' : 'Probar'}
            </button>
          ) : (
            <button
              onClick={handleEnablePush}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer"
            >
              Activar
            </button>
          )}
        </div>
      </div>

      {/* Lista Scrollable */}
      <ul className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1 list-none m-0 min-w-0">
        {alerts.length === 0 ? (
          <li className="py-10 px-4 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-xs text-slate-800">¡Sin alertas pendientes!</p>
          </li>
        ) : (
          alerts.slice(0, 10).map(alert => {
            const isOverdue = alert.category === 'overdue';
            const isToday = alert.category === 'today';
            const lead = leads.find(l => l.id === alert.leadId);

            return (
              <li key={alert.id}>
                <div
                  onClick={() => {
                    if (lead) onSelectLead(lead);
                    setIsOpen(false);
                  }}
                  className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group flex items-start gap-2.5"
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isOverdue 
                      ? 'bg-rose-100 text-rose-700' 
                      : isToday 
                      ? 'bg-amber-100 text-amber-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {isOverdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-[9px] font-extrabold uppercase ${
                        isOverdue ? 'text-rose-600' : isToday ? 'text-amber-600' : 'text-blue-600'
                      }`}>
                        {isOverdue ? `Vencido (${alert.scheduledDate})` : isToday ? 'HOY' : alert.scheduledDate}
                      </span>
                      <button
                        onClick={(e) => handleMarkDone(e, alert)}
                        className="text-[11px] text-emerald-600 font-bold hover:underline py-0.5 px-1 cursor-pointer"
                      >
                        ✓ Atendido
                      </button>
                    </div>

                    <div className="font-bold text-xs text-slate-900 truncate mt-0.5 group-hover:text-blue-600 transition-colors">
                      {alert.title}
                    </div>

                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {alert.company} • {alert.role}
                    </div>
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>

      {/* Footer CTA */}
      <footer className="p-3 bg-slate-50 border-t border-slate-100 shrink-0">
        <button
          onClick={() => {
            onNavigateToNotifications();
            setIsOpen(false);
          }}
          className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span>Ver todas las alertas e historial</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );

  return (
    <div className="relative" ref={popoverRef}>
      {/* Botón Campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Alertas y notificaciones${urgentCount > 0 ? `, ${urgentCount} urgentes` : ''}`}
        title="Alertas de seguimiento de leads"
        className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
          isOpen 
            ? 'bg-[#0071E3]/10 text-[#0071E3]' 
            : 'text-slate-600 hover:bg-[#F5F5F7]'
        }`}
      >
        <Bell className="w-4 h-4" />
        {urgentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-white">
            {urgentCount}
          </span>
        )}
      </button>

      {/* VISTA DESKTOP (PC: >= sm) */}
      {isOpen && (
        <div className="hidden sm:block absolute right-0 top-full mt-2.5 w-96 max-h-[80vh] bg-white border border-slate-200/90 rounded-3xl shadow-2xl z-50 overflow-hidden">
          {renderContent(false)}
        </div>
      )}

      {/* VISTA MÓVIL (< sm) - PANEL LATERAL QUE RESPETA LA BARRA NAVEGACIÓN INFERIOR */}
      {isOpen && isMounted && createPortal(
        <>
          {/* Fondo semitransparente */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel móvil: Anclado desde arriba (top-0) hasta la barra de navegación */}
          <div className="fixed top-0 left-0 right-0 bottom-[var(--bottom-nav-reserve)] z-40 bg-white flex flex-col w-full max-w-full overflow-hidden sm:hidden shadow-2xl border-b border-slate-200 animate-in slide-in-from-right duration-200">
            {renderContent(true)}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};