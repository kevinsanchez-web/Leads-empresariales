import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  QrCode, 
  Wand2, 
  CheckCircle2, 
  Sparkles, 
  Star, 
  UserPlus, 
  Building2, 
  Send,
  Zap,
  Tag,
  ThumbsUp,
  Camera,
  Mic,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  Phone,
  Mail,
  User,
  Check,
  Flame,
  FileText,
  WifiOff,
  Wifi
} from 'lucide-react';
import { Lead, UserRep, EventOption } from '../types';
import { INTEREST_OPTIONS, SOURCE_OPTIONS } from '../data/mockData';
import { CardScannerModal } from './CardScannerModal';
import { VoiceLeadAssistant } from './VoiceLeadAssistant';
import { ParsedVoiceLead } from '../utils/voiceLeadParser';
import { isOnline, saveLeadOffline } from '../utils/offlineStore';
import { sendPriorityLeadPushNotification } from '../utils/pushNotifications';

interface MobileQuickCaptureProps {
  onSaveLead: (lead: Lead) => void;
  currentUser: UserRep;
  currentEvent: EventOption;
  events?: EventOption[];
  allLeads?: Lead[];
  onSelectEvent?: (event: EventOption) => void;
  onOpenCreateEventModal?: () => void;
  onDone: () => void;
}

export const MobileQuickCapture: React.FC<MobileQuickCaptureProps> = ({
  onSaveLead,
  currentUser,
  currentEvent,
  events = [],
  allLeads = [],
  onSelectEvent,
  onOpenCreateEventModal,
  onDone
}) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [priority, setPriority] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['IA']);
  const [selectedSources, setSelectedSources] = useState<string[]>(['Visita Stand']);
  const [notes, setNotes] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [highlightField, setHighlightField] = useState<string | null>(null);
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);

  // Apply data extracted via Voice
  const handleApplyVoiceData = (data: ParsedVoiceLead) => {
    let touched = false;

    if (data.name) {
      setName(data.name);
      touched = true;
    }
    if (data.company) {
      setCompany(data.company);
      touched = true;
    }
    if (data.role) {
      setRole(data.role);
      touched = true;
    }
    if (data.phone) {
      setPhone(data.phone);
      touched = true;
    }
    if (data.email) {
      setEmail(data.email);
      touched = true;
    }
    if (data.priority !== undefined) {
      setPriority(data.priority);
      touched = true;
    }
    if (data.interests && data.interests.length > 0) {
      setSelectedInterests(prev => Array.from(new Set([...prev, ...data.interests!])));
      touched = true;
    }
    if (data.sources && data.sources.length > 0) {
      setSelectedSources(prev => Array.from(new Set([...prev, ...data.sources!])));
      touched = true;
    }
    if (data.notes) {
      setNotes(prev => prev ? `${prev}. ${data.notes}` : data.notes!);
      touched = true;
    }

    if (touched) {
      setHighlightField('all');
      setTimeout(() => setHighlightField(null), 1500);
    }
  };

  // Handle voice commands (e.g. "guardar lead", "limpiar", "prioritario")
  const handleExecuteVoiceCommand = (command: 'save' | 'clear' | 'priority' | 'scan') => {
    if (command === 'save') {
      if (name.trim() && company.trim()) {
        submitForm();
      } else {
        alert('Por favor dicta o ingresa al menos el Nombre y la Empresa antes de guardar.');
      }
    } else if (command === 'clear') {
      setName('');
      setCompany('');
      setRole('');
      setPhone('');
      setEmail('');
      setNotes('');
      setPriority(false);
      setSelectedInterests(['IA']);
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
    setSelectedSources(['QR', 'Escanear Tarjeta', 'Visita Stand']);
    setPriority(true);
  };

  // Quick Demo Simulator
  const handleQuickScan = () => {
    const quickDemos = [
      {
        name: "Carlos Eduardo Mendoza",
        company: "Cementos Argos",
        role: "Director de Operaciones",
        phone: "+57 312 888 7766",
        email: "cmendoza@argos.com.co",
        interests: ["IA", "Automatización", "IoT"],
        sources: ["ArmonIA", "QR", "Visita Stand"],
        notes: "Capturado en stand. Solicita demo de IA aplicada a logística de transporte."
      },
      {
        name: "Adriana Lucía Torres",
        company: "Banco de Occidente",
        role: "Líder de Analítica",
        phone: "+57 300 555 1234",
        email: "atorres@bancodeoccidente.com.co",
        interests: ["Analítica", "Ciberseguridad", "Datos"],
        sources: ["Quiromancia", "Oráculo"],
        notes: "Visita rápida. Interesada en modelos predictivos de riesgo."
      },
      {
        name: "Santiago Restrepo",
        company: "Ecopetrol",
        role: "VP de Transformación Digital",
        phone: "+57 315 777 9900",
        email: "srestrepo@ecopetrol.com.co",
        interests: ["IA", "Cloud", "IoT"],
        sources: ["Visita Stand", "Registro manual"],
        notes: "Muy alta prioridad. Reunión solicitada para el próximo martes."
      }
    ];

    const pick = quickDemos[Math.floor(Math.random() * quickDemos.length)];
    setName(pick.name);
    setCompany(pick.company);
    setRole(pick.role);
    setPhone(pick.phone);
    setEmail(pick.email);
    setSelectedInterests(pick.interests);
    setSelectedSources(pick.sources);
    setNotes(pick.notes);
    setPriority(true);

    setHighlightField('all');
    setTimeout(() => setHighlightField(null), 1500);
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

  const submitForm = () => {
    if (!name.trim() || !company.trim()) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newLead: Lead = {
      id: `lead-live-${Date.now()}`,
      name: name.trim(),
      role: role.trim() || 'Visitante Stand',
      company: company.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@${company.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: phone.trim() || '+57 300 000 0000',
      event: currentEvent.name,
      interests: selectedInterests,
      experiences: ['Captura en Vivo Express'],
      sources: selectedSources,
      capturedBy: currentUser.name,
      capturedAt: `Hoy, ${timeStr}`,
      lastContact: `Hoy, ${timeStr}`,
      priority,
      status: "Nuevo",
      estimatedValue: 35000,
      notes: notes.trim(),
      history: [
        {
          id: `hist-${Date.now()}`,
          date: "Hoy",
          time: timeStr,
          author: currentUser.name,
          text: `Capturado vía Captura Rápida en Vivo (Voz/Express) en ${currentEvent.name}.`,
          type: 'note'
        }
      ]
    };

    const onlineStatus = isOnline();
    if (!onlineStatus) {
      saveLeadOffline(newLead);
    }

    onSaveLead(newLead);

    // If lead is priority, send browser push notification to alert executives
    if (priority) {
      sendPriorityLeadPushNotification(newLead);
    }

    // Show quick success animation
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      // Reset form for next lead
      setName('');
      setCompany('');
      setRole('');
      setPhone('');
      setEmail('');
      setNotes('');
      setPriority(false);
      setSelectedInterests(['IA']);
    }, 1200);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  // Recent leads for current event
  const recentLeadsForEvent = allLeads.filter(l => l.event === currentEvent.name).slice(0, 5);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-3 animate-fade-in">
      
      {/* Main Grid: Fast Capture Form (Left/Center) + Live Side Feed (Right on Large Screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column: Form with Integrated Compact Header */}
        <div className="lg:col-span-8 space-y-3">
          
          {/* Main Lead Form Card with Unified Ultra-Compact Header and 80% scale */}
          <div 
            id="quick-capture-form-card" 
            style={{ zoom: '80%' }}
            className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-md overflow-hidden"
          >
            
            {/* Unified Sleek Header Bar */}
            <div className="bg-slate-900 text-white p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
              
              {/* Left: Brand / Title */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-amber-300 shrink-0 shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
                      Captura Rápida
                    </h2>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border border-emerald-500/30 shrink-0 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      VIVO
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Controls: Only Voice Assistant */}
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                {/* Compact Voice Assistant Trigger */}
                <VoiceLeadAssistant
                  isCompact={true}
                  onApplyVoiceData={handleApplyVoiceData}
                  onExecuteCommand={handleExecuteVoiceCommand}
                  onActiveFieldChange={(field) => setActiveVoiceField(field)}
                />
              </div>
            </div>

            {/* Success Toast Overlay */}
            {savedSuccess ? (
              <div className="p-12 text-center space-y-4 animate-scale-up">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-slate-900">¡Lead Registrado con Éxito!</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  El prospecto ha sido indexado en tiempo real en la base central de <strong className="text-slate-800">{currentEvent.name}</strong>. Listo para el siguiente contacto.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="p-3 sm:p-4 space-y-2.5">
                
                {/* Secondary Quick Scan / Auto Example Compact Action Bar */}
                <div className="flex items-center justify-between bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-200/80 gap-2">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Aceleradores:</span>
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="py-1 px-2.5 bg-white hover:bg-blue-50 text-blue-800 border border-blue-200/80 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
                    >
                      <Camera className="w-3 h-3 text-blue-600 shrink-0" />
                      <span>Escanear Tarjeta/QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleQuickScan}
                      className="py-1 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0 whitespace-nowrap"
                      title="Autocompletar datos de ejemplo"
                    >
                      <Wand2 className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span>Ejemplo</span>
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div className={`p-1 rounded-xl transition-all duration-300 ${
                  activeVoiceField === 'name' 
                    ? 'ring-2 ring-indigo-500 bg-indigo-50/50 shadow-xs' 
                    : highlightField ? 'ring-2 ring-emerald-400 bg-emerald-50/30' : ''
                }`}>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-blue-600" />
                      <span>Nombre Completo del lead *</span>
                    </span>
                    {activeVoiceField === 'name' && (
                      <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                        Dictando por voz...
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Eduardo Mendoza"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                  />
                </div>

                {/* Company & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className={`p-1 rounded-xl transition-all duration-300 ${
                    activeVoiceField === 'company' 
                      ? 'ring-2 ring-indigo-500 bg-indigo-50/50 shadow-xs' 
                      : ''
                  }`}>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-indigo-600" />
                        <span>Empresa *</span>
                      </span>
                      {activeVoiceField === 'company' && (
                        <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                          Voz
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Cementos Argos"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>

                  <div className={`p-1 rounded-xl transition-all duration-300 ${
                    activeVoiceField === 'role' 
                      ? 'ring-2 ring-indigo-500 bg-indigo-50/50 shadow-xs' 
                      : ''
                  }`}>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-purple-600" />
                        <span>Cargo / Puesto</span>
                      </span>
                      {activeVoiceField === 'role' && (
                        <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                          Voz
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Director de Operaciones"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className={`p-1 rounded-xl transition-all duration-300 ${
                    activeVoiceField === 'phone' 
                      ? 'ring-2 ring-indigo-500 bg-indigo-50/50 shadow-xs' 
                      : ''
                  }`}>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>Teléfono / Celular</span>
                      </span>
                      {activeVoiceField === 'phone' && (
                        <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                          Voz
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder="+57 312 888 7766"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>

                  <div className={`p-1 rounded-xl transition-all duration-300 ${
                    activeVoiceField === 'email' 
                      ? 'ring-2 ring-indigo-500 bg-indigo-50/50 shadow-xs' 
                      : ''
                  }`}>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-amber-600" />
                        <span>Correo Electrónico</span>
                      </span>
                      {activeVoiceField === 'email' && (
                        <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                          Voz
                        </span>
                      )}
                    </label>
                    <input
                      type="email"
                      placeholder="cmendoza@argos.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Touch Target Interest Selector */}
                <div className={`p-1 rounded-xl transition-all duration-300 ${
                  activeVoiceField === 'interests' 
                    ? 'ring-2 ring-indigo-500 bg-indigo-50/50 shadow-xs' 
                    : ''
                }`}>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-blue-600" />
                      <span>Intereses (Toca para seleccionar o dicta por voz)</span>
                    </span>
                    <span className="text-[9px] text-blue-600 font-semibold">{selectedInterests.length} seleccionados</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                    {INTEREST_OPTIONS.map((interest) => {
                      const active = selectedInterests.includes(interest);
                      return (
                        <button
                          type="button"
                          key={interest}
                          onClick={() => toggleInterest(interest)}
                          className={`py-1 px-1 rounded-lg text-[10px] font-bold text-center transition-all cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white shadow-2xs scale-102 ring-1 ring-blue-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Touchpoint / Sources Selector */}
                <div className={`p-1 rounded-xl transition-all duration-300 ${
                  activeVoiceField === 'sources' 
                    ? 'ring-2 ring-indigo-500 bg-indigo-50/50 shadow-xs' 
                    : ''
                }`}>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Touchpoint / Canal</span>
                    {activeVoiceField === 'sources' && (
                      <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                        Voz
                      </span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {SOURCE_OPTIONS.slice(0, 5).map((src) => {
                      const active = selectedSources.includes(src);
                      return (
                        <button
                          type="button"
                          key={src}
                          onClick={() => toggleSource(src)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                            active
                              ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {src}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority / VIP Toggle */}
                <button
                  type="button"
                  onClick={() => setPriority(!priority)}
                  className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-between border cursor-pointer transition-all ${
                    priority
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Star className={`w-3.5 h-3.5 ${priority ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                    <span className="font-bold">Marcar como Prospecto Prioritario / VIP</span>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.2 rounded-md ${priority ? 'bg-amber-400 text-slate-900' : 'bg-slate-200 text-slate-600'}`}>
                    {priority ? "URGENTE" : "ESTÁNDAR"}
                  </span>
                </button>

                {/* Notes */}
                <div className={`p-1 rounded-xl transition-all duration-300 ${
                  activeVoiceField === 'notes' 
                    ? 'ring-2 ring-indigo-500 bg-indigo-50/50 shadow-xs' 
                    : ''
                }`}>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                    <span>Notas Rápidas de la Conversación</span>
                    {activeVoiceField === 'notes' && (
                      <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                        Dictando notas por voz...
                      </span>
                    )}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles clave, requerimientos o compromisos acordados..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                  />
                </div>

                {/* Save Button CTA */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Guardar Prospecto y Capturar Siguiente</span>
                </button>

              </form>
            )}

          </div>
        </div>

        {/* Right Column: Live Feed of Recent Captures & Event Stats (Visible on LG screens) */}
        <div className="lg:col-span-4 space-y-3.5">
          
          {/* Quick Event Summary Card */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Actividad en Vivo</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-blue-50/80 p-3 rounded-2xl border border-blue-100">
                <span className="text-[11px] font-bold text-blue-700 block">Total en Evento</span>
                <span className="text-2xl font-black text-blue-900">
                  {allLeads.filter(l => l.event === currentEvent.name).length}
                </span>
              </div>

              <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-100">
                <span className="text-[11px] font-bold text-amber-700 block">Prioritarios VIP</span>
                <span className="text-2xl font-black text-amber-900">
                  {allLeads.filter(l => l.event === currentEvent.name && l.priority).length}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>Sincronización instantánea activa con la base central.</span>
            </div>
          </div>

          {/* Recent Leads Feed */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" />
                Últimos Leads Capturados
              </h3>
              <button
                type="button"
                onClick={onDone}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Ver todos →
              </button>
            </div>

            {recentLeadsForEvent.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No hay leads capturados aún en este evento. ¡Sé el primero en registrar uno con tu voz!
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeadsForEvent.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="p-2.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 hover:bg-slate-100/60 transition-all text-xs"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-black text-slate-900 truncate">
                        {lead.name}
                      </span>
                      {lead.priority && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded-md flex-shrink-0">
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="text-slate-600 text-[11px] font-medium truncate mb-1">
                      {lead.role} · <strong className="text-slate-800">{lead.company}</strong>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{lead.capturedAt}</span>
                      <span className="font-semibold text-slate-500">{lead.capturedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Camera OCR Scanner Modal */}
      <CardScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

    </div>
  );
};
