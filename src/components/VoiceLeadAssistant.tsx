import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  AlertCircle, 
  SkipForward, 
  CheckCircle2, 
  Zap, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Tag, 
  FileText, 
  Radio, 
  Save, 
  Mic, 
  Settings2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { parseStepResponse, ParsedVoiceLead } from '../utils/voiceLeadParser';

export interface VoiceStepConfig {
  id: number;
  fieldKey: 'name' | 'company' | 'role' | 'phone' | 'email' | 'interests' | 'sources' | 'notes' | 'completed';
  title: string;
  speechPrompt: string;
  subPrompt: string;
  icon: React.ComponentType<any>;
  sampleAnswer: string;
  alternativeSamples?: string[];
}

export const GUIDED_VOICE_STEPS: VoiceStepConfig[] = [
  {
    id: 0,
    fieldKey: 'name',
    title: 'Nombre Completo',
    speechPrompt: 'Vamos a diligenciar los campos del lead. Empecemos por: Nombre Completo del lead.',
    subPrompt: 'Di el nombre y apellido del contacto',
    icon: User,
    sampleAnswer: 'Carlos Eduardo Mendoza',
    alternativeSamples: ['María Constanza Parra', 'Diego Fernando Santos', 'Santiago Restrepo']
  },
  {
    id: 1,
    fieldKey: 'company',
    title: 'Empresa',
    speechPrompt: 'Empresa.',
    subPrompt: 'Di la empresa u organización',
    icon: Building2,
    sampleAnswer: 'Cementos Argos',
    alternativeSamples: ['Bancolombia', 'Ecopetrol', 'Grupo Nutresa', 'Falabella']
  },
  {
    id: 2,
    fieldKey: 'role',
    title: 'Cargo / Puesto',
    speechPrompt: 'Cargo o Puesto.',
    subPrompt: 'Di el cargo o puesto de trabajo',
    icon: Zap,
    sampleAnswer: 'Director de Operaciones',
    alternativeSamples: ['Gerente de Tecnología', 'VP de Innovación', 'Líder de Analítica']
  },
  {
    id: 3,
    fieldKey: 'phone',
    title: 'Teléfono / Celular',
    speechPrompt: 'Teléfono o Celular.',
    subPrompt: 'Dicta el número de contacto',
    icon: Phone,
    sampleAnswer: '312 888 7766',
    alternativeSamples: ['310 555 1234', '300 444 5566', '315 777 9900']
  },
  {
    id: 4,
    fieldKey: 'email',
    title: 'Correo Electrónico',
    speechPrompt: 'Correo Electrónico.',
    subPrompt: 'Dicta el email corporativo (ej: nombre arroba empresa punto com)',
    icon: Mail,
    sampleAnswer: 'cmendoza@argos.com',
    alternativeSamples: ['mparra@grupoargos.com', 'dsantos@bancolombia.com.co']
  },
  {
    id: 5,
    fieldKey: 'interests',
    title: 'Intereses',
    speechPrompt: 'Selecciona los intereses. Toca para seleccionar o dicta por voz.',
    subPrompt: 'Di etiquetas como IA, Analítica, Cloud, Automatización o Ciberseguridad',
    icon: Tag,
    sampleAnswer: 'IA y Automatización',
    alternativeSamples: ['Cloud y Analítica', 'Ciberseguridad e IoT', 'Todos los intereses']
  },
  {
    id: 6,
    fieldKey: 'sources',
    title: 'Touchpoint / Canal',
    speechPrompt: 'Touchpoint o Canal.',
    subPrompt: 'Di Visita Stand, QR, Referido o Escanear Tarjeta',
    icon: Radio,
    sampleAnswer: 'Visita Stand',
    alternativeSamples: ['Código QR', 'Escanear Tarjeta', 'Referido']
  },
  {
    id: 7,
    fieldKey: 'notes',
    title: 'Notas Rápidas',
    speechPrompt: 'Notas Rápidas de la Conversación.',
    subPrompt: 'Dicta notas, acuerdos u observaciones clave',
    icon: FileText,
    sampleAnswer: 'Interesado en demo técnica la próxima semana',
    alternativeSamples: ['Solicita propuesta para 50 usuarios', 'Reunión el próximo martes']
  },
  {
    id: 8,
    fieldKey: 'completed',
    title: 'Guardando datos',
    speechPrompt: '¿Guardamos los datos?',
    subPrompt: 'Guardando lead automáticamente...',
    icon: CheckCircle2,
    sampleAnswer: 'Guardar lead',
    alternativeSamples: ['Sí, guardar']
  }
];

const NO_SPEECH_MESSAGE = 'Navegador sin Web Speech API. Puedes usar el dictado manual o los botones de respuesta rápida.';

interface VoiceLeadAssistantProps {
  onApplyVoiceData: (data: ParsedVoiceLead) => void;
  onExecuteCommand?: (command: 'save' | 'clear' | 'priority' | 'scan') => void;
  onActiveFieldChange?: (fieldKey: string) => void;
  /**
   * Permite al padre renderizar el botón de standby (p. ej. dentro de la barra
   * segmentada de captura) en vez del botón azul por defecto de este componente.
   */
  renderStandby?: (start: () => void) => React.ReactNode;
}

// Global retainers to prevent V8 Garbage Collection of SpeechSynthesisUtterance
declare global {
  interface Window {
    __activeSpeechUtterances?: SpeechSynthesisUtterance[];
    __speechKeepaliveTimer?: any;
  }
}

export const VoiceLeadAssistant: React.FC<VoiceLeadAssistantProps> = ({
  onApplyVoiceData,
  onExecuteCommand,
  onActiveFieldChange,
  renderStandby
}) => {
  const [isGuidedModeActive, setIsGuidedModeActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingPrompt, setIsSpeakingPrompt] = useState(false);
  const [speechSynthesisMuted, setSpeechSynthesisMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastCapturedValue, setLastCapturedValue] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [speechWaveTick, setSpeechWaveTick] = useState(0);
  const [activeVoiceName, setActiveVoiceName] = useState<string>('');

  const [manualInputText, setManualInputText] = useState('');

  // Stable Refs to isolate speech recognition lifecycle from React re-renders
  const recognitionRef = useRef<any>(null);
  const currentStepRef = useRef(currentStepIndex);
  const isGuidedModeActiveRef = useRef(isGuidedModeActive);
  const isPausedRef = useRef(isPaused);
  const isSpeakingPromptRef = useRef(isSpeakingPrompt);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const watchdogTimerRef = useRef<any>(null);
  const advanceTimerRef = useRef<any>(null);
  const speechBufferRef = useRef<string>('');
  const speechDebounceTimerRef = useRef<any>(null);
  const saveEmittedRef = useRef(false);
  const speechSupportedRef = useRef<boolean | null>(null);

  const onApplyVoiceDataRef = useRef(onApplyVoiceData);
  const onExecuteCommandRef = useRef(onExecuteCommand);
  const onActiveFieldChangeRef = useRef(onActiveFieldChange);

  useEffect(() => {
    onApplyVoiceDataRef.current = onApplyVoiceData;
  }, [onApplyVoiceData]);

  useEffect(() => {
    onExecuteCommandRef.current = onExecuteCommand;
  }, [onExecuteCommand]);

  useEffect(() => {
    onActiveFieldChangeRef.current = onActiveFieldChange;
  }, [onActiveFieldChange]);

  // Latch de guardado: el flujo puede pedir el guardado desde tres sitios
  // (auto-guardado tras el TTS final, confirmacion por voz y boton).
  // Si speechSynthesis.cancel() dispara onend en algun motor, los tres
  // collinean y se crearian dos leads. Solo gana el primero.
  const emitSaveOnce = useCallback(() => {
    if (saveEmittedRef.current) return false;
    saveEmittedRef.current = true;
    if (onExecuteCommandRef.current) onExecuteCommandRef.current('save');
    return true;
  }, []);

  useEffect(() => {
    currentStepRef.current = currentStepIndex;
  }, [currentStepIndex]);

  useEffect(() => {
    isGuidedModeActiveRef.current = isGuidedModeActive;
  }, [isGuidedModeActive]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    isSpeakingPromptRef.current = isSpeakingPrompt;
  }, [isSpeakingPrompt]);

  // Animated visual wave equalizer
  useEffect(() => {
    if (!isGuidedModeActive || isPaused) return;
    const interval = setInterval(() => {
      setSpeechWaveTick(prev => (prev + 1) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, [isGuidedModeActive, isPaused]);

  // Audio Context for crisp turn notifications and unlocking browser audio
  const getAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    } catch {}
    return audioContextRef.current;
  }, []);

  const playChime = useCallback((type: 'start' | 'listen' | 'step' | 'success') => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'start') {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'listen') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'step') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        osc.frequency.setValueAtTime(1046.50, now + 0.24);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch {
      // Audio fallback
    }
  }, [getAudioContext]);

  // Load Spanish voices
  const getBestSpanishVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const spanishVoices = voices.filter(v => 
      v.lang.toLowerCase().startsWith('es') || 
      v.lang.toLowerCase().includes('spanish')
    );

    if (spanishVoices.length === 0) return null;

    // Prefer high quality / natural voices
    const naturalVoice = spanishVoices.find(v => 
      /google|natural|premium|neural|monica|jorge|sabina|elena|paul|siri/i.test(v.name)
    ) || spanishVoices.find(v => v.lang.includes('CO') || v.lang.includes('MX') || v.lang.includes('ES')) || spanishVoices[0];

    if (naturalVoice) {
      setActiveVoiceName(naturalVoice.name);
    }
    return naturalVoice;
  }, []);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      getBestSpanishVoice();
      window.speechSynthesis.onvoiceschanged = () => {
        getBestSpanishVoice();
      };
    }
  }, [getBestSpanishVoice]);

  // Safe Speech Recognition Starter
  const ensureListening = useCallback(() => {
    if (!isGuidedModeActiveRef.current || isPausedRef.current) return;
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.start();
      setIsListening(true);
      setErrorMessage(null);
    } catch (err: any) {
      // InvalidStateError means already running, which is fine
      if (err.name === 'InvalidStateError') {
        setIsListening(true);
      }
    }
  }, []);

  // Text-To-Speech Synthesizer with garbage collection retention and watchdog
  const speakPrompt = useCallback((textToSpeak: string, onComplete?: () => void) => {
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    if (speechSynthesisMuted || !('speechSynthesis' in window)) {
      setIsSpeakingPrompt(false);
      isSpeakingPromptRef.current = false;
      if (onComplete) {
        onComplete();
      } else {
        setTimeout(() => {
          if (isGuidedModeActiveRef.current && !isPausedRef.current) {
            playChime('listen');
            ensureListening();
          }
        }, 100);
      }
      return;
    }

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }

      getAudioContext();

      setTimeout(() => {
        if (!isGuidedModeActiveRef.current) return;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'es-ES';
        utterance.rate = speechRate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const bestVoice = getBestSpanishVoice();
        if (bestVoice) {
          utterance.voice = bestVoice;
        }

        // Retain utterance globally to prevent V8 Garbage Collector cutting off speech
        if (!window.__activeSpeechUtterances) {
          window.__activeSpeechUtterances = [];
        }
        window.__activeSpeechUtterances.push(utterance);
        activeUtteranceRef.current = utterance;

        setIsSpeakingPrompt(true);
        isSpeakingPromptRef.current = true;

        let hasFinished = false;

        const handleEnd = () => {
          if (hasFinished) return;
          hasFinished = true;

          if (watchdogTimerRef.current) {
            clearTimeout(watchdogTimerRef.current);
            watchdogTimerRef.current = null;
          }

          if (window.__activeSpeechUtterances) {
            const idx = window.__activeSpeechUtterances.indexOf(utterance);
            if (idx > -1) window.__activeSpeechUtterances.splice(idx, 1);
          }
          activeUtteranceRef.current = null;

          setIsSpeakingPrompt(false);
          isSpeakingPromptRef.current = false;

          if (onComplete) {
            onComplete();
          } else {
            // Resume listening cleanly with pleasant beep
            if (isGuidedModeActiveRef.current && !isPausedRef.current) {
              playChime('listen');
              setTimeout(() => {
                ensureListening();
              }, 80);
            }
          }
        };

        utterance.onend = handleEnd;
        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          handleEnd();
        };

        const maxExpectedMs = Math.max(3000, textToSpeak.length * 120 + 2000);
        watchdogTimerRef.current = setTimeout(() => {
          if (isSpeakingPromptRef.current) {
            console.warn('SpeechSynthesis watchdog triggered.');
            handleEnd();
          }
        }, maxExpectedMs);

        // Chrome keepalive pulse
        if (!window.__speechKeepaliveTimer) {
          window.__speechKeepaliveTimer = setInterval(() => {
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            }
          }, 4000);
        }

        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      }, 40);

    } catch (e) {
      console.error('Error invoking SpeechSynthesis:', e);
      setIsSpeakingPrompt(false);
      isSpeakingPromptRef.current = false;
      if (onComplete) onComplete();
    }
  }, [ensureListening, getAudioContext, getBestSpanishVoice, playChime, speechRate, speechSynthesisMuted]);

  // Step navigation
  const goToStep = useCallback((stepIdx: number, shouldSpeak = true) => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    if (stepIdx < 0) stepIdx = 0;

    // Check if reaching final step (Completed / Auto-Save)
    if (stepIdx >= GUIDED_VOICE_STEPS.length - 1) {
      const finalIdx = GUIDED_VOICE_STEPS.length - 1;
      setCurrentStepIndex(finalIdx);
      currentStepRef.current = finalIdx;
      const finalStep = GUIDED_VOICE_STEPS[finalIdx];

      if (onActiveFieldChangeRef.current) {
        onActiveFieldChangeRef.current('');
      }

      // Voice prompt: "¿Guardamos los datos?" -> Then automatically triggers save
      speakPrompt(finalStep.speechPrompt, () => {
        playChime('success');
        emitSaveOnce();
        setTimeout(() => {
          // Si el usuario ya detuvo o guardo mientras sonaba la locucion,
          // ese teardown ya corrio: no se vuelve a tocar el flujo.
          if (!isGuidedModeActiveRef.current) return;
          setIsGuidedModeActive(false);
          setIsListening(false);
          if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch {}
          }
        }, 1200);
      });
      return;
    }

    setCurrentStepIndex(stepIdx);
    currentStepRef.current = stepIdx;
    const stepConfig = GUIDED_VOICE_STEPS[stepIdx];

    if (onActiveFieldChangeRef.current && stepConfig.fieldKey !== 'completed') {
      onActiveFieldChangeRef.current(stepConfig.fieldKey);
    }

    if (shouldSpeak) {
      speakPrompt(stepConfig.speechPrompt);
    }
  }, [emitSaveOnce, playChime, speakPrompt]);

  // Start guided voice assistant flow
  const startGuidedFlow = useCallback(() => {
    getAudioContext();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
      try {
        const dummy = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(dummy);
      } catch {}
    }

    setIsGuidedModeActive(true);
    isGuidedModeActiveRef.current = true;
    setIsPaused(false);
    isPausedRef.current = false;
    setCurrentStepIndex(0);
    currentStepRef.current = 0;
    setTranscript('');
    setInterimTranscript('');
    setLastCapturedValue(null);
    saveEmittedRef.current = false;
    // Si el navegador no tiene Web Speech, arrancar el flujo no borra el aviso:
    // es justo cuando el usuario necesita saber que la voz no va a funcionar.
    setErrorMessage(speechSupportedRef.current === false ? NO_SPEECH_MESSAGE : null);

    playChime('start');

    if (onActiveFieldChangeRef.current) {
      onActiveFieldChangeRef.current('name');
    }

    const initialPrompt = GUIDED_VOICE_STEPS[0].speechPrompt;
    speakPrompt(initialPrompt);
  }, [getAudioContext, playChime, speakPrompt]);

  // Stop / Cancel guided flow
  const stopGuidedFlow = useCallback(() => {
    setIsGuidedModeActive(false);
    isGuidedModeActiveRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setIsListening(false);
    setIsSpeakingPrompt(false);
    isSpeakingPromptRef.current = false;

    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    if (onActiveFieldChangeRef.current) {
      onActiveFieldChangeRef.current('');
    }
  }, []);

  // Toggle pause / resume
  const togglePause = useCallback(() => {
    if (isPausedRef.current) {
      setIsPaused(false);
      isPausedRef.current = false;
      const step = GUIDED_VOICE_STEPS[currentStepRef.current];
      speakPrompt(`Continuamos con: ${step.title}`);
    } else {
      setIsPaused(true);
      isPausedRef.current = true;
      setIsListening(false);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    }
  }, [speakPrompt]);

  // Process and apply recognized voice transcript
  const handleProcessSpeech = useCallback((spokenText: string) => {
    const text = spokenText.trim();
    if (!text) return;

    setTranscript(text);
    setInterimTranscript('');

    const currentStep = GUIDED_VOICE_STEPS[currentStepRef.current];
    const lowerSpoken = text.toLowerCase();

    // 1. Navigation / Flow commands
    if (
      lowerSpoken.includes('guardar lead') || 
      lowerSpoken.includes('guardar contacto') || 
      lowerSpoken.includes('guardar datos') ||
      (currentStepRef.current >= GUIDED_VOICE_STEPS.length - 2 && (lowerSpoken === 'sí' || lowerSpoken === 'si' || lowerSpoken === 'guardar' || lowerSpoken === 'listo' || lowerSpoken === 'dale'))
    ) {
      playChime('success');
      emitSaveOnce();
      stopGuidedFlow();
      return;
    }

    if (lowerSpoken.includes('omitir') || lowerSpoken.includes('siguiente') || lowerSpoken.includes('pasar') || lowerSpoken === 'paso') {
      const nextIdx = currentStepRef.current + 1;
      goToStep(nextIdx);
      return;
    }

    if (lowerSpoken.includes('repetir') || lowerSpoken.includes('otra vez') || lowerSpoken === 'repite') {
      speakPrompt(currentStep.speechPrompt);
      return;
    }

    if (lowerSpoken.includes('reiniciar') || lowerSpoken.includes('empezar de nuevo')) {
      goToStep(0);
      return;
    }

    // 2. Parse response for active step
    const parsedData = parseStepResponse(currentStep.fieldKey, text);
    
    // Log and save preview
    const capturedKey = Object.keys(parsedData).find(k => k !== 'rawTranscript' && k !== 'command' && (parsedData as any)[k]);
    if (capturedKey) {
      const val = (parsedData as any)[capturedKey];
      setLastCapturedValue(Array.isArray(val) ? val.join(', ') : String(val));
    }

    // Auto fill form field in real-time
    onApplyVoiceDataRef.current(parsedData as ParsedVoiceLead);

    // Chime feedback
    playChime('step');

    // 3. Advance automatically to next step smoothly
    const nextIdx = currentStepRef.current + 1;
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      goToStep(nextIdx);
    }, 450);
  }, [emitSaveOnce, goToStep, playChime, speakPrompt, stopGuidedFlow]);

  // Speech Recognition continuous lifecycle initialization
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    speechSupportedRef.current = !!SpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(NO_SPEECH_MESSAGE);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        if (!isPausedRef.current && !isSpeakingPromptRef.current) {
          setIsListening(true);
          setErrorMessage(null);
        }
      };

      recognition.onresult = (event: any) => {
        // Discard microphone audio while assistant is speaking or if paused
        if (isPausedRef.current || isSpeakingPromptRef.current) return;

        let currentInterim = '';
        let finalTranscriptStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptStr += ' ' + event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (finalTranscriptStr.trim()) {
          speechBufferRef.current = (speechBufferRef.current + ' ' + finalTranscriptStr).trim();
          setTranscript(speechBufferRef.current);

          if (speechDebounceTimerRef.current) {
            clearTimeout(speechDebounceTimerRef.current);
          }

          // Debounce by 750ms so user can speak multi-word responses without premature cutoff
          speechDebounceTimerRef.current = setTimeout(() => {
            const completeText = speechBufferRef.current.trim();
            speechBufferRef.current = '';
            if (completeText) {
              handleProcessSpeech(completeText);
            }
          }, 750);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return;
        if (event.error === 'not-allowed') {
          setErrorMessage('Permiso de micrófono no otorgado. Habilita el micrófono para dictar.');
        }
      };

      recognition.onend = () => {
        // Auto restart if still in guided mode and not speaking or paused
        if (isGuidedModeActiveRef.current && !isPausedRef.current && !isSpeakingPromptRef.current) {
          setTimeout(() => {
            try {
              recognition.start();
              setIsListening(true);
            } catch {}
          }, 100);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } catch {
      setErrorMessage('No se pudo inicializar el motor de reconocimiento de voz.');
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [handleProcessSpeech]);

  // 1-Click Instant Answer Helper (allows tapping sample answers to test effortlessly)
  const handleSelectSampleAnswer = (answer: string) => {
    if (!isGuidedModeActive) {
      setIsGuidedModeActive(true);
      isGuidedModeActiveRef.current = true;
    }
    handleProcessSpeech(answer);
  };

  const currentStep = GUIDED_VOICE_STEPS[currentStepIndex] || GUIDED_VOICE_STEPS[0];
  const StepIcon = currentStep.icon;

  return (
    <>
      {/* 1. Standby: boton de arranque (azul primario de la app, o el que provea el padre) */}
      {!isGuidedModeActive &&
        (renderStandby ? (
          renderStandby(startGuidedFlow)
        ) : (
          <button
            type="button"
            id="start-guided-voice-btn"
            onClick={startGuidedFlow}
            className="px-2.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Iniciar Asistente de Voz para dictar datos"
          >
            <Mic className="w-3.5 h-3.5 text-white" />
            <span>Asistente Voz</span>
          </button>
        ))}

      {/* 2. Sleek Floating Voice Control Bar (Active across forms).
            Se ancla encima de la barra de navegación: con bottom-5 quedaba oculto detrás de ella. */}
      {isGuidedModeActive && (
        <div className="fixed bottom-[calc(var(--bottom-nav-reserve)+0.75rem)] left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg animate-in slide-in-from-bottom duration-300">
          <div className="bg-white border border-black/6 rounded-2xl shadow-sm p-3 text-[#1D1D1F]">
            
            {/* Top Bar: Active Step Indicator + Live Animated Equalizer */}
            <div className="flex items-center justify-between gap-2.5 px-1 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <StepIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-[#1D1D1F] truncate">
                      {currentStep.title}
                    </p>
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                      {currentStepIndex + 1}/{GUIDED_VOICE_STEPS.length}
                    </span>
                  </div>
                  
                  {/* Live Status / Prompt preview */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                    {isSpeakingPrompt ? (
                      <span className="text-slate-600 font-semibold flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5 text-primary" />
                        Hablando en voz alta...
                      </span>
                    ) : isPaused ? (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        <Pause className="w-3 h-3" />
                        Pausado
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {interimTranscript || transcript || 'Escuchando tu voz...'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Equalizer & Quick Voice Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 5-Bar Animated Equalizer */}
                <div className="flex items-center gap-0.5 h-5 px-1.5 py-1 bg-[#F5F5F7] rounded-lg border border-black/5">
                  {[0.4, 0.8, 1, 0.6, 0.3].map((heightMul, i) => {
                    const active = (isSpeakingPrompt || isListening) && !isPaused;
                    const dynamicHeight = active 
                      ? Math.max(20, Math.sin((speechWaveTick + i * 2) * 0.5) * 80 * heightMul + 20)
                      : 20;
                    return (
                      <span
                        key={i}
                        className={`w-1 rounded-full transition-all duration-100 ${
                          isSpeakingPrompt 
                            ? 'bg-primary' 
                            : isListening 
                            ? 'bg-emerald-500' 
                            : 'bg-slate-300'
                        }`}
                        style={{ height: `${dynamicHeight}%` }}
                      />
                    );
                  })}
                </div>

                {/* Speak / Re-speak trigger button */}
                <button
                  type="button"
                  onClick={() => speakPrompt(currentStep.speechPrompt)}
                  title="Escuchar locución de nuevo"
                  className="p-1.5 rounded-xl bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-600 border border-black/5 text-xs transition-colors cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                {/* Mute toggle */}
                <button
                  type="button"
                  onClick={() => setSpeechSynthesisMuted(!speechSynthesisMuted)}
                  title={speechSynthesisMuted ? 'Activar locución' : 'Silenciar locución'}
                  className={`p-1.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                    speechSynthesisMuted ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-600 border-black/5'
                  }`}
                >
                  {speechSynthesisMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Settings toggle */}
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className={`p-1.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                    showDetails
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-600 border-black/5'
                  }`}
                  title="Configuración de voz y respuestas rápidas"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body: prompt, captured value, manual input, collapsed extras */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  «{currentStep.speechPrompt}»
                </p>
                <button
                  type="button"
                  onClick={() => speakPrompt(currentStep.speechPrompt)}
                  className="shrink-0 text-[10px] text-primary hover:opacity-70 font-semibold cursor-pointer"
                >
                  Repetir audio
                </button>
              </div>

              {/* Last Captured Value Badge */}
              {lastCapturedValue && (
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-500 font-medium text-[10px] shrink-0">Dato capturado:</span>
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 truncate">
                    ✓ {lastCapturedValue}
                  </span>
                </div>
              )}

              {/* Manual Input Fallback / Direct Editor (Using div to prevent nested form error) */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={manualInputText}
                  onChange={(e) => setManualInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!manualInputText.trim()) return;
                      handleProcessSpeech(manualInputText.trim());
                      setManualInputText('');
                    }
                  }}
                  placeholder={`Escribir o corregir (${currentStep.title})...`}
                  className="flex-1 bg-[#F5F5F7] border border-black/5 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs text-[#1D1D1F] placeholder-slate-400 rounded-lg px-2.5 py-1 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!manualInputText.trim()) return;
                    handleProcessSpeech(manualInputText.trim());
                    setManualInputText('');
                  }}
                  disabled={!manualInputText.trim()}
                  className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-40 text-white text-[11px] font-semibold shrink-0 transition-colors cursor-pointer"
                >
                  Aplicar
                </button>
              </div>

              {/* Expandable Settings: quick answers + voice config */}
              {showDetails && (
                <div className="pt-2 border-t border-black/6 space-y-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                    <span className="text-[10px] text-slate-500 shrink-0 flex items-center gap-0.5">
                      <Sparkles className="w-3 h-3 text-slate-400" />
                      Sugerencias:
                    </span>
                    {[currentStep.sampleAnswer, ...(currentStep.alternativeSamples || [])].slice(0, 3).map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSampleAnswer(sample)}
                        className="px-2 py-0.5 rounded-lg bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-700 text-[10px] font-medium border border-black/5 shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>"{sample}"</span>
                        <ChevronRight className="w-2.5 h-2.5 opacity-50" />
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] text-slate-500 shrink-0">Voz:</span>
                      <span className="text-[10px] text-slate-700 font-medium truncate">
                        {activeVoiceName || 'Español Predeterminado'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500">Velocidad:</span>
                      <button
                        type="button"
                        onClick={() => setSpeechRate(prev => prev === 1.0 ? 1.15 : prev === 1.15 ? 0.9 : 1.0)}
                        className="px-2 py-0.5 rounded bg-[#F5F5F7] text-slate-700 text-[10px] font-semibold border border-black/5"
                      >
                        {speechRate}x
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar: Red Recording Circle, Pause, Stop, Repeat, Skip */}
            <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-black/6">
              
              {/* Left: Repeat current field prompt */}
              <button
                type="button"
                onClick={() => speakPrompt(currentStep.speechPrompt)}
                className="p-2 rounded-xl bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-600 transition-colors cursor-pointer"
                title="Repetir pregunta en voz alta"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Center Controls: Red Record Circle, Pause, Stop (Square) */}
              <div className="flex items-center gap-1.5">
                
                {/* 1. Red Recording Circle Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isPaused) {
                      togglePause();
                    } else {
                      speakPrompt(currentStep.speechPrompt);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-semibold text-xs transition-colors cursor-pointer border ${
                    !isPaused && isListening 
                      ? 'bg-rose-600 text-white border-rose-600' 
                      : 'bg-[#F5F5F7] text-slate-600 border-black/5 hover:bg-[#EBEBEF]'
                  }`}
                  title="Grabando voz activamente"
                >
                  <span className={`w-2 h-2 rounded-full ${!isPaused && isListening ? 'bg-white animate-pulse' : 'bg-rose-500'}`} />
                  <span>{!isPaused ? (isListening ? 'Grabando' : 'Escuchando') : 'Reanudar'}</span>
                </button>

                {/* 2. Pause / Play Button */}
                <button
                  type="button"
                  onClick={togglePause}
                  className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                    isPaused 
                      ? 'bg-primary text-white border-primary' 
                      : 'bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-600 border-black/5'
                  }`}
                  title={isPaused ? 'Reanudar Asistente' : 'Pausar Asistente'}
                >
                  {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
                </button>

                {/* 3. Stop (Square) Button */}
                <button
                  type="button"
                  onClick={stopGuidedFlow}
                  className="p-2 rounded-xl bg-[#F5F5F7] hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-black/5 hover:border-rose-200 transition-colors cursor-pointer"
                  title="Detener Asistente de Voz"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Right: Next Field / Save Button */}
              {currentStepIndex < GUIDED_VOICE_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goToStep(currentStepIndex + 1)}
                  className="px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Pasar al siguiente campo"
                >
                  <span>Pasar</span>
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    emitSaveOnce();
                    stopGuidedFlow();
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Guardar Lead"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Error alert toast */}
      {errorMessage && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </>
  );
};
