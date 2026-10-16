import { Role } from "./roles";

// MODELO: qué puede hacer cada rol. Es la única tabla de permisos de la app: la interfaz
// pregunta aquí (a través del controlador) y no vuelve a comparar roles a mano.
//
// Hoy la interfaz aplica: users.*, events.manage, catalog.manage y reports.view. El resto de los
// permisos ya están definidos para que el modelo no cambie, pero se aplican en pasos posteriores
// del plan (exportación, asignación, auditoría, soporte).
export type Permission =
  | "users.view"
  | "users.manage"
  | "config.manage"
  | "events.manage"
  | "catalog.manage"
  | "reports.view"
  | "reports.financial"
  | "leads.import"
  | "leads.export"
  | "leads.manageClosing"
  | "audit.view"
  | "support.grant"
  | "platform.manage";

const ADMIN_PERMISSIONS: readonly Permission[] = [
  "users.view",
  "users.manage",
  "config.manage",
  "events.manage",
  "catalog.manage",
  "reports.view",
  "reports.financial",
  "leads.import",
  "leads.export",
  "leads.manageClosing",
  "audit.view",
  "support.grant",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // Todo lo del administrador más la gestión de la plataforma. No incluye `support.grant`: el
  // soporte lo autoriza el administrador de cada empresa, no se concede a sí mismo.
  super_admin: [...ADMIN_PERMISSIONS.filter((p) => p !== "support.grant"), "platform.manage"],
  admin: ADMIN_PERMISSIONS,
  marketing: ["reports.view"],
  capturador: ["leads.import"],
  ventas: ["leads.manageClosing"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// Roles que un usuario puede asignar a otros. Solo un Super Administrador (equipo de Divergency)
// puede crear otros Super Administradores y administradores. Un administrador de empresa no puede
// crear otros administradores, para que la cadena de confianza no crezca sin pasar por Divergency.
const ASSIGNABLE_ROLES: Record<Role, readonly Role[]> = {
  super_admin: ["super_admin", "admin", "marketing", "capturador", "ventas"],
  admin: ["marketing", "capturador", "ventas"],
  marketing: [],
  capturador: [],
  ventas: [],
};

export function assignableRoles(actor: Role): readonly Role[] {
  return ASSIGNABLE_ROLES[actor];
}

// Quién puede editar o eliminar a quién: solo a usuarios cuyo rol podría asignar.
export function canManageRole(actor: Role, target: Role): boolean {
  return ASSIGNABLE_ROLES[actor].includes(target);
}
