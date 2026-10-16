import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Loader2, Upload, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { Lead, UserRep, EventOption } from '../types';
import { isOnline } from '../utils/offlineStore';
import { cleanCompanyName } from '../utils/company';
import { normalizeEmail, normalizePhone } from '../utils/contactInfo';
import { leadTimestampNow } from '../utils/date';
import {
  ImportField,
  IMPORT_FIELDS,
  ImportSource,
  ImportedDuplicate,
  autoMapColumns,
  buildImportResult,
  parseSpreadsheetFile,
  rowToLead
} from '../utils/importSpreadsheets';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  currentUser: UserRep;
  currentEvent: EventOption;
  onImportLeads: (newLeads: Lead[], updatedLeads: Lead[]) => Promise<void>;
}

/** Une los campos editables de un lead del archivo sobre el existente detectado. */
const mergeLeadFromFile = (existing: Lead, incoming: Lead): Lead => {
  const has = (value: string) => value.trim().length > 0;

  const updated: Lead = {
    ...existing,
    ...(has(incoming.role) && incoming.role !== 'Visitante Comercial' ? { role: incoming.role } : {}),
    ...(has(incoming.company) ? { company: incoming.company } : {}),
    ...(incoming.email.trim() ? { email: incoming.email } : {}),
    ...(incoming.phone.trim() ? { phone: incoming.phone } : {}),
    ...(incoming.city && has(incoming.city) ? { city: incoming.city } : {}),
    ...(has(incoming.event) ? { event: incoming.event } : {}),
    ...(incoming.interests.length > 0 && !(incoming.interests.length === 1 && incoming.interests[0] === 'IA') ? { interests: incoming.interests } : {}),
    ...(incoming.status !== 'Nuevo' ? { status: incoming.status } : {}),
    ...(incoming.priority ? { priority: true } : {}),
    ...(incoming.estimatedValue !== undefined ? { estimatedValue: incoming.estimatedValue } : {}),
    ...(incoming.notes ? { notes: incoming.notes } : {}),
    ...(incoming.lastContact && incoming.lastContact !== existing.lastContact ? { lastContact: incoming.lastContact } : {}),
    ...(incoming.nextContactDate ? { nextContactDate: incoming.nextContactDate } : {}),
    history: [
      ...existing.history,
      {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        date: leadTimestampNow().slice(0, 10),
        time: leadTimestampNow().slice(11, 16),
        author: existing.capturedBy,
        text: 'Datos actualizados desde importación de archivo.',
        type: 'note' as const
      }
    ]
  };
  return updated;
};

const MATCH_LABEL: Record<ImportedDuplicate['matchField'], string> = {
  email: 'Email',
  phone: 'Teléfono',
  nameCompany: 'Nombre + Empresa'
};

const ACCEPTED = '.csv,.txt,.xlsx,.xls';

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({
  isOpen,
  onClose,
  leads,
  currentUser,
  currentEvent,
  onImportLeads
}) => {
  const [phase, setPhase] = useState<'pick' | 'map' | 'done'>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<ImportSource | null>(null);
  const [mapping, setMapping] = useState<Record<string, ImportField | null>>({});
  const [updateExisting, setUpdateExisting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const context = { currentEventName: currentEvent.name, capturedBy: currentUser.name };

  const result = useMemo(() => {
    if (!source) return null;
    return buildImportResult(source, mapping, leads, context);
  }, [source, mapping, leads]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = async (chosen: File | null) => {
    if (!chosen) return;
    setPhase('pick');
    setError(null);
    setSavedCount(0);
    setUpdateExisting(false);
    try {
      const parsed = await parseSpreadsheetFile(chosen);
      if (parsed.headers.length === 0) {
        setError(chosen.name.includes('xls')
          ? 'El archivo Excel no tiene encabezados ni filas de datos.'
          : 'El archivo no tiene encabezados ni filas de datos.');
        setSource(null);
        setFile(null);
        return;
      }
      setFile(chosen);
      setSource(parsed);
      setMapping(autoMapColumns(parsed.headers));
      setPhase('map');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
      setSource(null);
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!result || result.newLeads.length === 0) return;
    if (!isOnline()) {
      setError('No hay conexión. La importación necesita sincronizar con Firestore.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const updatedLeads = updateExisting
        ? result.duplicates
            .map(d => {
              const row = source?.rows[d.rowIndex - 2];
              if (!row) return d.existingLead;
              const incoming = rowToLead(row, d.rowIndex - 2, mapping, source.headers, context);
              return incoming ? mergeLeadFromFile(d.existingLead, incoming) : d.existingLead;
            })
        : [];
      const toCreate = result.newLeads;
      await onImportLeads(toCreate, updatedLeads);
      setSavedCount(toCreate.length + updatedLeads.length);
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron importar los leads.');
    } finally {
      setImporting(false);
    }
  };

  const changeField = (header: string, field: string) => {
    setMapping(prev => ({ ...prev, [header]: field === 'ignore' ? null : (field as ImportField) }));
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 250);
  };

  const reset = () => {
    setPhase('pick');
    setFile(null);
    setSource(null);
    setMapping({});
    setUpdateExisting(false);
    setError(null);
    setImporting(false);
    setSavedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Importar Leads</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">

          {/* FASE: LISTO-VISUALIZACIÓN (confirmación global) */}
          {phase === 'done' && (
            <div className="text-center py-10 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-bold text-slate-900">
                {savedCount === 0 ? 'No se importaron leads' : `${savedCount} lead${savedCount === 1 ? '' : 's'} importado${savedCount === 1 ? '' : 's'} correctamente`}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {savedCount === 0
                  ? 'No había filas nuevas que importar (todas coincidían con leads existentes y no marcaste actualizar).'
                  : 'Ya aparecen en Personas y cuentan en los reportes.'}
              </p>
              <button
                onClick={handleClose}
                className="mt-3 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer active:scale-95"
              >
                Cerrar
              </button>
            </div>
          )}

          {phase !== 'done' && (
            <>
              {/* Dropzone */}
              <div>
                {!source ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors p-8 sm:p-10 flex flex-col items-center gap-3 cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-primary" />
                    <div className="text-sm font-bold text-slate-800">Toca para elegir un archivo</div>
                    <div className="text-[11px] text-slate-500 text-center max-w-xs">
                      Soporta .csv, .xlsx y .xls. Se detectan columnas automáticamente (Nombre, Empresa, Email, Teléfono, Intereses, Estado...).
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet className="w-6 h-6 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{file?.name}</p>
                        <p className="text-[10px] text-slate-500">{source.rows.length} filas detectadas</p>
                      </div>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Cambiar archivo
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  onChange={e => { handleFile(e.target.files?.[0] ?? null); e.target.value = ''; }}
                  className="hidden"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* FASE MAPA */}
              {source && (
                <>
                  {/* Mapeo de columnas */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-2">
                      Mapeo de columnas
                    </label>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {source.headers.map(header => (
                        <div key={header} className="flex items-center gap-2 text-xs">
                          <span className="w-36 sm:w-44 font-semibold text-slate-700 truncate text-right">{header}</span>
                          <span className="text-slate-300 shrink-0">→</span>
                          <select
                            value={mapping[header] ?? 'ignore'}
                            onChange={e => changeField(header, e.target.value)}
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium text-slate-800 focus:outline-primary"
                          >
                            <option value="ignore">— Omitir —</option>
                            {IMPORT_FIELDS.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resumen de resultado + preview */}
                  {result && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-green-50 border border-green-200 p-2.5">
                          <p className="text-lg font-extrabold text-green-700">{result.newLeads.length}</p>
                          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide">Nuevos</p>
                        </div>
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5">
                          <p className="text-lg font-extrabold text-amber-700">{result.duplicates.length}</p>
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Duplicados</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5">
                          <p className="text-lg font-extrabold text-slate-600">{result.invalid.length}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sin nombre</p>
                        </div>
                      </div>

                      {result.newLeads.length > 0 && (
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                            Vista previa (primeros {Math.min(5, result.newLeads.length)})
                          </label>
                          <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-left text-[11px]">
                              <thead className="bg-slate-50 text-slate-500 font-bold">
                                <tr>
                                  <th className="px-3 py-2">Nombre</th>
                                  <th className="px-3 py-2">Empresa</th>
                                  <th className="px-3 py-2">Email</th>
                                  <th className="px-3 py-2">Teléfono</th>
                                  <th className="px-3 py-2">Estado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {result.newLeads.slice(0, 5).map(l => (
                                  <tr key={`${l.id}`}>
                                    <td className="px-3 py-2 font-semibold text-slate-800">{l.name}</td>
                                    <td className="px-3 py-2 text-slate-600">{l.company}</td>
                                    <td className="px-3 py-2 text-slate-600">{l.email || '—'}</td>
                                    <td className="px-3 py-2 text-slate-600">{l.phone || '—'}</td>
                                    <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{l.status}</span></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {result && result.duplicates.length > 0 && (
                    <label className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={updateExisting}
                        onChange={e => setUpdateExisting(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-primary rounded cursor-pointer accent-primary"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800">Actualizar los {result.duplicates.length} duplicados</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Coinciden por {Array.from(new Set(result.duplicates.map(d => MATCH_LABEL[d.matchField]))).join(', ')}. Se rellenan los campos que vengan en el archivo.
                        </p>
                      </div>
                    </label>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {phase !== 'done' && result && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 sm:p-5 shrink-0">
            <button
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={importing || result.newLeads.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Importar {result.newLeads.length} lead{result.newLeads.length === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};