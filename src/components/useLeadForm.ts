import { useCallback, useEffect, useState } from 'react';
import { CompanyResearchInfo, EventOption, Lead, UserRep } from '../types';
import { cleanCompanyName } from '../utils/company';
import { cleanContact } from '../utils/contactInfo';
import { isOnline, saveLeadOffline } from '../utils/offlineStore';
import { leadHistoryDate, leadTime, leadTimestampFrom, leadTimestampNow, todayISODate } from '../utils/date';
import { sendPriorityLeadPushNotification } from '../utils/pushNotifications';
import { researchCompany, isAiFailure, AI_SIMULATED_WARNING } from '../services/aiService';
import { ParsedVoiceLead } from '../utils/voiceLeadParser';

export type LeadFormVariant = 'modal' | 'page';

export interface LeadFormDefaults {
  variant: LeadFormVariant;
  idPrefix: string;
  roleFallback: string;
  estimatedValue: number;
  initialInterests: string[];
  initialSources: string[];
  initialExperiences: string[];
}

export const MODAL_DEFAULTS: LeadFormDefaults = {
  variant: 'modal',
  idPrefix: 'lead-',
  roleFallback: 'Visitante Comercial',
  estimatedValue: 40000,
  initialInterests: ['IA', 'Analítica'],
  initialSources: ['ArmonIA', 'Registro manual'],
  initialExperiences: ['ArmonIA'],
};

export const PAGE_DEFAULTS: LeadFormDefaults = {
  variant: 'page',
  idPrefix: 'lead-live-',
  roleFallback: 'Visitante Stand',
  estimatedValue: 35000,
  initialInterests: ['IA'],
  initialSources: ['Visita Stand'],
  initialExperiences: ['Captura Rápida'],
};

export interface UseLeadFormOptions {
  currentUser: UserRep;
  currentEvent: EventOption;
  defaults: LeadFormDefaults;
  onSaveLead: (lead: Lead) => void;
  onSaved?: (lead: Lead) => void;
}

export interface UseLeadFormResult {
  name: string;
  company: string;
  role: string;
  phone: string;
  email: string;
  linkedin: string;
  notes: string;
  priority: boolean;
  selectedEvent: string;
  nextContactDate: string;
  captureDate: string;
  captureTime: string;
  selectedInterests: string[];
  selectedSources: string[];
  selectedExperiences: string[];
  companyInfo: CompanyResearchInfo | null;
  isResearchingCompany: boolean;
  researchError: string | null;
  researchSimulated: boolean;
  isScannerOpen: boolean;
  activeVoiceField: string | null;
  validationError: string | null;
  canSubmit: boolean;
  setName: (v: string) => void;
  setCompany: (v: string) => void;
  setRole: (v: string) => void;
  setPhone: (v: string) => void;
  setEmail: (v: string) => void;
  setLinkedin: (v: string) => void;
  setNotes: (v: string) => void;
  setPriority: (v: boolean) => void;
  setNextContactDate: (v: string) => void;
  setCaptureDate: (v: string) => void;
  setCaptureTime: (v: string) => void;
  setSelectedEvent: (v: string) => void;
  setIsScannerOpen: (v: boolean) => void;
  setActiveVoiceField: (v: string | null) => void;
  toggleInterest: (v: string) => void;
  toggleSource: (v: string) => void;
  toggleExperience: (v: string) => void;
  openScanner: () => void;
  handleResearchCompany: (overrideCompany?: string) => void;
  handleApplyVoiceData: (data: ParsedVoiceLead) => void;
  handleExecuteVoiceCommand: (command: 'save' | 'clear' | 'priority' | 'scan') => void;
  handleScanSuccess: (data: ScannedCardPayload) => void;
  handleSimulateScan: () => void;
  resetForm: () => void;
  submit: () => boolean;
}

export interface ScannedCardPayload {
  name?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  city?: string;
  interests?: string[];
  notes?: string;
}

const buildHistoryText = (variant: LeadFormVariant, event: string, author: string, notes: string) =>
  variant === 'page'
    ? `Capturado vía Formulario Rápido en ${event}.`
    : `Lead registrado durante ${event} por ${author}. ${notes}`;

/**
 * El campo acepta "linkedin.com/in/usuario" sin protocolo, pero EnriquecimientoView lo pinta
 * como href. Sin esquema el navegador lo resuelve como ruta relativa y el enlace no abre nada.
 */
const cleanLinkedIn = (value: string): string => {
  const cleaned = cleanContact(value);
  if (!cleaned) return '';
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned.replace(/^\/+/, '')}`;
};

export function useLeadForm({
  currentUser,
  currentEvent,
  defaults,
  onSaveLead,
  onSaved
}: UseLeadFormOptions): UseLeadFormResult {
  const [name, setNameRaw] = useState('');
  const [company, setCompanyRaw] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [priority, setPriority] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(currentEvent.name);
  const [nextContactDate, setNextContactDate] = useState(todayISODate());
  // Fecha y hora reales de captura: por defecto el momento de abrir el formulario.
  const [captureDate, setCaptureDate] = useState(() => todayISODate());
  const [captureTime, setCaptureTime] = useState(() => leadTime());

  const [selectedInterests, setSelectedInterests] = useState<string[]>(defaults.initialInterests);
  const [selectedSources, setSelectedSources] = useState<string[]>(defaults.initialSources);
  const [selectedExperiences, setSelectedExperiences] = useState<string[]>(defaults.initialExperiences);

  const [companyInfo, setCompanyInfo] = useState<CompanyResearchInfo | null>(null);
  const [isResearchingCompany, setIsResearchingCompany] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [researchSimulated, setResearchSimulated] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedEvent(currentEvent.name);
  }, [currentEvent.name]);

  const setName = useCallback((v: string) => {
    setNameRaw(v);
    setValidationError(null);
  }, []);

  // Cambiar la empresa invalida la investigación anterior: el dato de IA era de otra compañía.
  const setCompany = useCallback((v: string) => {
    setCompanyRaw(v);
    setCompanyInfo(null);
    setValidationError(null);
  }, []);

  const toggleInterest = useCallback((interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  }, []);

  const toggleSource = useCallback((source: string) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  }, []);

  const toggleExperience = useCallback((experience: string) => {
    setSelectedExperiences(prev =>
      prev.includes(experience) ? prev.filter(e => e !== experience) : [...prev, experience]
    );
  }, []);

  const openScanner = useCallback(() => setIsScannerOpen(true), []);

  const resetForm = useCallback(() => {
    setNameRaw('');
    setCompanyRaw('');
    setRole('');
    setPhone('');
    setEmail('');
    setLinkedin('');
    setNotes('');
    setPriority(false);
    setNextContactDate(todayISODate());
    // Cada lead nuevo arranca con la fecha/hora de captura en el momento actual.
    setCaptureDate(todayISODate());
    setCaptureTime(leadTime());
    setSelectedEvent(currentEvent.name);
    setSelectedInterests(defaults.initialInterests);
    setSelectedSources(defaults.initialSources);
    setSelectedExperiences(defaults.initialExperiences);
    setCompanyInfo(null);
    setResearchError(null);
    setResearchSimulated(false);
    setValidationError(null);
  }, [currentEvent.name, defaults]);

  const handleResearchCompany = useCallback(
    async (overrideCompany?: string) => {
      const targetCompany = (overrideCompany || company).trim();
      if (!targetCompany) return;

      setIsResearchingCompany(true);
      setResearchError(null);
      setResearchSimulated(false);
      try {
        const data = await researchCompany({ companyName: targetCompany, leadName: name, role });
        if (isAiFailure(data)) {
          setResearchError(data.error);
          return;
        }
        if (!data.companyInfo) {
          setResearchError('La IA no devolvió información de la empresa.');
          return;
        }
        setCompanyInfo(data.companyInfo);
        if (data.simulated) {
          setResearchError(AI_SIMULATED_WARNING);
          setResearchSimulated(true);
        }
      } catch {
        setResearchError('No se pudo contactar el asistente de IA.');
      } finally {
        setIsResearchingCompany(false);
      }
    },
    [company, name, role]
  );

  const handleScanSuccess = useCallback((data: ScannedCardPayload) => {
    if (data.name) setNameRaw(data.name);
    if (data.role) setRole(data.role);
    if (data.company) setCompanyRaw(data.company);
    if (data.email) setEmail(data.email);
    if (data.phone) setPhone(data.phone);
    if (data.notes) setNotes(data.notes);
    if (Array.isArray(data.interests) && data.interests.length > 0) {
      setSelectedInterests(data.interests);
    }
    setSelectedSources(prev => Array.from(new Set([...prev, 'Escanear Tarjeta'])));
    setPriority(true);
  }, []);

  const handleApplyVoiceData = useCallback((data: ParsedVoiceLead) => {
    if (data.name) setNameRaw(data.name);
    if (data.company) setCompanyRaw(data.company);
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
      setNotes(prev => (prev ? `${prev}. ${data.notes}` : data.notes!));
    }
  }, []);

  const handleSimulateScan = useCallback(() => {
    const samples: (ScannedCardPayload & { sources: string[]; experiences: string[] })[] = [
      {
        name: 'Diego Fernando Santos',
        role: 'Head of AI & Data',
        company: 'Bancolombia Digital',
        email: 'dsantos@bancolombia.com.co',
        phone: '+57 310 987 6543',
        interests: ['IA', 'Analítica', 'Datos'],
        sources: ['ArmonIA', 'QR', 'Oráculo'],
        experiences: ['ArmonIA'],
        notes:
          'Capturado mediante escaneo de código QR en stand del evento. Interesado en soluciones de LLM empresarial.'
      },
      {
        name: 'María Constanza Parra',
        role: 'Vicepresidenta de Tecnología',
        company: 'Grupo Argos',
        email: 'mparra@grupoargos.com',
        phone: '+57 301 444 5566',
        interests: ['Nube', 'Automatización', 'IoT'],
        sources: ['Quiromancia', 'WIKKU', 'Visita Stand'],
        experiences: ['Unitree', 'Demo Robótica'],
        notes:
          'Visita directa al stand. Consulta por arquitectura IoT y sensores de telemetría.'
      }
    ];

    const pick = samples[Math.floor(Math.random() * samples.length)];
    setNameRaw(pick.name);
    setRole(pick.role);
    setCompanyRaw(pick.company);
    setEmail(pick.email);
    setPhone(pick.phone);
    setSelectedInterests(pick.interests);
    setSelectedSources(pick.sources);
    setSelectedExperiences(pick.experiences);
    setNotes(pick.notes);
    setPriority(true);
  }, []);

  const submit = useCallback((): boolean => {
    if (!name.trim() || !company.trim()) {
      setValidationError('Completa al menos el Nombre y la Empresa para guardar.');
      return false;
    }

    if (!captureDate) {
      setValidationError('Indica la fecha de captura del lead.');
      return false;
    }
    if (captureDate > todayISODate()) {
      setValidationError('La fecha de captura no puede ser futura.');
      return false;
    }

    const trimmedNotes = notes.trim();
    const linkedinValue = cleanLinkedIn(linkedin);
    // `capturedAt` refleja cuándo se capturó el lead, no cuándo se escribió en Firestore.
    const capturedAt = leadTimestampFrom(captureDate, captureTime);
    const newLead: Lead = {
      id: `${defaults.idPrefix}${Date.now()}`,
      name: name.trim(),
      role: role.trim() || defaults.roleFallback,
      company: cleanCompanyName(company),
      email: cleanContact(email),
      phone: cleanContact(phone),
      ...(linkedinValue ? { linkedinUrl: linkedinValue } : {}),
      event: selectedEvent,
      interests: selectedInterests.length > 0 ? selectedInterests : ['IA'],
      experiences: selectedExperiences.length > 0 ? selectedExperiences : defaults.initialExperiences,
      sources: selectedSources.length > 0 ? selectedSources : ['Registro manual'],
      capturedBy: currentUser.name,
      capturedAt,
      lastContact: leadTimestampNow(),
      priority,
      status: 'Nuevo',
      estimatedValue: defaults.estimatedValue,
      notes: trimmedNotes,
      nextContactDate: nextContactDate || todayISODate(),
      history: [
        {
          id: `hist-${Date.now()}`,
          // El primer item es la nota de captura: lleva la fecha de captura elegida.
          date: capturedAt.slice(0, 10),
          time: capturedAt.slice(11, 16),
          author: currentUser.name,
          text: buildHistoryText(defaults.variant, selectedEvent, currentUser.name, trimmedNotes),
          type: 'note'
        }
      ],
      suggestedAction: {
        title: 'Agendar reunión de presentación',
        description: `Proponer fecha para reunión ejecutiva sobre ${selectedInterests.join(', ')}.`,
        type: 'meeting'
      },
      ...(companyInfo ? { companyInfo } : {})
    };

    if (!isOnline()) {
      saveLeadOffline(newLead);
    }

    onSaveLead(newLead);

    if (priority) {
      sendPriorityLeadPushNotification(newLead);
    }

    onSaved?.(newLead);
    return true;
  }, [
    name, company, role, email, phone, linkedin, notes, selectedEvent,
    selectedInterests, selectedExperiences, selectedSources, currentUser.name,
    priority, nextContactDate, captureDate, captureTime, companyInfo, defaults,
    onSaveLead, onSaved
  ]);

  const handleExecuteVoiceCommand = useCallback(
    (command: 'save' | 'clear' | 'priority' | 'scan') => {
      if (command === 'save') {
        submit();
      } else if (command === 'clear') {
        resetForm();
      } else if (command === 'priority') {
        setPriority(prev => !prev);
      } else if (command === 'scan') {
        openScanner();
      }
    },
    [submit, resetForm, openScanner]
  );

  return {
    name, company, role, phone, email, linkedin, notes, priority,
    selectedEvent, nextContactDate, captureDate, captureTime,
    selectedInterests, selectedSources, selectedExperiences,
    companyInfo, isResearchingCompany, researchError, researchSimulated,
    isScannerOpen, activeVoiceField, validationError,
    canSubmit: Boolean(name.trim() && company.trim()),
    setName, setCompany, setRole, setPhone, setEmail, setLinkedin, setNotes, setPriority,
    setNextContactDate, setCaptureDate, setCaptureTime, setSelectedEvent,
    setIsScannerOpen, setActiveVoiceField,
    toggleInterest, toggleSource, toggleExperience, openScanner,
    handleResearchCompany, handleApplyVoiceData, handleExecuteVoiceCommand,
    handleScanSuccess, handleSimulateScan, resetForm, submit
  };
}