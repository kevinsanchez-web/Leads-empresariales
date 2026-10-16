import React from 'react';
import { DivergencyLogo } from './DivergencyLogo';
import { logout } from '../controllers/authController';

// VISTA: la cuenta inició sesión, pero ningún administrador la ha dado de alta en la app.
export const NoAccessScreen: React.FC<{ email: string | null }> = ({ email }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
    <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 p-8 flex flex-col items-center text-center gap-5">
      <DivergencyLogo />
      <div>
        <h1 className="text-lg font-extrabold text-slate-900">Tu cuenta aún no tiene acceso</h1>
        <p className="text-sm text-slate-500 mt-1">
          {email ? <span className="font-bold text-slate-800">{email}</span> : 'Tu cuenta'} no está dada de alta en esta
          aplicación. Pide a un administrador que te invite con tu correo.
        </p>
      </div>
      <button
        onClick={() => logout()}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-4 py-3 rounded-2xl transition-colors cursor-pointer"
      >
        Cerrar sesión
      </button>
    </div>
  </div>
);
