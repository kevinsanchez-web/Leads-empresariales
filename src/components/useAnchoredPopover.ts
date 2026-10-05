import { CSSProperties, RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const GAP = 8;
const VIEWPORT_MARGIN = 8;

export interface AnchoredPopover {
  anchorRef: RefObject<HTMLButtonElement | null>;
  popupRef: RefObject<HTMLDivElement | null>;
  popupStyle: CSSProperties;
}

export interface AnchoredPopoverOptions {
  /** Alto aproximado, para decidir si el popup cabe debajo del botón. */
  height: number;
  /** Ancho fijo del popup. Se declara en vez de medirse: antes de aplicar
   *  `position: fixed` el div es un bloque y se estiraría al ancho del body. */
  width: number;
  /**
   * Centra el popup sobre el botón cuando es más angosto que él. Un desplegable
   * angosto alineado a la izquierda se ve descuadrado bajo un campo ancho.
   */
  center?: boolean;
  /**
   * Alineación horizontal respecto al botón. `right` es lo natural para un menú
   * de la esquina superior derecha: con `left` el popup se ancla al borde izquierdo
   * de un botón angosto y, al clamparse contra la ventana, queda desplazado.
   */
  align?: 'left' | 'right';
}

/**
 * Posiciona un popup con `position: fixed` anclado a un botón y lo mantiene
 * pegado a él mientras se hace scroll.
 *
 * El popup se monta en un portal sobre `body` porque los formularios viven
 * dentro de contenedores `overflow-y-auto` que lo recortarían. Por eso hay que
 * recalcular en cada scroll: se escucha en fase capture para capturar también
 * los scrolls de los contenedores intermedios, que no burbujean a `window`.
 */
export function useAnchoredPopover(
  open: boolean,
  onClose: () => void,
  { height, width, center = false, align = 'left' }: AnchoredPopoverOptions
): AnchoredPopover {
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({ visibility: 'hidden' });

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - GAP;
    const flipAbove = spaceBelow < height && rect.top > spaceBelow;
    const desiredLeft = center
      ? rect.left + (rect.width - width) / 2
      : align === 'right'
        ? rect.right - width
        : rect.left;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, desiredLeft),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
    );

    setPopupStyle({
      position: 'fixed',
      left,
      top: flipAbove ? undefined : rect.bottom + GAP,
      bottom: flipAbove ? window.innerHeight - rect.top + GAP : undefined,
      width,
      visibility: 'visible'
    });
  }, [height, width, center, align]);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popupRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, onClose, reposition]);

  // Al cerrarse, el foco vuelve al botón para no perder el hilo del teclado.
  useEffect(() => {
    if (wasOpenRef.current && !open) anchorRef.current?.focus();
    wasOpenRef.current = open;
  }, [open]);

  return { anchorRef, popupRef, popupStyle };
}
