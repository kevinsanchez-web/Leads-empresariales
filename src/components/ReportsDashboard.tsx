import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  CartesianGrid
} from 'recharts';
import { 
  BarChart3, 
  Users, 
  CheckCircle2, 
  Award, 
  FileSpreadsheet
} from 'lucide-react';
import { Lead, UserRep, EventOption } from '../types';
import { LeadsTrendChart } from './LeadsTrendChart';

interface ReportsDashboardProps {
  leads: Lead[];
  users: UserRep[];
  events: EventOption[];
  currentEvent: EventOption;
}

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  leads,
  users,
  events,
  currentEvent
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>(currentEvent.id);
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('all');

  // Filter leads based on reports selector
  const filteredLeads = leads.filter(lead => {
    const matchesEvent = selectedEventId === 'all' || lead.event === events.find(e => e.id === selectedEventId)?.name;
    const matchesRep = selectedRepFilter === 'all' || lead.capturedBy === selectedRepFilter;
    return matchesEvent && matchesRep;
  });

  // KPI Calculations
  const totalLeads = filteredLeads.length;
  const priorityLeads = filteredLeads.filter(l => l.priority).length;
  const qualifiedLeads = filteredLeads.filter(l => l.status === "Calificado" || l.status === "Reunión Agendada" || l.status === "Ganado").length;
  const conversionRate = totalLeads > 0 ? ((qualifiedLeads / totalLeads) * 100).toFixed(1) : "0";

  // Chart Data 1: Leads by Interests
  const interestCounts: { [key: string]: number } = {};
  filteredLeads.forEach(l => {
    l.interests.forEach(interest => {
      interestCounts[interest] = (interestCounts[interest] || 0) + 1;
    });
  });

  const interestsData = Object.entries(interestCounts)
    .map(([name, count]) => ({ name, value: count }))
    .sort((a, b) => b.value - a.value);

  // Chart Data 4: Daily Lead Timeline Simulation
  const timelineData = [
    { day: 'Día 1 (09:00)', capturas: 12 },
    { day: 'Día 1 (14:00)', capturas: 28 },
    { day: 'Día 2 (09:00)', capturas: 45 },
    { day: 'Día 2 (14:00)', capturas: 72 },
    { day: 'Día 3 (09:00)', capturas: 98 },
    { day: 'Día 3 (17:00)', capturas: totalLeads || 128 }
  ];

  const handleExportCSV = () => {
    const headers = ["ID", "Nombre", "Cargo", "Empresa", "Email", "Telefono", "Evento", "Intereses", "Fuentes", "ReportadoPor", "Estado", "Prioritario"];
    const rows = filteredLeads.map(l => [
      l.id,
      `"${l.name}"`,
      `"${l.role}"`,
      `"${l.company}"`,
      l.email,
      l.phone,
      `"${l.event}"`,
      `"${l.interests.join(';')}"`,
      `"${l.sources.join(';')}"`,
      `"${l.capturedBy}"`,
      l.status,
      l.priority ? "Si" : "No"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Leads_${currentEvent.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Header Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1D1D1F]">Reportes & Analítica</h2>
            <p className="text-xs text-slate-500">Métricas consolidadas de rendimiento</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-3 py-1.5 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs font-semibold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
          >
            <option value="all">Todos los Eventos</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          <select
            value={selectedRepFilter}
            onChange={(e) => setSelectedRepFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs font-semibold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
          >
            <option value="all">Todos los Usuarios</option>
            {users.map(u => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-[#34C759] hover:bg-[#28A745] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/[0.06] shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Leads</div>
          <div className="text-2xl font-bold text-[#1D1D1F] mt-1">{totalLeads}</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/[0.06] shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tasa Calificación</div>
          <div className="text-2xl font-bold text-[#1D1D1F] mt-1">{conversionRate}%</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/[0.06] shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Prioritarios</div>
          <div className="text-2xl font-bold text-[#FF9500] mt-1">{priorityLeads}</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/[0.06] shadow-2xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Top Interés</div>
          <div className="text-base font-bold text-[#0071E3] truncate mt-1">
            {interestsData[0]?.name || "N/A"}
          </div>
        </div>
      </div>

      {/* Trend Line Chart by Day */}
      <LeadsTrendChart
        leads={filteredLeads}
        currentEvent={events.find(e => e.id === selectedEventId) || currentEvent}
      />

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Interests */}
        <div className="bg-white p-5 rounded-3xl border border-black/[0.06] shadow-2xs">
          <h3 className="text-sm font-bold text-[#1D1D1F] mb-3">Intereses Principales</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={interestsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F5F5F7" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#86868B' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#1D1D1F', fontWeight: 600 }} width={90} />
                <Tooltip contentStyle={{ backgroundColor: '#1D1D1F', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }} />
                <Bar dataKey="value" fill="#5856D6" radius={[0, 6, 6, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline Summary */}
        <div className="bg-white p-5 rounded-3xl border border-black/[0.06] shadow-2xs">
          <h3 className="text-sm font-bold text-[#1D1D1F] mb-3">Ritmo Horario de Capturas</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F7" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#86868B' }} />
                <YAxis tick={{ fontSize: 10, fill: '#86868B' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1D1D1F', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }} />
                <Area type="monotone" dataKey="capturas" stroke="#0071E3" strokeWidth={2} fill="#0071E3" fillOpacity={0.12} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};

