import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Mail,
  Copy,
  Send,
  Building2,
  Search,
  Globe,
  ExternalLink,
  Loader2,
  Target,
  Star,
  CheckCircle2
} from 'lucide-react';
import { Lead, CompanyResearchInfo, InteractionItem } from '../types';
import { hasContact, displayContact } from '../utils/contactInfo';
import { prioritizeSources } from '../utils/company';
import { classifyEmail, emailKindLabel, EmailClassification } from '../utils/emailKind';
import { formatLeadTimestamp, formatRelativeDayLabel } from '../utils/date';
import { AiNotice } from './AiNotice';
import { DrawerTab, LeadDrawerState } from './useLeadDrawer';

/* ═══════════════ Pestaña "Datos" ═══════════════ */

const CompanyInfoDetails: React.FC<{ info: CompanyResearchInfo; companyName: string }> = ({ info, companyName }) => (
  <div className="space-y-2 text-slate-800">
    {!info.sources?.length && (
      <AiNotice
        message="Este perfil no trae fuentes consultadas: no lo tomes como un dato verificado."
        tone="simulated"
      />
    )}
    <p className="text-slate-700 leading-relaxed text-xs">
      <span className="font-bold text-slate-900">¿A qué se dedica?: </span>
      {info.summary}
    </p>

    {info.industry && (
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="font-bold text-slate-900">Sector:</span>
        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold">
          {info.industry}
        </span>
      </div>
    )}

    {info.targetMarket && (
      <div className="flex items-start gap-1.5 text-[11px]">
        <Target className="w-3 h-3 text-primary mt-0.5 shrink-0" />
        <span className="text-slate-700">
          <span className="font-bold text-slate-900">Mercado objetivo: </span>
          {info.targetMarket}
        </span>
      </div>
    )}

    {info.productsAndServices && info.productsAndServices.length > 0 && (
      <div>
        <span className="font-bold text-slate-900 block mb-1 text-[11px]">Productos & Soluciones:</span>
        <div className="flex flex-wrap gap-1">
          {info.productsAndServices.map((prod, idx) => (
            <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-primary/10 text-primary text-[10px] font-medium">
              {prod}
            </span>
          ))}
        </div>
      </div>
    )}

    {info.keyHighlights && info.keyHighlights.length > 0 && (
      <div>
        <span className="font-bold text-slate-900 block mb-1 text-[11px]">Datos clave:</span>
        <ul className="space-y-0.5">
          {info.keyHighlights.map((highlight, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700">
              <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 shrink-0" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {info.researchedAt && (
      <div className="text-[10px] text-slate-400">
        Investigado el {formatLeadTimestamp(info.researchedAt)}
      </div>
    )}

    {info.sources && info.sources.length > 0 && (
      <div className="pt-2 border-t border-primary/10">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Fuentes consultadas:</span>
        <div className="flex flex-wrap gap-1">
          {prioritizeSources(info.sources, companyName).map((src, i) => (
            <a
              key={i}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline bg-white px-2 py-0.5 rounded-md border border-slate-200"
            >
              <Globe className="w-2.5 h-2.5 text-primary" />
              <span className="truncate max-w-[130px]">{src.title}</span>
              <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
            </a>
          ))}
        </div>
      </div>
    )}
  </div>
);

const CompanyProfileCard: React.FC<{ lead: Lead; research: LeadDrawerState['companyResearch'] }> = ({
  lead,
  research
}) => (
                  <div className="p-3 rounded-2xl bg-linear-to-br from-primary/10 via-slate-50 to-primary/5 border border-primary/20 text-xs space-y-2">
    <div className="flex items-center justify-between border-b border-primary/10 pb-2">
      <div className="flex items-center gap-1.5 font-bold text-primary">
        <Building2 className="w-3.5 h-3.5 text-primary" />
        <span>Perfil de {lead.company}</span>
      </div>
      <button
        type="button"
        onClick={research.research}
        disabled={research.isResearching}
        className="px-2 py-1 rounded-lg bg-white border border-primary/20 text-primary hover:bg-primary/10 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
        title="Investigar con Google Search Grounding"
      >
        {research.isResearching ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span>Investigando...</span>
          </>
        ) : (
          <>
            <Search className="w-3 h-3 text-primary" />
            <span>{lead.companyInfo ? 'Actualizar IA' : 'Investigar con IA'}</span>
          </>
        )}
      </button>
    </div>

    {research.isResearching && (
      <div className="flex items-center gap-2 text-slate-600 py-2">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <span>Buscando datos en Google Search...</span>
      </div>
    )}

    {research.error && (
      <AiNotice message={research.error} tone={research.simulated ? 'simulated' : 'error'} />
    )}

    {research.notice && <AiNotice message={research.notice} tone="simulated" />}

    {research.shownCompanyInfo && !research.isResearching ? (
      <CompanyInfoDetails info={research.shownCompanyInfo} companyName={lead.company} />
    ) : (
      !research.isResearching && !research.error && (
        <div className="text-slate-500 text-[11px] py-1 flex items-center justify-between">
          <span>Presiona "Investigar con IA" para descubrir a qué se dedica {lead.company} en tiempo real con Google Search.</span>
        </div>
      )
    )}
  </div>
);

const DetailRow: React.FC<{ label: string; children: React.ReactNode; valueClassName?: string }> = ({
  label,
  children,
  valueClassName = 'font-semibold text-slate-800'
}) => (
  <div className="flex items-center justify-between py-1.5 gap-3">
    <span className="text-slate-400 font-medium shrink-0">{label}</span>
    <span className={valueClassName}>{children}</span>
  </div>
);

const contactValueClass = (value?: string) =>
  `font-semibold text-right truncate ${hasContact(value) ? 'text-slate-800' : 'text-slate-400 font-medium'}`;

/**
 * Marca el tipo de casilla. Sin juicio implícito: un gmail no es un dato malo,
 * solo es menos probable que llegue al buzón de la empresa, y eso conviene verlo
 * antes de elegir el canal de contacto.
 */
const EmailKindBadge: React.FC<{ classification: EmailClassification }> = ({ classification }) => {
  if (classification.kind === 'sin-email') return null;

  const isPersonal = classification.kind === 'personal';
  return (
    <span
      title={`${emailKindLabel(classification.kind)} (${classification.domain}). ${
        isPersonal
          ? 'Suele responder más rápido por WhatsApp o llamada.'
          : 'Es el canal más probable para tratar temas de la empresa.'
      }`}
      className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
        isPersonal ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {isPersonal ? 'Personal' : 'Corporativo'}
    </span>
  );
};

const SummaryTab: React.FC<{ lead: Lead; research: LeadDrawerState['companyResearch'] }> = ({ lead, research }) => (
  <div className="space-y-3 pt-1">
    <CompanyProfileCard lead={lead} research={research} />

    <div className="divide-y divide-black/[0.04]">
      <DetailRow label="Teléfono" valueClassName={contactValueClass(lead.phone)}>
        {displayContact(lead.phone)}
      </DetailRow>
      <DetailRow label="Email" valueClassName={contactValueClass(lead.email)}>
        <span className="inline-flex items-center justify-end gap-1.5 min-w-0">
          <span className="truncate">{displayContact(lead.email)}</span>
          <EmailKindBadge classification={classifyEmail(lead.email)} />
        </span>
      </DetailRow>
      <DetailRow label="Evento" valueClassName="font-semibold text-[#1D1D1F]">{lead.event}</DetailRow>
      <DetailRow label="Pipeline Estimado" valueClassName="font-bold text-[#28A745]">
        {lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()} USD` : '—'}
      </DetailRow>
      <DetailRow label="Registrado por">{lead.capturedBy}</DetailRow>
      {lead.city && <DetailRow label="Ciudad / Sede">{lead.city}</DetailRow>}
      {lead.lastContact && (
        <DetailRow label="Último Contacto" valueClassName="font-medium text-slate-600">
          {formatLeadTimestamp(lead.lastContact)}
        </DetailRow>
      )}
    </div>

    <div className="pt-2 border-t border-black/[0.04]">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
        Intereses Registrados
      </span>
      <div className="flex flex-wrap gap-1">
        {lead.interests.map((interest, idx) => (
          <span key={idx} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#F5F5F7] text-[#1D1D1F]">
            {interest}
          </span>
        ))}
      </div>
    </div>

    {lead.notes && (
      <div className="pt-2 border-t border-black/[0.04]">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
          Nota Inicial
        </span>
        <p className="text-slate-700 text-xs bg-[#F5F5F7] p-2.5 rounded-xl leading-relaxed">{lead.notes}</p>
      </div>
    )}
  </div>
);

/* ═══════════════ Pestaña "Notas" ═══════════════ */

const HISTORY_TYPE_META: Record<NonNullable<InteractionItem['type']>, { label: string; className: string }> = {
  note: { label: 'Nota', className: 'bg-slate-200/70 text-slate-700' },
  status_change: { label: 'Estado', className: 'bg-indigo-50 text-indigo-700' },
  priority_change: { label: 'Prioridad', className: 'bg-amber-50 text-amber-700' },
  interest_added: { label: 'Interés', className: 'bg-blue-50 text-blue-700' },
  meeting: { label: 'Reunión', className: 'bg-violet-50 text-violet-700' },
  source_added: { label: 'Fuente', className: 'bg-emerald-50 text-emerald-700' },
  demo: { label: 'Demo', className: 'bg-purple-50 text-purple-700' },
  call: { label: 'Llamada', className: 'bg-green-50 text-green-700' },
  email: { label: 'Email', className: 'bg-sky-50 text-sky-700' }
};

const ActivityTab: React.FC<{ lead: Lead; onAddNote: (text: string) => void }> = ({ lead, onAddNote }) => {
  const [newNote, setNewNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    onAddNote(newNote.trim());
    setNewNote('');
  };

  return (
    <div className="space-y-3 pt-1">
      <form onSubmit={handleSubmit} className="flex gap-1.5">
        <input
          type="text"
          placeholder="Escribir nueva nota de seguimiento..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="flex-1 px-2.5 py-1.5 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary text-[#1D1D1F]"
        />
        <button
          type="submit"
          disabled={!newNote.trim()}
          className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center justify-center cursor-pointer transition-colors shrink-0"
        >
          <Send className="w-3 h-3" />
        </button>
      </form>

      <div className="space-y-2 pr-1">
        {lead.history.map((item) => {
          const meta = HISTORY_TYPE_META[item.type ?? 'note'];
          return (
            <div key={item.id} className="p-2 rounded-xl bg-[#F5F5F7]/80 text-xs border border-black/[0.02]">
              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide shrink-0 ${meta.className}`}>
                    {meta.label}
                  </span>
                  <span className="font-semibold text-slate-600 truncate">{item.author}</span>
                </div>
                <span className="shrink-0">{formatRelativeDayLabel(`${item.date} ${item.time}`)}</span>
              </div>
              <p className="text-slate-800 font-medium text-[11px] leading-relaxed">{item.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════ Pestaña "IA Assistant" ═══════════════ */

const AiAssistantTab: React.FC<{ analysis: LeadDrawerState['analysis']; emailDraft: LeadDrawerState['emailDraft'] }> = ({
  analysis,
  emailDraft
}) => (
  <div className="space-y-3 pt-1">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-[#1D1D1F] flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        divergency AI Engine
      </span>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={analysis.analyze}
        disabled={analysis.isAnalyzing}
        className="px-2.5 py-1.5 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-[#1D1D1F] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
      >
        <Bot className="w-3.5 h-3.5 text-[#5856D6]" />
        <span>{analysis.isAnalyzing ? 'Analizando...' : 'Analizar Perfil'}</span>
      </button>

      <button
        onClick={emailDraft.draft}
        disabled={emailDraft.isDrafting}
        className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
      >
        <Mail className="w-3.5 h-3.5" />
        <span>{emailDraft.isDrafting ? 'Generando...' : 'Redactar Email'}</span>
      </button>
    </div>

    {analysis.error && (
      <AiNotice message={analysis.error} tone={analysis.simulated ? 'simulated' : 'error'} />
    )}

    {analysis.notice && <AiNotice message={analysis.notice} tone="simulated" />}

    {emailDraft.error && (
      <AiNotice message={emailDraft.error} tone={emailDraft.simulated ? 'simulated' : 'error'} />
    )}

    {emailDraft.notice && <AiNotice message={emailDraft.notice} tone="simulated" />}

    {analysis.analysis && (
      <div className="p-2.5 bg-primary/5 rounded-xl border border-primary/10 text-xs space-y-1.5 animate-fade-in">
        {analysis.analysis.nivelPrioridad && (
          <div className="flex items-center gap-1.5">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="font-bold text-[10px] uppercase text-primary">Prioridad sugerida:</span>
            <span className="text-[11px] font-bold text-slate-800">{analysis.analysis.nivelPrioridad}</span>
          </div>
        )}
        <div>
          <span className="font-bold text-[10px] uppercase text-primary block">Resumen Estratégico</span>
          <span className="text-slate-700 text-[11px] leading-relaxed">{analysis.analysis.resumenEstrategico}</span>
        </div>
        <div>
          <span className="font-bold text-[10px] uppercase text-primary block">Oportunidad</span>
          <span className="text-slate-700 text-[11px] leading-relaxed">{analysis.analysis.oportunidadClave}</span>
        </div>
        <div className="text-[11px] font-semibold text-primary pt-1">
          Acción recomendada: {analysis.analysis.siguienteAccion}
        </div>
        {analysis.analysis.puntosDeContactoRecomendados && analysis.analysis.puntosDeContactoRecomendados.length > 0 && (
          <div className="pt-1 border-t border-primary/10">
            <span className="font-bold text-[10px] uppercase text-primary block mb-0.5">Puntos de contacto</span>
            <ul className="space-y-0.5">
              {analysis.analysis.puntosDeContactoRecomendados.map((point, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                  <CheckCircle2 className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )}

    {emailDraft.email && (
      <div className="p-2.5 bg-slate-50 rounded-xl border border-black/[0.06] text-xs space-y-1.5 animate-fade-in">
        <div className="flex items-center justify-between font-bold text-[#1D1D1F] border-b border-black/[0.04] pb-1">
          <span className="truncate pr-2 text-[11px]">{emailDraft.email.asunto}</span>
          <button
            onClick={emailDraft.copy}
            className="text-primary hover:text-primary-hover text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Copy className="w-3 h-3" />
            <span>{emailDraft.copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
        <p className="text-slate-600 whitespace-pre-line text-[11px] leading-relaxed">{emailDraft.email.cuerpo}</p>
      </div>
    )}
  </div>
);

/* ═══════════════ Selector de pestaña ═══════════════ */

interface LeadDrawerTabContentProps {
  activeTab: DrawerTab;
  lead: Lead;
  drawer: LeadDrawerState;
}

export const LeadDrawerTabContent: React.FC<LeadDrawerTabContentProps> = ({ activeTab, lead, drawer }) => {
  switch (activeTab) {
    case 'resumen':
      return <SummaryTab lead={lead} research={drawer.companyResearch} />;
    case 'actividad':
      return <ActivityTab lead={lead} onAddNote={drawer.actions.addNote} />;
    case 'ia':
      return <AiAssistantTab analysis={drawer.analysis} emailDraft={drawer.emailDraft} />;
  }
};