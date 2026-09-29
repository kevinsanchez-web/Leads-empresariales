import {
  handleScanCard,
  handleAnalyzeLead,
  handleDraftEmail,
  handleResearchCompany,
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

function setGemini(plan: Plan) {
  (globalThis as any).fetch = async (_url: string, init: any) => {
    const body = JSON.parse(init?.body || "{}");
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
    check("research-company tercer intento responde usedSearch:false", res.status === 200 && cuerpo.companyInfo?.usedSearch === false, JSON.stringify(cuerpo).slice(0, 140));
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

  console.log(`\n== Worker: ${pass} ok, ${fail} fallas ==`);
  return fail;
}

run().then((f) => process.exit(f > 0 ? 1 : 0));
