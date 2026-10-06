import React, { useState, useRef } from 'react';
import { CheckCircle2, Star, ChevronRight, AlertCircle, ArrowRight, GripVertical } from 'lucide-react';

export type LeadStatus = 'Nuevo' | 'Contactado' | 'Calificado' | 'Reunión Agendada' | 'Ganado';

export interface Lead {
  id: string;
  name: string;
  company: string;
  role?: string;
  status: LeadStatus;
  priority?: boolean;
  capturedBy?: string;
  nextContactDate?: string;
  suggestedAction?: {
    title: string;
  };
}

interface SeguimientosViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (lead: Lead) => void;
}

const STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'Nuevo', label: 'Nuevo', color: 'bg-blue-50/90 text-blue-700 border border-blue-200/80' },
  { id: 'Contactado', label: 'Contactado', color: 'bg-purple-50/90 text-purple-700 border border-purple-200/80' },
  { id: 'Calificado', label: 'Calificado', color: 'bg-indigo-50/90 text-indigo-700 border border-indigo-200/80' },
  { id: 'Reunión Agendada', label: 'Reunión Agendada', color: 'bg-amber-50/90 text-amber-800 border border-amber-200/80' },
  { id: 'Ganado', label: 'Ganado', color: 'bg-emerald-50/90 text-emerald-800 border border-emerald-200/80' }
];

export const SeguimientosView: React.FC<SeguimientosViewProps> = ({ 
  leads, 
  onSelectLead,
  onUpdateLead 
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'priority'>('kanban');
  
  // Estados para controlar el arrastre tipados con LeadStatus
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStatus | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  const priorityLeads = leads.filter(l => l.priority);

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

  return (
    <div className="space-y-4 animate-fade-in select-none">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Seguimiento de Pipeline
            </h2>
            <p className="text-xs text-slate-500">Gestiona y califica las fases de tus contactos</p>
          </div>
        </div>

        {/* Selector de Vistas */}
        <div className="flex items-center p-1 bg-slate-100/90 border border-slate-200/80 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-2">
          {STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.status === stage.id);
            const isTargetColumn = dragOverStage === stage.id;

            return (
              <div 
                key={stage.id} 
                data-stage-id={stage.id}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={(e) => handleDragLeave(e, stage.id)}
                onDrop={() => handleDrop(stage.id)}
                className={`p-3 rounded-2xl border transition-all flex flex-col min-w-[230px] ${
                  isTargetColumn 
                    ? 'bg-blue-50/80 border-blue-400 ring-4 ring-blue-500/10 shadow-md' 
                    : 'bg-slate-100/70 border-slate-200/70'
                }`}
              >
                {/* Encabezado de Columna */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-extrabold text-xs text-slate-800 tracking-tight">{stage.label}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-2xs ${stage.color}`}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Lista de Tarjetas */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] pr-0.5 min-h-[120px]">
                  {stageLeads.length === 0 ? (
                    <div className="h-28 flex items-center justify-center border-2 border-dashed border-slate-300/70 rounded-xl text-[11px] font-semibold text-slate-400 bg-white/40">
                      Sin leads en esta fase
                    </div>
                  ) : (
                    stageLeads.map(lead => {
                      const isBeingDragged = draggedLeadId === lead.id;

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onTouchStart={() => handleTouchStart(lead.id)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          onClick={() => handleCardClick(lead)}
                          className={`bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-400/80 hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative group ${
                            isBeingDragged ? 'opacity-40 scale-95 border-blue-500 shadow-none' : 'shadow-2xs'
                          }`}
                        >
                          {lead.priority && (
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 absolute top-3.5 right-3.5" />
                          )}
                          
                          <div className="flex items-start gap-1.5">
                            <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-400 mt-0.5 shrink-0 -ml-1 transition-colors" />
                            <div className="flex-1 min-w-0 pr-3">
                              <h4 className="font-bold text-xs text-slate-900 truncate">
                                {lead.name}
                              </h4>
                              <p className="text-[11px] font-medium text-slate-500 truncate">{lead.company}</p>
                            </div>
                          </div>

                          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60 font-semibold">
                              {lead.nextContactDate || 'Sin agendar'}
                            </span>
                            <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                              Ver <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
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

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Capturado por: <strong className="text-slate-800 font-semibold">{lead.capturedBy}</strong></span>
                  <span className="flex items-center gap-1 text-amber-800 font-extrabold group-hover:translate-x-0.5 transition-transform">
                    Atender <ArrowRight className="w-3.5 h-3.5" />
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