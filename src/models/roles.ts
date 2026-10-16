// MODELO: qué roles existen en el CRM y cómo se llaman. Aquí no hay lógica de pantalla ni de
// permisos (eso vive en permissions.ts); solo la definición de los roles y la compatibilidad
// con los datos que ya existen.

export type Role = "super_admin" | "admin" | "marketing" | "capturador" | "ventas";

// De mayor a menor alcance. El orden se usa para mostrar listas, no para decidir permisos.
export const ROLES: readonly Role[] = ["super_admin", "admin", "marketing", "capturador", "ventas"];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  marketing: "Marketing",
  capturador: "Capturador",
  ventas: "Ventas",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin:
    "Equipo de Divergency AI. Acceso total a la plataforma y a todas las empresas. Solo otro Super Administrador puede crearlo.",
  admin:
    "Administra la empresa: configura el CRM, gestiona usuarios y roles, exporta datos y consulta la auditoría.",
  marketing:
    "Atrae prospectos y mide la captación. Sin acceso a cierres ni a información financiera.",
  capturador:
    "Registra, valida e importa contactos. Sin acceso a métricas financieras ni a etapas de cierre.",
  ventas: "Trabaja sus propios contactos y oportunidades. Sin acceso a la configuración.",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

// Los usuarios guardados antes de existir los roles nuevos traen accountType "admin" o "executive"
// y un texto libre en `role` (por ejemplo "Administrador del Sistema"). Esta función traduce ese
// formato al rol nuevo. La rama que lee el texto libre existe solo por compatibilidad y debe
// eliminarse cuando los usuarios existentes queden migrados con un rol explícito.
export function normalizeRole(accountType?: string | null, roleText?: string | null): Role {
  if (isRole(accountType)) return accountType;
  if (accountType === "executive") return "ventas";
  if (roleText && roleText.toLowerCase().includes("admin")) return "admin";
  return "ventas";
}
