const pad = (value: number): string => String(value).padStart(2, '0');

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const MONTHS_ES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function todayISODate(base: Date = new Date()): string {
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Timestamp ordenable que se guarda en `Lead.lastContact` y `Lead.capturedAt`. */
export function leadTimestampNow(base: Date = new Date()): string {
  return `${todayISODate(base)} ${leadTime(base)}`;
}

/** Fecha local `YYYY-MM-DD`, para `InteractionItem.date`. */
export function leadHistoryDate(base: Date = new Date()): string {
  return todayISODate(base);
}

/** Hora local `HH:mm`. */
export function leadTime(base: Date = new Date()): string {
  return `${pad(base.getHours())}:${pad(base.getMinutes())}`;
}

/** Fecha y hora local en el formato que espera un `<input type="datetime-local">`. */
export function localDateTimeInputNow(base: Date = new Date()): string {
  return `${todayISODate(base)}T${leadTime(base)}`;
}

/**
 * Ajusta un `HH:mm` al múltiplo de `stepMinutes` más cercano hacia abajo.
 * El reloj real puede dar minutos que el selector no ofrece (ej. `14:32` con
 * pasos de 5), así que se muestra el paso equivalente sin tocar el valor.
 */
export function snapToStep(value: string, stepMinutes = 5): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  const step = stepMinutes > 0 ? stepMinutes : 1;
  if (!match) return leadTime();

  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  const snapped = Math.min(59, Math.floor(minute / step) * step);
  return `${pad(hour)}:${pad(snapped)}`;
}

/**
 * Compone un `Lead.capturedAt` (`YYYY-MM-DD HH:mm`) a partir de la fecha y la
 * hora elegidas en el formulario. No pasa por `Date`: parsear `"YYYY-MM-DD"`
 * como fecha pura lo convertiría a UTC y correría el día en offset negativo.
 */
export function leadTimestampFrom(dateISO: string, timeHHmm: string): string {
  const datePart = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!datePart) return `${todayISODate()} ${leadTime()}`;

  const hour = Number(timeHHmm.match(/^(\d{1,2}):(\d{2})$/)?.[1] ?? 0);
  const minute = Number(timeHHmm.match(/^(\d{1,2}):(\d{2})$/)?.[2] ?? 0);
  return `${datePart[1]}-${datePart[2]}-${datePart[3]} ${pad(hour)}:${pad(minute)}`;
}

/**
 * ¿La fecha/hora de captura elegida cae en el futuro?
 *
 * Solo es posible con la fecha de hoy: cualquier día anterior ya está en el pasado.
 * Un día futuro se rechaza por separado contra `todayISODate`.
 */
export function isCaptureTimestampInFuture(
  dateISO: string,
  timeHHmm: string,
  base: Date = new Date()
): boolean {
  if (dateISO !== todayISODate(base)) return false;
  return leadTimestampFrom(dateISO, timeHHmm) > leadTimestampNow(base);
}

/**
 * Milisegundos de un `YYYY-MM-DD` a medianoche **hora local**.
 *
 * `new Date("2026-09-06")` lo interpreta como UTC según el spec, lo que corre
 * un día la fecha en zonas con offset negativo y descuadra los cálculos de
 * diferencia de días contra `parseLeadTimestamp`, que sí es local.
 */
export function isoDateToLocalMs(isoDate: string): number {
  const parts = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!parts) {
    const fallback = new Date(`${isoDate}T00:00:00`);
    return fallback.getTime();
  }
  return new Date(+parts[1], +parts[2] - 1, +parts[3], 0, 0, 0, 0).getTime();
}

/** Normaliza un nombre de mes en español (con o sin acentos) a su índice 0-11. */
function monthIndexFromName(name: string): number {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const index = MONTHS_ES.indexOf(normalized);
  return index;
}

/**
 * Convierte a milisegundos cualquier timestamp de lead guardado:
 * ISO (`YYYY-MM-DD HH:mm`), legado (`DD/MM/YYYY, HH:mm`) y etiquetas
 * relativas (`Hoy`, `Ayer`, `Hoy, 14:32`). Devuelve null si no reconoce el valor.
 */
export function parseLeadTimestamp(value?: string): number | null {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return null;

  const iso = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (iso) {
    return new Date(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] ?? 0), +(iso[5] ?? 0)).getTime();
  }

  const legacy = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[,\s]+(\d{2}):(\d{2}))?/);
  if (legacy) {
    return new Date(+legacy[3], +legacy[2] - 1, +legacy[1], +(legacy[4] ?? 0), +(legacy[5] ?? 0)).getTime();
  }

  const relative = cleaned.match(/^(hoy|ayer)(?:[,\s]+(\d{1,2}):(\d{2}))?$/i);
  if (relative) {
    const base = new Date();
    if (relative[1].toLowerCase() === 'ayer') base.setDate(base.getDate() - 1);
    base.setHours(+(relative[2] ?? 0), +(relative[3] ?? 0), 0, 0);
    return base.getTime();
  }

  const parsed = Date.parse(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Etiqueta legible para el usuario: `Hoy, 14:32`, `Ayer, 09:10` o `01/10/2026, 14:32`.
 * Si el valor no se reconoce, lo devuelve tal cual para no ocultar el dato.
 */
export function formatRelativeDayLabel(value?: string): string {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return '';

  const time = parseLeadTimestamp(cleaned);
  if (time === null) return cleaned;

  const date = new Date(time);
  const dayKey = todayISODate(date);
  const todayKey = todayISODate();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = todayISODate(yesterday);

  const dayLabel =
    dayKey === todayKey
      ? 'Hoy'
      : dayKey === yesterdayKey
        ? 'Ayer'
        : `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

  // Si el valor original no traía hora (p. ej. un `YYYY-MM-DD` suelto), no inventar una.
  if (!/\d{1,2}:\d{2}/.test(cleaned)) return dayLabel;

  return `${dayLabel}, ${leadTime(date)}`;
}

/**
 * Convierte un timestamp de lead al formato absoluto que se usa en tablas y CSV.
 * Acepta el formato nuevo (`YYYY-MM-DD HH:mm`) y los antiguos; si no lo reconoce,
 * lo devuelve tal cual.
 */
export function formatLeadTimestamp(value?: string): string {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return '';

  const time = parseLeadTimestamp(cleaned);
  if (time === null) return cleaned;

  const date = new Date(time);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${leadTime(date)}`;
}

/** Ordena dos timestamps de lead. Los valores no reconocidos quedan al final. */
export function compareLeadTimestamps(a?: string, b?: string): number {
  const timeA = parseLeadTimestamp(a);
  const timeB = parseLeadTimestamp(b);
  if (timeA === null && timeB === null) return 0;
  if (timeA === null) return 1;
  if (timeB === null) return -1;
  return timeA - timeB;
}

/** Etiqueta corta `DD Mmm` para ejes de gráfica, derivada de una fecha `YYYY-MM-DD`. */
export function formatShortDayLabel(isoDate: string): string {
  const parts = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!parts) return isoDate;
  return `${parts[3]} ${MONTHS_ES_SHORT[+parts[2] - 1]}`;
}

/** Encabezados de la semana del calendario propio, empezando en lunes. */
export const WEEKDAY_SHORT_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

/** Nombre de mes en español con mayúscula inicial, para índices 0-11. */
export function monthNameEs(month: number): string {
  const name = MONTHS_ES[month];
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
}

/**
 * Rejilla de 6 semanas x 7 días del mes indicado (índice 0-11), en lunes
 * primero. Los huecos que caen fuera del mes vienen como `null` para mantener
 * la altura estable. Se construye con el constructor local de `Date`: parsear
 * `"YYYY-MM-DD"` correría el día en offset negativo, igual que documenta
 * `isoDateToLocalMs`.
 */
export function buildMonthGrid(year: number, month: number): (string | null)[][] {
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const weeks: (string | null)[][] = [];

  for (let week = 0; week < 6; week += 1) {
    const days: (string | null)[] = [];
    for (let slot = 0; slot < 7; slot += 1) {
      const dayNumber = week * 7 + slot - firstWeekday + 1;
      const day = new Date(year, month, dayNumber);
      days.push(day.getMonth() === month ? todayISODate(day) : null);
    }
    weeks.push(days);
  }

  return weeks;
}

/** Primer y último día de un mes como `YYYY-MM-DD` local. */
export function monthBoundsISO(year: number, month: number): { start: string; end: string } {
  return {
    start: todayISODate(new Date(year, month, 1)),
    end: todayISODate(new Date(year, month + 1, 0))
  };
}

/** Desplaza un mes manteniendo el índice 0-11 dentro del rango válido. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const shifted = new Date(year, month + delta, 1);
  return { year: shifted.getFullYear(), month: shifted.getMonth() };
}

export interface EventDateRange {
  start: string;
  end: string;
}

/**
 * Interpreta el `dateRange` de un evento, p. ej. `"06 - 08 Septiembre 2026"`.
 * Solo soporta rangos de días dentro del mismo mes; los rangos de meses
 * (p. ej. `"Julio - Septiembre 2026"`) devuelven null a propósito, porque
 * expandirlos a días generaría un eje de meses.
 *
 * Ojo con los rangos escritos cruzando meses: `"28 - 03 Octubre 2026"` sí pasa el
 * patrón, pero como el mes se aplica a los dos días sale `start > end`. Quien lo
 * use debe tratar ese caso como no interpretable en vez de asumir un orden.
 */
export function parseEventDateRange(value?: string): EventDateRange | null {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return null;

  const match = cleaned.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+(?:de\s+)?([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s+(?:de\s+)?(\d{4})$/);
  if (!match) return null;

  const month = monthIndexFromName(match[3]);
  if (month < 0) return null;

  const year = +match[4];
  const startDay = +match[1];
  const endDay = +match[2];
  if (startDay < 1 || endDay < 1 || startDay > 31 || endDay > 31) return null;

  return {
    start: `${year}-${pad(month + 1)}-${pad(startDay)}`,
    end: `${year}-${pad(month + 1)}-${pad(endDay)}`
  };
}

/**
 * El rango de un evento solo si se puede dibujar de verdad, es decir, si
 * `parseEventDateRange` lo entiende **y** no viene invertido.
 *
 * Existe aparte del parser porque los dos criterios se necesitan juntos: un rango
 * escrito cruzando meses (`"28 - 03 Octubre 2026"`) pasa el patrón pero sale
 * `end < start`. Quien lo use para pintar días tiene que rechazar los dos casos por
 * igual, y decidirlo en un solo sitio evita que dos componentes discrepan.
 */
export function eventDateRangeForDisplay(value?: string): EventDateRange | null {
  const parsed = parseEventDateRange(value);
  if (!parsed || parsed.end < parsed.start) return null;
  return parsed;
}

/**
 * Compone el `dateRange` de un evento en la forma que después lee
 * `parseEventDateRange`, p. ej. `"06 - 08 Septiembre 2026"`.
 *
 * Si no hay fecha de fin, emite el rango de un solo día (`"06 - 06 Septiembre
 * 2026"`): un `YYYY-MM-DD` suelto no lo reconoce el patrón del parser y el evento
 * quedaría sin rango interpretable en la gráfica de tendencia.
 *
 * Devuelve cadena vacía si las fechas no son válidas o si el fin es anterior al
 * inicio, para no guardar un rango que luego se lea al revés.
 */
export function formatEventDateRange(startISO: string, endISO?: string): string {
  const start = new Date(isoDateToLocalMs(startISO));
  if (Number.isNaN(start.getTime())) return '';

  const end = endISO ? new Date(isoDateToLocalMs(endISO)) : start;
  if (Number.isNaN(end.getTime()) || end < start) return '';

  const monthName = monthNameEs(end.getMonth());
  if (!monthName) return '';

  const startDay = pad(start.getDate());
  const endDay = pad(end.getDate());
  const year = end.getFullYear();

  return `${startDay} - ${endDay} ${monthName} ${year}`;
}

/**
 * Versión legible del `dateRange` de un evento para la UI, p. ej.
 * `"06 - 08 Septiembre 2026"` → `"6 al 8 de Septiembre, 2026"`.
 *
 * Si el rango es de un solo día sale `"6 de Septiembre, 2026"`. Los rangos que
 * `eventDateRangeForDisplay` no puede interpretar (p. ej. `"Julio - Septiembre
 * 2026"`, `"Fecha por definir"`, `"2026"`) se devuelven tal cual como texto, y el
 * valor vacío produce `''` para que la UI omita el distintivo.
 */
export function formatEventDateRangeText(value?: string): string {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return '';

  const range = eventDateRangeForDisplay(cleaned);
  if (!range) return cleaned;

  const start = new Date(isoDateToLocalMs(range.start));
  const end = new Date(isoDateToLocalMs(range.end));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return cleaned;

  const monthName = monthNameEs(end.getMonth());
  if (!monthName) return cleaned;

  if (end.getTime() === start.getTime()) {
    return `${start.getDate()} de ${monthName}, ${end.getFullYear()}`;
  }

  return `${start.getDate()} al ${end.getDate()} de ${monthName}, ${end.getFullYear()}`;
}

/** Lista de días `YYYY-MM-DD` entre dos fechas inclusives, en orden ascendente. */
export function enumerateDays(startISO: string, endISO: string, maxDays = 400): string[] {
  const start = new Date(isoDateToLocalMs(startISO));
  const end = new Date(isoDateToLocalMs(endISO));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && days.length < maxDays) {
    days.push(todayISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
