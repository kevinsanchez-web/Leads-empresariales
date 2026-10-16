import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  Shield, 
  Mail, 
  Phone, 
  Briefcase, 
  Users, 
  Key, 
  Sparkles, 
  Check, 
  Trash2,
  Clock,
  Building,
  User,
  Zap,
  Smartphone
} from 'lucide-react';
import { UserRep, Lead, UserRoleType } from '../types';
import { RoleBadge } from './RoleBadge';
import { userIdFromEmail } from '../controllers/sessionController';
import { useAccess, resolveRole } from '../controllers/accessController';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, Role } from '../models/roles';
import { RoundedSelect } from './RoundedSelect';

interface UserAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserRep[];
  currentUser: UserRep;
  onAddUser: (newUser: UserRep) => void;
  onDeleteUser?: (userId: string) => void;
  leads?: Lead[];
  defaultRoleType?: UserRoleType;
}

const AVATAR_COLORS = [
  { id: 'blue', label: 'Azul', bg: 'bg-blue-600', ring: 'ring-blue-400' },
  { id: 'emerald', label: 'Verde', bg: 'bg-emerald-600', ring: 'ring-emerald-400' },
  { id: 'purple', label: 'Púrpura', bg: 'bg-purple-600', ring: 'ring-purple-400' },
  { id: 'amber', label: 'Ámbar', bg: 'bg-amber-600', ring: 'ring-amber-400' },
  { id: 'rose', label: 'Rosa', bg: 'bg-rose-600', ring: 'ring-rose-400' },
  { id: 'indigo', label: 'Índigo', bg: 'bg-indigo-600', ring: 'ring-indigo-400' },
  { id: 'teal', label: 'Teal', bg: 'bg-teal-600', ring: 'ring-teal-400' },
  { id: 'slate', label: 'Gris Oscuro', bg: 'bg-slate-900', ring: 'ring-slate-500' }
];

export const UserAccountsModal: React.FC<UserAccountsModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onAddUser,
  onDeleteUser,
  leads = [],
  defaultRoleType = 'ventas'
}) => {
  const access = useAccess(currentUser);
  const canCreate = access.can('users.manage') && access.assignableRoles.length > 0;
  const [activeTab, setActiveTab] = useState<'new_user' | 'manage'>('manage');

  // New user form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(ROLE_LABELS[defaultRoleType]);
  const [accountType, setAccountType] = useState<UserRoleType>(defaultRoleType);
  const [team, setTeam] = useState('Ventas Latam');
  const [phone, setPhone] = useState('');
  const [selectedColor, setSelectedColor] = useState(defaultRoleType === 'admin' ? AVATAR_COLORS[7] : AVATAR_COLORS[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAccountTypeChange = (type: UserRoleType) => {
    setAccountType(type);
    setRole(ROLE_LABELS[type]);
    setSelectedColor(type === 'admin' ? AVATAR_COLORS[7] : AVATAR_COLORS[0]);
  };

  const handleCreateUser = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    if (!access.assignableRoles.includes(accountType)) {
      setFormError('Tu rol no permite crear cuentas con ese perfil.');
      return;
    }
    if (!name.trim()) {
      setFormError('Por favor ingresa el nombre completo del usuario.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!role.trim()) {
      setFormError('Por favor ingresa el cargo o rol comercial.');
      return;
    }

    if (users.some(u => userIdFromEmail(u.email) === userIdFromEmail(email))) {
      setFormError('Ya existe un usuario con ese correo.');
      return;
    }

    const initials = name
      .trim()
      .split(' ')
      .map(p => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const newUser: UserRep = {
      id: userIdFromEmail(email),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role.trim(),
      accountType,
      team: team.trim(),
      phone: phone.trim() || undefined,
      avatar: initials || ROLE_LABELS[accountType].slice(0, 2).toUpperCase(),
      color: selectedColor.bg,
      createdAt: new Date().toISOString().slice(0, 10),
      lastLogin: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'active'
    };

    onAddUser(newUser);

    setSuccessMessage(`¡${newUser.name} (${ROLE_LABELS[accountType]}) fue dado de alta! Ya puede iniciar sesión con ${newUser.email}.`);
    setName('');
    setEmail('');
    setRole(ROLE_LABELS[accountType]);
    setPhone('');
    setTimeout(() => {
      setSuccessMessage(null);
      setActiveTab('manage');
    }, 1600);
  };

  const getUserLeadsCount = (userName: string) => {
    return leads.filter(l => l.capturedBy === userName).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-bold shadow-md shadow-primary/25">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">Cuentas & Perfiles del Sistema</h3>
              <p className="text-xs text-slate-500 font-medium">Administra accesos según el rol de cada persona</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-slate-100 flex items-center justify-between bg-white overflow-x-auto">
          <div className="flex items-center gap-2">
            {canCreate && <button
              onClick={() => setActiveTab('new_user')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'new_user'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Dar de alta a un usuario</span>
            </button>}
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'manage'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Administrar Equipo</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* Success Banner */}
          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 2: ADD NEW USER FORM */}
          {activeTab === 'new_user' && (
            <form onSubmit={handleCreateUser} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                  {formError}
                </div>
              )}

              {/* Selección de rol: solo los que el rol actual puede asignar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Tipo de Perfil / Rol del Usuario <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {access.assignableRoles.map((r: Role) => (
                    <div
                      key={r}
                      onClick={() => handleAccountTypeChange(r)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        accountType === r
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <RoleBadge role={r} />
                        {accountType === r && <Check className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{ROLE_DESCRIPTIONS[r]}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Nombre completo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ej. Mateo Gómez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                {/* Correo corporativo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="mateo.gomez@divergency.ai"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                {/* Cargo / Rol */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cargo / Título Comercial <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={`Ej. ${ROLE_LABELS[accountType]} Senior`}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                {/* Equipo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Equipo / Sede
                  </label>
                  <RoundedSelect
                    variant="bare"
                    value={team}
                    onChange={setTeam}
                    ariaLabel="Equipo / sede"
                    icon={<Building className="w-4 h-4 text-slate-400" />}
                    buttonClassName="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    options={[
                      { value: 'Ventas Latam', label: 'Ventas Latam' },
                      { value: 'Ventas Stand Principal', label: 'Ventas Stand Principal' },
                      { value: 'Ventas Bogotá', label: 'Ventas Bogotá' },
                      { value: 'Ventas Medellín', label: 'Ventas Medellín' },
                      { value: 'Ventas Cali', label: 'Ventas Cali' },
                      { value: 'Dirección General', label: 'Dirección General' },
                      { value: 'Consultoría IA', label: 'Consultoría IA' }
                    ]}
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono Móvil
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+57 300 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

              </div>

              {/* Color del Avatar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Color de Identificación
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center text-white transition-transform cursor-pointer ${
                        selectedColor.id === c.id ? `ring-3 ${c.ring} scale-110 shadow-sm` : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {selectedColor.id === c.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('manage')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 bg-primary hover:bg-primary-hover shadow-primary/25"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Crear Cuenta de {ROLE_LABELS[accountType]}</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 3: MANAGE USERS */}
          {activeTab === 'manage' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-medium mb-2">
                Personas dadas de alta en la app. Cada una inicia sesión con su correo (Google, o correo y contraseña) y ve lo que su rol permite.
              </div>

              <div className="space-y-2">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const count = getUserLeadsCount(u.name);
                  const userRole = resolveRole(u);
                  const canManage = access.canManageUser(u);

                  return (
                    <div
                      key={u.id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${u.color || 'bg-primary'} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                          {u.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-slate-900 truncate">{u.name}</h4>
                            <RoleBadge role={userRole} />
                            {isCurrent && (
                              <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                                Tu sesión
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{u.email} • {u.team} • {count} leads</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {onDeleteUser && users.length > 1 && !isCurrent && canManage && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Eliminar la cuenta de ${u.name}?`)) {
                                onDeleteUser(u.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

              {canCreate && <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveTab('new_user')}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Agregar Otro Usuario</span>
                </button>
              </div>}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
