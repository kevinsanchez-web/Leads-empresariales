import {
  handleScanCard,
  handleAnalyzeLead,
  handleDraftEmail,
  handleResearchCompany,
  handleEnrichLead,
} from "../worker/src/index";

const DATO_INVENTADO = [
  "Contacto Escaneado",
  "Empresa Detectada",
  "Contacto Extraído",
  "Empresa Asistente",
  "Contacto Tarjeta",
  "Empresa Participante",
  "Tecnología y Servicios Empresariales",
  "Extractor de respaldo",
  "análisis predictivo",
  "Procesado con extractor",
  "procesamiento resiliente",
];

let pass = 0;
let fail = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    pass++;
    console.log(`  ok   ${name}`);
  } else {
    fail++;
    console.log(`  FALLA ${name}${detail ? ` -> ${detail}` : ""}`);
  }
}

function assertSinInvenciones(nombre: string, texto: string) {
  const found = DATO_INVENTADO.filter((m) => texto.includes(m));
  check(`${nombre}: sin datos inventados`, found.length === 0, `encontrado: ${found.join(", ")}`);
}

function assertNoEsExito(nombre: string, res: Response, cuerpo: any) {
  check(`${nombre}: no responde success:true`, cuerpo?.success !== true, JSON.stringify(cuerpo).slice(0, 160));
  check(`${nombre}: status de error`, res.status >= 400, String(res.status));
  check(`${nombre}: trae mensaje legible`, typeof cuerpo?.error === "string" && cuerpo.error.length > 5, cuerpo?.error);
  assertSinInvenciones(nombre, JSON.stringify(cuerpo));
}

type Plan =
  | { kind: "texto"; text: string; grounding?: any[] }
  | { kind: "error"; status: number; message: string }
  | { kind: "soloSinSearch"; text: string };

let lastGeminiBody: any = null;
function setGemini(plan: Plan) {
  (globalThis as any).fetch = async (_url: string, init: any) => {
    const body = JSON.parse(init?.body || "{}");
    lastGeminiBody = body;
    const conBusqueda = Array.isArray(body.tools) && body.tools.length > 0;

    if (plan.kind === "soloSinSearch" && conBusqueda) {
      return new Response(JSON.stringify({ error: { message: "sin grounding" } }), { status: 500 });
    }
    if (plan.kind === "error") {
      return new Response(JSON.stringify({ error: { message: plan.message } }), { status: plan.status });
    }
    if (plan.kind === "soloSinSearch") {
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: plan.text }] } }] }),
        { status: 200 },
      );
    }

    const candidate: any = { content: { parts: [{ text: plan.text }] } };
    if (plan.grounding) candidate.groundingMetadata = { groundingChunks: plan.grounding };
    return new Response(JSON.stringify({ candidates: [candidate] }), { status: 200 });
  };
}

function req(body: unknown) {
  return new Request("https://worker.example/api/ai/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const TARJETA_OK = JSON.stringify({ name: "Laura Martínez", company: "Ecopetrol", role: "Directora", email: "l@eco.co", phone: "300", city: "Bogotá", interests: ["IA"], notes: "" });
const ANALISIS_OK = JSON.stringify({ resumenEstrategico: "r", oportunidadClave: "o", siguienteAccion: "s", nivelPrioridad: "Media" });
const EMAIL_OK = JSON.stringify({ asunto: "a", cuerpo: "c" });
const EMPRESA_OK = JSON.stringify({ summary: "Ecopetrol explota petróleo.", industry: "Energía", productsAndServices: ["x"], targetMarket: "y", keyHighlights: ["z"] });
const GROUNDING = [{ web: { uri: "https://ecopetrol.com/sobre-nosotros", title: "Ecopetrol" } }];

// Cada campo trae su valor y la fuente donde dice estar escrito. Un valor sin cita es dato
// inventado por definición, y eso es lo que el gate debe descartar.
const ENRIQUECIDO_OK = JSON.stringify({
  linkedinUrl: { value: "https://www.linkedin.com/in/laura-martinez", source: "https://www.linkedin.com/in/laura-martinez" },
  email: { value: "contacto@ecopetrol.com", source: "https://ecopetrol.com/contacto" },
  companyPhone: { value: "+57 601 2345678", source: "https://ecopetrol.com/contacto" },
  currentTitle: { value: "Directora de Transformación Digital", source: "https://www.linkedin.com/in/laura-martinez" },
});

const ENRIQUECIMIENTO_DEDUCIDO = JSON.stringify({
  // Sin ninguna cita: el patrón clásico de un correo deducido del dominio y del nombre.
  linkedinUrl: { value: "https://www.linkedin.com/in/inventado-999", source: "" },
  email: { value: "laura.martinez@ecopetrol.com", source: "" },
  companyPhone: { value: "", source: "" },
  currentTitle: { value: "Directora", source: "" },
});

const ENRIQUECIMIENTO_FUENTE_Falsa = JSON.stringify({
  // Cita una URL que el grounding no devolvió: el dato parece bueno pero nadie lo respalda.
  linkedinUrl: { value: "https://www.linkedin.com/in/otra-persona", source: "https://sitio-falso.example/perfil" },
  email: { value: "info@ecopetrol.com", source: "https://sitio-falso.example/contacto" },
  companyPhone: { value: "+57 601 0000000", source: "https://sitio-falso.example" },
  currentTitle: { value: "CEO", source: "https://sitio-falso.example" },
});

async function run() {
  console.log("\n== Worker: sin GEMINI_API_KEY configurada ==");
  for (const [nombre, fn, body] of [
    ["scan-card", handleScanCard, { image: "data:image/jpeg;base64,AAA" }],
    ["analyze-lead", handleAnalyzeLead, { name: "Laura" }],
    ["draft-email", handleDraftEmail, { leadName: "Laura" }],
    ["research-company", handleResearchCompany, { companyName: "Ecopetrol" }],
  ] as const) {
    const res = await fn(req(body), "");
    const cuerpo = await res.json();
    assertNoEsExito(`${nombre} sin key`, res, cuerpo);
  }

  console.log("\n== scan-card ==");
  {
    setGemini({ kind: "texto", text: "esto no es json" });
    const res = await handleScanCard(req({ image: "data:image/jpeg;base64,AAA" }), "key");
    assertNoEsExito("scan-card JSON ilegible", res, await res.json());
  }
  {
    setGemini({ kind: "error", status: 429, message: "Quota exceeded" });
    const res = await handleScanCard(req({ image: "data:image/jpeg;base64,AAA" }), "key");
    const cuerpo = await res.json();
    assertNoEsExito("scan-card cuota agotada", res, cuerpo);
    check("scan-card marca quotaExceeded", cuerpo.quotaExceeded === true, JSON.stringify(cuerpo));
  }
  {
    setGemini({ kind: "error", status: 500, message: "boom" });
    const res = await handleScanCard(req({ image: "data:image/jpeg;base64,AAA" }), "key");
    assertNoEsExito("scan-card excepción de Gemini", res, await res.json());
  }
  {
    setGemini({ kind: "texto", text: TARJETA_OK });
    const res = await handleScanCard(req({ image: "data:image/jpeg;base64,AAA" }), "key");
    const cuerpo = await res.json();
    check("scan-card devuelve lo que leyó", res.status === 200 && cuerpo.data?.name === "Laura Martínez", JSON.stringify(cuerpo).slice(0, 120));
    check("scan-card no marca isFallback", cuerpo.data?.isFallback === undefined);
  }
  {
    const res = await handleScanCard(req({}), "key");
    check("scan-card sin imagen da 400", res.status === 400, String(res.status));
  }

  console.log("\n== analyze-lead ==");
  {
    setGemini({ kind: "texto", text: "nada json" });
    const r1 = await handleAnalyzeLead(req({ name: "Laura" }), "key");
    assertNoEsExito("analyze-lead ilegible", r1, await r1.json());
  }
  {
    setGemini({ kind: "error", status: 500, message: "boom" });
    const res = await handleAnalyzeLead(req({ name: "Laura" }), "key");
    assertNoEsExito("analyze-lead excepción", res, await res.json());
  }
  {
    setGemini({ kind: "texto", text: ANALISIS_OK });
    const res = await handleAnalyzeLead(req({ name: "Laura" }), "key");
    const cuerpo = await res.json();
    check("analyze-lead devuelve el análisis real", res.status === 200 && cuerpo.analysis?.nivelPrioridad === "Media", JSON.stringify(cuerpo).slice(0, 120));
  }

  console.log("\n== draft-email ==");
  {
    setGemini({ kind: "texto", text: "nada json" });
    const r1 = await handleDraftEmail(req({ leadName: "Laura" }), "key");
    assertNoEsExito("draft-email ilegible", r1, await r1.json());
  }
  {
    setGemini({ kind: "error", status: 503, message: "boom" });
    const r1 = await handleDraftEmail(req({ leadName: "Laura" }), "key");
    assertNoEsExito("draft-email excepción", r1, await r1.json());
  }
  {
    setGemini({ kind: "texto", text: EMAIL_OK });
    const res = await handleDraftEmail(req({ leadName: "Laura" }), "key");
    const cuerpo = await res.json();
    check("draft-email devuelve el correo real", res.status === 200 && cuerpo.email?.asunto === "a", JSON.stringify(cuerpo).slice(0, 120));
  }

  console.log("\n== research-company (la que persistía datos falsos) ==");
  {
    setGemini({ kind: "error", status: 500, message: "boom" });
    const res = await handleResearchCompany(req({ companyName: "Ecopetrol" }), "key");
    const cuerpo = await res.json();
    assertNoEsExito("research-company los 3 intentos fallan", res, cuerpo);
    check("research-company NO devuelve companyInfo", cuerpo.companyInfo === undefined, JSON.stringify(cuerpo).slice(0, 120));
  }
  {
    setGemini({ kind: "texto", text: EMPRESA_OK, grounding: GROUNDING });
    const res = await handleResearchCompany(req({ companyName: "Ecopetrol" }), "key");
    const cuerpo = await res.json();
    check("research-company con grounding funciona", res.status === 200 && cuerpo.companyInfo?.industry === "Energía");
    check("research-company usa las fuentes reales", cuerpo.companyInfo?.sources?.[0]?.url === "https://ecopetrol.com/sobre-nosotros", JSON.stringify(cuerpo.companyInfo?.sources));
    check("research-company no inventa url de Google", !JSON.stringify(cuerpo).includes("google.com/search"));
    check("research-company marca usedSearch", cuerpo.companyInfo?.usedSearch === true);
  }
  {
    setGemini({ kind: "texto", text: EMPRESA_OK, grounding: [] });
    const res = await handleResearchCompany(req({ companyName: "Constructora XYZ 3000" }), "key");
    const cuerpo = await res.json();
    check("research-company sin grounding: sources vacío", JSON.stringify(cuerpo.companyInfo?.sources) === "[]", JSON.stringify(cuerpo.companyInfo?.sources));
    check("research-company sin grounding: no mete url de Google", !JSON.stringify(cuerpo).includes("google.com/search"));
    check("research-company sin grounding: no rellena el sector heurístico", !DATO_INVENTADO.some((m) => JSON.stringify(cuerpo).includes(m)));
  }
  {
    setGemini({ kind: "soloSinSearch", text: EMPRESA_OK });
    const res = await handleResearchCompany(req({ companyName: "Constructora XYZ 3000" }), "key");
    const cuerpo = await res.json();
    assertNoEsExito("research-company sin grounding disponible", res, cuerpo);
    check("research-company sin grounding NO devuelve companyInfo", cuerpo.companyInfo === undefined, JSON.stringify(cuerpo).slice(0, 120));
  }
  {
    setGemini({ kind: "texto", text: "respuesta sin summary" });
    const res = await handleResearchCompany(req({ companyName: "Ecopetrol" }), "key");
    const cuerpo = await res.json();
    assertNoEsExito("research-company sin summary", res, cuerpo);
  }
  {
    setGemini({ kind: "texto", text: EMPRESA_OK, grounding: GROUNDING });
    const res = await handleResearchCompany(req({}), "key");
    check("research-company sin nombre da 400", res.status === 400, String(res.status));
  }

  console.log("\n== enrich-lead (el gate de citas anti-alucinación) ==");
  {
    setGemini({ kind: "texto", text: ENRIQUECIDO_OK, grounding: [
      { web: { uri: "https://www.linkedin.com/in/laura-martinez", title: "Laura" } },
      { web: { uri: "https://ecopetrol.com/contacto", title: "Contacto" } },
    ] });
    const res = await handleEnrichLead(req({ leadName: "Laura", companyName: "Ecopetrol" }), "key");
    const cuerpo = await res.json();
    check("enrich-lead con grounding responde 200", res.status === 200 && cuerpo.success === true, JSON.stringify(cuerpo).slice(0, 140));
    check("enrich-lead entrega la URL de LinkedIn citada", cuerpo.enrichment?.linkedinUrl === "https://www.linkedin.com/in/laura-martinez", JSON.stringify(cuerpo.enrichment?.linkedinUrl));
    check("enrich-lead entrega el teléfono central", cuerpo.enrichment?.companyPhone === "+57 601 2345678", JSON.stringify(cuerpo.enrichment?.companyPhone));
    check("enrich-lead marca status ok", cuerpo.enrichment?.status === "ok", JSON.stringify(cuerpo.enrichment?.status));
    check("enrich-lead expone las fuentes", Array.isArray(cuerpo.enrichment?.sources) && cuerpo.enrichment.sources.length === 2, JSON.stringify(cuerpo.enrichment?.sources));
    check("enrich-lead no inventa url de Google", !JSON.stringify(cuerpo).includes("google.com/search"));
  }
  {
    setGemini({ kind: "texto", text: ENRIQUECIMIENTO_DEDUCIDO, grounding: GROUNDING });
    const res = await handleEnrichLead(req({ leadName: "Laura", companyName: "Ecopetrol" }), "key");
    const cuerpo = await res.json();
    check("enrich-lead descarta el email deducido", cuerpo.enrichment?.email === undefined, JSON.stringify(cuerpo.enrichment?.email));
    check("enrich-lead descarta la URL sin cita", cuerpo.enrichment?.linkedinUrl === undefined, JSON.stringify(cuerpo.enrichment?.linkedinUrl));
    check("enrich-lead con todo descartado queda not_found", cuerpo.enrichment?.status === "not_found", JSON.stringify(cuerpo.enrichment?.status));
    check("enrich-lead explica por qué descartó", typeof cuerpo.enrichment?.reason === "string" && cuerpo.enrichment.reason.includes("linkedinUrl"), JSON.stringify(cuerpo.enrichment?.reason));
    check("enrich-lead no filtra el email deducido al cliente", !JSON.stringify(cuerpo).includes("laura.martinez@ecopetrol.com"), JSON.stringify(cuerpo).slice(0, 160));
  }
  {
    setGemini({ kind: "texto", text: ENRIQUECIMIENTO_FUENTE_Falsa, grounding: GROUNDING });
    const res = await handleEnrichLead(req({ leadName: "Laura", companyName: "Ecopetrol" }), "key");
    const cuerpo = await res.json();
    check("enrich-lead descarta la fuente que el grounding no devolvió", cuerpo.enrichment?.status === "not_found", JSON.stringify(cuerpo.enrichment?.status));
    check("enrich-lead no filtra datos de la fuente falsa", !JSON.stringify(cuerpo).includes("otra-persona"), JSON.stringify(cuerpo).slice(0, 160));
  }
  {
    setGemini({ kind: "texto", text: ENRIQUECIDO_OK, grounding: [
      { web: { uri: "https://www.linkedin.com/in/laura-martinez?utm_source=google", title: "Laura" } },
      { web: { uri: "https://ecopetrol.com/contacto/", title: "Contacto" } },
    ] });
    const res = await handleEnrichLead(req({ companyName: "Ecopetrol" }), "key");
    const cuerpo = await res.json();
    check("enrich-lead acepta una cita con utm y barra final", cuerpo.enrichment?.linkedinUrl === "https://www.linkedin.com/in/laura-martinez", JSON.stringify(cuerpo.enrichment?.status));
    check("enrich-lead acepta la segunda fuente también", cuerpo.enrichment?.email === "contacto@ecopetrol.com", JSON.stringify(cuerpo.enrichment?.email));
  }
  {
    setGemini({ kind: "soloSinSearch", text: ENRIQUECIDO_OK });
    const res = await handleEnrichLead(req({ leadName: "Laura", companyName: "Ecopetrol" }), "key");
    const cuerpo = await res.json();
    assertNoEsExito("enrich-lead sin grounding", res, cuerpo);
    check("enrich-lead sin grounding NO devuelve enrichment", cuerpo.enrichment === undefined, JSON.stringify(cuerpo).slice(0, 120));
    check("enrich-lead sin grounding no filtra la URL inventada", !JSON.stringify(cuerpo).includes("laura-martinez"), JSON.stringify(cuerpo).slice(0, 160));
  }
  {
    setGemini({ kind: "error", status: 500, message: "boom" });
    const res = await handleEnrichLead(req({ companyName: "Ecopetrol" }), "key");
    const cuerpo = await res.json();
    assertNoEsExito("enrich-lead todos los intentos fallan", res, cuerpo);
  }
  {
    setGemini({ kind: "texto", text: ENRIQUECIDO_OK, grounding: GROUNDING });
    const res = await handleEnrichLead(req({}), "key");
    check("enrich-lead sin empresa da 400", res.status === 400, String(res.status));
  }
  {
    setGemini({ kind: "texto", text: "esto no es json", grounding: GROUNDING });
    const res = await handleEnrichLead(req({ companyName: "Ecopetrol" }), "key");
    const cuerpo = await res.json();
    assertNoEsExito("enrich-lead sin JSON legible", res, cuerpo);
  }

  console.log("\n== enrich-lead: prompts condicionales ==");
  {
    // El modelo devuelve de más, incluido un campo que el cliente no pidió. El prompt debe pedir
    // solo LinkedIn, y el email devuelto se descarta aunque venga con una cita real.
    setGemini({ kind: "texto", text: JSON.stringify({
      linkedinUrl: { value: "https://www.linkedin.com/in/laura-martinez", source: "https://www.linkedin.com/in/laura-martinez" },
      email: { value: "colado@ecopetrol.com", source: "https://ecopetrol.com/contacto" },
    }), grounding: [
      { web: { uri: "https://www.linkedin.com/in/laura-martinez", title: "Laura" } },
      { web: { uri: "https://ecopetrol.com/contacto", title: "Contacto" } },
    ] });
    const res = await handleEnrichLead(req({ leadName: "Laura", companyName: "Ecopetrol", city: "Bogotá", fields: ["linkedinUrl"] }), "key");
    const cuerpo = await res.json();
    check("enrich-lead condicional: devuelve solo lo pedido", cuerpo.enrichment?.linkedinUrl === "https://www.linkedin.com/in/laura-martinez", JSON.stringify(cuerpo.enrichment));
    check("enrich-lead condicional: descarta el campo no pedido", cuerpo.enrichment?.email === undefined, JSON.stringify(cuerpo.enrichment?.email));
    check("enrich-lead condicional: status ok con un solo campo", cuerpo.enrichment?.status === "ok", JSON.stringify(cuerpo.enrichment?.status));
    const promptTexto = lastGeminiBody?.contents?.[0]?.parts?.[0]?.text || "";
    check("enrich-lead condicional: el prompt pide LinkedIn explícitamente", /linkedin\.com\/in/i.test(promptTexto), promptTexto.slice(0, 120));
    check("enrich-lead condicional: el prompt lleva la ciudad", promptTexto.includes("Bogotá"));
    check("enrich-lead condicional: el prompt no pide el teléfono", !promptTexto.includes("companyPhone"));
  }
  {
    // Sin `fields`, se piden los tres: comportamiento previo a los prompts condicionales.
    setGemini({ kind: "texto", text: ENRIQUECIDO_OK, grounding: GROUNDING });
    await handleEnrichLead(req({ leadName: "Laura", companyName: "Ecopetrol" }), "key");
    const promptTexto = lastGeminiBody?.contents?.[0]?.parts?.[0]?.text || "";
    check("enrich-lead sin fields: pide los tres campos", promptTexto.includes("linkedinUrl") && promptTexto.includes("email") && promptTexto.includes("companyPhone"), promptTexto.slice(0, 120));
  }

  console.log("\n== enrich-lead: gate de dos niveles ==");
  {
    // Homónimo/otra página del mismo dominio: LinkedIn se acepta como "unverified"; el correo,
    // que es del mismo dominio pero no de la página exacta, se descarta.
    setGemini({ kind: "texto", text: JSON.stringify({
      linkedinUrl: { value: "https://www.linkedin.com/in/laura-martinez", source: "https://es.linkedin.com/empresa/ecopetrol" },
      email: { value: "contacto@ecopetrol.com", source: "https://ecopetrol.com/otra-pagina" },
    }), grounding: [
      { web: { uri: "https://www.linkedin.com/in/laura-martinez", title: "Laura" } },
      { web: { uri: "https://ecopetrol.com/contacto", title: "Contacto" } },
    ] });
    const res = await handleEnrichLead(req({ leadName: "Laura", companyName: "Ecopetrol", fields: ["linkedinUrl", "email"] }), "key");
    const cuerpo = await res.json();
    check("gate dos niveles: LinkedIn con cita de host se acepta", cuerpo.enrichment?.linkedinUrl === "https://www.linkedin.com/in/laura-martinez", JSON.stringify(cuerpo.enrichment));
    check("gate dos niveles: LinkedIn queda como unverified", cuerpo.enrichment?.confidence?.linkedinUrl === "unverified", JSON.stringify(cuerpo.enrichment?.confidence));
    check("gate dos niveles: el correo sin cita exacta se descarta", cuerpo.enrichment?.email === undefined, JSON.stringify(cuerpo.enrichment?.email));
    check("gate dos niveles: status partial", cuerpo.enrichment?.status === "partial", JSON.stringify(cuerpo.enrichment?.status));
  }
  {
    // Un valor que no es de LinkedIn no pasa aunque la cita sea del dominio de LinkedIn.
    setGemini({ kind: "texto", text: JSON.stringify({
      linkedinUrl: { value: "https://facebook.com/laura", source: "https://www.linkedin.com/in/laura-martinez" },
    }), grounding: [{ web: { uri: "https://www.linkedin.com/in/laura-martinez", title: "Laura" } }] });
    const res = await handleEnrichLead(req({ leadName: "Laura", companyName: "Ecopetrol", fields: ["linkedinUrl"] }), "key");
    const cuerpo = await res.json();
    check("gate dos niveles: valor que no es LinkedIn se descarta", cuerpo.enrichment?.linkedinUrl === undefined, JSON.stringify(cuerpo.enrichment));
  }
  {
    // Cita exacta: el campo queda como "cited", no "unverified".
    setGemini({ kind: "texto", text: ENRIQUECIDO_OK, grounding: [
      { web: { uri: "https://www.linkedin.com/in/laura-martinez", title: "Laura" } },
      { web: { uri: "https://ecopetrol.com/contacto", title: "Contacto" } },
    ] });
    const res = await handleEnrichLead(req({ leadName: "Laura", companyName: "Ecopetrol", fields: ["linkedinUrl"] }), "key");
    const cuerpo = await res.json();
    check("gate dos niveles: cita exacta queda como cited", cuerpo.enrichment?.confidence?.linkedinUrl === "cited", JSON.stringify(cuerpo.enrichment?.confidence));
  }
  {
    // Un campo que no está en la whitelist no se le pide a la IA ni se filtra al cliente.
    setGemini({ kind: "texto", text: JSON.stringify({
      hackingField: { value: "x", source: "https://www.linkedin.com/in/laura-martinez" },
      linkedinUrl: { value: "https://www.linkedin.com/in/laura-martinez", source: "https://www.linkedin.com/in/laura-martinez" },
    }), grounding: [{ web: { uri: "https://www.linkedin.com/in/laura-martinez", title: "Laura" } }] });
    const res = await handleEnrichLead(req({ leadName: "Laura", companyName: "Ecopetrol", fields: ["hackingField"] }), "key");
    const cuerpo = await res.json();
    check("whitelist: campo desconocido no se filtra", !JSON.stringify(cuerpo.enrichment).includes("hackingField"), JSON.stringify(cuerpo.enrichment));
    check("whitelist: cae al default de tres campos", cuerpo.enrichment?.linkedinUrl === "https://www.linkedin.com/in/laura-martinez", JSON.stringify(cuerpo.enrichment));
  }

  console.log(`\n== Worker: ${pass} ok, ${fail} fallas ==`);
  return fail;
}

run().then((f) => process.exit(f > 0 ? 1 : 0));
