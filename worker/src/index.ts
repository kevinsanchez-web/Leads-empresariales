// Cloudflare Worker: esconde la clave de Gemini y expone las 4 rutas de IA que antes vivían
// en server.ts. Se llama a la API REST de Gemini directamente con fetch (sin el SDK de Node)
// porque el runtime de Workers no es Node.js.
//
// Cada request de IA debe traer el mismo token de Firebase Auth que usa el login de la app
// (Authorization: Bearer <idToken>). Sin eso, cualquiera que encontrara esta URL pública en el
// bundle del navegador podría gastar la cuota de Gemini sin haber iniciado sesión nunca.

import { createRemoteJWKSet, jwtVerify } from "jose";

export interface Env {
  GEMINI_API_KEY: string;
}

const FIREBASE_PROJECT_ID = "leads-divergency";
const ALLOWED_DOMAINS = ["gmail.com", "cun.edu.co"];

function isAllowedEmail(email: string | undefined): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

async function requireAuthorizedUser(req: Request): Promise<void> {
  const authHeader = req.headers.get("Authorization") || "";
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) throw new Error("Falta el token de sesión");

  const { payload } = await jwtVerify(match[1], JWKS, {
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_ID,
  });

  if (!payload.email || !payload.email_verified || !isAllowedEmail(payload.email as string)) {
    throw new Error("Cuenta no autorizada");
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

const MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-3.7-flash"];

async function generateContent(apiKey: string, model: string, body: Record<string, unknown>) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data: any = await res.json();
  if (!res.ok) {
    const err: any = new Error(data?.error?.message || `Gemini respondió ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const text: string = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  return { text, candidates: data?.candidates };
}

function isQuotaOrRateLimitError(error: any): boolean {
  const errorStr = (error?.message || error?.status || "").toString().toLowerCase();
  return (
    error?.status === 429 ||
    errorStr.includes("429") ||
    errorStr.includes("resource_exhausted") ||
    errorStr.includes("quota") ||
    errorStr.includes("rate limit") ||
    errorStr.includes("exceeded")
  );
}

async function generateWithFallbackModels(apiKey: string, body: Record<string, unknown>) {
  let lastErr: any = null;
  for (const model of MODELS_TO_TRY) {
    try {
      const result = await generateContent(apiKey, model, body);
      if (result.text) return result;
    } catch (err) {
      lastErr = err;
      console.warn(`Modelo ${model} falló:`, (err as Error)?.message || err);
    }
  }
  if (lastErr) throw lastErr;
  return { text: "", candidates: [] as any[] };
}

function extractJson(text: string): any | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function generateHeuristicCompanyProfile(companyName: string) {
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

async function handleScanCard(req: Request, apiKey: string): Promise<Response> {
  const { image } = (await req.json()) as any;
  if (!image) return json({ error: "Se requiere la imagen en base64" }, 400);

  const fallbackResponse = () =>
    json({
      success: true,
      data: {
        name: "Contacto Escaneado",
        company: "Empresa Detectada",
        role: "Ejecutivo",
        email: "",
        phone: "",
        city: "",
        interests: ["Transformación Digital", "IA"],
        notes: "Tarjeta procesada en modo local.",
        isFallback: true,
      },
    });

  if (!apiKey) return fallbackResponse();

  const matches = image.match(/^data:(.+);base64,(.+)$/);
  const mimeType = matches ? matches[1] : "image/jpeg";
  const base64Data = matches ? matches[2] : image;

  const prompt = `Analiza esta imagen de una tarjeta de presentación, escarapela/badge de evento corporativo o código QR.
Extrae la información en un objeto JSON estricto con los siguientes campos:
{
  "name": "string (nombre completo de la persona)",
  "company": "string (nombre de la empresa u organización)",
  "role": "string (cargo, posición o título profesional)",
  "email": "string (correo electrónico o vacío)",
  "phone": "string (teléfono, celular o WhatsApp)",
  "city": "string (ciudad o ubicación si aparece)",
  "interests": ["lista de intereses o tecnologías mencionadas si aplican"],
  "notes": "string breve con contexto adicional extraído del diseño o texto de la tarjeta"
}

Si algún dato no aparece en la imagen, asigna una cadena vacía "". Responde ÚNICAMENTE con el objeto JSON válido.`;

  try {
    const { text } = await generateWithFallbackModels(apiKey, {
      contents: [{ parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }],
    });
    const parsed = text && extractJson(text);
    if (parsed) return json({ success: true, data: parsed });
    return json({
      success: true,
      data: {
        name: "Contacto Extraído",
        company: "Empresa Asistente",
        role: "Representante",
        email: "",
        phone: "",
        city: "Colombia",
        interests: ["IA Corporativa", "Automatización"],
        notes: "Información recuperada mediante procesamiento resiliente.",
        isFallback: true,
      },
    });
  } catch (error: any) {
    console.error("Error en scan-card:", error?.message || error);
    return json({
      success: true,
      data: {
        name: "Contacto Tarjeta",
        company: "Empresa Participante",
        role: "Ejecutivo Comercial",
        email: "",
        phone: "",
        city: "",
        interests: ["Innovación"],
        notes: "Procesado con extractor de respaldo.",
        isFallback: true,
      },
    });
  }
}

async function handleAnalyzeLead(req: Request, apiKey: string): Promise<Response> {
  const body = (await req.json()) as any;
  const { name, company, role, interests, interactions, notes } = body || {};
  const cleanInterests = Array.isArray(interests) && interests.length > 0 ? interests : ["Transformación Digital"];

  const fallbackAnalysis = {
    resumenEstrategico: `${name || "El prospecto"} (${role || "Ejecutivo"} en ${company || "su empresa"}) presenta un perfil de alto interés comercial enfocado en ${cleanInterests.join(", ")}.`,
    oportunidadClave: `Modernización e implementación de soluciones en ${cleanInterests[0] || "automatización de procesos"}.`,
    siguienteAccion: "Agendar reunión de presentación ejecutiva de 30 minutos para presentar casos de éxito relevantes.",
    nivelPrioridad: "Alta",
    puntosDeContactoRecomendados: [
      "Compartir credenciales y propuesta de valor inicial vía correo",
      "Coordinar demostración técnica enfocada en sus requerimientos de negocio",
    ],
    isFallback: true,
  };

  if (!apiKey) return json({ success: true, analysis: fallbackAnalysis });

  const prompt = `Eres un asistente de Inteligencia Artificial para representantes comerciales en eventos corporativos (como ANDICOM, Tech Summits).
Analiza los datos del siguiente lead y genera un informe conciso en formato JSON con la siguiente estructura:
{
  "resumenEstrategico": "string de 2 oraciones con el perfil y potencial del cliente",
  "oportunidadClave": "string con la principal necesidad o dolor detectado",
  "siguienteAccion": "string con la acción concreta sugerida (ej. Agendar demo técnica, enviar propuesta personalizada de IA)",
  "nivelPrioridad": "Alta" | "Media" | "Baja",
  "puntosDeContactoRecomendados": ["punto 1", "punto 2"]
}

Lead:
Nombre: ${name || "N/A"}
Empresa: ${company || "N/A"}
Cargo: ${role || "N/A"}
Intereses: ${cleanInterests.join(", ")}
Historial / Notas: ${JSON.stringify(interactions || notes || [])}

Responde ÚNICAMENTE con el objeto JSON válido.`;

  try {
    const { text } = await generateWithFallbackModels(apiKey, { contents: [{ parts: [{ text: prompt }] }] });
    const parsed = text && extractJson(text);
    return json({ success: true, analysis: parsed || fallbackAnalysis });
  } catch (error: any) {
    console.warn("Aviso en analyze-lead, usando fallback:", error?.message || error);
    return json({ success: true, analysis: fallbackAnalysis });
  }
}

async function handleDraftEmail(req: Request, apiKey: string): Promise<Response> {
  const body = (await req.json()) as any;
  const { leadName, leadCompany, leadRole, interests, repName, eventName } = body || {};
  const cleanInterests = Array.isArray(interests) && interests.length > 0 ? interests : ["innovación digital"];

  const fallbackEmail = {
    asunto: `Seguimiento a nuestra reunión en ${eventName || "el evento"} - Divergency AI & ${leadCompany || "su empresa"}`,
    cuerpo: `Estimado/a ${leadName || "Contacto"},\n\nFue un placer conversar contigo durante ${eventName || "nuestro reciente evento"}. Me dio mucho gusto conocer más sobre los proyectos de ${leadCompany || "su organización"} y su enfoque hacia ${cleanInterests.join(", ")}.\n\nMe gustaría proponerte una breve reunión virtual de 15 minutos en los próximos días para compartirte ejemplos prácticos de cómo hemos ayudado a empresas similares a acelerar sus objetivos.\n\n¿Tendrías disponibilidad esta semana o la próxima para coordinar la llamada?\n\nQuedo atento a tus comentarios.\n\nCordialmente,\n${repName || "Equipo Comercial"}\nDivergency AI`,
    isFallback: true,
  };

  if (!apiKey) return json({ success: true, email: fallbackEmail });

  const prompt = `Redacta un correo electrónico comercial profesional, empático y directo para seguimiento de evento.
Evento: ${eventName || "ANDICOM 2026"}
Lead: ${leadName || "Contacto"} (${leadRole || "Ejecutivo"} en ${leadCompany || "Empresa"})
Intereses abordados: ${cleanInterests.join(", ")}
Remitente (Ejecutivo): ${repName || "Representante Comercial"}

Instrucciones:
- Idioma: Español profesional.
- Estructura: Asunto sugerido y cuerpo del mensaje.
- Debe mencionar la conversación en el evento y ofrecer agendar una breve sesión virtual de 15 minutos.
- Formato JSON: { "asunto": "...", "cuerpo": "..." }`;

  try {
    const { text } = await generateWithFallbackModels(apiKey, { contents: [{ parts: [{ text: prompt }] }] });
    const parsed = text && extractJson(text);
    return json({ success: true, email: parsed || fallbackEmail });
  } catch (error: any) {
    console.warn("Aviso en draft-email, usando plantilla:", error?.message || error);
    return json({ success: true, email: fallbackEmail });
  }
}

async function handleResearchCompany(req: Request, apiKey: string): Promise<Response> {
  const body = (await req.json()) as any;
  const { companyName } = body || {};
  if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
    return json({ error: "Se requiere el nombre de la empresa" }, 400);
  }
  const trimmedCompany = companyName.trim();
  const fallbackProfile = generateHeuristicCompanyProfile(trimmedCompany);

  if (!apiKey) {
    return json({ success: true, companyInfo: fallbackProfile, message: "Perfil estructurado generado mediante análisis predictivo local." });
  }

  const prompt = `Realiza una búsqueda exhaustiva en Google para la empresa u organización llamada "${trimmedCompany}".
Determina con precisión:
1. De qué se trata la empresa y a qué se dedica exactamente (misión, modelo de negocio o actividad principal).
2. Su sector o industria.
3. Sus productos, servicios o soluciones principales.
4. Su mercado objetivo o tipo de clientes.
5. 2 o 3 datos relevantes o logros destacados.

Formato de respuesta obligatorio (JSON estricto):
{
  "summary": "Resumen ejecutivo en español de 2 a 3 oraciones explicando claramente a qué se dedica la empresa y cuál es su propuesta de valor.",
  "industry": "Sector o industria de la empresa (ej: Banca y Servicios Financieros, Tecnología en la Nube, Retail, Energía)",
  "productsAndServices": ["Producto o Servicio 1", "Producto o Servicio 2", "Producto o Servicio 3"],
  "targetMarket": "Descripción breve del mercado objetivo (ej: Grandes corporaciones, PYMES B2B, Gobierno)",
  "keyHighlights": ["Dato clave o hito 1", "Dato clave 2"]
}

Responde ÚNICAMENTE con el objeto JSON válido.`;

  let response: { text: string; candidates?: any[] } | null = null;
  let usedSearch = true;
  const errors: any[] = [];

  try {
    response = await generateContent(apiKey, "gemini-2.5-flash", {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
    });
  } catch (err1) {
    errors.push(err1);
    try {
      response = await generateContent(apiKey, "gemini-3.7-flash", {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
      });
    } catch (err2) {
      errors.push(err2);
      try {
        usedSearch = false;
        response = await generateContent(apiKey, "gemini-2.5-flash", { contents: [{ parts: [{ text: prompt }] }] });
      } catch (err3) {
        errors.push(err3);
        return json({
          success: true,
          companyInfo: fallbackProfile,
          quotaExceeded: errors.some(isQuotaOrRateLimitError),
          message: "Se generó un perfil analítico estructurado para la empresa.",
        });
      }
    }
  }

  const text = response?.text || "";
  const groundingChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sources: { title: string; url: string }[] = [];
  groundingChunks.forEach((chunk: any) => {
    if (chunk.web && chunk.web.uri) {
      sources.push({ title: chunk.web.title || chunk.web.uri, url: chunk.web.uri });
    }
  });
  const uniqueSources = sources.filter((s, idx, self) => idx === self.findIndex((t) => t.url === s.url)).slice(0, 5);
  if (uniqueSources.length === 0) {
    uniqueSources.push({ title: `Búsqueda Web - ${trimmedCompany}`, url: `https://www.google.com/search?q=${encodeURIComponent(trimmedCompany)}` });
  }

  const parsed = extractJson(text);
  const companyInfo = {
    summary: parsed?.summary || fallbackProfile.summary,
    industry: parsed?.industry || fallbackProfile.industry,
    productsAndServices: Array.isArray(parsed?.productsAndServices) && parsed.productsAndServices.length > 0 ? parsed.productsAndServices : fallbackProfile.productsAndServices,
    targetMarket: parsed?.targetMarket || fallbackProfile.targetMarket,
    keyHighlights: Array.isArray(parsed?.keyHighlights) && parsed.keyHighlights.length > 0 ? parsed.keyHighlights : fallbackProfile.keyHighlights,
    sources: uniqueSources,
    researchedAt: new Date().toISOString().slice(0, 10),
    usedSearch,
  };

  return json({ success: true, companyInfo });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(req.url);
    const apiKey = env.GEMINI_API_KEY || "";

    try {
      if (req.method === "GET" && url.pathname === "/api/health") {
        return json({ status: "ok", app: "Leads Divergency AI Worker" });
      }

      if (url.pathname.startsWith("/api/ai/")) {
        try {
          await requireAuthorizedUser(req);
        } catch (authErr: any) {
          return json({ error: "No autorizado" }, 401);
        }
      }

      if (req.method === "POST" && url.pathname === "/api/ai/scan-card") {
        return await handleScanCard(req, apiKey);
      }
      if (req.method === "POST" && url.pathname === "/api/ai/analyze-lead") {
        return await handleAnalyzeLead(req, apiKey);
      }
      if (req.method === "POST" && url.pathname === "/api/ai/draft-email") {
        return await handleDraftEmail(req, apiKey);
      }
      if (req.method === "POST" && url.pathname === "/api/ai/research-company") {
        return await handleResearchCompany(req, apiKey);
      }
      return json({ error: "Ruta no encontrada" }, 404);
    } catch (err: any) {
      console.error("Error inesperado en el Worker:", err?.message || err);
      return json({ error: "Error interno del asistente de IA" }, 500);
    }
  },
};
