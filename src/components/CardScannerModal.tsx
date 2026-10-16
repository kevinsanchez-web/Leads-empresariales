import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Sparkles, Loader2, QrCode } from 'lucide-react';
import { scanCard, isAiFailure, ScannedCard } from '../services/aiService';
import { AiNotice } from './AiNotice';

interface CardScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (data: {
    name?: string;
    company?: string;
    role?: string;
    email?: string;
    phone?: string;
    city?: string;
    interests?: string[];
    notes?: string;
  }) => void;
}

export const CardScannerModal: React.FC<CardScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorSimulated, setErrorSimulated] = useState(false);
  const [sampleData, setSampleData] = useState<ScannedCard | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Start live camera video stream
  const startCamera = async () => {
    try {
      setErrorMsg(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Cámara no disponible en este entorno");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn("Error al acceder a la cámara:", err);
      setIsCameraActive(false);
      setErrorMsg("No se pudo acceder a la cámara. Haz clic en 'Subir Foto' para seleccionar una imagen de tu dispositivo.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Si la cámara no se pudo abrir, el visor negro y el botón de captura no sirven para nada
  const cameraUnavailable = activeTab === 'camera' && !isCameraActive && !!errorMsg;

  // Send image base64 to server Gemini Vision API
  const processImageBase64 = async (base64Image: string) => {
    setIsScanning(true);
    setErrorMsg(null);
    setErrorSimulated(false);
    setSampleData(null);

    try {
      const resData = await scanCard(base64Image);

      if (isAiFailure(resData)) {
        setErrorMsg(resData.error);
        setErrorSimulated(resData.simulated);
        return;
      }

      if (!resData.data) {
        setErrorMsg('La IA no devolvió datos de la tarjeta.');
        return;
      }

      if (resData.simulated) {
        setSampleData(resData.data);
        return;
      }

      stopCamera();
      onScanSuccess(resData.data);
      onClose();
    } catch {
      setErrorMsg('No se pudo contactar el asistente de IA.');
    } finally {
      setIsScanning(false);
    }
  };

  // Capture frame from video
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      processImageBase64(dataUrl);
    }
  };

  // Handle uploaded photo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string;
      if (base64) {
        processImageBase64(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    // Overlay: el desenfoque fuerte vive SOLO aquí (fondo de la app), no en la tarjeta.
    // Tinte suave + blur-3xl = fondo calmado que dirige la atención al modal.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/25 backdrop-blur-[120px] not-supports-[backdrop-filter]:bg-slate-900/60 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Escáner Inteligente IA"
    >
      {/* Tarjeta sólida: legibilidad máxima, sin blur anidado (más ligero en móvil) */}
      <div className="relative flex w-full max-w-md max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.45)] ring-1 ring-black/5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6 sm:pt-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[15px] font-semibold tracking-tight text-slate-900">
                Escáner Inteligente IA
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  Gemini 2.5
                </span>
              </h3>
              <p className="text-xs leading-snug text-slate-500">
                Escanea tarjetas de presentación, escarapelas o QR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { stopCamera(); onClose(); }}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-primary"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Selector segmentado (estilo iOS) */}
        <div className="px-5 sm:px-6">
          <div className="flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full py-2 text-xs font-semibold transition-all ${
                activeTab === 'camera'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Camera className="h-4 w-4" />
              <span>Usar Cámara en Vivo</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full py-2 text-xs font-semibold transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span>Subir Foto / Imagen</span>
            </button>
          </div>
        </div>

        {/* Content (scroll interno si la pantalla es baja, p. ej. móvil horizontal) */}
        <div className="relative flex-1 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">

          {errorMsg && (
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <AiNotice message={errorMsg} tone={errorSimulated ? 'simulated' : 'error'} />
              </div>
              {activeTab === 'camera' && !errorSimulated && (
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="shrink-0 cursor-pointer rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  Subir Foto / Archivo
                </button>
              )}
            </div>
          )}

          {sampleData && (
            <div className="mb-4 space-y-2.5">
              <AiNotice
                message="No hay IA configurada, así que esto es una tarjeta de ejemplo, no la foto que subiste. Si aplicas estos datos, entra un contacto falso a la base."
                tone="simulated"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onScanSuccess(sampleData);
                    onClose();
                  }}
                  className="flex-1 cursor-pointer rounded-full bg-amber-500 px-4 py-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-amber-600 active:scale-[0.98]"
                >
                  Aplicar los datos de ejemplo
                </button>
                <button
                  type="button"
                  onClick={() => setSampleData(null)}
                  className="flex-1 cursor-pointer rounded-full bg-slate-100 px-4 py-2.5 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-200 active:scale-[0.98]"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          {/* Loading overlay */}
          {isScanning && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 p-6 text-center backdrop-blur-xl animate-fade-in">
              <div className="mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <Sparkles className="h-8 w-8" />
              </div>
              <h4 className="text-lg font-semibold tracking-tight text-slate-900">
                Extrayendo Datos con Gemini IA...
              </h4>
              <p className="mt-1 max-w-xs text-xs text-slate-500">
                Analizando nombre, empresa, cargo, correo y número telefónico de la tarjeta.
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-xs font-semibold text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Procesando imagen</span>
              </div>
            </div>
          )}

          {activeTab === 'camera' ? (cameraUnavailable ? null : (
            <div className="space-y-4">
              <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden rounded-3xl bg-slate-950">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />

                {/* Guía: solo esquinas redondeadas + etiqueta (sin borde completo) */}
                <div className="pointer-events-none absolute inset-6 flex flex-col justify-between sm:inset-8">
                  <div className="flex justify-between">
                    <div className="h-6 w-6 rounded-tl-xl border-l-[3px] border-t-[3px] border-white/90"></div>
                    <div className="h-6 w-6 rounded-tr-xl border-r-[3px] border-t-[3px] border-white/90"></div>
                  </div>
                  <div className="mx-auto rounded-full bg-white/90 px-3.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm backdrop-blur-md">
                    Apunta la tarjeta o escarapela aquí
                  </div>
                  <div className="flex justify-between">
                    <div className="h-6 w-6 rounded-bl-xl border-b-[3px] border-l-[3px] border-white/90"></div>
                    <div className="h-6 w-6 rounded-br-xl border-b-[3px] border-r-[3px] border-white/90"></div>
                  </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />
              </div>

              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={isScanning || !isCameraActive}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/40 transition-all hover:bg-primary-hover active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                <Camera className="h-5 w-5" />
                <span>Tomar Foto y Escanear</span>
              </button>
            </div>
          )) : (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-4/3 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition-all hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Haz clic para seleccionar o arrastra una foto</p>
                <p className="mt-1 text-xs text-slate-500">Soporta JPG, PNG, WEBP (Tarjetas de presentación o escarapelas)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};