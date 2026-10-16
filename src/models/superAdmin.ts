// MODELO: los Super Administradores "raíz". El equipo de Divergency AI es el proveedor de la
// plataforma, así que su acceso no depende de que un administrador de empresa lo conceda.
//
// Esta lista es el punto de arranque: estas cuentas son siempre Super Administrador, no tienen
// que estar en `users` y nadie puede editarlas ni borrarlas desde la interfaz. A partir de ellas,
// cualquier Super Administrador puede dar de alta a más personas del equipo con el rol
// `super_admin` (documento en `users`). La misma lista existe en firestore.rules, porque la
// protección real es la del servidor.
export const SUPER_ADMIN_EMAILS: readonly string[] = ["kevin_sanchez@cun.edu.co"];

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
