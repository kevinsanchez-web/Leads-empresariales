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

      // Sin VITE_AI_WORKER_URL la respuesta es una muestra. No se aplica sola: el comercial
      // tiene que ver el aviso y aceptarla, o estos datos entran al CRM como si fueran reales.
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
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                Escáner Inteligente IA
                <span className="text-[10px] bg-blue-500/30 text-blue-300 font-bold px-2 py-0.5 rounded-full">Gemini 2.5</span>
              </h3>
              <p className="text-xs text-slate-400">Escanea tarjetas de presentación, escarapelas o códigos QR</p>
            </div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'camera' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Usar Cámara en Vivo</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'upload' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Subir Foto / Imagen</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 relative">
          
          {errorMsg && (
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex-1">
                <AiNotice message={errorMsg} tone={errorSimulated ? 'simulated' : 'error'} />
              </div>
              {activeTab === 'camera' && !errorSimulated && (
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-bold shrink-0 cursor-pointer"
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
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onScanSuccess(sampleData);
                    onClose();
                  }}
                  className="flex-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold cursor-pointer"
                >
                  Aplicar los datos de ejemplo
                </button>
                <button
                  type="button"
                  onClick={() => setSampleData(null)}
                  className="flex-1 px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#EBEBEF] text-slate-700 rounded-xl text-[11px] font-bold cursor-pointer"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isScanning && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 animate-bounce">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-slate-900">Extrayendo Datos con Gemini IA...</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Analizando nombre, empresa, cargo, correo y número telefónico de la tarjeta.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 mt-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando imagen</span>
              </div>
            </div>
          )}

          {activeTab === 'camera' ? (
            <div className="space-y-4">
              <div className="relative aspect-4/3 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Target Frame Guide Overlay */}
                <div className="absolute inset-8 border-2 border-blue-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-blue-500"></div>
                    <div className="w-4 h-4 border-t-2 border-r-2 border-blue-500"></div>
                  </div>
                  <div className="text-center text-[11px] font-bold text-white bg-slate-900/70 py-1 px-3 rounded-full mx-auto backdrop-blur-xs">
                    Apunta la tarjeta o escarapela aquí
                  </div>
                  <div className="flex justify-between">
                    <div className="w-4 h-4 border-b-2 border-l-2 border-blue-500"></div>
                    <div className="w-4 h-4 border-b-2 border-r-2 border-blue-500"></div>
                  </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />
              </div>

              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={isScanning || !isCameraActive}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-98 transition-all cursor-pointer"
              >
                <Camera className="w-5 h-5" />
                <span>Tomar Foto y Escanear</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-4/3 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">Haz clic para seleccionar o arrastra una foto</p>
                <p className="text-xs text-slate-500 mt-1">Soporta JPG, PNG, WEBP (Tarjetas de presentación o escarapelas)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Elegir archivo del dispositivo</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Soporta OCR multilingüe e IA generativa</span>
          <button onClick={() => { stopCamera(); onClose(); }} className="text-slate-600 font-bold hover:underline cursor-pointer">
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};
