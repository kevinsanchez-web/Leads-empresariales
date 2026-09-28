import React, { useState } from 'react';
import { 
  X, 
  Star, 
  Calendar, 
  Sparkles, 
  Mail, 
  Phone, 
  Clock, 
  Send, 
  Copy, 
  Bot, 
  QrCode, 
  Trash2, 
  AlertTriangle,
  MessageCircle,
  Building2,
  MapPin,
  DollarSign,
  FileText,
  Search,
  Globe,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Lead, LeadStatus, InteractionItem } from '../types';
import { researchCompany, analyzeLead, draftEmail } from '../services/aiService';

interface LeadDetailDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateLead: (updated: Lead) => void;
  onDeleteLead?: (id: string) => void;
  currentUser: string;
}

type DrawerTab = 'resumen' | 'actividad' | 'ia';

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  onClose,
  onUpdateLead,
  onDeleteLead,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('resumen');
  const [newNote, setNewNote] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  const [isDraftingEmail, setIsDraftingEmail] = useState(false);
  const [aiEmail, setAiEmail] = useState<{ asunto: string; cuerpo: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');

  // AI Company Research (Google Search Grounding)
  const [isResearchingCompany, setIsResearchingCompany] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);

  if (!lead) return null;

  const handleResearchCompany = async () => {
    if (!lead || !lead.company) return;
    setIsResearchingCompany(true);
    setResearchError(null);
    try {
      const data: any = await researchCompany({ companyName: lead.company, leadName: lead.name, role: lead.role });
      if (data.success && data.companyInfo) {
        onUpdateLead({
          ...lead,
          companyInfo: data.companyInfo
        });
      } else {
        setResearchError(data.error || 'No se pudo obtener información de la empresa.');
      }
    } catch (err: any) {
      setResearchError('Error de conexión al consultar Google Search.');
    } finally {
      setIsResearchingCompany(false);
    }
  };

  // Generate vCard format string for QR code scanning into smartphone contacts
  const vCardData = `BEGIN:VCARD
VERSION:3.0
N:${lead.name.split(' ').reverse().join(';')};;;
FN:${lead.name}
ORG:${lead.company}
TITLE:${lead.role}
TEL;TYPE=CELL:${lead.phone || ''}
EMAIL:${lead.email || ''}
NOTE:Lead de ${lead.event} - Divergency AI
END:VCARD`;

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleTogglePriority = () => {
    const newPriority = !lead.priority;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newHistoryItem: InteractionItem = {
      id: `hist-${Date.now()}`,
      date: "Hoy",
      time: timeStr,
      author: currentUser,
      text: newPriority 
        ? `${currentUser} marcó el lead como seguimiento prioritario.` 
        : `${currentUser} desmarcó la prioridad del lead.`,
      type: 'priority_change'
    };

    onUpdateLead({
      ...lead,
      priority: newPriority,
      history: [newHistoryItem, ...lead.history]
    });
  };

  const handleStatusChange = (newStatus: LeadStatus) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newHistoryItem: InteractionItem = {
      id: `hist-${Date.now()}`,
      date: "Hoy",
      time: timeStr,
      author: currentUser,
      text: `Estado cambiado a: ${newStatus}`,
      type: 'status_change'
    };

    onUpdateLead({
      ...lead,
      status: newStatus,
      lastContact: `Hoy, ${timeStr}`,
      history: [newHistoryItem, ...lead.history]
    });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newHistoryItem: InteractionItem = {
      id: `hist-${Date.now()}`,
      date: "Hoy",
      time: timeStr,
      author: currentUser,
      text: newNote.trim(),
      type: 'note'
    };

    onUpdateLead({
      ...lead,
      lastContact: `Hoy, ${timeStr}`,
      history: [newHistoryItem, ...lead.history]
    });

    setNewNote('');
  };

  const handleAnalyzeWithGemini = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const data: any = await analyzeLead({
        name: lead.name,
        company: lead.company,
        role: lead.role,
        interests: lead.interests,
        interactions: lead.history.map(h => h.text),
        notes: lead.notes
      });
      if (data.success && data.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        setAiAnalysis({
          resumenEstrategico: `${lead.name} de ${lead.company} es un prospecto de alta relevancia con interés claro en ${lead.interests.join(', ')}.`,
          oportunidadClave: "Implementación de automatización e inteligencia artificial en procesos corporativos.",
          siguienteAccion: "Agendar reunión técnica de 30 minutos con demostración de casos de éxito.",
          nivelPrioridad: "Alta"
        });
      }
    } catch (err) {
      setAiAnalysis({
        resumenEstrategico: `${lead.name} de ${lead.company} destaca por interés directo en ${lead.interests.join(', ')}.`,
        oportunidadClave: "Optimización operativa e integración tecnológica.",
        siguienteAccion: "Realizar seguimiento telefónico o agendar demostración privada.",
        nivelPrioridad: "Alta"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDraftEmail = async () => {
    setIsDraftingEmail(true);
    setAiEmail(null);
    try {
      const data: any = await draftEmail({
        leadName: lead.name,
        leadCompany: lead.company,
        leadRole: lead.role,
        interests: lead.interests,
        repName: currentUser,
        eventName: lead.event
      });
      if (data.success && data.email) {
        setAiEmail(data.email);
      } else {
        setAiEmail({
          asunto: `Seguimiento a nuestra reunión en ${lead.event} - ${lead.company}`,
          cuerpo: `Hola ${lead.name},\n\nFue un gusto saludarte durante ${lead.event}. Conversamos sobre cómo potenciar las iniciativas de ${lead.company} en ${lead.interests.join(', ')}.\n\nMe gustaría proponerte una breve reunión virtual de 15 minutos para mostrarte casos de aplicación reales.\n\n¿Tienes disponibilidad esta semana?\n\nUn cordial saludo,\n${currentUser}\nDivergency AI`
        });
      }
    } catch (err) {
      setAiEmail({
        asunto: `Seguimiento comercial ${lead.event} - ${lead.company}`,
        cuerpo: `Hola ${lead.name},\n\nGracias por visitarnos en ${lead.event}. Me encantaría continuar nuestra conversación sobre ${lead.interests.join(', ')}.\n\nQuedo atento a tu respuesta para agendar una breve llamada.\n\nSaludos,\n${currentUser}`
      });
    } finally {
      setIsDraftingEmail(false);
    }
  };

  const handleConfirmScheduleMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const newHistoryItem: InteractionItem = {
      id: `hist-${Date.now()}`,
      date: "Hoy",
      time: timeStr,
      author: currentUser,
      text: `Reunión agendada para el ${meetingDate}. Notas: ${meetingNotes || 'Sin notas adicionales'}`,
      type: 'meeting'
    };

    onUpdateLead({
      ...lead,
      status: "Reunión Agendada",
      lastContact: `Hoy, ${timeStr}`,
      nextContactDate: meetingDate || lead.nextContactDate,
      history: [newHistoryItem, ...lead.history]
    });

    setShowScheduleModal(false);
    setMeetingNotes('');
  };

  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-4 flex flex-col max-h-[calc(100vh-130px)] overflow-hidden">
      
      {/* Header Compacto y Directo */}
      <div className="flex items-start justify-between pb-3 border-b border-black/[0.05] gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071E3] to-[#5856D6] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
            {getInitials(lead.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-bold text-[#1D1D1F] leading-tight truncate">
                {lead.name}
              </h2>
              <button
                onClick={handleTogglePriority}
                className="text-slate-300 hover:text-[#FF9500] cursor-pointer transition-colors p-0.5 shrink-0"
                title={lead.priority ? "Quitar prioridad" : "Marcar prioridad"}
              >
                <Star className={`w-3.5 h-3.5 ${lead.priority ? 'fill-[#FF9500] text-[#FF9500]' : ''}`} />
              </button>
            </div>
            <div className="text-xs font-semibold text-[#0071E3] truncate">
              {lead.company} <span className="text-slate-400 font-normal">• {lead.role}</span>
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowQrModal(true)}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Código QR vCard"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>

          {onDeleteLead && (
            <button
              onClick={() => setShowDeleteConfirmModal(true)}
              className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
              title="Eliminar lead"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-500 hover:text-[#1D1D1F] flex items-center justify-center transition-colors cursor-pointer"
            title="Cerrar panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Action Contact Bar (Responsive, Non-Overlapping Mobile-First Layout) */}
      <div className="py-2.5 space-y-2 border-b border-black/[0.04] shrink-0 text-xs">
        {/* Status Dropdown & Agendar Action */}
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Estado:</span>
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              className="bg-[#F5F5F7] hover:bg-[#EBEBEF] border border-black/[0.06] rounded-xl px-2.5 py-1 font-bold text-[#1D1D1F] text-xs focus:outline-none focus:ring-2 focus:ring-[#0071E3] cursor-pointer transition-colors"
            >
              <option value="Nuevo">Nuevo</option>
              <option value="Contactado">Contactado</option>
              <option value="Calificado">Calificado</option>
              <option value="Reunión Agendada">Reunión Agendada</option>
              <option value="Ganado">Ganado</option>
              <option value="Descartado">Descartado</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="px-2.5 py-1 bg-[#5856D6]/10 hover:bg-[#5856D6]/20 text-[#5856D6] rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs shrink-0 active:scale-95"
            title="Agendar reunión"
          >
            <Calendar className="w-3.5 h-3.5 text-[#5856D6] shrink-0" />
            <span>Agendar</span>
          </button>
        </div>

        {/* 3-Column Fast Direct Action Dock: Llamar, WhatsApp, Email */}
        <div className="grid grid-cols-3 gap-1.5">
          {lead.phone ? (
            <a
              href={`tel:${lead.phone}`}
              className="py-1.5 px-2 bg-[#34C759]/10 hover:bg-[#34C759]/20 text-[#28A745] border border-[#34C759]/20 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs active:scale-95 text-center truncate"
              title={`Llamar a ${lead.phone}`}
            >
              <Phone className="w-3.5 h-3.5 text-[#28A745] shrink-0" />
              <span className="truncate">Llamar</span>
            </a>
          ) : (
            <div className="py-1.5 px-2 bg-slate-100 text-slate-400 rounded-xl font-medium flex items-center justify-center gap-1.5 text-xs text-center select-none">
              <Phone className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span>Sin Tel</span>
            </div>
          )}

          {lead.phone ? (
            <a
              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="py-1.5 px-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#1EBE5D] border border-[#25D366]/20 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs active:scale-95 text-center truncate"
              title="Abrir chat en WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
              <span className="truncate">WhatsApp</span>
            </a>
          ) : (
            <div className="py-1.5 px-2 bg-slate-100 text-slate-400 rounded-xl font-medium flex items-center justify-center gap-1.5 text-xs text-center select-none">
              <MessageCircle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span>WhatsApp</span>
            </div>
          )}

          {lead.email ? (
            <a
              href={`mailto:${lead.email}`}
              className="py-1.5 px-2 bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] border border-[#0071E3]/20 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all text-xs active:scale-95 text-center truncate"
              title={`Enviar email a ${lead.email}`}
            >
              <Mail className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />
              <span className="truncate">Email</span>
            </a>
          ) : (
            <div className="py-1.5 px-2 bg-slate-100 text-slate-400 rounded-xl font-medium flex items-center justify-center gap-1.5 text-xs text-center select-none">
              <Mail className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span>Sin Email</span>
            </div>
          )}
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex bg-[#F5F5F7] p-1 rounded-xl my-2 shrink-0 border border-black/[0.03] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setActiveTab('resumen')}
          className={`flex-1 min-w-[75px] py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'resumen'
              ? 'bg-white text-[#1D1D1F] shadow-xs font-bold'
              : 'text-slate-500 hover:text-[#1D1D1F]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span>Datos</span>
        </button>

        <button
          onClick={() => setActiveTab('actividad')}
          className={`flex-1 min-w-[90px] py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'actividad'
              ? 'bg-white text-[#1D1D1F] shadow-xs font-bold'
              : 'text-slate-500 hover:text-[#1D1D1F]'
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Notas ({lead.history.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ia')}
          className={`flex-1 min-w-[105px] py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${
            activeTab === 'ia'
              ? 'bg-white text-[#0071E3] shadow-xs font-bold'
              : 'text-slate-500 hover:text-[#1D1D1F]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />
          <span>IA Assistant</span>
        </button>
      </div>

      {/* Tab Content Body with Contained Smooth Scroll */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0 text-xs">
        
        {/* TAB 1: RESUMEN Y DATOS CLAVE (Clean, Flat Key-Value, No Nested Boxes) */}
        {activeTab === 'resumen' && (
          <div className="space-y-3 pt-1">
            {/* Información de la Empresa (IA Grounding Google Search) */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50/80 via-slate-50 to-indigo-50/30 border border-blue-200/60 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-blue-100/80 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Perfil de {lead.company}</span>
                </div>
                <button
                  type="button"
                  onClick={handleResearchCompany}
                  disabled={isResearchingCompany}
                  className="px-2 py-1 rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Investigar con Google Search Grounding"
                >
                  {isResearchingCompany ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                      <span>Investigando...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3 h-3 text-blue-600" />
                      <span>{lead.companyInfo ? 'Actualizar IA' : 'Investigar con IA'}</span>
                    </>
                  )}
                </button>
              </div>

              {isResearchingCompany && (
                <div className="flex items-center gap-2 text-slate-600 py-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span>Buscando datos en Google Search...</span>
                </div>
              )}

              {researchError && (
                <div className="text-red-600 text-[11px]">
                  {researchError}
                </div>
              )}

              {lead.companyInfo && !isResearchingCompany ? (
                <div className="space-y-2 text-slate-800">
                  <p className="text-slate-700 leading-relaxed text-xs">
                    <span className="font-bold text-slate-900">¿A qué se dedica?: </span>
                    {lead.companyInfo.summary}
                  </p>

                  {lead.companyInfo.industry && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-bold text-slate-900">Sector:</span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold">
                        {lead.companyInfo.industry}
                      </span>
                    </div>
                  )}

                  {lead.companyInfo.productsAndServices && lead.companyInfo.productsAndServices.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-900 block mb-1 text-[11px]">Productos & Soluciones:</span>
                      <div className="flex flex-wrap gap-1">
                        {lead.companyInfo.productsAndServices.map((prod, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-blue-100 text-blue-900 text-[10px] font-medium">
                            {prod}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {lead.companyInfo.sources && lead.companyInfo.sources.length > 0 && (
                    <div className="pt-2 border-t border-blue-100/80">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Fuentes Google Search:</span>
                      <div className="flex flex-wrap gap-1">
                        {lead.companyInfo.sources.map((src, i) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-700 hover:underline bg-white px-2 py-0.5 rounded-md border border-slate-200"
                          >
                            <Globe className="w-2.5 h-2.5 text-blue-500" />
                            <span className="truncate max-w-[130px]">{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : !isResearchingCompany && !researchError && (
                <div className="text-slate-500 text-[11px] py-1 flex items-center justify-between">
                  <span>Presiona "Investigar con IA" para descubrir a qué se dedica {lead.company} en tiempo real con Google Search.</span>
                </div>
              )}
            </div>

            {/* Key Attributes List */}
            <div className="divide-y divide-black/[0.04]">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400 font-medium">Evento</span>
                <span className="font-semibold text-[#1D1D1F]">{lead.event}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400 font-medium">Pipeline Estimado</span>
                <span className="font-bold text-[#28A745]">
                  {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()} USD` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400 font-medium">Registrado por</span>
                <span className="font-semibold text-slate-800">{lead.capturedBy}</span>
              </div>
              {lead.city && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400 font-medium">Ciudad / Sede</span>
                  <span className="font-semibold text-slate-800">{lead.city}</span>
                </div>
              )}
              {lead.lastContact && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-400 font-medium">Último Contacto</span>
                  <span className="font-medium text-slate-600">{lead.lastContact}</span>
                </div>
              )}
            </div>

            {/* Intereses Clave */}
            <div className="pt-2 border-t border-black/[0.04]">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Intereses Registrados
              </span>
              <div className="flex flex-wrap gap-1">
                {lead.interests.map((int, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F5F5F7] text-[#1D1D1F]"
                  >
                    {int}
                  </span>
                ))}
              </div>
            </div>

            {/* Notas del lead (si existen) */}
            {lead.notes && (
              <div className="pt-2 border-t border-black/[0.04]">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Nota Inicial
                </span>
                <p className="text-slate-700 text-xs bg-[#F5F5F7] p-2.5 rounded-xl leading-relaxed">
                  {lead.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HISTORIAL Y NOTAS DE INTERACCIÓN */}
        {activeTab === 'actividad' && (
          <div className="space-y-3 pt-1 flex flex-col h-full">
            {/* Note Input */}
            <form onSubmit={handleAddNote} className="flex gap-1.5">
              <input
                type="text"
                placeholder="Escribir nueva nota de seguimiento..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0071E3] text-[#1D1D1F]"
              />
              <button
                type="submit"
                disabled={!newNote.trim()}
                className="px-2.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>

            {/* Activity List */}
            <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
              {lead.history.map((item) => (
                <div key={item.id} className="p-2 rounded-xl bg-[#F5F5F7]/80 text-xs border border-black/[0.02]">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-semibold text-slate-600">{item.author}</span>
                    <span>{item.date}, {item.time}</span>
                  </div>
                  <p className="text-slate-800 font-medium text-[11px] leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ASISTENTE DE IA (GEMINI) */}
        {activeTab === 'ia' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1D1D1F] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#0071E3]" />
                divergency AI Engine
              </span>
              <span className="text-[10px] text-slate-400">Gemini Pro</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAnalyzeWithGemini}
                disabled={isAnalyzing}
                className="px-2.5 py-1.5 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-[#1D1D1F] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Bot className="w-3.5 h-3.5 text-[#5856D6]" />
                <span>{isAnalyzing ? "Analizando..." : "Analizar Perfil"}</span>
              </button>

              <button
                onClick={handleDraftEmail}
                disabled={isDraftingEmail}
                className="px-2.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{isDraftingEmail ? "Generando..." : "Redactar Email"}</span>
              </button>
            </div>

            {/* AI Analysis Result */}
            {aiAnalysis && (
              <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs space-y-1.5 animate-fade-in">
                <div>
                  <span className="font-bold text-[10px] uppercase text-blue-600 block">Resumen Estratégico</span>
                  <span className="text-slate-700 text-[11px] leading-relaxed">{aiAnalysis.resumenEstrategico}</span>
                </div>
                <div>
                  <span className="font-bold text-[10px] uppercase text-blue-600 block">Oportunidad</span>
                  <span className="text-slate-700 text-[11px] leading-relaxed">{aiAnalysis.oportunidadClave}</span>
                </div>
                <div className="text-[11px] font-semibold text-blue-700 pt-1">
                  Acción recomendada: {aiAnalysis.siguienteAccion}
                </div>
              </div>
            )}

            {/* AI Email Result */}
            {aiEmail && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-black/[0.06] text-xs space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between font-bold text-[#1D1D1F] border-b border-black/[0.04] pb-1">
                  <span className="truncate pr-2 text-[11px]">{aiEmail.asunto}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`Asunto: ${aiEmail.asunto}\n\n${aiEmail.cuerpo}`);
                      setCopiedEmail(true);
                      setTimeout(() => setCopiedEmail(false), 2000);
                    }}
                    className="text-[#0071E3] hover:text-[#0077ED] text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedEmail ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
                <p className="text-slate-600 whitespace-pre-line text-[11px] leading-relaxed">
                  {aiEmail.cuerpo}
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-black/[0.08]">
            <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.05]">
              <h3 className="text-sm font-bold text-[#1D1D1F]">Agendar Reunión</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmScheduleMeeting} className="mt-3 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  required
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Notas de la Reunión</label>
                <textarea
                  rows={2}
                  placeholder={`Ej: Demo técnica para ${lead.company}`}
                  value={meetingNotes}
                  onChange={(e) => setMeetingNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F5F5F7] border border-black/[0.06] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                >
                  Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* vCard QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 text-center shadow-2xl border border-black/[0.08] space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-black/[0.05]">
              <h3 className="font-bold text-xs text-[#1D1D1F]">vCard Contacto QR</h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Escanea para guardar el contacto en tu teléfono.
            </p>

            <div className="bg-white p-3 rounded-xl border border-black/[0.06] inline-block shadow-inner mx-auto">
              <QRCodeCanvas
                value={vCardData}
                size={160}
                level="M"
                includeMargin={true}
              />
            </div>

            <div className="text-xs font-bold text-[#1D1D1F] bg-[#F5F5F7] p-2 rounded-xl">
              {lead.name} • {lead.company}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Prevent Accidental Lead Deletion */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-black/[0.08] space-y-3">
            
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#1D1D1F]">
                  ¿Eliminar lead?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  Se borrará permanentemente <strong className="text-slate-800">{lead.name}</strong> ({lead.company}).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteLead) {
                    onDeleteLead(lead.id);
                  }
                  setShowDeleteConfirmModal(false);
                  onClose();
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};


