import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MetricsHeader } from './components/MetricsHeader';
import { LeadsTable } from './components/LeadsTable';
import { LeadDrawerHost } from './components/LeadDrawerHost';
import { ReportsDashboard } from './components/ReportsDashboard';
import { NewLeadModal } from './components/NewLeadModal';
import { MobileQuickCapture } from './components/MobileQuickCapture';
import { EmpresasView } from './components/EmpresasView';
import { EnriquecimientoView } from './components/EnriquecimientoView';
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
import { cleanContact } from './utils/contactInfo';
import { isOnline, getOfflineLeads, syncOfflineLeads } from './utils/offlineStore';
import { WifiOff, RefreshCw, CheckCircle2, X, AlertTriangle } from 'lucide-react';

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

// Mapeo de valores hexadecimales para variables CSS dinámicas del tema
const THEME_COLORS: Record<AccentTheme, { primary: string; hover: string; light: string }> = {
  azul: { primary: '#0071E3', hover: '#0077ED', light: '#0071E310' },
  verde: { primary: '#10B981', hover: '#059669', light: '#10B98110' },
  naranja: { primary: '#F97316', hover: '#EA580C', light: '#F9731610' },
  purpura: { primary: '#8B5CF6', hover: '#7C3AED', light: '#8B5CF610' },
};

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

  // Aplicar atributos y variables CSS al HTML Root
  useEffect(() => {
    try {
      const selected = THEME_COLORS[accentTheme] || THEME_COLORS.azul;
      document.documentElement.setAttribute('data-theme', accentTheme);
      document.documentElement.style.setProperty('--color-primary', selected.primary);
      document.documentElement.style.setProperty('--color-primary-hover', selected.hover);
      document.documentElement.style.setProperty('--color-primary-light', selected.light);

      localStorage.setItem('app_accent_theme_v1', accentTheme);
    } catch (e) {
      console.error("Error guardando accentTheme:", e);
    }
  }, [accentTheme]);

  // Eventos, usuarios y leads desde Firestore
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
    return MOCK_USERS[0];
  });

  useEffect(() => {
    try {
      localStorage.setItem('centralized_current_user_v1', JSON.stringify(currentUser));
    } catch (e) {
      console.error("Error guardando currentUser:", e);
    }
  }, [currentUser]);

  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);

  // Sincronización en tiempo real con Firestore
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

  // Lead seleccionado (el drawer flotante se abre solo por acción del usuario)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Estado de Red y Sincronización Offline
  const [isDeviceOffline, setIsDeviceOffline] = useState<boolean>(() => !isOnline());
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(() => getOfflineLeads().length);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [leadSaveError, setLeadSaveError] = useState<string | null>(null);

  // Registro de Service Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('Service Worker registrado correctamente:', reg.scope);
      }).catch(err => {
        console.warn('Error registrando Service Worker:', err);
      });
    }
  }, []);

  const isFlushingRef = useRef(false);

  const handleFlushOfflineQueue = useCallback(async () => {
    if (isFlushingRef.current) return;
    isFlushingRef.current = true;
    try {
      const { synced, failed } = await syncOfflineLeads((offlineLead) =>
        createOrUpdateLead(offlineLead)
      );

      if (synced > 0 && failed === 0) {
        setSyncToastMessage(`🟢 Conexión restablecida: ¡${synced} ${synced === 1 ? 'lead' : 'leads'} sincronizados exitosamente!`);
        setTimeout(() => setSyncToastMessage(null), 6000);
      } else if (failed > 0) {
        setSyncToastMessage(
          `⚠️ ${synced} ${synced === 1 ? 'lead' : 'leads'} sincronizados, ${failed} ${failed === 1 ? 'falló' : 'fallaron'}. ${failed === 1 ? 'Sigue' : 'Siguen'} en la cola.`
        );
        setTimeout(() => setSyncToastMessage(null), 8000);
      }

      setOfflineQueueCount(getOfflineLeads().length);
    } finally {
      isFlushingRef.current = false;
    }
  }, []);

  // Listeners Online / Offline
  useEffect(() => {
    const handleOnline = () => {
      setIsDeviceOffline(false);
      handleFlushOfflineQueue();
    };

    const handleOffline = () => {
      setIsDeviceOffline(true);
    };

    const handleQueueChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.count === 'number') {
        setOfflineQueueCount(customEvent.detail.count);
      } else {
        setOfflineQueueCount(getOfflineLeads().length);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline_queue_changed', handleQueueChange);

    if (isOnline() && getOfflineLeads().length > 0) {
      handleFlushOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline_queue_changed', handleQueueChange);
    };
  }, [handleFlushOfflineQueue]);

  // Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyMyLeads, setShowOnlyMyLeads] = useState(false);
  const [priorityOnly, setPriorityOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [repFilter, setRepFilter] = useState('all');
  const [interestFilter, setInterestFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Modales y Menús
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserAccountsModalOpen, setIsUserAccountsModalOpen] = useState(false);
  const [userModalInitialRole, setUserModalInitialRole] = useState<UserRoleType>('executive');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);

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

  const handleLogout = () => {
    console.log('Sesión cerrada correctamente');
  };

  // Filtrado de Leads
  const filteredLeads = leads.filter((lead) => {
    if (lead.event !== currentEvent.name) return false;
    if (showOnlyMyLeads && lead.capturedBy !== currentUser.name) return false;
    if (repFilter !== 'all' && lead.capturedBy !== repFilter) return false;
    if (priorityOnly && !lead.priority) return false;
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false;
    if (interestFilter !== 'all' && !lead.interests.includes(interestFilter)) return false;
    if (sourceFilter !== 'all' && !lead.sources.includes(sourceFilter)) return false;

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

  const openLead = useCallback((lead: Lead) => {
    setSelectedLeadId(lead.id);
  }, []);

  const closeLead = useCallback(() => {
    setSelectedLeadId(null);
  }, []);

  const handleUpdateLead = async (updatedLead: Lead) => {
    try {
      await createOrUpdateLead(updatedLead);
    } catch (err) {
      console.error('Error actualizando lead en Firestore:', err);
    }
  };

  const handleApplyEnrichment = async (
    leadId: string,
    patch: { linkedinUrl?: string | null; email?: string | null; phone?: string | null; enrichment?: Lead['enrichment'] }
  ) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const next: Lead = { ...lead };
    // Lo que cargó el comercial a mano es la fuente de verdad: la IA solo rellena lo vacío.
    // Sin esta guarda, el teléfono central de la empresa pisa el celular que dejó el rep y un
    // correo encontrado reemplaza al del formulario.
    if (patch.linkedinUrl && !cleanContact(next.linkedinUrl)) next.linkedinUrl = patch.linkedinUrl;
    if (patch.email && !cleanContact(next.email)) next.email = patch.email;
    if (patch.phone && !cleanContact(next.phone)) next.phone = patch.phone;
    if (patch.enrichment) next.enrichment = patch.enrichment;

    await handleUpdateLead(next);
  };

  const handleSaveNewLead = async (newLead: Lead) => {
    setSelectedLeadId(newLead.id);
    setLeadSaveError(null);
    try {
      await createOrUpdateLead(newLead);
    } catch (err) {
      console.error('Error guardando lead en Firestore:', err);
      setLeadSaveError('No se pudo guardar el lead. Revisa tu conexión e inténtalo de nuevo.');
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      
      {/* Drawer Navegación Lateral */}
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
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
        pendingAlertsCount={pendingAlertsCount}
      />

      {/* Área Principal de la Aplicación */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Header Superior Conectado con Props compatibles */}
        <Header
          {...({
            currentEvent,
            events,
            onSelectEvent: (evt: EventOption) => {
              setCurrentEvent(evt);
              setCurrentPage(1);
            },
            onOpenCreateEventModal: () => setIsCreateEventModalOpen(true),
            currentUser,
            users,
            onSelectUser: setCurrentUser,
            onOpenUserAccountsModal: () => handleOpenAddUserModal('executive'),
            activeView,
            searchQuery,
            setSearchQuery,
            showOnlyMyLeads,
            setShowOnlyMyLeads,
            onToggleMobileMenu: () => setIsMobileMenuOpen(!isMobileMenuOpen),
            activeFilterCount,
            onToggleFilters: () => setIsFiltersModalOpen(true),
            leads,
            onSelectLead: openLead,
            onNavigateToNotifications: () => setActiveView('notificaciones'),
            onUpdateLead: handleUpdateLead,
            activeTheme: accentTheme,
            onChangeTheme: setAccentTheme,
            companyName: "Divergency Software",
            companyCategory: "Tecnología & Lead Management",
            onNavigateToView: (view: string) => setActiveView(view as ActiveView),
            onLogout: handleLogout,
            onOpenNewLeadModal: () => setIsNewLeadModalOpen(true)
          } as any)}
        />

        {/* Contenido Dinámico según la Vista Activa */}
        <main className="flex-1 flex flex-col p-3 sm:p-4 md:p-6 pb-[calc(var(--bottom-nav-reserve)+1.5rem)] max-w-[1600px] w-full mx-auto space-y-3">

          {/* Banner Modo Offline */}
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

          {leadSaveError && (
            <div className="bg-red-600 text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-fade-in text-xs font-bold border border-red-500">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-200" />
                <span className="truncate">{leadSaveError}</span>
              </div>
              <button
                onClick={() => setLeadSaveError(null)}
                className="p-1 rounded-lg hover:bg-red-700 text-white cursor-pointer transition-colors shrink-0"
                aria-label="Cerrar aviso de error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Banner Toast Sincronización Exitosa */}
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

          {/* Barra para Forzar Sincronización de Leads Pendientes */}
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
          
          {/* VISTA 1: PERSONAS / LEADS */}
          {activeView === 'personas' && (
            <div className="space-y-3.5">
              <MetricsHeader leads={leads.filter(l => l.event === currentEvent.name)} />

              <LeadsTrendChart
                leads={leads}
                currentEvent={currentEvent}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
                <div className="lg:col-span-12 min-w-0">
                  <LeadsTable
                    leads={filteredLeads}
                    selectedLeadId={selectedLeadId}
                    onSelectLead={openLead}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                  />
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: REPORTES Y ANALÍTICA */}
          {activeView === 'reportes' && (
            <ReportsDashboard
              leads={leads}
              users={users}
              events={events}
              currentEvent={currentEvent}
            />
          )}

          {/* VISTA: EVENTOS */}
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

          {/* VISTA 3: EMPRESAS */}
          {activeView === 'empresas' && (
            <EmpresasView
              leads={leads.filter(l => l.event === currentEvent.name)}
              onSelectLead={openLead}
              onUpdateLead={handleUpdateLead}
            />
          )}

          {/* ENRIQUECIMIENTO */}
          {activeView === 'enriquecimiento' && (
            <EnriquecimientoView
              leads={leads.filter(l => l.event === currentEvent.name)}
              onSelectLead={openLead}
              onApplyEnrichment={handleApplyEnrichment}
            />
          )}

          {/* VISTA 4: INTERESES */}
          {activeView === 'intereses' && (
            <InteresesView
              leads={leads.filter(l => l.event === currentEvent.name)}
              onSelectLead={openLead}
            />
          )}

          {/* VISTA 5: SEGUIMIENTOS */}
          {activeView === 'seguimientos' && (
            <SeguimientosView
              leads={leads.filter(l => l.event === currentEvent.name)}
              onSelectLead={openLead}
            />
          )}

          {/* VISTA 6: CAPTURA MÓVIL */}
          {activeView === 'captura_movil' && (
            <MobileQuickCapture
              onSaveLead={handleSaveNewLead}
              currentUser={currentUser}
              currentEvent={currentEvent}
              events={events}
              allLeads={leads}
              onOpenCreateEventModal={() => setIsCreateEventModalOpen(true)}
              onDone={() => setActiveView('personas')}
            />
          )}

          {/* VISTA 7: NOTIFICACIONES */}
          {activeView === 'notificaciones' && (
            <NotificationsView
              leads={leads}
              users={users}
              onSelectLead={openLead}
              onUpdateLead={handleUpdateLead}
            />
          )}

          {/* VISTA 8: USUARIOS */}
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

          {/* VISTA 9: CONFIGURACIÓN */}
          {activeView === 'configuracion' && (
            <ConfiguracionView
              currentUser={currentUser}
              users={users}
              onOpenUserAccountsModal={() => setIsUserAccountsModalOpen(true)}
              currentEvent={currentEvent}
              onNavigateToView={(view) => setActiveView(view)}
              activeTheme={accentTheme}
              onChangeTheme={setAccentTheme}
            />
          )}

        </main>

      </div>

      {/* Navegación Inferior Móvil */}
      <BottomNavBar
        activeView={activeView}
        setActiveView={setActiveView}
        pendingAlertsCount={pendingAlertsCount}
        leadsCount={leads.length}
      />

      {/* Modales */}
      <NewLeadModal
        isOpen={isNewLeadModalOpen}
        onClose={() => setIsNewLeadModalOpen(false)}
        onSaveLead={handleSaveNewLead}
        currentUser={currentUser}
        events={events}
        currentEvent={currentEvent}
        onOpenCreateEventModal={() => setIsCreateEventModalOpen(true)}
      />

      <CreateEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        onSaveEvent={handleSaveNewEvent}
      />

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

      <LeadDrawerHost
        lead={selectedLead}
        onClose={closeLead}
        onUpdateLead={handleUpdateLead}
        onDeleteLead={handleDeleteLead}
        currentUser={currentUser.name}
        onGoToLeadsView={() => setActiveView('personas')}
      />

    </div>
  );
}