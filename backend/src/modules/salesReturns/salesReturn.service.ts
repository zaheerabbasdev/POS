import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PAYMENT_METHOD_INPUT_MAP } from "../../common/utils/paymentMethod.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import { recordDrawerMovement } from "../cashDrawer/cashDrawer.service.js";

const returnListInclude = {
  customer: { select: { id: true, firstName: true, lastName: true } },
  sale: { select: { id: true, invoiceNumber: true } },
  approvedBy: { select: { id: true, username: true } },
  items: { include: { product: { select: { id: true, sku: true, productName: true } } } },
} satisfies Prisma.SalesReturnInclude;

type SalesReturnRow = Prisma.SalesReturnGetPayload<{ include: typeof returnListInclude }>;

function toSalesReturnDto(salesReturn: SalesReturnRow) {
  return {
    id: salesReturn.id,
    saleId: salesReturn.sale.id,
    invoiceNumber: salesReturn.sale.invoiceNumber,
    customer: salesReturn.customer
      ? [salesReturn.customer.firstName, salesReturn.customer.lastName].filter(Boolean).join(" ")
      : "Walk-in",
    returnDate: salesReturn.returnDate,
    refundAmount: salesReturn.refundAmount,
    returnReason: salesReturn.returnReason,
    approvedBy: salesReturn.approvedBy?.username ?? null,
    items: salesReturn.items.map((item) => ({
      productId: item.productId,
      sku: item.product.sku,
      name: item.product.productName,
      quantity: item.quantity,
      reason: item.reason,
    })),
    createdAt: salesReturn.createdAt,
  };
}

export interface ListSalesReturnsInput extends PaginationQuery {
  saleId?: string;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
}

/** GET /api/v1/sales-returns (API Spec Chapter 35.1). */
export async function listSalesReturns(shopId: string, input: ListSalesReturnsInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.SalesReturnWhereInput = {
    shopId,
    ...(input.saleId ? { saleId: input.saleId } : {}),
    ...(input.customerId ? { customerId: input.customerId } : {}),
    ...(input.startDate || input.endDate
      ? { returnDate: { ...(input.startDate ? { gte: input.startDate } : {}), ...(input.endDate ? { lte: input.endDate } : {}) } }
      : {}),
  };

  const [returns, total] = await Promise.all([
    prisma.salesReturn.findMany({ where, skip, take, orderBy: { createdAt: "desc" }, include: returnListInclude }),
    prisma.salesReturn.count({ where }),
  ]);

  return { data: returns.map(toSalesReturnDto), pagination: buildPaginationMeta(page, limit, total) };
}

export interface CreateSalesReturnItemInput {
  productId: string;
  quantity: number;
  reason?: string;
}

export interface CreateSalesReturnInput {
  saleId: string;
  items: CreateSalesReturnItemInput[];
  refundMethod: string;
}

/**
 * POST /api/v1/sales-returns (API Spec Chapter 35.2). Follows the doc's
 * Return Workflow: verify invoice → receive product → increase stock →
 * process refund — all inside one transaction (SAD Chapter 22).
 */
export async function createSalesReturn(shopId: string, input: CreateSalesReturnInput, approvedById: string) {
  const sale = await prisma.sale.findFirst({
    where: { id: input.saleId, shopId },
    include: { items: { include: { product: true, imeiNumber: true, warranty: true } } },
  });
  if (!sale) throw new NotFoundError("Sale not found.");
  if (sale.isCancelled) throw new BadRequestError("This sale was cancelled — nothing to return.");

  const alreadyReturned = await prisma.salesReturnItem.groupBy({
    by: ["productId"],
    where: { shopId, salesReturn: { saleId: input.saleId } },
    _sum: { quantity: true },
  });
  const alreadyReturnedByProduct = new Map(alreadyReturned.map((r) => [r.productId, r._sum.quantity ?? 0]));

  let refundAmount = 0;
  const method = PAYMENT_METHOD_INPUT_MAP[input.refundMethod];
  if (!method) throw new BadRequestError(`Unknown refund method "${input.refundMethod}".`);

  // For each requested product, greedily allocate the returned quantity
  // across that product's sold line(s) (IMEI-tracked products sell as
  // quantity-1 lines) to price the refund and find which units to restore.
  const allocations: { saleItemId: string; productId: string; quantity: number; unitPrice: number }[] = [];

  for (const item of input.items) {
    const soldLines = sale.items.filter((si) => si.productId === item.productId);
    if (soldLines.length === 0) throw new BadRequestError(`Product ${item.productId} was not part of this sale.`);

    const soldQty = soldLines.reduce((sum, si) => sum + si.quantity, 0);
    const returnedQty = alreadyReturnedByProduct.get(item.productId) ?? 0;
    if (item.quantity > soldQty - returnedQty) {
      throw new ConflictError(
        `Cannot return ${item.quantity} of "${soldLines[0]!.product.productName}" — only ${soldQty - returnedQty} remaining.`,
      );
    }

    let remaining = item.quantity;
    for (const line of soldLines) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, line.quantity);
      allocations.push({ saleItemId: line.id, productId: item.productId, quantity: take, unitPrice: Number(line.sellingPrice) });
      refundAmount += take * Number(line.sellingPrice);
      remaining -= take;
    }
  }

  const returnId = await prisma.$transaction(async (tx) => {
    const salesReturn = await tx.salesReturn.create({
      data: {
        shopId,
        saleId: input.saleId,
        customerId: sale.customerId,
        returnDate: new Date(),
        refundAmount,
        returnReason: input.items.map((i) => i.reason).filter(Boolean).join("; ") || null,
        approvedById,
      },
    });

    await tx.salesReturnItem.createMany({
      data: input.items.map((item) => ({
        shopId,
        salesReturnId: salesReturn.id,
        productId: item.productId,
        quantity: item.quantity,
        ...(item.reason ? { reason: item.reason } : {}),
      })),
    });

    for (const productId of new Set(allocations.map((a) => a.productId))) {
      const totalQty = allocations.filter((a) => a.productId === productId).reduce((sum, a) => sum + a.quantity, 0);

      const inventory = await tx.inventory.update({
        where: { productId },
        data: { quantity: { increment: totalQty }, availableQuantity: { increment: totalQty } },
      });
      await tx.inventoryTransaction.create({
        data: {
          shopId,
          inventoryId: inventory.id,
          productId,
          transactionType: "SALES_RETURN",
          quantity: totalQty,
          referenceNumber: sale.invoiceNumber,
          createdById: approvedById,
        },
      });
    }

    // IMEI-tracked lines sell one-per-line — release the specific units this
    // return covers back to AVAILABLE and cancel their warranty, same as a
    // sale cancellation does.
    for (const alloc of allocations) {
      const saleItem = sale.items.find((si) => si.id === alloc.saleItemId);
      if (saleItem?.imeiNumber) {
        // Back to AVAILABLE (not "RETURNED") so it re-enters the sellable
        // pool — same treatment as cancelSale's inventory reversal.
        await tx.imeiNumber.update({
          where: { id: saleItem.imeiNumber.id },
          data: { status: "AVAILABLE", saleId: null },
        });
      }
      if (saleItem?.warranty) {
        await tx.warranty.update({ where: { id: saleItem.warranty.id }, data: { warrantyStatus: "CANCELLED" } });
      }
    }

    await tx.payment.create({
      data: {
        shopId,
        paymentType: "REFUND",
        referenceId: sale.id,
        paymentMethod: method,
        paymentDate: new Date(),
        amount: refundAmount,
        notes: "Sales return refund",
        receivedById: approvedById,
      },
    });

    if (method === "CASH") {
      await recordDrawerMovement(tx, shopId, approvedById, "REFUND", refundAmount, sale.invoiceNumber);
    }

    if (sale.customerId) {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { outstandingBalance: { decrement: Math.min(refundAmount, Number(sale.dueAmount)) } },
      });
    }

    return salesReturn.id;
  });

  const created = await prisma.salesReturn.findFirstOrThrow({ where: { id: returnId, shopId }, include: returnListInclude });
  return toSalesReturnDto(created);
}
