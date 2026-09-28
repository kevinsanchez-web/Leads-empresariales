import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Bell, 
  UserCheck, 
  Menu, 
  Smartphone,
  X,
  ChevronDown,
  Check,
  Calendar,
  Sparkles,
  Zap,
  Users,
  BarChart3,
  Shield,
  Layers
} from 'lucide-react';
import { UserRep, EventOption, Lead, ActiveView } from '../types';
import { HeaderNotificationsPopover } from './HeaderNotificationsPopover';
import { DivergencyLogo } from './DivergencyLogo';

interface HeaderProps {
  currentEvent: EventOption;
  events?: EventOption[];
  onSelectEvent?: (event: EventOption) => void;
  onOpenCreateEventModal?: () => void;
  currentUser: UserRep;
  users: UserRep[];
  onSelectUser: (user: UserRep) => void;
  onOpenUserAccountsModal?: () => void;
  activeView?: ActiveView;
  setActiveView?: (view: ActiveView) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showOnlyMyLeads: boolean;
  setShowOnlyMyLeads: (val: boolean) => void;
  onOpenNewLeadModal: () => void;
  onOpenQuickCapture: () => void;
  onToggleMobileMenu: () => void;
  activeFilterCount: number;
  onToggleFilters: () => void;
  leads?: Lead[];
  onSelectLead?: (lead: Lead) => void;
  onNavigateToNotifications?: () => void;
  onUpdateLead?: (lead: Lead) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentEvent,
  events = [],
  onSelectEvent,
  onOpenCreateEventModal,
  currentUser,
  users,
  onSelectUser,
  onOpenUserAccountsModal,
  activeView = 'personas',
  setActiveView,
  searchQuery,
  setSearchQuery,
  showOnlyMyLeads,
  setShowOnlyMyLeads,
  onOpenNewLeadModal,
  onOpenQuickCapture,
  onToggleMobileMenu,
  activeFilterCount,
  onToggleFilters,
  leads = [],
  onSelectLead,
  onNavigateToNotifications,
  onUpdateLead
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(e.target as Node)) {
        setShowEventDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show search and filters only on views where lead search applies
  const showSearchAndFilters = activeView === 'personas' || activeView === 'empresas' || activeView === 'intereses' || activeView === 'seguimientos';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-black/[0.06] sticky top-0 z-30 shadow-xs">
      {/* Top Navbar Row */}
      <div className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 max-w-[1600px] mx-auto w-full">
        
        {/* Left Group: Menu Trigger + Brand + Event Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Universal Menu Drawer Button */}
          <button 
            onClick={onToggleMobileMenu}
            className="w-8 h-8 rounded-xl text-slate-700 hover:bg-[#F5F5F7] hover:text-[#0071E3] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
            title="Abrir menú de navegación"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-4 h-4 stroke-[2.2]" />
          </button>
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 min-w-0">
            <DivergencyLogo variant="full" size="md" />
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />

          {/* Interactive Event Selector */}
          <div className="relative" ref={eventDropdownRef}>
            <button
              onClick={() => setShowEventDropdown(!showEventDropdown)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-slate-700 hover:text-[#0071E3] hover:bg-[#F5F5F7] rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer"
              title="Cambiar o crear evento"
            >
              <Calendar className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-[200px] font-bold text-xs">{currentEvent.name}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform shrink-0 ${showEventDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Event Popover */}
            {showEventDropdown && (
              <div className="absolute left-0 mt-2 w-72 bg-white border border-black/[0.08] rounded-2xl shadow-xl z-50 p-2 animate-fade-in divide-y divide-black/[0.04]">
                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Seleccionar Evento</span>
                  <span className="text-[10px] text-slate-400 font-normal">{events.length} disponibles</span>
                </div>
                
                <div className="py-1 max-h-56 overflow-y-auto space-y-0.5">
                  {events.map(evt => (
                    <button
                      key={evt.id}
                      onClick={() => {
                        if (onSelectEvent) onSelectEvent(evt);
                        setShowEventDropdown(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between ${
                        evt.id === currentEvent.id 
                          ? 'bg-[#0071E3]/10 text-[#0071E3] font-bold' 
                          : 'hover:bg-[#F5F5F7] text-[#1D1D1F]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate font-semibold">{evt.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{evt.location} • {evt.dateRange}</div>
                      </div>
                      {evt.id === currentEvent.id && <Check className="w-4 h-4 text-[#0071E3] shrink-0" />}
                    </button>
                  ))}
                </div>

                {onOpenCreateEventModal && (
                  <div className="pt-1.5 mt-1">
                    <button
                      onClick={() => {
                        setShowEventDropdown(false);
                        onOpenCreateEventModal();
                      }}
                      className="w-full py-2 px-3 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Crear Nuevo Evento</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Group: Notifications + User Avatar + Single Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Notifications Bell Popover */}
          {onSelectLead && onNavigateToNotifications && onUpdateLead && (
            <HeaderNotificationsPopover
              leads={leads}
              onSelectLead={onSelectLead}
              onNavigateToNotifications={onNavigateToNotifications}
              onUpdateLead={onUpdateLead}
            />
          )}

          {/* User Account Switcher dropdown */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-[#F5F5F7] flex items-center gap-2 transition-colors cursor-pointer"
              title={`Usuario activo: ${currentUser.name} (${currentUser.accountType === 'admin' ? 'Administrador' : 'Ejecutivo'})`}
            >
              <div className={`w-7 h-7 rounded-full ${currentUser.color || (currentUser.accountType === 'admin' ? 'bg-slate-900' : 'bg-[#0071E3]')} text-white font-bold text-[11px] flex items-center justify-center shadow-2xs`}>
                {currentUser.avatar}
              </div>
              <div className="hidden md:flex flex-col items-start leading-none text-left">
                <span className="text-xs font-semibold text-[#1D1D1F] max-w-[90px] truncate">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className={`text-[9px] font-black uppercase ${
                  currentUser.accountType === 'admin' ? 'text-amber-600' : 'text-[#0071E3]'
                }`}>
                  {currentUser.accountType === 'admin' ? 'Admin' : 'Ejecutivo'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-black/[0.08] rounded-2xl shadow-xl z-50 p-2 animate-fade-in divide-y divide-black/[0.04]">
                <div className="p-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Cambiar Cuenta</span>
                  <span className="text-[9px] text-emerald-600 font-bold">● Sesión Activa</span>
                </div>
                <div className="py-1 space-y-0.5 max-h-56 overflow-y-auto">
                  {users.map(u => {
                    const isUAdmin = u.accountType === 'admin' || u.role.toLowerCase().includes('admin');
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSelectUser(u);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          currentUser.id === u.id 
                            ? 'bg-[#0071E3]/10 text-[#0071E3] font-semibold' 
                            : 'hover:bg-[#F5F5F7] text-[#1D1D1F]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div className={`w-7 h-7 rounded-full ${u.color || (isUAdmin ? 'bg-slate-900' : 'bg-[#0071E3]')} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                            {u.avatar}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{u.name}</div>
                            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                              <span className={`font-black px-1 rounded text-[8px] ${
                                isUAdmin ? 'bg-slate-900 text-white' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {isUAdmin ? 'ADMIN' : 'EJEC'}
                              </span>
                              <span>{u.role}</span>
                            </div>
                          </div>
                        </div>
                        {currentUser.id === u.id && <Check className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {onOpenUserAccountsModal && (
                  <div className="pt-2 mt-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenUserAccountsModal();
                      }}
                      className="w-full py-1.5 px-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <span>+ Administrar / Crear Cuentas</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Single Primary Action: + Nuevo Lead */}
          <button
            onClick={onOpenNewLeadModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-[0_1px_3px_rgba(0,113,227,0.3)] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden xs:inline">Nuevo Lead</span>
          </button>

        </div>

      </div>

      {/* Clean Compact Search & Filter Toolbar (Only when relevant) */}
      {showSearchAndFilters && (
        <div className="px-3 sm:px-6 pb-2 pt-1 border-t border-black/[0.03] bg-[#FAFBFD]/80">
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Search Box */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o empresa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 sm:pl-8 pr-6 sm:pr-7 py-1 sm:py-1.5 bg-white border border-black/[0.06] rounded-xl text-xs text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3] shadow-2xs placeholder:text-slate-400 transition-all"
              />
              {searchQuery && (
                 <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Icon Button with badge */}
            <button
              onClick={onToggleFilters}
              className={`h-7 sm:h-8 px-2 sm:px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 ${
                activeFilterCount > 0 
                  ? 'bg-[#0071E3] border-[#0071E3] text-white shadow-xs' 
                  : 'bg-white border-black/[0.06] text-slate-700 hover:bg-slate-50'
              }`}
              title="Filtrar leads"
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white text-[#0071E3] text-[9px] sm:text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* "Mis Leads" / "Todos" Compact Toggle */}
            <button
              onClick={() => setShowOnlyMyLeads(!showOnlyMyLeads)}
              className={`h-7 sm:h-8 px-2 sm:px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all border cursor-pointer shrink-0 ${
                showOnlyMyLeads 
                  ? 'bg-[#0071E3]/10 border-[#0071E3]/30 text-[#0071E3]' 
                  : 'bg-white border-black/[0.06] text-slate-600 hover:bg-slate-50'
              }`}
              title={`Filtrar por ${currentUser.name}`}
            >
              <UserCheck className="w-3.5 h-3.5 text-[#0071E3]" />
              <span className="whitespace-nowrap text-[11px] sm:text-xs">{showOnlyMyLeads ? "Mis Leads" : "Todos"}</span>
            </button>

          </div>
        </div>
      )}
    </header>
  );
};
