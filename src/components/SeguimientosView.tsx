import React, { useState, useRef } from 'react';
import { CheckCircle2, Star, ChevronRight, AlertCircle, ArrowRight, GripVertical } from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface SeguimientosViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateLead?: (lead: Lead) => void;
}

const STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'Nuevo', label: 'Nuevo', color: 'bg-blue-50 text-blue-700' },
  { id: 'Contactado', label: 'Contactado', color: 'bg-purple-50 text-purple-700' },
  { id: 'Calificado', label: 'Calificado', color: 'bg-indigo-50 text-indigo-700' },
  { id: 'Reunión Agendada', label: 'Reunión Agendada', color: 'bg-amber-50 text-amber-800' },
  { id: 'Ganado', label: 'Ganado', color: 'bg-emerald-50 text-emerald-800' }
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
      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-900">Seguimiento de Pipeline</h2>
        </div>

        {/* View Switcher */}
        <div className="flex items-center p-0.5 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tablero Kanban
          </button>
          <button
            type="button"
            onClick={() => setViewMode('priority')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === 'priority' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Urgentes</span>
            {priorityLeads.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                {priorityLeads.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KANBAN VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto pb-2">
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
                className={`p-3 rounded-2xl border transition-colors flex flex-col min-w-[220px] ${
                  isTargetColumn 
                    ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/20' 
                    : 'bg-slate-50/80 border-slate-200/60'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <span className="font-extrabold text-xs text-slate-700">{stage.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stage.color}`}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Card stack */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[580px] pr-0.5 min-h-[100px]">
                  {stageLeads.length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl text-[11px] font-medium text-slate-400">
                      Sin leads
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
                          className={`bg-white p-3 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing relative group ${
                            isBeingDragged ? 'opacity-40 scale-95 border-blue-400' : 'opacity-100'
                          }`}
                        >
                          {lead.priority && (
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500 absolute top-3 right-3" />
                          )}
                          
                          <div className="flex items-start gap-1">
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 mt-0.5 shrink-0 -ml-1" />
                            <div>
                              <h4 className="font-bold text-xs text-slate-900 pr-4">
                                {lead.name}
                              </h4>
                              <p className="text-[11px] font-medium text-slate-500">{lead.company}</p>
                            </div>
                          </div>

                          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span>{lead.nextContactDate || 'Sin agendar'}</span>
                            <span className="text-blue-600 font-bold flex items-center">
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

      {/* PRIORITY LIST VIEW */}
      {viewMode === 'priority' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {priorityLeads.length === 0 ? (
            <div className="col-span-full bg-white p-8 rounded-2xl text-center border border-slate-200/60 text-slate-400 font-medium text-xs">
              No hay leads prioritarios pendientes.
            </div>
          ) : (
            priorityLeads.map(lead => (
              <div
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="bg-white p-4 rounded-2xl border border-amber-200/80 hover:border-amber-300 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">{lead.name}</h3>
                      <p className="text-xs text-slate-500">{lead.role} • <strong className="text-slate-700">{lead.company}</strong></p>
                    </div>
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0 ml-2" />
                  </div>

                  <div className="p-2.5 bg-amber-50/60 rounded-xl text-xs space-y-0.5 my-2">
                    <div className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                      <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                      Acción Inmediata Sugerida:
                    </div>
                    <div className="text-slate-800 font-semibold">{lead.suggestedAction?.title || "Agendar llamada de seguimiento"}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Capturado por: <strong className="text-slate-800">{lead.capturedBy}</strong></span>
                  <span className="flex items-center gap-1 text-amber-800 font-bold">
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