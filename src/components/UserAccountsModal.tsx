import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  UserCheck, 
  Shield, 
  Mail, 
  Phone, 
  Briefcase, 
  Users, 
  Key, 
  Lock, 
  Sparkles, 
  Check, 
  Trash2,
  LogIn,
  Clock,
  Building,
  User,
  ArrowRight,
  Zap,
  Smartphone
} from 'lucide-react';
import { UserRep, Lead, UserRoleType } from '../types';

interface UserAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserRep[];
  currentUser: UserRep;
  onSelectUser: (user: UserRep) => void;
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
  onSelectUser,
  onAddUser,
  onDeleteUser,
  leads = [],
  defaultRoleType = 'executive'
}) => {
  const [activeTab, setActiveTab] = useState<'switch' | 'new_user' | 'manage'>('switch');

  // New user form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(defaultRoleType === 'executive' ? 'Ejecutivo de Cuentas' : 'Administrador del Sistema');
  const [accountType, setAccountType] = useState<UserRoleType>(defaultRoleType);
  const [team, setTeam] = useState('Ventas Latam');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('1234');
  const [selectedColor, setSelectedColor] = useState(defaultRoleType === 'admin' ? AVATAR_COLORS[7] : AVATAR_COLORS[0]);
  const [autoLogin, setAutoLogin] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAccountTypeChange = (type: UserRoleType) => {
    setAccountType(type);
    if (type === 'executive') {
      setRole('Ejecutivo de Cuentas');
      setSelectedColor(AVATAR_COLORS[0]); // Blue
    } else {
      setRole('Administrador del Sistema');
      setSelectedColor(AVATAR_COLORS[7]); // Dark slate
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

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

    const initials = name
      .trim()
      .split(' ')
      .map(p => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const newUser: UserRep = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role.trim(),
      accountType,
      team: team.trim(),
      phone: phone.trim() || undefined,
      pin: pin.trim() || '1234',
      avatar: initials || (accountType === 'admin' ? 'AD' : 'EJ'),
      color: selectedColor.bg,
      createdAt: new Date().toISOString().slice(0, 10),
      lastLogin: 'Hoy, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'active'
    };

    onAddUser(newUser);

    if (autoLogin) {
      onSelectUser(newUser);
      setSuccessMessage(`¡Cuenta de ${newUser.name} creada y conectada con éxito!`);
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } else {
      setSuccessMessage(`¡Cuenta ${newUser.name} (${accountType === 'admin' ? 'Administrador' : 'Ejecutivo'}) agregada correctamente!`);
      // Reset form
      setName('');
      setEmail('');
      setRole(accountType === 'executive' ? 'Ejecutivo de Cuentas' : 'Administrador del Sistema');
      setPhone('');
      setPin('1234');
      setTimeout(() => {
        setSuccessMessage(null);
        setActiveTab('switch');
      }, 1200);
    }
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
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">Cuentas & Perfiles del Sistema</h3>
              <p className="text-xs text-slate-500 font-medium">Administra accesos para Administradores y Ejecutivos de Cuentas</p>
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
            <button
              onClick={() => setActiveTab('switch')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'switch'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Cambiar de Cuenta ({users.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('new_user')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'new_user'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Crear Nueva Cuenta</span>
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'manage'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
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

          {/* TAB 1: SWITCH ACCOUNT / LOGIN */}
          {activeTab === 'switch' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-medium">
                Selecciona la cuenta con la que deseas operar. Los <strong>Ejecutivos de Cuentas</strong> tienen un menú simplificado enfocado en captura rápida, mientras que el <strong>Administrador</strong> tiene acceso completo a métricas y configuraciones.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const count = getUserLeadsCount(u.name);
                  const isAdmin = u.accountType === 'admin' || u.role.toLowerCase().includes('admin');

                  return (
                    <div
                      key={u.id}
                      onClick={() => {
                        onSelectUser(u);
                        setSuccessMessage(`Sesión iniciada como ${u.name} (${isAdmin ? 'Administrador' : 'Ejecutivo'})`);
                        setTimeout(() => {
                          setSuccessMessage(null);
                          onClose();
                        }, 800);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-400/30'
                          : 'border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isAdmin 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isAdmin ? <Shield className="w-3 h-3 text-amber-400" /> : <Briefcase className="w-3 h-3 text-emerald-600" />}
                          <span>{isAdmin ? 'ADMINISTRADOR' : 'EJECUTIVO DE CUENTAS'}</span>
                        </span>

                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-extrabold flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Sesión Actual</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-2xl ${u.color || (isAdmin ? 'bg-slate-900' : 'bg-blue-600')} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs ring-2 ring-white`}>
                          {u.avatar}
                        </div>
                        <div className="min-w-0 pr-2">
                          <h4 className="font-bold text-sm text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {u.name}
                          </h4>
                          <p className="text-xs text-slate-500 truncate font-medium">{u.role}</p>
                          <p className="text-[11px] text-slate-400 truncate">{u.team}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">
                          <strong className="text-slate-800 font-bold">{count}</strong> leads capturados
                        </span>
                        <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform text-[11px]">
                          {isCurrent ? 'Activo' : 'Ingresar'}
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 flex justify-center">
                <button
                  onClick={() => {
                    handleAccountTypeChange('executive');
                    setActiveTab('new_user');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Crear Cuenta de Ejecutivo de Cuentas</span>
                </button>
              </div>
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

              {/* Perfil Selection Cards (Admin vs Ejecutivo) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Tipo de Perfil / Rol del Usuario <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Option 1: Ejecutivo de Cuentas */}
                  <div
                    onClick={() => handleAccountTypeChange('executive')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      accountType === 'executive'
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-xs text-slate-900">Ejecutivo de Cuentas</span>
                      </div>
                      {accountType === 'executive' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      <strong>Menú simple y ágil</strong>: Solo captura rápida, escaneo de tarjetas/QR y sus propios prospectos. Sin pantallas complejas.
                    </p>
                  </div>

                  {/* Option 2: Administrador */}
                  <div
                    onClick={() => handleAccountTypeChange('admin')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      accountType === 'admin'
                        ? 'border-slate-900 bg-slate-50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <span className="font-bold text-xs text-slate-900">Administrador</span>
                      </div>
                      {accountType === 'admin' && <Check className="w-4 h-4 text-slate-900" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      <strong>Control total</strong>: Acceso a eventos, gestión de cuentas de ejecutivos, analítica completa y configuraciones.
                    </p>
                  </div>

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
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      placeholder={accountType === 'executive' ? 'Ej. Ejecutivo de Cuentas Senior' : 'Ej. Administrador General'}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Equipo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Equipo / Sede
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <select
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="Ventas Latam">Ventas Latam</option>
                      <option value="Ventas Stand Principal">Ventas Stand Principal</option>
                      <option value="Ventas Bogotá">Ventas Bogotá</option>
                      <option value="Ventas Medellín">Ventas Medellín</option>
                      <option value="Ventas Cali">Ventas Cali</option>
                      <option value="Dirección General">Dirección General</option>
                      <option value="Consultoría IA">Consultoría IA</option>
                    </select>
                  </div>
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
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* PIN / Password de acceso rápido */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    PIN / Clave de Acceso Rápido
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="1234"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              {/* Auto login switch */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoLoginCheckbox"
                  checked={autoLogin}
                  onChange={(e) => setAutoLogin(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-md border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="autoLoginCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Iniciar sesión automáticamente con esta cuenta tras crearla
                </label>
              </div>

              {/* Submit CTA */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('switch')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 ${
                    accountType === 'admin' ? 'bg-slate-900 hover:bg-black shadow-slate-900/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Crear Cuenta de {accountType === 'admin' ? 'Administrador' : 'Ejecutivo'}</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 3: MANAGE USERS */}
          {activeTab === 'manage' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 font-medium mb-2">
                Lista completa de usuarios registrados. Puedes eliminar perfiles obsoletos o ver sus estadísticas.
              </div>

              <div className="space-y-2">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const count = getUserLeadsCount(u.name);
                  const isAdmin = u.accountType === 'admin' || u.role.toLowerCase().includes('admin');

                  return (
                    <div
                      key={u.id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${u.color || 'bg-blue-600'} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                          {u.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-xs text-slate-900 truncate">{u.name}</h4>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                              isAdmin ? 'bg-slate-900 text-white' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {isAdmin ? 'ADMIN' : 'EJECUTIVO'}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                Tu sesión
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{u.email} • {u.team} • {count} leads</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isCurrent && (
                          <button
                            onClick={() => {
                              onSelectUser(u);
                              setSuccessMessage(`Sesión cambiada a ${u.name}`);
                              setTimeout(() => {
                                setSuccessMessage(null);
                                onClose();
                              }, 600);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Entrar
                          </button>
                        )}
                        {onDeleteUser && users.length > 1 && !isCurrent && (
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

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveTab('new_user')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Agregar Otro Usuario</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
