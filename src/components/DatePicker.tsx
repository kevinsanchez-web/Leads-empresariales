import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  buildMonthGrid,
  formatRelativeDayLabel,
  isoDateToLocalMs,
  monthBoundsISO,
  monthNameEs,
  shiftMonth,
  todayISODate,
  WEEKDAY_SHORT_ES
} from '../utils/date';
import { PickerTrigger } from './PickerTrigger';
import { useAnchoredPopover } from './useAnchoredPopover';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  ariaLabel: string;
  /**
   * Centra el popup sobre el botón en vez de alinearlo a la izquierda. Hace falta
   * cuando el campo es más angosto que el popup (p. ej. la mitad de una rejilla de dos
   * columnas): si no, el calendario se sale del campo y descuadra la fila.
   */
  center?: boolean;
}

/** Ancho del popup: 7 columnas de celdas redondas más el padding. */
const DATE_POPUP_WIDTH = 280;

/**
 * Un día antes o después, en `YYYY-MM-DD`. Usa el constructor local en vez de
 * sumar milisegundos: en un cambio de hora, `medianoche + 24h` puede caer a las
 * 23:00 del día anterior.
 */
function shiftIso(isoDate: string, days: number): string {
  const base = new Date(isoDateToLocalMs(isoDate));
  return todayISODate(new Date(base.getFullYear(), base.getMonth(), base.getDate() + days));
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  min,
  max,
  placeholder = 'Selecciona una fecha',
  ariaLabel,
  center = false
}) => {
  const [open, setOpen] = useState(false);
  const today = todayISODate();
  const initial = useMemo(() => value || today, [value, today]);

  const [view, setView] = useState(() => {
    const base = new Date(isoDateToLocalMs(initial));
    return { year: base.getFullYear(), month: base.getMonth() };
  });
  const [focused, setFocused] = useState(initial);

  const { anchorRef, popupRef, popupStyle } = useAnchoredPopover(
    open,
    useCallback(() => setOpen(false), []),
    { height: 330, width: DATE_POPUP_WIDTH, center }
  );

  // Al abrir, el mes y el foco siguen al valor actual; si no hay, al de hoy.
  useEffect(() => {
    if (!open) return;
    const target = value || today;
    const base = new Date(isoDateToLocalMs(target));
    setView({ year: base.getFullYear(), month: base.getMonth() });
    setFocused(target);
  }, [open, value, today]);

  useEffect(() => {
    if (!open) return;
    const cell = popupRef.current?.querySelector<HTMLElement>(`[data-iso="${focused}"]`);
    cell?.focus();
  }, [open, focused]);

  const isDisabled = useCallback(
    (isoDate: string) => (min ? isoDate < min : false) || (max ? isoDate > max : false),
    [min, max]
  );

  const changeMonth = useCallback(
    (delta: number) => {
      const next = shiftMonth(view.year, view.month, delta);
      const bounds = monthBoundsISO(next.year, next.month);
      if (min && bounds.end < min) return;
      if (max && bounds.start > max) return;
      setView(next);
    },
    [view.year, view.month, min, max]
  );

  const commit = useCallback(
    (isoDate: string) => {
      if (isDisabled(isoDate)) return;
      onChange(isoDate);
      setOpen(false);
    },
    [isDisabled, onChange]
  );

  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7
    };

    if (event.key in moves) {
      const next = shiftIso(focused, moves[event.key]);
      setFocused(next);
      const base = new Date(isoDateToLocalMs(next));
      setView((current) =>
        base.getMonth() === current.month && base.getFullYear() === current.year
          ? current
          : { year: base.getFullYear(), month: base.getMonth() }
      );
      return;
    }

    if (event.key === 'PageUp' || event.key === 'PageDown') {
      // Cambiar de mes con el teclado también mueve el cursor: si no, el día
      // enfocado quedaría en el mes anterior y se perdería el foco.
      const delta = event.key === 'PageUp' ? -1 : 1;
      const next = shiftMonth(view.year, view.month, delta);
      const bounds = monthBoundsISO(next.year, next.month);
      if (min && bounds.end < min) return;
      if (max && bounds.start > max) return;

      const dayOfMonth = Math.min(Number(focused.slice(8, 10)), Number(bounds.end.slice(8, 10)));
      setView(next);
      setFocused(todayISODate(new Date(next.year, next.month, dayOfMonth)));
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      commit(focused);
    }
  };

  const weeks = buildMonthGrid(view.year, view.month);
  const todayAllowed = !isDisabled(today);
  const prevMonth = shiftMonth(view.year, view.month, -1);
  const nextMonth = shiftMonth(view.year, view.month, 1);
  const prevBounds = monthBoundsISO(prevMonth.year, prevMonth.month);
  const nextBounds = monthBoundsISO(nextMonth.year, nextMonth.month);

  return (
    <>
      <div className="relative">
        <PickerTrigger
          anchorRef={anchorRef}
          icon={Calendar}
          text={value ? formatRelativeDayLabel(value) : ''}
          placeholder={placeholder}
          open={open}
          onToggle={() => setOpen((prev) => !prev)}
          ariaLabel={ariaLabel}
        />
      </div>

      {open &&
        createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label={ariaLabel}
            style={popupStyle}
            className="z-[70] rounded-2xl bg-white border border-black/[0.06] shadow-xl p-3 animate-fade-in"
          >
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                disabled={min ? prevBounds.end < min : false}
                aria-label="Mes anterior"
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-[#F5F5F7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-[#1D1D1F]">
                {monthNameEs(view.month)} {view.year}
              </span>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                disabled={max ? nextBounds.start > max : false}
                aria-label="Mes siguiente"
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-[#F5F5F7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAY_SHORT_ES.map((label) => (
                <span
                  key={label}
                  className="h-7 flex items-center justify-center text-[10px] font-bold text-slate-400"
                >
                  {label}
                </span>
              ))}
            </div>

            <div
              role="group"
              aria-label={`Calendario de ${monthNameEs(view.month)} ${view.year}`}
              onKeyDown={handleGridKeyDown}
              className="grid grid-cols-7 gap-0.5 focus:outline-none"
            >
              {weeks.map((week, weekIndex) => (
                <React.Fragment key={weekIndex}>
                  {week.map((isoDate, dayIndex) => {
                    if (!isoDate) {
                      return <span key={dayIndex} className="h-8" />;
                    }

                    const disabled = isDisabled(isoDate);
                    const isSelected = isoDate === value;
                    const isToday = isoDate === today;
                    const isFocused = isoDate === focused;

                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        data-iso={isoDate}
                        disabled={disabled}
                        tabIndex={isFocused ? 0 : -1}
                        aria-selected={isSelected}
                        onClick={() => commit(isoDate)}
                        className={`h-8 rounded-full text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-accent text-white font-bold'
                            : disabled
                              ? 'text-slate-300 cursor-not-allowed'
                              : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
                        } ${isToday && !isSelected && !isFocused ? 'ring-1 ring-inset ring-[#0071E3] text-[#0071E3] font-bold' : ''} ${
                          isFocused ? 'outline-none ring-2 ring-[#0071E3]' : ''
                        }`}
                      >
                        {Number(isoDate.slice(8, 10))}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <button
              type="button"
              onClick={() => commit(today)}
              disabled={!todayAllowed}
              className="mt-2 w-full py-1.5 rounded-xl bg-[#F5F5F7] hover:bg-[#EBEBEF] text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Hoy
            </button>
          </div>,
          document.body
        )}
    </>
  );
};
