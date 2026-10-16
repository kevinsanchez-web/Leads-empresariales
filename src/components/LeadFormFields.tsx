import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Star,
  AlertTriangle
} from 'lucide-react';
import { EventOption } from '../types';
import { INTEREST_OPTIONS, SOURCE_OPTIONS, EXPERIENCE_OPTIONS } from '../data/mockData';
import { AiNotice } from './AiNotice';
import { UseLeadFormResult } from './useLeadForm';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';
import { MultiSelectCombobox } from './MultiSelectCombobox';
import { RoundedSelect } from './RoundedSelect';
import { todayISODate } from '../utils/date';
import { prioritizeSources } from '../utils/company';

const INPUT_BASE =
  'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium hover:border-slate-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 transition-all placeholder:text-slate-400 text-[#1D1D1F]';
const LABEL_BASE = 'block text-xs font-semibold text-slate-700 mb-1';

interface LeadFormFieldsProps {
  form: UseLeadFormResult;
  events: EventOption[];
  onOpenCreateEventModal?: () => void;
}

const STEPS = [
  { id: 'contacto', label: 'Datos de contacto' },
  { id: 'calificacion', label: 'Calificación' }
] as const;

// fieldKeys que dicta el asistente de voz y viven en el paso 2.
const STEP_TWO_VOICE_FIELDS = ['interests', 'sources', 'notes'];

export const LeadFormFields: React.FC<LeadFormFieldsProps> = ({
  form,
  events,
  onOpenCreateEventModal
}) => {
  const {
    name, company, role, phone, email, linkedin, notes, priority,
    selectedEvent, followUpDate, captureDate, captureTime,
    selectedInterests, selectedSources, selectedExperiences,
    companyInfo, isResearchingCompany, researchError, researchSimulated,
    activeVoiceField, validationError, contactWarning, canSubmit,
    setName, setCompany, setRole, setPhone, setEmail, setLinkedin, setNotes, setPriority,
    setFollowUpDate, setCaptureDate, setCaptureTime, setSelectedEvent,
    toggleInterest, toggleSource, toggleExperience, handleResearchCompany
  } = form;

  const [step, setStep] = useState(0);

  // El asistente de voz puede dictar campos del paso 2 estando viendo el paso 1:
  // se salta al paso que contiene el campo para que el usuario vea la captura.
  useEffect(() => {
    if (!activeVoiceField) return;
    setStep(STEP_TWO_VOICE_FIELDS.includes(activeVoiceField) ? 1 : 0);
  }, [activeVoiceField]);

  return (
    <div className="space-y-4 pb-2">
      {/* Navegación entre bloques */}
      <div className="flex items-center gap-1 bg-[#F5F5F7] p-1 rounded-xl border border-black/[0.04]">
        {STEPS.map((tab, idx) => {
          const isActive = step === idx;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setStep(idx)}
              aria-current={isActive ? 'step' : undefined}
              className={`flex-1 min-w-0 px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-[#1D1D1F] shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {idx + 1}
              </span>
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div key={step} className="space-y-4 animate-fade-in">
        {step === 0 ? (
          <>
            {/* Identidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={LABEL_BASE}>Nombre Completo *</label>
                  {activeVoiceField === 'name' && (
                    <span className="text-[10px] text-primary font-bold animate-pulse">Dictando...</span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ej. Laura Martínez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT_BASE}
                />
              </div>

              <div>
                <label className={LABEL_BASE}>Cargo / Posición</label>
                <input
                  type="text"
                  placeholder="Ej. Directora de Innovación"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={INPUT_BASE}
                />
              </div>
            </div>

            {/* Empresa + Evento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={LABEL_BASE}>Empresa *</label>
                  {company.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={() => handleResearchCompany()}
                      disabled={isResearchingCompany}
                      className="text-[11px] font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
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
                <input
                  type="text"
                  required
                  placeholder="Ej. Energía Andina"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={INPUT_BASE}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={LABEL_BASE}>Evento Asociado</label>
                  {onOpenCreateEventModal && (
                    <button
                      type="button"
                      onClick={onOpenCreateEventModal}
                      className="text-xs text-primary hover:text-primary-hover font-semibold flex items-center gap-0.5 cursor-pointer"
                      title="Crear un nuevo evento para este lead"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Crear Evento</span>
                    </button>
                  )}
                </div>
                <RoundedSelect
                  variant="bare"
                  value={selectedEvent}
                  onChange={setSelectedEvent}
                  ariaLabel="Evento asociado"
                  buttonClassName={`${INPUT_BASE.replace('px-3', 'pl-3 pr-8')} cursor-pointer`}
                  options={events.map(evt => ({ value: evt.name, label: evt.name }))}
                />
              </div>
            </div>

            {/* Investigación de empresa con IA */}
            {(isResearchingCompany || companyInfo || researchError) && (
                <div className="p-3.5 rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-slate-50 border border-primary/20 shadow-xs animate-fade-in text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-primary/10 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <Sparkles className="w-3.5 h-3.5 text-primary fill-primary/20" />
                    <span>Investigación de Empresa (Google Search)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
                    Google Grounding
                  </span>
                </div>

                {isResearchingCompany && (
                  <div className="flex items-center gap-2 text-slate-600 py-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span>Analizando actividades, productos y mercado de {company}...</span>
                  </div>
                )}

                {researchError && (
                  <AiNotice message={researchError} tone={researchSimulated ? 'simulated' : 'error'} />
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
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-white border border-primary/10 text-primary text-[10px] font-medium"
                            >
                              {prod}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {companyInfo.sources && companyInfo.sources.length > 0 && (
                      <div className="pt-1.5 border-t border-primary/10">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Fuentes verificadas:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {prioritizeSources(companyInfo.sources, company).map((src, i) => (
                            <a
                              key={i}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline bg-white/80 px-2 py-0.5 rounded-md border border-slate-200"
                            >
                              <Globe className="w-2.5 h-2.5 text-primary" />
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

            {/* Contacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL_BASE}>Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_BASE}
                />
              </div>

              <div>
                <label className={LABEL_BASE}>Teléfono Móvil</label>
                <input
                  type="text"
                  placeholder="+57 300 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={INPUT_BASE}
                />
              </div>
            </div>

            {/* Advertencia no bloqueante de contacto */}
            {contactWarning && (
              <div className="flex items-start gap-1.5 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-800 font-semibold animate-fade-in">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>{contactWarning}</span>
              </div>
            )}

            {/* LinkedIn */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={LABEL_BASE}>Perfil de LinkedIn</label>
                <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
              </div>
              <input
                type="text"
                placeholder="linkedin.com/in/usuario o URL del perfil"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className={INPUT_BASE}
              />
            </div>
          </>
        ) : (
          <>
            {/* Calificación: multi-selecciones compactas */}
            <MultiSelectCombobox
              label="Intereses Clave"
              options={INTEREST_OPTIONS}
              selected={selectedInterests}
              onToggle={toggleInterest}
              placeholder="Seleccionar intereses…"
            />

            <MultiSelectCombobox
              label="Punto de Contacto / Canal"
              options={SOURCE_OPTIONS}
              selected={selectedSources}
              onToggle={toggleSource}
              placeholder="Seleccionar canal…"
            />

            <MultiSelectCombobox
              label="Experiencia Vivida"
              options={EXPERIENCE_OPTIONS}
              selected={selectedExperiences}
              onToggle={toggleExperience}
              placeholder="Seleccionar experiencia…"
            />

            {/* Seguimiento prioritario */}
            <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#FAFBFD] border border-black/[0.04]">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    priority ? 'bg-[#FF9500]/10 text-[#FF9500]' : 'bg-[#F5F5F7] text-slate-400'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${priority ? 'fill-[#FF9500] text-[#FF9500]' : ''}`} />
                </div>
                <span className="text-xs font-bold text-[#1D1D1F] truncate">
                  Seguimiento Prioritario
                </span>
              </div>

              <button
                type="button"
                onClick={() => setPriority(!priority)}
                aria-pressed={priority}
                aria-label="Seguimiento prioritario"
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  priority ? 'bg-[#34C759]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                    priority ? 'right-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Fecha/hora de captura: define en qué día cae el lead en la gráfica de tendencia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL_BASE}>Fecha de captura *</label>
                <DatePicker
                  value={captureDate}
                  onChange={setCaptureDate}
                  max={todayISODate()}
                  ariaLabel="Fecha de captura"
                />
              </div>
              <div>
                <label className={LABEL_BASE}>Hora de captura</label>
                <TimePicker value={captureTime} onChange={setCaptureTime} ariaLabel="Hora de captura" />
              </div>
              <p className="sm:col-span-2 text-[11px] text-slate-500 -mt-1">
                Por defecto es el momento actual.
              </p>
            </div>

            {/* Agendar contacto */}
            <div>
              <label className={LABEL_BASE}>Agendar contacto para el</label>
              <DatePicker
                value={followUpDate}
                onChange={setFollowUpDate}
                min={todayISODate()}
                ariaLabel="Agendar contacto para el"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Genera las alertas de la campana. No puede ser pasada.
              </p>
            </div>

            {/* Notas */}
            <div>
              <label className={LABEL_BASE}>Notas de la conversación</label>
              <textarea
                rows={2}
                placeholder="Detalles clave, presupuesto, acuerdos o compromisos..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${INPUT_BASE} resize-none`}
              />
            </div>
          </>
        )}
      </div>

      {validationError && (
        <p className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {validationError}
        </p>
      )}

      {!canSubmit && !validationError && (
        <p className="text-[11px] text-slate-400">Nombre y Empresa son obligatorios para guardar.</p>
      )}

      {/* Navegación entre pasos */}
      {step === 0 ? (
        <button
          type="button"
          onClick={() => setStep(1)}
          className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-[0.99]"
        >
          <span>Siguiente: Calificación</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setStep(0)}
          className="w-full py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Anterior: Datos de contacto</span>
        </button>
      )}
    </div>
  );
};
