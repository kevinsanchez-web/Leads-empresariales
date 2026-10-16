import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Star, 
  Sparkles, 
  QrCode, 
  Bot, 
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  List,
  Building2,
  Calendar,
  Clock,
  SlidersHorizontal,
  Columns,
  CheckCircle2,
  ChevronDown,
  FileText,
  Upload
} from 'lucide-react';
import { Lead, LeadStatus, UserRep, EventOption } from '../types';
import { compareLeadTimestamps, formatLeadTimestamp } from '../utils/date';
import { exportLeadsToCsv, exportLeadsToXlsx } from '../utils/spreadsheet';
import { DEFAULT_ESTIMATED_VALUE } from '../utils/format';
import { ImportLeadsModal } from './ImportLeadsModal';

interface LeadsTableProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (lead: Lead) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage?: number;
  onUpdateLead?: (lead: Lead) => void;
  currentUser?: UserRep;
  currentEvent?: EventOption;
  onImportLeads?: (newLeads: Lead[], updatedLeads: Lead[]) => Promise<void>;
}

type SortField = 'name' | 'company' | 'status' | 'lastContact' | 'estimatedValue' | 'priority';

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  selectedLeadId,
  onSelectLead,
  currentPage,
  setCurrentPage,
  itemsPerPage = 8,
  onUpdateLead,
  currentUser,
  currentEvent,
  onImportLeads
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortField, setSortField] = useState<SortField>('lastContact');
  const [sortAsc, setSortAsc] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const canImport = Boolean(currentUser && currentEvent && onImportLeads);

  // Sort Leads
  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'estimatedValue') {
        valA = a.estimatedValue ?? DEFAULT_ESTIMATED_VALUE;
        valB = b.estimatedValue ?? DEFAULT_ESTIMATED_VALUE;
      } else if (sortField === 'priority') {
        valA = a.priority ? 1 : 0;
        valB = b.priority ? 1 : 0;
      } else if (sortField === 'lastContact') {
        return sortAsc
          ? compareLeadTimestamps(valA, valB)
          : compareLeadTimestamps(valB, valA);
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [leads, sortField, sortAsc]);

  const totalItems = sortedLeads.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeads = sortedLeads.slice(startIndex, startIndex + itemsPerPage);

  const totalPipelineValue = useMemo(() => {
    return leads.reduce((acc, curr) => acc + (curr.estimatedValue ?? DEFAULT_ESTIMATED_VALUE), 0);
  }, [leads]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Exporta en el mismo orden que muestra la tabla (`sortedLeads`) y con fecha
  // local (no UTC, para no caer en el día anterior en zonas nocturnas de GMT-5).
  const handleExportCsv = () => {
    setExportMenuOpen(false);
    exportLeadsToCsv(sortedLeads, `Leads_Export_${new Date().toLocaleDateString('en-CA')}.csv`);
  };

  const handleExportXlsx = () => {
    setExportMenuOpen(false);
    exportLeadsToXlsx(sortedLeads, `Leads_Export_${new Date().toLocaleDateString('en-CA')}.xlsx`);
  };

  const handleQuickPriority = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    if (!onUpdateLead) return;
    onUpdateLead({
      ...lead,
      priority: !lead.priority
    });
  };

  const getInitials = (name: string) => {
    const parts = (name || '').trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name || 'LE').slice(0, 2).toUpperCase();
  };

  // Apple-style soft avatar colors based on name hash
  const getAvatarGradient = (name: string) => {
    const colors = [
    'bg-linear-to-br from-blue-500 to-indigo-600 text-white',
    'bg-linear-to-br from-purple-500 to-violet-600 text-white',
    'bg-linear-to-br from-teal-500 to-emerald-600 text-white',
    'bg-linear-to-br from-rose-500 to-pink-600 text-white',
    'bg-linear-to-br from-amber-500 to-orange-600 text-white'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const getStatusBadge = (status: LeadStatus) => {
    switch (status) {
      case 'Ganado':
        return {
          pill: 'bg-[#34C759]/10 text-[#28A745]',
          dot: 'bg-[#28A745]'
        };
      case 'Calificado':
        return {
          pill: 'bg-primary/10 text-primary',
          dot: 'bg-primary'
        };
      case 'Reunión Agendada':
        return {
          pill: 'bg-[#5856D6]/10 text-[#5856D6]',
          dot: 'bg-[#5856D6]'
        };
      case 'Contactado':
        return {
          pill: 'bg-[#FF9500]/10 text-[#D97706]',
          dot: 'bg-[#FF9500]'
        };
      case 'Nuevo':
        return {
          pill: 'bg-blue-50 text-blue-700',
          dot: 'bg-blue-500'
        };
      case 'Descartado':
        return {
          pill: 'bg-slate-100 text-slate-600',
          dot: 'bg-slate-400'
        };
      default:
        return {
          pill: 'bg-slate-100 text-slate-700',
          dot: 'bg-slate-400'
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-black/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col justify-between transition-all">
      
      {/* Table Top Action Bar */}
      <div className="px-3 sm:px-5 py-2 sm:py-3 border-b border-black/[0.05] bg-white flex items-center justify-between gap-2">
        
        {/* Title & Count Badge */}
        <div className="flex items-center gap-2">
          <h2 className="text-xs sm:text-sm font-bold text-[#1D1D1F] tracking-tight">
            Leads
          </h2>
          <span className="px-2 py-0.5 bg-black/[0.05] text-slate-700 rounded-full text-[11px] sm:text-xs font-semibold">
            {leads.length}
          </span>
          {totalPipelineValue > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#34C759]/10 text-[#28A745] rounded-full text-xs font-semibold">
              <span>${totalPipelineValue.toLocaleString()} USD</span>
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          
          {/* Apple Segmented View Toggle (List vs Grid) */}
          <div className="hidden sm:flex items-center bg-[#F5F5F7] p-0.5 rounded-xl border border-black/[0.04]">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table' 
                  ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.08)]' 
                  : 'text-slate-500 hover:text-[#1D1D1F]'
              }`}
              title="Vista Lista"
            >
              <List className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="hidden md:inline text-[11px]">Lista</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'cards' 
                  ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.08)]' 
                  : 'text-slate-500 hover:text-[#1D1D1F]'
              }`}
              title="Vista Tarjetas"
            >
              <LayoutGrid className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="hidden md:inline text-[11px]">Tarjetas</span>
            </button>
          </div>

          {/* Import CTA */}
          {canImport && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-[#1D1D1F] rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer border border-black/[0.04]"
              title="Importar leads desde un archivo CSV o Excel"
            >
              <Upload className="w-3.5 h-3.5 text-sky-600 stroke-[2.2]" />
              <span className="text-[11px]">Importar</span>
            </button>
          )}

          {/* Export CTA: menú para elegir CSV o Excel */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(v => !v)}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-[#1D1D1F] rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer border border-black/[0.04]"
              title="Exportar listado a Excel / CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 stroke-[2.2]" />
              <span className="text-[11px]">Exportar</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1 animate-fade-in">
                  <div className="px-2.5 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    Exportar listado
                  </div>
                  <button
                    onClick={handleExportCsv}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-sm text-slate-400 shrink-0" />
                    Descargar CSV
                  </button>
                  <button
                    onClick={handleExportXlsx}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Descargar Excel (.xlsx)
                  </button>
                </div>
              </>
            )}
          </div>

        </div>

      </div>

      {/* MOBILE OPTIMIZED NATIVE LIST (No horizontal scroll, 100% visible on phones) */}
      <div className="block md:hidden divide-y divide-black/[0.04]">
        {paginatedLeads.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-medium text-xs">
            No se encontraron leads con los filtros actuales.
          </div>
        ) : (
          paginatedLeads.map((lead) => {
            const isSelected = lead.id === selectedLeadId;
            const initials = getInitials(lead.name);
            const statusStyle = getStatusBadge(lead.status);

            return (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={`p-3 flex items-center justify-between gap-2.5 transition-colors active:bg-black/[0.04] cursor-pointer ${
                  isSelected ? 'bg-primary/[0.06]' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    onClick={(e) => handleQuickPriority(e, lead)}
                    className="p-1 -ml-1 text-slate-300 hover:text-amber-500 cursor-pointer shrink-0"
                    title={lead.priority ? "Quitar prioridad" : "Marcar prioritario"}
                  >
                    <Star className={`w-4 h-4 ${lead.priority ? 'text-[#FF9500] fill-[#FF9500]' : 'text-slate-300'}`} />
                  </button>

                  <div className={`w-8 h-8 rounded-xl font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs ${
                    isSelected ? 'bg-primary text-white' : getAvatarGradient(lead.name)
                  }`}>
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1 pr-1">
                    <div className="font-bold text-[#1D1D1F] text-xs leading-snug truncate">
                      {lead.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                      <span className="font-semibold text-primary truncate">{lead.company}</span>
                      <span className="text-slate-300">•</span>
                      <span className="truncate">{lead.role}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle.pill}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                    <span className="whitespace-nowrap max-w-[85px] truncate">{lead.status}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-slate-300'}`} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP & TABLET SPREADSHEET / CARD VIEW */}
      <div className="hidden md:block">
        {viewMode === 'table' ? (
          <div className="overflow-x-auto w-full relative">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/[0.05] text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-[#FAFBFD] select-none">
                  
                  {/* Persona & Empresa Header */}
                  <th 
                    onClick={() => handleSort('name')}
                    className="py-3 px-3 sm:px-4 cursor-pointer hover:text-primary transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Contacto / Empresa</span>
                      {sortField === 'name' ? (
                        sortAsc ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Intereses Clave Header */}
                  <th className="hidden sm:table-cell py-3 px-3">Intereses Clave</th>

                  {/* Estado Header */}
                  <th 
                    onClick={() => handleSort('status')}
                    className="py-3 px-3 cursor-pointer hover:text-primary transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Estado</span>
                      {sortField === 'status' ? (
                        sortAsc ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Valor Estimado Header */}
                  <th 
                    onClick={() => handleSort('estimatedValue')}
                    className="hidden xl:table-cell py-3 px-3 cursor-pointer hover:text-primary transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Pipeline USD</span>
                      {sortField === 'estimatedValue' ? (
                        sortAsc ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Último Contacto Header */}
                  <th 
                    onClick={() => handleSort('lastContact')}
                    className="hidden 2xl:table-cell py-3 px-3 text-right cursor-pointer hover:text-primary transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Actividad</span>
                      {sortField === 'lastContact' ? (
                        sortAsc ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  <th className="py-3 pr-4 w-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-sm">
                {paginatedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 font-medium text-xs">
                      No se encontraron leads registrados con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  paginatedLeads.map((lead) => {
                    const isSelected = lead.id === selectedLeadId;
                    const initials = getInitials(lead.name);
                    const statusStyle = getStatusBadge(lead.status);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => onSelectLead(lead)}
                        className={`
                          group cursor-pointer transition-colors duration-150
                          ${isSelected 
                            ? 'bg-primary/[0.06] hover:bg-primary/[0.08]' 
                            : 'hover:bg-black/[0.02]'
                          }
                        `}
                      >
                        {/* Name, Avatar, Role & Company */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              onClick={(e) => handleQuickPriority(e, lead)}
                              className="p-0.5 text-slate-300 hover:text-amber-500 transition-colors cursor-pointer shrink-0"
                              title={lead.priority ? "Quitar prioridad" : "Marcar prioritario"}
                            >
                              <Star className={`w-3.5 h-3.5 ${lead.priority ? 'text-[#FF9500] fill-[#FF9500]' : 'text-slate-300 group-hover:text-slate-400'}`} />
                            </button>

                            <div className={`
                              w-8 h-8 rounded-xl font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105
                              ${isSelected 
                                ? 'bg-primary text-white' 
                                : getAvatarGradient(lead.name)
                              }
                            `}>
                              {initials}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-[#1D1D1F] text-xs sm:text-sm leading-tight truncate">
                                {lead.name}
                              </div>
                              <div className="text-[11px] sm:text-xs text-slate-500 font-normal truncate flex items-center gap-1.5 mt-0.5">
                                <span className="font-semibold text-slate-700 truncate">{lead.company}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-500 truncate">{lead.role}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Interests Pills */}
                        <td className="hidden sm:table-cell py-3 px-3">
                          <div className="flex items-center gap-1 flex-wrap max-w-[160px]">
                            {lead.interests.slice(0, 2).map((interest, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-medium bg-black/[0.04] text-slate-700 whitespace-nowrap"
                              >
                                {interest}
                              </span>
                            ))}
                            {lead.interests.length > 2 && (
                              <span className="text-[10px] font-bold text-slate-400 px-1 py-0.5 bg-black/[0.03] rounded-md">
                                +{lead.interests.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Apple Pill */}
                        <td className="py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold ${statusStyle.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                            <span>{lead.status}</span>
                          </div>
                        </td>

                        {/* Estimated Value */}
                        <td className="hidden xl:table-cell py-3 px-3 font-bold text-slate-800 text-xs whitespace-nowrap">
                          {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : '—'}
                        </td>

                        {/* Last Activity */}
                        <td className="hidden 2xl:table-cell py-3 px-3 text-right text-xs font-medium text-slate-500 whitespace-nowrap">
                          {formatLeadTimestamp(lead.lastContact)}
                        </td>

                        {/* Chevron Arrow */}
                        <td className="py-3 pr-4 text-right">
                          <ChevronRight className={`w-3.5 h-3.5 transition-all duration-150 ${isSelected ? 'text-primary translate-x-0.5' : 'text-slate-300 group-hover:text-slate-500'}`} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* APPLE CLEAN CARD GRID VIEW */
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {paginatedLeads.map((lead) => {
              const isSelected = lead.id === selectedLeadId;
              const initials = getInitials(lead.name);
              const statusStyle = getStatusBadge(lead.status);

              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className={`p-4 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/[0.03] shadow-[0_2px_8px_rgba(0,113,227,0.12)] ring-1 ring-primary'
                      : 'border-black/[0.06] bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl font-bold text-xs flex items-center justify-center shadow-2xs ${getAvatarGradient(lead.name)}`}>
                          {initials}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1D1D1F] flex items-center gap-1.5">
                            {lead.name}
                            {lead.priority && <Star className="w-3.5 h-3.5 text-[#FF9500] fill-[#FF9500]" />}
                          </h4>
                          <p className="text-xs text-slate-500">{lead.role}</p>
                        </div>
                      </div>

                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusStyle.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                        <span>{lead.status}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-1.5 my-2.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{lead.company}</span>
                      {lead.city && <span className="text-slate-400">• {lead.city}</span>}
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {lead.interests.map((int, i) => (
                        <span key={i} className="px-2 py-0.5 bg-black/[0.04] text-slate-700 text-[11px] font-medium rounded-lg">
                          {int}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-black/[0.04] flex items-center justify-between text-xs text-slate-500">
                    <span>{formatLeadTimestamp(lead.lastContact)}</span>
                    <span className="text-primary font-semibold flex items-center gap-0.5">
                      Ver Detalles
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-black/[0.05] bg-white flex items-center justify-between gap-2 text-[11px] sm:text-xs text-slate-500 font-medium">
        <div>
          <span className="hidden sm:inline">Mostrando </span>
          <span className="font-bold text-[#1D1D1F]">{totalItems === 0 ? 0 : startIndex + 1}</span>-
          <span className="font-bold text-[#1D1D1F]">{Math.min(startIndex + itemsPerPage, totalItems)}</span> de 
          <span className="font-bold text-[#1D1D1F]"> {totalItems}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-xl border border-black/10 flex items-center justify-center hover:bg-black/5 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-all"          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
          </button>

          <span className="px-2 py-1 text-xs font-semibold text-slate-700 sm:hidden">
            {currentPage} / {totalPages}
          </span>

          <div className="hidden sm:flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((page, index, array) => {
                const showEllipsis = index > 0 && page - array[index - 1] > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentPage === page 
                          ? 'bg-primary text-white shadow-2xs' 
                          : 'border border-black/[0.08] hover:bg-black/[0.04] text-slate-700'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })
            }
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border border-black/[0.08] flex items-center justify-center hover:bg-black/[0.04] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-700" />
          </button>
        </div>
      </div>

      {isImportModalOpen && currentUser && currentEvent && onImportLeads && (
        <ImportLeadsModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          leads={leads}
          currentUser={currentUser}
          currentEvent={currentEvent}
          onImportLeads={onImportLeads}
        />
      )}

    </div>
  );
};

