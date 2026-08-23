import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { generateCode } from "../../common/utils/code.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { NotFoundError } from "../../common/errors/AppError.js";

const supplierSelect = {
  id: true,
  supplierCode: true,
  supplierName: true,
  contactPerson: true,
  phone: true,
  email: true,
  address: true,
  taxNumber: true,
  paymentTerms: true,
  outstandingBalance: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.SupplierSelect;

type SupplierRow = Prisma.SupplierGetPayload<{ select: typeof supplierSelect }>;

function toSupplierDto(supplier: SupplierRow) {
  return {
    id: supplier.id,
    supplierCode: supplier.supplierCode,
    name: supplier.supplierName,
    contactPerson: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email,
    address: supplier.address,
    taxNumber: supplier.taxNumber,
    paymentTerms: supplier.paymentTerms,
    outstandingBalance: supplier.outstandingBalance,
    status: supplier.isActive ? "active" : ("inactive" as const),
    createdAt: supplier.createdAt,
  };
}

export interface ListSuppliersInput extends PaginationQuery {
  search?: string;
  status?: "active" | "inactive";
}

/** GET /api/v1/suppliers (API Spec Chapter 28.1). */
export async function listSuppliers(shopId: string, input: ListSuppliersInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.SupplierWhereInput = {
    shopId,
    ...(input.status ? { isActive: input.status === "active" } : {}),
    ...(input.search
      ? {
          OR: [
            { supplierName: { contains: input.search, mode: "insensitive" } },
            { phone: { contains: input.search, mode: "insensitive" } },
            { supplierCode: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, select: supplierSelect }),
    prisma.supplier.count({ where }),
  ]);

  return { data: suppliers.map(toSupplierDto), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getSupplierById(shopId: string, id: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id, shopId }, select: supplierSelect });
  if (!supplier) throw new NotFoundError("Supplier not found.");
  return toSupplierDto(supplier);
}

export interface CreateSupplierInput {
  name: string;
  phone: string;
  contactPerson?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  paymentTerms?: string;
}

/** POST /api/v1/suppliers (API Spec Chapter 28.2). */
export async function createSupplier(shopId: string, input: CreateSupplierInput) {
  const supplier = await prisma.supplier.create({
    data: {
      shopId,
      supplierCode: generateCode("SUP"),
      supplierName: input.name,
      phone: input.phone,
      ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.taxNumber !== undefined ? { taxNumber: input.taxNumber } : {}),
      ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
    },
    select: supplierSelect,
  });
  return toSupplierDto(supplier);
}

export interface UpdateSupplierInput {
  name?: string;
  phone?: string;
  contactPerson?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  paymentTerms?: string;
  status?: "active" | "inactive";
}

/** PATCH /api/v1/suppliers/{id} (API Spec Chapter 28.3). */
export async function updateSupplier(shopId: string, id: string, input: UpdateSupplierInput) {
  const existing = await prisma.supplier.findFirst({ where: { id, shopId } });
  if (!existing) throw new NotFoundError("Supplier not found.");

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { supplierName: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.taxNumber !== undefined ? { taxNumber: input.taxNumber } : {}),
      ...(input.paymentTerms !== undefined ? { paymentTerms: input.paymentTerms } : {}),
      ...(input.status !== undefined ? { isActive: input.status === "active" } : {}),
    },
    select: supplierSelect,
  });
  return toSupplierDto(supplier);
}

/** GET /api/v1/suppliers/{id}/history (API Spec Chapter 28.4). */
export async function getSupplierHistory(shopId: string, id: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id, shopId } });
  if (!supplier) throw new NotFoundError("Supplier not found.");

  const purchases = await prisma.purchase.findMany({
    where: { supplierId: id, shopId },
    orderBy: { purchaseDate: "desc" },
    select: { id: true, purchaseNumber: true, purchaseDate: true, totalAmount: true, paymentStatus: true },
  });

  const purchaseIds = purchases.map((purchase) => purchase.id);
  const payments = purchaseIds.length
    ? await prisma.payment.findMany({
        where: { paymentType: "PURCHASE_PAYMENT", referenceId: { in: purchaseIds }, shopId },
        orderBy: { paymentDate: "desc" },
        select: { id: true, referenceId: true, amount: true, paymentMethod: true, paymentDate: true, notes: true },
      })
    : [];

  return { purchases, payments, outstandingBalance: supplier.outstandingBalance };
}
