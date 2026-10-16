// Pruebas de las reglas de Firestore contra el emulador.
//
// Requiere el emulador de Firestore en marcha (npm run emulators). Cada prueba usa identidades
// simuladas: no hace falta Auth ni cuentas reales.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

const SUPER = "kevin_sanchez@cun.edu.co"; // raíz
const SUPER2 = "equipo@divergency.ai"; // super admin creado por otro super admin
const ADMIN = "admin@empresa.com";
const MARKETING = "marketing@empresa.com";
const CAPTURADOR = "capturador@empresa.com";
const VENTAS = "ventas@empresa.com";
const LEGACY_EXEC = "ejecutivo@empresa.com";
const SIN_ALTA = "intruso@gmail.com";

const profile = (email: string, accountType: string) => ({
  id: email,
  name: email,
  email,
  role: accountType,
  accountType,
  team: "Equipo",
  avatar: "XX",
});

// Cada persona se identifica con su correo verificado, como lo haría Firebase Auth.
const as = (email: string, verified = true) =>
  env.authenticatedContext(email, { email, email_verified: verified }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "leads-divergency",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users", SUPER2), profile(SUPER2, "super_admin"));
    await setDoc(doc(db, "users", ADMIN), profile(ADMIN, "admin"));
    await setDoc(doc(db, "users", MARKETING), profile(MARKETING, "marketing"));
    await setDoc(doc(db, "users", CAPTURADOR), profile(CAPTURADOR, "capturador"));
    await setDoc(doc(db, "users", VENTAS), profile(VENTAS, "ventas"));
    await setDoc(doc(db, "users", LEGACY_EXEC), profile(LEGACY_EXEC, "executive"));
    await setDoc(doc(db, "leads", "l1"), { id: "l1", name: "Lead 1" });
    await setDoc(doc(db, "events", "e1"), { id: "e1", name: "Evento" });
  });
});

describe("acceso básico", () => {
  it("sin sesión no lee nada", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "leads", "l1")));
  });

  it("con el correo sin verificar no lee nada", async () => {
    await assertFails(getDoc(doc(as(ADMIN, false), "leads", "l1")));
  });

  it("una cuenta de Google sin alta en users no lee nada", async () => {
    await assertFails(getDoc(doc(as(SIN_ALTA), "leads", "l1")));
    await assertFails(getDoc(doc(as(SIN_ALTA), "users", ADMIN)));
  });

  it("las colecciones desconocidas están cerradas, incluso para el super admin", async () => {
    await assertFails(getDoc(doc(as(SUPER), "cosas", "x")));
    await assertFails(setDoc(doc(as(SUPER), "cosas", "x"), { a: 1 }));
  });
});

describe("usuarios y roles", () => {
  it("el super admin lee y crea administradores sin tener documento propio", async () => {
    await assertSucceeds(getDoc(doc(as(SUPER), "users", ADMIN)));
    await assertSucceeds(setDoc(doc(as(SUPER), "users", "nuevo@empresa.com"), profile("nuevo@empresa.com", "admin")));
  });

  it("un super admin crea otros super admins; un administrador no", async () => {
    await assertSucceeds(setDoc(doc(as(SUPER), "users", "otro@x.com"), profile("otro@x.com", "super_admin")));
    await assertFails(setDoc(doc(as(ADMIN), "users", "otro2@x.com"), profile("otro2@x.com", "super_admin")));
  });

  it("un super admin creado por documento tiene los mismos poderes que uno raíz", async () => {
    await assertSucceeds(setDoc(doc(as(SUPER2), "users", "a3@empresa.com"), profile("a3@empresa.com", "admin")));
    await assertSucceeds(setDoc(doc(as(SUPER2), "users", "s3@divergency.ai"), profile("s3@divergency.ai", "super_admin")));
    await assertSucceeds(updateDoc(doc(as(SUPER2), "users", ADMIN), { name: "Renombrado" }));
    await assertSucceeds(getDoc(doc(as(SUPER2), "users", ADMIN)));
  });

  it("las cuentas raíz no se pueden crear, editar ni borrar desde los datos", async () => {
    await assertFails(setDoc(doc(as(SUPER2), "users", SUPER), profile(SUPER, "ventas")));
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", SUPER), profile(SUPER, "super_admin"));
    });
    await assertFails(updateDoc(doc(as(SUPER2), "users", SUPER), { name: "X" }));
    await assertFails(deleteDoc(doc(as(SUPER2), "users", SUPER)));
    await assertFails(deleteDoc(doc(as(SUPER), "users", SUPER)));
  });

  it("un administrador no toca a un super admin", async () => {
    await assertFails(updateDoc(doc(as(ADMIN), "users", SUPER2), { name: "X" }));
    await assertFails(deleteDoc(doc(as(ADMIN), "users", SUPER2)));
  });

  it("un administrador crea perfiles operativos pero no otros administradores", async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN), "users", "v2@empresa.com"), profile("v2@empresa.com", "ventas")));
    await assertSucceeds(setDoc(doc(as(ADMIN), "users", "m2@empresa.com"), profile("m2@empresa.com", "marketing")));
    await assertFails(setDoc(doc(as(ADMIN), "users", "a2@empresa.com"), profile("a2@empresa.com", "admin")));
  });

  it("el id del documento debe ser el correo en minúsculas", async () => {
    await assertFails(setDoc(doc(as(ADMIN), "users", "otro-id"), profile("v3@empresa.com", "ventas")));
  });

  it("un administrador no escala a un usuario operativo a administrador", async () => {
    await assertFails(updateDoc(doc(as(ADMIN), "users", VENTAS), { accountType: "admin" }));
  });

  it("un administrador no toca a otro administrador", async () => {
    await assertFails(updateDoc(doc(as(ADMIN), "users", ADMIN), { name: "Otro" }));
    await assertFails(deleteDoc(doc(as(ADMIN), "users", ADMIN)));
  });

  it("el super admin sí gestiona administradores", async () => {
    await assertSucceeds(updateDoc(doc(as(SUPER), "users", ADMIN), { name: "Renombrado" }));
  });

  it("los roles operativos no escriben usuarios", async () => {
    for (const who of [MARKETING, CAPTURADOR, VENTAS]) {
      await assertFails(setDoc(doc(as(who), "users", "x@empresa.com"), profile("x@empresa.com", "ventas")));
      await assertFails(deleteDoc(doc(as(who), "users", VENTAS)));
    }
  });

  it("cualquier persona dada de alta ve el directorio", async () => {
    await assertSucceeds(getDoc(doc(as(VENTAS), "users", ADMIN)));
  });
});

describe("eventos", () => {
  it("todos los roles leen; solo la administración escribe", async () => {
    for (const who of [ADMIN, MARKETING, CAPTURADOR, VENTAS]) {
      await assertSucceeds(getDoc(doc(as(who), "events", "e1")));
    }
    await assertSucceeds(setDoc(doc(as(ADMIN), "events", "e2"), { id: "e2" }));
    await assertFails(setDoc(doc(as(VENTAS), "events", "e3"), { id: "e3" }));
    await assertFails(setDoc(doc(as(MARKETING), "events", "e3"), { id: "e3" }));
  });
});

describe("leads", () => {
  it("todos los roles dados de alta leen", async () => {
    for (const who of [ADMIN, MARKETING, CAPTURADOR, VENTAS, LEGACY_EXEC]) {
      await assertSucceeds(getDoc(doc(as(who), "leads", "l1")));
    }
  });

  it("administración, capturador y ventas escriben; marketing no", async () => {
    await assertSucceeds(setDoc(doc(as(ADMIN), "leads", "l2"), { id: "l2" }));
    await assertSucceeds(setDoc(doc(as(CAPTURADOR), "leads", "l3"), { id: "l3" }));
    await assertSucceeds(setDoc(doc(as(VENTAS), "leads", "l4"), { id: "l4" }));
    await assertSucceeds(setDoc(doc(as(LEGACY_EXEC), "leads", "l5"), { id: "l5" }));
    await assertFails(setDoc(doc(as(MARKETING), "leads", "l6"), { id: "l6" }));
  });

  it("solo la administración borra leads", async () => {
    await assertFails(deleteDoc(doc(as(VENTAS), "leads", "l1")));
    await assertFails(deleteDoc(doc(as(CAPTURADOR), "leads", "l1")));
    await assertSucceeds(deleteDoc(doc(as(ADMIN), "leads", "l1")));
  });
});
