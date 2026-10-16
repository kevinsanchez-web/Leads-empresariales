import React, { useState, useRef } from 'react';
import {
  CheckCircle2,
  Star,
  AlertCircle,
  GripVertical,
  CalendarClock,
  MoreHorizontal,
  Repeat,
  Inbox,
  DollarSign,
  Users,
  TrendingUp,
  Eye,
  XCircle
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { formatCurrencyUSD, formatCompactUSD, sumEstimatedValue } from '../utils/format';

interface SeguimientosViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (lead: Lead) => void;
  /** Abre la ficha del lead con el modal de agendar reunión ya desplegado. */
  onScheduleLead?: (lead: Lead) => void;
}

const STAGES: { id: LeadStatus; label: string; color: string; dot: string }[] = [
  { id: 'Nuevo', label: 'Nuevo', color: 'bg-blue-50/90 text-blue-700 border border-blue-200/80', dot: 'bg-blue-500' },
  { id: 'Contactado', label: 'Contactado', color: 'bg-purple-50/90 text-purple-700 border border-purple-200/80', dot: 'bg-purple-500' },
  { id: 'Calificado', label: 'Calificado', color: 'bg-indigo-50/90 text-indigo-700 border border-indigo-200/80', dot: 'bg-indigo-500' },
  { id: 'Reunión Agendada', label: 'Reunión Agendada', color: 'bg-amber-50/90 text-amber-800 border border-amber-200/80', dot: 'bg-amber-500' },
  { id: 'Ganado', label: 'Ganado', color: 'bg-emerald-50/90 text-emerald-800 border border-emerald-200/80', dot: 'bg-emerald-500' }
];

interface CardMenu {
  leadId: string;
  kind: 'phase' | 'more';
  left: number;
  bottom: number;
}

export const SeguimientosView: React.FC<SeguimientosViewProps> = ({
  leads,
  onSelectLead,
  onUpdateLead,
  onScheduleLead
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'priority'>('kanban');
  const [openMenu, setOpenMenu] = useState<CardMenu | null>(null);

  // Estados para controlar el arrastre tipados con LeadStatus
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStatus | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const priorityLeads = leads.filter(l => l.priority);

  // Métricas globales del pipeline para el encabezado
  const totalPipelineValue = sumEstimatedValue(leads);
  const wonCount = leads.filter(l => l.status === 'Ganado').length;
  const wonPercent = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;

  // --- LÓGICA MOUSE (HTML5 Drag & Drop) ---
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    isDraggingRef.current = true;
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageId) {
      setDragOverStage(stageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageId: LeadStatus) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverStage === stageId) {
      setDragOverStage(null);
    }
  };

  const handleDrop = (stageId: LeadStatus) => {
    if (draggedLeadId) {
      updateLeadStage(draggedLeadId, stageId);
    }
    resetDragState();
  };

  // --- LÓGICA TOUCH (TÁCTIL MÓVIL) ---
  const handleTouchStart = (leadId: string) => {
    setDraggedLeadId(leadId);
    isDraggingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    const touch = e.touches[0];

    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const stageColumn = targetElement?.closest('[data-stage-id]');

    if (stageColumn) {
      const targetStageId = stageColumn.getAttribute('data-stage-id') as LeadStatus;
      setDragOverStage(targetStageId);
    } else {
      setDragOverStage(null);
    }
  };

  const handleTouchEnd = () => {
    if (draggedLeadId && dragOverStage) {
      updateLeadStage(draggedLeadId, dragOverStage);
    }
    resetDragState();
  };

  // Función general para actualizar estado tipada correctamente
  const updateLeadStage = (leadId: string, newStageId: LeadStatus) => {
    const leadToUpdate = leads.find(l => l.id === leadId);
    if (leadToUpdate && leadToUpdate.status !== newStageId && onUpdateLead) {
      onUpdateLead({ ...leadToUpdate, status: newStageId });
    }
  };

  const resetDragState = () => {
    setDraggedLeadId(null);
    setDragOverStage(null);
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleCardClick = (lead: Lead) => {
    if (!isDraggingRef.current) {
      onSelectLead(lead);
    }
  };

  // Los desplegables de tarjeta se posicionan en `fixed` porque la lista de cada
  // columna hace scroll interno: un menú `absolute` quedaría recortado por el
  // `overflow-y-auto` de la columna.
  const openCardMenu = (e: React.MouseEvent, leadId: string, kind: CardMenu['kind']) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = kind === 'phase' ? 196 : 136;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
    const bottom = rect.bottom + menuHeight + 8 > window.innerHeight
      ? window.innerHeight - rect.top + 8
      : window.innerHeight - rect.bottom - 8;

    setOpenMenu({ leadId, kind, left, bottom });
  };

  const togglePriority = (lead: Lead) => {
    if (onUpdateLead) {
      onUpdateLead({ ...lead, priority: !lead.priority });
    }
  };

  const scheduleLead = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    if (isDraggingRef.current) return;
    setOpenMenu(null);
    if (onScheduleLead) onScheduleLead(lead);
    else onSelectLead(lead);
  };

  return (
    <div className="space-y-4 animate-fade-in select-none">
      {/* Cierre transparente de los menús de tarjeta */}
      {openMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} aria-hidden="true" />
      )}

      {/* Header: título + métricas globales + selector de vista */}
      <div className="bg-white/90 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              Seguimiento de Pipeline
            </h2>
            <p className="text-xs text-slate-500 truncate">Gestiona y califica las fases de tus contactos</p>
          </div>
        </div>

        {/* Métricas globales: ocupan el espacio libre junto al título */}
        <div className="hidden lg:flex items-center gap-1.5 flex-1 justify-end">
          <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="leading-none">
              <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Pipeline</div>
              <div className="text-[11px] font-extrabold text-primary mt-0.5">{formatCompactUSD(totalPipelineValue)}</div>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div className="leading-none">
              <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Leads</div>
              <div className="text-[11px] font-extrabold text-slate-800 mt-0.5">{leads.length}</div>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <div className="leading-none">
              <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">Ganados</div>
              <div className="text-[11px] font-extrabold text-slate-800 mt-0.5">{wonPercent}%</div>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
            <div className="leading-none">
              <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">VIP</div>
              <div className="text-[11px] font-extrabold text-slate-800 mt-0.5">{priorityLeads.length}</div>
            </div>
          </div>
        </div>

        {/* Selector de Vistas */}
        <div className="flex items-center p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tablero Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode('priority')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'priority'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Urgentes</span>
            {priorityLeads.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                {priorityLeads.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VISTA KANBAN */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-6">
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.status === stage.id);
            const stageTotal = sumEstimatedValue(stageLeads);
            const isTargetColumn = dragOverStage === stage.id;

            return (
              <div
                key={stage.id}
                data-stage-id={stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={(e) => handleDragLeave(e, stage.id)}
                onDrop={() => handleDrop(stage.id)}
                className={`p-3 rounded-2xl border transition-all flex flex-col min-w-57.5 ${
                  isTargetColumn
                    ? 'bg-primary/5 border-primary/50 ring-4 ring-primary/10 shadow-md'
                    : 'bg-slate-100/70 border-slate-200/70'
                }`}
              >
                {/* Encabezado de Columna: fase + conteo + valor acumulado */}
                <div className="mb-3 px-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-xs text-slate-800 tracking-tight truncate">{stage.label}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-2xs ${stage.color}`}>
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="text-[10px] font-extrabold text-primary tracking-tight">
                    {formatCompactUSD(stageTotal)}
                  </div>
                </div>

                {/* Lista de Tarjetas. Es un flex vertical para que el estado vacío
                    pueda crecer con `flex-1` y quedar centrado en la columna. */}
                <div className="flex flex-col space-y-2.5 flex-1 overflow-y-auto max-h-150 pr-0.5 min-h-30">
                  {stageLeads.length === 0 ? (
                    <div className="flex-1 min-h-42.5 flex items-center justify-center rounded-xl bg-white/60 border border-slate-200/60">
                      <div className="text-center px-4">
                        <Inbox className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                        <p className="text-[11px] font-semibold text-slate-400">
                          Sin prospectos en esta fase
                        </p>
                      </div>
                    </div>
                  ) : (
                    stageLeads.map(lead => {
                      const isBeingDragged = draggedLeadId === lead.id;
                      const isMenuOpen = openMenu?.leadId === lead.id;

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onTouchStart={() => handleTouchStart(lead.id)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          onClick={() => handleCardClick(lead)}
                          className={`bg-white p-3.5 rounded-xl border hover:border-primary/60 hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative group shrink-0 ${
                            isBeingDragged
                              ? 'opacity-40 scale-95 border-primary shadow-none'
                              : isMenuOpen
                                ? 'border-primary/60 shadow-md'
                                : 'border-slate-200/80 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400 mt-0.5 shrink-0 -ml-1 transition-colors" />
                            <div className="flex-1 min-w-0">
                              {/* Nombre + insignia VIP */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h4 className="font-bold text-xs text-slate-900 truncate">
                                  {lead.name}
                                </h4>
                                {lead.priority && (
                                  <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 border border-amber-200/80 text-[8px] font-black px-1.5 py-px rounded-full uppercase tracking-wide shrink-0">
                                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                    VIP
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-medium text-slate-500 truncate">{lead.company}</p>
                              {lead.role && (
                                <p className="text-[10px] text-slate-400 font-medium truncate">{lead.role}</p>
                              )}

                              {/* Intereses clave */}
                              {lead.interests && lead.interests.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                  {lead.interests.slice(0, 2).map((interest, idx) => (
                                    <span
                                      key={`${interest}-${idx}`}
                                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15 truncate max-w-21.5"
                                    >
                                      {interest}
                                    </span>
                                  ))}
                                  {lead.interests.length > 2 && (
                                    <span className="text-[9px] font-bold text-slate-400 px-0.5">
                                      +{lead.interests.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Monto estimado + próximo contacto */}
                          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[10px]">
                            <span className="text-[11px] font-extrabold text-primary tracking-tight truncate">
                              {formatCurrencyUSD(lead.estimatedValue)}
                            </span>
                            <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold shrink-0">
                              {lead.nextContactDate || 'Sin agendar'}
                            </span>
                          </div>

                          {/* Acciones rápidas: visibles al pasar el cursor en escritorio,
                              siempre visibles en táctil (no hay hover) */}
                          <div className="mt-2 flex items-center gap-1 transition-opacity pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-within:opacity-100">
                            <button
                              type="button"
                              onClick={(e) => openCardMenu(e, lead.id, 'phase')}
                              className="flex-1 min-w-0 h-7 px-2 rounded-lg bg-slate-50 hover:bg-primary/10 border border-slate-200/70 hover:border-primary/30 text-[10px] font-bold text-slate-600 hover:text-primary flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Cambiar de fase"
                            >
                              <Repeat className="w-3 h-3 shrink-0" />
                              <span className="truncate">Fase</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => scheduleLead(e, lead)}
                              className="h-7 px-2 rounded-lg bg-slate-50 hover:bg-primary/10 border border-slate-200/70 hover:border-primary/30 text-[10px] font-bold text-slate-600 hover:text-primary flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="Agendar seguimiento"
                            >
                              <CalendarClock className="w-3 h-3" />
                              <span className="hidden xl:inline">Agendar</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => openCardMenu(e, lead.id, 'more')}
                              className="h-7 w-7 shrink-0 rounded-lg bg-slate-50 hover:bg-primary/10 border border-slate-200/70 hover:border-primary/30 text-slate-500 hover:text-primary flex items-center justify-center transition-colors cursor-pointer"
                              title="Más opciones"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Desplegable de fase */}
                          {isMenuOpen && openMenu?.kind === 'phase' && (
                            <div
                              className="fixed z-50 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1 animate-fade-in"
                              style={{ left: openMenu.left, bottom: openMenu.bottom }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-2.5 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                Mover a fase
                              </div>
                              {STAGES.filter(s => s.id !== lead.status).map(stageOption => (
                                <button
                                  key={stageOption.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateLeadStage(lead.id, stageOption.id);
                                    setOpenMenu(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${stageOption.dot}`} />
                                  <span className="truncate">{stageOption.label}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Menú de más opciones */}
                          {isMenuOpen && openMenu?.kind === 'more' && (
                            <div
                              className="fixed z-50 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-1 animate-fade-in"
                              style={{ left: openMenu.left, bottom: openMenu.bottom }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenu(null);
                                  handleCardClick(lead);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                Ver ficha completa
                              </button>
                              {onUpdateLead && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    togglePriority(lead);
                                    setOpenMenu(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Star className={`w-3.5 h-3.5 shrink-0 ${lead.priority ? 'text-amber-500 fill-amber-400' : 'text-slate-400'}`} />
                                  {lead.priority ? 'Quitar prioridad VIP' : 'Marcar como VIP'}
                                </button>
                              )}
                              {onUpdateLead && lead.status !== 'Descartado' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateLeadStage(lead.id, 'Descartado');
                                    setOpenMenu(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                                  Descartar lead
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA DE PRIORITARIOS (URGENTES) */}
      {viewMode === 'priority' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pb-6">
          {priorityLeads.length === 0 ? (
            <div className="col-span-full bg-white p-10 rounded-2xl text-center border border-slate-200/80 text-slate-400 font-medium text-xs shadow-2xs">
              No hay leads prioritarios pendientes en este momento.
            </div>
          ) : (
            priorityLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="bg-white p-4.5 rounded-2xl border border-amber-200/90 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-primary transition-colors">
                        {lead.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {lead.role} • <strong className="text-slate-700 font-semibold">{lead.company}</strong>
                      </p>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs space-y-1 my-3">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Acción Inmediata Sugerida:
                    </div>
                    <div className="text-slate-800 font-semibold pl-5">
                      {lead.suggestedAction?.title || "Agendar llamada de seguimiento urgente"}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500 font-medium">
                  <span className="truncate">Capturado por: <strong className="text-slate-800 font-semibold">{lead.capturedBy}</strong></span>
                  <span className="text-[11px] font-extrabold text-primary shrink-0">
                    {formatCurrencyUSD(lead.estimatedValue)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};
