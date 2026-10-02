/**
 * Backfill de `Lead.capturedAt` desde el historial más antiguo de cada lead.
 *
 * Los leads se guardaron con `capturedAt = ahora al crear el lead`, así que
 * la gráfica "Tendencia de Captura" los amontonaba en el día en que se usó la
 * app, no en el día real del evento. Cuando existe un `history[]` con fecha
 * legible, ese primer item es la mejor evidencia de cuándo se capturó.
 *
 * Lo que NO hace, a diferencia de scripts/migrate-dates.ts: si un lead no tiene
 * ni historial ni `capturedAt` interpretable, lo deja como está. Inventar "hoy"
 * sería justamente el dato falso que Rompe la gráfica.
 *
 *   npm run backfill:dates            # dry-run, no escribe
 *   npm run backfill:dates -- --apply # escribe
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { parseLeadTimestamp, todayISODate, leadTime } from "../src/utils/date";
import { loadServiceAccount, serviceAccountCredential } from "./serviceAccount";

const APPLY = process.argv.includes("--apply");

interface HistoryItem {
  id?: string;
  date?: string;
  time?: string;
  [key: string]: unknown;
}

interface LeadLike {
  id: string;
  name?: string;
  capturedAt?: string;
  event?: string;
  history?: HistoryItem[];
}

function historyTimestamp(item: HistoryItem): string {
  return `${item.date ?? ""} ${item.time ?? ""}`.trim();
}

/**
 * Devuelve el `capturedAt` corregido, o null si no hay evidencia suficiente
 * para cambiar el dato.
 */
function recoveredCapturedAt(lead: LeadLike): string | null {
  const history = Array.isArray(lead.history) ? lead.history : [];

  let earliestMs: number | null = null;
  history.forEach(item => {
    const ms = parseLeadTimestamp(historyTimestamp(item));
    if (ms === null) return;
    if (earliestMs === null || ms < earliestMs) earliestMs = ms;
  });

  if (earliestMs !== null) {
    const date = new Date(earliestMs);
    return `${todayISODate(date)} ${leadTime(date)}`;
  }

  // Sin historial: normalizar el `capturedAt` existente, nunca inventar uno.
  const existing = parseLeadTimestamp(lead.capturedAt);
  if (existing !== null) {
    const date = new Date(existing);
    return `${todayISODate(date)} ${leadTime(date)}`;
  }

  return null;
}

async function main() {
  const serviceAccount = loadServiceAccount();
  if (getApps().length === 0) {
    initializeApp({
      credential: serviceAccountCredential(),
      projectId: serviceAccount.project_id
    });
  }
  const db = getFirestore();
  const snapshot = await db.collection("leads").get();

  console.log(`\n${APPLY ? "APLICANDO" : "DRY-RUN"} · ${snapshot.size} leads en Firestore\n`);

  const batch = db.batch();
  let updated = 0;
  let unchanged = 0;
  let unrecoverable = 0;
  const skippedSamples: string[] = [];

  snapshot.forEach(snap => {
    const lead = { id: snap.id, ...snap.data() } as LeadLike;
    const recovered = recoveredCapturedAt(lead);

    if (recovered === null) {
      unrecoverable += 1;
      if (skippedSamples.length < 15) {
        skippedSamples.push(
          `  - ${lead.id}${lead.name ? ` (${lead.name})` : ""}: capturedAt="${lead.capturedAt ?? "(vacío)"}", ` +
            `${Array.isArray(lead.history) ? `${lead.history.length} items de historial` : "sin historial"}`
        );
      }
      return;
    }

    if (lead.capturedAt === recovered) {
      unchanged += 1;
      return;
    }

    updated += 1;
    console.log(`  ${lead.id}${lead.name ? ` (${lead.name})` : ""}`);
    console.log(`    capturedAt: ${lead.capturedAt ?? "(vacío)"}  ->  ${recovered}`);

    if (APPLY) {
      batch.update(snap.ref, { capturedAt: recovered });
    }
  });

  if (APPLY && updated > 0) {
    await batch.commit();
  }

  console.log(`\nResumen: ${updated} a corregir, ${unchanged} ya correctos, ${unrecoverable} sin evidencia.`);
  if (unrecoverable > 0) {
    console.log(`Leads sin tocar (quedan con su fecha actual):`);
    skippedSamples.forEach(line => console.log(line));
  }
  if (!APPLY && updated > 0) {
    console.log(`Ejecuta con --apply para escribir los cambios.`);
  }
  console.log("");
  process.exit(0);
}

main().catch(err => {
  console.error("Error en el backfill de fechas:", err);
  process.exit(1);
});