import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { generateCode } from "../../common/utils/code.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";

const warrantyInclude = {
  sale: { select: { id: true, invoiceNumber: true } },
  customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
  product: { select: { id: true, sku: true, productName: true } },
  imeiNumber: { select: { id: true, imeiNumber: true } },
} satisfies Prisma.WarrantyInclude;

type WarrantyRow = Prisma.WarrantyGetPayload<{ include: typeof warrantyInclude }>;

function toWarrantyDto(warranty: WarrantyRow) {
  return {
    id: warranty.id,
    saleId: warranty.sale.id,
    invoiceNumber: warranty.sale.invoiceNumber,
    customerId: warranty.customer.id,
    customer: [warranty.customer.firstName, warranty.customer.lastName].filter(Boolean).join(" "),
    customerPhone: warranty.customer.phone,
    productId: warranty.product.id,
    sku: warranty.product.sku,
    product: warranty.product.productName,
    imei: warranty.imeiNumber?.imeiNumber ?? null,
    warrantyType: warranty.warrantyType,
    periodMonths: warranty.warrantyPeriodMonths,
    startDate: warranty.startDate,
    expiryDate: warranty.expiryDate,
    status: warranty.warrantyStatus,
    remarks: warranty.remarks,
    createdAt: warranty.createdAt,
  };
}

export interface ListWarrantiesInput extends PaginationQuery {
  customerId?: string;
  productId?: string;
  status?: "ACTIVE" | "EXPIRED" | "CLAIMED" | "CANCELLED";
  expiringWithinDays?: number;
}

/** GET /api/v1/warranties (API Spec Chapter 42.1). */
export async function listWarranties(input: ListWarrantiesInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.WarrantyWhereInput = {
    ...(input.customerId ? { customerId: input.customerId } : {}),
    ...(input.productId ? { productId: input.productId } : {}),
    ...(input.status ? { warrantyStatus: input.status } : {}),
    ...(input.expiringWithinDays !== undefined
      ? {
          warrantyStatus: "ACTIVE",
          expiryDate: { gte: new Date(), lte: new Date(Date.now() + input.expiringWithinDays * 86_400_000) },
        }
      : {}),
  };

  const [warranties, total] = await Promise.all([
    prisma.warranty.findMany({ where, skip, take, orderBy: { expiryDate: "asc" }, include: warrantyInclude }),
    prisma.warranty.count({ where }),
  ]);

  return { data: warranties.map(toWarrantyDto), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getWarrantyById(id: string) {
  const warranty = await prisma.warranty.findUnique({ where: { id }, include: warrantyInclude });
  if (!warranty) throw new NotFoundError("Warranty not found.");
  return toWarrantyDto(warranty);
}

export interface CreateWarrantyClaimInput {
  warrantyId: string;
  issue: string;
}

/**
 * POST /api/v1/warranties/claim (API Spec Chapter 42.2). "Expired
 * warranties shall not be accepted for claims" (SRS Module 20). A claim
 * naturally becomes repair work, so this also opens a linked Repair ticket
 * (RECEIVED, no charge) instead of leaving the claim as a dead-end status
 * flip — connects Warranty and Repair the way a real shop would handle one.
 */
export async function createWarrantyClaim(input: CreateWarrantyClaimInput) {
  const warranty = await prisma.warranty.findUnique({ where: { id: input.warrantyId } });
  if (!warranty) throw new NotFoundError("Warranty not found.");

  if (warranty.warrantyStatus === "CLAIMED") throw new ConflictError("This warranty has already been claimed.");
  if (warranty.warrantyStatus === "CANCELLED") throw new BadRequestError("This warranty was cancelled.");
  if (warranty.warrantyStatus === "EXPIRED" || warranty.expiryDate < new Date()) {
    throw new BadRequestError("This warranty has expired and cannot be claimed.");
  }

  const repairId = await prisma.$transaction(async (tx) => {
    await tx.warranty.update({
      where: { id: input.warrantyId },
      data: { warrantyStatus: "CLAIMED", remarks: [warranty.remarks, `Claim: ${input.issue}`].filter(Boolean).join(" · ") },
    });

    const repair = await tx.repair.create({
      data: {
        repairTicketNumber: generateCode("RPR"),
        customerId: warranty.customerId,
        productId: warranty.productId,
        ...(warranty.imeiId !== null ? { imeiId: warranty.imeiId } : {}),
        problemDescription: input.issue,
        estimatedCost: 0,
        remarks: `Warranty claim — covered under warranty ${warranty.id}.`,
      },
    });

    return repair.id;
  });

  const updated = await getWarrantyById(input.warrantyId);
  return { warranty: updated, repairId };
}
