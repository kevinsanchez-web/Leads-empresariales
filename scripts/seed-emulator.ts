/**
 * Siembra los EMULADORES locales (nunca el proyecto real).
 *
 *   npm run emulators        # en una terminal
 *   npm run seed:emulator    # en otra
 *
 * Crea en el emulador de Auth al Super Administrador (correo ya verificado, con la contraseña de
 * pruebas de scripts/devConstants.ts) y siembra eventos, usuarios y leads de ejemplo en el de
 * Firestore. Es repetible: si el usuario ya existe, solo le restablece la contraseña.
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { INITIAL_LEADS, MOCK_USERS, MOCK_EVENTS } from "../src/data/mockData";
import { DEV_SUPER_ADMIN } from "./devConstants";

// Estas variables hacen que firebase-admin hable con los emuladores en lugar del proyecto real.
// Se fijan aquí para que el script no pueda tocar producción por olvidar exportarlas.
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

async function seedSuperAdmin() {
  const auth = getAuth();
  try {
    const existing = await auth.getUserByEmail(DEV_SUPER_ADMIN.email);
    await auth.updateUser(existing.uid, {
      password: DEV_SUPER_ADMIN.password,
      emailVerified: true,
    });
    console.log(`Super Administrador ya existía; contraseña restablecida (${DEV_SUPER_ADMIN.email}).`);
  } catch (err: any) {
    if (err?.code !== "auth/user-not-found") throw err;
    await auth.createUser({
      email: DEV_SUPER_ADMIN.email,
      password: DEV_SUPER_ADMIN.password,
      emailVerified: true,
      displayName: "Kevin Sanchez",
    });
    console.log(`Super Administrador creado (${DEV_SUPER_ADMIN.email}).`);
  }
}

async function seedCollection(name: string, items: { id: string }[]) {
  const db = getFirestore();
  const batch = db.batch();
  items.forEach((item) => batch.set(db.collection(name).doc(item.id), item));
  await batch.commit();
  console.log(`Sembrados ${items.length} documentos en "${name}".`);
}

async function main() {
  initializeApp({ projectId: "leads-divergency" });
  await seedSuperAdmin();
  await seedCollection("events", MOCK_EVENTS);
  // El id de un usuario es su correo en minúsculas (ver sessionController.userIdFromEmail).
  await seedCollection(
    "users",
    MOCK_USERS.map((u) => ({ ...u, id: u.email.toLowerCase() }))
  );
  await seedCollection("leads", INITIAL_LEADS);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error sembrando los emuladores (¿están corriendo? npm run emulators):", err);
    process.exit(1);
  });
