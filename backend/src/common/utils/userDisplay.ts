// The Users table (DDD Table 1) has no "name" column — display names come
// from the linked Employee. Several response shapes in the API Specification
// Document (login, /auth/me, user list) flatten this to a single "name" and
// a single "role" string even though the schema supports multiple roles per
// user; both modules that shape those responses share this logic.

interface UserWithEmployeeName {
  username: string;
  employee: { firstName: string; lastName: string | null } | null;
}

export function getDisplayName(user: UserWithEmployeeName): string {
  if (!user.employee) return user.username;
  return [user.employee.firstName, user.employee.lastName].filter(Boolean).join(" ");
}

interface UserWithRoles {
  roles: { role: { roleName: string } }[];
}

/** First assigned role, for response shapes that expect a single "role" string. */
export function getPrimaryRoleName(user: UserWithRoles): string | null {
  return user.roles[0]?.role.roleName ?? null;
}

interface UserWithRoleIds {
  roles: { role: { id: string } }[];
}

/** First assigned role's id — lets clients pre-select the role without reverse-mapping a name. */
export function getPrimaryRoleId(user: UserWithRoleIds): string | null {
  return user.roles[0]?.role.id ?? null;
}
