import React, { useMemo } from 'react';
import {
  buildMonthGrid,
  enumerateDays,
  eventDateRangeForDisplay,
  isoDateToLocalMs,
  monthNameEs,
  todayISODate,
  WEEKDAY_SHORT_ES
} from '../utils/date';

/**
 * Réplica en miniatura del calendario de `DatePicker`, para mostrar en qué días cae
 * cada evento dentro de su tarjeta.
 *
 * No es un selector: lee el `dateRange` ya guardado. Cuando ese texto no es
 * interpretable (un rango de meses como `"Julio - Septiembre 2026"`, `"Fecha por
 * definir"`, o un rango escrito cruzando meses) devuelve `null` y quien lo usa deja
 * la fecha en texto plano en vez de mostrar una rejilla vacía o inventar días.
 */
export const EventMiniCalendar: React.FC<{ dateRange: string }> = ({ dateRange }) => {
  const range = useMemo(() => eventDateRangeForDisplay(dateRange), [dateRange]);

  if (!range) return null;

  const startMs = isoDateToLocalMs(range.start);
  const view = new Date(startMs);

  const eventDays = new Set(enumerateDays(range.start, range.end));
  const today = todayISODate();
  const weeks = buildMonthGrid(view.getFullYear(), view.getMonth());

  return (
    /* En móvil la rejilla de tarjetas sigue en dos columnas hasta `lg`, así que no cabe
       una rejilla de 7 celdas. Quien lo usa muestra el rango en texto en ese ancho. */
    <div className="hidden sm:block mt-2">
      <div className="text-[10px] font-bold text-slate-500 mb-1.5">
        {monthNameEs(view.getMonth())} {view.getFullYear()}
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {WEEKDAY_SHORT_ES.map((label) => (
          <span key={label} className="h-4 flex items-center justify-center text-[8px] font-bold text-slate-400">
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5" aria-hidden="true">
        {weeks.map((week, weekIndex) => (
          <React.Fragment key={weekIndex}>
            {week.map((isoDate, dayIndex) => {
              if (!isoDate) return <span key={dayIndex} className="h-5" />;

              const isEvent = eventDays.has(isoDate);
              const isEdge = isoDate === range.start || isoDate === range.end;

              return (
                <span
                  key={dayIndex}
                  className={`h-5 rounded-full flex items-center justify-center text-[9px] font-medium transition-colors ${
                    isEvent
                      ? isEdge
                        ? 'bg-accent text-white font-bold'
                        : 'bg-accent-light text-accent font-bold'
                      : 'text-slate-300'
                  } ${isoDate === today ? 'ring-1 ring-inset ring-accent' : ''}`}
                >
                  {Number(isoDate.slice(8, 10))}
                </span>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};