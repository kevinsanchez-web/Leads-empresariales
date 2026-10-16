import React, { RefObject } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';

interface PickerTriggerProps {
  anchorRef: RefObject<HTMLButtonElement | null>;
  icon: LucideIcon;
  text: string;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  ariaLabel: string;
  /**
   * Radio de las esquinas del botón. Se parametriza para que vistas como
   * Reportes puedan unificar el border-radius de todos sus controles sin
   * arrastrar el redondeado por defecto al resto de la app.
   */
  roundedClassName?: string;
}

/**
 * Botón que abre los selectores propios de fecha y hora.
 *
 * Reproduce la estética de `INPUT_BASE` del formulario pero como botón, porque
 * el popup del `<input type="date">` nativo lo dibuja el sistema operativo y no
 * se puede estilizar. `type="button"` es obligatorio: los formularios de alta
 * están dentro de un `<form>` y un botón sin tipo dispararía el guardado.
 */
export const PickerTrigger: React.FC<PickerTriggerProps> = ({
  anchorRef,
  icon: Icon,
  text,
  placeholder,
  open,
  onToggle,
  ariaLabel,
  roundedClassName = 'rounded-xl'
}) => (
  <button
    type="button"
    ref={anchorRef}
    onClick={onToggle}
    aria-label={ariaLabel}
    aria-haspopup="dialog"
    aria-expanded={open}
    className={`relative w-full pl-9 pr-9 py-2 bg-white border border-slate-200 ${roundedClassName} text-xs font-medium text-left text-[#1D1D1F] hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all cursor-pointer`}
  >
    <Icon className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
    <span className={text ? '' : 'text-slate-400'}>{text || placeholder}</span>
    <ChevronDown
      className={`w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${
        open ? 'rotate-180' : ''
      }`}
    />
  </button>
);
