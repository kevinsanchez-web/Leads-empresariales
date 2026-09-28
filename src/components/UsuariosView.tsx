import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Phone, 
  CheckCircle2, 
  Clock, 
  Search, 
  Building, 
  ArrowRight, 
  Sparkles, 
  Trash2, 
  Lock, 
  UserCheck,
  Briefcase,
  Zap,
  Smartphone,
  Eye
} from 'lucide-react';
import { UserRep, Lead, UserRoleType } from '../types';

interface UsuariosViewProps {
  users: UserRep[];
  currentUser: UserRep;
  onSelectUser: (user: UserRep) => void;
  onAddUser: (newUser: UserRep) => void;
  onDeleteUser?: (userId: string) => void;
  leads: Lead[];
  onOpenAddUserModal: (roleType?: UserRoleType) => void;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  users,
  currentUser,
  onSelectUser,
  onAddUser,
  onDeleteUser,
  leads,
  onOpenAddUserModal
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'executive' | 'admin'>('all');
  const [teamFilter, setTeamFilter] = useState('all');

  const filteredUsers = users.filter((u) => {
    const isAdmin = u.accountType === 'admin' || u.role.toLowerCase().includes('admin');
    if (roleFilter === 'executive' && isAdmin) return false;
    if (roleFilter === 'admin' && !isAdmin) return false;
    if (teamFilter !== 'all' && u.team !== teamFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.team.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const teams = Array.from(new Set(users.map(u => u.team)));
  const executiveCount = users.filter(u => u.accountType !== 'admin' && !u.role.toLowerCase().includes('admin')).length;
  const adminCount = users.filter(u => u.accountType === 'admin' || u.role.toLowerCase().includes('admin')).length;

  const getUserMetrics = (userName: string) => {
    const userLeads = leads.filter(l => l.capturedBy === userName);
    const qualified = userLeads.filter(l => l.status === 'Calificado' || l.status === 'Reunión Agendada' || l.status === 'Ganado').length;
    const priority = userLeads.filter(l => l.priority).length;
    return {
      total: userLeads.length,
      qualified,
      priority
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-slate-900" />
            <span className="text-slate-900">Gestión de Cuentas & Roles</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Equipo Comercial & Administradores</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5 max-w-2xl">
            Crea cuentas para los <strong>Ejecutivos de Cuentas</strong> (quienes disfrutarán de una interfaz simplificada para captura ágil de leads) y administra los perfiles con acceso total de <strong>Administrador</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onOpenAddUserModal('executive')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Crear Cuenta de Ejecutivo</span>
          </button>

          <button
            onClick={() => onOpenAddUserModal('admin')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-bold shadow-md shadow-slate-900/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shrink-0"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>+ Crear Administrador</span>
          </button>
        </div>
      </div>

      {/* Role Comparison Explanatory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Ejecutivo Card */}
        <div className="bg-gradient-to-br from-blue-50/60 to-white rounded-3xl p-4 sm:p-5 border border-blue-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0 shadow-md shadow-blue-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm text-slate-900">Perfil: Ejecutivo de Cuentas</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {executiveCount} Activos
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              ⚡ <strong>Menú simplificado y sin distracciones</strong>: Diseñado para capturar prospectos a máxima velocidad durante el evento. Tiene acceso a Escáner IA de Tarjetas, Escáner QR, notas de voz, Formulario Rápido y su lista personal de leads.
            </p>
          </div>
        </div>

        {/* Administrador Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-4 sm:p-5 border border-slate-700 flex items-start gap-4 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-white/10 text-amber-400 flex items-center justify-center font-black shrink-0 ring-1 ring-white/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm text-white">Perfil: Administrador</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white">
                {adminCount} Activos
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              🛡️ <strong>Acceso y control total</strong>: Creación y gestión de cuentas de ejecutivos, creación de ferias/eventos, panel analítico global, reporte financiero de pipeline, exportación de bases de datos y configuración del sistema.
            </p>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar usuario por nombre, cargo, correo o equipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs placeholder:text-slate-400"
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              roleFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('executive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              roleFilter === 'executive' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3 h-3 text-blue-600" />
            <span>Ejecutivos ({executiveCount})</span>
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              roleFilter === 'admin' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3 h-3 text-amber-500" />
            <span>Admins ({adminCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las Sedes / Equipos ({teams.length})</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.map((user) => {
          const isCurrent = user.id === currentUser.id;
          const isAdmin = user.accountType === 'admin' || user.role.toLowerCase().includes('admin');
          const stats = getUserMetrics(user.name);

          return (
            <div
              key={user.id}
              className={`bg-white rounded-3xl border p-5 flex flex-col justify-between transition-all relative overflow-hidden shadow-2xs ${
                isCurrent 
                  ? 'border-blue-500 ring-2 ring-blue-400/30 bg-gradient-to-b from-blue-50/30 to-white' 
                  : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-xs">
                  <UserCheck className="w-3 h-3" />
                  <span>SESIÓN ACTIVA</span>
                </div>
              )}

              <div>
                {/* User Top Info */}
                <div className="flex items-start gap-3.5 mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${user.color || (isAdmin ? 'bg-slate-900' : 'bg-blue-600')} text-white font-black text-base flex items-center justify-center shrink-0 shadow-md shadow-slate-200 ring-2 ring-white`}>
                    {user.avatar}
                  </div>
                  <div className="min-w-0 pr-14">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isAdmin 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {isAdmin ? <Shield className="w-3 h-3 text-amber-400" /> : <Briefcase className="w-3 h-3 text-blue-600" />}
                        <span>{isAdmin ? 'ADMINISTRADOR' : 'EJECUTIVO DE CUENTAS'}</span>
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 truncate leading-tight">
                      {user.name}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 truncate mt-0.5">{user.role}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                      {user.team}
                    </span>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-1.5 py-3 border-y border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Último acceso: {user.lastLogin || 'Hoy'}</span>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 my-4 text-center">
                  <div className="bg-slate-50 rounded-2xl p-2 border border-slate-100">
                    <div className="text-base font-black text-slate-900">{stats.total}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Leads</div>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl p-2 border border-emerald-100">
                    <div className="text-base font-black text-emerald-700">{stats.qualified}</div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase">Calificados</div>
                  </div>
                  <div className="bg-amber-50 rounded-2xl p-2 border border-amber-100">
                    <div className="text-base font-black text-amber-700">{stats.priority}</div>
                    <div className="text-[10px] font-bold text-amber-600 uppercase">Prioritarios</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-2">
                {isCurrent ? (
                  <div className="w-full py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl text-center border border-blue-200 flex items-center justify-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Sesión Actual ({isAdmin ? 'Admin' : 'Ejecutivo'})</span>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectUser(user)}
                    className={`flex-1 py-2 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                      isAdmin ? 'bg-slate-900 hover:bg-black' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    <span>Iniciar Sesión como {isAdmin ? 'Admin' : 'Ejecutivo'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {onDeleteUser && users.length > 1 && !isCurrent && (
                  <button
                    onClick={() => {
                      if (confirm(`¿Estás seguro de eliminar la cuenta de ${user.name}?`)) {
                        onDeleteUser(user.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Eliminar usuario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
