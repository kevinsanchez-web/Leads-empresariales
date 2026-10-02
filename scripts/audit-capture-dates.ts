/**
 * Diagnóstico de solo lectura: por qué "Tendencia de Captura" muestra un solo día.
 *
 * NO escribe nada en Firestore. Imprime el histograma de fechas por día de
 * `capturedAt`, cuánto se podría recuperar desde `history[]` y cuántos leads
 * caen fuera del rango del evento.
 *
 *   npm run audit:dates
 */
import {
  parseLeadTimestamp,
  todayISODate,
  parseEventDateRange
} from "../src/utils/date";
import { readCollection, hasReadCredentials } from "./firestoreRead";

interface HistoryItem {
  id?: string;
  date?: string;
  time?: string;
  [key: string]: unknown;
}

interface LeadLike {
  id: string;
  capturedAt?: string;
  lastContact?: string;
  name?: string;
  event?: string;
  history?: HistoryItem[];
}

interface EventLike {
  id: string;
  name?: string;
  dateRange?: string;
}

/** Timestamp legible de un item de historial, combinando fecha y hora. */
function historyTimestamp(item: HistoryItem): string {
  return `${item.date ?? ""} ${item.time ?? ""}`.trim();
}

/** Día local (`YYYY-MM-DD`) del item de historial más antiguo, o null. */
function earliestHistoryDay(lead: LeadLike): string | null {
  const history = Array.isArray(lead.history) ? lead.history : [];
  let earliestMs: number | null = null;
  history.forEach(item => {
    const ms = parseLeadTimestamp(historyTimestamp(item));
    if (ms === null) return;
    if (earliestMs === null || ms < earliestMs) earliestMs = ms;
  });
  return earliestMs === null ? null : todayISODate(new Date(earliestMs));
}

/** Día local de `capturedAt`, o null si no se puede interpretar. */
function capturedDay(lead: LeadLike): string | null {
  const ms = parseLeadTimestamp(lead.capturedAt);
  return ms === null ? null : todayISODate(new Date(ms));
}

function printHistogram(counts: Map<string, number>, total: number): void {
  const rows = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  if (rows.length === 0) {
    console.log("  (sin fechas)");
    return;
  }
  const widest = Math.max(...rows.map(row => String(row[1]).length));
  rows.forEach(([day, count]) => {
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
    const bar = "#".repeat(Math.max(1, Math.round((count / rows[0][1]) * 40)));
    console.log(`  ${day}  ${String(count).padStart(widest)}  ${pct.padStart(5)}%  ${bar}`);
  });
}

async function main() {
  if (!hasReadCredentials()) {
    console.error(
      "\nFalta credencial para leer Firestore. Elige una:\n\n" +
        "  Opción A (recomendada, sin claves en disco):\n" +
        "    gcloud auth login\n" +
        "    $env:FIRESTORE_BEARER_TOKEN = gcloud auth print-identity-token\n\n" +
        "  Opción B (Service Account):\n" +
        "    $env:FIRESTORE_SERVICE_ACCOUNT_PATH = 'C:\\ruta\\service-account.json'\n"
    );
    process.exit(1);
  }

  const leadDocs = await readCollection("leads");
  const leads = leadDocs.map(doc => ({ id: doc.id, ...(doc.data as Omit<LeadLike, "id">) })) as LeadLike[];

  const eventDocs = await readCollection("events");
  const events = eventDocs.map(doc => ({ id: doc.id, ...(doc.data as Omit<EventLike, "id">) })) as EventLike[];

  const total = leads.length;
  const today = todayISODate();

  console.log(`\nAUDITORIA DE FECHAS DE CAPTURA · ${total} leads, ${events.length} eventos`);
  console.log(`Hoy (local): ${today}\n`);

  // --- Estado general de capturedAt -----------------------------------------
  const overall = new Map<string, number>();
  let undated = 0;
  let capturedToday = 0;
  const withoutHistory = new Set<string>();

  leads.forEach(lead => {
    const day = capturedDay(lead);
    if (day === null) {
      undated += 1;
    } else {
      overall.set(day, (overall.get(day) ?? 0) + 1);
      if (day === today) capturedToday += 1;
    }
    if (earliestHistoryDay(lead) === null) withoutHistory.add(lead.id);
  });

  const distinctDays = overall.size;
  const largestDay = Math.max(0, ...overall.values());

  console.log("1. capturedAt por dia (todos los eventos)");
  printHistogram(overall, total);
  console.log(
    `\n   Dias distintos: ${distinctDays}` +
      (distinctDays <= 1 ? "   <-- todos los leads comparten fecha" : "") +
      `\n   Leads con capturedAt no interpretable: ${undated}` +
      `\n   Leads con capturedAt = hoy: ${capturedToday}` +
      (total > 0 && capturedToday === total ? "   <-- 100% colapsados en hoy" : "") +
      "\n"
  );

  // --- capturedAt vs lastContact --------------------------------------------
  // La columna "Actividad" del listado muestra `lastContact`; la gráfica usa
  // `capturedAt`. Si divergen, la pantalla y la gráfica cuentan cosas distintas.
  const divergence: string[] = [];
  let diverged = 0;
  leads.forEach(lead => {
    const captured = capturedDay(lead);
    const last = capturedDay({ ...lead, capturedAt: lead.lastContact });
    if (captured === null || last === null || captured === last) return;
    diverged += 1;
    if (divergence.length < 20) {
      divergence.push(
        `   ${lead.id}${lead.name ? ` (${lead.name})` : ""}: capturedAt=${lead.capturedAt ?? "-"} ` +
          `| lastContact=${lead.lastContact ?? "-"}`
      );
    }
  });

  console.log(`1b. capturedAt (gráfica) vs lastContact (columna "Actividad")`);
  console.log(`   Leads donde difieren: ${diverged} de ${total}`);
  if (diverged > 0) {
    console.log("   Muestras:");
    divergence.forEach(line => console.log(line));
    console.log("   Si la gráfica muestra un día DISTINTO al de Actividad, el dato es así.");
  }
  console.log("");

  // --- Recuperabilidad desde history[] --------------------------------------
  let recoverableDifferentDay = 0;
  let recoverableSameDay = 0;
  const recoverableSamples: string[] = [];

  leads.forEach(lead => {
    const historyDay = earliestHistoryDay(lead);
    if (historyDay === null) return;
    const currentDay = capturedDay(lead);
    if (currentDay !== null && currentDay !== historyDay) {
      recoverableDifferentDay += 1;
      if (recoverableSamples.length < 10) {
        recoverableSamples.push(`   ${lead.id}: ${lead.capturedAt}  ->  ${historyDay}`);
      }
    } else {
      recoverableSameDay += 1;
    }
  });

  console.log("2. Recuperable desde history[] (item mas antiguo)");
  console.log(`   Sin historial interpretable: ${withoutHistory.size}`);
  console.log(`   Con historial, mismo dia que capturedAt: ${recoverableSameDay}`);
  console.log(`   Con historial, dia DISTINTO al actual: ${recoverableDifferentDay}`);
  if (recoverableSamples.length > 0) {
    console.log("   Muestras:");
    recoverableSamples.forEach(line => console.log(line));
  }
  console.log("");

  // --- Eventos y su rango ----------------------------------------------------
  console.log("3. Eventos");
  const rangeByEvent = new Map<string, ReturnType<typeof parseEventDateRange>>();

  events.forEach(event => {
    const eventLeads = leads.filter(lead => lead.event === event.name);
    const histogram = new Map<string, number>();
    let eventUndated = 0;

    eventLeads.forEach(lead => {
      const day = capturedDay(lead);
      if (day === null) {
        eventUndated += 1;
        return;
      }
      histogram.set(day, (histogram.get(day) ?? 0) + 1);
    });

    const range = parseEventDateRange(event.dateRange);
    rangeByEvent.set(event.name ?? "", range);

    console.log(
      `\n   [${event.name ?? "(sin nombre)"}] dateRange="${event.dateRange ?? ""}" ` +
        `leads=${eventLeads.length}`
    );
    console.log(
      range
        ? `   Rango interpretable: ${range.start} -> ${range.end}`
        : `   Rango NO interpretable -> el eje arranca en la fecha del primer lead`
    );
    printHistogram(histogram, eventLeads.length);
    if (eventUndated > 0) console.log(`   Sin fecha interpretable: ${eventUndated}`);
  });

  if (events.length === 0) console.log("   (coleccion events vacia)");

  // --- Leads excluidos por rango --------------------------------------------
  console.log("\n4. Leads fuera del rango del evento (invisibles en la grafica)");
  let outsideAnyRange = 0;
  leads.forEach(lead => {
    const range = rangeByEvent.get(lead.event ?? "");
    if (!range) return;
    const day = capturedDay(lead);
    if (day === null) return;
    if (day < range.start || day > range.end) outsideAnyRange += 1;
  });
  console.log(`   ${outsideAnyRange}`);
  console.log("");

  // --- Conclusion ------------------------------------------------------------
  console.log("CONCLUSION");
  if (distinctDays <= 1 && largestDay === total) {
    console.log(
      "   capturedAt tiene UNA sola fecha para todos los leads. La grafica no tiene\n" +
        "   error de agrupado: falta la fecha real de captura en el dato (se guardo\n" +
        "   'ahora' al crear cada lead). Recuperable: " +
        `${recoverableDifferentDay} leads desde history[].`
    );
  } else {
    console.log(
      `   capturedAt reparte en ${distinctDays} dias. Si la grafica se ve igual, el\n` +
        "   problema es del eje: revisa el recorte de dias vacios y parseEventDateRange."
    );
  }
  console.log("");
  process.exit(0);
}

main().catch(err => {
  console.error("Error auditando fechas:", err);
  process.exit(1);
});