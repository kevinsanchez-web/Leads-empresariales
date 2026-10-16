import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  eventDateRangeForDisplay,
  enumerateDays,
  isoDateToLocalMs,
  todayISODate
} from '../utils/date';

const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MAX_WEEKS = 6;

interface EventMiniCalendarProps {
  dateRange: string;
}

interface DayCell {
  key: string;
  day: number;
  inRange: boolean;
  isStart: boolean;
  isEnd: boolean;
  isToday: boolean;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const monthLabel = (first: Date, last: Date) => {
  const sameMonth =
    first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth();
  const fmtMonth = (d: Date) => d.toLocaleDateString('es-CO', { month: 'long' });

  if (sameMonth) {
    return capitalize(`${fmtMonth(first)} ${first.getFullYear()}`);
  }
  if (first.getFullYear() === last.getFullYear()) {
    return `${capitalize(fmtMonth(first))} – ${capitalize(fmtMonth(last))} ${last.getFullYear()}`;
  }
  return `${capitalize(fmtMonth(first))} ${first.getFullYear()} – ${capitalize(fmtMonth(last))} ${last.getFullYear()}`;
};

/**
 * Mini calendario del evento: muestra solo las semanas que tocan el rango,
 * con el rango dibujado como una banda continua (extremos en color sólido),
 * el mes arriba a la izquierda y la duración como chip a la derecha.
 * Soporta rangos que cruzan de un mes a otro. Devuelve null si el `dateRange`
 * no es interpretable (p. ej. "Fecha por definir").
 */
export const EventMiniCalendar: React.FC<EventMiniCalendarProps> = ({ dateRange }) => {
  const model = useMemo(() => {
    const range = eventDateRangeForDisplay(dateRange);
    if (!range) return null;

    const eventDays = enumerateDays(range.start, range.end);
    if (eventDays.length === 0) return null;

    const first = new Date(isoDateToLocalMs(eventDays[0]));
    const last = new Date(isoDateToLocalMs(eventDays[eventDays.length - 1]));
    if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return null;

    const dayKeys = new Set(eventDays);
    const startKey = eventDays[0];
    const endKey = eventDays[eventDays.length - 1];
    const todayKey = todayISODate(new Date());

    // Desde el lunes de la primera semana hasta el domingo de la última
    const gridStart = new Date(first.getFullYear(), first.getMonth(), first.getDate() - ((first.getDay() + 6) % 7));
    const gridEnd = new Date(last.getFullYear(), last.getMonth(), last.getDate() + (6 - ((last.getDay() + 6) % 7)));

    const weeks: DayCell[][] = [];
    let week: DayCell[] = [];
    for (
      let d = new Date(gridStart);
      d.getTime() <= gridEnd.getTime();
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    ) {
      const key = todayISODate(d);
      week.push({
        key,
        day: d.getDate(),
        inRange: dayKeys.has(key),
        isStart: key === startKey,
        isEnd: key === endKey,
        isToday: key === todayKey
      });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    return {
      weeks,
      duration: eventDays.length,
      label: monthLabel(first, last)
    };
  }, [dateRange]);

  if (!model) return null;

  const showGrid = model.weeks.length <= MAX_WEEKS;

  return (
    <div className="w-full rounded-xl bg-[#FAFBFD] border border-black/5 p-2 sm:p-2.5">
      {/* Cabecera: mes + duración */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-bold text-slate-600 truncate">{model.label}</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-light text-accent text-[10px] font-bold shrink-0">
          <CalendarDays className="w-3 h-3 shrink-0" />
          {model.duration} día{model.duration > 1 ? 's' : ''}
        </span>
      </div>

      {showGrid && (
        <>
          {/* Días de la semana */}
          <div className="grid grid-cols-7 mb-0.5">
            {WEEKDAY_LETTERS.map((letter, i) => (
              <span
                key={i}
                className="text-center text-[9px] font-bold text-slate-400 uppercase"
              >
                {letter}
              </span>
            ))}
          </div>

          {/* Semanas: la banda del rango es continua (sin gap horizontal) */}
          <div className="flex flex-col gap-y-0.5">
            {model.weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((cell, ci) => {
                  const band = cell.inRange
                    ? [
                        'bg-accent-light',
                        cell.isStart || ci === 0 ? 'rounded-l-lg' : '',
                        cell.isEnd || ci === 6 ? 'rounded-r-lg' : ''
                      ].join(' ')
                    : '';

                  const dayStyle =
                    cell.isStart || cell.isEnd
                      ? 'bg-accent text-white font-bold shadow-2xs'
                      : cell.inRange
                      ? 'text-accent font-semibold'
                      : cell.isToday
                      ? 'text-slate-600 font-semibold ring-1 ring-primary/40'
                      : 'text-slate-300 font-medium';

                  return (
                    <div key={cell.key} className={`h-6 sm:h-7 flex items-center justify-center ${band}`}>
                      <span
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center text-[10px] sm:text-[11px] leading-none ${dayStyle}`}
                      >
                        {cell.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};