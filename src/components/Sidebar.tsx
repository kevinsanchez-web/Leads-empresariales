import React from 'react';
import { 
  Star, 
  BarChart3, 
  Calendar,
  Bell,
  ChevronUp,
  Shield,
  UserPlus,
  X
} from 'lucide-react';
import { ActiveView, EventOption, UserRep } from '../types';
import { DivergencyLogo } from './DivergencyLogo';
import { RoleBadge } from './RoleBadge';
import { useAccess, canOpenView } from '../controllers/accessController';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  currentEvent: EventOption;
  events: EventOption[];
  onSelectEvent: (event: EventOption) => void;
  onOpenCreateEventModal?: () => void;
  onOpenNewLeadModal?: () => void;
  currentUser?: UserRep;
  users?: UserRep[];
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  pendingAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  currentEvent,
  events,
  onSelectEvent,
  onOpenCreateEventModal,
  onOpenNewLeadModal,
  currentUser,
  users = [],
  isMobileOpen,
  setIsMobileOpen,
  pendingAlertsCount
}) => {
  const [showEventDropdown, setShowEventDropdown] = React.useState(false);

  const access = useAccess(currentUser);

  // El permiso de cada vista vive en el controlador (VIEW_PERMISSIONS); sin permiso, no se muestra.
  const menuItems: { id: ActiveView; label: string; icon: React.ElementType; badge?: string; alertBadge?: boolean }[] = [
    { id: 'eventos', label: 'Eventos & Sedes', icon: Calendar, badge: `${events.length}` },
    { id: 'intereses', label: 'Intereses & Tags', icon: Star },
    { id: 'reportes', label: 'Reportes y Analítica', icon: BarChart3 },
    { id: 'notificaciones', label: 'Notificaciones', icon: Bell, badge: pendingAlertsCount ? `${pendingAlertsCount}` : undefined, alertBadge: pendingAlertsCount ? pendingAlertsCount > 0 : false },
    { id: 'usuarios', label: 'Cuentas & Equipo', icon: Shield, badge: `${users.length}` }
  ];

  const currentMenuItems = menuItems.filter(item => canOpenView(access, item.id));

  const handleNavClick = (viewId: ActiveView) => {
    setActiveView(viewId);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Off-canvas Slide-out Navigation Drawer (Light Mode) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white text-slate-800 border-r border-slate-200 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Top Logo, Role Badge & Nav */}
        <div className="overflow-y-auto flex-1">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <DivergencyLogo variant="full" size="md" invert={false} />
              </div>

              {/* Close Drawer Button */}
              <button
                onClick={() => setIsMobileOpen?.(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar menú"
                aria-label="Cerrar menú"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Role Badge Indicator */}
            <div className="mt-2">
              <RoleBadge role={access.role} />
            </div>
          </div>

          {/* Acción de captura: fuera de la lista de navegación porque no cambia de vista */}
          {onOpenNewLeadModal && (
            <div className="px-3 pt-3">
              <button
                onClick={() => {
                  onOpenNewLeadModal();
                  // El modal se monta fuera del drawer: sin cerrarlo, abriría detrás.
                  setIsMobileOpen?.(false);
                }}
                className="w-full py-2.5 px-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm shadow-primary/25"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">Nuevo Lead</span>
                <kbd className="hidden sm:inline text-[10px] font-bold bg-white/20 rounded px-1.5 py-0.5">
                  N
                </kbd>
              </button>
            </div>
          )}

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
                        ? 'bg-linear-to-r from-primary to-primary-hover text-white shadow-md shadow-primary/25'
                        : 'bg-primary text-white shadow-sm shadow-primary/25' 
                      : isHighlight
                      ? 'bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : isHighlight ? 'text-primary' : 'text-slate-400'}`} />
                    <span className={isHighlight ? 'font-bold' : ''}>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      item.alertBadge 
                        ? 'bg-rose-600 text-white animate-pulse' 
                        : isHighlight
                        ? 'bg-primary/15 text-primary'
                        : isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Event Switcher */}
        <div className="p-3 border-t border-slate-100 space-y-2 relative">
          
          {/* Active Event Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowEventDropdown(!showEventDropdown);
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <div className="truncate">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Evento Activo</div>
                  <div className="font-bold text-xs text-slate-800 truncate">{currentEvent.name}</div>
                </div>
              </div>
              <ChevronUp className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showEventDropdown ? '' : 'rotate-180'}`} />
            </button>

            {/* Event Dropdown */}
            {showEventDropdown && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">Cambiar Evento</div>
                {events.map((evt) => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      onSelectEvent(evt);
                      setShowEventDropdown(false);
                    }}
                    className={`w-full text-left p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      evt.id === currentEvent.id 
                        ? 'bg-primary/10 text-primary font-bold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold">{evt.name}</div>
                    <div className="text-[10px] text-slate-400">{evt.dateRange}</div>
                  </button>
                ))}

                {access.can('events.manage') && onOpenCreateEventModal && (
                  <div className="pt-1.5 border-t border-slate-100 mt-1">
                    <button
                      onClick={() => {
                        setShowEventDropdown(false);
                        onOpenCreateEventModal();
                      }}
                      className="w-full py-2 px-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>+ Crear Nuevo Evento</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </aside>

      {/* Overlay Backdrop for Drawer */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity duration-300 animate-fade-in"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}
    </>
  );
};