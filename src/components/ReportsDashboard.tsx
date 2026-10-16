import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList
} from 'recharts';
import {
  BarChart3,
  FileSpreadsheet,
  Sparkles,
  X,
  Inbox,
  Star,
  Target,
  Zap,
  Trophy,
  ChevronDown,
  FileText
} from 'lucide-react';
import { Lead, UserRep, EventOption } from '../types';
import { LeadsTrendChart } from './LeadsTrendChart';
import { RoundedSelect } from './RoundedSelect';
import { DatePicker } from './DatePicker';
import { formatShortDayLabel, parseLeadTimestamp, todayISODate } from '../utils/date';
import { exportLeadsToCsv, exportLeadsToXlsx } from '../utils/spreadsheet';

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
  { id: '5', name: 'Elena Torres', company: 'SaaS Solutions', status: 'Calificado', priority: true, event: 'Congreso Tecnológico 2026', interests: ['AI / ML'] }
];

// Normalización para comparaciones de texto sin fallos por tildes/mayúsculas
const normalizeStr = (str: string = '') =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const isQualified = (l: Lead) =>
  l.status === 'Calificado' || l.status === 'Reunión Agendada' || l.status === 'Ganado';

type KpiId = 'total' | 'vip' | 'rate' | 'peak' | 'interest';

const KPI_LABELS: Record<KpiId, string> = {
  total: 'Total Leads',
  vip: 'Leads VIP',
  rate: 'Tasa de Calificación',
  peak: 'Pico de Captura',
  interest: 'Top Interés'
};

interface Metrics {
  total: number;
  vip: number;
  qualified: number;
  rate: number;
  peak: { count: number; date: string | null };
  topInterest: { name: string; count: number };
  interests: { name: string; value: number }[];
}

const computeMetrics = (leads: Lead[]): Metrics => {
  const total = leads.length;
  const vip = leads.filter(l => l.priority).length;
  const qualified = leads.filter(isQualified).length;
  const rate = total > 0 ? (qualified / total) * 100 : 0;

  const interestCounts: Record<string, number> = {};
  leads.forEach(l => {
    l.interests?.forEach(interest => {
      interestCounts[interest] = (interestCounts[interest] || 0) + 1;
    });
  });
  const interests = Object.entries(interestCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const dayCounts: Record<string, number> = {};
  leads.forEach(l => {
    const ts = parseLeadTimestamp(l.capturedAt);
    if (ts === null) return;
    const day = todayISODate(new Date(ts));
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });
  const peakEntries = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]);
  const peak = peakEntries.length > 0
    ? { count: peakEntries[0][1], date: peakEntries[0][0] }
    : { count: 0, date: null };

  return {
    total,
    vip,
    qualified,
    rate,
    peak,
    topInterest: interests[0] ? { name: interests[0].name, count: interests[0].value } : { name: '', count: 0 },
    interests
  };
};

/** Comparación contra el evento anterior: verde al subir, rojo al bajar, nunca naranja. */
const TrendBadge: React.FC<{
  current: number;
  previous: number | null;
  mode?: 'pct' | 'pp' | 'abs';
  suffix?: string;
}> = ({ current, previous, mode = 'pct', suffix = '' }) => {
  if (previous === null) {
    return (
      <span className="text-[9px] font-semibold text-slate-300 mt-1 block">–</span>
    );
  }
  const diff = +(current - previous).toFixed(1);
  const cls = diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-400';
  const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '–';

  let text: string;
  if (mode === 'pp') {
    text = `${diff > 0 ? '+' : ''}${diff.toFixed(1)} pp`;
  } else if (mode === 'abs') {
    text = `${diff > 0 ? '+' : ''}${diff}${suffix}`;
  } else if (previous === 0) {
    text = current === 0 ? '0%' : 'nuevo';
  } else {
    const pct = ((current - previous) / previous) * 100;
    text = `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`;
  }

  return (
    <span className={`text-[9px] font-bold mt-1 block ${cls}`}>
      {arrow} {text} <span className="font-medium text-slate-400">vs. anterior</span>
    </span>
  );
};

// Bloques fijos del mapa de calor: evita las etiquetas apretadas del eje horario
const TIME_BLOCKS = [
  { label: '00–08', from: 0, to: 8 },
  { label: '08–10', from: 8, to: 10 },
  { label: '10–12', from: 10, to: 12 },
  { label: '12–14', from: 12, to: 14 },
  { label: '14–16', from: 14, to: 16 },
  { label: '16–18', from: 16, to: 18 },
  { label: '18+', from: 18, to: 24 }
];

const heatColor = (intensity: number): React.CSSProperties =>
  intensity <= 0
    ? { backgroundColor: '#F8FAFC', color: '#CBD5E1' }
    : {
        backgroundColor: `color-mix(in srgb, var(--color-primary) ${intensity}%, #ffffff)`,
        color: intensity >= 55 ? '#ffffff' : '#1E293B'
      };

export const ReportsDashboard: React.FC<ReportsDashboardProps> = ({
  leads = [],
  users = [],
  events = [],
  currentEvent
}) => {
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedRepFilter, setSelectedRepFilter] = useState<string>('all');
  const [useDemoData, setUseDemoData] = useState<boolean>(leads.length === 0);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [activeKpi, setActiveKpi] = useState<KpiId | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Usa los leads reales o los de prueba según la disponibilidad
  const activeLeads = useMemo(() => {
    if (leads.length > 0 && !useDemoData) return leads;
    return DEMO_LEADS as Lead[];
  }, [leads, useDemoData]);

  // 1. Filtrado por evento y representante (permisivo con nombres/ids variados)
  const filterByEventRep = (list: Lead[], eventId: string, rep: string) => {
    if (eventId === 'all' && rep === 'all') return list;
    const targetEvent = events.find(e => e.id === eventId);
    return list.filter(lead => {
      const matchesEvent = eventId === 'all' || (() => {
        const leadEventNorm = normalizeStr(lead.event || (lead as any).eventName || '');
        const selectedEventNorm = targetEvent ? normalizeStr(targetEvent.name) : normalizeStr(eventId);
        return (
          (lead as any).eventId === eventId ||
          leadEventNorm === selectedEventNorm ||
          leadEventNorm.includes(selectedEventNorm)
        );
      })();

      const matchesRep =
        rep === 'all' ||
        normalizeStr(lead.capturedBy) === normalizeStr(rep) ||
        (lead as any).userId === rep;

      return matchesEvent && matchesRep;
    });
  };

  const eventLeads = useMemo(
    () => filterByEventRep(activeLeads, selectedEventId, selectedRepFilter),
    [activeLeads, selectedEventId, selectedRepFilter, events]
  );

  // 2. Rango de fechas de captura personalizado (opcional)
  const baseLeads = useMemo(() => {
    if (!dateFrom && !dateTo) return eventLeads;
    return eventLeads.filter(l => {
      const ts = parseLeadTimestamp(l.capturedAt);
      if (ts === null) return false;
      const iso = todayISODate(new Date(ts));
      if (dateFrom && iso < dateFrom) return false;
      if (dateTo && iso > dateTo) return false;
      return true;
    });
  }, [eventLeads, dateFrom, dateTo]);

  const metrics = useMemo(() => computeMetrics(baseLeads), [baseLeads]);

  // 3. Evento anterior (orden del array de eventos) para las tendencias de los KPI
  const baseEvent = selectedEventId === 'all'
    ? (events.find(e => e.id === currentEvent?.id) || events[events.length - 1] || null)
    : (events.find(e => e.id === selectedEventId) || null);
  const baseEventIndex = baseEvent ? events.findIndex(e => e.id === baseEvent.id) : -1;
  const prevEvent = baseEventIndex > 0 ? events[baseEventIndex - 1] : null;
  const prevMetrics = useMemo(
    () => (prevEvent ? computeMetrics(filterByEventRep(activeLeads, prevEvent.id, selectedRepFilter)) : null),
    [prevEvent, activeLeads, selectedRepFilter, events]
  );

  // 4. KPI activo → filtra dinámicamente los gráficos (los KPI siempre muestran la base)
  const chartLeads = useMemo(() => {
    switch (activeKpi) {
      case 'vip':
        return baseLeads.filter(l => l.priority);
      case 'rate':
        return baseLeads.filter(isQualified);
      case 'peak':
        return metrics.peak.date
          ? baseLeads.filter(l => {
              const ts = parseLeadTimestamp(l.capturedAt);
              return ts !== null && todayISODate(new Date(ts)) === metrics.peak.date;
            })
          : baseLeads;
      case 'interest':
        return metrics.topInterest.name
          ? baseLeads.filter(l =>
              (l.interests || []).some(i => normalizeStr(i) === normalizeStr(metrics.topInterest.name))
            )
          : baseLeads;
      default:
        return baseLeads;
    }
  }, [baseLeads, activeKpi, metrics]);

  const chartMetrics = useMemo(() => computeMetrics(chartLeads), [chartLeads]);

  // 5. Mapa de calor: días (filas) × bloques horarios (columnas)
  const heatmap = useMemo(() => {
    const byDay = new Map<string, number[]>();
    let dated = 0;
    chartLeads.forEach(l => {
      const ts = parseLeadTimestamp(l.capturedAt);
      if (ts === null) return;
      dated += 1;
      const d = new Date(ts);
      const day = todayISODate(d);
      let row = byDay.get(day);
      if (!row) {
        row = Array(TIME_BLOCKS.length).fill(0);
        byDay.set(day, row);
      }
      const hour = d.getHours();
      const idx = TIME_BLOCKS.findIndex(b => hour >= b.from && hour < b.to);
      if (idx >= 0) row[idx] += 1;
    });
    const days = [...byDay.keys()].sort().slice(-10);
    const rows = days.map(d => byDay.get(d) || []);
    const max = Math.max(1, ...rows.map(r => Math.max(0, ...r)));
    return { days, rows, max, dated };
  }, [chartLeads]);

  const toggleKpi = (id: KpiId) => setActiveKpi(prev => (prev === id ? null : id));

  const handleExportCSV = () => {
    setExportMenuOpen(false);
    exportLeadsToCsv(baseLeads, `Reporte_Leads_${new Date().toLocaleDateString('en-CA')}.csv`);
  };

  const handleExportXlsx = () => {
    setExportMenuOpen(false);
    exportLeadsToXlsx(baseLeads, `Reporte_Leads_${new Date().toLocaleDateString('en-CA')}.xlsx`);
  };

  const hasRealData = leads.length > 0;

  const hasDateRange = Boolean(dateFrom || dateTo);
  const trendEvent: EventOption = selectedEventId === 'all'
    ? { id: '', name: '', location: '', dateRange: '' }
    : (events.find(e => e.id === selectedEventId) || { id: '', name: '', location: '', dateRange: '' });

  const kpiCards: {
    id: KpiId;
    icon: React.ReactNode;
    value: React.ReactNode;
    current: number;
    previous: number | null;
    mode?: 'pct' | 'pp' | 'abs';
    suffix?: string;
    valueClassName?: string;
  }[] = [
    {
      id: 'total',
      icon: <Inbox className="w-3.5 h-3.5" />,
      value: metrics.total,
      current: metrics.total,
      previous: prevMetrics ? prevMetrics.total : null
    },
    {
      id: 'vip',
      icon: <Star className="w-3.5 h-3.5" />,
      value: metrics.vip,
      current: metrics.vip,
      previous: prevMetrics ? prevMetrics.vip : null
    },
    {
      id: 'rate',
      icon: <Target className="w-3.5 h-3.5" />,
      value: `${metrics.rate.toFixed(1)}%`,
      current: +metrics.rate.toFixed(1),
      previous: prevMetrics ? +prevMetrics.rate.toFixed(1) : null,
      mode: 'pp'
    },
    {
      id: 'peak',
      icon: <Zap className="w-3.5 h-3.5" />,
      value: metrics.peak.date
        ? `${metrics.peak.count} · ${formatShortDayLabel(metrics.peak.date)}`
        : '0',
      current: metrics.peak.count,
      previous: prevMetrics ? prevMetrics.peak.count : null
    },
    {
      id: 'interest',
      icon: <Trophy className="w-3.5 h-3.5" />,
      value: metrics.topInterest.name || 'N/A',
      current: metrics.topInterest.count,
      previous: prevMetrics ? prevMetrics.topInterest.count : null,
      mode: 'abs',
      suffix: ' menc.',
      valueClassName: 'text-sm'
    }
  ];

  return (
    <div className="space-y-2.5 animate-fade-in pb-56">
      {/* Indicador de Datos Demo */}
      {leads.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-[11px] flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Mostrando datos de demostración (no se detectaron leads reales capturados).
          </span>
          <button
            type="button"
            onClick={() => setUseDemoData(false)}
            className="text-amber-700 font-bold underline cursor-pointer shrink-0"
          >
            Ocultar
          </button>
        </div>
      )}

      {/* Header Controls */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-black/6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold"
            style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-[#1D1D1F]">Reportes & Analítica</h2>
            <p className="text-[10px] text-slate-500">Métricas consolidadas</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <RoundedSelect
            variant="bare"
            value={selectedEventId}
            onChange={setSelectedEventId}
            ariaLabel="Filtrar por evento"
            buttonClassName="px-2.5 py-1 bg-[#F5F5F7] border border-black/5 rounded-lg text-[11px] font-semibold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-primary pr-7"
            options={[
              { value: 'all', label: 'Todos los Eventos' },
              ...events.map(e => ({ value: e.id, label: e.name }))
            ]}
          />

          <RoundedSelect
            variant="bare"
            value={selectedRepFilter}
            onChange={setSelectedRepFilter}
            ariaLabel="Filtrar por usuario"
            buttonClassName="px-2.5 py-1 bg-[#F5F5F7] border border-black/5 rounded-lg text-[11px] font-semibold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-primary pr-7"
            options={[
              { value: 'all', label: 'Todos los Usuarios' },
              ...users.map(u => ({ value: u.name, label: u.name }))
            ]}
          />

          {/* Rango de fechas de captura */}
          <div className="flex items-center gap-1 bg-[#F5F5F7] border border-black/5 rounded-lg px-1.5 py-0.5">
            <DatePicker
              value={dateFrom}
              onChange={v => {
                setDateFrom(v);
                if (dateTo && v > dateTo) setDateTo(v);
              }}
              max={dateTo || undefined}
              ariaLabel="Fecha desde"
              placeholder="Desde"
              roundedClassName="rounded-md"
            />
            <span className="text-[10px] text-slate-400 font-semibold">—</span>
            <DatePicker
              value={dateTo}
              onChange={v => {
                setDateTo(v);
                if (dateFrom && v < dateFrom) setDateFrom(v);
              }}
              min={dateFrom || undefined}
              ariaLabel="Fecha hasta"
              placeholder="Hasta"
              roundedClassName="rounded-md"
            />
            {hasDateRange && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                aria-label="Limpiar rango de fechas"
                className="p-0.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(v => !v)}
              disabled={!hasRealData}
              className="px-2.5 py-1 bg-primary hover:bg-primary-hover text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={hasRealData ? 'Exportar reporte a Excel / CSV' : 'No hay datos reales para exportar'}
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>Exportar</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportMenuOpen && hasRealData && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1 animate-fade-in">
                  <div className="px-2.5 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    Exportar reporte
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    Descargar CSV
                  </button>
                  <button
                    onClick={handleExportXlsx}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Descargar Excel (.xlsx)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filtro activo por KPI */}
      {activeKpi && (
        <div className="flex items-center gap-2 text-[11px] animate-fade-in">
          <span className="font-semibold text-slate-500">Gráficos filtrados por:</span>
          <button
            type="button"
            onClick={() => setActiveKpi(null)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold cursor-pointer transition-colors"
            style={{
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)'
            }}
          >
            {KPI_LABELS[activeKpi]}
            <X className="w-3 h-3" />
          </button>
          <span className="text-slate-400 font-medium">(clic de nuevo en el KPI para quitarlo)</span>
        </div>
      )}

      {/* KPIs unificados: fila superior con 5 indicadores, clicables */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {kpiCards.map(card => {
          const isActive = activeKpi === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => toggleKpi(card.id)}
              aria-pressed={isActive}
              title={isActive ? `Quitar filtro de ${KPI_LABELS[card.id]}` : `Filtrar gráficos por ${KPI_LABELS[card.id]}`}
              className={`bg-white p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? 'border-transparent ring-2 ring-primary shadow-sm'
                  : 'border-black/6 shadow-2xs hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-semibold text-slate-400 uppercase truncate">
                  {KPI_LABELS[card.id]}
                </span>
                <span
                  className={isActive ? '' : 'text-slate-300'}
                  style={isActive ? { color: 'var(--color-primary)' } : undefined}
                >
                  {card.icon}
                </span>
              </div>
              <div
                className={`font-bold text-[#1D1D1F] mt-0.5 truncate ${card.valueClassName || 'text-lg'}`}
                style={card.id === 'interest' || isActive ? { color: 'var(--color-primary)' } : undefined}
                title={typeof card.value === 'string' ? card.value : undefined}
              >
                {card.value}
              </div>
              <TrendBadge
                current={card.current}
                previous={card.previous}
                mode={card.mode}
                suffix={card.suffix}
              />
            </button>
          );
        })}
      </div>

      {/* Gráficos principales en paralelo (grid de dos columnas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-stretch">
        <div className="min-w-0 h-full">
          <LeadsTrendChart
            leads={chartLeads}
            currentEvent={trendEvent}
          />
        </div>

        {/* Intereses Principales con valores exactos al final de cada barra */}
        <div className="bg-white p-3 rounded-xl border border-black/6 shadow-2xs min-w-0 h-full flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="text-[11px] font-bold text-[#1D1D1F]">Intereses Principales</h3>
            <span className="text-[9px] text-slate-400 font-semibold">{chartLeads.length} leads</span>
          </div>
          <div className="flex-1 min-h-44 w-full flex items-center justify-center">
            {chartMetrics.interests.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartMetrics.interests}
                  layout="vertical"
                  margin={{ top: 0, right: 36, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F5F5F7" />
                  <XAxis
                    type="number"
                    hide
                    domain={[0, (dataMax: number) => Math.max(dataMax * 1.2, 4)]}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 9, fill: '#1D1D1F', fontWeight: 600 }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1D1D1F', borderRadius: '6px', color: '#fff', fontSize: '10px' }}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
                  <Bar
                    dataKey="value"
                    fill="var(--color-primary)"
                    radius={[0, 4, 4, 0]}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="value"
                      position="right"
                      style={{ fontSize: 10, fontWeight: 700, fill: '#334155' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-[10px]">Sin datos de intereses</div>
            )}
          </div>
        </div>

        {/* Mapa de calor por bloques de tiempo (reemplaza el área horaria) */}
        <div className="bg-white p-3 rounded-xl border border-black/6 shadow-2xs lg:col-span-2 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-[11px] font-bold text-[#1D1D1F]">Ritmo Horario de Capturas</h3>
            <span className="text-[9px] text-slate-400 font-semibold">
              {heatmap.dated} lead(s) con fecha de captura
            </span>
          </div>

          {heatmap.dated > 0 ? (
            <>
              <div className="overflow-x-auto pb-1">
                <div className="min-w-115 overflow-hidden rounded-lg border border-slate-200 bg-slate-200 flex flex-col gap-px">
                  <div
                    className="grid gap-px"
                    style={{ gridTemplateColumns: `84px repeat(${TIME_BLOCKS.length}, minmax(0, 1fr))` }}
                  >
                    <div className="bg-white" />
                    {TIME_BLOCKS.map(b => (
                      <div
                        key={b.label}
                        className="bg-white text-[9px] font-bold text-slate-400 text-center py-1"
                      >
                        {b.label}
                      </div>
                    ))}
                  </div>

                  {heatmap.days.map((day, i) => (
                    <div
                      key={day}
                      className="grid gap-px"
                      style={{ gridTemplateColumns: `84px repeat(${TIME_BLOCKS.length}, minmax(0, 1fr))` }}
                    >
                      <div className="bg-white text-[10px] font-semibold text-slate-600 flex items-center px-1.5 truncate">
                        {formatShortDayLabel(day)}
                      </div>
                      {(heatmap.rows[i] || []).map((count, j) => {
                        const intensity = count === 0 ? 0 : Math.round(18 + (count / heatmap.max) * 82);
                        return (
                          <div
                            key={j}
                            title={`${formatShortDayLabel(day)} · ${TIME_BLOCKS[j].label}: ${count} captura(s)`}
                            className="h-7 flex items-center justify-center text-[10px] font-bold select-none"
                            style={heatColor(intensity)}
                          >
                            {count > 0 ? count : ''}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-1.5 pt-1.5 text-[9px] text-slate-400 font-semibold">
                <span>Menos</span>
                {[18, 38, 58, 78, 100].map(p => (
                  <span
                    key={p}
                    className="w-3.5 h-3.5 rounded-[3px]"
                    style={heatColor(p)}
                  />
                ))}
                <span>Más</span>
              </div>
            </>
          ) : (
            <div className="h-24 flex items-center justify-center text-slate-400 text-[10px] text-center px-4">
              Sin leads con fecha de captura en el rango actual — el mapa de calor se
              llena cuando los leads registran fecha y hora.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
