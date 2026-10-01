import { useEffect, useRef, useState } from 'react';
import { Lead, LeadStatus, InteractionItem, CompanyResearchInfo } from '../types';
import {
  researchCompany,
  analyzeLead,
  draftEmail,
  isAiFailure,
  LeadAnalysis,
  DraftEmail,
  AI_SIMULATED_WARNING
} from '../services/aiService';
import { formatLeadTimestamp, leadHistoryDate, leadTime, leadTimestampNow } from '../utils/date';

/* ───────────── Tipos y constantes ───────────── */

export type DrawerTab = 'resumen' | 'actividad' | 'ia';
export type DrawerModal = 'schedule' | 'qr' | 'delete';

export const LEAD_STATUSES: LeadStatus[] = [
  'Nuevo',
  'Contactado',
  'Calificado',
  'Reunión Agendada',
  'Ganado',
  'Descartado'
];

const AI_UNREACHABLE_MESSAGE = 'No se pudo contactar el asistente de IA.';

/* ───────────── Utilidades y Fecha/Hora en Tiempo Real ───────────── */

export const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
};

/** Escapa los caracteres reservados del formato vCard. */
const escapeVCard = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

/** Texto vCard que se codifica en el QR para guardar el contacto en el teléfono. */
export const buildVCard = (lead: Lead): string => {
  const nameParts = lead.name.trim().split(/\s+/).filter(Boolean);
  const family = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const given = nameParts[0] ?? '';
  const additional = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
  const structuredName = [family, given, additional, '', ''].map(escapeVCard).join(';');

  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${structuredName}`,
    `FN:${escapeVCard(lead.name)}`,
    `ORG:${escapeVCard(lead.company)}`,
    `TITLE:${escapeVCard(lead.role)}`,
    `TEL;TYPE=CELL:${escapeVCard(lead.phone || '')}`,
    `EMAIL:${escapeVCard(lead.email || '')}`,
    `NOTE:${escapeVCard(`Lead de ${lead.event} - Divergency AI`)}`,
    'END:VCARD'
  ].join('\r\n');
};

let historySequence = 0;

const createHistoryItem = (
  author: string,
  type: InteractionItem['type'],
  text: string
): InteractionItem => {
  historySequence += 1;
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `hist-${Date.now()}-${historySequence}`;

  return {
    id,
    date: leadHistoryDate(),
    time: leadTime(),
    author,
    text,
    type
  };
};

/** Bandera viva mientras el componente está montado, para no escribir estado tras desmontar. */
const useMountedRef = () => {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return mountedRef;
};

/* ───────────── Acciones que modifican el lead y registran historial ───────────── */

const createLeadActions = (
  getLead: () => Lead,
  currentUser: string,
  onUpdateLead: (updated: Lead) => void
) => {
  const togglePriority = () => {
    const lead = getLead();
    const priority = !lead.priority;
    const item = createHistoryItem(
      currentUser,
      'priority_change',
      priority
        ? `${currentUser} marcó el lead como seguimiento prioritario.`
        : `${currentUser} desmarcó la prioridad del lead.`
    );
    onUpdateLead({ ...lead, priority, history: [item, ...lead.history] });
  };

  const changeStatus = (status: LeadStatus) => {
    const lead = getLead();
    if (lead.status === status) return;

    const item = createHistoryItem(currentUser, 'status_change', `Estado cambiado a: ${status}`);
    onUpdateLead({
      ...lead,
      status,
      lastContact: leadTimestampNow(),
      history: [item, ...lead.history]
    });
  };

  const addNote = (text: string) => {
    const lead = getLead();
    const item = createHistoryItem(currentUser, 'note', text);
    onUpdateLead({
      ...lead,
      lastContact: leadTimestampNow(),
      history: [item, ...lead.history]
    });
  };

  const scheduleMeeting = (meetingDate: string, meetingNotes: string) => {
    const lead = getLead();
    const item = createHistoryItem(
      currentUser,
      'meeting',
      `Reunión agendada para el ${formatLeadTimestamp(meetingDate) || meetingDate}. Notas: ${meetingNotes || 'Sin notas adicionales'}`
    );
    onUpdateLead({
      ...lead,
      status: 'Reunión Agendada',
      lastContact: leadTimestampNow(),
      nextContactDate: meetingDate ? meetingDate.slice(0, 10) : lead.nextContactDate,
      history: [item, ...lead.history]
    });
  };

  return { togglePriority, changeStatus, addNote, scheduleMeeting };
};

/* ───────────── IA: investigación de empresa (Google Search Grounding) ───────────── */

const useCompanyResearch = (lead: Lead, onUpdateLead: (updated: Lead) => void) => {
  const leadRef = useRef(lead);
  leadRef.current = lead;
  const mountedRef = useMountedRef();

  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<CompanyResearchInfo | null>(null);

  const research = async () => {
    const current = leadRef.current;
    if (!current.company) return;
    setIsResearching(true);
    setError(null);
    setSimulated(false);
    setNotice(null);
    setPreview(null);
    try {
      const data = await researchCompany({
        companyName: current.company,
        leadName: current.name,
        role: current.role
      });
      if (!mountedRef.current) return;

      if (isAiFailure(data)) {
        setError(data.error);
        setSimulated(data.simulated);
        return;
      }
      if (!data.companyInfo) {
        setError('La IA no devolvió información de la empresa.');
        return;
      }
      if (data.simulated) {
        setPreview(data.companyInfo);
        setNotice(AI_SIMULATED_WARNING);
        return;
      }
      setPreview(null);
      onUpdateLead({ ...leadRef.current, companyInfo: data.companyInfo });
      if (data.usedSearch === false) {
        setNotice('La IA respondió sin buscar en la web: este perfil no está verificado.');
      }
    } catch {
      if (mountedRef.current) setError(AI_UNREACHABLE_MESSAGE);
    } finally {
      if (mountedRef.current) setIsResearching(false);
    }
  };

  return {
    isResearching,
    error,
    simulated,
    notice,
    shownCompanyInfo: preview ?? lead.companyInfo,
    research
  };
};

/* ───────────── IA: análisis del perfil ───────────── */

const useLeadAnalysis = (lead: Lead) => {
  const leadRef = useRef(lead);
  leadRef.current = lead;
  const mountedRef = useMountedRef();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<LeadAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);

  const analyze = async () => {
    const current = leadRef.current;
    setIsAnalyzing(true);
    setAnalysis(null);
    setError(null);
    setNotice(null);
    setSimulated(false);
    try {
      const data = await analyzeLead({
        name: current.name,
        company: current.company,
        role: current.role,
        interests: current.interests,
        interactions: current.history.map(h => h.text),
        notes: current.notes
      });
      if (!mountedRef.current) return;

      if (isAiFailure(data)) {
        setError(data.error);
        setSimulated(data.simulated);
        return;
      }
      if (!data.analysis) {
        setError('La IA no devolvió un análisis.');
        return;
      }
      setAnalysis(data.analysis);
      if (data.simulated) {
        setNotice(AI_SIMULATED_WARNING);
        setSimulated(true);
      }
    } catch {
      if (mountedRef.current) setError(AI_UNREACHABLE_MESSAGE);
    } finally {
      if (mountedRef.current) setIsAnalyzing(false);
    }
  };

  return { isAnalyzing, analysis, error, notice, simulated, analyze };
};

/* ───────────── IA: borrador de email ───────────── */

const useEmailDraft = (lead: Lead, currentUser: string) => {
  const leadRef = useRef(lead);
  leadRef.current = lead;
  const mountedRef = useMountedRef();

  const [isDrafting, setIsDrafting] = useState(false);
  const [email, setEmail] = useState<DraftEmail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const draft = async () => {
    const current = leadRef.current;
    setIsDrafting(true);
    setEmail(null);
    setError(null);
    setNotice(null);
    setSimulated(false);
    try {
      const data = await draftEmail({
        leadName: current.name,
        leadCompany: current.company,
        leadRole: current.role,
        interests: current.interests,
        repName: currentUser,
        eventName: current.event
      });
      if (!mountedRef.current) return;

      if (isAiFailure(data)) {
        setError(data.error);
        setSimulated(data.simulated);
        return;
      }
      if (!data.email) {
        setError('La IA no devolvió un correo.');
        return;
      }
      setEmail(data.email);
      if (data.simulated) {
        setNotice(AI_SIMULATED_WARNING);
        setSimulated(true);
      }
    } catch {
      if (mountedRef.current) setError(AI_UNREACHABLE_MESSAGE);
    } finally {
      if (mountedRef.current) setIsDrafting(false);
    }
  };

  const copy = async () => {
    if (!email) return;
    const text = `Asunto: ${email.asunto}\n\n${email.cuerpo}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
    } catch {
      setCopied(false);
      setError('No se pudo copiar el correo. Selecciona el texto manualmente.');
    }
  };

  return { isDrafting, email, error, notice, simulated, copied, draft, copy };
};

/* ───────────── Hook público ───────────── */

export const useLeadDrawer = (
  lead: Lead,
  currentUser: string,
  onUpdateLead: (updated: Lead) => void
) => {
  const leadRef = useRef(lead);
  leadRef.current = lead;

  return {
    actions: createLeadActions(() => leadRef.current, currentUser, onUpdateLead),
    companyResearch: useCompanyResearch(lead, onUpdateLead),
    analysis: useLeadAnalysis(lead),
    emailDraft: useEmailDraft(lead, currentUser)
  };
};

export type LeadDrawerState = ReturnType<typeof useLeadDrawer>;
