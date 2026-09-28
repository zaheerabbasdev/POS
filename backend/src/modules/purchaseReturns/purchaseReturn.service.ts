import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import { round2 } from "../../common/utils/money.js";
import { getPurchaseBalance, purchasePaymentStatus } from "../purchases/purchaseBalance.js";

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
export async function listPurchaseReturns(shopId: string, input: ListPurchaseReturnsInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.PurchaseReturnWhereInput = {
    shopId,
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
  // IMEI-tracked products only: which specific phone(s) go back to the
  // supplier (e.g. the faulty one). Optional — without it, any unsold
  // unit(s) from this purchase are used.
  imeis?: string[];
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
 *
 * - Only stock still on the shelf can go back: returning 10 covers when 8
 *   were already sold is refused instead of driving stock below zero.
 * - Returned units are valued at what was actually paid for them (line and
 *   purchase-level discounts included), so the supplier isn't credited more
 *   than the shop was charged.
 * - The return reduces what's still owed on this purchase (see
 *   getPurchaseBalance), so it can't be paid for again later.
 */
export async function createPurchaseReturn(shopId: string, input: CreatePurchaseReturnInput, createdById: string) {
  const seenProducts = new Set<string>();
  for (const item of input.items) {
    if (seenProducts.has(item.productId)) {
      throw new BadRequestError("Each product can only appear once in a return — combine the quantities into one line.");
    }
    seenProducts.add(item.productId);
  }

  const returnId = await prisma.$transaction(
    async (tx) => {
      // Lock the purchase so two returns of it at once can't both pass the
      // "not more than was bought" check.
      await tx.$queryRaw`SELECT id FROM purchases WHERE id = ${input.purchaseId}::uuid AND shop_id = ${shopId}::uuid FOR UPDATE`;

      const purchase = await tx.purchase.findFirst({
        where: { id: input.purchaseId, shopId },
        include: { items: { include: { product: true } } },
      });
      if (!purchase) throw new NotFoundError("Purchase not found.");
      if (purchase.supplierId !== input.supplierId) {
        throw new BadRequestError("supplierId does not match this purchase's supplier.");
      }

      const alreadyReturned = await tx.purchaseReturnItem.groupBy({
        by: ["productId"],
        where: { shopId, purchaseReturn: { purchaseId: input.purchaseId } },
        _sum: { quantity: true },
      });
      const alreadyReturnedByProduct = new Map(alreadyReturned.map((r) => [r.productId, r._sum.quantity ?? 0]));

      // Goods value excludes shipping; the purchase-level discount is spread
      // across lines in proportion to each line's own total.
      const sumLineTotals = purchase.items.reduce((sum, pi) => sum + Number(pi.lineTotal), 0);
      const goodsTotal = Number(purchase.totalAmount) - Number(purchase.shippingCost);
      const factor = sumLineTotals > 0 ? goodsTotal / sumLineTotals : 0;

      let computedAmount = 0;
      const imeisToRelease: string[] = [];

      for (const item of input.items) {
        const purchasedLines = purchase.items.filter((pi) => pi.productId === item.productId);
        if (purchasedLines.length === 0) throw new BadRequestError(`Product ${item.productId} was not part of this purchase.`);
        const product = purchasedLines[0]!.product;

        const purchasedQty = purchasedLines.reduce((sum, pi) => sum + pi.quantity, 0);
        const returnedQty = alreadyReturnedByProduct.get(item.productId) ?? 0;
        if (item.quantity > purchasedQty - returnedQty) {
          throw new ConflictError(
            `Cannot return ${item.quantity} of "${product.productName}" — only ${purchasedQty - returnedQty} remaining.`,
          );
        }

        const linesValue = purchasedLines.reduce((sum, pi) => sum + Number(pi.lineTotal), 0) * factor;
        computedAmount += item.quantity * (purchasedQty > 0 ? linesValue / purchasedQty : 0);

        if (product.tracksImei) {
          const where: Prisma.ImeiNumberWhereInput = {
            productId: item.productId,
            purchaseId: input.purchaseId,
            status: "AVAILABLE",
            shopId,
            ...(item.imeis && item.imeis.length > 0 ? { imeiNumber: { in: item.imeis } } : {}),
          };
          if (item.imeis && item.imeis.length > 0 && item.imeis.length !== item.quantity) {
            throw new BadRequestError(`Pick exactly ${item.quantity} IMEI number(s) for "${product.productName}".`);
          }
          const availableImeis = await tx.imeiNumber.findMany({ where, take: item.quantity });
          if (availableImeis.length < item.quantity) {
            throw new ConflictError(
              item.imeis && item.imeis.length > 0
                ? `Some of the picked IMEIs for "${product.productName}" aren't in stock from this purchase (already sold, or not from this purchase).`
                : `Cannot return ${item.quantity} of "${product.productName}" — only ${availableImeis.length} unsold unit(s) available (sold units can't be returned to the supplier).`,
            );
          }
          imeisToRelease.push(...availableImeis.map((i) => i.id));
        }
      }

      const alreadyReturnedValue = await tx.purchaseReturn.aggregate({
        where: { shopId, purchaseId: purchase.id },
        _sum: { returnAmount: true },
      });
      const maxReturnable = round2(Number(purchase.totalAmount) - Number(alreadyReturnedValue._sum.returnAmount ?? 0));
      const refundAmount = round2(Math.min(input.refundAmount ?? computedAmount, maxReturnable));

      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          shopId,
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
          shopId,
          purchaseReturnId: purchaseReturn.id,
          productId: item.productId,
          quantity: item.quantity,
          ...(item.reason ? { reason: item.reason } : {}),
        })),
      });

      for (const item of input.items) {
        // Atomic: only goes through if that many units are still on the
        // shelf right now — sold stock can't be sent back to the supplier.
        const updated = await tx.inventory.updateMany({
          where: { productId: item.productId, shopId, availableQuantity: { gte: item.quantity } },
          data: { quantity: { decrement: item.quantity }, availableQuantity: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          const product = purchase.items.find((pi) => pi.productId === item.productId)!.product;
          throw new ConflictError(
            `Cannot return ${item.quantity} of "${product.productName}" — not that many left in stock (some were already sold).`,
          );
        }
        const inventory = await tx.inventory.findFirstOrThrow({ where: { productId: item.productId, shopId } });
        await tx.inventoryTransaction.create({
          data: {
            shopId,
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
        await tx.imeiNumber.deleteMany({ where: { id: { in: imeisToRelease }, shopId } });
      }

      // Returning stock reduces what we owe the supplier (or creates a credit
      // if already paid in full — DDD process flow: "Update Supplier Balance").
      await tx.supplier.update({
        where: { id: input.supplierId },
        data: { outstandingBalance: { decrement: refundAmount } },
      });

      const { paid, due } = await getPurchaseBalance(tx, shopId, purchase);
      await tx.purchase.update({
        where: { id: purchase.id },
        data: { paymentStatus: purchasePaymentStatus(paid, due) },
      });

      return purchaseReturn.id;
    },
    { timeout: 15_000 },
  );

  const created = await prisma.purchaseReturn.findFirstOrThrow({ where: { id: returnId, shopId }, include: returnListInclude });
  return toPurchaseReturnDto(created);
}
