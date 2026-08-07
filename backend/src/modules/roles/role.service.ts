import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";

const roleSelect = {
  id: true,
  roleName: true,
  description: true,
  isActive: true,
  permissions: { select: { permission: { select: { permissionName: true } } } },
} satisfies Prisma.RoleSelect;

type RoleRow = Prisma.RoleGetPayload<{ select: typeof roleSelect }>;

function toRoleDto(role: RoleRow) {
  return {
    id: role.id,
    name: role.roleName,
    description: role.description,
    isActive: role.isActive,
    permissions: role.permissions.map((rp) => rp.permission.permissionName),
  };
}

/** GET /api/v1/roles (API Spec Chapter 22.1). */
export async function listRoles() {
  const roles = await prisma.role.findMany({ select: roleSelect, orderBy: { roleName: "asc" } });
  return roles.map(toRoleDto);
}

export async function getRoleById(id: string) {
  const role = await prisma.role.findUnique({ where: { id }, select: roleSelect });
  if (!role) throw new NotFoundError("Role not found.");
  return toRoleDto(role);
}

export interface CreateRoleInput {
  name: string;
  description?: string;
}

/** POST /api/v1/roles (API Spec Chapter 22.2). */
export async function createRole(input: CreateRoleInput) {
  const role = await prisma.role.create({
    data: { roleName: input.name, ...(input.description !== undefined ? { description: input.description } : {}) },
    select: roleSelect,
  });
  return toRoleDto(role);
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  isActive?: boolean;
}

/** PATCH /api/v1/roles/{id} (API Spec Chapter 22.4). */
export async function updateRole(id: string, input: UpdateRoleInput) {
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Role not found.");

  const role = await prisma.role.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { roleName: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: roleSelect,
  });
  return toRoleDto(role);
}

/** POST /api/v1/roles/{id}/permissions (API Spec Chapter 22.3). */
export async function assignPermissions(id: string, permissionCodes: string[]) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new NotFoundError("Role not found.");

  const permissions = await prisma.permission.findMany({ where: { permissionName: { in: permissionCodes } } });
  const foundCodes = new Set(permissions.map((p) => p.permissionName));
  const unknown = permissionCodes.filter((code) => !foundCodes.has(code));
  if (unknown.length > 0) {
    throw new BadRequestError(`Unknown permission code(s): ${unknown.join(", ")}`);
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: id } }),
    prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: id, permissionId: p.id })) }),
  ]);

  return getRoleById(id);
}

/** DELETE /api/v1/roles/{id} (API Spec Chapter 22.5). */
export async function deleteRole(id: string): Promise<void> {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new NotFoundError("Role not found.");

  const assignedUserCount = await prisma.userRole.count({ where: { roleId: id } });
  if (assignedUserCount > 0) {
    throw new ConflictError("Cannot delete a role that is still assigned to users. Reassign those users first.");
  }

  await prisma.role.delete({ where: { id } });
}
