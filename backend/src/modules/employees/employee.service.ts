import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { generateCode } from "../../common/utils/code.js";
import { splitName } from "../../common/utils/name.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { NotFoundError } from "../../common/errors/AppError.js";

const employeeSelect = {
  id: true,
  employeeCode: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  address: true,
  designation: true,
  salary: true,
  joiningDate: true,
  status: true,
  profileImage: true,
  createdAt: true,
} satisfies Prisma.EmployeeSelect;

type EmployeeRow = Prisma.EmployeeGetPayload<{ select: typeof employeeSelect }>;

function toEmployeeDto(employee: EmployeeRow) {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    name: [employee.firstName, employee.lastName].filter(Boolean).join(" "),
    phone: employee.phone,
    email: employee.email,
    address: employee.address,
    designation: employee.designation,
    salary: employee.salary,
    joiningDate: employee.joiningDate,
    status: employee.status,
    profileImage: employee.profileImage,
    createdAt: employee.createdAt,
  };
}

export interface ListEmployeesInput extends PaginationQuery {
  search?: string;
  status?: "ACTIVE" | "INACTIVE";
}

/** GET /api/v1/employees (API Spec Chapter 29.1). */
export async function listEmployees(input: ListEmployeesInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.EmployeeWhereInput = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" } },
            { lastName: { contains: input.search, mode: "insensitive" } },
            { phone: { contains: input.search, mode: "insensitive" } },
            { employeeCode: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, select: employeeSelect }),
    prisma.employee.count({ where }),
  ]);

  return { data: employees.map(toEmployeeDto), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getEmployeeById(id: string) {
  const employee = await prisma.employee.findUnique({ where: { id }, select: employeeSelect });
  if (!employee) throw new NotFoundError("Employee not found.");
  return toEmployeeDto(employee);
}

export interface CreateEmployeeInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  designation?: string;
  salary?: number;
  joiningDate?: Date;
}

/** POST /api/v1/employees (API Spec Chapter 29.2). */
export async function createEmployee(input: CreateEmployeeInput) {
  const { firstName, lastName } = splitName(input.name);

  const employee = await prisma.employee.create({
    data: {
      employeeCode: generateCode("EMP"),
      firstName,
      lastName,
      phone: input.phone,
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.designation !== undefined ? { designation: input.designation } : {}),
      ...(input.salary !== undefined ? { salary: input.salary } : {}),
      joiningDate: input.joiningDate ?? new Date(),
    },
    select: employeeSelect,
  });
  return toEmployeeDto(employee);
}

export interface UpdateEmployeeInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  designation?: string;
  salary?: number;
  joiningDate?: Date;
  status?: "ACTIVE" | "INACTIVE";
}

/** PATCH /api/v1/employees/{id} (API Spec Chapter 29.3). */
export async function updateEmployee(id: string, input: UpdateEmployeeInput) {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Employee not found.");

  const nameUpdate = input.name ? splitName(input.name) : null;

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(nameUpdate ? nameUpdate : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.designation !== undefined ? { designation: input.designation } : {}),
      ...(input.salary !== undefined ? { salary: input.salary } : {}),
      ...(input.joiningDate !== undefined ? { joiningDate: input.joiningDate } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
    select: employeeSelect,
  });
  return toEmployeeDto(employee);
}

/**
 * DELETE /api/v1/employees/{id} — SRS Module 22: "Employee records shall
 * remain available even if inactive," so this deactivates rather than
 * deletes, same as Users' soft-delete.
 */
export async function deactivateEmployee(id: string): Promise<void> {
  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Employee not found.");
  await prisma.employee.update({ where: { id }, data: { status: "INACTIVE" } });
}
