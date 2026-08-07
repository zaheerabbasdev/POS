import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { generateCode } from "../../common/utils/code.js";
import { splitName } from "../../common/utils/name.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { NotFoundError } from "../../common/errors/AppError.js";

const customerSelect = {
  id: true,
  customerCode: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  address: true,
  city: true,
  customerType: true,
  creditLimit: true,
  outstandingBalance: true,
  notes: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.CustomerSelect;

type CustomerRow = Prisma.CustomerGetPayload<{ select: typeof customerSelect }>;

function toCustomerDto(customer: CustomerRow) {
  return {
    id: customer.id,
    customerCode: customer.customerCode,
    name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    city: customer.city,
    customerType: customer.customerType,
    creditLimit: customer.creditLimit,
    outstandingBalance: customer.outstandingBalance,
    notes: customer.notes,
    status: customer.isActive ? "active" : ("inactive" as const),
    createdAt: customer.createdAt,
  };
}

export interface ListCustomersInput extends PaginationQuery {
  search?: string;
  customerType?: "REGULAR" | "WHOLESALE" | "VIP" | "CORPORATE";
  status?: "active" | "inactive";
}

/** GET /api/v1/customers (API Spec Chapter 27.1) — search covers name, phone, customer code. */
export async function listCustomers(input: ListCustomersInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.CustomerWhereInput = {
    ...(input.status ? { isActive: input.status === "active" } : {}),
    ...(input.customerType ? { customerType: input.customerType } : {}),
    ...(input.search
      ? {
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" } },
            { lastName: { contains: input.search, mode: "insensitive" } },
            { phone: { contains: input.search, mode: "insensitive" } },
            { customerCode: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, select: customerSelect }),
    prisma.customer.count({ where }),
  ]);

  return { data: customers.map(toCustomerDto), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id }, select: customerSelect });
  if (!customer) throw new NotFoundError("Customer not found.");
  return toCustomerDto(customer);
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  customerType?: "REGULAR" | "WHOLESALE" | "VIP" | "CORPORATE";
  creditLimit?: number;
  notes?: string;
}

/** POST /api/v1/customers (API Spec Chapter 27.2) — "Customer mobile numbers should be unique" (SRS Module 15). */
export async function createCustomer(input: CreateCustomerInput) {
  const { firstName, lastName } = splitName(input.name);

  const customer = await prisma.customer.create({
    data: {
      customerCode: generateCode("CUS"),
      firstName,
      lastName,
      phone: input.phone,
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.customerType !== undefined ? { customerType: input.customerType } : {}),
      ...(input.creditLimit !== undefined ? { creditLimit: input.creditLimit } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    select: customerSelect,
  });
  return toCustomerDto(customer);
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  customerType?: "REGULAR" | "WHOLESALE" | "VIP" | "CORPORATE";
  creditLimit?: number;
  notes?: string;
  status?: "active" | "inactive";
}

/** PATCH /api/v1/customers/{id} (API Spec Chapter 27.3). */
export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Customer not found.");

  const nameUpdate = input.name ? splitName(input.name) : null;

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(nameUpdate ? nameUpdate : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.customerType !== undefined ? { customerType: input.customerType } : {}),
      ...(input.creditLimit !== undefined ? { creditLimit: input.creditLimit } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.status !== undefined ? { isActive: input.status === "active" } : {}),
    },
    select: customerSelect,
  });
  return toCustomerDto(customer);
}

/** GET /api/v1/customers/{id}/history (API Spec Chapter 27.4). */
export async function getCustomerHistory(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new NotFoundError("Customer not found.");

  const sales = await prisma.sale.findMany({
    where: { customerId: id },
    orderBy: { saleDate: "desc" },
    select: { id: true, invoiceNumber: true, saleDate: true, totalAmount: true, paymentStatus: true },
  });

  // Payments reference sales by id (polymorphic referenceId — see
  // Payment.referenceId in schema.prisma), so they're a second query keyed
  // off this customer's own sale ids rather than a direct relation.
  const saleIds = sales.map((sale) => sale.id);
  const salePayments = saleIds.length
    ? await prisma.payment.findMany({
        where: { paymentType: "SALE_PAYMENT", referenceId: { in: saleIds } },
        orderBy: { paymentDate: "desc" },
        select: { id: true, referenceId: true, amount: true, paymentMethod: true, paymentDate: true, notes: true },
      })
    : [];

  return {
    sales,
    payments: salePayments,
    // Repairs/Warranty Claims populate once those modules exist.
    repairs: [] as unknown[],
    warrantyClaims: [] as unknown[],
    outstandingBalance: customer.outstandingBalance,
  };
}
