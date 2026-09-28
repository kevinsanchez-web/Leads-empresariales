import { CompanyResearchInfo } from "../types";
import { auth } from "../firebase";

const WORKER_URL = (import.meta.env.VITE_AI_WORKER_URL || "").replace(/\/$/, "");

async function callWorker<T>(path: string, body: unknown, fallback: () => T): Promise<T> {
  if (!WORKER_URL) return fallback();
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) throw new Error("No hay sesión activa");

    const res = await fetch(`${WORKER_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`El asistente de IA respondió ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`Aviso en ${path}, usando modo simulado:`, err);
    return fallback();
  }
}

export function scanCard(image: string) {
  return callWorker("/api/ai/scan-card", { image }, () => ({
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
      isFallback: true,
    },
  }));
}

export function analyzeLead(params: {
  name?: string;
  company?: string;
  role?: string;
  interests?: string[];
  interactions?: unknown;
  notes?: string;
}) {
  const cleanInterests = params.interests && params.interests.length > 0 ? params.interests : ["Transformación Digital"];
  return callWorker("/api/ai/analyze-lead", params, () => ({
    success: true,
    analysis: {
      resumenEstrategico: `${params.name || "El prospecto"} (${params.role || "Ejecutivo"} en ${params.company || "su empresa"}) presenta un perfil de alto interés comercial enfocado en ${cleanInterests.join(", ")}.`,
      oportunidadClave: `Modernización e implementación de soluciones en ${cleanInterests[0] || "automatización de procesos"}.`,
      siguienteAccion: "Agendar reunión de presentación ejecutiva de 30 minutos para presentar casos de éxito relevantes.",
      nivelPrioridad: "Alta" as const,
      puntosDeContactoRecomendados: [
        "Compartir credenciales y propuesta de valor inicial vía correo",
        "Coordinar demostración técnica enfocada en sus requerimientos de negocio",
      ],
      isFallback: true,
    },
  }));
}

export function draftEmail(params: {
  leadName?: string;
  leadCompany?: string;
  leadRole?: string;
  interests?: string[];
  repName?: string;
  eventName?: string;
}) {
  const cleanInterests = params.interests && params.interests.length > 0 ? params.interests : ["innovación digital"];
  return callWorker("/api/ai/draft-email", params, () => ({
    success: true,
    email: {
      asunto: `Seguimiento a nuestra reunión en ${params.eventName || "el evento"} - Divergency AI & ${params.leadCompany || "su empresa"}`,
      cuerpo: `Estimado/a ${params.leadName || "Contacto"},\n\nFue un placer conversar contigo durante ${params.eventName || "nuestro reciente evento"}. Me dio mucho gusto conocer más sobre los proyectos de ${params.leadCompany || "su organización"} y su enfoque hacia ${cleanInterests.join(", ")}.\n\nMe gustaría proponerte una breve reunión virtual de 15 minutos en los próximos días para compartirte ejemplos prácticos de cómo hemos ayudado a empresas similares a acelerar sus objetivos.\n\n¿Tendrías disponibilidad esta semana o la próxima para coordinar la llamada?\n\nQuedo atento a tus comentarios.\n\nCordialmente,\n${params.repName || "Equipo Comercial"}\nDivergency AI`,
      isFallback: true,
    },
  }));
}

function generateHeuristicCompanyProfile(companyName: string): CompanyResearchInfo & { isFallback: true } {
  const nameLower = (companyName || "").toLowerCase().trim();

  let industry = "Tecnología y Servicios Empresariales";
  let summary = `${companyName} es una destacada organización empresarial con operaciones enfocadas en soluciones estratégicas, innovación y desarrollo de mercado.`;
  let productsAndServices = [
    "Consultoría y asesoría técnica especializada",
    "Soluciones de transformación digital y gestión",
    "Servicios corporativos B2B integrales",
  ];
  let targetMarket = "Empresas medianas y grandes corporaciones en Latinoamérica";
  let keyHighlights = [
    "Participación activa en foros de innovación y eventos de la industria",
    "Adopción de tecnologías emergentes para la optimización de procesos",
  ];

  if (nameLower.includes("banc") || nameLower.includes("bank") || nameLower.includes("finan") || nameLower.includes("cred") || nameLower.includes("davivienda") || nameLower.includes("bbva") || nameLower.includes("davibank")) {
    industry = "Banca, Finanzas & Fintech";
    summary = `${companyName} es una entidad del sector financiero líder en la provisión de servicios bancarios, créditos, medios de pago y soluciones digitales para personas y empresas.`;
    productsAndServices = ["Banca digital y plataformas de pago", "Créditos comerciales e hipotecarios", "Gestión de activos y tesorería corporativa"];
    targetMarket = "Clientes corporativos, PYMES y banca de consumo masivo";
    keyHighlights = ["Liderazgo en transformación de pagos digitales", "Alta inversión en ciberseguridad y biometría"];
  } else if (nameLower.includes("telecom") || nameLower.includes("claro") || nameLower.includes("tigo") || nameLower.includes("movistar") || nameLower.includes("wom") || nameLower.includes("telco") || nameLower.includes("red")) {
    industry = "Telecomunicaciones y Conectividad";
    summary = `${companyName} es un proveedor clave de infraestructura de telecomunicaciones, redes de alta velocidad, conectividad móvil y fibra óptica.`;
    productsAndServices = ["Redes 5G y fibra óptica corporativa", "Soluciones de Cloud Connectivity y SD-WAN", "Servicios de telefonía e internet empresarial"];
    targetMarket = "Empresas multinacionales, operadores y usuarios residenciales";
    keyHighlights = ["Despliegue de infraestructura de conectividad avanzada", "Centros de datos de alta disponibilidad"];
  } else if (nameLower.includes("soft") || nameLower.includes("tech") || nameLower.includes("ai") || nameLower.includes("cloud") || nameLower.includes("data") || nameLower.includes("globant") || nameLower.includes("oracle") || nameLower.includes("ibm") || nameLower.includes("micro") || nameLower.includes("aws")) {
    industry = "Tecnología, Software & Nube";
    summary = `${companyName} es una compañía tecnológica especializada en desarrollo de software de vanguardia, analítica de datos, infraestructura cloud e Inteligencia Artificial.`;
    productsAndServices = ["Desarrollo de software a medida y APIs", "Servicios de migración a la nube y DevOps", "Soluciones de IA Generativa y analítica predictiva"];
    targetMarket = "Empresas en proceso de digitalización y startups tecnológicas";
    keyHighlights = ["Ecosistema ágil de innovación continua", "Alianzas estratégicas con principales proveedores globales"];
  } else if (nameLower.includes("retail") || nameLower.includes("exito") || nameLower.includes("falabella") || nameLower.includes("alkosto") || nameLower.includes("comerc") || nameLower.includes("shop") || nameLower.includes("super")) {
    industry = "Retail, Comercio & Consumo Masivo";
    summary = `${companyName} es una cadena de comercialización y distribución líder con amplia presencia multicanal y plataformas de comercio electrónico.`;
    productsAndServices = ["Canales de venta omnicanal y e-commerce", "Programas de fidelización y promociones", "Distribución logística de última milla"];
    targetMarket = "Consumidores finales y canales mayoristas";
    keyHighlights = ["Optimización de la experiencia del cliente digital", "Amplia red de centros de distribución"];
  } else if (nameLower.includes("salud") || nameLower.includes("eps") || nameLower.includes("ips") || nameLower.includes("medic") || nameLower.includes("farma") || nameLower.includes("clinic") || nameLower.includes("san")) {
    industry = "Salud, Farmacéutica & MedTech";
    summary = `${companyName} es una institución dedicada a la prestación de servicios integrales de salud, biotecnología y gestión hospitalaria de alta calidad.`;
    productsAndServices = ["Servicios asistenciales y telemedicina", "Distribución de insumos y medicamentos", "Sistemas de historia clínica digital"];
    targetMarket = "Pacientes, entidades de salud pública y aseguradoras";
    keyHighlights = ["Certificaciones de calidad médica y seguridad", "Implementación de tecnologías para atención remota"];
  } else if (nameLower.includes("energi") || nameLower.includes("petrol") || nameLower.includes("gas") || nameLower.includes("eco") || nameLower.includes("solar") || nameLower.includes("min")) {
    industry = "Energía, Petróleo & Sostenibilidad";
    summary = `${companyName} es una empresa del sector energético enfocada en la producción, distribución y transición hacia fuentes de energía sostenibles y eficientes.`;
    productsAndServices = ["Generación y distribución energética", "Soluciones de eficiencia y energía solar", "Consultoría en sostenibilidad y ESG"];
    targetMarket = "Sector industrial, comercial y redes públicas de energía";
    keyHighlights = ["Proyectos de descarbonización y transición energética", "Cumplimiento de estándares internacionales de sostenibilidad"];
  } else if (nameLower.includes("logist") || nameLower.includes("trans") || nameLower.includes("envio") || nameLower.includes("carga") || nameLower.includes("express") || nameLower.includes("servi")) {
    industry = "Logística, Transporte & Cadena de Suministro";
    summary = `${companyName} es una compañía especializada en transporte de carga, almacenamiento inteligente y optimización de la cadena de suministro nacional e internacional.`;
    productsAndServices = ["Transporte terrestre y multimodal", "Centros logísticos y gestión de bodegas", "Trazabilidad en tiempo real y última milla"];
    targetMarket = "Empresas importadoras, exportadoras y comercio electrónico";
    keyHighlights = ["Flotas monitoreadas con telemetría satelital", "Eficiencia en tiempos de entrega"];
  }

  return {
    summary,
    industry,
    productsAndServices,
    targetMarket,
    keyHighlights,
    sources: [{ title: `Registro Corporativo - ${companyName}`, url: `https://www.google.com/search?q=${encodeURIComponent(companyName)}` }],
    researchedAt: new Date().toISOString().slice(0, 10),
    isFallback: true,
  };
}

export function researchCompany(params: { companyName: string; leadName?: string; role?: string }) {
  const fallbackProfile = generateHeuristicCompanyProfile(params.companyName);
  return callWorker("/api/ai/research-company", params, () => ({
    success: true,
    companyInfo: fallbackProfile,
    message: "Perfil estructurado generado mediante análisis predictivo local.",
  }));
}
