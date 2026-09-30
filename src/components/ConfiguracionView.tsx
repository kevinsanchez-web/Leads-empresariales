import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Mail, 
  Palette, 
  Sparkles, 
  ShieldCheck, 
  Calendar, 
  LogOut, 
  ChevronRight,
  User,
  Building2
} from 'lucide-react';

export type AccentTheme = 'azul' | 'verde' | 'naranja' | 'purpura';

export interface UserRep {
  id: string;
  name: string;
  email: string;
  role?: string;
  team?: string;
  accountType?: 'admin' | 'ejecutivo';
  avatar?: string;
}

export interface EventOption {
  id: string;
  name: string;
  location?: string;
  dateRange?: string;
}

export interface ConfiguracionViewProps {
  currentUser?: UserRep;
  users?: UserRep[];
  currentEvent?: EventOption;
  companyName?: string;
  companyCategory?: string;
  activeTheme?: AccentTheme;
  onChangeTheme?: (theme: AccentTheme) => void;
  onOpenUserAccountsModal?: () => void;
  onNavigateToView?: (view: string) => void;
  onLogout?: () => void;
  onClose?: () => void;
  className?: string; // Para adaptar márgenes o sombras si se usa en modal/page
}

export interface ThemeOptionConfig {
  id: AccentTheme;
  name: string;
  subtitle: string;
  hex: string;
  badgeText: string;
}

export const THEME_OPTIONS: ThemeOptionConfig[] = [
  {
    id: 'azul',
    name: 'Azul',
    subtitle: 'Divergency Clásico',
    hex: '#0071E3',
    badgeText: 'AZUL'
  },
  {
    id: 'verde',
    name: 'Verde',
    subtitle: 'Esmeralda & Deals',
    hex: '#10B981',
    badgeText: 'VERDE'
  },
  {
    id: 'naranja',
    name: 'Naranja',
    subtitle: 'Solar / Dinamismo',
    hex: '#F97316',
    badgeText: 'NARANJA'
  },
  {
    id: 'purpura',
    name: 'Púrpura',
    subtitle: 'Inteligencia Artificial',
    hex: '#8B5CF6',
    badgeText: 'PÚRPURA'
  }
];

// Datos por defecto exactos a la interfaz solicitada
const DEFAULT_USER: UserRep = {
  id: 'usr-admin',
  name: 'Carlos Mendoza (Admin)',
  email: 'admin@divergency.ai',
  team: 'Dirección General',
  role: 'Administrador del Sistema',
  accountType: 'admin',
  avatar: 'AD'
};

const DEFAULT_EVENT: EventOption = {
  id: 'evt-2026',
  name: 'Congreso Tecnológico 2026',
  location: 'Sede Principal',
  dateRange: '2026'
};

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  currentUser = DEFAULT_USER,
  users = [],
  currentEvent = DEFAULT_EVENT,
  companyName = 'Divergency',
  companyCategory = 'Tecnología / Software B2B',
  activeTheme: externalTheme,
  onChangeTheme,
  onOpenUserAccountsModal,
  onNavigateToView,
  onLogout,
  onClose,
  className = ''
}) => {
  // Manejo autónomo de tema (Funciona con prop controlada o con estado local)
  const [internalTheme, setInternalTheme] = useState<AccentTheme>('purpura');
  
  const currentThemeId = externalTheme || internalTheme;
  const selectedThemeConfig = THEME_OPTIONS.find(t => t.id === currentThemeId) || THEME_OPTIONS[3];

  const handleThemeSelect = (themeId: AccentTheme) => {
    setInternalTheme(themeId);
    if (onChangeTheme) {
      onChangeTheme(themeId);
    }
  };

  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar la sesión activa?')) {
      if (onLogout) {
        onLogout();
      } else {
        console.log('Sesión cerrada (Modo Autónomo)');
      }
      onClose?.();
    }
  };

  return (
    <div 
      className={`w-full max-w-[420px] bg-[#F8FAFC] border border-black/[0.08] rounded-[28px] shadow-xl p-3.5 space-y-3 text-slate-800 transition-all ${className}`}
    >
      {/* 1. USUARIO PRINCIPAL */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs flex items-center gap-3.5">
        <div 
          className="w-14 h-14 rounded-full text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs transition-colors"
          style={{ backgroundColor: selectedThemeConfig.hex }}
        >
          {currentUser.avatar || 'AD'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 truncate leading-snug">
              {currentUser.name}
            </h2>
            <span className="bg-[#FEF3C7] text-[#92400E] text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0">
              {currentUser.accountType === 'admin' || currentUser.role?.toLowerCase().includes('admin') ? 'ADMIN' : 'EJEC'}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 truncate">
            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{currentUser.email}</span>
          </div>
          
          <div className="text-[11px] text-slate-400 mt-0.5 truncate font-medium">
            {currentUser.team || 'Dirección General'} • {currentUser.role || 'Administrador del Sistema'}
          </div>
        </div>
      </div>

      {/* 2. COLOR DE ACENTO Y TEMA */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
              <Palette className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h3 className="text-sm font-bold text-slate-900">Color de Acento y Tema</h3>
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                Personaliza los colores de botones, resaltados y métricas
              </p>
            </div>
          </div>

          <span className="bg-[#F3E8FF] text-[#7E22CE] text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
            {selectedThemeConfig.badgeText}
          </span>
        </div>

        {/* REJILLA DE TEMAS */}
        <div className="grid grid-cols-2 gap-2">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = currentThemeId === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleThemeSelect(theme.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between min-h-[64px] ${
                  isSelected
                    ? 'border-[#8B5CF6] bg-[#F3E8FF]/30 ring-1 ring-[#8B5CF6]/40'
                    : 'border-slate-100 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white transition-all"
                    style={{ backgroundColor: theme.hex }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate">{theme.name}</div>
                    <div className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">{theme.subtitle}</div>
                  </div>
                </div>

                {isSelected && (
                  <span className="text-[8px] font-black text-[#7E22CE] uppercase tracking-wider shrink-0 ml-1 mt-0.5">
                    ACTIVO
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. PERFIL Y EMPRESA */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        <div className="p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900">Perfil</div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {currentUser.name} • {currentUser.email}
            </div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900">Empresa</div>
            <div className="text-[11px] text-slate-500 truncate mt-0.5">
              {companyName} • {companyCategory}
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACCESOS DIRECTOS */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs divide-y divide-slate-100 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            if (onOpenUserAccountsModal) onOpenUserAccountsModal();
            else console.log('Abrir modal Cuentas y Accesos');
            onClose?.();
          }}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">Cuentas y Accesos</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                Gestionar usuarios y permisos ({users.length} cuentas)
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (onNavigateToView) onNavigateToView('eventos');
            else console.log('Navegar a Eventos y Ferias');
            onClose?.();
          }}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50/80 transition-colors group cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">Eventos y Ferias</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                Sede activa: {currentEvent.name}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-1" />
        </button>
      </div>

      {/* 5. CERRAR SESIÓN */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full py-3 px-4 bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
      >
        <LogOut className="w-4 h-4 text-rose-500" />
        <span>Cerrar sesión</span>
      </button>

    </div>
  );
};