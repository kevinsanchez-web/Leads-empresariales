import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MetricsHeader } from './components/MetricsHeader';
import { LeadsTable } from './components/LeadsTable';
import { LeadDetailDrawer } from './components/LeadDetailDrawer';
import { ReportsDashboard } from './components/ReportsDashboard';
import { NewLeadModal } from './components/NewLeadModal';
import { MobileQuickCapture } from './components/MobileQuickCapture';
import { EmpresasView } from './components/EmpresasView';
import { InteresesView } from './components/InteresesView';
import { SeguimientosView } from './components/SeguimientosView';
import { FiltersModal } from './components/FiltersModal';
import { NotificationsView } from './components/NotificationsView';
import { CreateEventModal } from './components/CreateEventModal';
import { EventsView } from './components/EventsView';
import { UsuariosView } from './components/UsuariosView';
import { UserAccountsModal } from './components/UserAccountsModal';
import { LeadsTrendChart } from './components/LeadsTrendChart';
import { BottomNavBar } from './components/BottomNavBar';
import { ConfiguracionView } from './components/ConfiguracionView';
import { getNotificationAlerts } from './utils/notifications';
import { isOnline, getOfflineLeads, syncOfflineLeads } from './utils/offlineStore';
import { WifiOff, Wifi, RefreshCw, CheckCircle2, X } from 'lucide-react';

import { ActiveView, Lead, UserRep, EventOption, UserRoleType, AccentTheme } from './types';
import { MOCK_USERS, MOCK_EVENTS, INITIAL_LEADS } from './data/mockData';
import {
  subscribeToLeads,
  subscribeToUsers,
  subscribeToEvents,
  createOrUpdateLead,
  deleteLead as deleteLeadFromFirestore,
  createOrUpdateEvent,
  createOrUpdateUser,
  deleteUser as deleteUserFromFirestore,
} from './services/firestoreService';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('captura_movil');
  const [accentTheme, setAccentTheme] = useState<AccentTheme>(() => {
    try {
      const saved = localStorage.getItem('app_accent_theme_v1') as AccentTheme | null;
      if (saved && ['azul', 'verde', 'naranja', 'purpura'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.error("Error cargando accentTheme:", e);
    }
    return 'azul';
  });

  // Apply theme to HTML root element
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', accentTheme);
      localStorage.setItem('app_accent_theme_v1', accentTheme);
    } catch (e) {
      console.error("Error guardando accentTheme:", e);
    }
  }, [accentTheme]);
  // Events, users and leads are centralized in Firestore (see subscriptions below).
  // These initial values are only an instant placeholder shown before the first snapshot arrives.
  const [events, setEvents] = useState<EventOption[]>(MOCK_EVENTS);

  const [currentEvent, setCurrentEvent] = useState<EventOption>(() => {
    try {
      const saved = localStorage.getItem('centralized_current_event_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error cargando currentEvent:", e);
    }
    return MOCK_EVENTS[0];
  });

  useEffect(() => {
    try {
      localStorage.setItem('centralized_current_event_v1', JSON.stringify(currentEvent));
    } catch (e) {
      console.error("Error guardando currentEvent en localStorage:", e);
    }
  }, [currentEvent]);

  const [users, setUsers] = useState<UserRep[]>(MOCK_USERS);

  const [currentUser, setCurrentUser] = useState<UserRep>(() => {
    try {
      const saved = localStorage.getItem('centralized_current_user_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error cargando currentUser:", e);
    }
    return MOCK_USERS[0]; // Admin by default
  });

  useEffect(() => {
    try {
      localStorage.setItem('centralized_current_user_v1', JSON.stringify(currentUser));
    } catch (e) {
      console.error("Error guardando currentUser:", e);
    }
  }, [currentUser]);

  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);

  // Real-time sync with Firestore: any device that creates/edits/deletes shows up here live.
  useEffect(() => {
    const unsubLeads = subscribeToLeads(setLeads);
    const unsubUsers = subscribeToUsers(setUsers);
    const unsubEvents = subscribeToEvents(setEvents);
    return () => {
      unsubLeads();
      unsubUsers();
      unsubEvents();
    };
  }, []);

  // Selected Lead (Default selected on desktop viewports)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return INITIAL_LEADS[0].id;
    }
    return null;
  });

  // Network & Offline Queue Sync State
  const [isDeviceOffline, setIsDeviceOffline] = useState<boolean>(() => !isOnline());
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(() => getOfflineLeads().length);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Register Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('Service Worker registrado correctamente:', reg.scope);
      }).catch(err => {
        console.warn('Error registrando Service Worker:', err);
      });
    }
  }, []);

  // Flush offline queue into Firestore (the leads subscription will reflect them once synced)
  const handleFlushOfflineQueue = useCallback(() => {
    const syncedCount = syncOfflineLeads((offlineLead) => {
      createOrUpdateLead(offlineLead).catch((err) => console.error('Error sincronizando lead offline:', err));
    });

    if (syncedCount > 0) {
      setSyncToastMessage(`🟢 Conexión restablecida: ¡${syncedCount} ${syncedCount === 1 ? 'lead' : 'leads'} sincronizados exitosamente!`);
      setTimeout(() => setSyncToastMessage(null), 6000);
    }
    setOfflineQueueCount(0);
  }, []);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsDeviceOffline(false);
      handleFlushOfflineQueue();
    };

    const handleOffline = () => {
      setIsDeviceOffline(true);
    };

    const handleQueueChange = (e: any) => {
      if (e.detail && typeof e.detail.count === 'number') {
        setOfflineQueueCount(e.detail.count);
      } else {
        setOfflineQueueCount(getOfflineLeads().length);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline_queue_changed', handleQueueChange);

    // Initial check if back online
    if (isOnline() && getOfflineLeads().length > 0) {
      handleFlushOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline_queue_changed', handleQueueChange);
    };
  }, [handleFlushOfflineQueue]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMyLeads, setShowOnlyMyLeads] = useState(false);
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [repFilter, setRepFilter] = useState('all');
  const [interestFilter, setInterestFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Modals & Mobile Drawer State
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserAccountsModalOpen, setIsUserAccountsModalOpen] = useState(false);
  const [userModalInitialRole, setUserModalInitialRole] = useState<UserRoleType>('executive');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = currentUser?.accountType === 'admin' || (currentUser?.role && currentUser.role.toLowerCase().includes('admin'));

  // Calculate active filter count
  const activeFilterCount = (priorityOnly ? 1 : 0) + 
    (statusFilter !== 'all' ? 1 : 0) + 
    (repFilter !== 'all' ? 1 : 0) + 
    (interestFilter !== 'all' ? 1 : 0) + 
    (sourceFilter !== 'all' ? 1 : 0);

  const handleResetFilters = () => {
    setPriorityOnly(false);
    setStatusFilter('all');
    setRepFilter('all');
    setInterestFilter('all');
    setSourceFilter('all');
    setSearchQuery('');
  };

  // Filter Leads
  const filteredLeads = leads.filter((lead) => {
    // Event match
    if (lead.event !== currentEvent.name) return false;

    // Rep match if "Mis Leads" active or if executive in filtered view
    if (showOnlyMyLeads && lead.capturedBy !== currentUser.name) return false;

    // Rep filter dropdown
    if (repFilter !== 'all' && lead.capturedBy !== repFilter) return false;

    // Priority filter
    if (priorityOnly && !lead.priority) return false;

    // Status filter
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false;

    // Interest filter
    if (interestFilter !== 'all' && !lead.interests.includes(interestFilter)) return false;

    // Source filter
    if (sourceFilter !== 'all' && !lead.sources.includes(sourceFilter)) return false;

    // Search query match (Name, Company, Role, Interest)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = lead.name.toLowerCase().includes(q);
      const matchCompany = lead.company.toLowerCase().includes(q);
      const matchRole = lead.role.toLowerCase().includes(q);
      const matchInterests = lead.interests.some(i => i.toLowerCase().includes(q));
      return matchName || matchCompany || matchRole || matchInterests;
    }

    return true;
  });

  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;

  const handleUpdateLead = async (updatedLead: Lead) => {
    try {
      await createOrUpdateLead(updatedLead);
    } catch (err) {
      console.error('Error actualizando lead en Firestore:', err);
    }
  };

  const handleSaveNewLead = async (newLead: Lead) => {
    setSelectedLeadId(newLead.id);
    try {
      await createOrUpdateLead(newLead);
    } catch (err) {
      console.error('Error guardando lead en Firestore:', err);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (selectedLeadId === leadId) {
      setSelectedLeadId(null);
    }
    try {
      await deleteLeadFromFirestore(leadId);
    } catch (err) {
      console.error('Error eliminando lead de Firestore:', err);
    }
  };

  const handleSaveNewEvent = async (newEvent: EventOption, setAsActive: boolean) => {
    if (setAsActive) {
      setCurrentEvent(newEvent);
      setCurrentPage(1);
    }
    try {
      await createOrUpdateEvent(newEvent);
    } catch (err) {
      console.error('Error guardando evento en Firestore:', err);
    }
  };

  const handleAddUser = async (newUser: UserRep) => {
    try {
      await createOrUpdateUser(newUser);
    } catch (err) {
      console.error('Error guardando usuario en Firestore:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserFromFirestore(userId);
    } catch (err) {
      console.error('Error eliminando usuario de Firestore:', err);
    }
  };

  const handleOpenAddUserModal = (roleType: UserRoleType = 'executive') => {
    setUserModalInitialRole(roleType);
    setIsUserAccountsModalOpen(true);
  };

  const pendingAlerts = getNotificationAlerts(leads);
  const pendingAlertsCount = pendingAlerts.filter(a => a.category === 'overdue' || a.category === 'today' || a.category === 'priority').length;
  const myLeadsCount = leads.filter(l => l.capturedBy === currentUser.name).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      
      {/* Off-canvas Navigation Drawer (Hidden by default on Desktop & Mobile) */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        currentEvent={currentEvent}
        events={events}
        onSelectEvent={(evt) => {
          setCurrentEvent(evt);
          setCurrentPage(1);
        }}
        onOpenCreateEventModal={() => setIsCreateEventModalOpen(true)}
        currentUser={currentUser}
        users={users}
        onSelectUser={setCurrentUser}
        onOpenUserAccountsModal={() => handleOpenAddUserModal('executive')}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        pendingAlertsCount={pendingAlertsCount}
        leadsCount={leads.length}
        myLeadsCount={myLeadsCount}
      />

      {/* Main App Canvas (Full width for maximum visual space) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Header Bar */}
        <Header
          currentEvent={currentEvent}
          events={events}
          onSelectEvent={(evt) => {
            setCurrentEvent(evt);
            setCurrentPage(1);
          }}
          onOpenCreateEventModal={() => setIsCreateEventModalOpen(true)}
          currentUser={currentUser}
          users={users}
          onSelectUser={setCurrentUser}
          onOpenUserAccountsModal={() => handleOpenAddUserModal('executive')}
          activeView={activeView}
          setActiveView={setActiveView}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showOnlyMyLeads={showOnlyMyLeads}
          setShowOnlyMyLeads={setShowOnlyMyLeads}
          onOpenNewLeadModal={() => setIsNewLeadModalOpen(true)}
          onOpenQuickCapture={() => setActiveView('captura_movil')}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          activeFilterCount={activeFilterCount}
          onToggleFilters={() => setIsFiltersModalOpen(true)}
          leads={leads}
          onSelectLead={(lead) => {
            setSelectedLeadId(lead.id);
            setActiveView('personas');
          }}
          onNavigateToNotifications={() => setActiveView('notificaciones')}
          onUpdateLead={handleUpdateLead}
        />

        {/* Dynamic View Content Area */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-24 sm:pb-28 max-w-[1600px] w-full mx-auto space-y-3">

          {/* Device Offline Persistent Alert Banner */}
          {isDeviceOffline && (
            <div className="bg-amber-500 text-white px-4 py-2.5 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-fade-in text-xs font-bold border border-amber-600/30">
              <div className="flex items-center gap-2 min-w-0">
                <WifiOff className="w-4 h-4 shrink-0 text-amber-100 animate-pulse" />
                <span className="truncate">
                  Modo Sin Conexión — Las capturas de leads se guardarán localmente y se sincronizarán al recuperar internet.
                </span>
              </div>
              {offlineQueueCount > 0 && (
                <span className="bg-amber-700/80 text-white text-[10px] px-2 py-0.5 rounded-full shrink-0 font-extrabold border border-white/20">
                  {offlineQueueCount} guardados offline
                </span>
              )}
            </div>
          )}

          {/* Sync Success Toast Banner */}
          {syncToastMessage && (
            <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-fade-in text-xs font-bold border border-emerald-500">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
                <span>{syncToastMessage}</span>
              </div>
              <button
                onClick={() => setSyncToastMessage(null)}
                className="p-1 rounded-lg hover:bg-emerald-700 text-white cursor-pointer transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Unsynced Leads Manual Trigger Bar (When online with pending items) */}
          {!isDeviceOffline && offlineQueueCount > 0 && (
            <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl shadow-md flex items-center justify-between gap-3 text-xs font-bold animate-fade-in">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
                <span>Tienes {offlineQueueCount} leads capturados sin conexión listos para sincronizar.</span>
              </div>
              <button
                onClick={handleFlushOfflineQueue}
                className="px-3 py-1 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl font-extrabold text-[11px] shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95"
              >
                Sincronizar Ahora ⚡
              </button>
            </div>
          )}
          
          {/* VIEW 1: PERSONAS / LEADS LIST (Default Screenshot View) */}
          {activeView === 'personas' && (
            <div className="space-y-3.5">
              
              {/* Top Metrics Cards */}
              <MetricsHeader leads={leads.filter(l => l.event === currentEvent.name)} />

              {/* Real-time Lead Capture Trend Line Chart (Recharts) */}
              <LeadsTrendChart
                leads={leads}
                currentEvent={currentEvent}
              />

              {/* Main Content Split: Table on Left + Drawer on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                
                {/* Leads Table */}
                <div className={`${selectedLead ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'} min-w-0 transition-all duration-300`}>
                  <LeadsTable
                    leads={filteredLeads}
                    selectedLeadId={selectedLeadId}
                    onSelectLead={(lead) => setSelectedLeadId(lead.id)}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                  />
                </div>

                {/* Right Lead Detail Drawer (Desktop lg+) */}
                {selectedLead && (
                  <div className="hidden lg:block lg:col-span-5 xl:col-span-4 min-w-0 sticky top-20">
                    <LeadDetailDrawer
                      lead={selectedLead}
                      onClose={() => setSelectedLeadId(null)}
                      onUpdateLead={handleUpdateLead}
                      onDeleteLead={handleDeleteLead}
                      currentUser={currentUser.name}
                    />
                  </div>
                )}

              </div>

              {/* Mobile Slide-Up Lead Detail Modal (< lg) */}
              {selectedLead && (
                <div 
                  className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/50 backdrop-blur-xs p-2 sm:p-4"
                  onClick={() => setSelectedLeadId(null)}
                >
                  <div 
                    className="w-full max-w-lg mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LeadDetailDrawer
                      lead={selectedLead}
                      onClose={() => setSelectedLeadId(null)}
                      onUpdateLead={handleUpdateLead}
                      onDeleteLead={handleDeleteLead}
                      currentUser={currentUser.name}
                    />
                  </div>
                </div>
              )}

            </div>
          )}

          {/* VIEW 2: REPORTES Y ANALÍTICA (Panel de Control - Admin) */}
          {activeView === 'reportes' && (
            <ReportsDashboard
              leads={leads}
              users={users}
              events={events}
              currentEvent={currentEvent}
            />
          )}

          {/* VIEW: GESTIÓN DE EVENTOS Y SEDES */}
          {activeView === 'eventos' && (
            <EventsView
              events={events}
              currentEvent={currentEvent}
              leads={leads}
              onSelectEvent={(evt) => {
                setCurrentEvent(evt);
                setCurrentPage(1);
              }}
              onOpenCreateEventModal={() => setIsCreateEventModalOpen(true)}
              onViewLeadsOfEvent={(evt) => {
                setCurrentEvent(evt);
                setCurrentPage(1);
                setActiveView('personas');
              }}
            />
          )}

          {/* VIEW 3: EMPRESAS */}
          {activeView === 'empresas' && (
            <EmpresasView
              leads={leads.filter(l => l.event === currentEvent.name)}
              onSelectLead={(lead) => {
                setSelectedLeadId(lead.id);
                setActiveView('personas');
              }}
              onUpdateLead={handleUpdateLead}
            />
          )}

          {/* VIEW 4: INTERESES */}
          {activeView === 'intereses' && (
            <InteresesView
              leads={leads.filter(l => l.event === currentEvent.name)}
              onSelectLead={(lead) => {
                setSelectedLeadId(lead.id);
                setActiveView('personas');
              }}
            />
          )}

          {/* VIEW 5: SEGUIMIENTOS PRIORITARIOS */}
          {activeView === 'seguimientos' && (
            <SeguimientosView
              leads={leads.filter(l => l.event === currentEvent.name)}
              onSelectLead={(lead) => {
                setSelectedLeadId(lead.id);
                setActiveView('personas');
              }}
            />
          )}

          {/* VIEW 6: CAPTURA MÓVIL EXPRESS (Enfoque principal del ejecutivo) */}
          {activeView === 'captura_movil' && (
            <MobileQuickCapture
              onSaveLead={handleSaveNewLead}
              currentUser={currentUser}
              currentEvent={currentEvent}
              events={events}
              allLeads={leads}
              onSelectEvent={(evt) => setCurrentEvent(evt)}
              onOpenCreateEventModal={() => setIsCreateEventModalOpen(true)}
              onDone={() => setActiveView('personas')}
            />
          )}

          {/* VIEW 7: NOTIFICACIONES Y ALERTAS DE SEGUIMIENTO */}
          {activeView === 'notificaciones' && (
            <NotificationsView
              leads={leads}
              users={users}
              onSelectLead={(lead) => {
                setSelectedLeadId(lead.id);
                setActiveView('personas');
              }}
              onUpdateLead={handleUpdateLead}
            />
          )}

          {/* VIEW 8: GESTIÓN DE USUARIOS Y ROLES (Admin) */}
          {activeView === 'usuarios' && (
            <UsuariosView
              users={users}
              currentUser={currentUser}
              onSelectUser={setCurrentUser}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
              leads={leads}
              onOpenAddUserModal={handleOpenAddUserModal}
            />
          )}

          {/* VIEW 9: CONFIGURACIÓN & PERFIL */}
          {activeView === 'configuracion' && (
            <ConfiguracionView
              currentUser={currentUser}
              users={users}
              onSelectUser={setCurrentUser}
              onOpenUserAccountsModal={() => setIsUserAccountsModalOpen(true)}
              currentEvent={currentEvent}
              onOpenCreateEventModal={() => setIsCreateEventModalOpen(true)}
              onNavigateToView={(view) => setActiveView(view)}
              activeTheme={accentTheme}
              onChangeTheme={setAccentTheme}
            />
          )}

        </main>

      </div>

      {/* Static Bottom Navigation Bar (Barra inferior estática) */}
      <BottomNavBar
        activeView={activeView}
        setActiveView={setActiveView}
        pendingAlertsCount={pendingAlertsCount}
        leadsCount={leads.length}
      />

      {/* New Lead Modal */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        onSaveLead={handleSaveNewLead}
        currentUser={currentUser}
        events={events}
        currentEvent={currentEvent}
        onOpenCreateEventModal={() => setIsCreateEventModalOpen(true)}
      />

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        onSaveEvent={handleSaveNewEvent}
      />

      {/* User Accounts & Role Creation Modal */}
      <UserAccountsModal
        isOpen={isUserAccountsModalOpen}
        onClose={() => setIsUserAccountsModalOpen(false)}
        users={users}
        currentUser={currentUser}
        onSelectUser={setCurrentUser}
        onAddUser={handleAddUser}
        onDeleteUser={handleDeleteUser}
        leads={leads}
        defaultRoleType={userModalInitialRole}
      />

      {/* Filters Modal */}
      <FiltersModal
        isOpen={isFiltersModalOpen}
        onClose={() => setIsFiltersModalOpen(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityOnly={priorityOnly}
        setPriorityOnly={setPriorityOnly}
        repFilter={repFilter}
        setRepFilter={setRepFilter}
        interestFilter={interestFilter}
        setInterestFilter={setInterestFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        users={users}
        onResetFilters={handleResetFilters}
      />

    </div>
  );
}

