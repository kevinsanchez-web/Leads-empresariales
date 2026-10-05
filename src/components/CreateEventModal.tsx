import React, { useState } from 'react';
import { X, Calendar, MapPin, Plus, CheckCircle2 } from 'lucide-react';
import { EventOption } from '../types';
import { formatEventDateRange } from '../utils/date';
import { DatePicker } from './DatePicker';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEvent: (newEvent: EventOption, setAsActive: boolean) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onSaveEvent
}) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [setAsActive, setSetAsActive] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newEvent: EventOption = {
      id: `evt-${Date.now()}`,
      name: name.trim(),
      location: location.trim() || 'Centro de Eventos',
      dateRange: startDate ? formatEventDateRange(startDate, endDate || undefined) : 'Fecha por definir',
      isCurrent: setAsActive
    };

    onSaveEvent(newEvent, setAsActive);
    onClose();
    setName('');
    setLocation('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-black/[0.08] animate-fade-in flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.05] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-accent text-white flex items-center justify-center font-bold shadow-accent">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1D1D1F] leading-tight">
                Crear Nuevo Evento
              </h2>
              <p className="text-xs text-slate-500">
                Organiza tus leads por feria o congreso
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 rounded-xl bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-500 hover:text-[#1D1D1F] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="py-4 space-y-4 overflow-y-auto flex-1">
          
          {/* Event Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Evento *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Andicom 2026, Smart City Expo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent transition-all placeholder:text-slate-400 text-[#1D1D1F]"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lugar / Ciudad
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Ej: Cartagena de Indias, Corferias Bogotá"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent transition-all placeholder:text-slate-400 text-[#1D1D1F]"
              />
            </div>
          </div>

          {/* Dates Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha Inicio
              </label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                min={endDate || undefined}
                placeholder="Fecha de inicio"
                center
                ariaLabel="Fecha de inicio del evento"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha Fin
              </label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                min={startDate || undefined}
                placeholder="Fecha de fin"
                center
                ariaLabel="Fecha de fin del evento"
              />
            </div>
          </div>

          {startDate && (
            <p className="text-[11px] text-slate-500 -mt-2">
              Se guardará como <span className="font-semibold text-slate-700">{formatEventDateRange(startDate, endDate || undefined)}</span>.
            </p>
          )}

          {/* Set as Active Event Switch */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAFBFD] border border-black/[0.04]">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className={`w-4 h-4 ${setAsActive ? 'text-[#34C759]' : 'text-slate-400'}`} />
              <div>
                <div className="text-xs font-bold text-[#1D1D1F]">
                  Establecer como Evento Activo
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Los nuevos leads capturados se asociarán a este evento
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSetAsActive(!setAsActive)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                setAsActive ? 'bg-[#34C759]' : 'bg-slate-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                setAsActive ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.05]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar y Activar</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

