import React from 'react';
import { 
  LayoutGrid, 
  Users, 
  CalendarClock, 
  Zap,
  Sparkles
} from 'lucide-react';
import { ActiveView } from '../types';

interface BottomNavBarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  pendingAlertsCount?: number;
  leadsCount?: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeView,
  setActiveView,
  pendingAlertsCount = 0,
  leadsCount = 0
}) => {
  const navItems = [
    {
      id: 'captura_movil' as ActiveView,
      label: 'Inicio',
      icon: Zap,
      highlight: true
    },
    {
      id: 'personas' as ActiveView,
      label: 'Leads',
      icon: LayoutGrid,
      badge: leadsCount > 0 ? leadsCount : undefined
    },
    {
      id: 'enriquecimiento' as ActiveView,
      label: 'Enriquecimiento',
      icon: Sparkles
    },
    {
      id: 'empresas' as ActiveView,
      label: 'Clientes',
      icon: Users
    },
    {
      id: 'seguimientos' as ActiveView,
      label: 'Seguimientos',
      icon: CalendarClock,
      badge: pendingAlertsCount > 0 ? pendingAlertsCount : undefined,
      badgeColor: 'bg-rose-500'
    }
  ];

  return (
    <nav
      data-bottom-nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-black/[0.08] shadow-[0_-2px_10px_rgba(0,0,0,0.03)] px-0.5 sm:px-4 pt-1 sm:pt-1.5 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] transition-all"
      aria-label="Navegación inferior"
    >
      <div className="max-w-md md:max-w-2xl mx-auto flex items-center justify-between sm:justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-1 sm:px-2 rounded-xl transition-all cursor-pointer min-w-[52px] sm:min-w-[64px] ${
                isActive
                  ? 'text-[var(--primary-accent,#0071E3)] font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {/* Icon Container */}
              <div className="relative">
                <Icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                
                {/* Badge if present */}
                {item.badge !== undefined && (
                  <span className={`absolute -top-1 -right-2 min-w-[14px] h-[14px] px-1 rounded-full ${item.badgeColor || 'bg-[var(--primary-accent,#0071E3)]'} text-white text-[8px] font-black flex items-center justify-center border border-white shadow-2xs`}>
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[9px] sm:text-[10px] mt-0.5 tracking-tight truncate max-w-[56px] sm:max-w-[65px] ${
                isActive ? 'text-[var(--primary-accent,#0071E3)] font-bold' : 'text-slate-500 font-semibold'
              }`}>
                {item.label}
              </span>

              {/* Subtle active indicator dot */}
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[var(--primary-accent,#0071E3)] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};