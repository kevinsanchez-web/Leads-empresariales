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

// El grounding con Google Search cuesta $14/1.000 búsquedas en Gemini 3 y $35 en Gemini 2.5,
// así que el más reciente y barato va primero. Invertirlo es un ahorro directo de 2,5x, no
// una mejora de calidad.
const MODELS_TO_TRY = ["gemini-3.8-flash", "gemini-3.7-flash"];

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

  try {
    response = await generateContent(apiKey, MODELS_TO_TRY[0], {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
    });
  } catch {
    try {
      response = await generateContent(apiKey, MODELS_TO_TRY[1], {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
      });
    } catch (err2) {
      // No hay tercer intento sin grounding a propósito: un modelo sin búsqueda inventa la
      // empresa con el formato JSON esperado y devuelve success:true, así que el perfil falso
      // se persistía en lead.companyInfo. Si Google Search falla, la respuesta es un error
      // visible y el comercial completa los datos a mano.
      return geminiFailure("research-company", err2);
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
    usedSearch: true,
  };

  return json({ success: true, companyInfo });
}

type EnrichFieldKey = "linkedinUrl" | "email" | "companyPhone";

const ENRICH_FIELD_KEYS: EnrichFieldKey[] = ["linkedinUrl", "email", "companyPhone"];

interface EnrichFieldSpec {
  // Cómo buscar el dato. El modelo arma las queries del grounding a partir de estas líneas, así
  // que sin un objetivo explícito de LinkedIn nunca genera una búsqueda de LinkedIn.
  hint: string;
  description: string;
  sourceHint: string;
  rules: string[];
  // El correo exige una cita literal de la página exacta; LinkedIn y el teléfono admiten una
  // cita del mismo dominio y quedan marcados como "unverified".
  requireExactSource: boolean;
  // El valor tiene que tener forma del campo, no cualquier enlace.
  valuePattern?: RegExp;
}

const ENRICH_FIELD_SPECS: Record<EnrichFieldKey, EnrichFieldSpec> = {
  linkedinUrl: {
    hint: 'Perfil de LinkedIn de la persona: busca "site:linkedin.com/in <nombre> <empresa>" y también "<nombre>" "<empresa>" LinkedIn.',
    description: "URL del perfil público de LinkedIn de la persona, o vacío",
    sourceHint: "URL de la página donde apareció el perfil",
    rules: [
      "El perfil de LinkedIn solo sirve si la persona y la empresa coinciden; si hay homónimos, devuélvelo vacío.",
    ],
    requireExactSource: false,
    valuePattern: /linkedin\.com\//i,
  },
  email: {
    hint: 'Correo corporativo: busca "<empresa> contacto correo" y revisa las páginas oficiales de contacto.',
    description: "Correo corporativo publicado en un canal oficial de la empresa, o vacío",
    sourceHint: "URL exacta donde ese correo aparece escrito",
    rules: [
      "Un correo solo vale si aparece escrito literalmente en la fuente. No lo deduzcas del dominio, del nombre ni del patrón nombre.apellido.",
    ],
    requireExactSource: true,
  },
  companyPhone: {
    hint: 'Teléfono de la empresa: busca "<empresa> contacto teléfono" y "<empresa> sedes directorio".',
    description: "Teléfono central de la empresa, o vacío",
    sourceHint: "URL donde ese teléfono aparece escrito",
    rules: [
      "El teléfono debe ser el central de la empresa, nunca el celular personal ni un WhatsApp de un empleado.",
    ],
    requireExactSource: false,
  },
};

// Whitelist del parámetro `fields` que llega del cliente. Si no viene o no trae nada válido, se
// buscan los tres campos, que es el comportamiento previo a los prompts condicionales.
function normalizeEnrichFields(raw: unknown): EnrichFieldKey[] {
  if (!Array.isArray(raw)) return [...ENRICH_FIELD_KEYS];
  const requested = raw.filter((f): f is EnrichFieldKey =>
    ENRICH_FIELD_KEYS.includes(f as EnrichFieldKey)
  );
  return requested.length > 0 ? Array.from(new Set(requested)) : [...ENRICH_FIELD_KEYS];
}

// Un solo constructor parametrizado por la lista de campos: las 7 combinaciones posibles salen
// de aquí, sin siete prompts separados que se desincronicen entre sí.
function buildEnrichPrompt(
  ctx: { leadName: string; role: string; companyName: string; city: string },
  fields: EnrichFieldKey[]
): string {
  const hints = fields.map((f) => `- ${ENRICH_FIELD_SPECS[f].hint}`).join("\n");
  const rules = fields
    .flatMap((f) => ENRICH_FIELD_SPECS[f].rules)
    .map((r) => `- ${r}`)
    .join("\n");
  const schema = fields
    .map(
      (f) =>
        `  "${f}": { "value": "${ENRICH_FIELD_SPECS[f].description}", "source": "${ENRICH_FIELD_SPECS[f].sourceHint}" }`
    )
    .join(",\n");

  return `Busca en Google información pública y verificable sobre esta persona y su empresa.
Persona: ${ctx.leadName || "(no informada)"}
Cargo registrado: ${ctx.role || "(no informado)"}
Empresa: ${ctx.companyName}
Ciudad: ${ctx.city || "(no informada)"}

Busca únicamente estos datos, e ignora cualquier otro:
${hints}

Para cada dato responde con el valor y la URL exacta de la fuente donde aparece escrito. Si no
lo encuentras, responde value y source como cadena vacía. No deduzcas, no completes con
suposiciones y no inventes URLs.

Formato de respuesta obligatorio (JSON estricto):
{
${schema}
}

Reglas:
${rules}
Responde ÚNICAMENTE con el objeto JSON válido.`;
}

// Enriquece un lead con datos de su empresa y su perfil público. No hay caché en el Worker a
// propósito: no tiene credenciales de Firestore y añadir un service account sería meter
// infraestructura nueva. El endpoint es stateless y la caché vive en el cliente, que ya
// tiene el SDK de Firestore y las reglas permiten cualquier colección.
export async function handleEnrichLead(req: Request, apiKey: string): Promise<Response> {
  const body = (await req.json()) as any;
  const { leadName, companyName, role, city } = body || {};
  if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
    return json({ error: "Se requiere el nombre de la empresa" }, 400);
  }
  const trimmedCompany = companyName.trim();
  const trimmedName = typeof leadName === "string" ? leadName.trim() : "";
  const trimmedRole = typeof role === "string" ? role.trim() : "";
  const trimmedCity = typeof city === "string" ? city.trim() : "";

  if (!apiKey) return aiUnavailable("El asistente de IA no está configurado en este Worker.");

  // El cliente pide solo los campos que le faltan a este lead, y el prompt se arma con esos.
  const requestedFields = normalizeEnrichFields(body?.fields);
  const prompt = buildEnrichPrompt(
    { leadName: trimmedName, role: trimmedRole, companyName: trimmedCompany, city: trimmedCity },
    requestedFields
  );

  let response: { text: string; candidates?: any[] } | null = null;

  try {
    response = await generateContent(apiKey, MODELS_TO_TRY[0], {
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }],
    });
  } catch {
    try {
      response = await generateContent(apiKey, MODELS_TO_TRY[1], {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
      });
    } catch (err2) {
      // Sin tercer intento sin grounding: un modelo sin búsqueda devuelve una URL de LinkedIn
      // y un correo con forma de reales, que es exactamente el dato falso que este gate existe
      // para impedir. Sin búsqueda la respuesta correcta es un error visible.
      return geminiFailure("enrich-lead", err2);
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
  const uniqueSources = sources
    .filter((s, idx, self) => idx === self.findIndex((t) => t.url === s.url))
    .slice(0, 5);

  const parsed = extractJson(text);
  if (!parsed || typeof parsed !== "object") {
    console.warn("enrich-lead: Gemini no devolvió JSON legible para", trimmedCompany);
    return json({ error: "La IA no pudo leer los datos del lead. Intenta de nuevo o complétalos a mano." }, 502);
  }

  // Gate de anti-alucinación con dos niveles de evidencia. Un campo solo se acepta si el modelo
  // declaró una fuente y esa fuente está entre las citas reales que devolvió el grounding.
  // - El correo exige la cita exacta de la página: un correo equivocado manda un mensaje real a
  //   un desconocido, así que no admite tolerancia de dominio.
  // - LinkedIn y el teléfono central admiten una cita del mismo dominio y quedan como
  //   "unverified", que la UI muestra como dato aparente a revisar.
  const exactCited = new Set(uniqueSources.map((s) => normalizeSourceUrl(s.url)));
  const citedHosts = new Set(
    uniqueSources.map((s) => normalizeSourceUrl(s.url).split("/")[0]).filter(Boolean)
  );

  const accepted: Record<string, string> = {};
  const confidence: Record<string, "cited" | "unverified"> = {};
  const rejected: string[] = [];

  for (const field of requestedFields) {
    const spec = ENRICH_FIELD_SPECS[field];
    const raw = parsed[field];
    const value = typeof raw?.value === "string" ? raw.value.trim() : "";
    const source = typeof raw?.source === "string" ? raw.source.trim() : "";

    if (!value) {
      rejected.push(`${field}: no se encontró`);
      continue;
    }
    if (!source) {
      rejected.push(`${field}: sin fuente`);
      continue;
    }
    if (spec.valuePattern && !spec.valuePattern.test(value)) {
      rejected.push(`${field}: el valor no tiene el formato esperado`);
      continue;
    }

    const normalizedSource = normalizeSourceUrl(source);
    const sourceHost = normalizedSource.split("/")[0];
    const isExact = exactCited.has(normalizedSource);
    const isSameHost = !!sourceHost && citedHosts.has(sourceHost);

    if (spec.requireExactSource && !isExact) {
      rejected.push(`${field}: la fuente declarada no está entre las citas exactas de Google`);
      continue;
    }
    if (!isExact && !isSameHost) {
      rejected.push(`${field}: la fuente declarada no está entre las citas de Google`);
      continue;
    }

    accepted[field] = value;
    confidence[field] = isExact ? "cited" : "unverified";
  }

  const found = Object.keys(accepted).length;
  return json({
    success: true,
    enrichment: {
      ...accepted,
      confidence,
      status: found === 0 ? "not_found" : found < requestedFields.length ? "partial" : "ok",
      usedSearch: true,
      sources: uniqueSources,
      model: MODELS_TO_TRY[0],
      enrichedAt: new Date().toISOString(),
      reason: rejected.length ? rejected.join(". ") : undefined,
    },
  });
}

// Subdominios que no identifican una página distinta. Sin colapsarlos, "es.linkedin.com/in/x"
// y "www.linkedin.com/in/x" se verían como fuentes diferentes.
const DROPPABLE_SUBDOMAINS = ["www", "es", "m", "mobile"];

function normalizeHost(host: string): string {
  const parts = host.split(".");
  while (parts.length > 2 && DROPPABLE_SUBDOMAINS.includes(parts[0])) parts.shift();
  return parts.join(".");
}

// Compara fuentes ignorando el esquema, los parámetros de seguimiento, la barra final y los
// subdominios que no cambian de página, porque la URL que declara el modelo y la que devuelve
// el grounding se escriben casi igual pero no idénticamente. Devuelve "host/path".
function normalizeSourceUrl(url: string): string {
  const withoutScheme = url
    .trim()
    .replace(/^https?:\/\//, "")
    .split(/[?#]/)[0]
    .replace(/\/$/, "")
    .toLowerCase();

  const slash = withoutScheme.indexOf("/");
  const host = slash === -1 ? withoutScheme : withoutScheme.slice(0, slash);
  const path = slash === -1 ? "" : withoutScheme.slice(slash);
  return `${normalizeHost(host)}${path}`;
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
      if (req.method === "POST" && url.pathname === "/api/ai/enrich-lead") {
        return await handleEnrichLead(req, apiKey);
      }
      return json({ error: "Ruta no encontrada" }, 404);
    } catch (err: any) {
      console.error("Error inesperado en el Worker:", err?.message || err);
      return json({ error: "Error interno del asistente de IA" }, 500);
    }
  },
};
