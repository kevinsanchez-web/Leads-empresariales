import React, { useState, useRef, useEffect } from 'react';
import { Bell, AlertTriangle, Clock, CheckCircle2, ChevronRight, X, ShieldCheck, Zap } from 'lucide-react';
import { Lead, NotificationAlert } from '../types';
import { getNotificationAlerts } from '../utils/notifications';
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
  const [pushStatus, setPushStatus] = useState<NotificationPermissionStatus>(getNotificationPermissionStatus());
  const [pushTestSent, setPushTestSent] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const alerts = getNotificationAlerts(leads);
  const urgentCount = alerts.filter(a => a.category === 'overdue' || a.category === 'today' || a.category === 'priority').length;

  useEffect(() => {
    setPushStatus(getNotificationPermissionStatus());
  }, [isOpen]);

  const handleEnablePush = async () => {
    const res = await requestPushNotificationPermission();
    setPushStatus(res);
    if (res === 'granted') {
      sendTestPushNotification();
      setPushTestSent(true);
      setTimeout(() => setPushTestSent(false), 3000);
    }
  };

  const handleTestPush = async () => {
    await sendTestPushNotification();
    setPushTestSent(true);
    setTimeout(() => setPushTestSent(false), 3000);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkDone = (e: React.MouseEvent, alert: NotificationAlert) => {
    e.stopPropagation();
    const lead = leads.find(l => l.id === alert.leadId);
    if (!lead) return;

    onUpdateLead({
      ...lead,
      status: lead.status === 'Nuevo' ? 'Contactado' : lead.status,
      nextContactDate: undefined,
      lastContact: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      history: [
        {
          id: `hist-pop-${Date.now()}`,
          date: 'Hoy',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          author: 'Sistema',
          text: `Atendido desde campana de notificaciones: ${alert.title}`,
          type: 'note'
        },
        ...lead.history
      ]
    });
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
          isOpen 
            ? 'bg-[#0071E3]/10 text-[#0071E3]' 
            : 'text-slate-600 hover:bg-[#F5F5F7]'
        }`}
        title="Alertas de seguimiento de leads"
        aria-label="Alertas y notificaciones"
      >
        <Bell className="w-4 h-4" />
        {urgentCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse border-2 border-white shadow-xs">
            {urgentCount}
          </span>
        )}
      </button>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 sm:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Popover Card */}
      {isOpen && (
        <div className="fixed inset-x-3 top-14 sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-96 max-w-full bg-white border border-slate-200/90 rounded-3xl shadow-2xl z-50 overflow-hidden animate-fade-in">
          
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900">Alertas de Seguimiento</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 text-[10px] sm:text-[11px] font-bold">
                {urgentCount} urgentes
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors sm:hidden cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Push Notifications Configuration Card */}
          <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                pushStatus === 'granted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {pushStatus === 'granted' ? <ShieldCheck className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1 leading-tight">
                  <span>Notificaciones Push</span>
                  {pushStatus === 'granted' && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full">
                      ACTIVAS
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  {pushStatus === 'granted' 
                    ? 'Alertas en segundo plano para leads prioritarios' 
                    : 'Recibe alertas aunque la app esté cerrada'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {pushStatus === 'granted' ? (
                <button
                  onClick={handleTestPush}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Enviar notificación de prueba al navegador"
                >
                  {pushTestSent ? '¡Enviada! ⚡' : 'Probar Alerta'}
                </button>
              ) : (
                <button
                  onClick={handleEnablePush}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  Activar Push
                </button>
              )}
            </div>
          </div>

          {/* Alert Items List */}
          <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800">¡Sin alertas pendientes!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Todos los contactos programados están al día.</p>
              </div>
            ) : (
              alerts.slice(0, 5).map(alert => {
                const isOverdue = alert.category === 'overdue';
                const isToday = alert.category === 'today';
                const lead = leads.find(l => l.id === alert.leadId);

                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      if (lead) onSelectLead(lead);
                      setIsOpen(false);
                    }}
                    className="p-2.5 sm:p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group flex items-start gap-2.5 sm:gap-3"
                  >
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isOverdue 
                        ? 'bg-rose-100 text-rose-700' 
                        : isToday 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isOverdue ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-[10px] font-extrabold uppercase ${
                          isOverdue ? 'text-rose-600' : isToday ? 'text-amber-600' : 'text-blue-600'
                        }`}>
                          {isOverdue ? `Vencido (${alert.scheduledDate})` : isToday ? 'HOY' : alert.scheduledDate}
                        </span>
                        <button
                          onClick={(e) => handleMarkDone(e, alert)}
                          className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline py-0.5 px-1 cursor-pointer"
                          title="Marcar como atendido"
                        >
                          ✓ Atendido
                        </button>
                      </div>

                      <div className="font-bold text-xs text-slate-900 truncate mt-0.5 group-hover:text-blue-600 transition-colors">
                        {alert.title}
                      </div>

                      <div className="text-[11px] text-slate-500 truncate">
                        {alert.company} • {alert.role}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer View All CTA */}
          <div className="p-2.5 sm:p-3 bg-slate-50 border-t border-slate-100">
            <button
              onClick={() => {
                onNavigateToNotifications();
                setIsOpen(false);
              }}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
            >
              <span>Ver todas las alertas e historial</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};