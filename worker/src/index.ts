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

// El Worker nunca debe inventar un lead, un análisis, un correo o un perfil de empresa para
// que la app parezca que la IA funcionó. Si Gemini no pudo responder, la respuesta es un error
// visible y el usuario completa los datos a mano.
function aiUnavailable(message: string): Response {
  return json({ error: message }, 500);
}

function geminiFailure(path: string, error: any): Response {
  const quota = isQuotaOrRateLimitError(error);
  console.warn(`Fallo de Gemini en ${path}:`, error?.message || error);
  return json(
    {
      error: quota
        ? "Se agotó la cuota de la IA. Intenta de nuevo más tarde."
        : "La IA no pudo completar la petición. Revisa los datos manualmente.",
      quotaExceeded: quota,
    },
    502,
  );
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

export async function handleScanCard(req: Request, apiKey: string): Promise<Response> {
  const { image } = (await req.json()) as any;
  if (!image) return json({ error: "Se requiere la imagen en base64" }, 400);
  if (!apiKey) return aiUnavailable("El asistente de IA no está configurado en este Worker.");

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
    if (!parsed) {
      console.warn("scan-card: Gemini no devolvió JSON legible");
      return json({ error: "La IA no pudo leer la tarjeta. Prueba con una foto más nítida o completa los datos a mano." }, 502);
    }
    return json({ success: true, data: parsed });
  } catch (error: any) {
    return geminiFailure("scan-card", error);
  }
}

export async function handleAnalyzeLead(req: Request, apiKey: string): Promise<Response> {
  const body = (await req.json()) as any;
  const { name, company, role, interests, interactions, notes } = body || {};
  const cleanInterests = Array.isArray(interests) && interests.length > 0 ? interests : ["Transformación Digital"];

  if (!apiKey) return aiUnavailable("El asistente de IA no está configurado en este Worker.");

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
    if (!parsed) {
      console.warn("analyze-lead: Gemini no devolvió JSON legible");
      return json({ error: "La IA no pudo generar el análisis. Intenta de nuevo." }, 502);
    }
    return json({ success: true, analysis: parsed });
  } catch (error: any) {
    return geminiFailure("analyze-lead", error);
  }
}

export async function handleDraftEmail(req: Request, apiKey: string): Promise<Response> {
  const body = (await req.json()) as any;
  const { leadName, leadCompany, leadRole, interests, repName, eventName } = body || {};
  const cleanInterests = Array.isArray(interests) && interests.length > 0 ? interests : ["innovación digital"];

  if (!apiKey) return aiUnavailable("El asistente de IA no está configurado en este Worker.");

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
    if (!parsed) {
      console.warn("draft-email: Gemini no devolvió JSON legible");
      return json({ error: "La IA no pudo redactar el correo. Intenta de nuevo." }, 502);
    }
    return json({ success: true, email: parsed });
  } catch (error: any) {
    return geminiFailure("draft-email", error);
  }
}

export async function handleResearchCompany(req: Request, apiKey: string): Promise<Response> {
  const body = (await req.json()) as any;
  const { companyName } = body || {};
  if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
    return json({ error: "Se requiere el nombre de la empresa" }, 400);
  }
  const trimmedCompany = companyName.trim();

  if (!apiKey) return aiUnavailable("El asistente de IA no está configurado en este Worker.");

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

  try {
    response = await generateContent(apiKey, "gemini-2.5-flash", {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
    });
  } catch {
    try {
      response = await generateContent(apiKey, "gemini-3.7-flash", {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
      });
    } catch {
      // Último reintento sin grounding: el modelo puede inventarse la empresa con el formato
      // JSON esperado, así que la respuesta viaja marcada con usedSearch:false y la app avisa.
      usedSearch = false;
      try {
        response = await generateContent(apiKey, "gemini-2.5-flash", { contents: [{ parts: [{ text: prompt }] }] });
      } catch (err3) {
        return geminiFailure("research-company", err3);
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

  const parsed = extractJson(text);
  if (!parsed?.summary) {
    console.warn("research-company: Gemini no devolvió un resumen utilizable para", trimmedCompany);
    return json({ error: "La IA no pudo investigar esta empresa. Intenta de nuevo o completa los datos a mano." }, 502);
  }

  const companyInfo = {
    summary: parsed.summary,
    industry: parsed.industry || "",
    productsAndServices: Array.isArray(parsed.productsAndServices) ? parsed.productsAndServices : [],
    targetMarket: parsed.targetMarket || "",
    keyHighlights: Array.isArray(parsed.keyHighlights) ? parsed.keyHighlights : [],
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
