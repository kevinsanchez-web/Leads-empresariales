import { auth } from "../firebase";
import { CompanyResearchInfo, ContactEnrichment } from "../types";
import { aiRequest, AiOutcome, AiFailure, AI_SIMULATED_WARNING, AI_FALLBACK_REJECTED, AI_SIMULATED_DISABLED, isAiFailure } from "./aiTransport";
import { devScannedCard, devLeadAnalysis, devDraftEmail, devCompanyProfile, ScannedCard } from "./aiDevSamples";

const VITE_ENV: Record<string, string | undefined> =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};

const WORKER_URL = (VITE_ENV.VITE_AI_WORKER_URL || "").replace(/\/$/, "");

export { AI_SIMULATED_WARNING, AI_FALLBACK_REJECTED, isAiFailure };
export type { AiFailure };
export type { ScannedCard } from "./aiDevSamples";

// Las muestras simuladas existen solo al correr con "vite dev" y sin URL configurada.
// La doble condicion no es redundante: import.meta.env.DEV se compila a false en produccion,
// asi que Rollup elimina el bloque completo y las muestras no llegan al bundle publicado.
export const isAiSimulatedMode = () => import.meta.env.DEV && WORKER_URL === "";

export interface LeadAnalysis {
  resumenEstrategico?: string;
  oportunidadClave?: string;
  siguienteAccion?: string;
  nivelPrioridad?: "Alta" | "Media" | "Baja";
  puntosDeContactoRecomendados?: string[];
}

export interface DraftEmail {
  asunto?: string;
  cuerpo?: string;
}

export interface ScanCardPayload { data?: ScannedCard }
export interface AnalyzeLeadPayload { analysis?: LeadAnalysis }
export interface DraftEmailPayload { email?: DraftEmail }
export interface ResearchCompanyPayload {
  companyInfo?: CompanyResearchInfo | null;
  usedSearch?: boolean;
}

export interface EnrichLeadPayload {
  enrichment?: ContactEnrichment;
}

function getIdToken(): Promise<string | undefined> {
  return auth.currentUser?.getIdToken() ?? Promise.resolve(undefined);
}

export function scanCard(image: string): Promise<AiOutcome<ScanCardPayload>> {
  return aiRequest<ScanCardPayload>({
    workerUrl: WORKER_URL,
    path: "/api/ai/scan-card",
    body: { image },
    getIdToken,
    devSample: isAiSimulatedMode() ? devScannedCard : undefined,
  });
}

export function analyzeLead(params: {
  name?: string;
  company?: string;
  role?: string;
  interests?: string[];
  interactions?: unknown;
  notes?: string;
}): Promise<AiOutcome<AnalyzeLeadPayload>> {
  return aiRequest<AnalyzeLeadPayload>({
    workerUrl: WORKER_URL,
    path: "/api/ai/analyze-lead",
    body: params,
    getIdToken,
    devSample: isAiSimulatedMode() ? () => devLeadAnalysis(params) : undefined,
  });
}

export function draftEmail(params: {
  leadName?: string;
  leadCompany?: string;
  leadRole?: string;
  interests?: string[];
  repName?: string;
  eventName?: string;
}): Promise<AiOutcome<DraftEmailPayload>> {
  return aiRequest<DraftEmailPayload>({
    workerUrl: WORKER_URL,
    path: "/api/ai/draft-email",
    body: params,
    getIdToken,
    devSample: isAiSimulatedMode() ? () => devDraftEmail(params) : undefined,
  });
}

/**
 * Busca datos públicos y citados de una persona y su empresa. No hay muestra simulada: sin
 * GEMINI real esta ruta no puede devolver nada verificable, y una muestra presentada como dato
 * bueno es justo lo que el gate de citas del Worker existe para impedir.
 */
export function enrichLead(params: {
  leadName?: string;
  companyName: string;
  role?: string;
}): Promise<AiOutcome<EnrichLeadPayload>> {
  return aiRequest<EnrichLeadPayload>({
    workerUrl: WORKER_URL,
    path: "/api/ai/enrich-lead",
    body: params,
    getIdToken,
  });
}

export async function researchCompany(params: {
  companyName: string;
  leadName?: string;
  role?: string;
}): Promise<AiOutcome<ResearchCompanyPayload>> {
  if (WORKER_URL) {
    return aiRequest<ResearchCompanyPayload>({
      workerUrl: WORKER_URL,
      path: "/api/ai/research-company",
      body: params,
      getIdToken,
    });
  }

  if (!isAiSimulatedMode()) {
    return { success: false, simulated: false, error: AI_SIMULATED_DISABLED };
  }

  const sample = devCompanyProfile(params.companyName);
  if (!sample.companyInfo) {
    return {
      success: false,
      simulated: true,
      error: `Sin IA no hay datos de "${params.companyName}". ${AI_SIMULATED_WARNING}`,
    };
  }
  return { ...sample, simulated: true };
}
