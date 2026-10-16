import * as XLSX from 'xlsx';
import { Lead } from '../types';
import { formatLeadTimestamp } from './date';
import { DEFAULT_ESTIMATED_VALUE } from './format';

/** Caracteres que disparan el escape de un campo CSV (RFC 4180 ampliado). */
const CSV_ESCAPE_RE = /[;"\n\r]/;

/** Prefijos de inyección de fórmulas que Excel evalúa si un campo comienza con ellos. */
const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Escapa un valor de campo CSV: entrecomilla cuando contiene separador,
 * comilla o salto de línea, y duplica las comillas internas. Además protege
 * contra inyección de fórmulas: si el valor empieza con `=`, `+`, `-`, `@`, tab
 * o CR (Excel los interpretaría como fórmula), se prefija con `'` para que se
 * muestre como texto.
 */
const escapeCsvValue = (value: unknown): string => {
  const str = value === null || value === undefined ? '' : String(value);
  const guarded = FORMULA_PREFIX_RE.test(str) ? `'${str}` : str;
  if (CSV_ESCAPE_RE.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
};

/** Fila de encabezados de la tabla exportable de leads. */
const CSV_HEADERS = [
  'ID',
  'Nombre',
  'Empresa',
  'Cargo',
  'Email',
  'Teléfono',
  'Ciudad',
  'Evento',
  'Intereses',
  'Estado',
  'Prioridad',
  'ValorEstimadoUSD',
  'CapturadoPor',
  'FechaCaptura',
  'ÚltimoContacto',
  'Notas'
] as const;

/**
 * Convierte un lead a fila (arreglo de cadenas). Las fechas salen con el mismo
 * formato que muestra la app (`formatLeadTimestamp`, `DD/MM/YYYY, HH:mm`), y el
 * valor estimado usa el mismo fallback que el resto de la interfaz.
 */
const leadToRow = (l: Lead): string[] => [
  l.id,
  l.name,
  l.company,
  l.role,
  l.email,
  l.phone,
  l.city || '',
  l.event,
  (l.interests || []).join(', '),
  l.status,
  l.priority ? 'SI' : 'NO',
  String(l.estimatedValue ?? DEFAULT_ESTIMATED_VALUE),
  l.capturedBy,
  formatLeadTimestamp(l.capturedAt),
  formatLeadTimestamp(l.lastContact),
  l.notes || ''
];

const rowsToCsv = (rows: string[][]): string => {
  return '\uFEFF' + rows.map(row => row.map(escapeCsvValue).join(';')).join('\r\n');
};

const downloadTextFile = (content: string, filename: string, type: string): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exporta el listado de leads como CSV en forma de tabla, listo para abrir en
 * Excel. Usa punto y coma como separador (el locale es-CO de Excel abre una
 * coma como una sola columna) y BOM UTF-8 para que se muestren bien los
 * acentos.
 */
export function exportLeadsToCsv(leads: Lead[], filename: string): void {
  const rows = [[...CSV_HEADERS], ...leads.map(leadToRow)];
  downloadTextFile(rowsToCsv(rows), filename, 'text/csv;charset=utf-8;');
}

/**
 * Exporta el listado de leads como libro `.xlsx` real (una hoja con encabezados
 * y un lead por fila). Solo se usa escritura de SheetJS (`aoa_to_sheet`), que no
 * ejecuta el parser de lectura de la versión 0.18.5.
 */
export function exportLeadsToXlsx(leads: Lead[], filename: string): void {
  const rows: (string | number | boolean)[][] = [
    [...CSV_HEADERS],
    ...leads
      .map(l => [
        l.id,
        l.name,
        l.company,
        l.role,
        l.email,
        l.phone,
        l.city || '',
        l.event,
        (l.interests || []).join(', '),
        l.status,
        l.priority ? 'SI' : 'NO',
        l.estimatedValue ?? DEFAULT_ESTIMATED_VALUE,
        l.capturedBy,
        formatLeadTimestamp(l.capturedAt),
        formatLeadTimestamp(l.lastContact),
        l.notes || ''
      ])
  ];

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Leads');
  XLSX.writeFile(workbook, filename);
}