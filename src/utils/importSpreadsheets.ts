import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Lead, LeadStatus } from '../types';
import { cleanCompanyName } from './company';
import { cleanContact, normalizeEmail, normalizePhone } from './contactInfo';
import { leadTimestampNow, parseLeadTimestamp, todayISODate } from './date';

/** Campo destino al que puede mapearse una columna del archivo importado. */
export type ImportField =
  | 'id'
  | 'name'
  | 'company'
  | 'role'
  | 'email'
  | 'phone'
  | 'city'
  | 'event'
  | 'interests'
  | 'status'
  | 'priority'
  | 'estimatedValue'
  | 'capturedBy'
  | 'capturedAt'
  | 'lastContact'
  | 'nextContactDate'
  | 'notes';

export const IMPORT_FIELDS: { value: ImportField; label: string }[] = [
  { value: 'name', label: 'Nombre' },
  { value: 'company', label: 'Empresa' },
  { value: 'role', label: 'Cargo' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'city', label: 'Ciudad' },
  { value: 'event', label: 'Evento' },
  { value: 'interests', label: 'Intereses' },
  { value: 'status', label: 'Estado' },
  { value: 'priority', label: 'Prioridad' },
  { value: 'estimatedValue', label: 'Valor estimado' },
  { value: 'capturedBy', label: 'Capturado por' },
  { value: 'capturedAt', label: 'Fecha de captura' },
  { value: 'lastContact', label: 'Último contacto' },
  { value: 'nextContactDate', label: 'Próximo contacto' },
  { value: 'notes', label: 'Notas' },
  { value: 'id', label: 'ID' }
];

const FIELD_ALIASES: Record<ImportField, string[]> = {
  id: ['id', 'identificador', 'codigo', 'código'],
  name: ['nombre', 'name', 'lead', 'contacto', 'cliente', 'prospecto'],
  company: ['empresa', 'compañia', 'compania', 'company', 'organizacion', 'organization', 'organización'],
  role: ['cargo', 'puesto', 'rol', 'role', 'title', 'titulo', 'job', 'perfil'],
  email: ['email', 'correo', 'mail', 'e-mail', 'correo electronico', 'correo electrónico'],
  phone: ['telefono', 'teléfono', 'phone', 'celular', 'movil', 'móvil', 'tel', 'cel'],
  city: ['ciudad', 'city', 'ubicacion', 'ubicación', 'locacion', 'locación', 'location'],
  event: ['evento', 'event', 'feria', 'congreso', 'stand', 'acontecimiento'],
  interests: ['intereses', 'interes', 'interés', 'interests', 'interes clave', 'interés clave', 'tecnologias'],
  status: ['estado', 'status', 'etapa', 'fase', 'stage', 'situacion'],
  priority: ['prioridad', 'priority', 'vip', 'urgente', 'prioritario'],
  estimatedValue: ['valorestimadousd', 'valor estimado', 'valor estimado usd', 'estimatedvalue', 'monto', 'valor', 'presupuesto', 'amount', 'budget'],
  capturedBy: ['capturadopor', 'capturado por', 'captura', 'representante', 'ejecutivo', 'usuario', 'vendedor', 'responsable', 'capturedby'],
  capturedAt: ['fechacaptura', 'fecha de captura', 'fecha captura', 'fecha', 'capturedat', 'captured at', 'dia'],
  lastContact: ['ultimocontacto', 'último contacto', 'ultimo contacto', 'lastcontact', 'last contact', 'contactado'],
  nextContactDate: ['proximocontacto', 'proximo contacto', 'siguiente contacto', 'fecha de seguimiento', 'nextcontactdate', 'seguimiento', 'fecha contacto'],
  notes: ['notas', 'nota', 'comentarios', 'comentario', 'observaciones', 'observacion', 'notes', 'descripcion']
};

/** Contexto con el que se completan los campos ausentes del archivo. */
export interface ImportContext {
  currentEventName: string;
  capturedBy: string;
}

export interface ImportSource {
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface ImportedDuplicate {
  rowIndex: number;
  existingLead: Lead;
  matchField: 'email' | 'phone' | 'nameCompany';
}

export interface ImportedInvalid {
  rowIndex: number;
  reason: string;
}

/** Normaliza un encabezado para compararlo con los alias (sin acentos, minúsculas). */
const normalizeKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const toInternalTimestamp = (value: unknown): string => {
  const cleaned = cleanContact(value as string | null);
  if (!cleaned) return '';
  const ms = parseLeadTimestamp(cleaned);
  if (ms === null) return '';
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toISODate = (value: unknown): string => {
  const cleaned = cleanContact(value as string | null);
  if (!cleaned) return '';
  const ms = parseLeadTimestamp(cleaned);
  if (ms === null) return '';
  return todayISODate(new Date(ms));
};

const STATUS_OPTIONS: LeadStatus[] = ['Nuevo', 'Contactado', 'Calificado', 'Reunión Agendada', 'Ganado', 'Descartado'];

const toStatus = (value: unknown): LeadStatus => {
  const cleaned = cleanContact(value as string | null).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!cleaned) return 'Nuevo';
  const match = STATUS_OPTIONS.find(s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === cleaned);
  if (match) return match;
  if (cleaned === 'ganado' || cleaned === 'cerrado' || cleaned === 'cerrada') return 'Ganado';
  return 'Nuevo';
};

const toPriority = (value: unknown): boolean => {
  const cleaned = cleanContact(value as string | null).toLowerCase();
  if (!cleaned) return false;
  return ['si', 'sí', 'true', '1', 'alta', 'vip', 'prioritario', 'prioritaria', 'urgente'].includes(cleaned);
};

const toNumber = (value: unknown): number | undefined => {
  const cleaned = String(value ?? '').trim();
  if (!cleaned) return undefined;
  const numeric = Number(cleaned.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
  return numeric;
};

const toInterests = (value: unknown): string[] => {
  const cleaned = cleanContact(value as string | null);
  if (!cleaned) return ['IA'];
  const parts = cleaned.split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : ['IA'];
};

const normalizeText = (value: unknown): string =>
  cleanContact(value as string | null).replace(/\s+/g, ' ');

/**
 * Lee un archivo CSV o Excel y devuelve su contenido como tabla genérica
 * (encabezados + filas de objetos). Dispara un error claro si el archivo no
 * puede leerse o no tiene filas de datos.
 */
export async function parseSpreadsheetFile(file: File): Promise<ImportSource> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (extension === 'csv' || extension === 'txt') {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false
    });
    if (parsed.errors.some(e => e.type !== 'Delimiter')) {
      const firstError = parsed.errors[0];
      console.warn('Advertencias al leer CSV:', parsed.errors);
      // Un error de delimitador es informativo; el resto sí invalida la lectura.
      if (firstError?.type !== 'Delimiter') {
        throw new Error(`No se pudo leer el CSV: ${firstError?.message ?? 'formato no reconocido'}`);
      }
    }
    return {
      headers: parsed.meta.fields ?? [],
      rows: parsed.data as Record<string, unknown>[]
    };
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('El archivo Excel no tiene hojas.');
    const sheet = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true });
    if (aoa.length === 0) return { headers: [], rows: [] };
    const headers = (aoa[0] ?? []).map(h => String(h ?? '').trim());
    const rows = aoa.slice(1).map(raw => {
      const obj: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        if (!header) return;
        obj[header] = raw[index] ?? '';
      });
      return obj;
    });
    return { headers, rows: rows.filter(r => Object.keys(r).length > 0) };
  }

  throw new Error('Formato no soportado. Sube un archivo .csv, .txt, .xlsx o .xls.');
}

/**
 * Mapea automáticamente los encabezados del archivo a los campos del Lead
 * usando sinónimos en español. Las columnas que no coinciden quedan en `null`
 * (se ignoran a menos que el usuario las mapee a mano).
 */
export function autoMapColumns(headers: string[]): Record<string, ImportField | null> {
  const mapping: Record<string, ImportField | null> = {};
  const used = new Set<ImportField>();

  headers.forEach(header => {
    const key = normalizeKey(header);
    let match: ImportField | null = null;
    for (const field of Object.keys(FIELD_ALIASES) as ImportField[]) {
      if (FIELD_ALIASES[field].some(alias => normalizeKey(alias) === key)) {
        match = field;
        break;
      }
    }
    // Nunca mapear dos columnas al mismo campo (la primera gana).
    if (match && used.has(match)) match = null;
    if (match) used.add(match);
    mapping[header] = match;
  });

  return mapping;
}

const pickValue = (
  mapping: Record<string, ImportField | null>,
  headers: string[],
  row: Record<string, unknown>,
  field: ImportField
): unknown => {
  for (const header of headers) {
    if (mapping[header] === field) return row[header];
  }
  return undefined;
};

/** Genera la historia inicial de un lead importado. */
const buildHistory = (capturedAt: string, capturedBy: string) => [
  {
    id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: capturedAt.slice(0, 10),
    time: capturedAt.slice(11, 16),
    author: capturedBy,
    text: `Importado desde archivo por ${capturedBy}.`,
    type: 'note' as const
  }
];

/**
 * Normaliza una fila del archivo a un `Lead` listo para guardar. Devuelve
 * `null` si la fila no tiene nombre ni empresa (no se puede crear un lead útil).
 */
export function rowToLead(
  row: Record<string, unknown>,
  rowIndex: number,
  mapping: Record<string, ImportField | null>,
  headers: string[],
  context: ImportContext
): Lead | null {
  const name = normalizeText(pickValue(mapping, headers, row, 'name'));
  const company = cleanCompanyName(String(pickValue(mapping, headers, row, 'company') ?? ''));
  if (!name && !company) return null;

  const capturedAt = toInternalTimestamp(pickValue(mapping, headers, row, 'capturedAt')) || leadTimestampNow();
  const capturedBy = String(pickValue(mapping, headers, row, 'capturedBy') ?? context.capturedBy).trim() || context.capturedBy;
  const event = String(pickValue(mapping, headers, row, 'event') ?? context.currentEventName).trim() || context.currentEventName;
  const interests = toInterests(pickValue(mapping, headers, row, 'interests'));
  const interestSummary = interests.join(', ');
  const nextContactDate = toISODate(pickValue(mapping, headers, row, 'nextContactDate')) || todayISODate();

  const lead: Lead = {
    id: pickValue(mapping, headers, row, 'id')
      ? `imp-${Date.now()}-${rowIndex}-${String(pickValue(mapping, headers, row, 'id')).trim()}`
      : `imp-${Date.now()}-${rowIndex}`,
    name: name || '(Sin nombre)',
    role: normalizeText(pickValue(mapping, headers, row, 'role')) || 'Visitante Comercial',
    company: company || '(Sin empresa)',
    email: normalizeEmail(pickValue(mapping, headers, row, 'email') as string | null | undefined),
    phone: normalizePhone(pickValue(mapping, headers, row, 'phone') as string | null | undefined),
    ...(cleanContact(pickValue(mapping, headers, row, 'city') as string | null) ? { city: normalizeText(pickValue(mapping, headers, row, 'city')) } : {}),
    event,
    interests,
    experiences: ['Importación'],
    sources: ['Importación'],
    capturedBy,
    capturedAt,
    lastContact: toInternalTimestamp(pickValue(mapping, headers, row, 'lastContact')) || capturedAt,
    priority: toPriority(pickValue(mapping, headers, row, 'priority')),
    status: toStatus(pickValue(mapping, headers, row, 'status')),
    estimatedValue: toNumber(pickValue(mapping, headers, row, 'estimatedValue')),
    ...(cleanContact(pickValue(mapping, headers, row, 'notes') as string | null) ? { notes: normalizeText(pickValue(mapping, headers, row, 'notes')) } : {}),
    nextContactDate,
    history: buildHistory(capturedAt, capturedBy),
    suggestedAction: {
      title: 'Agendar reunión de presentación',
      description: `Proponer fecha para reunión ejecutiva sobre ${interestSummary}.`,
      type: 'meeting'
    }
  };

  return lead;
}

const phoneDigits = (value: string | undefined): string => (value ?? '').replace(/\D/g, '');

/**
 * Organiza las filas del archivo en tres grupos: leads nuevos, filas que ya
 * existen (duplicados, con la clave por la que coincidieron) y filas inválidas.
 * La detección usa email → teléfono → nombre+empresa, en ese orden de prioridad.
 */
export function buildImportResult(
  source: ImportSource,
  mapping: Record<string, ImportField | null>,
  existingLeads: Lead[],
  context: ImportContext
): { newLeads: Lead[]; duplicates: ImportedDuplicate[]; invalid: ImportedInvalid[] } {
  const newLeads: Lead[] = [];
  const duplicates: ImportedDuplicate[] = [];
  const invalid: ImportedInvalid[] = [];

  source.rows.forEach((row, index) => {
    const email = normalizeEmail(pickValue(mapping, source.headers, row, 'email') as string | null | undefined);
    const phone = phoneDigits(cleanContact(pickValue(mapping, source.headers, row, 'phone') as string | null));
    const name = normalizeText(pickValue(mapping, source.headers, row, 'name')).toLowerCase().replace(/\s+/g, ' ');
    const companyKey = cleanCompanyName(String(pickValue(mapping, source.headers, row, 'company') ?? '')).toLowerCase().replace(/\s+/g, ' ');

    if (!name && !companyKey) {
      invalid.push({ rowIndex: index + 2, reason: 'Sin nombre ni empresa' });
      return;
    }

    let duplicate: { existing: Lead; matchField: ImportedDuplicate['matchField'] } | null = null;
    if (email) {
      const byEmail = existingLeads.find(l => l.email && l.email.toLowerCase() === email);
      if (byEmail) duplicate = { existing: byEmail, matchField: 'email' };
    }
    if (!duplicate && phone) {
      const byPhone = existingLeads.find(l => phoneDigits(l.phone) && phoneDigits(l.phone) === phone);
      if (byPhone) duplicate = { existing: byPhone, matchField: 'phone' };
    }
    if (!duplicate && name) {
      const byNameCompany = existingLeads.find(
        l => l.name.trim().toLowerCase().replace(/\s+/g, ' ') === name && cleanCompanyName(l.company).toLowerCase().replace(/\s+/g, ' ') === companyKey
      );
      if (byNameCompany) duplicate = { existing: byNameCompany, matchField: 'nameCompany' };
    }

    if (duplicate) {
      duplicates.push({ rowIndex: index + 2, existingLead: duplicate.existing, matchField: duplicate.matchField });
      return;
    }

    const lead = rowToLead(row, index, mapping, source.headers, context);
    if (lead) newLeads.push(lead);
  });

  return { newLeads, duplicates, invalid };
}