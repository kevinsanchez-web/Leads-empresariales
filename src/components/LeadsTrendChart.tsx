import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, Calendar, Zap, Star } from 'lucide-react';
import { Lead, EventOption } from '../types';
import {
  todayISODate,
  isoDateToLocalMs,
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

// Punto personalizado: no dibuja nada cuando el valor es 0
// (evita el montón de puntos superpuestos en los días vacíos)
const renderDot = (color: string, r: number, strokeWidth: number) => (props: any) => {
  const { cx, cy, value, index } = props;
  if (!value) return <g key={`dot-${index}`} />;
  return (
    <circle
      key={`dot-${index}`}
      cx={cx}
      cy={cy}
      r={r}
      fill={color}
      stroke="#ffffff"
      strokeWidth={strokeWidth}
    />
  );
};

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

  // Agrupar leads por día y calcular métricas acumuladas
  const trend = useMemo(() => {
    type DayBucket = {
      date: string;
      displayDate: string;
      total: number;
      priority: number;
      normal: number;
      // Nombres de los leads del día: sin esto la gráfica solo muestra un
      // conteo y no se puede saber qué lead cayó en cada punto.
      leads: string[];
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
          normal: 0,
          leads: []
        };
        buckets.set(dateKey, bucket);
      }
      return bucket;
    };

    const todayStr = todayISODate();
    const range = parseEventDateRange(currentEvent.dateRange);

    const leadDates = eventLeads
      .map(l => parseLeadTimestamp(l.capturedAt))
      .filter((t): t is number => t !== null)
      .map(t => todayISODate(new Date(t)));

    const firstLeadDate =
      leadDates.length > 0
        ? leadDates.reduce((min, d) => (d < min ? d : min), todayStr)
        : todayStr;

    const lastLeadDate =
      leadDates.length > 0
        ? leadDates.reduce((max, d) => (d > max ? d : max), firstLeadDate)
        : todayStr;

    let startDate = range?.start || firstLeadDate;
    let endDate = range?.end || todayStr;

    if (endDate < todayStr) {
      endDate = todayStr;
    }

    // Solo hay rango de evento interpretable si `dateRange` se pudo entender.
    // Sin rango válido el eje va del primer lead al último: antes el mismo recorte
    // de días vacíos se aplicaba igual y dejaba todo amontonado en un punto.
    const hasEventRange = Boolean(range);
    if (!hasEventRange && lastLeadDate > endDate) {
      endDate = lastLeadDate;
    }

    const startMs = isoDateToLocalMs(startDate);
    const firstLeadMs = isoDateToLocalMs(firstLeadDate);
    const gapDays = Math.round((firstLeadMs - startMs) / (1000 * 3600 * 24));

    // Con rango de evento válido, si hay más de 2 días vacíos antes del primer
    // lead, recortar el eje a 2 días antes para no dibujar semanas en cero.
    if (hasEventRange && gapDays > 2) {
      const trimmedDate = new Date(firstLeadMs);
      trimmedDate.setDate(trimmedDate.getDate() - 2);
      const trimmedStr = todayISODate(trimmedDate);
      if (trimmedStr > startDate) {
        startDate = trimmedStr;
      }
    }

    const rangeDays = enumerateDays(startDate, endDate);
    const rangeSet = new Set(rangeDays);

    rangeDays.forEach(ensure);

    const countedKeys = new Set<string>();
    eventLeads.forEach(lead => {
      const time = parseLeadTimestamp(lead.capturedAt);
      if (time === null) return;

      const dateKey = todayISODate(new Date(time));
      if (!rangeSet.has(dateKey)) return;

      countedKeys.add(lead.id);
      const bucket = ensure(dateKey);
      bucket.total += 1;
      bucket.leads.push(lead.name || 'Sin nombre');
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

    let runningTotal = 0;
    let runningPriority = 0;

    const days = sortedDays.map(item => {
      runningTotal += item.total;
      runningPriority += item.priority;
      return {
        ...item,
        acumulado: runningTotal,
        acumuladoPrioritarios: runningPriority
      };
    });

    // Leads con fecha válida que quedan fuera del eje: sin esto el total de la
    // tarjeta no cuadra con la suma de la gráfica y no se explica por qué.
    const outsideRange = eventLeads.filter(lead => {
      if (countedKeys.has(lead.id)) return false;
      return parseLeadTimestamp(lead.capturedAt) !== null;
    }).length;

    return { days, outsideRange };
  }, [eventLeads, currentEvent.dateRange]);

  const excludedLeads = useMemo(() => {
    let undated = 0;
    eventLeads.forEach(lead => {
      const time = parseLeadTimestamp(lead.capturedAt);
      if (time === null) undated += 1;
    });
    return { outsideRange: trend.outsideRange, undated };
  }, [eventLeads, trend.outsideRange]);

  const trendData = trend.days;

  const totalEventLeads = eventLeads.length;
  const totalPriority = eventLeads.filter(l => l.priority).length;

  // Encontrar el día pico de registro
  const bestDay = useMemo(() => {
    if (trendData.length === 0) return null;
    return [...trendData].sort((a, b) => b.total - a.total)[0];
  }, [trendData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between">
      
      {/* Encabezado del Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                Tendencia de Captura
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/50 truncate max-w-[160px]">
                {currentEvent.name || 'Todos los Eventos'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {totalEventLeads} prospectos registrados en el período activo
            </p>
          </div>
        </div>

        {/* Conmutador de vista (Por Día / Acumulado) */}
        <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-xl self-start sm:self-auto shrink-0 border border-slate-200/60">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Por Día
          </button>
          <button
            onClick={() => setViewMode('cumulative')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              viewMode === 'cumulative'
                ? 'bg-white text-blue-600 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Acumulado
          </button>
        </div>
      </div>

      {/* Área del Gráfico Recharts */}
      <div className={`w-full pt-3 ${compact ? 'h-40 sm:h-48' : 'h-48 sm:h-56'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={trendData}
            margin={{ top: 16, right: 24, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
              minTickGap={20}
              padding={{ left: 12, right: 12 }}
              dy={5}
            />
            
            <YAxis
              width={28}
              tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              domain={[0, (max: number) => Math.max(4, Math.ceil(max * 1.2))]}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 backdrop-blur-xs text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-800 min-w-[150px]">
                      <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between text-[11px]">
                        <span>{data.displayDate} ({data.date})</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                          Total Leads:
                        </span>
                        <span className="font-bold text-blue-400 text-xs">
                          {viewMode === 'daily' ? data.total : data.acumulado}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                          VIP / Prioritarios:
                        </span>
                        <span className="font-bold text-amber-400 text-xs">
                          {viewMode === 'daily' ? data.priority : data.acumuladoPrioritarios}
                        </span>
                      </div>
                      {data.leads?.length > 0 && (
                        <div className="border-t border-slate-800 pt-1.5 space-y-0.5">
                          {data.leads.slice(0, 6).map((leadName: string, i: number) => (
                            <div key={`${data.date}-${i}`} className="text-[10px] text-slate-300 truncate">
                              {leadName}
                            </div>
                          ))}
                          {data.leads.length > 6 && (
                            <div className="text-[10px] text-slate-500">
                              +{data.leads.length - 6} más
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey={viewMode === 'daily' ? 'total' : 'acumulado'}
              name="Total Leads"
              stroke="#2563eb"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorTotal)"
              dot={renderDot('#2563eb', 3.5, 2)}
              activeDot={{ r: 5.5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />

            <Area
              type="monotone"
              dataKey={viewMode === 'daily' ? 'priority' : 'acumuladoPrioritarios'}
              name="VIP Prioritarios"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="transparent"
              dot={renderDot('#f59e0b', 3, 1.5)}
              activeDot={{ r: 5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Tarjetas de Métricas Rápidas */}
      <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-100 text-center">
        
        <div className="bg-slate-50/80 p-2 sm:p-2.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400 hidden sm:inline" /> Total Evento
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-blue-600">
            {totalEventLeads}
          </span>
        </div>

        <div className="bg-slate-50/80 p-2 sm:p-2.5 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
            <Zap className="w-3 h-3 text-slate-400 hidden sm:inline" /> Pico Diario
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900">
            {bestDay && bestDay.total > 0 ? `${bestDay.total} (${bestDay.displayDate})` : '0'}
          </span>
        </div>

        <div className="bg-amber-50/50 p-2 sm:p-2.5 rounded-xl border border-amber-100/80 flex flex-col items-center justify-center">
          <span className="text-[9px] font-bold text-amber-700/70 uppercase tracking-wider block mb-0.5 flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500 hidden sm:inline fill-amber-500" /> Leads VIP
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-amber-600">
            {totalPriority}
          </span>
        </div>

      </div>

      {(excludedLeads.undated > 0 || excludedLeads.outsideRange > 0) && (
        <div className="mt-2 text-center space-y-0.5">
          {excludedLeads.undated > 0 && (
            <p className="text-[10px] text-slate-400 font-medium">
              {excludedLeads.undated} lead(s) sin fecha válida de registro
            </p>
          )}
          {excludedLeads.outsideRange > 0 && (
            <p className="text-[10px] text-amber-600 font-medium">
              {excludedLeads.outsideRange} lead(s) fuera del período del eje
            </p>
          )}
        </div>
      )}

    </div>
  );
};