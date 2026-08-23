import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { hashPassword } from "../../common/utils/password.js";
import { generateCode } from "../../common/utils/code.js";
import { splitName } from "../../common/utils/name.js";
import { getDisplayName, getPrimaryRoleId, getPrimaryRoleName } from "../../common/utils/userDisplay.js";
import { getPaginationParams, buildPaginationMeta, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";

const userListSelect = {
  id: true,
  username: true,
  email: true,
  isActive: true,
  employee: { select: { firstName: true, lastName: true } },
  roles: { select: { role: { select: { id: true, roleName: true } } } },
} satisfies Prisma.UserSelect;

const userDetailSelect = {
  ...userListSelect,
  phone: true,
  profileImage: true,
  employeeId: true,
  lastLogin: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type UserListRow = Prisma.UserGetPayload<{ select: typeof userListSelect }>;
type UserDetailRow = Prisma.UserGetPayload<{ select: typeof userDetailSelect }>;

function toUserListItem(user: UserListRow) {
  return {
    id: user.id,
    username: user.username,
    name: getDisplayName(user),
    email: user.email,
    role: getPrimaryRoleName(user),
    roleId: getPrimaryRoleId(user),
    status: user.isActive ? "active" : ("inactive" as const),
  };
}

function toUserDetail(user: UserDetailRow) {
  return { ...toUserListItem(user), phone: user.phone, profileImage: user.profileImage, lastLogin: user.lastLogin };
}

export interface ListUsersInput extends PaginationQuery {
  search?: string;
  role?: string;
  status?: "active" | "inactive";
}

/** GET /api/v1/users (API Spec Chapter 21.1). */
export async function listUsers(shopId: string, input: ListUsersInput) {
  const { skip, take, page, limit } = getPaginationParams(input);

  const where: Prisma.UserWhereInput = {
    shopId,
    ...(input.status ? { isActive: input.status === "active" } : {}),
    ...(input.role ? { roles: { some: { role: { roleName: { equals: input.role, mode: "insensitive" } } } } } : {}),
    ...(input.search
      ? {
          OR: [
            { username: { contains: input.search, mode: "insensitive" } },
            { email: { contains: input.search, mode: "insensitive" } },
            { employee: { firstName: { contains: input.search, mode: "insensitive" } } },
            { employee: { lastName: { contains: input.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, select: userListSelect }),
    prisma.user.count({ where }),
  ]);

  return { data: users.map(toUserListItem), pagination: buildPaginationMeta(page, limit, total) };
}

/** GET /api/v1/users/{id} (API Spec Chapter 21.2). */
export async function getUserById(shopId: string, id: string) {
  const user = await prisma.user.findFirst({ where: { id, shopId }, select: userDetailSelect });
  if (!user) throw new NotFoundError("User not found.");
  return toUserDetail(user);
}

export interface CreateUserInput {
  name: string;
  username: string;
  email: string;
  password: string;
  roleId: string;
}

/**
 * POST /api/v1/users (API Spec Chapter 21.3). The Users table has no "name"
 * column (DDD Table 1) — display names live on Employee — so creating a
 * user via this admin-facing endpoint also provisions the linked Employee
 * record from the single "name" field the API contract accepts.
 */
export async function createUser(shopId: string, input: CreateUserInput) {
  const role = await prisma.role.findFirst({ where: { id: input.roleId, shopId } });
  if (!role) throw new NotFoundError("Role not found.");

  const hashedPassword = await hashPassword(input.password);
  const { firstName, lastName } = splitName(input.name);

  const user = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({
      data: { shopId, employeeCode: generateCode("EMP"), firstName, lastName, joiningDate: new Date() },
    });
    return tx.user.create({
      data: {
        shopId,
        username: input.username,
        email: input.email,
        password: hashedPassword,
        employeeId: employee.id,
        roles: { create: { roleId: input.roleId } },
      },
      select: userDetailSelect,
    });
  });

  return toUserDetail(user);
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  roleId?: string;
  status?: "active" | "inactive";
  profileImage?: string;
}

/** PATCH /api/v1/users/{id} (API Spec Chapter 21.4). */
export async function updateUser(shopId: string, id: string, input: UpdateUserInput) {
  const existing = await prisma.user.findFirst({ where: { id, shopId }, select: { id: true, employeeId: true } });
  if (!existing) throw new NotFoundError("User not found.");

  if (input.roleId) {
    const role = await prisma.role.findFirst({ where: { id: input.roleId, shopId } });
    if (!role) throw new NotFoundError("Role not found.");
  }

  const nameUpdate = input.name ? splitName(input.name) : null;

  const updated = await prisma.$transaction(async (tx) => {
    if (nameUpdate) {
      if (existing.employeeId) {
        await tx.employee.update({ where: { id: existing.employeeId }, data: nameUpdate });
      } else {
        const employee = await tx.employee.create({
          data: { shopId, employeeCode: generateCode("EMP"), ...nameUpdate, joiningDate: new Date() },
        });
        await tx.user.update({ where: { id }, data: { employeeId: employee.id } });
      }
    }

    if (input.roleId) {
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.create({ data: { userId: id, roleId: input.roleId } });
    }

    return tx.user.update({
      where: { id },
      data: {
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.status !== undefined ? { isActive: input.status === "active" } : {}),
        ...(input.profileImage !== undefined ? { profileImage: input.profileImage } : {}),
      },
      select: userDetailSelect,
    });
  });

  return toUserDetail(updated);
}

/**
 * DELETE /api/v1/users/{id} (API Spec Chapter 21.5) — implemented as a soft
 * delete (deactivate). A hard delete would either violate the audit_logs
 * FK or silently orphan history; "Keep audit history" is one of the two
 * rules the spec lists right alongside "Cannot delete main administrator".
 */
export async function deleteUser(shopId: string, id: string, requestingUserId: string): Promise<void> {
  if (id === requestingUserId) {
    throw new BadRequestError("You cannot delete your own account.");
  }

  const user = await prisma.user.findFirst({
    where: { id, shopId },
    select: { id: true, roles: { select: { role: { select: { roleName: true } } } } },
  });
  if (!user) throw new NotFoundError("User not found.");

  const isOwner = user.roles.some((r) => r.role.roleName === "Owner");
  if (isOwner) {
    const activeOwnerCount = await prisma.user.count({
      where: { shopId, isActive: true, roles: { some: { role: { roleName: "Owner" } } } },
    });
    if (activeOwnerCount <= 1) {
      throw new BadRequestError("Cannot remove the last remaining Owner account.");
    }
  }

  await prisma.user.update({ where: { id }, data: { isActive: false } });
}
