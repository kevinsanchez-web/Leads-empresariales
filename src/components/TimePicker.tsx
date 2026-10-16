import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock } from 'lucide-react';
import { leadTime, snapToStep } from '../utils/date';
import { PickerTrigger } from './PickerTrigger';
import { useAnchoredPopover } from './useAnchoredPopover';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  stepMinutes?: number;
  placeholder?: string;
  ariaLabel: string;
}

/** Diámetro de la esfera. El popup no puede ser más ancho que esto + su padding. */
const DIAL_SIZE = 220;
const DIAL_RADIUS = DIAL_SIZE / 2;
const DIAL_PADDING = 12;
const TIME_POPUP_WIDTH = DIAL_SIZE + DIAL_PADDING * 2;
/** Selector AM/PM + rótulo de ayuda + fila de botones. */
const FOOTER_HEIGHT = 124;

/** Longitudes de las agujas como fracción del radio: el minutero llega más lejos. */
const MINUTE_HAND_RATIO = 0.76;
const HOUR_HAND_RATIO = 0.5;
/** Tolerancia angular para considerar agarrada una aguja, en grados. */
const GRAB_TOLERANCE_DEG = 20;
/** Suavizado de las agujas. Se anula mientras se arrastra para que no se queden
 *  atrás del dedo. */
const HAND_TRANSITION = 'transform 120ms ease-out';

/**
 * El color viene del tema activo (`--primary-accent`, que `App.tsx` cambia al
 * mover el selector de Configuraciones), no de un hex fijo: la esfera se
 * renderiza una vez y debe repintarse sola al cambiar el tema. El fallback es el
 * azul por defecto para que no salga negro si se monta antes de aplicar el tema.
 */
const ACCENT = 'var(--primary-accent, #0071E3)';
const ACCENT_LIGHT = 'var(--primary-accent-light, rgba(0, 113, 227, 0.1))';

/** Radios (fracción del radio de la esfera) de marcas y números. */
const TICK_OUTER = 0.93;
const HOUR_TICK_INNER = 0.83;
const MINUTE_TICK_INNER = 0.89;
const NUMBER_RADIUS = 0.68;

const pad = (value: number): string => String(value).padStart(2, '0');

/** "14:05" → "2:05 PM". Si el valor no tiene forma de hora, se devuelve tal cual. */
const formatTime12 = (time: string): string => {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return time;
  const hours = Number(match[1]);
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${hours >= 12 ? 'PM' : 'AM'}`;
};

/**
 * Ángulo en grados de una posición del reloj: 0 a las 12, creciendo en sentido
 * horario. Es la convención de `rotate(deg)` en SVG, así que se usa directo.
 */
const angleFor = (units: number, total: number): number => (units / total) * 360;

/** Lleva cualquier ángulo al rango 0–360. */
const normalizeAngle = (angle: number): number => ((angle % 360) + 360) % 360;

/**
 * Ángulo del puntero en el mismo sistema, medido desde el centro de la esfera
 * en píxeles. `atan2` sale en rango negativo hacia la izquierda; se normaliza al
 * usarlo.
 */
const angleFromPoint = (
  clientX: number,
  clientY: number,
  rect: DOMRect
): { angle: number; ratio: number } => {
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  return {
    angle: (Math.atan2(dx, -dy) * 180) / Math.PI,
    ratio: Math.sqrt(dx * dx + dy * dy) / (rect.width / 2)
  };
};

/** Distancia angular más corta entre dos ángulos, en grados. */
const angularGap = (a: number, b: number): number => {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
};

type Hand = 'hour' | 'minute';

/** La esfera tiene 60 marcas: un paso de 1 min permite elegir cualquier minuto. */
const CLOCK_STEP = 1;

/**
 * Salto de minutos entre dos eventos del puntero a partir del cual se considera
 * que el minutero cruzó el 60 (y no que el usuario se movió de golpe al otro
 * lado de la esfera).
 */
const WRAP_THRESHOLD = 30;

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  stepMinutes = CLOCK_STEP,
  placeholder = 'Selecciona una hora',
  ariaLabel
}) => {
  const [open, setOpen] = useState(false);
  const step = stepMinutes > 0 ? stepMinutes : 1;

  // El reloj real puede entregar minutos que este selector no ofrece; se
  // muestra el paso equivalente sin alterar el valor guardado.
  const selected = useMemo(() => snapToStep(value, step), [value, step]);
  // `hour` sigue siendo 0–23 (el valor guardado es HH:MM en 24 h); la esfera
  // lo muestra en 12 h y `isPm` dice en qué mitad del día está.
  const [hour, setHour] = useState(() => Number(selected.slice(0, 2)) || 0);
  const [minute, setMinute] = useState(() => Number(selected.slice(3, 5)) || 0);
  const isPm = hour >= 12;
  const hourOnDial = hour % 12;

  // Hora vigente leída de forma síncrona. Durante un arrastre llegan varios
  // `pointermove` antes de que React vuelva a renderizar; el estado podría ir
  // una vuelta atrasado y perder un cruce del 60.
  const timeRef = useRef({ hour, minute });

  const minuteSteps = Math.floor(60 / step);

  const { anchorRef, popupRef, popupStyle } = useAnchoredPopover(
    open,
    useCallback(() => setOpen(false), []),
    { height: DIAL_SIZE + FOOTER_HEIGHT + DIAL_PADDING * 2, width: TIME_POPUP_WIDTH, center: true }
  );

  // Qué aguja se está moviendo con el teclado. El minutero arranca porque es la
  // que más se usa, igual que al arrastrar.
  const [focusedHand, setFocusedHand] = useState<Hand>('minute');
  const dialRef = useRef<SVGSVGElement | null>(null);
  const draggedRef = useRef<Hand | null>(null);
  const [dragging, setDragging] = useState(false);

  // Al abrir, las agujas siguen al valor vigente.
  useEffect(() => {
    if (!open) return;
    const current = snapToStep(value, step);
    const nextHour = Number(current.slice(0, 2)) || 0;
    const nextMinute = Number(current.slice(3, 5)) || 0;
    timeRef.current = { hour: nextHour, minute: nextMinute };
    setHour(nextHour);
    setMinute(nextMinute);
  }, [open, value, step]);

  const commit = useCallback(
    (nextHour: number, nextMinute: number) => {
      onChange(`${pad(nextHour)}:${pad(nextMinute)}`);
    },
    [onChange]
  );

  const pick = useCallback(
    (nextHour: number, nextMinute: number) => {
      timeRef.current = { hour: nextHour, minute: nextMinute };
      setHour(nextHour);
      setMinute(nextMinute);
      // Se guarda en cada elección: si el usuario cierra con click fuera, lo
      // que había elegido no se pierde.
      commit(nextHour, nextMinute);
    },
    [commit]
  );

  const setPeriod = (pm: boolean) => pick((hour % 12) + (pm ? 12 : 0), minute);

  const applyNow = () => {
    // "Ahora" guarda el minuto exacto, sin ajustar al paso: la hora real de la
    // captura no tiene por qué caer en un múltiplo del paso.
    const now = leadTime();
    const snapped = snapToStep(now, step);
    const snappedHour = Number(snapped.slice(0, 2));
    const snappedMinute = Number(snapped.slice(3, 5));
    timeRef.current = { hour: snappedHour, minute: snappedMinute };
    setHour(snappedHour);
    setMinute(snappedMinute);
    commit(Number(now.slice(0, 2)), Number(now.slice(3, 5)));
    setOpen(false);
  };

  const applyPointer = useCallback(
    (clientX: number, clientY: number, allowWrap = true) => {
      const dial = dialRef.current;
      if (!dial) return;

      const { angle } = angleFromPoint(clientX, clientY, dial.getBoundingClientRect());
      const turn = normalizeAngle(angle) / 360;
      const { hour: curHour, minute: curMinute } = timeRef.current;

      if (draggedRef.current === 'hour') {
        // Mover la aguja de horas no cambia AM/PM: eso lo decide el selector.
        pick((Math.round(turn * 12) % 12) + (curHour >= 12 ? 12 : 0), curMinute);
        return;
      }

      const nextMinute = (Math.round(turn * minuteSteps) % minuteSteps) * step;
      let nextHour = curHour;

      // Como en un reloj de pared: si el minutero pasa de :5x a :0x, la hora
      // avanza; si retrocede de :0x a :5x, la hora retrocede. Un salto de más
      // de 30 min entre dos eventos solo puede ser un cruce del 60, no un
      // movimiento real. Las 24 h son circulares (23:59 → 00:00), y al cruzar
      // las 12 cambia AM/PM porque `isPm` se deriva de `hour`.
      if (allowWrap) {
        if (curMinute - nextMinute > WRAP_THRESHOLD) nextHour = (curHour + 1) % 24;
        else if (nextMinute - curMinute > WRAP_THRESHOLD) nextHour = (curHour + 23) % 24;
      }

      pick(nextHour, nextMinute);
    },
    [minuteSteps, step, pick]
  );

  /**
   * Decide qué aguja se agarra en el primer contacto. Va en `pointerdown` y no
   * en cada `move`: si se recalculara en cada movimiento, al cruzar la aguja de
   * horas el agarre saltaría al minutero a mitad de gesto.
   */
  const resolveHand = (clientX: number, clientY: number): Hand => {
    const dial = dialRef.current;
    if (!dial) return 'minute';

    const { angle, ratio } = angleFromPoint(clientX, clientY, dial.getBoundingClientRect());
    const nearHour = angularGap(angle, angleFor(hourOnDial + minute / 60, 12)) <= GRAB_TOLERANCE_DEG;
    const nearMinute = angularGap(angle, angleFor(minute, 60)) <= GRAB_TOLERANCE_DEG;

    if ((ratio <= HOUR_HAND_RATIO + 0.12 && nearHour) || (nearHour && !nearMinute)) return 'hour';
    return 'minute';
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    // Un dedo que ya empieza sobre la esfera es un arrastre de aguja, no un
    // scroll: sin esto el `pointermove` se lo come el contenedor desplazable.
    event.preventDefault();
    const hand = resolveHand(event.clientX, event.clientY);
    draggedRef.current = hand;
    setFocusedHand(hand);
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    // El primer toque coloca la aguja donde se tocó: no cuenta como cruce del
    // 60, para que un tap al otro lado de la esfera no cambie la hora solo.
    applyPointer(event.clientX, event.clientY, false);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draggedRef.current) return;
    event.preventDefault();
    applyPointer(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draggedRef.current) return;
    // El `pointerup` sin `move` previo ya fijó el valor en `pointerdown`, así
    // que un simple tap es un tap: no hace falta tratarlo aparte.
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    draggedRef.current = null;
    setDragging(false);
  };

  const handleDialKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    // H y M eligen la aguja; A y P eligen AM o PM. No se usa Tab porque el
    // navegador lo reserva para recorrer el formulario, y atraparlo aquí dejaría
    // la esfera sin salida.
    if (event.key === 'H' || event.key === 'h') {
      event.preventDefault();
      setFocusedHand('hour');
      return;
    }
    if (event.key === 'M' || event.key === 'm') {
      event.preventDefault();
      setFocusedHand('minute');
      return;
    }
    if (event.key === 'A' || event.key === 'a') {
      event.preventDefault();
      setPeriod(false);
      return;
    }
    if (event.key === 'P' || event.key === 'p') {
      event.preventDefault();
      setPeriod(true);
      return;
    }

    const delta = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
    if (delta !== 0) {
      event.preventDefault();
      if (focusedHand === 'hour') {
        // Recorre las 24 h de seguido: de 11 AM pasa a 12 PM, como en un reloj.
        pick((hour + delta + 24) % 24, minute);
      } else {
        // Trabaja en minutos totales del día: 12:59 ↑ → 13:00, 13:00 ↓ → 12:59.
        const total = (((hour * 60 + minute + delta * step) % 1440) + 1440) % 1440;
        pick(Math.floor(total / 60), total % 60);
      }
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const toEnd = event.key === 'End';
      if (focusedHand === 'hour') pick(toEnd ? 23 : 0, minute);
      else pick(hour, (toEnd ? minuteSteps - 1 : 0) * step);
    }
  };

  const hourAngle = angleFor(hourOnDial + minute / 60, 12);
  const minuteAngle = angleFor(minute, 60);

  // Si una aguja cruza las 12 (p. ej. de 11 a 12 con flechas, o de :59 a :00),
  // la transición CSS la haría girar casi una vuelta entera hacia atrás: ahí se
  // salta directo.
  const prevAngles = useRef({ hour: hourAngle, minute: minuteAngle });
  const hourJumped = Math.abs(hourAngle - prevAngles.current.hour) > 180;
  const minuteJumped = Math.abs(minuteAngle - prevAngles.current.minute) > 180;
  useEffect(() => {
    prevAngles.current = { hour: hourAngle, minute: minuteAngle };
  });

  // Punto a `length` píxeles del centro, en el ángulo dado (0° a las 12).
  const handEnd = (angle: number, length: number) => ({
    x: DIAL_RADIUS + Math.sin((angle * Math.PI) / 180) * length,
    y: DIAL_RADIUS - Math.cos((angle * Math.PI) / 180) * length
  });

  const tick = (angle: number, from: number, to: number) => {
    const inner = handEnd(angle, DIAL_RADIUS * from);
    const outer = handEnd(angle, DIAL_RADIUS * to);
    return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
  };

  return (
    <>
      <div className="relative">
        <PickerTrigger
          anchorRef={anchorRef}
          icon={Clock}
          text={value ? formatTime12(value) : value}
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
            <div className="flex justify-center">
              <svg
                ref={dialRef}
                viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
                width={DIAL_SIZE}
                height={DIAL_SIZE}
                role="application"
                aria-label={`Reloj, ${value ? formatTime12(value) : 'sin hora seleccionada'}. Flechas para ajustar, H o M para cambiar de aguja, A o P para AM o PM`}
                tabIndex={0}
                data-dragging={dragging ? 'true' : 'false'}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={handleDialKeyDown}
                className="select-none outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                style={{ touchAction: 'none', cursor: 'grab' }}
              >
                {/* Fondo de la esfera y aro del color del tema */}
                <circle cx={DIAL_RADIUS} cy={DIAL_RADIUS} r={DIAL_RADIUS} fill="white" />
                <circle
                  cx={DIAL_RADIUS}
                  cy={DIAL_RADIUS}
                  r={DIAL_RADIUS - 3}
                  fill="none"
                  stroke={ACCENT_LIGHT}
                  strokeWidth={1}
                />

                {/* 60 marcas, como un reloj: más largas cada 5 min (posición de
                    cada hora). La hora activa se resalta con el color del tema. */}
                {Array.from({ length: 60 }, (_, index) => {
                  const isHourTick = index % 5 === 0;
                  const isActiveHour = isHourTick && index / 5 === hourOnDial;
                  return (
                    <line
                      key={`tick-${index}`}
                      {...tick(
                        angleFor(index, 60),
                        isHourTick ? HOUR_TICK_INNER : MINUTE_TICK_INNER,
                        TICK_OUTER
                      )}
                      stroke={isActiveHour ? ACCENT : isHourTick ? 'rgba(0,0,0,0.32)' : 'rgba(0,0,0,0.14)'}
                      strokeWidth={isActiveHour ? 2.5 : isHourTick ? 1.5 : 1}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Números 12, 1, 2 … 11. Negros, no en color de tema: con
                    naranja o verde sobre blanco no alcanzarían el contraste. */}
                {Array.from({ length: 12 }, (_, index) => {
                  const isActive = index === hourOnDial;
                  const point = handEnd(angleFor(index, 12), DIAL_RADIUS * NUMBER_RADIUS);

                  return (
                    <text
                      key={`number-${index}`}
                      x={point.x}
                      y={point.y}
                      dominantBaseline="central"
                      textAnchor="middle"
                      fontSize={isActive ? 15 : 13}
                      fontWeight={isActive ? 800 : 600}
                      fill={isActive ? ACCENT : '#1D1D1F'}
                      opacity={isActive ? 1 : 0.75}
                    >
                      {index === 0 ? 12 : index}
                    </text>
                  );
                })}

                {/* Minutero: largo y fino */}
                <g
                  style={{
                    transform: `rotate(${minuteAngle}deg)`,
                    transformOrigin: `${DIAL_RADIUS}px ${DIAL_RADIUS}px`,
                    transition: dragging || minuteJumped ? 'none' : HAND_TRANSITION
                  }}
                >
                  <line
                    x1={DIAL_RADIUS}
                    y1={DIAL_RADIUS + 6}
                    x2={DIAL_RADIUS}
                    y2={DIAL_RADIUS - DIAL_RADIUS * MINUTE_HAND_RATIO}
                    stroke={ACCENT}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                  {/* Halo en la punta: dice qué aguja moverán las flechas del
                      teclado, ya que en la esfera no hay cursor que lo señale. */}
                  {focusedHand === 'minute' && (
                    <circle
                      cx={DIAL_RADIUS}
                      cy={DIAL_RADIUS - DIAL_RADIUS * MINUTE_HAND_RATIO}
                      r={6}
                      fill="white"
                      stroke={ACCENT}
                      strokeWidth={1.5}
                    />
                  )}
                </g>

                {/* Aguja de horas: corta y gruesa. Se dibuja después para que
                    quede por encima del minutero, como en un reloj real. */}
                <g
                  style={{
                    transform: `rotate(${hourAngle}deg)`,
                    transformOrigin: `${DIAL_RADIUS}px ${DIAL_RADIUS}px`,
                    transition: dragging || hourJumped ? 'none' : HAND_TRANSITION
                  }}
                >
                  <line
                    x1={DIAL_RADIUS}
                    y1={DIAL_RADIUS + 4}
                    x2={DIAL_RADIUS}
                    y2={DIAL_RADIUS - DIAL_RADIUS * HOUR_HAND_RATIO}
                    stroke={ACCENT}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                  />
                  {focusedHand === 'hour' && (
                    <circle
                      cx={DIAL_RADIUS}
                      cy={DIAL_RADIUS - DIAL_RADIUS * HOUR_HAND_RATIO}
                      r={6}
                      fill="white"
                      stroke={ACCENT}
                      strokeWidth={1.5}
                    />
                  )}
                </g>

                {/* Eje */}
                <circle cx={DIAL_RADIUS} cy={DIAL_RADIUS} r={5} fill="white" />
                <circle cx={DIAL_RADIUS} cy={DIAL_RADIUS} r={3} fill={ACCENT} />
              </svg>
            </div>

            {/* AM / PM */}
            <div
              role="radiogroup"
              aria-label="AM o PM"
              className="mt-2 flex rounded-full bg-[#F5F5F7] p-0.5"
            >
              {(['AM', 'PM'] as const).map((period) => {
                const active = (period === 'PM') === isPm;
                return (
                  <button
                    key={period}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPeriod(period === 'PM')}
                    className={`flex-1 rounded-full py-1 text-[11px] font-bold transition-all ${
                      active
                        ? 'bg-white text-[#1D1D1F] shadow-sm'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    {period}
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-center text-[10px] font-semibold text-slate-400">
              Arrastra las agujas · teclado: H, M, A, P y flechas
            </p>

            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/[0.05]">
              {/* Muestra el valor guardado, no el paso resaltado: tras "Ahora"
                  pueden diferir si el paso no es de 1 minuto. */}
              <span
                aria-live="polite"
                className="text-[11px] font-bold text-[#1D1D1F] px-2.5 py-1.5 rounded-full bg-[#F5F5F7] tabular-nums whitespace-nowrap"
              >
                {value ? formatTime12(value) : '--:--'}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-1.5 rounded-xl bg-accent text-white text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Listo
              </button>
              <button
                type="button"
                onClick={applyNow}
                className="py-1.5 px-2.5 rounded-xl bg-[#F5F5F7] hover:bg-[#EBEBEF] text-xs font-semibold text-slate-700 transition-colors"
              >
                Ahora
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};