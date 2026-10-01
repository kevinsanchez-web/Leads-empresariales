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

export interface EventDateRange {
  start: string;
  end: string;
}

/**
 * Interpreta el `dateRange` de un evento, p. ej. `"06 - 08 Septiembre 2026"`.
 * Solo soporta rangos de días dentro del mismo mes; los rangos de meses
 * (p. ej. `"Julio - Septiembre 2026"`) devuelven null a propósito, porque
 * expandirlos a días generaría un eje de meses.
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

/** Lista de días `YYYY-MM-DD` entre dos fechas inclusives, en orden ascendente. */
export function enumerateDays(startISO: string, endISO: string, maxDays = 120): string[] {
  const start = new Date(`${startISO}T00:00:00`);
  const end = new Date(`${endISO}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const days: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end && days.length < maxDays) {
    days.push(todayISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
