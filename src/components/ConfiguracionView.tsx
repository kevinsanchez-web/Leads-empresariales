import React, { useState } from 'react';
import { 
  User, 
  Building, 
  LogOut, 
  ChevronRight, 
  ShieldCheck, 
  Calendar, 
  Bell, 
  Database,
  Mail,
  Smartphone,
  Check,
  Sparkles,
  Palette,
  CheckCircle2
} from 'lucide-react';
import { UserRep, EventOption, AccentTheme } from '../types';
import { DivergencyLogo } from './DivergencyLogo';
import { hasContact, displayContact } from '../utils/contactInfo';

interface ConfiguracionViewProps {
  currentUser: UserRep;
  users: UserRep[];
  onSelectUser: (user: UserRep) => void;
  onOpenUserAccountsModal: () => void;
  currentEvent: EventOption;
  onOpenCreateEventModal: () => void;
  onNavigateToView: (view: any) => void;
  activeTheme?: AccentTheme;
  onChangeTheme?: (theme: AccentTheme) => void;
}

const THEME_OPTIONS: Array<{
  id: AccentTheme;
  name: string;
  subtitle: string;
  hex: string;
  gradient: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
}> = [
  {
    id: 'azul',
    name: 'Azul',
    subtitle: 'Divergency Clásico',
    hex: '#0071E3',
    gradient: 'from-[#0071E3] to-[#5856D6]',
    bgLight: 'bg-blue-50/80',
    textColor: 'text-[#0071E3]',
    borderColor: 'border-[#0071E3]'
  },
  {
    id: 'verde',
    name: 'Verde',
    subtitle: 'Esmeralda & Deals',
    hex: '#10B981',
    gradient: 'from-[#10B981] to-[#059669]',
    bgLight: 'bg-emerald-50/80',
    textColor: 'text-[#10B981]',
    borderColor: 'border-[#10B981]'
  },
  {
    id: 'naranja',
    name: 'Naranja',
    subtitle: 'Solar / Dinamismo',
    hex: '#F97316',
    gradient: 'from-[#F97316] to-[#E11D48]',
    bgLight: 'bg-orange-50/80',
    textColor: 'text-[#F97316]',
    borderColor: 'border-[#F97316]'
  },
  {
    id: 'purpura',
    name: 'Púrpura',
    subtitle: 'Inteligencia Artificial',
    hex: '#8B5CF6',
    gradient: 'from-[#8B5CF6] to-[#6366F1]',
    bgLight: 'bg-purple-50/80',
    textColor: 'text-[#8B5CF6]',
    borderColor: 'border-[#8B5CF6]'
  }
];

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  currentUser,
  users,
  onSelectUser,
  onOpenUserAccountsModal,
  currentEvent,
  onOpenCreateEventModal,
  onNavigateToView,
  activeTheme = 'azul',
  onChangeTheme
}) => {
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [sessionClosed, setSessionClosed] = useState(false);

  const handleLogout = () => {
    // If logout is tapped, switch to another account or confirm
    if (window.confirm('¿Deseas cerrar la sesión activa actual?')) {
      setSessionClosed(true);
      setTimeout(() => {
        // Reset to first executive or show switch
        setShowSwitchModal(true);
        setSessionClosed(false);
      }, 400);
    }
  };

  const selectedThemeConfig = THEME_OPTIONS.find(t => t.id === activeTheme) || THEME_OPTIONS[0];

  return (
    <div className="space-y-4 animate-fade-in max-w-lg mx-auto pb-6">
      
      {/* Header Title */}
      <div className="px-1 pt-1 pb-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D1D1F] tracking-tight">
          Configuración
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Personaliza tu experiencia, tema y accesos
        </p>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-3xl p-5 border border-black/[0.06] shadow-xs flex items-center gap-4">
        {/* Avatar Circle */}
        <div 
          style={{ backgroundColor: selectedThemeConfig.hex }}
          className="w-16 h-16 rounded-full text-white font-bold text-xl flex items-center justify-center shadow-xs shrink-0 transition-colors"
        >
          {currentUser.avatar}
        </div>

        {/* User Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#1D1D1F] truncate">
              {currentUser.name}
            </h2>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
              currentUser.accountType === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
            }`}>
              {currentUser.accountType === 'admin' ? 'Admin' : 'Ejecutivo'}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 truncate">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{currentUser.email}</span>
          </div>
          
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {currentUser.team} • {currentUser.role}
          </div>
        </div>
      </div>

      {/* NEW: Accent Color & Theme Selector Card */}
      <div id="theme-selector-section" className="bg-white rounded-3xl p-5 border border-black/[0.06] shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div 
              style={{ backgroundColor: `${selectedThemeConfig.hex}18`, color: selectedThemeConfig.hex }}
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-2xs"
            >
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1D1D1F] leading-tight flex items-center gap-1.5">
                Color de Acento y Tema
                <Sparkles className="w-3 h-3" style={{ color: selectedThemeConfig.hex }} />
              </h2>
              <p className="text-[11px] text-slate-400 leading-tight">
                Personaliza los colores de botones, resaltados y métricas
              </p>
            </div>
          </div>

          <span 
            style={{ 
              backgroundColor: `${selectedThemeConfig.hex}15`, 
              color: selectedThemeConfig.hex,
              borderColor: `${selectedThemeConfig.hex}30`
            }}
            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0"
          >
            {selectedThemeConfig.name}
          </span>
        </div>

        {/* 4 Theme Color Grid */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = activeTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onChangeTheme?.(theme.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden active:scale-97 flex flex-col justify-between ${
                  isSelected 
                    ? `bg-slate-50/90 shadow-xs ring-2` 
                    : 'bg-white hover:bg-slate-50/60 border-black/[0.06]'
                }`}
                style={{
                  borderColor: isSelected ? theme.hex : undefined,
                  boxShadow: isSelected ? `0 0 0 1px ${theme.hex}` : undefined
                }}
              >
                {/* Top Swatch & Checkmark */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-6 h-6 rounded-full bg-gradient-to-tr ${theme.gradient} shadow-xs ring-2 ring-white flex items-center justify-center text-white`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span className="font-bold text-xs text-[#1D1D1F]">{theme.name}</span>
                  </div>

                  {isSelected && (
                    <span 
                      style={{ color: theme.hex }}
                      className="text-[10px] font-black uppercase tracking-wider"
                    >
                      Activo
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 font-medium leading-tight truncate">
                  {theme.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Options List Group 1 (Perfil & Empresa) */}
      <div className="bg-white rounded-3xl border border-black/[0.06] shadow-xs divide-y divide-black/[0.04] overflow-hidden">
        
        {/* Perfil Option */}
        <button
          onClick={() => setShowProfileModal(true)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#F5F5F7] transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-[#F5F5F7] group-hover:bg-white text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#1D1D1F]">Perfil</div>
              <div className="text-xs text-slate-500 truncate">Nombre, foto y datos personales</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Empresa Option */}
        <button
          onClick={() => setShowCompanyModal(true)}
          className="w-full p-4 flex items-center justify-between hover:bg-[#F5F5F7] transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-[#F5F5F7] group-hover:bg-white text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Building className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#1D1D1F]">Empresa</div>
              <div className="text-xs text-slate-500 truncate">Información de tu negocio</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>

      </div>

      {/* Options List Group 2 (Gestión & Eventos) */}
      <div className="bg-white rounded-3xl border border-black/[0.06] shadow-xs divide-y divide-black/[0.04] overflow-hidden">
        
        {/* Cambiar Usuario / Cuentas */}
        <button
          onClick={onOpenUserAccountsModal}
          className="w-full p-4 flex items-center justify-between hover:bg-[#F5F5F7] transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#1D1D1F]">Cuentas y Accesos</div>
              <div className="text-xs text-slate-500 truncate">Gestionar usuarios y permisos ({users.length} cuentas)</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Sedes y Eventos */}
        <button
          onClick={() => onNavigateToView('eventos')}
          className="w-full p-4 flex items-center justify-between hover:bg-[#F5F5F7] transition-colors cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-[#1D1D1F]">Eventos y Ferias</div>
              <div className="text-xs text-slate-500 truncate">Sede activa: {currentEvent.name}</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </button>

      </div>

      {/* Logout Button (As shown in screenshot) */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full p-4 bg-white hover:bg-rose-50/60 border border-rose-200/80 rounded-3xl text-rose-600 font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>

      {/* Footer Version Note (As shown in screenshot) */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-400 font-medium">
          CRM Seguimiento • Versión 1.0
        </p>
      </div>

      {/* Profile Detail Modal */}
      {showProfileModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-black/[0.08] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${currentUser.color || 'bg-[#0071E3]'} text-white font-bold text-base flex items-center justify-center`}>
                {currentUser.avatar}
              </div>
              <div>
                <h3 className="font-bold text-base text-[#1D1D1F]">{currentUser.name}</h3>
                <p className="text-xs text-slate-500">{currentUser.email}</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-black/[0.06] text-xs">
              <div className="flex justify-between py-1 border-b border-black/[0.03]">
                <span className="text-slate-400">Rol:</span>
                <span className="font-semibold text-slate-800">{currentUser.role}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.03]">
                <span className="text-slate-400">Equipo:</span>
                <span className="font-semibold text-slate-800">{currentUser.team}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.03]">
                <span className="text-slate-400">Teléfono:</span>
                <span className={`font-semibold text-right truncate ${hasContact(currentUser.phone) ? 'text-slate-800' : 'text-slate-400 font-medium'}`}>{displayContact(currentUser.phone)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.03]">
                <span className="text-slate-400">Tipo de cuenta:</span>
                <span className="font-bold text-[#0071E3] uppercase">{currentUser.accountType || 'Ejecutivo'}</span>
              </div>
            </div>

            <button
              onClick={() => setShowProfileModal(false)}
              style={{ backgroundColor: selectedThemeConfig.hex }}
              className="w-full py-2.5 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs hover:opacity-90 transition-opacity"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Company Detail Modal */}
      {showCompanyModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setShowCompanyModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-black/[0.08] space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <DivergencyLogo variant="full" size="lg" />
            </div>

            <div className="space-y-2.5 pt-2 border-t border-black/[0.06] text-xs">
              <div className="flex justify-between py-1 border-b border-black/[0.03]">
                <span className="text-slate-400">Sector:</span>
                <span className="font-semibold text-slate-800">Tecnología / Software B2B</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.03]">
                <span className="text-slate-400">Sede Principal:</span>
                <span className="font-semibold text-slate-800">Bogotá, Colombia</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.03]">
                <span className="text-slate-400">Portal:</span>
                <span className="font-semibold" style={{ color: selectedThemeConfig.hex }}>divergency.ai</span>
              </div>
            </div>

            <button
              onClick={() => setShowCompanyModal(false)}
              style={{ backgroundColor: selectedThemeConfig.hex }}
              className="w-full py-2.5 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs hover:opacity-90 transition-opacity"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
