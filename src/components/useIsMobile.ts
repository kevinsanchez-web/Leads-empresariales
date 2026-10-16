import { useEffect, useState } from 'react';

/** Breakpoint móvil: coincide con el `md:` de Tailwind (768px). */
const MOBILE_QUERY = '(max-width: 767px)';

/**
 * `true` cuando la ventana tiene menos de 768px de ancho (móvil).
 * Se mantiene sincronizado al cambiar el tamaño de la ventana.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_QUERY).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
