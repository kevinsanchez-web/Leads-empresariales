import { useMemo } from "react";
import { ActiveView, UserRep } from "../types";
import { Role, ROLE_LABELS, normalizeRole } from "../models/roles";
import { Permission, assignableRoles, can, canManageRole } from "../models/permissions";
import { isSuperAdminEmail } from "../models/superAdmin";

// CONTROLADOR: traduce un usuario a su rol y responde las preguntas de acceso que hacen las
// vistas. Las vistas no deben mirar `accountType` ni el texto de `role`: preguntan aquí.

// Permiso que exige abrir cada vista. Las vistas que no aparecen aquí están abiertas a todos los roles.
export const VIEW_PERMISSIONS: Partial<Record<ActiveView, Permission>> = {
  eventos: "events.manage",
  intereses: "catalog.manage",
  reportes: "reports.view",
  usuarios: "users.view",
};

export function canOpenView(access: Access, view: ActiveView): boolean {
  const required = VIEW_PERMISSIONS[view];
  return !required || access.can(required);
}

type UserLike = Pick<UserRep, "email" | "accountType" | "role"> | null | undefined;

export function resolveRole(user: UserLike): Role {
  if (!user) return "ventas";
  if (isSuperAdminEmail(user.email)) return "super_admin";
  return normalizeRole(user.accountType, user.role);
}

export interface Access {
  role: Role;
  roleLabel: string;
  can: (permission: Permission) => boolean;
  assignableRoles: readonly Role[];
  canManageUser: (target: UserLike) => boolean;
}

export function getAccess(user: UserLike): Access {
  const role = resolveRole(user);
  return {
    role,
    roleLabel: ROLE_LABELS[role],
    can: (permission) => can(role, permission),
    assignableRoles: assignableRoles(role),
    // Las cuentas raíz del equipo de Divergency no se editan ni se borran desde la interfaz.
    canManageUser: (target) => !isSuperAdminEmail(target?.email) && canManageRole(role, resolveRole(target)),
  };
}

export function useAccess(user: UserLike): Access {
  const email = user?.email;
  const accountType = user?.accountType;
  const roleText = user?.role;
  return useMemo(
    () => getAccess({ email: email ?? "", accountType, role: roleText ?? "" }),
    [email, accountType, roleText]
  );
}
