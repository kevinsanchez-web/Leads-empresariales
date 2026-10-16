import React, { useState } from 'react';
import { 
  Bell, 
  Clock, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Video, 
  Filter, 
  ChevronRight,
  Check,
  X,
  Sparkles,
  Calendar
} from 'lucide-react';
import { Lead, NotificationAlert, UserRep } from '../types';
import { getNotificationAlerts } from '../utils/notifications';
import { leadHistoryDate, leadTime, leadTimestampNow } from '../utils/date';
import { RoundedSelect } from './RoundedSelect';

interface NotificationsViewProps {
  leads: Lead[];
  users: UserRep[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  leads,
  users,
  onSelectLead,
  onUpdateLead
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'overdue' | 'today' | 'upcoming' | 'priority'>('all');
  const [repFilter, setRepFilter] = useState<string>('all');
  const [reprogramLeadId, setReprogramLeadId] = useState<string | null>(null);
  const [newDateValue, setNewDateValue] = useState<string>('');

  const allAlerts = getNotificationAlerts(leads);

  // Filtrado de alertas
  const filteredAlerts = allAlerts.filter(alert => {
    if (selectedCategory !== 'all' && alert.category !== selectedCategory) return false;
    if (repFilter !== 'all' && alert.capturedBy !== repFilter) return false;
    return true;
  });

  // Conteo de métricas
  const countOverdue = allAlerts.filter(a => a.category === 'overdue').length;
  const countToday = allAlerts.filter(a => a.category === 'today').length;
  const countUpcoming = allAlerts.filter(a => a.category === 'upcoming').length;
  const countPriority = allAlerts.filter(a => a.category === 'priority').length;

  const handleMarkAsDone = (alert: NotificationAlert) => {
    const lead = leads.find(l => l.id === alert.leadId);
    if (!lead) return;

    const updatedLead: Lead = {
      ...lead,
      status: lead.status === 'Nuevo' ? 'Contactado' : lead.status,
      lastContact: leadTimestampNow(),
      nextContactDate: undefined,
      history: [
        {
          id: `hist-notif-${Date.now()}`,
          date: leadHistoryDate(),
          time: leadTime(),
          author: alert.capturedBy || 'Sistema',
          text: `Seguimiento completado: "${alert.title}"`,
          type: 'note'
        },
        ...lead.history
      ]
    };

    onUpdateLead(updatedLead);
  };

  const handleReprogramDate = (leadId: string) => {
    if (!newDateValue) return;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const updatedLead: Lead = {
      ...lead,
      nextContactDate: newDateValue,
      history: [
        {
          id: `hist-resched-${Date.now()}`,
          date: leadHistoryDate(),
          time: leadTime(),
          author: lead.capturedBy || 'Sistema',
          text: `Fecha de contacto reprogramada para ${newDateValue}.`,
          type: 'meeting'
        },
        ...lead.history
      ]
    };

    onUpdateLead(updatedLead);
    setReprogramLeadId(null);
    setNewDateValue('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="w-3.5 h-3.5 text-blue-600" />;
      case 'email': return <Mail className="w-3.5 h-3.5 text-emerald-600" />;
      case 'meeting': return <Video className="w-3.5 h-3.5 text-purple-600" />;
      default: return <Clock className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  const tabs = [
    { id: 'all', label: 'Todas', count: allAlerts.length, badgeBg: 'bg-slate-200/60 text-slate-700' },
    { id: 'overdue', label: 'Vencidas', count: countOverdue, badgeBg: 'bg-rose-100 text-rose-700' },
    { id: 'today', label: 'Hoy', count: countToday, badgeBg: 'bg-amber-100 text-amber-700' },
    { id: 'upcoming', label: 'Próximas', count: countUpcoming, badgeBg: 'bg-blue-100 text-blue-700' },
    { id: 'priority', label: 'Prioritarias', count: countPriority, badgeBg: 'bg-purple-100 text-purple-700' },
  ];

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto animate-fade-in flex flex-col flex-1">
      {/* Contenedor Único Integrado de Alto Completo */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 flex flex-col min-w-0">
        
        {/* 1. Header Integrado */}
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">Notificaciones & Alertas</h2>
              <p className="text-xs text-slate-500 font-medium truncate">Seguimiento de interacción con prospectos</p>
            </div>
          </div>

          {/* Filtro de Usuario */}
          <div className="flex items-center gap-1.5 bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60 self-start sm:self-auto max-w-full min-w-0">
            <Filter className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="text-xs font-medium text-slate-500 shrink-0">Usuario:</span>
            <RoundedSelect
              variant="bare"
              value={repFilter}
              onChange={setRepFilter}
              ariaLabel="Filtrar por usuario"
              className="min-w-0"
              buttonClassName="bg-transparent text-base sm:text-xs font-semibold text-slate-800 focus:outline-none pr-6 py-0"
              options={[
                { value: 'all', label: 'Todos' },
                ...users.map(u => ({ value: u.name, label: u.name }))
              ]}
            />
          </div>
        </div>

        {/* 2. Barra de Filtros Integrada */}
        <div className="relative shrink-0 border-b border-slate-100 min-w-0">
          <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50/50 flex items-center gap-1.5 overflow-x-auto overscroll-x-contain scrollbar-none">
            {tabs.map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap border shrink-0 ${
                    isActive
                      ? 'bg-primary text-white shadow-2xs border-primary'
                      : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-100/60 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : tab.badgeBg
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Indicador de scroll en móvil */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-slate-50/95 to-transparent sm:hidden" />
        </div>

        {/* 3. Cuerpo de Notificaciones (se extiende verticalmente) */}
        <div className="p-3.5 sm:p-4 flex-1 flex flex-col min-w-0">
          {filteredAlerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">¡Al día! No hay alertas pendientes.</h3>
              <p className="text-xs text-slate-400 mt-1">Todas tus tareas de seguimiento están al corriente.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map((alert) => {
                const lead = leads.find(l => l.id === alert.leadId);
                if (!lead) return null;

                const isOverdue = alert.category === 'overdue';
                const isToday = alert.category === 'today';

                return (
                  <div
                    key={alert.id}
                    className="bg-slate-50/50 hover:bg-slate-100/50 rounded-xl p-3 border border-slate-200/60 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0"
                  >
                    {/* Detalle */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isOverdue 
                          ? 'bg-rose-50 text-rose-600' 
                          : isToday 
                          ? 'bg-amber-50 text-amber-600' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {getTypeIcon(alert.type)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 min-w-0 break-words">
                            {alert.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5 shrink-0" />
                            {alert.scheduledDate}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                          <strong className="font-semibold text-slate-800">{lead.name}</strong> 
                          <span className="text-slate-400"> ({lead.company})</span> 
                          <span className="text-slate-300"> • </span>
                          <span className="text-slate-500">{alert.capturedBy}</span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 min-w-0 sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/40 sm:justify-end">
                      {reprogramLeadId === lead.id ? (
                        <div className="col-span-3 flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                          <input
                            type="date"
                            value={newDateValue}
                            onChange={(e) => setNewDateValue(e.target.value)}
                            className="px-2 py-1 text-base sm:text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none flex-1 min-w-0"
                          />
                          <button
                            onClick={() => handleReprogramDate(lead.id)}
                            className="p-1.5 bg-primary hover:bg-primary-hover text-white rounded-md transition-colors cursor-pointer shrink-0"
                            title="Confirmar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setReprogramLeadId(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer shrink-0"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setReprogramLeadId(lead.id);
                            setNewDateValue(alert.scheduledDate || new Date().toISOString().slice(0, 10));
                          }}
                          className="justify-center px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 rounded-lg text-xs font-semibold transition-colors cursor-pointer min-w-0 truncate"
                        >
                          Reprogramar
                        </button>
                      )}

                      <button
                        onClick={() => handleMarkAsDone(alert)}
                        className="justify-center px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer min-w-0 truncate"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">Atendido</span>
                      </button>

                      <button
                        onClick={() => onSelectLead(lead)}
                        className="justify-center px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-0.5 transition-colors cursor-pointer shadow-2xs min-w-0 truncate"
                      >
                        <span className="truncate">Ver</span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};