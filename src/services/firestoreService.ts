import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { Lead, UserRep, EventOption, ContactEnrichment } from "../types";

const leadsCol = collection(db, "leads");
const usersCol = collection(db, "users");
const eventsCol = collection(db, "events");
const enrichmentCol = collection(db, "enrichmentCache");

export function subscribeToLeads(onChange: (leads: Lead[]) => void) {
  const q = query(leadsCol, orderBy("capturedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onChange(snap.docs.map((d) => d.data() as Lead)),
    (err) => console.error("Error escuchando leads:", err)
  );
}

// El proyecto de Firebase es compartido con otras herramientas de Divergency: filtramos
// cualquier documento en "users" que no tenga la forma de un UserRep de esta app (por id/accountType),
// para no romper la UI si alguien más escribe algo distinto en esa misma colección.
function isAppUser(data: unknown): data is UserRep {
  const u = data as Partial<UserRep> | null;
  return !!u && typeof u.id === "string" && typeof u.accountType === "string";
}

export function subscribeToUsers(onChange: (users: UserRep[]) => void) {
  return onSnapshot(
    usersCol,
    (snap) => onChange(snap.docs.map((d) => d.data()).filter(isAppUser)),
    (err) => console.error("Error escuchando usuarios:", err)
  );
}

export function subscribeToEvents(onChange: (events: EventOption[]) => void) {
  return onSnapshot(
    eventsCol,
    (snap) => onChange(snap.docs.map((d) => d.data() as EventOption)),
    (err) => console.error("Error escuchando eventos:", err)
  );
}

// La caché del enriquecimiento vive aquí y no en el Worker, que no tiene credenciales de
// Firestore. Dos claves porque lo que se busca por persona y lo que se busca por empresa tienen
// cadencias distintas: el teléfono central y el sector duran, el cargo actual caduca. Si 300
// leads vienen de 120 empresas, las de empresa evitan 180 búsquedas.
const COMPANY_TTL_DAYS = 90;
const LEAD_TTL_DAYS = 30;

function cacheKey(kind: "company" | "lead", value: string): string {
  return `${kind}_${value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function isFresh(enrichedAt?: string, ttlDays?: number): boolean {
  if (!enrichedAt || !ttlDays) return false;
  const age = Date.now() - new Date(enrichedAt).getTime();
  return Number.isFinite(age) && age >= 0 && age < ttlDays * 24 * 60 * 60 * 1000;
}

export async function getCachedEnrichment(
  kind: "company" | "lead",
  value: string
): Promise<ContactEnrichment | null> {
  try {
    const snap = await getDoc(doc(enrichmentCol, cacheKey(kind, value)));
    if (!snap.exists()) return null;
    const cached = snap.data() as ContactEnrichment;
    return isFresh(cached.enrichedAt, kind === "company" ? COMPANY_TTL_DAYS : LEAD_TTL_DAYS)
      ? cached
      : null;
  } catch (err) {
    // Un fallo de caché no debe impedir enriquecer: el peor caso es volver a pagar la búsqueda.
    console.warn("No se pudo leer la caché de enriquecimiento:", err);
    return null;
  }
}

export async function cacheEnrichment(
  kind: "company" | "lead",
  value: string,
  enrichment: ContactEnrichment
): Promise<void> {
  try {
    await setDoc(doc(enrichmentCol, cacheKey(kind, value)), enrichment);
  } catch (err) {
    console.warn("No se pudo guardar la caché de enriquecimiento:", err);
  }
}

export async function createOrUpdateLead(lead: Lead) {
  await setDoc(doc(leadsCol, lead.id), lead);
}

export async function deleteLead(leadId: string) {
  await deleteDoc(doc(leadsCol, leadId));
}

export async function importLeads(leads: Lead[]) {
  const batch = writeBatch(db);
  leads.forEach((lead) => batch.set(doc(leadsCol, lead.id), lead));
  await batch.commit();
}

export async function createOrUpdateEvent(event: EventOption) {
  await setDoc(doc(eventsCol, event.id), event);
}

export async function createOrUpdateUser(user: UserRep) {
  await setDoc(doc(usersCol, user.id), user);
}

export async function deleteUser(userId: string) {
  await deleteDoc(doc(usersCol, userId));
}
