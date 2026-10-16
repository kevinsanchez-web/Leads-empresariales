import React from 'react';
import { USING_EMULATORS } from '../firebase';

// Aviso fijo para no confundir los datos locales con los reales. No se pinta fuera del modo emuladores.
export const EmulatorBadge: React.FC = () =>
  USING_EMULATORS ? (
    <div className="fixed bottom-2 left-2 z-100 px-2 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase tracking-wide shadow-md pointer-events-none">
      Emuladores locales
    </div>
  ) : null;
