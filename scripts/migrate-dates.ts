import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch } from "firebase/firestore";
import {
  parseLeadTimestamp,
  todayISODate,
  leadTime
} from "../src/utils/date";

const firebaseConfig = {
  apiKey: "AIzaSyBhX-iyMSfPptJcnTTua5RLFRpxz6_r5kg",
  authDomain: "leads-divergency.firebaseapp.com",
  projectId: "leads-divergency",
  storageBucket: "leads-divergency.firebasestorage.app",
  messagingSenderId: "153858062764",
  appId: "1:153858062764:web:4dd46c4ee8ea961ac32209",
};

const APPLY = process.argv.includes("--apply");

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
  history?: HistoryItem[];
  [key: string]: unknown;
}

/** Timestamp legible desde un item de historial, combinando fecha y hora. */
function historyTimestamp(item: HistoryItem): string {
  return `${item.date ?? ""} ${item.time ?? ""}`.trim();
}

function normalizeForWrite(lead: LeadLike) {
  const history = Array.isArray(lead.history) ? lead.history : [];

  // `capturedAt` es el momento de creación: lo tomamos del item de historial más antiguo.
  let earliestMs: number | null = null;
  history.forEach((item) => {
    const ms = parseLeadTimestamp(historyTimestamp(item));
    if (ms === null) return;
    if (earliestMs === null || ms < earliestMs) earliestMs = ms;
  });

  let capturedAt: string;
  let capturedAtRecovered = false;
  if (earliestMs !== null) {
    const date = new Date(earliestMs);
    capturedAt = `${todayISODate(date)} ${leadTime(date)}`;
    capturedAtRecovered = true;
  } else {
    const existing = parseLeadTimestamp(lead.capturedAt);
    if (existing !== null) {
      const date = new Date(existing);
      capturedAt = `${todayISODate(date)} ${leadTime(date)}`;
    } else {
      capturedAt = `${todayISODate()} ${leadTime()}`;
    }
  }

  // Normalizar todos los `history[].date` a `YYYY-MM-DD`.
  const normalizedHistory = history.map((item) => {
    const ms = parseLeadTimestamp(historyTimestamp(item));
    if (ms === null) return item;
    return { ...item, date: todayISODate(new Date(ms)) };
  });

  // `lastContact` no parseable (p. ej. "Ahora mismo") rompe el orden de la tabla.
  const lastContact =
    parseLeadTimestamp(lead.lastContact) !== null
      ? lead.lastContact
      : capturedAt;

  const changed =
    lead.capturedAt !== capturedAt ||
    lead.lastContact !== lastContact ||
    JSON.stringify(lead.history ?? []) !== JSON.stringify(normalizedHistory);

  return { capturedAt, lastContact, history: normalizedHistory, changed, capturedAtRecovered };
}

async function main() {
  initializeApp(firebaseConfig);
  const db = getFirestore();
  const snapshot = await getDocs(collection(db, "leads"));

  // Sin conexión, el SDK devuelve el cache local (vacío) sin lanzar error.
  // Migrar así reportaría "0 leads" y daría una falsa sensación de éxito.
  if (snapshot.metadata.fromCache) {
    throw new Error(
      "No se pudo conectar a Firestore (respuesta desde cache offline). " +
        "Revisa la conexión/proxy TLS antes de migrar."
    );
  }

  console.log(`\n${APPLY ? "APLICANDO" : "DRY-RUN"} · ${snapshot.size} leads en Firestore\n`);

  const batch = writeBatch(db);
  let updates = 0;
  let unchanged = 0;
  let withoutHistory = 0;

  snapshot.forEach((snap) => {
    const lead = { id: snap.id, ...snap.data() } as LeadLike;
    const result = normalizeForWrite(lead);

    if (!result.changed) {
      unchanged += 1;
      return;
    }

    updates += 1;
    if (!result.capturedAtRecovered) withoutHistory += 1;

    console.log(`- ${lead.id}`);
    console.log(`    capturedAt: ${lead.capturedAt ?? "(vacío)"}  ->  ${result.capturedAt}`);
    if (lead.lastContact !== result.lastContact) {
      console.log(`    lastContact: ${lead.lastContact ?? "(vacío)"}  ->  ${result.lastContact}`);
    }
    const historyChanged =
      JSON.stringify(lead.history ?? []) !== JSON.stringify(result.history);
    if (historyChanged) {
      console.log(`    history[].date normalizado (${result.history.length} items)`);
    }

    if (APPLY) {
      batch.update(doc(db, "leads", lead.id), {
        capturedAt: result.capturedAt,
        lastContact: result.lastContact,
        history: result.history
      });
    }
  });

  if (APPLY && updates > 0) {
    await batch.commit();
  }

  console.log(
    `\nResumen: ${updates} a actualizar, ${unchanged} sin cambios, ` +
      `${withoutHistory} sin historial utilizable (capturedAt = hoy).`
  );
  if (!APPLY && updates > 0) {
    console.log(`Ejecuta con --apply para escribir los cambios.\n`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Error migrando fechas:", err);
  process.exit(1);
});
