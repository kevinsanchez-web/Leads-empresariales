import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { isAllowedEmail } from "../allowedUsers";

// CONTROLADOR: todo lo que la pantalla de acceso (AuthGate) y el botón de cerrar sesión hacen
// contra Firebase Auth. La vista no importa `firebase/auth` directamente.

// Claves de localStorage que identifican a la persona y no deben sobrevivir a un cierre de sesión.
// No se borran la cola offline ni las preferencias (tema, evento): una captura sin sincronizar no
// puede perderse por cerrar sesión.
const SESSION_STORAGE_KEYS = ["centralized_current_user_v1"];

function isIOSBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export type GoogleSignInResult = "done" | "cancelled" | "redirecting";

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const provider = new GoogleAuthProvider();

  if (isIOSBrowser()) {
    await signInWithRedirect(auth, provider);
    return "redirecting";
  }

  try {
    await signInWithPopup(auth, provider);
    return "done";
  } catch (err: any) {
    if (err?.code === "auth/popup-closed-by-user") return "cancelled";
    // El popup puede estar bloqueado: se reintenta por redirección.
    await signInWithRedirect(auth, provider);
    return "redirecting";
  }
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

// Crea la cuenta y envía el correo de verificación. Las reglas de Firestore y el Worker exigen
// `email_verified`, así que una cuenta nueva no entra a los datos hasta verificar el correo.
export async function registerWithEmail(email: string, password: string): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await sendEmailVerification(user);
}

export async function resendVerification(): Promise<void> {
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
}

// Vuelve a leer el usuario desde Firebase para enterarse de si ya verificó el correo.
export async function refreshUser(): Promise<User | null> {
  await auth.currentUser?.reload();
  return auth.currentUser;
}

// Las cuentas de Google llegan con el correo ya verificado; las de correo y contraseña, no.
export function needsEmailVerification(user: User): boolean {
  return !user.emailVerified;
}

export async function logout(): Promise<void> {
  try {
    SESSION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage puede no estar disponible; cerrar sesión no depende de eso.
  }
  await signOut(auth);
}

export function isEmailAllowed(email: string): boolean {
  return isAllowedEmail(email);
}

export function authErrorMessage(err: any): string {
  switch (err?.code) {
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese correo. Inicia sesión.";
    case "auth/weak-password":
      return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
    case "auth/network-request-failed":
      return "Sin conexión. Revisa tu internet.";
    case "auth/operation-not-allowed":
      return "El acceso con correo y contraseña no está habilitado en Firebase (Authentication > Método de acceso).";
    default:
      return "No se pudo completar la operación. Intenta de nuevo.";
  }
}
