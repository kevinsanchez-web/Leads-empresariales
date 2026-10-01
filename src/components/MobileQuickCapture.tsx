import React, { useState } from 'react';
import { 
  Wand2, 
  CheckCircle2, 
  Sparkles, 
  Star, 
  Building2, 
  Send,
  Zap,
  Tag,
  Camera,
  Clock,
  Phone,
  Mail,
  User,
  Flame,
  FileText,
  Linkedin
} from 'lucide-react';
import { Lead, UserRep, EventOption } from '../types';
import { INTEREST_OPTIONS, SOURCE_OPTIONS } from '../data/mockData';
import { CardScannerModal } from './CardScannerModal';
import { VoiceLeadAssistant } from './VoiceLeadAssistant';
import { ParsedVoiceLead } from '../utils/voiceLeadParser';
import { isOnline, saveLeadOffline } from '../utils/offlineStore';
import { cleanCompanyName } from '../utils/company';
import { cleanContact } from '../utils/contactInfo';
import { sendPriorityLeadPushNotification } from '../utils/pushNotifications';
import { leadHistoryDate, leadTime, leadTimestampNow } from '../utils/date';

interface MobileQuickCaptureProps {
  onSaveLead: (lead: Lead) => void;
  currentUser: UserRep;
  currentEvent: EventOption;
  allLeads?: Lead[];
  onOpenNewLeadModal?: () => void;
  onDone: () => void;
}

export const MobileQuickCapture: React.FC<MobileQuickCaptureProps> = ({
  onSaveLead,
  currentUser,
  currentEvent,
  allLeads = [],
  onOpenNewLeadModal,
  onDone
}) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [priority, setPriority] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['IA']);
  const [selectedSources, setSelectedSources] = useState<string[]>(['Visita Stand']);
  const [notes, setNotes] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);

  // Procesar datos dictados por Voz
  const handleApplyVoiceData = (data: ParsedVoiceLead) => {
    if (data.name) setName(data.name);
    if (data.company) setCompany(data.company);
    if (data.role) setRole(data.role);
    if (data.phone) setPhone(data.phone);
    if (data.email) setEmail(data.email);
    if (data.priority !== undefined) setPriority(data.priority);
    if (data.interests && data.interests.length > 0) {
      setSelectedInterests(prev => Array.from(new Set([...prev, ...data.interests!])));
    }
    if (data.sources && data.sources.length > 0) {
      setSelectedSources(prev => Array.from(new Set([...prev, ...data.sources!])));
    }
    if (data.notes) {
      setNotes(prev => prev ? `${prev}. ${data.notes}` : data.notes!);
    }
  };

  // Comandos de Voz Express
  const handleExecuteVoiceCommand = (command: 'save' | 'clear' | 'priority' | 'scan') => {
    if (command === 'save') {
      if (name.trim() && company.trim()) {
        submitForm();
      } else {
        alert('Por favor completa al menos el Nombre y la Empresa antes de guardar.');
      }
    } else if (command === 'clear') {
      resetForm();
    } else if (command === 'priority') {
      setPriority(prev => !prev);
    } else if (command === 'scan') {
      setIsScannerOpen(true);
    }
  };

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
    setSelectedSources(prev => Array.from(new Set([...prev, 'Escanear Tarjeta'])));
    setPriority(true);
  };

  // Autocompletar datos de prueba
  const handleQuickScan = () => {
    const quickDemos = [
      {
        name: "Carlos Eduardo Mendoza",
        company: "Cementos Argos",
        role: "Director de Operaciones",
        phone: "+57 312 888 7766",
        email: "cmendoza@argos.com.co",
        linkedin: "linkedin.com/in/carlos-mendoza-argos",
        interests: ["IA", "Automatización", "IoT"],
        sources: ["Visita Stand"],
        notes: "Capturado en stand. Solicita demo de IA aplicada a logística."
      },
      {
        name: "Adriana Lucía Torres",
        company: "Banco de Occidente",
        role: "Líder de Analítica",
        phone: "+57 300 555 1234",
        email: "atorres@bancodeoccidente.com.co",
        linkedin: "linkedin.com/in/altorres-analytica",
        interests: ["Analítica", "Ciberseguridad", "Datos"],
        sources: ["Registro Manual"],
        notes: "Interesada en modelos predictivos de riesgo."
      }
    ];

    const pick = quickDemos[Math.floor(Math.random() * quickDemos.length)];
    setName(pick.name);
    setCompany(pick.company);
    setRole(pick.role);
    setPhone(pick.phone);
    setEmail(pick.email);
    setLinkedin(pick.linkedin);
    setSelectedInterests(pick.interests);
    setSelectedSources(pick.sources);
    setNotes(pick.notes);
    setPriority(true);
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const toggleSource = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const resetForm = () => {
    setName('');
    setCompany('');
    setRole('');
    setPhone('');
    setEmail('');
    setLinkedin('');
    setNotes('');
    setPriority(false);
    setSelectedInterests(['IA']);
    setSelectedSources(['Visita Stand']);
  };

  const submitForm = () => {
    if (!name.trim() || !company.trim()) return;

    const cleanCompany = cleanCompanyName(company);

    const newLead: Lead = {
      id: `lead-live-${Date.now()}`,
      name: name.trim(),
      role: role.trim() || 'Visitante Stand',
      company: cleanCompany,
      email: cleanContact(email),
      phone: cleanContact(phone),
      event: currentEvent.name,
      interests: selectedInterests,
      experiences: ['Captura Rápida'],
      sources: selectedSources,
      capturedBy: currentUser.name,
      capturedAt: leadTimestampNow(),
      lastContact: leadTimestampNow(),
      priority,
      status: "Nuevo",
      estimatedValue: 35000,
      notes: notes.trim(),
      history: [
        {
          id: `hist-${Date.now()}`,
          date: leadHistoryDate(),
          time: leadTime(),
          author: currentUser.name,
          text: `Capturado vía Formulario Rápido en ${currentEvent.name}.`,
          type: 'note'
        }
      ]
    };

    if (!isOnline()) {
      saveLeadOffline(newLead);
    }

    onSaveLead(newLead);

    if (priority) {
      sendPriorityLeadPushNotification(newLead);
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      resetForm();
    }, 1200);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  const recentLeadsForEvent = allLeads.filter(l => l.event === currentEvent.name).slice(0, 5);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Formulario Principal */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            
            {/* Header del Formulario Claro */}
            <div className="bg-slate-50/80 px-4 py-3 flex items-center justify-between gap-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    Captura Rápida de Lead
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      En Vivo
                    </span>
                  </h2>
                </div>
              </div>

              <VoiceLeadAssistant
                isCompact={true}
                onApplyVoiceData={handleApplyVoiceData}
                onExecuteCommand={handleExecuteVoiceCommand}
                onActiveFieldChange={(field) => setActiveVoiceField(field)}
              />
            </div>

            {/* Pantalla de Confirmación / Toast */}
            {savedSuccess ? (
              <div className="p-12 text-center space-y-3 animate-scale-up">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">¡Lead Guardado Exitosamente!</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Registrado en tiempo real para <strong className="text-slate-700">{currentEvent.name}</strong>. Listo para la siguiente entrada.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="p-4 sm:p-5 space-y-4">
                
                {/* Barra de Herramientas / Aceleradores */}
                <div className="flex items-center justify-between bg-slate-50 p-1.5 sm:p-2 rounded-xl border border-slate-200/60 gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    <span className="hidden sm:inline">Aceleradores</span>
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onOpenNewLeadModal && (
                      <button
                        type="button"
                        onClick={onOpenNewLeadModal}
                        className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Formulario Completo</span>
                        <span className="sm:hidden">Formulario</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      <span className="hidden sm:inline">Escanear Tarjeta</span>
                      <span className="sm:hidden">Escanear</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleQuickScan}
                      className="px-2 py-1 bg-slate-200/70 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0"
                      title="Llenar con datos de prueba"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>Demo</span>
                    </button>
                  </div>
                </div>

                {/* 1. Datos Principales */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Nombre completo <span className="text-rose-500">*</span>
                      </span>
                      {activeVoiceField === 'name' && (
                        <span className="text-[10px] text-blue-600 font-bold animate-pulse">Dictando...</span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Carlos Eduardo Mendoza"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        Empresa <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Cementos Argos"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        Cargo / Puesto
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Director de Operaciones"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-normal text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Contacto y Redes */}
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        Teléfono / Whatsapp
                      </label>
                      <input
                        type="text"
                        placeholder="+57 312 888 7766"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-normal text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        placeholder="correo@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-normal text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Campo LinkedIn */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                        Perfil de LinkedIn
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                    </label>
                    <input
                      type="text"
                      placeholder="linkedin.com/in/usuario o URL del perfil"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-normal text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* 3. Selección de Intereses */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Áreas de Interés</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {selectedInterests.length} seleccionados
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {INTEREST_OPTIONS.map((interest) => {
                      const active = selectedInterests.includes(interest);
                      return (
                        <button
                          type="button"
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                          }`}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Touchpoint / Origen */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Punto de Contacto / Canal
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SOURCE_OPTIONS.slice(0, 5).map((src) => {
                      const active = selectedSources.includes(src);
                      return (
                        <button
                          type="button"
                          key={src}
                          onClick={() => toggleSource(src)}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white font-medium'
                              : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
                          }`}
                        >
                          {src}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Switch VIP / Prioritario */}
                <button
                  type="button"
                  onClick={() => setPriority(!priority)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-medium flex items-center justify-between border cursor-pointer transition-all ${
                    priority
                      ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                      : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Star className={`w-4 h-4 ${priority ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                    <span className="font-semibold">Lead Prioritario / Oportunidad VIP</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${priority ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-600'}`}>
                    {priority ? "ALTA PRIORIDAD" : "NORMAL"}
                  </span>
                </button>

                {/* Notas de la conversación */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notas Rápidas
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles clave, compromisos o próximos pasos..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400 resize-none"
                  />
                </div>

                {/* Botón de Envío */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Guardar Prospecto</span>
                </button>

              </form>
            )}
          </div>
        </div>

        {/* Panel Lateral: Actividad en Vivo */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Métrica de Actividad */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Métricas del Evento</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-medium text-slate-500 block">Registrados</span>
                <span className="text-xl font-black text-slate-900">
                  {allLeads.filter(l => l.event === currentEvent.name).length}
                </span>
              </div>

              <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                <span className="text-[10px] font-medium text-amber-800 block">VIP / Alta Prioridad</span>
                <span className="text-xl font-black text-amber-900">
                  {allLeads.filter(l => l.event === currentEvent.name && l.priority).length}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Sincronizado automáticamente</span>
            </div>
          </div>

          {/* Últimos Leads Capturados */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                Capturas Recientes
              </h3>
              <button
                type="button"
                onClick={onDone}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Ver todos
              </button>
            </div>

            {recentLeadsForEvent.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No hay leads capturados aún en este evento.
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeadsForEvent.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-1 mb-0.5">
                      <span className="font-bold text-slate-900 truncate">
                        {lead.name}
                      </span>
                      {lead.priority && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded-md shrink-0">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 text-[11px] truncate mb-1">
                      {lead.role} · <strong className="text-slate-800">{lead.company}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{lead.capturedAt}</span>
                      <span className="font-medium text-slate-500">{lead.capturedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modal de Escaneo de Tarjetas / OCR */}
      <CardScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};