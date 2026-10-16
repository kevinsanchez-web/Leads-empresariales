import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface RoundedSelectOption {
  value: string;
  label: string;
}

interface PanelPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

interface RoundedSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: RoundedSelectOption[];
  ariaLabel?: string;
  icon?: React.ReactNode;
  searchable?: boolean;
  className?: string;
  buttonClassName?: string;
  // 'default': skin bg-slate-50/border/rounded-2xl con padding propio.
  // 'bare': solo layout; el consumidor aporta skin, padding, tipografía y focus
  // vía buttonClassName para conservar su aspecto original.
  variant?: 'default' | 'bare';
}

/**
 * Desplegable con estética redondeada completa (disparador y menú de opciones),
 * en contraste con los `<select>` nativos cuyo popup lo pinta el sistema
 * con esquinas rectas que no se pueden estilizar.
 *
 * - El menú se renderiza en un portal a document.body con posicionamiento
 *   fixed: queda flotante y nunca lo recorta un contenedor con overflow
 *   (modales con scroll, drawers, etc.).
 * - Si no cabe hacia abajo, se abre hacia arriba (flip vertical).
 * - Cierra al hacer clic fuera o con Escape, y sigue al disparador al
 *   hacer scroll.
 */
export const RoundedSelect: React.FC<RoundedSelectProps> = ({
  value,
  onChange,
  options,
  ariaLabel,
  icon,
  searchable = false,
  className = '',
  buttonClassName = '',
  variant = 'default'
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const computePosition = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    // Altura real del panel si ya está montado; si no, un estimado del max-h-64.
    const panelHeight = panelRef.current?.offsetHeight ?? 256;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropUp = spaceBelow < panelHeight + 12 && spaceAbove > spaceBelow;
    setPos({
      ...(dropUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      left: rect.left,
      width: rect.width
    });
  }, []);

  // Clic fuera del desplegable → cerrar. El panel vive en un portal, así que
  // también hay que comprobarlo explícitamente (si no, cerraría antes de
  // procesar el clic sobre una opción).
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        rootRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Recalcular posición al abrir (altura real), con resize y con scroll de
  // cualquier contenedor (capture: true) para que el panel siga al disparador.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    computePosition();
  }, [open, query, computePosition]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => computePosition();
    window.addEventListener('resize', onMove);
    document.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      document.removeEventListener('scroll', onMove, true);
    };
  }, [open, computePosition]);

  const selected = options.find(o => o.value === value) || options[0];
  const showSearch = searchable && options.length > 8;
  const term = query.toLowerCase().trim();
  const visible = term ? options.filter(o => o.label.toLowerCase().includes(term)) : options;

  const toggle = () => {
    setOpen(prev => !prev);
    setQuery('');
  };

  const skin =
    variant === 'default'
      ? `bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-primary ${icon ? 'pl-8' : 'pl-3'} pr-8 py-1.5`
      : '';

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={selected?.label}
        className={`relative w-full flex items-center justify-between gap-2 cursor-pointer transition-colors ${variant === 'default' ? '' : 'text-left'} ${skin} ${buttonClassName}`}
      >
        {icon && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex">
            {icon}
          </span>
        )}
        <span className="truncate">{selected?.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: 'fixed',
              top: pos.top,
              bottom: pos.bottom,
              left: pos.left,
              width: pos.width,
              minWidth: '13rem'
            }}
            className="z-70 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 space-y-0.5 max-h-64 overflow-y-auto animate-fade-in"
          >
            {showSearch && (
              <div className="sticky top-0 bg-white pb-1">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar opción..."
                  autoFocus
                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            {visible.length === 0 && (
              <p className="text-[10px] text-slate-400 text-center py-2 font-medium">
                Sin resultados.
              </p>
            )}

            {visible.map(opt => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  title={opt.label}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    active ? 'bg-primary/10 text-primary font-bold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};
