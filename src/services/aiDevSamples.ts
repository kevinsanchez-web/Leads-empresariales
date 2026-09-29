import { CompanyResearchInfo } from "../types";

export interface ScannedCard {
  name?: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  city?: string;
  interests?: string[];
  notes?: string;
}

export function devScannedCard(): { success: true; data: ScannedCard } {
  return {
    success: true,
    data: {
      name: "Contacto Escaneado",
      company: "Empresa Detectada",
      role: "Ejecutivo",
      email: "",
      phone: "",
      city: "",
      interests: ["Transformación Digital", "IA"],
      notes: "Tarjeta procesada en modo simulado.",
    },
  };
}

export function devLeadAnalysis(params: { name?: string; company?: string; role?: string; interests?: string[] }) {
  const cleanInterests = params.interests && params.interests.length > 0 ? params.interests : ["Transformación Digital"];
  return {
    success: true as const,
    analysis: {
      resumenEstrategico: `${params.name || "El prospecto"} (${params.role || "Ejecutivo"} en ${params.company || "su empresa"}) presenta un perfil de alto interés comercial enfocado en ${cleanInterests.join(", ")}.`,
      oportunidadClave: `Modernización e implementación de soluciones en ${cleanInterests[0] || "automatización de procesos"}.`,
      siguienteAccion: "Agendar reunión de presentación ejecutiva de 30 minutos para presentar casos de éxito relevantes.",
      nivelPrioridad: "Alta" as const,
      puntosDeContactoRecomendados: [
        "Compartir credenciales y propuesta de valor inicial vía correo",
        "Coordinar demostración técnica enfocada en sus requerimientos de negocio",
      ],
    },
  };
}

export function devDraftEmail(params: { leadName?: string; leadCompany?: string; interests?: string[]; repName?: string; eventName?: string }) {
  const cleanInterests = params.interests && params.interests.length > 0 ? params.interests : ["innovación digital"];
  return {
    success: true as const,
    email: {
      asunto: `Seguimiento a nuestra reunión en ${params.eventName || "el evento"} - Divergency AI & ${params.leadCompany || "su empresa"}`,
      cuerpo: `Estimado/a ${params.leadName || "Contacto"},\n\nFue un placer conversar contigo durante ${params.eventName || "nuestro reciente evento"}. Me dio mucho gusto conocer más sobre los proyectos de ${params.leadCompany || "su organización"} y su enfoque hacia ${cleanInterests.join(", ")}.\n\nMe gustaría proponerte una breve reunión virtual de 15 minutos en los próximos días para compartirte ejemplos prácticos de cómo hemos ayudado a empresas similares a acelerar sus objetivos.\n\n¿Tendrías disponibilidad esta semana o la próxima para coordinar la llamada?\n\nQuedo atento a tus comentarios.\n\nCordialmente,\n${params.repName || "Equipo Comercial"}\nDivergency AI`,
    },
  };
}

function heuristicIndustry(nameLower: string) {
  if (/banc|bank|finan|cred|davivienda|bbva|davibank/.test(nameLower)) {
    return {
      industry: "Banca, Finanzas & Fintech",
      summary: "entidad del sector financiero en servicios bancarios, créditos, medios de pago y soluciones digitales",
      productsAndServices: ["Banca digital y plataformas de pago", "Créditos comerciales e hipotecarios", "Gestión de activos y tesorería corporativa"],
      targetMarket: "Clientes corporativos, PYMES y banca de consumo masivo",
    };
  }
  if (/telecom|claro|tigo|movistar|wom|telco|\bred\b/.test(nameLower)) {
    return {
      industry: "Telecomunicaciones y Conectividad",
      summary: "proveedor de infraestructura de telecomunicaciones, conectividad móvil y fibra óptica",
      productsAndServices: ["Redes 5G y fibra óptica corporativa", "Soluciones de Cloud Connectivity y SD-WAN", "Servicios de telefonía e internet empresarial"],
      targetMarket: "Empresas multinacionales, operadores y usuarios residenciales",
    };
  }
  if (/soft|tech|\bai\b|cloud|data|globant|oracle|ibm|micro|aws/.test(nameLower)) {
    return {
      industry: "Tecnología, Software & Nube",
      summary: "compañía tecnológica de desarrollo de software, analítica de datos, infraestructura cloud e IA",
      productsAndServices: ["Desarrollo de software a medida y APIs", "Servicios de migración a la nube y DevOps", "Soluciones de IA generativa y analítica predictiva"],
      targetMarket: "Empresas en proceso de digitalización y startups tecnológicas",
    };
  }
  if (/retail|\bexito\b|falabella|alkosto|comerc|shop|super/.test(nameLower)) {
    return {
      industry: "Retail, Comercio & Consumo Masivo",
      summary: "cadena de comercialización y distribución con presencia multicanal y e-commerce",
      productsAndServices: ["Canales de venta omnicanal y e-commerce", "Programas de fidelización y promociones", "Distribución logística de última milla"],
      targetMarket: "Consumidores finales y canales mayoristas",
    };
  }
  if (/salud|\beps\b|\bips\b|medic|farma|clinic|san/.test(nameLower)) {
    return {
      industry: "Salud, Farmacéutica & MedTech",
      summary: "institución dedicada a servicios integrales de salud y gestión hospitalaria",
      productsAndServices: ["Servicios asistenciales y telemedicina", "Distribución de insumos y medicamentos", "Sistemas de historia clínica digital"],
      targetMarket: "Pacientes, entidades de salud pública y aseguradoras",
    };
  }
  if (/energi|petrol|\bgas\b|\beco\b|solar|\bmin\b/.test(nameLower)) {
    return {
      industry: "Energía, Petróleo & Sostenibilidad",
      summary: "empresa del sector energético enfocada en producción, distribución y transición energética",
      productsAndServices: ["Generación y distribución energética", "Soluciones de eficiencia y energía solar", "Consultoría en sostenibilidad y ESG"],
      targetMarket: "Sector industrial, comercial y redes públicas de energía",
    };
  }
  if (/logist|trans|envio|carga|express|servi/.test(nameLower)) {
    return {
      industry: "Logística, Transporte & Cadena de Suministro",
      summary: "compañía de transporte de carga, almacenamiento y optimización de cadena de suministro",
      productsAndServices: ["Transporte terrestre y multimodal", "Centros logísticos y gestión de bodegas", "Trazabilidad en tiempo real y última milla"],
      targetMarket: "Empresas importadoras, exportadoras y comercio electrónico",
    };
  }
  return {
    industry: "",
    summary: "",
    productsAndServices: [],
    targetMarket: "",
  };
}

export function devCompanyProfile(companyName: string): { success: true; companyInfo: CompanyResearchInfo | null } {
  const trimmed = (companyName || "").trim();
  const match = heuristicIndustry(trimmed.toLowerCase());
  if (!match.summary) return { success: true, companyInfo: null };

  return {
    success: true,
    companyInfo: {
      summary: `${trimmed}: ${match.summary}.`,
      industry: match.industry,
      productsAndServices: match.productsAndServices,
      targetMarket: match.targetMarket,
      keyHighlights: [],
      sources: [],
      researchedAt: new Date().toISOString().slice(0, 10),
    },
  };
}
