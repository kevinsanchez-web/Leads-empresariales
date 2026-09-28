import React from 'react';
import { X, RotateCcw, Filter } from 'lucide-react';
import { LeadStatus, UserRep } from '../types';
import { INTEREST_OPTIONS, SOURCE_OPTIONS } from '../data/mockData';

interface FiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  priorityOnly: boolean;
  setPriorityOnly: (val: boolean) => void;
  repFilter: string;
  setRepFilter: (val: string) => void;
  interestFilter: string;
  setInterestFilter: (val: string) => void;
  sourceFilter: string;
  setSourceFilter: (val: string) => void;
  users: UserRep[];
  onResetFilters: () => void;
}

export const FiltersModal: React.FC<FiltersModalProps> = ({
  isOpen,
  onClose,
  statusFilter,
  setStatusFilter,
  priorityOnly,
  setPriorityOnly,
  repFilter,
  setRepFilter,
  interestFilter,
  setInterestFilter,
  sourceFilter,
  setSourceFilter,
  users,
  onResetFilters
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Filter className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">Filtros Avanzados</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Filters Body */}
        <div className="py-3 space-y-3 overflow-y-auto flex-1">
          
          {/* Priority Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Solo Seguimiento Prioritario</span>
            <input
              type="checkbox"
              checked={priorityOnly}
              onChange={(e) => setPriorityOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Estado del Lead</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los Estados</option>
              <option value="Nuevo">Nuevo</option>
              <option value="Contactado">Contactado</option>
              <option value="Calificado">Calificado</option>
              <option value="Reunión Agendada">Reunión Agendada</option>
              <option value="Ganado">Ganado</option>
              <option value="Descartado">Descartado</option>
            </select>
          </div>

          {/* Representative Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Reportado Por (Representante)</label>
            <select
              value={repFilter}
              onChange={(e) => setRepFilter(e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los Representantes</option>
              {users.map(u => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Interest Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Interés Principal</label>
            <select
              value={interestFilter}
              onChange={(e) => setInterestFilter(e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los Intereses</option>
              {INTEREST_OPTIONS.map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">Fuente / Touchpoint de Captura</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las Fuentes</option>
              {SOURCE_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          <button
            onClick={onResetFilters}
            className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
          >
            Aplicar Filtros
          </button>
        </div>

      </div>
    </div>
  );
};
