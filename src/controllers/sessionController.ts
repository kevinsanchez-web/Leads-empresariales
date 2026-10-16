import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { UserRep } from "../types";
import { isSuperAdminEmail } from "../models/superAdmin";

// CONTROLADOR: quién está operando la app. La identidad sale de la sesión de Firebase Auth, no de
// algo que el navegador pueda elegir:
//   - un Super Administrador (models/superAdmin.ts) opera con su propio perfil;
//   - cualquier otra persona debe tener un documento en `users` cuyo id es su correo en minúsculas
//     (lo crea un administrador al invitarla). Sin documento, no tiene acceso.

export type SessionStatus = "loading" | "ready" | "unauthorized";

export interface Session {
  status: SessionStatus;
  user: UserRep | null;
  email: string | null;
}

// El id de un documento de `users` es el correo normalizado, para que las reglas de Firestore
// puedan localizar al usuario con `request.auth.token.email` sin consultas.
export function userIdFromEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function superAdminProfile(email: string, displayName: string | null, existing?: UserRep): UserRep {
  if (existing) return existing;
  const name = displayName || email.split("@")[0];
  return {
    id: userIdFromEmail(email),
    name,
    email: userIdFromEmail(email),
    role: "Super Administrador",
    accountType: "super_admin",
    team: "Divergency AI",
    avatar: name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    color: "bg-slate-900",
    status: "active",
  };
}

export function resolveSession(
  email: string | null | undefined,
  displayName: string | null,
  users: UserRep[],
  usersLoaded: boolean
): Session {
  if (!email) return { status: "loading", user: null, email: null };
  const normalized = userIdFromEmail(email);
  const existing = users.find((u) => userIdFromEmail(u.email) === normalized);

  if (isSuperAdminEmail(normalized)) {
    return { status: "ready", user: superAdminProfile(normalized, displayName, existing), email: normalized };
  }
  if (!usersLoaded) return { status: "loading", user: null, email: normalized };
  if (existing) return { status: "ready", user: existing, email: normalized };
  return { status: "unauthorized", user: null, email: normalized };
}

export function useSession(users: UserRep[], usersLoaded: boolean): Session {
  const [identity, setIdentity] = useState<{ email: string | null; displayName: string | null }>({
    email: null,
    displayName: null,
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setIdentity({ email: firebaseUser?.email ?? null, displayName: firebaseUser?.displayName ?? null });
    });
  }, []);

  return useMemo(
    () => resolveSession(identity.email, identity.displayName, users, usersLoaded),
    [identity, users, usersLoaded]
  );
}
