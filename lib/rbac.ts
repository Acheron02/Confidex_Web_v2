export const USER_ROLE = "user" as const;
export const ADMIN_ROLE = "admin" as const;
export const SUPERADMIN_ROLE = "superadmin" as const;

export type UserRole = typeof USER_ROLE;
export type AdminRole = typeof ADMIN_ROLE | typeof SUPERADMIN_ROLE;
export type AppRole = UserRole | AdminRole;

export function isUserRole(role?: string | null): role is UserRole {
  return role === USER_ROLE;
}

export function isAdminRole(role?: string | null): role is AdminRole {
  return role === ADMIN_ROLE || role === SUPERADMIN_ROLE;
}

export function isSuperAdminRole(
  role?: string | null,
): role is typeof SUPERADMIN_ROLE {
  return role === SUPERADMIN_ROLE;
}
