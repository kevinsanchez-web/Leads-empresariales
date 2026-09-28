import React, { useState } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Video, 
  Filter, 
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { Lead, NotificationAlert, UserRep } from '../types';
import { getNotificationAlerts } from '../utils/notifications';

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

  // Filter alerts by category & rep
  const filteredAlerts = allAlerts.filter(alert => {
    if (selectedCategory !== 'all' && alert.category !== selectedCategory) return false;
    if (repFilter !== 'all' && alert.capturedBy !== repFilter) return false;
    return true;
  });

  // Count stats
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
      lastContact: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      nextContactDate: undefined,
      history: [
        {
          id: `hist-notif-${Date.now()}`,
          date: 'Hoy',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
          date: 'Hoy',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
      case 'call': return <Phone className="w-4 h-4 text-blue-600" />;
      case 'email': return <Mail className="w-4 h-4 text-emerald-600" />;
      case 'meeting': return <Video className="w-4 h-4 text-purple-600" />;
      default: return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">Notificaciones & Alertas</h2>
        </div>

        {/* Rep Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Usuario:
          </span>
          <select
            value={repFilter}
            onChange={(e) => setRepFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
          >
            <option value="all">Todos</option>
            {users.map(u => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Todas ({allAlerts.length})
        </button>
        <button
          onClick={() => setSelectedCategory('overdue')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'overdue'
              ? 'bg-rose-600 text-white'
              : 'bg-white border border-slate-200 text-rose-700 hover:bg-rose-50'
          }`}
        >
          Vencidas ({countOverdue})
        </button>
        <button
          onClick={() => setSelectedCategory('today')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'today'
              ? 'bg-amber-600 text-white'
              : 'bg-white border border-slate-200 text-amber-700 hover:bg-amber-50'
          }`}
        >
          Hoy ({countToday})
        </button>
        <button
          onClick={() => setSelectedCategory('upcoming')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'upcoming'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-slate-200 text-blue-700 hover:bg-blue-50'
          }`}
        >
          Próximas ({countUpcoming})
        </button>
        <button
          onClick={() => setSelectedCategory('priority')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            selectedCategory === 'priority'
              ? 'bg-purple-600 text-white'
              : 'bg-white border border-slate-200 text-purple-700 hover:bg-purple-50'
          }`}
        >
          Prioritarias ({countPriority})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/60">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">¡Al día! No hay alertas pendientes.</h3>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const lead = leads.find(l => l.id === alert.leadId);
            if (!lead) return null;

            const isOverdue = alert.category === 'overdue';
            const isToday = alert.category === 'today';

            return (
              <div
                key={alert.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/60 hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Left Column */}
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isOverdue ? 'bg-rose-50' : isToday ? 'bg-amber-50' : 'bg-blue-50'
                  }`}>
                    {getTypeIcon(alert.type)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {alert.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-medium">• {alert.scheduledDate}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      <strong className="text-slate-700">{lead.name}</strong> ({lead.company}) • {alert.capturedBy}
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {reprogramLeadId === lead.id ? (
                    <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
                      <input
                        type="date"
                        value={newDateValue}
                        onChange={(e) => setNewDateValue(e.target.value)}
                        className="px-2 py-0.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                      <button
                        onClick={() => handleReprogramDate(lead.id)}
                        className="px-2 py-0.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setReprogramLeadId(null)}
                        className="text-xs text-slate-400 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setReprogramLeadId(lead.id);
                        setNewDateValue(alert.scheduledDate || new Date().toISOString().slice(0, 10));
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Reprogramar
                    </button>
                  )}

                  <button
                    onClick={() => handleMarkAsDone(alert)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Atendido</span>
                  </button>

                  <button
                    onClick={() => onSelectLead(lead)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
