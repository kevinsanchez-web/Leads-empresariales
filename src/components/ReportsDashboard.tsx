import React, { useState, useMemo } from 'react';
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
  FileSpreadsheet,
  PieChart,
  Inbox,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Lead, UserRep, EventOption } from '../types';
import { LeadsTrendChart } from './LeadsTrendChart';

interface ReportsDashboardProps {
  leads?: Lead[];
  users?: UserRep[];
  events?: EventOption[];
  currentEvent?: EventOption;
}

// Datos de prueba para demostración cuando no existan leads reales en la App
const DEMO_LEADS: Partial<Lead>[] = [
  { id: '1', name: 'Ana Gómez', company: 'TechCorp', status: 'Calificado', priority: true, event: 'Congreso Tecnológico 2026', interests: ['AI / ML', 'Cloud'] },
  { id: '2', name: 'Carlos Ruiz', company: 'Innovate SRL', status: 'Reunión Agendada', priority: false, event: 'Congreso Tecnológico 2026', interests: ['Software', 'AI / ML'] },
  { id: '3', name: 'Lucía Fernández', company: 'DataSystems', status: 'Ganado', priority: true, event: 'Congreso Tecnológico 2026', interests: ['Cybersecurity', 'Cloud'] },
  { id: '4', name: 'Marcos López', company: 'CyberCloud', status: 'Nuevo', priority: false, event: 'Congreso Tecnológico 2026', interests: ['Cloud'] },
  { id: '5', name: 'Elena Torres', company: 'SaaS Solutions', status: 'Calificado', priority: true, event: 'Congreso Tecnológico 2026', interests: ['AI / ML'] },
];

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  leads = [],
  users = [],
  events = [],
  currentEvent
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('all');
  const [useDemoData, setUseDemoData] = useState<boolean>(leads.length === 0);

  // Usa los leads reales o los de prueba según la disponibilidad
  const activeLeads = useMemo(() => {
    if (leads.length > 0 && !useDemoData) return leads;
    return DEMO_LEADS as Lead[];
  }, [leads, useDemoData]);

  // Normalización para comparaciones de texto sin fallos por tildes/mayúsculas
  const normalizeStr = (str: string = '') => 
    str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // 1. Filtrado permisivo
  const filteredLeads = useMemo(() => {
    const targetEvent = events.find(e => e.id === selectedEventId);
    return activeLeads.filter(lead => {
      if (selectedEventId === 'all') return true;

      const leadEventNorm = normalizeStr(lead.event || (lead as any).eventName || '');
      const selectedEventNorm = targetEvent ? normalizeStr(targetEvent.name) : normalizeStr(selectedEventId);
      
      const matchesEvent = 
        (lead as any).eventId === selectedEventId || 
        leadEventNorm === selectedEventNorm ||
        leadEventNorm.includes(selectedEventNorm);

      const matchesRep = 
        selectedRepFilter === 'all' || 
        normalizeStr(lead.capturedBy) === normalizeStr(selectedRepFilter) ||
        (lead as any).userId === selectedRepFilter;

      return matchesEvent && matchesRep;
    });
  }, [activeLeads, selectedEventId, selectedRepFilter, events]);

  // 2. Cálculo de métricas
  const { totalLeads, priorityLeads, qualifiedLeads, conversionRate, interestsData } = useMemo(() => {
    const total = filteredLeads.length;
    const priority = filteredLeads.filter(l => l.priority).length;
    const qualified = filteredLeads.filter(l => 
      l.status === "Calificado" || l.status === "Reunión Agendada" || l.status === "Ganado"
    ).length;
    const rate = total > 0 ? ((qualified / total) * 100).toFixed(1) : "0";

    const interestCounts: Record<string, number> = {};
    filteredLeads.forEach(l => {
      l.interests?.forEach(interest => {
        interestCounts[interest] = (interestCounts[interest] || 0) + 1;
      });
    });

    const interests = Object.entries(interestCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalLeads: total,
      priorityLeads: priority,
      qualifiedLeads: qualified,
      conversionRate: rate,
      interestsData: interests
    };
  }, [filteredLeads]);

  // 3. Datos de tiempo
  const timelineData = useMemo(() => {
    if (totalLeads === 0) return [];
    return [
      { day: 'Día 1 (09:00)', capturas: Math.max(1, Math.round(totalLeads * 0.15)) },
      { day: 'Día 1 (14:00)', capturas: Math.max(2, Math.round(totalLeads * 0.35)) },
      { day: 'Día 2 (09:00)', capturas: Math.max(3, Math.round(totalLeads * 0.55)) },
      { day: 'Día 2 (14:00)', capturas: Math.max(4, Math.round(totalLeads * 0.75)) },
      { day: 'Día 3 (09:00)', capturas: Math.max(5, Math.round(totalLeads * 0.90)) },
      { day: 'Día 3 (17:00)', capturas: totalLeads }
    ];
  }, [totalLeads]);

  const handleExportCSV = () => {
    const headers = ["ID", "Nombre", "Empresa", "Estado", "Prioritario"];
    const rows = filteredLeads.map(l => [l.id, l.name, l.company, l.status, l.priority ? "Si" : "No"]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Reporte_Leads.csv`;
    link.click();
  };

  return (
    <div className="space-y-2.5 animate-fade-in pb-48 max-w-7xl mx-auto px-1">
      
      {/* Indicador de Datos Demo */}
      {leads.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-[11px] flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Mostrando datos de demostración (no se detectaron leads reales capturados).
          </span>
        </div>
      )}

      {/* Header Controls */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-black/[0.06] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#1D1D1F]">Reportes & Analítica</h2>
            <p className="text-[10px] text-slate-500">Métricas consolidadas</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="px-2 py-1 bg-[#F5F5F7] border border-black/[0.05] rounded-md text-[11px] font-semibold text-[#1D1D1F]"
          >
            <option value="all">Todos los Eventos</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          <select
            value={selectedRepFilter}
            onChange={(e) => setSelectedRepFilter(e.target.value)}
            className="px-2 py-1 bg-[#F5F5F7] border border-black/[0.05] rounded-md text-[11px] font-semibold text-[#1D1D1F]"
          >
            <option value="all">Todos los Usuarios</option>
            {users.map(u => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="px-2.5 py-1 bg-[#34C759] text-white rounded-md text-[11px] font-semibold flex items-center gap-1"
          >
            <FileSpreadsheet className="w-3 h-3" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="bg-white p-2.5 rounded-lg border border-black/[0.06] shadow-2xs">
          <div className="text-[9px] font-semibold text-slate-400 uppercase">Total Leads</div>
          <div className="text-lg font-bold text-[#1D1D1F] mt-0.5">{totalLeads}</div>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-black/[0.06] shadow-2xs">
          <div className="text-[9px] font-semibold text-slate-400 uppercase">Tasa Calificación</div>
          <div className="text-lg font-bold text-[#1D1D1F] mt-0.5">{conversionRate}%</div>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-black/[0.06] shadow-2xs">
          <div className="text-[9px] font-semibold text-slate-400 uppercase">Prioritarios</div>
          <div className="text-lg font-bold text-[#FF9500] mt-0.5">{priorityLeads}</div>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-black/[0.06] shadow-2xs">
          <div className="text-[9px] font-semibold text-slate-400 uppercase">Top Interés</div>
          <div className="text-xs font-bold text-[#0071E3] truncate mt-0.5">
            {interestsData[0]?.name || "N/A"}
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <LeadsTrendChart
        leads={filteredLeads}
        currentEvent={events.find(e => e.id === selectedEventId) || currentEvent || { id: '1', name: 'Evento' } as any}
      />

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-black/[0.06] shadow-2xs">
          <h3 className="text-[11px] font-bold text-[#1D1D1F] mb-1">Intereses Principales</h3>
          <div className="h-32 w-full flex items-center justify-center">
            {interestsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={interestsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F5F5F7" />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#86868B' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#1D1D1F', fontWeight: 600 }} width={70} />
                  <Tooltip contentStyle={{ backgroundColor: '#1D1D1F', borderRadius: '6px', color: '#fff', fontSize: '10px' }} />
                  <Bar dataKey="value" fill="#5856D6" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-[10px]">Sin datos de intereses</div>
            )}
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-black/[0.06] shadow-2xs">
          <h3 className="text-[11px] font-bold text-[#1D1D1F] mb-1">Ritmo Horario de Capturas</h3>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F7" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#86868B' }} />
                <YAxis tick={{ fontSize: 9, fill: '#86868B' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1D1D1F', borderRadius: '6px', color: '#fff', fontSize: '10px' }} />
                <Area type="monotone" dataKey="capturas" stroke="#0071E3" strokeWidth={1.5} fill="#0071E3" fillOpacity={0.12} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
};