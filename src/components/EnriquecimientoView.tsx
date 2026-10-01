import React, { useMemo, useRef, useState } from 'react';
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
  ChevronRight,
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

  // El botón Parar tiene que cortar el ciclo de tandas aunque la vista se desmonte o el
  // componente se recicle, así que la señal vive fuera del estado de React.
  const stopRef = useRef(false);

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
    // Solo cuenta lo que de verdad se va a escribir: si el lead ya tenía el dato, la guarda no
    // destructiva de App lo descarta y no debe aparecer como "Completado".
    const written: EnrichmentField[] = [];
    if (enrichment.linkedinUrl && !cleanContact(lead.linkedinUrl)) written.push('linkedin');
    if (enrichment.email && !cleanContact(lead.email)) written.push('email');
    if (enrichment.companyPhone && !cleanContact(lead.phone)) written.push('phone');

    // Sin ningún campo para escribir no se llama al merge: el lead queda exactamente como está.
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
      // Solo los campos que le faltan a este lead: el Worker arma el prompt con ellos.
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

    // De a 2 en vuelo: cada tanda espera a que terminen sus dos leads antes de pedir la
    // siguiente, así nunca hay más de dos búsquedas simultáneas contra la cuota de Gemini.
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
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">Enriquecimiento de Leads</h2>
            <p className="text-xs text-slate-500">
              Completa datos de contacto con fuentes públicas citadas por la IA
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar empresa o persona..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 font-medium leading-snug">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-600" />
        <span>
          Los datos provienen de búsqueda web y son indicativos: verificá la identidad y el medio
          de contacto antes de escribir o llamar. Los marcados como «aparente» solo coinciden por
          dominio.
        </span>
      </div>

      {incompleteCompanies.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/60 text-slate-400 font-medium text-xs">
          Todos los leads ya tienen LinkedIn, correo y teléfono. No hay nada que enriquecer.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Empresas con leads incompletos */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Empresas por completar
            </span>
            <div className="space-y-1 max-h-[420px] overflow-y-auto">
              {visibleCompanies.map(comp => {
                const active = comp.key === selectedCompany;
                return (
                  <button
                    key={comp.key}
                    type="button"
                    onClick={() => {
                      setSelectedCompany(active ? '' : comp.key);
                      setResults({});
                      setSummary('');
                      setRunState('idle');
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between gap-2 border ${
                      active
                        ? 'bg-violet-50 border-violet-200'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">{comp.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {comp.totalIncomplete} de {comp.totalLeads} por completar
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-violet-500' : 'text-slate-400'}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Segmentación por campo */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {!company ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/60 text-slate-400 font-medium text-xs">
                Elige una empresa para ver qué campos le faltan a sus contactos.
              </div>
            ) : (
              <>
                <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-violet-600 shrink-0" />
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
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
              </>
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
          className="text-[9px] text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200 inline-flex items-center gap-0.5 shrink-0"
        >
          <ExternalLink className="w-2.5 h-2.5" />
          <span>Perfil</span>
        </a>
      )}

      <div className="shrink-0 w-5 flex justify-center">
        {!run && <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
        {run?.state === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />}
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
