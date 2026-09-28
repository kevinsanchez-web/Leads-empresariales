import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";
import { Lead, UserRep, EventOption } from "../types";

const leadsCol = collection(db, "leads");
const usersCol = collection(db, "users");
const eventsCol = collection(db, "events");

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
