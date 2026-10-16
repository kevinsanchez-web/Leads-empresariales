import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Star,
  Search,
  ChevronRight,
  Sparkles,
  Globe,
  Loader2,
  Filter,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  Users
} from 'lucide-react';
import { Lead, CompanyResearchInfo } from '../types';
import { researchCompany, isAiFailure, AI_SIMULATED_WARNING } from '../services/aiService';
import { cleanCompanyName, companyKey, prioritizeSources } from '../utils/company';
import { dedupeContacts, DedupedContact } from '../utils/dedupeContacts';
import { RoundedSelect } from './RoundedSelect';
import { AiNotice } from './AiNotice';

interface EmpresasViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (updated: Lead) => void;
  searchQuery?: string;
}

type ViewMode = 'grid' | 'table';
type SortBy = 'contacts' | 'pipeline' | 'priority';

export const EmpresasView: React.FC<EmpresasViewProps> = ({ leads, onSelectLead, onUpdateLead, searchQuery }) => {
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('ALL');
  const [researchingCompanies, setResearchingCompanies] = useState<{ [key: string]: boolean }>({});
  const [localCompanyInfo, setLocalCompanyInfo] = useState<{ [key: string]: CompanyResearchInfo }>({});
  const [researchErrors, setResearchErrors] = useState<{ [key: string]: { message: string; simulated: boolean } }>({});
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('contacts');
  const [expandedAi, setExpandedAi] = useState<{ [key: string]: boolean }>({});
  const [openContactsDropdown, setOpenContactsDropdown] = useState<string | null>(null);
  const [contactsFilter, setContactsFilter] = useState('');
  const [leadRecordsMenu, setLeadRecordsMenu] = useState<{
    rect: DOMRect;
    contactName: string;
    leads: Lead[];
  } | null>(null);

  const toggleContactsDropdown = (companyName: string) => {
    setOpenContactsDropdown(prev => (prev === companyName ? null : companyName));
    setContactsFilter('');
  };

  // El menú de registros es flotante (portal): cerrarlo con Escape, scroll o
  // resize, porque no recalcula su posición anclada al disparador.
  useEffect(() => {
    if (!leadRecordsMenu) return;
    const close = () => setLeadRecordsMenu(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [leadRecordsMenu]);

  // Clic en un contacto: con un único registro abre su ficha directamente;
  // con varios, muestra un menú flotante para elegir qué registro abrir.
  const handleContactClick = (
    e: React.MouseEvent<HTMLElement>,
    comp: { leads: Lead[] },
    contact: DedupedContact
  ) => {
    setOpenContactsDropdown(null);
    setContactsFilter('');
    const ownLeads = comp.leads.filter(l => contact.leadIds.includes(l.id));
    if (ownLeads.length <= 1) {
      onSelectLead(ownLeads[0] || comp.leads[0]);
      return;
    }
    setLeadRecordsMenu({
      rect: e.currentTarget.getBoundingClientRect(),
      contactName: contact.name,
      leads: ownLeads
    });
  };

  // Group leads by company
  const companyMap: { [key: string]: Lead[] } = {};
  leads.forEach(l => {
    const key = companyKey(l.company);
    if (!companyMap[key]) companyMap[key] = [];
    companyMap[key].push(l);
  });

  // Generate full list of unique companies
  const allCompanies = Object.entries(companyMap)
    .map(([, companyLeads]) => {
      const name = cleanCompanyName(companyLeads[0].company);
      const totalPipeline = companyLeads.reduce((acc, curr) => acc + (curr.estimatedValue || 35000), 0);
      const hasPriority = companyLeads.some(l => l.priority);
      const allInterests = Array.from(new Set(companyLeads.flatMap(l => l.interests || [])));
      const existingInfo = companyLeads.find(l => l.companyInfo)?.companyInfo || localCompanyInfo[name];
      const deduped = dedupeContacts(companyLeads);

      return {
        name,
        leads: companyLeads,
        dedupedContacts: deduped,
        leadCount: companyLeads.length,
        contactCount: deduped.length,
        totalPipeline,
        hasPriority,
        allInterests,
        companyInfo: existingInfo,
        industry: existingInfo?.industry
      };
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        if (b.hasPriority !== a.hasPriority) return b.hasPriority ? 1 : -1;
      }
      if (sortBy === 'pipeline') {
        if (b.totalPipeline !== a.totalPipeline) return b.totalPipeline - a.totalPipeline;
      }
      if (b.contactCount !== a.contactCount) return b.contactCount - a.contactCount;
      if (b.leadCount !== a.leadCount) return b.leadCount - a.leadCount;
      return a.name.localeCompare(b.name);
    });

  const companyFilterOptions = [
    { value: 'ALL', label: `Todas las empresas (${allCompanies.length})` },
    ...allCompanies.map(c => ({
      value: c.name,
      label: `${c.name} (${c.contactCount} contacto${c.contactCount > 1 ? 's' : ''})`
    }))
  ];

  // Búsqueda unificada: empresa (nombre, sector, investigación IA, intereses)
  // y lead (nombre, cargo, correo, ciudad).
  const getCompanyText = (c: typeof allCompanies[number]) => {
    const info = c.companyInfo;
    return [
      c.name,
      c.industry || '',
      info?.summary || '',
      info?.targetMarket || '',
      ...(info?.productsAndServices || []),
      ...(info?.keyHighlights || []),
      ...c.allInterests
    ]
      .join(' ')
      .toLowerCase();
  };

  const getLeadText = (l: Lead) =>
    `${l.name} ${l.role} ${l.email} ${l.city || ''}`.toLowerCase();

  const term = (searchQuery || '').toLowerCase().trim();

  // Filtrar empresas según el dropdown y la búsqueda
  const companiesList = allCompanies.filter(c => {
    const matchesDropdown = selectedCompanyFilter === 'ALL' || c.name === selectedCompanyFilter;
    if (!term) return matchesDropdown;
    return matchesDropdown && (getCompanyText(c).includes(term) || c.leads.some(l => getLeadText(l).includes(term)));
  });

  // Una fila por cliente (contacto deduplicado) de la lista filtrada. Si el
  // término coincide con la empresa se muestran todos sus clientes; si solo
  // coincide con un contacto, solo las filas de ese contacto.
  const clientRows = companiesList.flatMap(comp => {
    const companyMatches = !term || getCompanyText(comp).includes(term);
    return comp.dedupedContacts
      .filter(contact =>
        companyMatches ||
        comp.leads.some(l => contact.leadIds.includes(l.id) && getLeadText(l).includes(term))
      )
      .map(contact => {
        const lead = comp.leads.find(l => contact.leadIds.includes(l.id)) || comp.leads[0];
        const pipeline = comp.leads
          .filter(l => contact.leadIds.includes(l.id))
          .reduce((acc, l) => acc + (l.estimatedValue || 35000), 0);
        return { comp, contact, lead, pipeline };
      });
  });

  const handleResearchCompany = async (companyName: string, companyLeads: Lead[]) => {
    setResearchingCompanies(prev => ({ ...prev, [companyName]: true }));
    setResearchErrors(prev => {
      const next = { ...prev };
      delete next[companyName];
      return next;
    });

    try {
      const firstLead = companyLeads[0];
      const data = await researchCompany({
        companyName,
        leadName: firstLead?.name,
        role: firstLead?.role
      });

      if (isAiFailure(data)) {
        setResearchErrors(prev => ({ ...prev, [companyName]: { message: data.error, simulated: data.simulated } }));
        return;
      }
      if (!data.companyInfo) {
        setResearchErrors(prev => ({
          ...prev,
          [companyName]: { message: 'La IA no devolvió información de la empresa.', simulated: data.simulated }
        }));
        return;
      }

      const info = data.companyInfo;

      if (data.simulated) {
        setLocalCompanyInfo(prev => ({ ...prev, [companyName]: info }));
        setResearchErrors(prev => ({ ...prev, [companyName]: { message: AI_SIMULATED_WARNING, simulated: true } }));
        return;
      }

      setLocalCompanyInfo(prev => ({ ...prev, [companyName]: info }));

      if (onUpdateLead) {
        companyLeads.forEach(l => {
          onUpdateLead({ ...l, companyInfo: info });
        });
      }

      if (data.usedSearch === false) {
        setResearchErrors(prev => ({
          ...prev,
          [companyName]: {
            message: 'La IA respondió sin buscar en la web: este perfil no está verificado.',
            simulated: true
          }
        }));
      }
    } catch {
      setResearchErrors(prev => ({
        ...prev,
        [companyName]: { message: 'No se pudo contactar el asistente de IA.', simulated: false }
      }));
    } finally {
      setResearchingCompanies(prev => ({ ...prev, [companyName]: false }));
    }
  };

  // Posición del menú flotante de registros: junto al disparador y con
  // flip vertical si no cabe hacia abajo.
  const recordsMenuStyle: React.CSSProperties | null = leadRecordsMenu
    ? (() => {
        const rect = leadRecordsMenu.rect;
        const menuWidth = 260;
        const menuMaxHeight = 224;
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
        const fitsBelow = rect.bottom + menuMaxHeight + 8 < window.innerHeight;
        return fitsBelow
          ? { top: rect.bottom + 6, left }
          : { bottom: window.innerHeight - rect.top + 6, left };
      })()
    : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header con Filtros Integrados */}
      <div className="flex flex-col gap-3 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 leading-tight">Directorio de Empresas & Grounding IA</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                  {viewMode === 'grid'
                    ? `${companiesList.length} de ${allCompanies.length} empresas`
                    : `${clientRows.length} cliente${clientRows.length !== 1 ? 's' : ''} en ${companiesList.length} empresa${companiesList.length !== 1 ? 's' : ''}`}
                </span>
              </div>
              <p className="text-xs text-slate-500">Investigación profunda de empresas en tiempo real mediante Google Search</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                aria-label="Vista de tarjetas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tarjetas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                aria-label="Vista de tabla"
              >
                <List className="w-3.5 h-3.5" />
                <span>Tabla</span>
              </button>
            </div>
            <RoundedSelect
              value={sortBy}
              onChange={v => setSortBy(v as SortBy)}
              options={[
                { value: 'contacts', label: 'Ordenar por contactos' },
                { value: 'pipeline', label: 'Ordenar por pipeline' },
                { value: 'priority', label: 'Prioritarios primero' }
              ]}
              ariaLabel="Ordenar empresas"
              buttonClassName="text-[11px]"
            />
          </div>
        </div>

        {/* Barra de filtrado unificada */}
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
          <RoundedSelect
            className="w-full sm:w-56"
            value={selectedCompanyFilter}
            onChange={setSelectedCompanyFilter}
            options={companyFilterOptions}
            ariaLabel="Filtrar por empresa"
            icon={<Filter className="w-3.5 h-3.5" />}
            searchable
            buttonClassName="text-xs"
          />

          <span className="text-[10px] text-slate-400 hidden sm:inline">
            Se filtra con la barra de búsqueda de la cabecera
          </span>
        </div>
      </div>

      {viewMode === 'grid' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {companiesList.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-8 text-center border border-slate-200/60 text-slate-400 font-medium text-xs">
            No se encontraron empresas con los criterios seleccionados.
          </div>
        ) : (
          companiesList.map(comp => {
            const isLoading = researchingCompanies[comp.name];
            const aiExpanded = !!expandedAi[comp.name];
            const sources = comp.companyInfo?.sources ? prioritizeSources(comp.companyInfo.sources, comp.name) : [];
            const canExpandAi = (comp.companyInfo?.summary?.length || 0) > 120;
            const showAiExtras = aiExpanded || !canExpandAi;
            const contactsTerm = contactsFilter.toLowerCase().trim();
            const visibleContacts = contactsTerm
              ? comp.dedupedContacts.filter(c =>
                  `${c.name} ${c.mainRole} ${c.roles.join(' ')} ${c.email || ''}`.toLowerCase().includes(contactsTerm)
                )
              : comp.dedupedContacts;
            return (
              <div
                key={comp.name}
                className="bg-white p-4 rounded-2xl border border-slate-200/70 hover:border-slate-300 shadow-xs transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate" title={comp.name}>
                        {comp.name}
                      </h3>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate flex-wrap">
                        <span>{comp.contactCount} contacto{comp.contactCount !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{comp.leadCount} registro{comp.leadCount !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-600">${(comp.totalPipeline / 1000).toFixed(0)}k USD pipeline</span>
                      </div>
                    </div>
                    {comp.hasPriority && (
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500 shrink-0" />
                    )}
                  </div>

                  {/* AI Google Search Grounding Box */}
                  <div className="my-2.5 p-3 rounded-xl bg-linear-to-br from-primary/10 to-slate-50 border border-primary/10 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary fill-primary/20" />
                        IA Grounding (Google Search)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResearchCompany(comp.name, comp.leads)}
                        disabled={isLoading}
                        className="text-[10px] font-bold text-primary hover:text-primary underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            <span>Investigando...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3 h-3 text-primary" />
                            <span>{comp.companyInfo ? 'Actualizar' : 'Investigar'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isLoading && (
                      <div className="flex items-center gap-2 text-slate-600 py-1 text-[11px]">
                        <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                        <span>Buscando qué hace {comp.name} en Google...</span>
                      </div>
                    )}

                    {researchErrors[comp.name] && !isLoading && (
                      <AiNotice
                        message={researchErrors[comp.name].message}
                        tone={researchErrors[comp.name].simulated ? 'simulated' : 'error'}
                      />
                    )}

                    {comp.companyInfo && !isLoading && (
                      <div className="space-y-1.5 text-slate-700 text-[11px]">
                        <p className={`${aiExpanded ? '' : 'line-clamp-2'} leading-snug`}>
                          <strong className="text-slate-900">¿Qué hace?: </strong>
                          {comp.companyInfo.summary}
                        </p>
                        {comp.companyInfo.summary && comp.companyInfo.summary.length > 120 && (
                          <button
                            type="button"
                            onClick={() => setExpandedAi(prev => ({ ...prev, [comp.name]: !aiExpanded }))}
                            className="text-[10px] font-bold text-primary hover:text-primary flex items-center gap-0.5"
                          >
                            {aiExpanded ? (
                              <>
                                <span>Ver menos</span>
                                <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <span>Ver más</span>
                                <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}
                        {comp.companyInfo.industry && (
                          <div className="text-[10px]">
                            <strong className="text-slate-900">Sector: </strong>
                            <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                              {comp.companyInfo.industry}
                            </span>
                          </div>
                        )}
                        {showAiExtras && sources.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1 border-t border-primary/10">
                            {sources.slice(0, 3).map((src, idx) => (
                              <a
                                key={idx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[9px] text-primary bg-white px-1.5 py-0.5 rounded border border-slate-200 hover:underline max-w-35"
                              >
                                <Globe className="w-2.5 h-2.5 text-primary shrink-0" />
                                <span className="truncate" title={src.title}>{src.title}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!comp.companyInfo && !isLoading && (
                      <p className="text-[10px] text-slate-500 italic">
                        Haz clic en "Investigar" para consultar qué hace esta empresa con datos reales de Google Search.
                      </p>
                    )}
                  </div>

                  {/* Lista de Contactos: desplegable con todos los usuarios de la empresa */}
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Contactos en la empresa:
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                        {comp.dedupedContacts.length} en total
                      </span>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => toggleContactsDropdown(comp.name)}
                        aria-expanded={openContactsDropdown === comp.name}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">Ver contactos ({comp.dedupedContacts.length})</span>
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${openContactsDropdown === comp.name ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {openContactsDropdown === comp.name && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenContactsDropdown(null)}
                            aria-hidden="true"
                          />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white border border-slate-200 rounded-2xl shadow-lg p-1.5 space-y-1 max-h-64 overflow-y-auto animate-fade-in">
                            {comp.dedupedContacts.length > 8 && (
                              <div className="relative sticky top-0 bg-white pb-1">
                                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                  type="text"
                                  value={contactsFilter}
                                  onChange={e => setContactsFilter(e.target.value)}
                                  placeholder="Buscar contacto..."
                                  autoFocus
                                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                              </div>
                            )}

                            {visibleContacts.length === 0 && (
                              <p className="text-[10px] text-slate-400 text-center py-2 font-medium">
                                Sin contactos que coincidan.
                              </p>
                            )}

                            {visibleContacts.map(contact => {
                              const isPriority = contact.priority || comp.leads.some(l => contact.leadIds.includes(l.id) && l.priority);
                              return (
                                <button
                                  key={contact.key}
                                  onClick={e => handleContactClick(e, comp, contact)}
                                  className="w-full text-left px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs cursor-pointer border border-slate-100"
                                >
                                  <div className="min-w-0 pr-1">
                                    <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1">
                                      <span className="truncate">{contact.name}</span>
                                      {isPriority && <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1 flex-wrap">
                                      <span className="truncate" title={contact.roles.join(' • ')}>{contact.mainRole || 'Sin cargo'}</span>
                                      {contact.roles.length > 1 && (
                                        <span
                                          className="text-[9px] px-1 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full shrink-0 font-bold"
                                          title={contact.roles.join(' • ')}
                                        >
                                          {contact.roles.length} cargos
                                        </span>
                                      )}
                                      {contact.count > 1 && <span className="text-[9px] px-1 py-0.5 bg-white border border-slate-200 rounded-full">{contact.count} registros</span>}
                                    </div>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Etiquetas de Intereses */}
                {comp.allInterests.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    {comp.allInterests.map((interest, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold">
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      )}

      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
          {clientRows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-medium text-xs">
              No se encontraron clientes con los criterios seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-220 text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/70 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3 font-bold">Cliente</th>
                    <th className="px-4 py-3 font-bold">Cargo</th>
                    <th className="px-4 py-3 font-bold">Empresa</th>
                    <th className="px-4 py-3 font-bold">Sector</th>
                    <th className="px-4 py-3 font-bold text-center">Registros</th>
                    <th className="px-4 py-3 font-bold text-right">Pipeline</th>
                    <th className="px-4 py-3 font-bold">Estado IA</th>
                  </tr>
                </thead>
                <tbody>
                  {clientRows.map(({ comp, contact, lead, pipeline }) => {
                    const isLoading = researchingCompanies[comp.name];
                    const err = researchErrors[comp.name];
                    const isPriority = contact.priority || !!lead?.priority;
                    return (
                      <tr
                        key={`${comp.name}::${contact.key}`}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-4 py-2.5 max-w-55">
                          <button
                            type="button"
                            onClick={e => handleContactClick(e, comp, contact)}
                            className="font-bold text-slate-900 hover:text-primary hover:underline cursor-pointer flex items-center gap-1 max-w-55 text-left"
                            title={
                              contact.count > 1
                                ? `Elegir registro de ${contact.name} (${contact.count})`
                                : `Abrir ficha de ${contact.name}`
                            }
                          >
                            <span className="truncate">{contact.name}</span>
                            {isPriority && <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />}
                          </button>
                          {contact.count > 1 && (
                            <span className="mt-0.5 inline-block text-[9px] px-1 py-0.5 bg-white border border-slate-200 rounded-full text-slate-500">
                              {contact.count} registros
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 max-w-45">
                          <div className="min-w-0">
                            <span className="text-slate-700 truncate block" title={contact.roles.join(' • ')}>
                              {contact.mainRole || <span className="text-slate-300">—</span>}
                            </span>
                            {contact.roles.length > 1 && (
                              <span
                                className="text-[9px] px-1 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold"
                                title={contact.roles.join(' • ')}
                              >
                                {contact.roles.length} cargos
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 max-w-45 text-slate-600">
                          <span className="truncate block" title={comp.name}>{comp.name}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {comp.industry ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold truncate max-w-37.5">
                              {comp.industry}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-800">{contact.count}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-600 whitespace-nowrap">
                          ${(pipeline / 1000).toFixed(0)}k USD
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold whitespace-nowrap ${
                                isLoading
                                  ? 'text-primary'
                                  : err
                                    ? (err.simulated ? 'text-amber-600' : 'text-rose-600')
                                    : comp.companyInfo
                                      ? 'text-emerald-600'
                                      : 'text-slate-400'
                              }`}
                              title={err ? err.message : undefined}
                            >
                              {isLoading
                                ? 'Investigando…'
                                : err
                                  ? (err.simulated ? 'Datos simulados' : 'Error de IA')
                                  : comp.companyInfo
                                    ? 'Investigado'
                                    : 'Pendiente'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleResearchCompany(comp.name, comp.leads)}
                              disabled={isLoading}
                              className="text-[10px] font-bold text-primary hover:text-primary underline cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                              ) : (
                                <Search className="w-3 h-3" />
                              )}
                              {comp.companyInfo ? 'Actualizar' : 'Investigar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Menú flotante: elegir qué registro abrir en contactos multi-registro */}
      {leadRecordsMenu && recordsMenuStyle &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setLeadRecordsMenu(null)}
              aria-hidden="true"
            />
            <div
              role="menu"
              aria-label={`Registros de ${leadRecordsMenu.contactName}`}
              style={recordsMenuStyle}
              className="fixed z-[61] w-64 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 space-y-0.5 animate-fade-in"
            >
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                Registros de {leadRecordsMenu.contactName}
              </p>
              {leadRecordsMenu.leads.map(l => (
                <button
                  key={l.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setLeadRecordsMenu(null);
                    onSelectLead(l);
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1">
                      <span className="truncate">{l.role || 'Sin cargo'}</span>
                      {l.priority && (
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate" title={l.email}>
                      {l.status}
                      {l.email ? ` • ${l.email}` : ''}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 shrink-0">
                    ${((l.estimatedValue || 35000) / 1000).toFixed(0)}k
                  </span>
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  );
};