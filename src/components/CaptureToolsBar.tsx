import React from 'react';
import { Camera, Mic, Wand2 } from 'lucide-react';
import { VoiceLeadAssistant } from './VoiceLeadAssistant';
import { UseLeadFormResult } from './useLeadForm';

interface CaptureToolsBarProps {
  form: UseLeadFormResult;
}

const SEGMENT =
  'px-2 sm:px-2.5 py-1 rounded-[10px] text-xs font-semibold flex items-center justify-center gap-1 text-slate-600 hover:bg-white hover:text-[#1D1D1F] hover:shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0';

/**
 * Barra segmentada que unifica las herramientas de captura (Voz, Escanear y
 * Demo) en un solo control compacto. Monta internamente el asistente de voz,
 * que aporta el botón de standby vía `renderStandby` y pinta su barra flotante
 * cuando el modo guiado está activo.
 */
export const CaptureToolsBar: React.FC<CaptureToolsBarProps> = ({ form }) => (
  <div className="flex items-center gap-0.5 bg-[#F5F5F7] p-1 rounded-xl border border-black/[0.04] shrink-0">
    <VoiceLeadAssistant
      onApplyVoiceData={form.handleApplyVoiceData}
      onExecuteCommand={form.handleExecuteVoiceCommand}
      onActiveFieldChange={form.setActiveVoiceField}
      renderStandby={start => (
        <button
          type="button"
          id="start-guided-voice-btn"
          onClick={start}
          className={SEGMENT}
          title="Iniciar Asistente de Voz para dictar datos"
        >
          <Mic className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Voz</span>
        </button>
      )}
    />

    <button
      type="button"
      onClick={form.openScanner}
      className={SEGMENT}
      title="Escaneo real con la cámara o foto de tarjeta"
    >
      <Camera className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Escanear</span>
    </button>

    <button
      type="button"
      onClick={form.handleSimulateScan}
      className={SEGMENT}
      title="Auto-completar datos con prueba"
    >
      <Wand2 className="w-3.5 h-3.5 text-[#5856D6]" />
      <span className="hidden sm:inline">Demo</span>
    </button>
  </div>
);
