import React from 'react';
import { Shield, Briefcase, Megaphone, ClipboardList, Crown } from 'lucide-react';
import { Role, ROLE_LABELS } from '../models/roles';

// VISTA: etiqueta visual de un rol. Los textos salen del modelo; aquí solo viven los colores.
const STYLES: Record<Role, { box: string; icon: React.ReactNode }> = {
  super_admin: { box: 'bg-slate-900 text-white', icon: <Crown className="w-3 h-3 text-amber-400" /> },
  admin: { box: 'bg-amber-100 text-amber-900', icon: <Shield className="w-3 h-3 text-amber-600" /> },
  marketing: { box: 'bg-purple-100 text-purple-800', icon: <Megaphone className="w-3 h-3 text-purple-600" /> },
  capturador: { box: 'bg-emerald-100 text-emerald-800', icon: <ClipboardList className="w-3 h-3 text-emerald-600" /> },
  ventas: { box: 'bg-primary/15 text-primary', icon: <Briefcase className="w-3 h-3 text-primary" /> },
};

export const RoleBadge: React.FC<{ role: Role; className?: string }> = ({ role, className = '' }) => (
  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-1 uppercase ${STYLES[role].box} ${className}`}>
    {STYLES[role].icon}
    <span>{ROLE_LABELS[role]}</span>
  </span>
);
