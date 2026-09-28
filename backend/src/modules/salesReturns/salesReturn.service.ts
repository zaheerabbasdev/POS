import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PAYMENT_METHOD_INPUT_MAP } from "../../common/utils/paymentMethod.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import { round2 } from "../../common/utils/money.js";
import { recordDrawerMovement } from "../cashDrawer/cashDrawer.service.js";
import { computeHeldQuantities, computeUnitValues, paymentStatusFor } from "../sales/saleReturnState.js";

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
    // Value of the goods that came back (what the customer was actually
    // charged for them). Part of it may have cleared an unpaid balance
    // instead of being paid out — the REFUND payment row on the sale holds
    // the cash actually handed back.
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
  // IMEI-tracked products only: which specific phone(s) are coming back.
  // Optional — without it, the first unit(s) still with the customer are used.
  imeis?: string[];
}

export interface CreateSalesReturnInput {
  saleId: string;
  items: CreateSalesReturnItemInput[];
  refundMethod: string;
}

const saleForReturnInclude = {
  items: { include: { product: true, imeiNumber: true, warranty: true } },
} satisfies Prisma.SaleInclude;

type SaleForReturn = Prisma.SaleGetPayload<{ include: typeof saleForReturnInclude }>;
type SaleLine = SaleForReturn["items"][number];

/**
 * POST /api/v1/sales-returns (API Spec Chapter 35.2). Follows the doc's
 * Return Workflow: verify invoice → receive product → increase stock →
 * process refund — all inside one transaction (SAD Chapter 22).
 *
 * Money rules:
 * - Each returned unit is valued at what the customer was actually charged
 *   for it (line discount and invoice discount included), never list price.
 * - That value first reduces whatever the customer still owes on this sale;
 *   only the rest is paid back. A credit sale with nothing paid gives back
 *   no cash at all — it just clears the debt for the returned items.
 * - The sale's paid/due amounts are updated, so a later payment, a second
 *   return, or a cancellation all see the correct remaining figures.
 */
export async function createSalesReturn(shopId: string, input: CreateSalesReturnInput, approvedById: string) {
  const method = PAYMENT_METHOD_INPUT_MAP[input.refundMethod];
  if (!method) throw new BadRequestError(`Unknown refund method "${input.refundMethod}".`);

  const seenProducts = new Set<string>();
  for (const item of input.items) {
    if (seenProducts.has(item.productId)) {
      throw new BadRequestError("Each product can only appear once in a return — combine the quantities into one line.");
    }
    seenProducts.add(item.productId);
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // Lock the sale row until this transaction ends: a second return or a
      // cancellation of the same sale waits here, so two of them can never
      // both count the same units as "still with the customer".
      await tx.$queryRaw`SELECT id FROM sales WHERE id = ${input.saleId}::uuid AND shop_id = ${shopId}::uuid FOR UPDATE`;

      const sale = await tx.sale.findFirst({ where: { id: input.saleId, shopId }, include: saleForReturnInclude });
      if (!sale) throw new NotFoundError("Sale not found.");
      if (sale.isCancelled) throw new BadRequestError("This sale was cancelled — nothing to return.");

      const alreadyReturned = await tx.salesReturnItem.groupBy({
        by: ["productId"],
        where: { shopId, salesReturn: { saleId: sale.id } },
        _sum: { quantity: true },
      });
      const held = computeHeldQuantities(
        sale.id,
        sale.items,
        new Map(alreadyReturned.map((r) => [r.productId, r._sum.quantity ?? 0])),
      );
      const unitValues = computeUnitValues(sale.items, sale.totalAmount);

      const allocations = allocateReturn(sale, input.items, held);

      const heldAfter = new Map(held);
      for (const alloc of allocations) heldAfter.set(alloc.line.id, (heldAfter.get(alloc.line.id) ?? 0) - alloc.quantity);
      const nothingLeftWithCustomer = [...heldAfter.values()].every((qty) => qty <= 0);

      const due = Number(sale.dueAmount);
      const paid = Number(sale.paidAmount);
      const computedValue = round2(
        allocations.reduce((sum, alloc) => sum + alloc.quantity * (unitValues.get(alloc.line.id) ?? 0), 0),
      );
      // Never more than what's still open on the sale (paid + owed). When the
      // last unit comes back, use that exact remainder so a rounding cent
      // isn't left behind.
      const remainder = round2(due + paid);
      const returnValue =
        nothingLeftWithCustomer && Math.abs(remainder - computedValue) < 0.05 ? remainder : Math.min(computedValue, remainder);
      const creditApplied = round2(Math.min(returnValue, due));
      const cashRefund = round2(Math.min(returnValue - creditApplied, paid));
      const newDue = round2(due - creditApplied);
      const newPaid = round2(paid - cashRefund);

      const salesReturn = await tx.salesReturn.create({
        data: {
          shopId,
          saleId: sale.id,
          customerId: sale.customerId,
          returnDate: new Date(),
          refundAmount: returnValue,
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

      for (const productId of new Set(allocations.map((a) => a.line.productId))) {
        const totalQty = allocations.filter((a) => a.line.productId === productId).reduce((sum, a) => sum + a.quantity, 0);

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

      for (const alloc of allocations) {
        // Back to AVAILABLE (not "RETURNED") so the phone re-enters the
        // sellable pool — same treatment as cancelSale.
        if (alloc.line.imeiNumber) {
          await tx.imeiNumber.update({
            where: { id: alloc.line.imeiNumber.id },
            data: { status: "AVAILABLE", saleId: null },
          });
        }
        if (alloc.line.warranty?.warrantyStatus === "ACTIVE" && (heldAfter.get(alloc.line.id) ?? 0) <= 0) {
          await tx.warranty.update({ where: { id: alloc.line.warranty.id }, data: { warrantyStatus: "CANCELLED" } });
        }
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { paidAmount: newPaid, dueAmount: newDue, paymentStatus: paymentStatusFor(newPaid, newDue) },
      });

      if (cashRefund > 0) {
        await tx.payment.create({
          data: {
            shopId,
            paymentType: "REFUND",
            referenceId: sale.id,
            paymentMethod: method,
            paymentDate: new Date(),
            amount: cashRefund,
            notes: "Sales return refund",
            receivedById: approvedById,
          },
        });

        if (method === "CASH") {
          await recordDrawerMovement(tx, shopId, approvedById, "REFUND", cashRefund, sale.invoiceNumber);
        }
      }

      if (sale.customerId && creditApplied > 0) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { outstandingBalance: { decrement: creditApplied } },
        });
      }

      return { returnId: salesReturn.id, creditApplied, cashRefund };
    },
    { timeout: 15_000 },
  );

  const created = await prisma.salesReturn.findFirstOrThrow({ where: { id: result.returnId, shopId }, include: returnListInclude });
  return { ...toSalesReturnDto(created), creditApplied: result.creditApplied, cashRefunded: result.cashRefund };
}

/**
 * Decides exactly which sold lines the requested return quantities come
 * from, using only units still with the customer. For phones, the caller
 * can name the exact IMEI(s); otherwise the first unit(s) still held are
 * used.
 */
function allocateReturn(sale: SaleForReturn, items: CreateSalesReturnItemInput[], held: Map<string, number>) {
  const allocations: { line: SaleLine; quantity: number }[] = [];

  for (const item of items) {
    const lines = sale.items.filter((si) => si.productId === item.productId).sort((a, b) => a.id.localeCompare(b.id));
    if (lines.length === 0) throw new BadRequestError(`Product ${item.productId} was not part of this sale.`);
    const productName = lines[0]!.product.productName;

    const heldQty = lines.reduce((sum, line) => sum + (held.get(line.id) ?? 0), 0);
    if (item.quantity > heldQty) {
      throw new ConflictError(`Cannot return ${item.quantity} of "${productName}" — only ${heldQty} still with the customer.`);
    }

    if (lines[0]!.imeiId) {
      let chosen: SaleLine[];
      if (item.imeis && item.imeis.length > 0) {
        if (item.imeis.length !== item.quantity) {
          throw new BadRequestError(`Pick exactly ${item.quantity} IMEI number(s) for "${productName}".`);
        }
        if (new Set(item.imeis).size !== item.imeis.length) {
          throw new BadRequestError(`The same IMEI was picked more than once for "${productName}".`);
        }
        chosen = item.imeis.map((imei) => {
          const line = lines.find((l) => l.imeiNumber?.imeiNumber === imei && (held.get(l.id) ?? 0) > 0);
          if (!line) throw new BadRequestError(`IMEI ${imei} is not part of this sale, or was already returned.`);
          return line;
        });
      } else {
        chosen = lines.filter((l) => (held.get(l.id) ?? 0) > 0).slice(0, item.quantity);
      }
      for (const line of chosen) allocations.push({ line, quantity: line.quantity });
      continue;
    }

    let remaining = item.quantity;
    for (const line of lines) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, held.get(line.id) ?? 0);
      if (take <= 0) continue;
      allocations.push({ line, quantity: take });
      remaining -= take;
    }
  }

  return allocations;
}
