import React from 'react';
import { 
  Users, 
  Building2, 
  Star, 
  CheckCircle2, 
  BarChart3, 
  Smartphone, 
  ChevronRight, 
  Sparkles,
  Calendar,
  Bell,
  UserCheck,
  ChevronUp,
  UserPlus,
  Shield,
  Settings,
  Briefcase,
  Zap,
  Layers,
  LogOut,
  X
} from 'lucide-react';
import { ActiveView, EventOption, UserRep } from '../types';
import { DivergencyLogo } from './DivergencyLogo';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  currentEvent: EventOption;
  events: EventOption[];
  onSelectEvent: (event: EventOption) => void;
  onOpenCreateEventModal?: () => void;
  currentUser?: UserRep;
  users?: UserRep[];
  onSelectUser?: (user: UserRep) => void;
  onOpenUserAccountsModal?: () => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  pendingAlertsCount?: number;
  leadsCount?: number;
  myLeadsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  currentEvent,
  events,
  onSelectEvent,
  onOpenCreateEventModal,
  currentUser,
  users = [],
  onSelectUser,
  onOpenUserAccountsModal,
  isMobileOpen,
  setIsMobileOpen,
  pendingAlertsCount,
  leadsCount = 128,
  myLeadsCount = 0
}) => {
  const [showEventDropdown, setShowEventDropdown] = React.useState(false);
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);

  const isAdmin = currentUser?.accountType === 'admin' || (currentUser?.role && currentUser.role.toLowerCase().includes('admin'));

  // Menu items for Executive (Clean, simplified, focused on fast lead capture)
  const executiveMenuItems = [
    { 
      id: 'captura_movil' as ActiveView, 
      label: 'Inicio (Captura en Vivo)', 
      icon: Zap, 
      badge: 'Voz & IA',
      highlight: true
    },
    { 
      id: 'personas' as ActiveView, 
      label: 'Mis Leads Capturados', 
      icon: Users, 
      badge: myLeadsCount > 0 ? `${myLeadsCount}` : `${leadsCount}` 
    },
    { 
      id: 'seguimientos' as ActiveView, 
      label: 'Mis Seguimientos', 
      icon: CheckCircle2 
    },
    { 
      id: 'notificaciones' as ActiveView, 
      label: 'Notificaciones', 
      icon: Bell, 
      badge: pendingAlertsCount ? `${pendingAlertsCount}` : undefined, 
      alertBadge: pendingAlertsCount ? pendingAlertsCount > 0 : false 
    },
    { 
      id: 'configuracion' as ActiveView, 
      label: 'Configuración', 
      icon: Settings 
    }
  ];

  // Menu items for Admin (Full access to all sections and administrative controls)
  const adminMenuItems = [
    { 
      id: 'captura_movil' as ActiveView, 
      label: 'Inicio (Captura en Vivo)', 
      icon: Zap, 
      badge: 'Voz & IA',
      highlight: true 
    },
    { id: 'personas' as ActiveView, label: 'Personas (Leads)', icon: Users, badge: `${leadsCount}` },
    { id: 'eventos' as ActiveView, label: 'Eventos & Sedes', icon: Calendar, badge: `${events.length}` },
    { id: 'seguimientos' as ActiveView, label: 'Seguimientos', icon: CheckCircle2 },
    { id: 'empresas' as ActiveView, label: 'Empresas', icon: Building2 },
    { id: 'intereses' as ActiveView, label: 'Intereses & Tags', icon: Star },
    { id: 'reportes' as ActiveView, label: 'Reportes y Analítica', icon: BarChart3 },
    { id: 'notificaciones' as ActiveView, label: 'Notificaciones', icon: Bell, badge: pendingAlertsCount ? `${pendingAlertsCount}` : undefined, alertBadge: pendingAlertsCount ? pendingAlertsCount > 0 : false },
    { id: 'usuarios' as ActiveView, label: 'Cuentas & Equipo', icon: Shield, badge: `${users.length}` },
    { id: 'configuracion' as ActiveView, label: 'Configuración', icon: Settings }
  ];

  const currentMenuItems = isAdmin ? adminMenuItems : executiveMenuItems;

  const handleNavClick = (viewId: ActiveView) => {
    setActiveView(viewId);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Off-canvas Slide-out Navigation Drawer (Hidden by default, opened on demand) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0B193C] text-white flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Top Logo, Role Badge & Nav */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 sm:p-5 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <DivergencyLogo variant="full" size="md" invert={true} />
              </div>

              {/* Close Drawer Button */}
              <button
                onClick={() => setIsMobileOpen?.(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar menú"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Role Badge Indicator */}
            <div className={`mt-2 px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center justify-between ${
              isAdmin 
                ? 'bg-slate-900/80 border border-slate-700 text-amber-300' 
                : 'bg-blue-900/60 border border-blue-700/50 text-blue-200'
            }`}>
              <div className="flex items-center gap-1.5 truncate">
                {isAdmin ? <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Briefcase className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                <span className="truncate">{isAdmin ? 'Modo Administrador' : 'Modo Ejecutivo (Captura)'}</span>
              </div>
              <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded-md font-black shrink-0 ${
                isAdmin ? 'bg-amber-400/20 text-amber-300' : 'bg-blue-400/20 text-blue-200'
              }`}>
                {isAdmin ? 'FULL' : 'ÁGIL'}
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 mt-1">
            {currentMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              const isHighlight = 'highlight' in item && item.highlight;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer
                    ${isActive 
                      ? isHighlight 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-white/30'
                        : 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                      : isHighlight
                      ? 'bg-blue-900/40 text-blue-100 hover:bg-blue-800/60 border border-blue-600/40'
                      : 'text-blue-100/80 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isHighlight ? 'text-blue-300 animate-pulse' : 'text-blue-300'}`} />
                    <span className={isHighlight ? 'font-bold' : ''}>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.alertBadge 
                        ? 'bg-rose-600 text-white animate-pulse' 
                        : isHighlight
                        ? 'bg-blue-500/40 text-blue-200'
                        : isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-blue-950 text-blue-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Event Switcher + Logged In User Profile */}
        <div className="p-3 border-t border-white/10 space-y-2 relative">
          
          {/* Active Event Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowEventDropdown(!showEventDropdown);
                setShowUserDropdown(false);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/50 border border-blue-800/40 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="truncate">
                  <div className="text-[10px] font-bold text-blue-300/60 uppercase">Evento Activo</div>
                  <div className="font-bold text-xs text-white truncate">{currentEvent.name}</div>
                </div>
              </div>
              <ChevronUp className={`w-3.5 h-3.5 text-blue-300 transition-transform ${showEventDropdown ? '' : 'rotate-180'}`} />
            </button>

            {/* Event Dropdown */}
            {showEventDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0f234f] border border-blue-700/50 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="text-[10px] font-bold text-blue-300 px-2 py-1 uppercase">Cambiar Evento</div>
                {events.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      onSelectEvent(evt);
                      setShowEventDropdown(false);
                    }}
                    className={`w-full text-left p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      evt.id === currentEvent.id 
                        ? 'bg-blue-600 text-white font-bold' 
                        : 'text-blue-200 hover:bg-blue-900/60'
                    }`}
                  >
                    <div className="font-semibold">{evt.name}</div>
                    <div className="text-[10px] text-blue-300/70">{evt.dateRange}</div>
                  </button>
                ))}

                {isAdmin && onOpenCreateEventModal && (
                  <div className="pt-1.5 border-t border-blue-800/60 mt-1">
                    <button
                      onClick={() => {
                        setShowEventDropdown(false);
                        onOpenCreateEventModal();
                      }}
                      className="w-full py-2 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>+ Crear Nuevo Evento</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Logged In User Panel (Bottom Left) */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserDropdown(!showUserDropdown);
                  setShowEventDropdown(false);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-left transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="relative">
                    <div className={`w-8 h-8 rounded-full ${currentUser.color || (isAdmin ? 'bg-slate-900' : 'bg-blue-500')} text-white font-black text-xs flex items-center justify-center ring-2 ring-white/20 shrink-0`}>
                      {currentUser.avatar}
                    </div>
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full absolute bottom-0 right-0 ring-2 ring-[#0B193C]"></span>
                  </div>
                  <div className="truncate">
                    <div className="text-[10px] font-bold text-blue-300/70 uppercase flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-400" />
                      <span>{isAdmin ? 'Admin Conectado' : 'Ejecutivo Conectado'}</span>
                    </div>
                    <div className="font-bold text-xs text-white truncate leading-tight">{currentUser.name}</div>
                    <div className="text-[10px] text-blue-200/60 truncate">{currentUser.role}</div>
                  </div>
                </div>
                <ChevronUp className={`w-3.5 h-3.5 text-blue-300 transition-transform ${showUserDropdown ? '' : 'rotate-180'}`} />
              </button>

              {/* User Dropdown Selector */}
              {showUserDropdown && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0f234f] border border-blue-700/50 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                  <div className="text-[10px] font-bold text-blue-300 px-2 py-1 uppercase border-b border-blue-800/60 mb-1 flex items-center justify-between">
                    <span>Cambiar Usuario</span>
                    <span className="text-[9px] text-emerald-400 font-bold">● En Línea</span>
                  </div>
                  {users.map((u) => {
                    const isUAdmin = u.accountType === 'admin' || u.role.toLowerCase().includes('admin');
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSelectUser?.(u);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                          u.id === currentUser.id 
                            ? 'bg-blue-600 text-white font-bold' 
                            : 'text-blue-100 hover:bg-blue-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className={`w-7 h-7 rounded-full ${u.color || (isUAdmin ? 'bg-slate-900' : 'bg-blue-800')} text-white font-extrabold text-[11px] flex items-center justify-center shrink-0`}>
                            {u.avatar}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold leading-none truncate">{u.name}</div>
                            <div className="text-[10px] text-blue-200/70 truncate">{u.role}</div>
                          </div>
                        </div>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                          isUAdmin ? 'bg-slate-900 text-amber-300' : 'bg-blue-950 text-blue-300'
                        }`}>
                          {isUAdmin ? 'ADMIN' : 'EJEC'}
                        </span>
                      </button>
                    );
                  })}

                  {/* Add / Manage Users trigger inside dropdown */}
                  <div className="pt-2 border-t border-blue-800/60 mt-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenUserAccountsModal?.();
                      }}
                      className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Gestionar / Cambiar Roles</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </aside>

      {/* Overlay Backdrop for Drawer */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity duration-300 animate-fade-in"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}
    </>
  );
};



