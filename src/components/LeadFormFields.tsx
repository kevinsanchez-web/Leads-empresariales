import React from 'react';
import {
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Globe,
  Layers,
  Linkedin,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Sparkles,
  Star,
  Tag,
  User,
  Wand2,
  X
} from 'lucide-react';
import { EventOption } from '../types';
import { INTEREST_OPTIONS, SOURCE_OPTIONS, EXPERIENCE_OPTIONS } from '../data/mockData';
import { AiNotice } from './AiNotice';
import { UseLeadFormResult } from './useLeadForm';
import { todayISODate } from '../utils/date';

const INPUT_BASE =
  'w-full px-3.5 py-2 bg-[#F5F5F7] border border-black/[0.05] rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition-all placeholder:text-slate-400 text-[#1D1D1F]';
const INPUT_ICON_BASE = `pl-9 pr-3.5 ${INPUT_BASE}`;
const LABEL_BASE = 'block text-xs font-semibold text-slate-700 mb-1';

interface LeadFormFieldsProps {
  form: UseLeadFormResult;
  events: EventOption[];
  onOpenCreateEventModal?: () => void;
}

interface ChipGroupProps {
  label: string;
  counter?: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}

const ChipGroup: React.FC<ChipGroupProps> = ({ label, counter, options, selected, onToggle }) => {
  // Un valor preseleccionado puede no estar en la lista (ej. 'Captura Rápida' en la captura
  // móvil). Si no se muestra, el contador dice "1 seleccionado" y no hay ningún chip resaltado
  // ni forma de quitarlo, así que se renderiza aparte como chip descartable.
  const notInOptions = selected.filter(value => !options.includes(value));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={LABEL_BASE}>{label}</span>
        {counter && <span className="text-[10px] text-slate-400 font-medium">{counter}</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {notInOptions.map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => onToggle(value)}
            title="Quitar"
            className="px-3 py-1 rounded-xl text-xs font-semibold bg-[#0071E3]/10 text-[#0071E3] hover:bg-[#0071E3]/20 transition-all cursor-pointer flex items-center gap-1"
          >
            {value}
            <X className="w-3 h-3" />
          </button>
        ))}

        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              type="button"
              key={option}
              onClick={() => onToggle(option)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                active ? 'bg-[#0071E3] text-white shadow-2xs' : 'bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-700'
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const LeadFormFields: React.FC<LeadFormFieldsProps> = ({
  form,
  events,
  onOpenCreateEventModal
}) => {
  const {
    name, company, role, phone, email, linkedin, notes, priority,
    selectedEvent, nextContactDate, captureDate, captureTime,
    selectedInterests, selectedSources, selectedExperiences,
    companyInfo, isResearchingCompany, researchError, researchSimulated,
    activeVoiceField, validationError, canSubmit,
    setName, setCompany, setRole, setPhone, setEmail, setLinkedin, setNotes, setPriority,
    setNextContactDate, setCaptureDate, setCaptureTime, setSelectedEvent,
    toggleInterest, toggleSource, toggleExperience, handleResearchCompany
  } = form;

  return (
    <div className="space-y-4 pb-16 sm:pb-10">
      {/* Identidad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={LABEL_BASE}>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Nombre Completo *
              </span>
            </label>
            {activeVoiceField === 'name' && (
              <span className="text-[10px] text-[#0071E3] font-bold animate-pulse">Dictando...</span>
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
          <label className={`${LABEL_BASE} flex items-center gap-1.5`}>
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            Cargo / Posición
          </label>
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
            <label className={`${LABEL_BASE} flex items-center gap-1.5`}>
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Empresa *
            </label>
            {company.trim().length >= 2 && (
              <button
                type="button"
                onClick={() => handleResearchCompany()}
                disabled={isResearchingCompany}
                className="text-[11px] font-bold text-[#0071E3] hover:text-[#0077ED] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
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
              onChange={(e) => setCompany(e.target.value)}
              className={`${INPUT_ICON_BASE} font-medium`}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`${LABEL_BASE} flex items-center gap-1.5`}>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Evento Asociado
            </label>
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
            className={`${INPUT_BASE} appearance-none cursor-pointer`}
          >
            {events.map(evt => (
              <option key={evt.id} value={evt.name}>
                {evt.name}
              </option>
            ))}
            {onOpenCreateEventModal && (
              <option value="__create_new__">+ Crear nuevo evento...</option>
            )}
          </select>
        </div>
      </div>

      {/* Investigación de empresa con IA */}
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
                        className="px-2 py-0.5 rounded-md bg-white border border-blue-100 text-blue-900 text-[10px] font-medium"
                      >
                        {prod}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {companyInfo.sources && companyInfo.sources.length > 0 && (
                <div className="pt-1.5 border-t border-blue-100/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Fuentes verificadas:
                  </span>
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

      {/* Contacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={`${LABEL_BASE} flex items-center gap-1.5`}>
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            Correo Electrónico
          </label>
          <div className="relative">
            <Mail className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              placeholder="ejemplo@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_ICON_BASE}
            />
          </div>
        </div>

        <div>
          <label className={`${LABEL_BASE} flex items-center gap-1.5`}>
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            Teléfono Móvil
          </label>
          <div className="relative">
            <Phone className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="+57 300 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={INPUT_ICON_BASE}
            />
          </div>
        </div>
      </div>

      {/* LinkedIn */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={`${LABEL_BASE} flex items-center gap-1.5`}>
            <Linkedin className="w-3.5 h-3.5 text-[#0071E3]" />
            Perfil de LinkedIn
          </label>
          <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
        </div>
        <div className="relative">
          <Linkedin className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="linkedin.com/in/usuario o URL del perfil"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            className={INPUT_ICON_BASE}
          />
        </div>
      </div>

      {/* Intereses / Fuentes / Experiencias */}
      <ChipGroup
        label="Intereses Clave"
        counter={`${selectedInterests.length} seleccionados`}
        options={INTEREST_OPTIONS}
        selected={selectedInterests}
        onToggle={toggleInterest}
      />

      <ChipGroup
        label="Punto de Contacto / Canal"
        counter={`${selectedSources.length} seleccionados`}
        options={SOURCE_OPTIONS}
        selected={selectedSources}
        onToggle={toggleSource}
      />

      <ChipGroup
        label="Experiencia Vivida"
        counter={`${selectedExperiences.length} seleccionados`}
        options={EXPERIENCE_OPTIONS}
        selected={selectedExperiences}
        onToggle={toggleExperience}
      />

      {/* Seguimiento prioritario */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FAFBFD] border border-black/[0.04]">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              priority ? 'bg-[#FF9500]/10 text-[#FF9500]' : 'bg-[#F5F5F7] text-slate-400'
            }`}
          >
            <Star className={`w-4 h-4 ${priority ? 'fill-[#FF9500] text-[#FF9500]' : ''}`} />
          </div>
          <div>
            <div className="text-xs font-bold text-[#1D1D1F] leading-none">Seguimiento Prioritario</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Destacar en el radar comercial para contacto rápido
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPriority(!priority)}
          aria-pressed={priority}
          aria-label="Seguimiento prioritario"
          className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
            priority ? 'bg-[#34C759]' : 'bg-slate-300'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
              priority ? 'right-0.5' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Fecha/hora de captura: define en qué día cae el lead en la gráfica de tendencia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={`${LABEL_BASE} flex items-center gap-1.5`}>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Fecha de captura *
          </label>
          <input
            type="date"
            required
            max={todayISODate()}
            value={captureDate}
            onChange={(e) => setCaptureDate(e.target.value)}
            className={INPUT_BASE}
          />
        </div>
        <div>
          <label className={`${LABEL_BASE} flex items-center gap-1.5`}>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Hora de captura
          </label>
          <input
            type="time"
            value={captureTime}
            onChange={(e) => setCaptureTime(e.target.value)}
            className={INPUT_BASE}
          />
        </div>
        <p className="sm:col-span-2 text-[11px] text-slate-500 -mt-1">
          Por defecto es el momento actual. Ajústalo solo si registras el lead después de haberlo capturado.
        </p>
      </div>

      {/* Próximo contacto */}
      <div>
        <label className={`${LABEL_BASE} flex items-center gap-1.5`}>
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          Fecha del próximo contacto
        </label>
        <input
          type="date"
          value={nextContactDate}
          onChange={(e) => setNextContactDate(e.target.value)}
          className={INPUT_BASE}
        />
      </div>

      {/* Notas */}
      <div>
        <label className={`${LABEL_BASE} flex items-center gap-1.5`}>
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          Notas de la conversación
        </label>
        <textarea
          rows={2}
          placeholder="Detalles clave, presupuesto, acuerdos o compromisos..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${INPUT_BASE} resize-none`}
        />
      </div>

      {validationError && (
        <p className="text-[11px] font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {validationError}
        </p>
      )}

      {!canSubmit && !validationError && (
        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Wand2 className="w-3 h-3" />
          Nombre y Empresa son obligatorios para guardar.
        </p>
      )}
    </div>
  );
};