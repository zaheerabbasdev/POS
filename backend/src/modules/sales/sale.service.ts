import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { generateCode } from "../../common/utils/code.js";
import { PAYMENT_METHOD_INPUT_MAP } from "../../common/utils/paymentMethod.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { AppError, BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import { MONEY_EPSILON, round2 } from "../../common/utils/money.js";
import type { PaymentMethod } from "../../generated/prisma/client.js";
import { recordDrawerMovement } from "../cashDrawer/cashDrawer.service.js";
import { computeHeldQuantities, computeUnitValues } from "./saleReturnState.js";

const saleListSelect = {
  id: true,
  invoiceNumber: true,
  saleDate: true,
  totalAmount: true,
  paymentStatus: true,
  isCancelled: true,
  customer: { select: { id: true, firstName: true, lastName: true } },
  cashier: { select: { id: true, username: true } },
} satisfies Prisma.SaleSelect;

type SaleListRow = Prisma.SaleGetPayload<{ select: typeof saleListSelect }>;

function toSaleListItem(sale: SaleListRow) {
  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    customerId: sale.customer?.id ?? null,
    customer: sale.customer ? [sale.customer.firstName, sale.customer.lastName].filter(Boolean).join(" ") : "Walk-in",
    cashier: sale.cashier?.username ?? null,
    totalAmount: sale.totalAmount,
    status: sale.paymentStatus,
    isCancelled: sale.isCancelled,
    saleDate: sale.saleDate,
  };
}

const saleDetailInclude = {
  customer: true,
  cashier: { select: { id: true, username: true } },
  items: {
    include: {
      product: { select: { id: true, sku: true, productName: true } },
      imeiNumber: { select: { id: true, imeiNumber: true, saleId: true } },
      warranty: true,
    },
  },
} satisfies Prisma.SaleInclude;

type SaleDetailRow = Prisma.SaleGetPayload<{ include: typeof saleDetailInclude }>;

async function toSaleDetailDto(shopId: string, sale: SaleDetailRow) {
  const [payments, returned] = await Promise.all([
    prisma.payment.findMany({
      where: { shopId, referenceId: sale.id, paymentType: { in: ["SALE_PAYMENT", "REFUND"] } },
      orderBy: { paymentDate: "desc" },
    }),
    prisma.salesReturnItem.groupBy({
      by: ["productId"],
      where: { shopId, salesReturn: { saleId: sale.id } },
      _sum: { quantity: true },
    }),
  ]);
  const held = computeHeldQuantities(
    sale.id,
    sale.items,
    new Map(returned.map((r) => [r.productId, r._sum.quantity ?? 0])),
  );

  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNumber,
    saleDate: sale.saleDate,
    customer: sale.customer
      ? {
          id: sale.customer.id,
          code: sale.customer.customerCode,
          name: [sale.customer.firstName, sale.customer.lastName].filter(Boolean).join(" "),
          phone: sale.customer.phone,
        }
      : null,
    cashier: sale.cashier?.username ?? null,
    items: sale.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      sku: item.product.sku,
      name: item.product.productName,
      quantity: item.quantity,
      price: item.sellingPrice,
      discount: item.discount,
      tax: item.tax,
      lineTotal: item.lineTotal,
      imei: item.imeiNumber?.imeiNumber ?? null,
      // Units of this line already brought back (0 for a cancelled sale's
      // lines too — cancellation isn't a return).
      returnedQuantity: sale.isCancelled ? 0 : item.quantity - (held.get(item.id) ?? item.quantity),
      warranty: item.warranty
        ? {
            warrantyNumber: item.warranty.id,
            periodMonths: item.warranty.warrantyPeriodMonths,
            startDate: item.warranty.startDate,
            expiryDate: item.warranty.expiryDate,
            status: item.warranty.warrantyStatus,
          }
        : null,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    tax: sale.tax,
    totalAmount: sale.totalAmount,
    paidAmount: sale.paidAmount,
    dueAmount: sale.dueAmount,
    status: sale.paymentStatus,
    isCancelled: sale.isCancelled,
    cancelledAt: sale.cancelledAt,
    cancelReason: sale.cancelReason,
    remarks: sale.remarks,
    payments: payments.map((p) => ({
      id: p.id,
      type: p.paymentType,
      amount: p.amount,
      method: p.paymentMethod,
      date: p.paymentDate,
      notes: p.notes,
    })),
    createdAt: sale.createdAt,
  };
}

export interface ListSalesInput extends PaginationQuery {
  customerId?: string;
  employeeId?: string;
  status?: "PAID" | "PARTIAL" | "UNPAID";
  invoiceNumber?: string;
  startDate?: Date;
  endDate?: Date;
}

/** GET /api/v1/sales (API Spec Chapter 34.1). */
export async function listSales(shopId: string, input: ListSalesInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.SaleWhereInput = {
    shopId,
    ...(input.customerId ? { customerId: input.customerId } : {}),
    ...(input.employeeId ? { cashierId: input.employeeId } : {}),
    ...(input.status ? { paymentStatus: input.status } : {}),
    ...(input.invoiceNumber ? { invoiceNumber: { contains: input.invoiceNumber, mode: "insensitive" } } : {}),
    ...(input.startDate || input.endDate
      ? { saleDate: { ...(input.startDate ? { gte: input.startDate } : {}), ...(input.endDate ? { lte: input.endDate } : {}) } }
      : {}),
  };

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({ where, skip, take, orderBy: { saleDate: "desc" }, select: saleListSelect }),
    prisma.sale.count({ where }),
  ]);

  return { data: sales.map(toSaleListItem), pagination: buildPaginationMeta(page, limit, total) };
}

/** GET /api/v1/sales/{id} (API Spec Chapter 34.2). */
export async function getSaleById(shopId: string, id: string) {
  const sale = await prisma.sale.findFirst({ where: { id, shopId }, include: saleDetailInclude });
  if (!sale) throw new NotFoundError("Sale not found.");
  return toSaleDetailDto(shopId, sale);
}

export interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  price: number;
  discount?: number;
  tax?: number;
  imei?: string;
}

export interface CreateSaleInput {
  customerId?: string;
  items: CreateSaleItemInput[];
  discount?: number;
  // A sale can be split across more than one method (e.g. part cash, part
  // card) — each entry becomes its own Payment record.
  payments?: { method: string; paidAmount: number }[];
  remarks?: string;
}

const CREATE_SALE_MAX_ATTEMPTS = 3;
const CREATE_SALE_RETRY_DELAY_MS = 150;

/**
 * POST /api/v1/sales (API Spec Chapter 34.3). Follows the doc's Sale
 * Processing Flow: validate stock → validate IMEI → create invoice →
 * decrease stock → update IMEI status → create warranty → receive payment —
 * all inside one transaction (SAD Chapter 22).
 *
 * Wrapped with a small retry loop: under real concurrency (two cashiers
 * racing for the same last unit) the database layer can surface a
 * transient error — e.g. a "bind message" protocol error — that has
 * nothing to do with the actual business outcome. A thrown AppError
 * (BadRequestError/ConflictError/NotFoundError) is a deliberate, correct
 * result — e.g. "not enough stock" — and is never retried, it propagates
 * immediately. Anything else (a genuine transient DB hiccup) gets a
 * couple of quick retries before giving up.
 */
export async function createSale(shopId: string, input: CreateSaleInput, cashierId: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= CREATE_SALE_MAX_ATTEMPTS; attempt++) {
    try {
      return await attemptCreateSale(shopId, input, cashierId);
    } catch (err) {
      if (err instanceof AppError) throw err;
      lastError = err;
      if (attempt < CREATE_SALE_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, CREATE_SALE_RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}

async function attemptCreateSale(shopId: string, input: CreateSaleInput, cashierId: string) {
  if (input.customerId) {
    const customer = await prisma.customer.findFirst({ where: { id: input.customerId, shopId } });
    if (!customer) throw new NotFoundError("Customer not found.");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: input.items.map((item) => item.productId) }, shopId },
    include: { inventory: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const imeiByItemIndex = new Map<number, { id: string; warrantyMonths: number | null }>();

  for (const [index, item] of input.items.entries()) {
    const product = productMap.get(item.productId);
    if (!product) throw new NotFoundError(`Product ${item.productId} not found.`);
    if (!product.isActive) throw new BadRequestError(`"${product.productName}" is inactive and cannot be sold.`);
    if ((item.discount ?? 0) > item.quantity * item.price) {
      throw new BadRequestError(`The discount on "${product.productName}" is more than its price.`);
    }

    // Fast-fail pre-check — catches the common single-cashier case with a
    // friendly error before a Sale row even gets created. This is NOT the
    // authoritative guard: two cashiers can both pass this check for the
    // same last unit in the same instant, since neither has claimed the
    // stock yet. The real, race-proof guard is the atomic updateMany
    // (WHERE availableQuantity >= quantity) inside the transaction below —
    // that's what actually prevents overselling under concurrency.
    const available = product.inventory?.availableQuantity ?? 0;
    if (available < item.quantity) {
      throw new BadRequestError(
        `Not enough stock for "${product.productName}" — only ${available} available. Please adjust the quantity.`,
      );
    }

    if (product.tracksImei) {
      if (item.quantity !== 1 || !item.imei) {
        throw new BadRequestError(`"${product.productName}" tracks IMEI — quantity must be 1 and imei is required.`);
      }
      const imeiRecord = await prisma.imeiNumber.findFirst({ where: { imeiNumber: item.imei, shopId } });
      if (!imeiRecord || imeiRecord.productId !== item.productId) {
        throw new NotFoundError(`IMEI "${item.imei}" not found for this product.`);
      }
      if (imeiRecord.status !== "AVAILABLE") {
        throw new ConflictError(
          `"${product.productName}" (IMEI ${item.imei}) was just sold in another sale. Please remove it and pick a different unit.`,
        );
      }
      imeiByItemIndex.set(index, { id: imeiRecord.id, warrantyMonths: product.warrantyMonths });
    }
  }

  const subtotal = round2(input.items.reduce((sum, item) => sum + item.quantity * item.price, 0));
  const itemDiscountTotal = input.items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  const itemTaxTotal = round2(input.items.reduce((sum, item) => sum + (item.tax ?? 0), 0));
  const discount = round2((input.discount ?? 0) + itemDiscountTotal);
  const totalAmount = round2(subtotal - discount + itemTaxTotal);
  if (totalAmount < 0) throw new BadRequestError("The discount is larger than the bill total.");

  const { payments, changeGiven } = settlePayments(input.payments ?? [], totalAmount);
  const paidAmount = round2(payments.reduce((sum, p) => sum + p.amount, 0));
  const dueAmount = round2(Math.max(0, totalAmount - paidAmount));
  const paymentStatus = paidAmount <= 0 ? "UNPAID" : dueAmount <= 0 ? "PAID" : "PARTIAL";

  const saleId = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        shopId,
        invoiceNumber: generateCode("INV"),
        ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
        saleDate: new Date(),
        subtotal,
        discount,
        tax: itemTaxTotal,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentStatus,
        cashierId,
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      },
    });

    for (const [index, item] of input.items.entries()) {
      const product = productMap.get(item.productId)!;
      const lineTotal = item.quantity * item.price - (item.discount ?? 0) + (item.tax ?? 0);
      const imeiInfo = imeiByItemIndex.get(index);

      const saleItem = await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          sellingPrice: item.price,
          discount: item.discount ?? 0,
          tax: item.tax ?? 0,
          lineTotal,
          ...(imeiInfo ? { imeiId: imeiInfo.id } : {}),
        },
      });

      // Atomic, race-proof decrement — the WHERE clause re-checks
      // availableQuantity against the current committed row, not the
      // possibly-stale value read before the transaction started. If
      // another concurrent sale already claimed the stock, this matches
      // zero rows and we roll back with a clear error instead of driving
      // availableQuantity negative.
      const inventoryUpdate = await tx.inventory.updateMany({
        where: { productId: item.productId, availableQuantity: { gte: item.quantity } },
        data: { quantity: { decrement: item.quantity }, availableQuantity: { decrement: item.quantity } },
      });
      if (inventoryUpdate.count === 0) {
        throw new ConflictError(
          `Not enough stock for "${product.productName}" — someone else may have just sold it. Please adjust the quantity and try again.`,
        );
      }

      await tx.inventoryTransaction.create({
        data: {
          shopId,
          inventoryId: product.inventory!.id,
          productId: item.productId,
          transactionType: "SALE",
          quantity: -item.quantity,
          referenceNumber: sale.invoiceNumber,
          createdById: cashierId,
        },
      });

      if (imeiInfo) {
        // Same pattern for IMEI — only flip to SOLD if it's still
        // AVAILABLE at this exact moment, closing the equivalent race for
        // IMEI-tracked units (each IMEI is its own unit of stock).
        const imeiUpdate = await tx.imeiNumber.updateMany({
          where: { id: imeiInfo.id, status: "AVAILABLE" },
          data: { status: "SOLD", saleId: sale.id },
        });
        if (imeiUpdate.count === 0) {
          throw new ConflictError(
            `"${product.productName}" (IMEI ${item.imei}) was just sold in another sale. Please remove it and pick a different unit.`,
          );
        }
      }

      // Warranty requires a customer (DDD Table 29 — customer_id is NOT
      // NULL); walk-in sales with no customer simply don't get one, even if
      // the product has warrantyMonths set.
      if (product.warrantyMonths && product.warrantyMonths > 0 && input.customerId) {
        const startDate = new Date();
        const expiryDate = new Date(startDate);
        expiryDate.setMonth(expiryDate.getMonth() + product.warrantyMonths);

        await tx.warranty.create({
          data: {
            shopId,
            saleId: sale.id,
            saleItemId: saleItem.id,
            customerId: input.customerId,
            productId: item.productId,
            ...(imeiInfo ? { imeiId: imeiInfo.id } : {}),
            warrantyType: "Manufacturer",
            warrantyPeriodMonths: product.warrantyMonths,
            startDate,
            expiryDate,
            warrantyStatus: "ACTIVE",
          },
        });

        if (imeiInfo) {
          await tx.imeiNumber.update({
            where: { id: imeiInfo.id },
            data: { warrantyStart: startDate, warrantyEnd: expiryDate },
          });
        }
      }
    }

    // One Payment row per split entry — e.g. "5000 Cash + 3000 Card" becomes
    // two separate records, not one blended one, so payment history/reports
    // accurately show how much came in through each method.
    for (const p of payments) {
      await tx.payment.create({
        data: {
          shopId,
          paymentType: "SALE_PAYMENT",
          referenceId: sale.id,
          paymentMethod: p.method,
          paymentDate: new Date(),
          amount: p.amount,
          receivedById: cashierId,
        },
      });

      // Only cash physically moves through the drawer — best-effort, and
      // silently skipped if the cashier has no session open (SAD Chapter 26:
      // Cash Drawer tracks sessions, it doesn't gate the sale itself).
      if (p.method === "CASH") {
        await recordDrawerMovement(tx, shopId, cashierId, "SALE", p.amount, sale.invoiceNumber);
      }
    }

    if (input.customerId && dueAmount > 0) {
      await tx.customer.update({
        where: { id: input.customerId },
        data: { outstandingBalance: { increment: dueAmount } },
      });
    }

    return sale.id;
  }, { timeout: 15_000 });

  return { ...(await getSaleById(shopId, saleId)), changeGiven };
}

/**
 * Customers often hand over more cash than the bill (a 5,000 note for a
 * 4,200 bill). Only the bill amount is kept as the sale's payment — the
 * extra is change handed straight back, so it never counts as sale money in
 * the drawer or reports. Only cash can produce change: card/bank/wallet
 * amounts over the bill are a typing mistake and are rejected.
 */
function settlePayments(input: { method: string; paidAmount: number }[], totalAmount: number) {
  const payments: { method: PaymentMethod; amount: number }[] = input.map((p) => ({
    method: PAYMENT_METHOD_INPUT_MAP[p.method]!,
    amount: round2(p.paidAmount),
  }));

  const changeGiven = round2(payments.reduce((sum, p) => sum + p.amount, 0) - totalAmount);
  if (changeGiven <= 0) return { payments, changeGiven: 0 };

  const cashTotal = payments.filter((p) => p.method === "CASH").reduce((sum, p) => sum + p.amount, 0);
  if (changeGiven > cashTotal + MONEY_EPSILON) {
    throw new BadRequestError(
      "The card, bank or wallet payments add up to more than the bill. Only cash can be more than the bill (the extra is given back as change).",
    );
  }

  let remaining = changeGiven;
  for (let i = payments.length - 1; i >= 0 && remaining > 0; i--) {
    const p = payments[i]!;
    if (p.method !== "CASH") continue;
    const take = Math.min(remaining, p.amount);
    p.amount = round2(p.amount - take);
    remaining = round2(remaining - take);
  }

  return { payments: payments.filter((p) => p.amount > 0), changeGiven };
}

export interface CancelSaleInput {
  reason?: string;
  refundMethod?: string;
}

/**
 * PATCH /api/v1/sales/{id}/cancel (API Spec Chapter 34.4) — "Restore
 * inventory, Reverse payment, Maintain cancellation history." Nothing is
 * hard-deleted: inventory/IMEI/customer-balance changes are reversed, the
 * original payment stays on record, and a REFUND payment + isCancelled flag
 * document what happened.
 *
 * Only what the customer still has is reversed: units already brought back
 * through a Sales Return were restocked and refunded then, so they're not
 * restocked or refunded a second time here. The refund goes back the same
 * way the customer paid unless a refundMethod is given; only a cash refund
 * comes out of the drawer.
 */
export async function cancelSale(shopId: string, id: string, input: CancelSaleInput, cancelledById: string) {
  const requestedMethod = input.refundMethod ? PAYMENT_METHOD_INPUT_MAP[input.refundMethod] : undefined;
  if (input.refundMethod && !requestedMethod) throw new BadRequestError(`Unknown refund method "${input.refundMethod}".`);

  await prisma.$transaction(
    async (tx) => {
      // Same row lock as Sales Returns — a return and a cancellation (or two
      // cancellations) of one sale can't run at the same time.
      await tx.$queryRaw`SELECT id FROM sales WHERE id = ${id}::uuid AND shop_id = ${shopId}::uuid FOR UPDATE`;

      const sale = await tx.sale.findFirst({
        where: { id, shopId },
        include: { items: { include: { imeiNumber: true, warranty: true } } },
      });
      if (!sale) throw new NotFoundError("Sale not found.");
      if (sale.isCancelled) throw new ConflictError("Sale is already cancelled.");

      const returned = await tx.salesReturnItem.groupBy({
        by: ["productId"],
        where: { shopId, salesReturn: { saleId: sale.id } },
        _sum: { quantity: true },
      });
      const held = computeHeldQuantities(sale.id, sale.items, new Map(returned.map((r) => [r.productId, r._sum.quantity ?? 0])));
      const unitValues = computeUnitValues(sale.items, sale.totalAmount);

      let heldValue = 0;
      for (const item of sale.items) {
        const quantity = held.get(item.id) ?? 0;
        if (quantity <= 0) continue;
        heldValue += quantity * (unitValues.get(item.id) ?? 0);

        const inventory = await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: { increment: quantity }, availableQuantity: { increment: quantity } },
        });

        await tx.inventoryTransaction.create({
          data: {
            shopId,
            inventoryId: inventory.id,
            productId: item.productId,
            transactionType: "SALES_RETURN",
            quantity,
            referenceNumber: sale.invoiceNumber,
            remarks: "Sale cancelled",
            createdById: cancelledById,
          },
        });

        if (item.imeiNumber) {
          await tx.imeiNumber.update({
            where: { id: item.imeiNumber.id },
            data: { status: "AVAILABLE", saleId: null },
          });
        }

        if (item.warranty?.warrantyStatus === "ACTIVE") {
          await tx.warranty.update({ where: { id: item.warranty.id }, data: { warrantyStatus: "CANCELLED" } });
        }
      }

      // paidAmount is already net of any earlier return refunds. The cap by
      // the value of what's still held only matters for sales returned before
      // returns started reducing paidAmount (older data).
      const paid = Number(sale.paidAmount);
      const refund = round2(paid - heldValue < 0.05 ? paid : heldValue);

      if (refund > 0) {
        const method = requestedMethod ?? (await originalPaymentMethod(tx, shopId, sale.id));
        await tx.payment.create({
          data: {
            shopId,
            paymentType: "REFUND",
            referenceId: sale.id,
            paymentMethod: method,
            paymentDate: new Date(),
            amount: refund,
            notes: "Sale cancellation refund",
            receivedById: cancelledById,
          },
        });

        if (method === "CASH") {
          await recordDrawerMovement(tx, shopId, cancelledById, "REFUND", refund, sale.invoiceNumber);
        }
      }

      if (sale.customerId && sale.dueAmount.greaterThan(0)) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: { outstandingBalance: { decrement: sale.dueAmount } },
        });
      }

      // Nothing is owed on a cancelled sale any more — zeroing dueAmount keeps
      // it out of every "still owed" figure and blocks further payments.
      await tx.sale.update({
        where: { id },
        data: { isCancelled: true, cancelledAt: new Date(), cancelReason: input.reason ?? null, dueAmount: 0 },
      });
    },
    { timeout: 15_000 },
  );

  return getSaleById(shopId, id);
}

/** The method the customer paid with — or cash, if they split it across several. */
async function originalPaymentMethod(tx: Prisma.TransactionClient, shopId: string, saleId: string): Promise<PaymentMethod> {
  const methods = await tx.payment.findMany({
    where: { shopId, referenceId: saleId, paymentType: "SALE_PAYMENT" },
    distinct: ["paymentMethod"],
    select: { paymentMethod: true },
  });
  return methods.length === 1 ? methods[0]!.paymentMethod : "CASH";
}

