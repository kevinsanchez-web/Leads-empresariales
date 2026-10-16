import React, { useEffect, useRef, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Phone, 
  Clock, 
  Search, 
  ArrowRight, 
  Check,
  ChevronDown,
  Trash2,
  UserCheck,
  Briefcase,
  X
} from 'lucide-react';
import { UserRep, Lead, UserRoleType } from '../types';
import { RoundedSelect } from './RoundedSelect';

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
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú de "Crear Usuario" al hacer clic fuera
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

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
    <div className="w-full min-w-0 max-w-7xl mx-auto flex flex-col flex-1">
      {/* Contenedor Único Integrado de Alto Completo */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex-1 flex flex-col min-w-0">
        
        {/* 1. Encabezado y Acciones */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Equipo Comercial & Administradores</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Accesos y roles del equipo.</p>
          </div>

          <div className="relative shrink-0 self-start sm:self-auto" ref={createMenuRef}>
            <button
              type="button"
              onClick={() => setShowCreateMenu(prev => !prev)}
              className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Crear Usuario</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCreateMenu ? 'rotate-180' : ''}`} />
            </button>

            {showCreateMenu && (
              <div className="absolute right-0 mt-2 min-w-[210px] bg-white rounded-xl border border-slate-200 shadow-xl p-1 z-20">
                <button
                  type="button"
                  onClick={() => { setShowCreateMenu(false); onOpenAddUserModal('executive'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-left"
                >
                  <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Ejecutivo de Cuentas</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateMenu(false); onOpenAddUserModal('admin'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer text-left"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Administrador</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Tarjetas de Rol: funcionan como filtro interactivo */}
        <div className="p-3.5 sm:p-4 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setRoleFilter(prev => prev === 'executive' ? 'all' : 'executive')}
            aria-pressed={roleFilter === 'executive'}
            className={`text-left w-full bg-white rounded-xl p-3 border flex items-start gap-3 shadow-2xs cursor-pointer transition-all ${
              roleFilter === 'executive'
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-slate-200/70 hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="font-bold text-xs text-slate-900">Ejecutivos de Cuentas</span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-primary/10 text-primary border border-primary/15">
                  {executiveCount} Activos
                </span>
                {roleFilter === 'executive' && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                Captura ágil de leads.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setRoleFilter(prev => prev === 'admin' ? 'all' : 'admin')}
            aria-pressed={roleFilter === 'admin'}
            className={`text-left w-full bg-white rounded-xl p-3 border flex items-start gap-3 shadow-2xs cursor-pointer transition-all ${
              roleFilter === 'admin'
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-slate-200/70 hover:border-slate-300'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="font-bold text-xs text-slate-900">Administradores</span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-amber-50 text-amber-700 border border-amber-200/50">
                  {adminCount} Activos
                </span>
                {roleFilter === 'admin' && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                Acceso total al panel.
              </p>
            </div>
          </button>
        </div>

        {/* 3. Barra de Búsqueda y Filtros */}
        <div className="p-3 bg-slate-50/30 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, cargo, correo o equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200/90 rounded-xl text-base sm:text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {(roleFilter !== 'all' || teamFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setRoleFilter('all'); setTeamFilter('all'); }}
                className="px-2.5 py-1.5 bg-white border border-slate-200/80 rounded-xl text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:border-slate-300 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <X className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            )}

            <RoundedSelect
              variant="bare"
              value={teamFilter}
              onChange={setTeamFilter}
              ariaLabel="Filtrar por sede o equipo"
              className="min-w-0"
              buttonClassName="px-2.5 py-1.5 bg-white border border-slate-200/90 rounded-xl text-base sm:text-[11px] font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary pr-7"
              options={[
                { value: 'all', label: `Sedes / Equipos (${teams.length})` },
                ...teams.map(t => ({ value: t, label: t }))
              ]}
            />
          </div>
        </div>

        {/* 4. Cuerpo Principal (Abarca todo el espacio vertical restante) */}
        <div className="p-4 flex-1 flex flex-col justify-start min-w-0">
          {filteredUsers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-3 border border-slate-100">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-bold text-slate-800">No se encontraron usuarios</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Intenta cambiar los filtros o el término de búsqueda.</p>
              <button
                type="button"
                onClick={() => onOpenAddUserModal('executive')}
                className="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-98"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{users.length === 0 ? 'Crear primer usuario' : 'Crear usuario'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredUsers.map((user) => {
                const isCurrent = user.id === currentUser.id;
                const isAdmin = user.accountType === 'admin' || user.role.toLowerCase().includes('admin');
                const stats = getUserMetrics(user.name);

                return (
                  <div
                    key={user.id}
                    className={`bg-slate-50/50 hover:bg-slate-100/50 rounded-2xl border p-4 flex flex-col justify-between transition-all relative overflow-hidden shadow-2xs ${
                      isCurrent 
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                        : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute top-0 right-0 bg-primary text-white text-[9px] font-extrabold px-2.5 py-0.5 rounded-bl-lg flex items-center gap-1">
                        <UserCheck className="w-2.5 h-2.5" />
                        <span>SESIÓN ACTIVA</span>
                      </div>
                    )}

                    <div>
                      {/* Encabezado Tarjeta */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl ${user.color || (isAdmin ? 'bg-amber-600' : 'bg-primary')} text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs`}>
                          {user.avatar}
                        </div>
                        <div className="min-w-0 pr-10">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md flex items-center gap-1 ${
                              isAdmin 
                                ? 'bg-amber-50 text-amber-700 border border-amber-200/60' 
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}>
                              {isAdmin ? <Shield className="w-2.5 h-2.5 text-amber-600" /> : <Briefcase className="w-2.5 h-2.5 text-primary" />}
                              <span>{isAdmin ? 'ADMINISTRADOR' : 'EJECUTIVO'}</span>
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-slate-900 truncate leading-tight">
                            {user.name}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">{user.role}</p>
                          <span className="inline-block mt-1 px-1.5 py-0.2 bg-white text-slate-600 rounded-md text-[9px] font-bold border border-slate-200/60">
                            {user.team}
                          </span>
                        </div>
                      </div>

                      {/* Datos de Contacto */}
                      <div className="space-y-1 py-2.5 border-y border-slate-200/60 text-[11px] text-slate-600">
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
                        <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>Último acceso: {user.lastLogin || 'Hoy'}</span>
                        </div>
                      </div>

                      {/* Resumen Métricas */}
                      <div className="grid grid-cols-3 gap-1.5 my-3 text-center">
                        <div className="bg-white rounded-xl p-1.5 border border-slate-200/60">
                          <div className="text-sm font-bold text-slate-900">{stats.total}</div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Leads</div>
                        </div>
                        <div className="bg-emerald-50/80 rounded-xl p-1.5 border border-emerald-100">
                          <div className="text-sm font-bold text-emerald-700">{stats.qualified}</div>
                          <div className="text-[9px] font-bold text-emerald-600 uppercase">Calific.</div>
                        </div>
                        <div className="bg-amber-50/80 rounded-xl p-1.5 border border-amber-100">
                          <div className="text-sm font-bold text-amber-700">{stats.priority}</div>
                          <div className="text-[9px] font-bold text-amber-600 uppercase">Priorit.</div>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="pt-1 flex items-center justify-between gap-1.5">
                      {isCurrent ? (
                        <div className="w-full py-1.5 bg-primary/10 text-primary font-bold text-[11px] rounded-xl text-center border border-primary/20 flex items-center justify-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          <span>Sesión Actual ({isAdmin ? 'Admin' : 'Ejecutivo'})</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => onSelectUser(user)}
                          className={`flex-1 py-1.5 text-white rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 shadow-2xs cursor-pointer ${
                            isAdmin ? 'bg-slate-800 hover:bg-slate-900' : 'bg-primary hover:bg-primary-hover'
                          }`}
                        >
                          <span>Iniciar Sesión como {isAdmin ? 'Admin' : 'Ejecutivo'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      {onDeleteUser && users.length > 1 && !isCurrent && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Estás seguro de eliminar la cuenta de ${user.name}?`)) {
                              onDeleteUser(user.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};