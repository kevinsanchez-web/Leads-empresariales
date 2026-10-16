import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Search,
  Sparkles,
  Loader2,
  Play,
  Square,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  Users,
  Zap,
} from 'lucide-react';
import { Lead, ContactEnrichment } from '../types';
import { enrichLead, isAiFailure } from '../services/aiService';
import { getCachedEnrichment, cacheEnrichment } from '../services/firestoreService';
import {
  segmentByCompany,
  buildQueue,
  FIELD_LABELS,
  FIELD_GAP_LABELS,
  FIELD_RESULT_LABELS,
  ENRICHMENT_WORKER_FIELDS,
  EnrichmentField,
  LeadGaps,
  CompanyGaps,
} from '../utils/enrichmentSegments';
import { cleanContact } from '../utils/contactInfo';

interface EnriquecimientoViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onApplyEnrichment: (
    leadId: string,
    patch: {
      linkedinUrl?: string | null;
      email?: string | null;
      phone?: string | null;
      enrichment?: ContactEnrichment;
    }
  ) => Promise<void>;
}

type RunState = 'idle' | 'running' | 'stopped' | 'done';

interface LeadRun {
  leadId: string;
  state: 'pending' | 'running' | 'written' | 'skipped' | 'error';
  message?: string;
  fromCache?: boolean;
}

const DEFAULT_PRIORITY: EnrichmentField[] = ['linkedin', 'email', 'phone'];

/** Porcentaje de datos de contacto presentes respecto al máximo (3 campos por lead). */
function companyProgress(c: CompanyGaps): number {
  const totalSlots = c.totalLeads * 3;
  const missing = Object.values(c.byField).reduce((s, a) => s + a.length, 0);
  const filled = Math.max(0, totalSlots - missing);
  return totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 100;
}

/** Primer lead incompleto de una empresa siguiendo el orden de prioridad elegido. */
function firstPendingLead(c: CompanyGaps, priority: EnrichmentField[]): Lead | undefined {
  for (const field of priority) {
    const lead = c.byField[field][0];
    if (lead) return lead;
  }
  return undefined;
}

export const EnriquecimientoView: React.FC<EnriquecimientoViewProps> = ({
  leads,
  onSelectLead,
  onApplyEnrichment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [priority, setPriority] = useState<EnrichmentField[]>(DEFAULT_PRIORITY);
  const [runState, setRunState] = useState<RunState>('idle');
  const [results, setResults] = useState<Record<string, LeadRun>>({});
  const [summary, setSummary] = useState<string>('');
  const [failedCount, setFailedCount] = useState(0);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // El botón Parar tiene que cortar el ciclo de tandas aunque la vista se desmonte o el
  // componente se recicle, así que la señal vive fuera del estado de React.
  const stopRef = useRef(false);
  const didInitSelection = useRef(false);

  const companies = useMemo(() => segmentByCompany(leads), [leads]);

  const incompleteCompanies = useMemo(
    () => companies.filter(c => c.totalIncomplete > 0),
    [companies]
  );

  const visibleCompanies = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return incompleteCompanies;
    return incompleteCompanies.filter(
      c =>
        c.name.toLowerCase().includes(term) ||
        c.completeLeads.some(l => l.name.toLowerCase().includes(term)) ||
        Object.values(c.byField)
          .flat()
          .some(l => l.name.toLowerCase().includes(term))
    );
  }, [incompleteCompanies, searchTerm]);

  const company = useMemo(
    () => incompleteCompanies.find(c => c.key === selectedCompany) || null,
    [incompleteCompanies, selectedCompany]
  );

  const queue: LeadGaps[] = useMemo(
    () => (company ? buildQueue(company, priority) : []),
    [company, priority]
  );

  const globalMetrics = useMemo(() => {
    const totalContacts = incompleteCompanies.reduce((s, c) => s + c.totalIncomplete, 0);
    const totalSlots = incompleteCompanies.reduce((s, c) => s + c.totalLeads * 3, 0);
    const missing = incompleteCompanies.reduce(
      (s, c) => s + Object.values(c.byField).reduce((x, a) => x + a.length, 0),
      0
    );
    const filled = Math.max(0, totalSlots - missing);
    return {
      contacts: totalContacts,
      pct: totalSlots > 0 ? Math.round((filled / totalSlots) * 100) : 100,
      companies: incompleteCompanies.length,
    };
  }, [incompleteCompanies]);

  // Al cargar se selecciona automáticamente la primera empresa con pendientes, para que el
  // panel derecho nunca arranque vacío. Solo ocurre una vez: si el usuario deselecciona
  // después, la elección se respeta.
  useEffect(() => {
    if (!didInitSelection.current && visibleCompanies.length > 0) {
      didInitSelection.current = true;
      setSelectedCompany(visibleCompanies[0].key);
    }
  }, [visibleCompanies]);

  const selectCompany = (key: string) => {
    setSelectedCompany(key);
    setResults({});
    setSummary('');
    setRunState('idle');
  };

  const moveField = (field: EnrichmentField, delta: number) => {
    setPriority(prev => {
      const index = prev.indexOf(field);
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const hasAnyValue = (enrichment: ContactEnrichment): boolean =>
    !!(enrichment.linkedinUrl || enrichment.email || enrichment.companyPhone);

  const applyEnrichment = async (
    lead: Lead,
    enrichment: ContactEnrichment
  ): Promise<{ written: EnrichmentField[]; message: string }> => {
    const written: EnrichmentField[] = [];
    if (enrichment.linkedinUrl && !cleanContact(lead.linkedinUrl)) written.push('linkedin');
    if (enrichment.email && !cleanContact(lead.email)) written.push('email');
    if (enrichment.companyPhone && !cleanContact(lead.phone)) written.push('phone');

    if (written.length === 0) return { written, message: '' };

    await onApplyEnrichment(lead.id, {
      linkedinUrl: enrichment.linkedinUrl,
      email: enrichment.email,
      phone: enrichment.companyPhone,
      enrichment,
    });

    const labels = written.map(field => {
      const key = ENRICHMENT_WORKER_FIELDS[field] as 'linkedinUrl' | 'email' | 'companyPhone';
      const label = FIELD_RESULT_LABELS[field];
      return enrichment.confidence?.[key] === 'unverified' ? `${label} (aparente)` : label;
    });

    return { written, message: `Completado: ${labels.join(', ')}` };
  };

  const runLead = async (item: LeadGaps): Promise<LeadRun> => {
    const { lead } = item;

    const cached = await getCachedEnrichment('lead', lead.id);
    if (cached) {
      const outcome = await applyEnrichment(lead, cached);
      if (outcome.written.length === 0) {
        return {
          leadId: lead.id,
          state: 'skipped',
          fromCache: true,
          message: hasAnyValue(cached)
            ? 'La caché traía datos que el lead ya tenía.'
            : cached.reason || 'Sin dato citado en la caché.',
        };
      }
      return { leadId: lead.id, state: 'written', fromCache: true, message: `${outcome.message} · caché` };
    }

    const data = await enrichLead({
      leadName: lead.name,
      companyName: lead.company,
      role: lead.role,
      city: lead.city,
      fields: item.missing.map(field => ENRICHMENT_WORKER_FIELDS[field]),
    });

    if (isAiFailure(data)) {
      return { leadId: lead.id, state: 'error', message: data.error };
    }
    if (!data.enrichment) {
      return { leadId: lead.id, state: 'error', message: 'La IA no devolvió datos de contacto.' };
    }

    const enrichment = data.enrichment;
    await cacheEnrichment('lead', lead.id, enrichment);

    const outcome = await applyEnrichment(lead, enrichment);
    if (outcome.written.length === 0) {
      return {
        leadId: lead.id,
        state: 'skipped',
        message: hasAnyValue(enrichment)
          ? 'La IA devolvió datos que el lead ya tenía.'
          : enrichment.reason || 'Sin datos citados que escribir.',
      };
    }
    return { leadId: lead.id, state: 'written', message: outcome.message };
  };

  const handleRun = async () => {
    if (!company || queue.length === 0) return;
    stopRef.current = false;
    setRunState('running');
    setSummary('');
    setResults({});

    const pending = queue.filter(q => q.missing.length > 0);
    let written = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i += 2) {
      if (stopRef.current) break;
      const batch = pending.slice(i, i + 2);

      setResults(prev => {
        const next = { ...prev };
        batch.forEach(item => {
          next[item.lead.id] = { leadId: item.lead.id, state: 'running' };
        });
        return next;
      });

      const settled = await Promise.allSettled(batch.map(runLead));

      setResults(prev => {
        const next = { ...prev };
        settled.forEach((entry, i) => {
          const leadId = batch[i].lead.id;
          next[leadId] =
            entry.status === 'fulfilled'
              ? entry.value
              : { leadId, state: 'error', message: 'Fallo inesperado al enriquecer.' };
        });
        return next;
      });

      settled.forEach(entry => {
        const run = entry.status === 'fulfilled' ? entry.value : null;
        if (!run) failed++;
        else if (run.state === 'written') written++;
        else if (run.state === 'skipped') skipped++;
        else if (run.state === 'error') failed++;
      });
    }

    const stopped = stopRef.current;
    setRunState(stopped ? 'stopped' : 'done');
    setFailedCount(failed);
    setSummary(
      `${written} actualizados · ${skipped} sin dato citado · ${failed} con error` +
        (stopped ? ' ·Detenido.' : '.')
    );
  };

  const handleStop = () => {
    stopRef.current = true;
    setRunState('stopped');
  };

  const isRunning = runState === 'running';

  return (
    <div className="flex flex-col w-full min-w-0 gap-3 animate-fade-in lg:flex-1 lg:min-h-0">

      <div className="shrink-0 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-accent-light text-accent flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">Enriquecimiento de Leads</h2>
            <p className="text-xs text-slate-500 truncate">
              Completa datos de contacto con fuentes públicas citadas por la IA
            </p>
          </div>
        </div>

        {incompleteCompanies.length > 0 && (
          <span className="text-[10px] font-bold text-accent bg-accent-light border border-accent-light px-2.5 py-1 rounded-full shrink-0">
            {incompleteCompanies.length} empresas por completar
          </span>
        )}
      </div>

      {!warningDismissed && (
        <div className="shrink-0 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 font-medium leading-snug">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-600" />
          <span className="flex-1">
            Los datos provienen de búsqueda web y son indicativos: verificá la identidad y el medio
            de contacto antes de escribir o llamar. Los marcados como «aparente» solo coinciden por
            dominio.
          </span>
          <button
            type="button"
            onClick={() => setWarningDismissed(true)}
            className="p-0.5 rounded hover:bg-amber-100 text-amber-500 hover:text-amber-700 transition-colors cursor-pointer shrink-0"
            aria-label="Ocultar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {incompleteCompanies.length === 0 ? (
        <div className="shrink-0 bg-white rounded-2xl p-8 text-center border border-slate-200/60 text-slate-400 font-medium text-xs">
          Todos los leads ya tienen LinkedIn, correo y teléfono. No hay nada que enriquecer.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:flex-1 lg:min-h-0">
          {/* Panel izquierdo: lista de empresas con su filtro */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Empresas por completar
              </span>
              {visibleCompanies.length > 0 && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {visibleCompanies.length}
                </span>
              )}
            </div>

            <div className="relative mb-2 shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar empresa o persona..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {visibleCompanies.length === 0 ? (
              <div className="text-center text-[11px] text-slate-400 py-8 px-2">
                Sin resultados para «{searchTerm}». Probá con otro término.
              </div>
            ) : (
              <div className="space-y-1 max-h-[420px] overflow-y-auto lg:max-h-none lg:flex-1 lg:min-h-0">
                {visibleCompanies.map(comp => {
                  const active = comp.key === selectedCompany;
                  const pct = companyProgress(comp);
                  const status = pct === 0 ? 'Pendiente' : 'En proceso';
                  const initials = comp.name
                    .split(' ')
                    .filter(Boolean)
                    .map(w => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || '?';

                  return (
                    <button
                      key={comp.key}
                      type="button"
                      onClick={() => selectCompany(active ? '' : comp.key)}
                      aria-pressed={active}
                      className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-start gap-2.5 border ${
                        active
                          ? 'bg-accent-light border-accent'
                          : 'bg-slate-50 border-slate-100 hover:bg-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                          active ? 'bg-accent text-white' : 'bg-white text-accent border border-slate-200'
                        }`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-xs truncate">{comp.name}</span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border ${
                              status === 'Pendiente'
                                ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                                : 'bg-accent-light text-accent border-accent-light'
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {comp.totalIncomplete} de {comp.totalLeads} por completar · {pct}%
                        </div>
                        <div className="mt-1.5 h-1 rounded-full bg-slate-200/70 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-accent transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Panel derecho: segmentación o resumen global */}
          <div className="lg:col-span-2 min-w-0 flex flex-col lg:min-h-0">
            {!company ? (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-xs flex flex-col gap-3 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-accent-light text-accent flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 leading-tight">Resumen de enriquecimiento</h3>
                    <p className="text-[11px] text-slate-500">
                      Elegí una empresa de la lista para trabajar sus contactos.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5" />
                      Contactos a enriquecer
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{globalMetrics.contacts}</div>
                    <div className="text-[10px] text-slate-500">
                      en {globalMetrics.companies} {globalMetrics.companies === 1 ? 'empresa' : 'empresas'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      Datos completados por la IA
                    </div>
                    <div className="text-2xl font-black text-accent mt-1">{globalMetrics.pct}%</div>
                    <div className="mt-1.5 h-1 rounded-full bg-slate-200/70 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-300"
                        style={{ width: `${globalMetrics.pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Building2 className="w-3.5 h-3.5" />
                      Empresas pendientes
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-1">{globalMetrics.companies}</div>
                    <div className="text-[10px] text-slate-500">con leads incompletos</div>
                  </div>
                </div>

                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Accesos rápidos
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const top = incompleteCompanies[0];
                        if (top) selectCompany(top.key);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-light text-accent border border-accent-light hover:opacity-90 text-xs font-bold transition-opacity cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Empresa con más pendientes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const lead = firstPendingLead(incompleteCompanies[0], priority);
                        if (lead) onSelectLead(lead);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Primer lead por completar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-accent shrink-0" />
                      <h3 className="font-extrabold text-sm text-slate-900 truncate">{company.name}</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      {queue.length} a revisar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['linkedin', 'email', 'phone'] as EnrichmentField[]).map(field => {
                      const count = company.byField[field].length;
                      return (
                        <div
                          key={field}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70"
                        >
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Sin {FIELD_GAP_LABELS[field]}
                          </div>
                          <div className="text-xl font-black text-slate-900">{count}</div>
                          {count > 0 && (
                            <div className="text-[10px] text-slate-500">
                              {count}{' '}
                              {count === 1 ? 'contacto' : 'contactos'}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {company.completeLeads.length > 0 && (
                    <p className="text-[10px] text-slate-500 leading-snug">
                      {company.completeLeads.length}{' '}
                      {company.completeLeads.length === 1 ? 'contacto ya tiene' : 'contactos ya tienen'}{' '}
                      LinkedIn, correo y teléfono, y quedan fuera de la cola.
                    </p>
                  )}

                  {/* Orden de prioridad */}
                  <div className="pt-2.5 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Prioridad de búsqueda
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {priority.map((field, index) => (
                        <div
                          key={field}
                          className="flex items-center gap-0.5 pl-2 pr-1 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700"
                        >
                          <span className="text-slate-400">{index + 1}.</span>
                          <span>{FIELD_LABELS[field]}</span>
                          <button
                            type="button"
                            onClick={() => moveField(field, -1)}
                            disabled={index === 0 || isRunning}
                            className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            aria-label={`Subir ${FIELD_LABELS[field]}`}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveField(field, 1)}
                            disabled={index === priority.length - 1 || isRunning}
                            className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                            aria-label={`Bajar ${FIELD_LABELS[field]}`}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug mt-1">
                      Cada lead se busca solo por los campos que le faltan. El orden define en qué
                      orden se recorre la cola.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRun}
                      disabled={isRunning || queue.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Buscar complemento empresa</span>
                        </>
                      )}
                    </button>

                    {isRunning && (
                      <button
                        type="button"
                        onClick={handleStop}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Square className="w-3 h-3 fill-rose-600" />
                        <span>Parar</span>
                      </button>
                    )}

                    <span className="text-[10px] text-slate-400 ml-auto">
                      {queue.length > 0 && !isRunning
                        ? `${queue.length} contactos en la cola`
                        : ''}
                    </span>
                  </div>

                  {summary && (
                    <div
                      role="status"
                      className={`flex items-start gap-2 rounded-xl border px-2.5 py-2 text-[11px] font-medium leading-snug ${
                        failedCount > 0
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {failedCount > 0 ? (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-600" />
                      ) : (
                        <Check className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-600" />
                      )}
                      <span>{summary}</span>
                    </div>
                  )}
                </div>

                {/* Lista segmentada */}
                <div className="space-y-2.5">
                  {(Object.keys(FIELD_LABELS) as EnrichmentField[]).map(field => {
                    const items = company.byField[field];
                    if (items.length === 0) return null;
                    return (
                      <div
                        key={field}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-xs"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Sin {FIELD_GAP_LABELS[field]}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {items.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {items.map(lead => (
                            <LeadRow
                              key={lead.id}
                              lead={lead}
                              run={results[lead.id]}
                              onSelectLead={onSelectLead}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const LeadRow: React.FC<{
  lead: Lead;
  run?: LeadRun;
  onSelectLead: (lead: Lead) => void;
}> = ({ lead, run, onSelectLead }) => {
  return (
    <div className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => onSelectLead(lead)}
        className="min-w-0 flex-1 text-left cursor-pointer"
      >
        <div className="font-bold text-slate-900 text-xs truncate">{lead.name}</div>
        <div className="text-[10px] text-slate-500 truncate">{lead.role}</div>
      </button>

      {lead.linkedinUrl && (
        <a
          href={lead.linkedinUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[9px] text-primary bg-white px-1.5 py-0.5 rounded border border-primary/20 inline-flex items-center gap-0.5 shrink-0"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          <span>Perfil</span>
        </a>
      )}

      <div className="shrink-0 w-5 flex justify-center">
        {!run && <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
        {run?.state === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />}
        {run?.state === 'written' && (
          <span title={run.fromCache ? `${run.message} (caché)` : run.message}>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          </span>
        )}
        {run?.state === 'skipped' && (
          <span title={run.message}>
            <X className="w-3.5 h-3.5 text-slate-400" />
          </span>
        )}
        {run?.state === 'error' && (
          <span title={run.message}>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          </span>
        )}
      </div>
    </div>
  );
};