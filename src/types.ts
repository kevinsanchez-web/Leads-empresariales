export type LeadStatus = "Nuevo" | "Contactado" | "Calificado" | "Reunión Agendada" | "Ganado" | "Descartado";

export interface InteractionItem {
  id: string;
  date: string;
  time: string;
  author: string;
  text: string;
  type?: 'note' | 'status_change' | 'priority_change' | 'interest_added' | 'meeting' | 'source_added' | 'demo' | 'call' | 'email';
}

export interface SuggestedAction {
  title: string;
  description: string;
  type: 'meeting' | 'call' | 'email' | 'demo';
  scheduledDate?: string;
}

export interface CompanyResearchSource {
  title: string;
  url: string;
}

// Nivel de evidencia de un dato enriquecido. "cited" exige que la fuente sea la página exacta;
// "unverified" admite una cita del mismo dominio y la UI lo marca como dato aparente a revisar.
export type EnrichmentConfidence = "cited" | "unverified";

// Datos encontrados por IA para un lead. Todo campo que no venga acompañado de una cita real
// queda en null con su motivo en `reason`: un dato sin fuente se ve igual que uno bueno, y esa
// es exactamente la debilidad que no se puede dejar pasar.
export interface ContactEnrichment {
  linkedinUrl: string | null;
  email: string | null;
  companyPhone: string | null;
  status: "ok" | "partial" | "not_found" | "error";
  usedSearch: boolean;
  confidence?: Partial<Record<"linkedinUrl" | "email" | "companyPhone", EnrichmentConfidence>>;
  sources?: CompanyResearchSource[];
  model?: string;
  enrichedAt: string;
  reason?: string;
}

export interface CompanyResearchInfo {
  summary: string;
  industry?: string;
  productsAndServices?: string[];
  targetMarket?: string;
  keyHighlights?: string[];
  sources?: CompanyResearchSource[];
  researchedAt?: string;
}

export interface Lead {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  city?: string;
  event: string;
  interests: string[];
  experiences: string[];
  sources: string[];
  capturedBy: string;
  capturedAt: string;
  lastContact: string;
  priority: boolean;
  status: LeadStatus;
  estimatedValue?: number;
  notes?: string;
  // Fecha en que se cierra el seguimiento del lead, no la de captura. Alimenta `getNotificationAlerts`.
  nextContactDate?: string;
  history: InteractionItem[];
  suggestedAction?: SuggestedAction;
  companyInfo?: CompanyResearchInfo;
  // Datos adicionales de contacto ampliados por la vista de Enriquecimiento. linkedinUrl es un
  // dato citado: solo llega con la fuente que lo respalda, o no se escribe.
  linkedinUrl?: string;
  enrichment?: ContactEnrichment;
}

export interface NotificationAlert {
  id: string;
  leadId: string;
  leadName: string;
  company: string;
  role: string;
  title: string;
  description: string;
  scheduledDate: string;
  category: 'overdue' | 'today' | 'upcoming' | 'priority';
  type: 'meeting' | 'call' | 'email' | 'demo';
  capturedBy: string;
  isCompleted?: boolean;
  daysDiff: number;
}

import type { Role } from "./models/roles";

// Alias de compatibilidad: el rol vive ahora en models/roles.ts.
export type UserRoleType = Role;

export interface UserRep {
  id: string;
  name: string;
  role: string;
  // Los usuarios guardados antes de los roles nuevos traen "executive"; resolveRole() lo traduce.
  accountType?: Role | "executive";
  email: string;
  avatar: string;
  team: string;
  phone?: string;
  color?: string;
  createdAt?: string;
  lastLogin?: string;
  status?: 'active' | 'away' | 'offline';
}

export interface UserSessionLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  loginAt: string;
  ip?: string;
  device?: string;
}

export interface EventOption {
  id: string;
  name: string;
  location: string;
  dateRange: string;
  isCurrent?: boolean;
}

export type ActiveView = "personas" | "empresas" | "eventos" | "intereses" | "seguimientos" | "reportes" | "captura_movil" | "notificaciones" | "usuarios" | "configuracion" | "enriquecimiento";

export type AccentTheme = 'azul' | 'verde' | 'naranja' | 'purpura';

export interface ThemeOption {
  id: AccentTheme;
  name: string;
  colorName: string;
  hex: string;
  previewClass: string;
  gradientClass: string;
  desc: string;
}
