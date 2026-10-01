import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Lead, EventOption } from '../types';
import {
  todayISODate,
  parseLeadTimestamp,
  parseEventDateRange,
  enumerateDays,
  formatShortDayLabel
} from '../utils/date';

interface LeadsTrendChartProps {
  leads: Lead[];
  currentEvent: EventOption;
  compact?: boolean;
}

export const LeadsTrendChart: React.FC<LeadsTrendChartProps> = ({
  leads,
  currentEvent,
  compact = false
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>('daily');

  // Filtrar leads del evento activo
  const eventLeads = useMemo(() => {
    return leads.filter(l => l.event === currentEvent.name || !currentEvent.name);
  }, [leads, currentEvent.name]);

  // Agrupar leads por día y optimizar el rango visual
  const trendData = useMemo(() => {
    type DayBucket = {
      date: string;
      displayDate: string;
      total: number;
      priority: number;
      normal: number;
    };

    const buckets = new Map<string, DayBucket>();
    const ensure = (dateKey: string): DayBucket => {
      let bucket = buckets.get(dateKey);
      if (!bucket) {
        bucket = {
          date: dateKey,
          displayDate: formatShortDayLabel(dateKey),
          total: 0,
          priority: 0,
          normal: 0
        };
        buckets.set(dateKey, bucket);
      }
      return bucket;
    };

    const todayStr = todayISODate();
    const range = parseEventDateRange(currentEvent.dateRange);

    // Obtener las fechas ISO de todos los leads válidos
    const leadDates = eventLeads
      .map(l => parseLeadTimestamp(l.capturedAt))
      .filter((t): t is number => t !== null)
      .map(t => todayISODate(new Date(t)));

    const firstLeadDate =
      leadDates.length > 0
        ? leadDates.reduce((min, d) => (d < min ? d : min), todayStr)
        : todayStr;

    let startDate = range?.start || firstLeadDate;
    let endDate = range?.end || todayStr;

    // Extender fin hasta HOY si el rango venció
    if (endDate < todayStr) {
      endDate = todayStr;
    }

    // 💡 OPTIMIZACIÓN VISUAL: Si hay más de 10 días de ceros continuos al inicio,
    // recortar la fecha de inicio a 3 días antes de la primera captura.
    const startMs = new Date(startDate).getTime();
    const firstLeadMs = new Date(firstLeadDate).getTime();
    const gapDays = Math.round((firstLeadMs - startMs) / (1000 * 3600 * 24));

    if (gapDays > 10) {
      const trimmedDate = new Date(firstLeadMs);
      trimmedDate.setDate(trimmedDate.getDate() - 3);
      const trimmedStr = todayISODate(trimmedDate);
      if (trimmedStr > startDate) {
        startDate = trimmedStr;
      }
    }

    const rangeDays = enumerateDays(startDate, endDate);
    const rangeSet = new Set(rangeDays);

    // Inicializar buckets en 0
    rangeDays.forEach(ensure);

    // Sumar conteos por día
    eventLeads.forEach(lead => {
      const time = parseLeadTimestamp(lead.capturedAt);
      if (time === null) return;

      const dateKey = todayISODate(new Date(time));
      if (!rangeSet.has(dateKey)) return;

      const bucket = ensure(dateKey);
      bucket.total += 1;
      if (lead.priority) {
        bucket.priority += 1;
      } else {
        bucket.normal += 1;
      }
    });

    if (rangeDays.length === 0 && buckets.size === 0) {
      ensure(todayStr);
    }

    const sortedDays = [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));

    // Calcular totales acumulados
    let runningTotal = 0;
    let runningPriority = 0;

    return sortedDays.map(item => {
      runningTotal += item.total;
      runningPriority += item.priority;
      return {
        ...item,
        acumulado: runningTotal,
        acumuladoPrioritarios: runningPriority
      };
    });
  }, [eventLeads, currentEvent.dateRange]);

  // Auditoría para leads sin fecha válida
  const excludedLeads = useMemo(() => {
    let undated = 0;
    eventLeads.forEach(lead => {
      const time = parseLeadTimestamp(lead.capturedAt);
      if (time === null) undated += 1;
    });
    return { outsideRange: 0, undated };
  }, [eventLeads]);

  const totalEventLeads = eventLeads.length;
  const totalPriority = eventLeads.filter(l => l.priority).length;
  const bestDay = [...trendData].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-black/[0.06] shadow-xs">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 pb-2.5 border-b border-black/[0.04]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-[#1D1D1F] truncate">
                Tendencia de Captura Diaria
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] shrink-0">
                {currentEvent.name}
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">
              {totalEventLeads} prospectos registrados en el evento activo
            </p>
          </div>
        </div>

        {/* Conmutador de vista */}
        <div className="flex items-center gap-1 bg-[#F5F5F7] p-0.5 rounded-xl self-start sm:self-auto shrink-0">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-white text-[#0071E3] shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Por Día
          </button>
          <button
            onClick={() => setViewMode('cumulative')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
              viewMode === 'cumulative'
                ? 'bg-white text-[#0071E3] shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Acumulado
          </button>
        </div>
      </div>

      {/* Gráfico Recharts */}
      <div className={`w-full ${compact ? 'h-44 sm:h-52' : 'h-52 sm:h-64'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trendData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2F2F7" />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 11, fill: '#86868B', fontWeight: 500 }}
              axisLine={{ stroke: '#E5E5EA' }}
              tickLine={false}
              minTickGap={25}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#86868B', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#1D1D1F] text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1 border border-white/10 min-w-[130px]">
                      <div className="font-bold text-slate-200 border-b border-white/10 pb-1 flex items-center justify-between">
                        <span>{data.displayDate} ({data.date})</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] pt-0.5">
                        <span className="text-slate-300">Total Leads:</span>
                        <span className="font-bold text-[#0071E3] text-sm">
                          {viewMode === 'daily' ? data.total : data.acumulado}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-300">VIP / Prioritarios:</span>
                        <span className="font-bold text-amber-400">
                          {viewMode === 'daily' ? data.priority : data.acumuladoPrioritarios}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            
            {/* Línea Principal de Leads (Linear para trazo limpio) */}
            <Line
              type="linear"
              dataKey={viewMode === 'daily' ? 'total' : 'acumulado'}
              name="Total Leads"
              stroke="#0071E3"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#0071E3', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#0071E3', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />

            {/* Línea Secundaria de Leads VIP */}
            <Line
              type="linear"
              dataKey={viewMode === 'daily' ? 'priority' : 'acumuladoPrioritarios'}
              name="VIP Prioritarios"
              stroke="#FF9500"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3, fill: '#FF9500', stroke: '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: '#FF9500', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-black/[0.04] text-center">
        <div className="bg-[#FAFBFD] p-2 rounded-xl border border-black/[0.03]">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">
            Total Evento
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#0071E3]">
            {totalEventLeads}
          </span>
        </div>
        <div className="bg-[#FAFBFD] p-2 rounded-xl border border-black/[0.03]">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">
            Pico Diario
          </span>
          <span className="text-xs sm:text-sm font-bold text-[#1D1D1F]">
            {bestDay ? `${bestDay.total} leads` : '0'}
          </span>
        </div>
        <div className="bg-[#FAFBFD] p-2 rounded-xl border border-black/[0.03]">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">
            Leads VIP
          </span>
          <span className="text-xs sm:text-sm font-bold text-amber-600">
            {totalPriority}
          </span>
        </div>
      </div>

      {excludedLeads.undated > 0 && (
        <p className="text-[10px] text-slate-400 mt-2 text-center">
          {excludedLeads.undated} lead(s) sin fecha válida de registro
        </p>
      )}

    </div>
  );
};