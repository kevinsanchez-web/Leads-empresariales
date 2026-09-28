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
  nextContactDate?: string;
  history: InteractionItem[];
  suggestedAction?: SuggestedAction;
  companyInfo?: CompanyResearchInfo;
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

export type UserRoleType = "admin" | "executive";

export interface UserRep {
  id: string;
  name: string;
  role: string;
  accountType?: UserRoleType;
  email: string;
  avatar: string;
  team: string;
  phone?: string;
  password?: string;
  pin?: string;
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

export type ActiveView = "personas" | "empresas" | "eventos" | "intereses" | "seguimientos" | "reportes" | "captura_movil" | "notificaciones" | "usuarios" | "mis_leads" | "configuracion";

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
