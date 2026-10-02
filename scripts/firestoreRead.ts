/**
 * Lectura de Firestore para los scripts de diagnóstico.
 *
 * Dos vías, en este orden:
 *
 * 1. `FIRESTORE_BEARER_TOKEN`: un token de gcloud (`gcloud auth print-identity-token`).
 *    Las reglas de `firestore.rules` aceptan cualquier token de Google con
 *    `email_verified` del dominio permitido, así que sirve una cuenta normal
 *    y NO deja ninguna clave privada en disco.
 *
 * 2. Service Account vía Admin SDK (FIRESTORE_SERVICE_ACCOUNT_PATH), que sí
 *    salta las reglas pero implica una clave privada de larga duración.
 */
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { loadServiceAccount, serviceAccountCredential } from "./serviceAccount";

const PROJECT_ID = "leads-divergency";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

export interface Doc {
  id: string;
  data: Record<string, unknown>;
}

/** Convierte el valor JSON de la API REST a algo manejable. */
function decodeValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  const v = value as Record<string, unknown>;

  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) {
    const arr = (v.arrayValue as { values?: unknown[] } | undefined)?.values ?? [];
    return arr.map(decodeValue);
  }
  if ("mapValue" in v) {
    const fields = (v.mapValue as { fields?: Record<string, unknown> } | undefined)?.fields ?? {};
    return decodeFields(fields);
  }
  return value;
}

function decodeFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(fields).forEach(([key, raw]) => {
    out[key] = decodeValue(raw);
  });
  return out;
}

async function readViaRest(collection: string, token: string): Promise<Doc[]> {
  const docs: Doc[] = [];
  let pageToken = "";

  do {
    const url = `${BASE}/${collection}?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Firestore REST ${res.status} en ${collection}: ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      documents?: { name: string; fields?: Record<string, unknown> }[];
      nextPageToken?: string;
    };

    (json.documents ?? []).forEach(doc => {
      const id = doc.name.split("/").pop() ?? doc.name;
      docs.push({ id, data: decodeFields(doc.fields ?? {}) });
    });

    pageToken = json.nextPageToken ?? "";
  } while (pageToken);

  return docs;
}

async function readViaAdmin(collection: string): Promise<Doc[]> {
  const serviceAccount = loadServiceAccount();
  if (getApps().length === 0) {
    initializeApp({
      credential: serviceAccountCredential(),
      projectId: serviceAccount.project_id
    });
  }
  const snapshot = await getFirestore().collection(collection).get();
  return snapshot.docs.map(docSnap => ({ id: docSnap.id, data: docSnap.data() }));
}

/** True si hay una vía de lectura disponible. */
export function hasReadCredentials(): boolean {
  return Boolean(
    process.env.FIRESTORE_BEARER_TOKEN?.trim() ||
      process.env.FIRESTORE_SERVICE_ACCOUNT_PATH?.trim() ||
      process.env.FIRESTORE_SERVICE_ACCOUNT_JSON?.trim()
  );
}

export async function readCollection(name: string): Promise<Doc[]> {
  const token = process.env.FIRESTORE_BEARER_TOKEN?.trim();
  if (token) return readViaRest(name, token);
  return readViaAdmin(name);
}