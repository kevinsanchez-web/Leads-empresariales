import { aiRequest, isAiFailure, AiFailure, AI_FALLBACK_REJECTED, AI_SIMULATED_DISABLED } from "../src/services/aiTransport";
import { devCompanyProfile, devScannedCard } from "../src/services/aiDevSamples";

const WORKER = "https://worker.example";
const token = async () => "token-falso";
const devSample = () => ({ data: { name: "Contacto Escaneado", company: "Empresa Detectada" } });

// Si un fallo real devolviera alguno de estos, la app estaría inventando datos igual que antes.
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
  "google.com/search",
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

function serializa(v: unknown) {
  return JSON.stringify(v ?? "");
}

function assertSinDatosInventados(name: string, outcome: unknown) {
  const blob = serializa(outcome);
  const found = DATO_INVENTADO.filter((m) => blob.includes(m));
  check(`${name}: no contiene datos inventados`, found.length === 0, `encontrado: ${found.join(", ")}`);
}

type FetchPlan =
  | { kind: "throw" }
  | { kind: "response"; status: number; body: unknown }
  | { kind: "raw"; status: number; text: string };

function setFetch(plan: FetchPlan) {
  (globalThis as any).fetch = async () => {
    if (plan.kind === "throw") throw new TypeError("Failed to fetch");
    if (plan.kind === "raw") {
      return new Response(plan.text, { status: plan.status, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify(plan.body), {
      status: plan.status,
      headers: { "Content-Type": "application/json" },
    });
  };
}

async function run() {
  console.log("\n== transporte: modo desarrollo (sin VITE_AI_WORKER_URL) ==");
  {
    setFetch({ kind: "throw" });
    const r = await aiRequest({ workerUrl: "", path: "/x", body: {}, getIdToken: token, devSample });
    check("sin URL devuelve la muestra", !isAiFailure(r) && r.simulated === true);
    check("sin URL marca simulated", !isAiFailure(r) && r.simulated === true);
  }
  {
    //sellado de produccion: si no hay muestra habilitada, la ausencia de config es un error visible
    setFetch({ kind: "throw" });
    const r = await aiRequest({ workerUrl: "", path: "/x", body: {}, getIdToken: token });
    check("sin URL y sin muestra NO inventa", isAiFailure(r), serializa(r));
    check("sin URL y sin muestra explica la falta de config", isAiFailure(r) && r.error === AI_SIMULATED_DISABLED, isAiFailure(r) ? r.error : "");
    check("fallo de config no se marca como simulado", isAiFailure(r) && r.simulated === false);
    assertSinDatosInventados("sin URL y sin muestra", r);
  }

  console.log("\n== transporte: fallos reales ==");
  const fallos: { nombre: string; plan: FetchPlan; esperado?: string }[] = [
    { nombre: "sin sesión", plan: { kind: "throw" }, esperado: null },
    { nombre: "red caída", plan: { kind: "throw" }, esperado: "internet" },
    { nombre: "401", plan: { kind: "response", status: 401, body: { error: "No autorizado" } }, esperado: "No autorizado" },
    { nombre: "429 cuota", plan: { kind: "response", status: 429, body: {} }, esperado: "cuota" },
    { nombre: "500 con mensaje del Worker", plan: { kind: "response", status: 500, body: { error: "La IA no pudo completar la petición." } }, esperado: "no pudo completar" },
    { nombre: "500 sin mensaje", plan: { kind: "response", status: 500, body: {} }, esperado: "500" },
    { nombre: "200 con isFallback arriba", plan: { kind: "response", status: 200, body: { success: true, isFallback: true, data: { name: "Contacto Tarjeta" } } } },
    { nombre: "200 con isFallback anidado", plan: { kind: "response", status: 200, body: { success: true, data: { isFallback: true, name: "Contacto Extraído" } } } },
    { nombre: "200 con isFallback en analysis", plan: { kind: "response", status: 200, body: { success: true, analysis: { isFallback: true } } } },
    { nombre: "200 con companyInfo isFallback", plan: { kind: "response", status: 200, body: { success: true, companyInfo: { isFallback: true, summary: "x" } } } },
    { nombre: "200 con isFallback en array", plan: { kind: "response", status: 200, body: { success: true, data: { keyHighlights: [{ isFallback: true }] } } } },
    { nombre: "200 con success:false", plan: { kind: "response", status: 200, body: { success: false, error: "fallo interno" } }, esperado: "fallo interno" },
    { nombre: "200 con cuerpo no objeto", plan: { kind: "response", status: 200, body: "texto plano" } },
    { nombre: "200 con JSON inválido", plan: { kind: "raw", status: 200, text: "{no es json" } },
  ];

  for (const f of fallos) {
    setFetch(f.plan);
    const useToken = f.nombre === "sin sesión" ? async () => undefined : token;
    const r = await aiRequest({ workerUrl: WORKER, path: "/api/ai/scan-card", body: {}, getIdToken: useToken, devSample });
    check(`${f.nombre}: devuelve fallo`, isAiFailure(r), serializa(r));
    if (isAiFailure(r)) {
      check(`${f.nombre}: simulated=false`, r.simulated === false);
      check(`${f.nombre}: mensaje legible`, typeof r.error === "string" && r.error.length > 5, r.error);
      assertSinDatosInventados(f.nombre, r);
      if (f.esperado) {
        check(`${f.nombre}: mensaje menciona "${f.esperado}"`, r.error.toLowerCase().includes(f.esperado.toLowerCase()), r.error);
      }
      if (f.nombre.includes("isFallback")) {
        check(`${f.nombre}: explica que son datos de ejemplo`, r.error === AI_FALLBACK_REJECTED, r.error);
      }
    }
  }

  console.log("\n== transporte: respuestas sanas ==");
  {
    setFetch({ kind: "response", status: 200, body: { success: true, data: { name: "Laura Martínez", company: "Ecopetrol" } } });
    const r = await aiRequest({ workerUrl: WORKER, path: "/p", body: {}, getIdToken: token, devSample });
    check("200 real: éxito", !isAiFailure(r));
    check("200 real: simulated=false", !isAiFailure(r) && r.simulated === false);
    check("200 real: conserva los datos", !isAiFailure(r) && r.data?.name === "Laura Martínez");
  }
  {
    setFetch({ kind: "response", status: 200, body: { success: true, companyInfo: { summary: "x", isFallback: false } } });
    const r = await aiRequest({ workerUrl: WORKER, path: "/p", body: {}, getIdToken: token, devSample });
    check("isFallback:false no se rechaza", !isAiFailure(r), serializa(r));
  }

  console.log("\n== muestras de desarrollo ==");
  {
    setFetch({ kind: "throw" });
    const r = await aiRequest({ workerUrl: "", path: "/p", body: {}, getIdToken: token, devSample: devScannedCard });
    check("muestra de tarjeta marcada simulated", !isAiFailure(r) && r.simulated === true);
  }
  {
    const conDatos = devCompanyProfile("Ecopetrol");
    check("perfil simulado de empresa conocida trae datos", !!conDatos.companyInfo?.summary, serializa(conDatos));
    check("perfil simulado no inventa fuentes", conDatos.companyInfo?.sources?.length === 0, serializa(conDatos.companyInfo?.sources));
    const desconocida = devCompanyProfile("Constructora XYZ 3000");
    check("perfil simulado de empresa desconocida NO inventa", desconocida.companyInfo === null, serializa(desconocida));
  }

  console.log(`\n== transporte: ${pass} ok, ${fail} fallas ==`);
  return fail;
}

run().then((f) => {
  process.exit(f > 0 ? 1 : 0);
});
