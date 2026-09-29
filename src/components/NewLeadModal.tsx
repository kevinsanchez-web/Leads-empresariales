import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  QrCode, 
  UserPlus, 
  CheckCircle2, 
  Star, 
  Building2, 
  Mail, 
  Phone, 
  Tag, 
  Layers,
  Wand2,
  Camera,
  Calendar,
  MessageSquare,
  Plus,
  Mic,
  Search,
  Globe,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Lead, UserRep, EventOption, CompanyResearchInfo } from '../types';
import { INTEREST_OPTIONS, SOURCE_OPTIONS, EXPERIENCE_OPTIONS } from '../data/mockData';
import { CardScannerModal } from './CardScannerModal';
import { VoiceLeadAssistant } from './VoiceLeadAssistant';
import { ParsedVoiceLead } from '../utils/voiceLeadParser';
import { isOnline, saveLeadOffline } from '../utils/offlineStore';
import { todayISODate } from '../utils/date';
import { cleanCompanyName } from '../utils/company';
import { sendPriorityLeadPushNotification } from '../utils/pushNotifications';
import { researchCompany } from '../services/aiService';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLead: (newLead: Lead) => void;
  currentUser: UserRep;
  events: EventOption[];
  currentEvent: EventOption;
  onOpenCreateEventModal?: () => void;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({
  isOpen,
  onClose,
  onSaveLead,
  currentUser,
  events,
  currentEvent,
  onOpenCreateEventModal
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(currentEvent.name);
  const [priority, setPriority] = useState(false);
  const [notes, setNotes] = useState('');
  const [nextContactDate, setNextContactDate] = useState(todayISODate());

  useEffect(() => {
    setSelectedEvent(currentEvent.name);
  }, [currentEvent.name]);

  const [selectedInterests, setSelectedInterests] = useState<string[]>(['IA', 'Analítica']);
  const [selectedSources, setSelectedSources] = useState<string[]>(['ArmonIA', 'Registro manual']);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>(['ArmonIA']);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);

  // AI Company Research (Google Search Grounding)
  const [companyInfo, setCompanyInfo] = useState<CompanyResearchInfo | null>(null);
  const [isResearchingCompany, setIsResearchingCompany] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResearchCompany = async (overrideCompany?: string) => {
    const targetComp = (overrideCompany || company).trim();
    if (!targetComp) return;

    setIsResearchingCompany(true);
    setResearchError(null);
    try {
      const data: any = await researchCompany({ companyName: targetComp, leadName: name, role });
      if (data.success && data.companyInfo) {
        setCompanyInfo(data.companyInfo);
      } else {
        setResearchError(data.error || 'No se pudo obtener información de la empresa.');
      }
    } catch (err: any) {
      setResearchError('Error de red al consultar Google Search.');
    } finally {
      setIsResearchingCompany(false);
    }
  };

  // Handle data extracted from business card scanner
  const handleScanSuccess = (data: any) => {
    if (data.name) setName(data.name);
    if (data.role) setRole(data.role);
    if (data.company) setCompany(data.company);
    if (data.email) setEmail(data.email);
    if (data.phone) setPhone(data.phone);
    if (data.notes) setNotes(data.notes);
    if (Array.isArray(data.interests) && data.interests.length > 0) {
      setSelectedInterests(data.interests);
    }
    setSelectedSources(['QR', 'Escanear Tarjeta', 'Visita Stand']);
    setPriority(true);
  };

  // Handle data applied via voice assistant
  const handleApplyVoiceData = (data: ParsedVoiceLead) => {
    if (data.name) setName(data.name);
    if (data.role) setRole(data.role);
    if (data.company) setCompany(data.company);
    if (data.email) setEmail(data.email);
    if (data.phone) setPhone(data.phone);
    if (data.notes) setNotes(prev => prev ? `${prev}. ${data.notes}` : data.notes!);
    if (data.priority !== undefined) setPriority(data.priority);
    if (data.interests && data.interests.length > 0) {
      setSelectedInterests(prev => Array.from(new Set([...prev, ...data.interests!])));
    }
    if (data.sources && data.sources.length > 0) {
      setSelectedSources(prev => Array.from(new Set([...prev, ...data.sources!])));
    }
  };

  const handleVoiceCommand = (command: 'save' | 'clear' | 'priority' | 'scan') => {
    if (command === 'save') {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSubmit(fakeEvent);
    } else if (command === 'clear') {
      setName('');
      setRole('');
      setCompany('');
      setEmail('');
      setPhone('');
      setNotes('');
      setPriority(false);
    } else if (command === 'priority') {
      setPriority(prev => !prev);
    } else if (command === 'scan') {
      setIsScannerOpen(true);
    }
  };

  // Instant Card/QR Scanner Simulation Fallback
  const handleSimulateScan = () => {
    const sampleLeads = [
      {
        name: "Diego Fernando Santos",
        role: "Head of AI & Data",
        company: "Bancolombia Digital",
        email: "dsantos@bancolombia.com.co",
        phone: "+57 310 987 6543",
        interests: ["IA", "Analítica", "Datos"],
        sources: ["ArmonIA", "QR", "Oráculo"],
        experiences: ["ArmonIA"],
        notes: "Capturado mediante escaneo de código QR en stand del evento. Interesado en soluciones de LLM empresarial."
      },
      {
        name: "María Constanza Parra",
        role: "Vicepresidenta de Tecnología",
        company: "Grupo Argos",
        email: "mparra@grupoargos.com",
        phone: "+57 301 444 5566",
        interests: ["Nube", "Automatización", "IoT"],
        sources: ["Quiromancia", "WIKKU", "Visita Stand"],
        experiences: ["Unitree", "Demo Robótica"],
        notes: "Visita directa al stand. Consulta por arquitectura IoT y sensores de telemetría."
      }
    ];

    const pick = sampleLeads[Math.floor(Math.random() * sampleLeads.length)];
    setName(pick.name);
    setRole(pick.role);
    setCompany(pick.company);
    setEmail(pick.email);
    setPhone(pick.phone);
    setSelectedInterests(pick.interests);
    setSelectedSources(pick.sources);
    setSelectedExperiences(pick.experiences);
    setNotes(pick.notes);
    setPriority(true);
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const toggleSource = (source: string) => {
    if (selectedSources.includes(source)) {
      setSelectedSources(selectedSources.filter(s => s !== source));
    } else {
      setSelectedSources([...selectedSources, source]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !company) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const cleanCompany = cleanCompanyName(company);

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name,
      role: role || 'Visitante Comercial',
      company: cleanCompany,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@${cleanCompany.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: phone || '+57 300 000 0000',
      event: selectedEvent,
      interests: selectedInterests.length > 0 ? selectedInterests : ['IA'],
      experiences: selectedExperiences,
      sources: selectedSources.length > 0 ? selectedSources : ['Registro manual'],
      capturedBy: currentUser.name,
      capturedAt: `Hoy, ${timeStr}`,
      lastContact: `Hoy, ${timeStr}`,
      priority,
      status: "Nuevo",
      estimatedValue: 40000,
      notes,
      nextContactDate: nextContactDate || todayISODate(),
      history: [
        {
          id: `hist-${Date.now()}`,
          date: "Hoy",
          time: timeStr,
          author: currentUser.name,
          text: `Lead registrado durante ${selectedEvent} por ${currentUser.name}. ${notes}`,
          type: 'note'
        }
      ],
      suggestedAction: {
        title: "Agendar reunión de presentación",
        description: `Proponer fecha para reunión ejecutiva sobre ${selectedInterests.join(', ')}.`,
        type: 'meeting'
      },
      companyInfo: companyInfo || undefined
    };

    if (!isOnline()) {
      saveLeadOffline(newLead);
    }

    onSaveLead(newLead);

    if (priority) {
      sendPriorityLeadPushNotification(newLead);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4">
      
      {/* Modal Container: Perfectly bounded & self-scrolling */}
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
        
        {/* Header - Fixed & Apple styling */}
        <div className="px-5 sm:px-6 py-4 bg-white border-b border-black/[0.05] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center font-bold shrink-0 shadow-[0_2px_8px_rgba(0,113,227,0.25)]">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[#1D1D1F] leading-tight truncate">
                Nuevo Lead Comercial
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Registro rápido y sincronización con IA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Real Business Card Scanner */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Escaneo real con la cámara o foto de tarjeta"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Escanear Tarjeta</span>
            </button>

            {/* Instant Scanner Simulator */}
            <button
              type="button"
              onClick={handleSimulateScan}
              className="px-2.5 py-1.5 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Auto-completar datos con prueba"
            >
              <Wand2 className="w-3 h-3 text-[#5856D6]" />
              <span className="hidden sm:inline">Demo</span>
            </button>

            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-xl bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-500 hover:text-[#1D1D1F] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body - Scrollable & Compact Clean Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 sm:px-6 py-4 space-y-4 flex-1">
          
          {/* Voice Input Assistant */}
          <VoiceLeadAssistant
            onApplyVoiceData={handleApplyVoiceData}
            onExecuteCommand={handleVoiceCommand}
            onActiveFieldChange={(field) => setActiveVoiceField(field)}
            isCompact
          />

          {/* Row 1: Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo *</label>
              <input
                type="text"
                required
                placeholder="Ej. Laura Martínez"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all placeholder:text-slate-400 text-[#1D1D1F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo / Posición</label>
              <input
                type="text"
                placeholder="Ej. Directora de Innovación"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all placeholder:text-slate-400 text-[#1D1D1F]"
              />
            </div>
          </div>

          {/* Row 2: Company & Event */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Empresa *</label>
                {company.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={() => handleResearchCompany()}
                    disabled={isResearchingCompany}
                    className="text-[11px] font-bold text-[#0071E3] hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {isResearchingCompany ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Buscando en Google...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3 h-3" />
                        <span>Investigar con IA</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ej. Energía Andina"
                  value={company}
                  onChange={(e) => {
                    setCompany(e.target.value);
                    if (companyInfo) setCompanyInfo(null);
                  }}
                  className="w-full pl-9 pr-3.5 py-2 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all placeholder:text-slate-400 text-[#1D1D1F]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Evento Asociado</label>
                {onOpenCreateEventModal && (
                  <button
                    type="button"
                    onClick={onOpenCreateEventModal}
                    className="text-xs text-[#0071E3] hover:text-[#0077ED] font-semibold flex items-center gap-0.5 cursor-pointer"
                    title="Crear un nuevo evento para este lead"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Crear Evento</span>
                  </button>
                )}
              </div>
              <select
                value={selectedEvent}
                onChange={(e) => {
                  if (e.target.value === '__create_new__' && onOpenCreateEventModal) {
                    onOpenCreateEventModal();
                  } else {
                    setSelectedEvent(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all text-[#1D1D1F]"
              >
                {events.map(evt => (
                  <option key={evt.id} value={evt.name}>{evt.name}</option>
                ))}
                {onOpenCreateEventModal && (
                  <option value="__create_new__">+ Crear nuevo evento...</option>
                )}
              </select>
            </div>
          </div>

          {/* Company AI Grounding Research Result Card */}
          {(isResearchingCompany || companyInfo || researchError) && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/70 shadow-xs animate-fade-in text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 fill-blue-500/20" />
                  <span>Investigación de Empresa (Google Search)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                  Google Grounding
                </span>
              </div>

              {isResearchingCompany && (
                <div className="flex items-center gap-2 text-slate-600 py-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span>Analizando actividades, productos y mercado de {company}...</span>
                </div>
              )}

              {researchError && (
                <div className="text-red-600 text-xs py-1">
                  {researchError}
                </div>
              )}

              {companyInfo && !isResearchingCompany && (
                <div className="space-y-2 text-slate-800">
                  <p className="text-slate-700 text-xs leading-relaxed">
                    <span className="font-bold text-slate-900">¿A qué se dedica?: </span>
                    {companyInfo.summary}
                  </p>

                  {companyInfo.industry && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-bold text-slate-900">Sector:</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold">
                        {companyInfo.industry}
                      </span>
                    </div>
                  )}

                  {companyInfo.productsAndServices && companyInfo.productsAndServices.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">Productos y Soluciones:</span>
                      <div className="flex flex-wrap gap-1">
                        {companyInfo.productsAndServices.map((prod, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-blue-100 text-blue-900 text-[10px] font-medium">
                            {prod}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {companyInfo.sources && companyInfo.sources.length > 0 && (
                    <div className="pt-1.5 border-t border-blue-100/80">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Fuentes verificadas:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {companyInfo.sources.map((src, i) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-700 hover:underline bg-white/80 px-2 py-0.5 rounded-md border border-slate-200"
                          >
                            <Globe className="w-2.5 h-2.5 text-blue-500" />
                            <span className="truncate max-w-[140px]">{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Row 3: Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all placeholder:text-slate-400 text-[#1D1D1F]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono Móvil</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="+57 300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all placeholder:text-slate-400 text-[#1D1D1F]"
                />
              </div>
            </div>
          </div>

          {/* Interests Selection Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Intereses Clave</label>
            <div className="flex flex-wrap gap-1.5">
              {INTEREST_OPTIONS.map((interest) => {
                const active = selectedInterests.includes(interest);
                return (
                  <button
                    type="button"
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? 'bg-[#0071E3] text-white shadow-2xs'
                        : 'bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-700'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Toggle Card */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAFBFD] border border-black/[0.04]">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${priority ? 'bg-[#FF9500]/10 text-[#FF9500]' : 'bg-[#F5F5F7] text-slate-400'}`}>
                <Star className={`w-4 h-4 ${priority ? 'fill-[#FF9500] text-[#FF9500]' : ''}`} />
              </div>
              <div>
                <div className="text-xs font-bold text-[#1D1D1F] leading-none">
                  Seguimiento Prioritario
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Destacar en el radar comercial para contacto rápido
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPriority(!priority)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                priority ? 'bg-[#34C759]' : 'bg-slate-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                priority ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Conversation Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notas de la conversación</label>
            <textarea
              rows={2}
              placeholder="Detalles clave, presupuesto, acuerdos o compromisos..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all placeholder:text-slate-400 text-[#1D1D1F]"
            />
          </div>

          {/* Form Actions - Fixed Bottom Footer */}
          <div className="pt-3 pb-1 border-t border-black/[0.05] flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              Guardar Lead
            </button>
          </div>

        </form>

      </div>

      {/* Card & Badge OCR Camera Scanner Modal */}
      <CardScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

    </div>
  );
};
