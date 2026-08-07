import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";

const returnListInclude = {
  supplier: { select: { id: true, supplierName: true } },
  purchase: { select: { id: true, purchaseNumber: true } },
  createdBy: { select: { id: true, username: true } },
  items: { include: { product: { select: { id: true, sku: true, productName: true } } } },
} satisfies Prisma.PurchaseReturnInclude;

type PurchaseReturnRow = Prisma.PurchaseReturnGetPayload<{ include: typeof returnListInclude }>;

function toPurchaseReturnDto(purchaseReturn: PurchaseReturnRow) {
  return {
    id: purchaseReturn.id,
    purchaseId: purchaseReturn.purchase.id,
    purchaseNumber: purchaseReturn.purchase.purchaseNumber,
    supplierId: purchaseReturn.supplier.id,
    supplier: purchaseReturn.supplier.supplierName,
    returnDate: purchaseReturn.returnDate,
    returnAmount: purchaseReturn.returnAmount,
    reason: purchaseReturn.reason,
    createdBy: purchaseReturn.createdBy?.username ?? null,
    items: purchaseReturn.items.map((item) => ({
      productId: item.productId,
      sku: item.product.sku,
      name: item.product.productName,
      quantity: item.quantity,
      reason: item.reason,
    })),
    createdAt: purchaseReturn.createdAt,
  };
}

export interface ListPurchaseReturnsInput extends PaginationQuery {
  purchaseId?: string;
  supplierId?: string;
  startDate?: Date;
  endDate?: Date;
}

/** GET /api/v1/purchase-returns (API Spec Chapter 33.1). */
export async function listPurchaseReturns(input: ListPurchaseReturnsInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.PurchaseReturnWhereInput = {
    ...(input.purchaseId ? { purchaseId: input.purchaseId } : {}),
    ...(input.supplierId ? { supplierId: input.supplierId } : {}),
    ...(input.startDate || input.endDate
      ? { returnDate: { ...(input.startDate ? { gte: input.startDate } : {}), ...(input.endDate ? { lte: input.endDate } : {}) } }
      : {}),
  };

  const [returns, total] = await Promise.all([
    prisma.purchaseReturn.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: returnListInclude }),
    prisma.purchaseReturn.count({ where }),
  ]);

  return { data: returns.map(toPurchaseReturnDto), pagination: buildPaginationMeta(page, limit, total) };
}

export interface CreatePurchaseReturnItemInput {
  productId: string;
  quantity: number;
  reason?: string;
}

export interface CreatePurchaseReturnInput {
  purchaseId: string;
  supplierId: string;
  items: CreatePurchaseReturnItemInput[];
  refundAmount?: number;
}

/**
 * POST /api/v1/purchase-returns (API Spec Chapter 33.2). Follows the doc's
 * process flow: reduce stock → update supplier balance → create return
 * record — all inside one transaction (SAD Chapter 22).
 */
export async function createPurchaseReturn(input: CreatePurchaseReturnInput, createdById: string) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: input.purchaseId },
    include: { items: { include: { product: true } } },
  });
  if (!purchase) throw new NotFoundError("Purchase not found.");
  if (purchase.supplierId !== input.supplierId) {
    throw new BadRequestError("supplierId does not match this purchase's supplier.");
  }

  const alreadyReturned = await prisma.purchaseReturnItem.groupBy({
    by: ["productId"],
    where: { purchaseReturn: { purchaseId: input.purchaseId } },
    _sum: { quantity: true },
  });
  const alreadyReturnedByProduct = new Map(alreadyReturned.map((r) => [r.productId, r._sum.quantity ?? 0]));

  let computedAmount = 0;
  const imeisToRelease: string[] = [];

  for (const item of input.items) {
    const purchasedLines = purchase.items.filter((pi) => pi.productId === item.productId);
    if (purchasedLines.length === 0) throw new BadRequestError(`Product ${item.productId} was not part of this purchase.`);

    const purchasedQty = purchasedLines.reduce((sum, pi) => sum + pi.quantity, 0);
    const returnedQty = alreadyReturnedByProduct.get(item.productId) ?? 0;
    if (item.quantity > purchasedQty - returnedQty) {
      throw new ConflictError(
        `Cannot return ${item.quantity} of "${purchasedLines[0]!.product.productName}" — only ${purchasedQty - returnedQty} remaining.`,
      );
    }

    computedAmount += item.quantity * Number(purchasedLines[0]!.purchasePrice);

    if (purchasedLines[0]!.product.tracksImei) {
      const availableImeis = await prisma.imeiNumber.findMany({
        where: { productId: item.productId, purchaseId: input.purchaseId, status: "AVAILABLE" },
        take: item.quantity,
      });
      if (availableImeis.length < item.quantity) {
        throw new ConflictError(
          `Cannot return ${item.quantity} of "${purchasedLines[0]!.product.productName}" — only ${availableImeis.length} unsold unit(s) available (sold units can't be returned to the supplier).`,
        );
      }
      imeisToRelease.push(...availableImeis.map((i) => i.id));
    }
  }

  const refundAmount = input.refundAmount ?? computedAmount;

  const returnId = await prisma.$transaction(async (tx) => {
    const purchaseReturn = await tx.purchaseReturn.create({
      data: {
        purchaseId: input.purchaseId,
        supplierId: input.supplierId,
        returnDate: new Date(),
        returnAmount: refundAmount,
        reason: input.items.map((i) => i.reason).filter(Boolean).join("; ") || null,
        createdById,
      },
    });

    await tx.purchaseReturnItem.createMany({
      data: input.items.map((item) => ({
        purchaseReturnId: purchaseReturn.id,
        productId: item.productId,
        quantity: item.quantity,
        ...(item.reason ? { reason: item.reason } : {}),
      })),
    });

    for (const item of input.items) {
      const inventory = await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity }, availableQuantity: { decrement: item.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          productId: item.productId,
          transactionType: "PURCHASE_RETURN",
          quantity: -item.quantity,
          referenceNumber: purchase.purchaseNumber,
          createdById,
        },
      });
    }

    // The physical devices left with the supplier — they're no longer part
    // of our inventory, same treatment as deletePurchase's IMEI reversal.
    if (imeisToRelease.length > 0) {
      await tx.imeiNumber.deleteMany({ where: { id: { in: imeisToRelease } } });
    }

    // Returning stock reduces what we owe the supplier (or creates a credit
    // if already paid in full — DDD process flow: "Update Supplier Balance").
    await tx.supplier.update({
      where: { id: input.supplierId },
      data: { outstandingBalance: { decrement: refundAmount } },
    });

    return purchaseReturn.id;
  });

  const created = await prisma.purchaseReturn.findUniqueOrThrow({ where: { id: returnId }, include: returnListInclude });
  return toPurchaseReturnDto(created);
}
