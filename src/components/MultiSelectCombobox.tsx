import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useAnchoredPopover } from './useAnchoredPopover';

interface MultiSelectComboboxProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  placeholder?: string;
}

const TRIGGER_BASE =
  'w-full min-h-[34px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-left hover:border-slate-300 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all cursor-pointer flex items-center gap-1.5 flex-wrap';

/**
 * Selección múltiple desplegable con buscador. Reemplaza a los grupos de chips
 * que desplegaban todas las opciones a la vez y ocupaban varias filas.
 *
 * El popup se monta en un portal sobre `body` (vía `useAnchoredPopover`) porque
 * vive dentro de contenedores con `overflow-y-auto` que lo recortarían.
 */
export const MultiSelectCombobox: React.FC<MultiSelectComboboxProps> = ({
  label,
  options,
  selected,
  onToggle,
  placeholder = 'Seleccionar…'
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [width, setWidth] = useState(280);

  const { anchorRef, popupRef, popupStyle } = useAnchoredPopover(open, () => setOpen(false), {
    height: 320,
    width,
    center: true
  });

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // Un valor precargado puede no estar en el catálogo (ej. 'Escanear Tarjeta'
  // o 'Captura Rápida'). Se lista igual para que pueda verse y quitarse.
  const notInOptions = useMemo(
    () => selected.filter(value => !options.includes(value)),
    [selected, options]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = [...notInOptions, ...options];
    if (!normalizedQuery) return list;
    return list.filter(option => option.toLowerCase().includes(normalizedQuery));
  }, [notInOptions, options, normalizedQuery]);

  const handleTriggerClick = () => {
    const measured = anchorRef.current?.offsetWidth;
    if (measured) setWidth(measured);
    setOpen(prev => !prev);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-slate-700">{label}</label>
        <span className="text-[10px] text-slate-400 font-medium">{selected.length} seleccionados</span>
      </div>

      <button
        type="button"
        ref={anchorRef}
        onClick={handleTriggerClick}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={TRIGGER_BASE}
      >
        {selected.length === 0 ? (
          <span className="text-slate-400">{placeholder}</span>
        ) : (
          <>
            {selected.slice(0, 3).map(value => (
              <span
                key={value}
                className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold truncate max-w-[120px]"
              >
                {value}
              </span>
            ))}
            {selected.length > 3 && (
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                +{selected.length - 3}
              </span>
            )}
          </>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 ml-auto text-slate-400 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={popupRef}
            style={popupStyle}
            className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in"
          >
            <div className="p-2 border-b border-slate-100 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="max-h-56 overflow-y-auto p-1" role="listbox">
              {filtered.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Sin resultados.</p>
              ) : (
                filtered.map(option => {
                  const active = selected.includes(option);
                  return (
                    <button
                      type="button"
                      key={option}
                      onClick={() => onToggle(option)}
                      role="option"
                      aria-selected={active}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors ${
                          active ? 'bg-primary border-primary' : 'bg-white border-slate-300'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className="truncate">{option}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
