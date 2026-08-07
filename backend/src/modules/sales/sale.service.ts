import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { generateCode } from "../../common/utils/code.js";
import { PAYMENT_METHOD_INPUT_MAP } from "../../common/utils/paymentMethod.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import { recordDrawerMovement } from "../cashDrawer/cashDrawer.service.js";

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
      imeiNumber: { select: { id: true, imeiNumber: true } },
      warranty: true,
    },
  },
} satisfies Prisma.SaleInclude;

type SaleDetailRow = Prisma.SaleGetPayload<{ include: typeof saleDetailInclude }>;

async function toSaleDetailDto(sale: SaleDetailRow) {
  const payments = await prisma.payment.findMany({
    where: { referenceId: sale.id, paymentType: { in: ["SALE_PAYMENT", "REFUND"] } },
    orderBy: { paymentDate: "desc" },
  });

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
export async function listSales(input: ListSalesInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.SaleWhereInput = {
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
export async function getSaleById(id: string) {
  const sale = await prisma.sale.findUnique({ where: { id }, include: saleDetailInclude });
  if (!sale) throw new NotFoundError("Sale not found.");
  return toSaleDetailDto(sale);
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
  payment?: { method: string; paidAmount: number };
  remarks?: string;
}

/**
 * POST /api/v1/sales (API Spec Chapter 34.3). Follows the doc's Sale
 * Processing Flow: validate stock → validate IMEI → create invoice →
 * decrease stock → update IMEI status → create warranty → receive payment —
 * all inside one transaction (SAD Chapter 22).
 */
export async function createSale(input: CreateSaleInput, cashierId: string) {
  if (input.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new NotFoundError("Customer not found.");
  }

  const products = await prisma.product.findMany({
    where: { id: { in: input.items.map((item) => item.productId) } },
    include: { inventory: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const imeiByItemIndex = new Map<number, { id: string; warrantyMonths: number | null }>();

  for (const [index, item] of input.items.entries()) {
    const product = productMap.get(item.productId);
    if (!product) throw new NotFoundError(`Product ${item.productId} not found.`);
    if (!product.isActive) throw new BadRequestError(`"${product.productName}" is inactive and cannot be sold.`);

    const available = product.inventory?.availableQuantity ?? 0;
    if (available < item.quantity) {
      throw new BadRequestError(`Insufficient stock for "${product.productName}" (available: ${available}).`);
    }

    if (product.tracksImei) {
      if (item.quantity !== 1 || !item.imei) {
        throw new BadRequestError(`"${product.productName}" tracks IMEI — quantity must be 1 and imei is required.`);
      }
      const imeiRecord = await prisma.imeiNumber.findUnique({ where: { imeiNumber: item.imei } });
      if (!imeiRecord || imeiRecord.productId !== item.productId) {
        throw new NotFoundError(`IMEI "${item.imei}" not found for this product.`);
      }
      if (imeiRecord.status !== "AVAILABLE") {
        throw new ConflictError(`IMEI "${item.imei}" is not available for sale (status: ${imeiRecord.status}).`);
      }
      imeiByItemIndex.set(index, { id: imeiRecord.id, warrantyMonths: product.warrantyMonths });
    }
  }

  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const itemDiscountTotal = input.items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  const itemTaxTotal = input.items.reduce((sum, item) => sum + (item.tax ?? 0), 0);
  const discount = (input.discount ?? 0) + itemDiscountTotal;
  const totalAmount = subtotal - discount + itemTaxTotal;
  const paidAmount = input.payment?.paidAmount ?? 0;
  const dueAmount = Math.max(0, totalAmount - paidAmount);
  const paymentStatus = paidAmount <= 0 ? "UNPAID" : paidAmount >= totalAmount ? "PAID" : "PARTIAL";

  const saleId = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
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

      const inventory = await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity }, availableQuantity: { decrement: item.quantity } },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          productId: item.productId,
          transactionType: "SALE",
          quantity: -item.quantity,
          referenceNumber: sale.invoiceNumber,
          createdById: cashierId,
        },
      });

      if (imeiInfo) {
        await tx.imeiNumber.update({ where: { id: imeiInfo.id }, data: { status: "SOLD", saleId: sale.id } });
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

    if (paidAmount > 0) {
      const method = PAYMENT_METHOD_INPUT_MAP[input.payment!.method]!;
      await tx.payment.create({
        data: {
          paymentType: "SALE_PAYMENT",
          referenceId: sale.id,
          paymentMethod: method,
          paymentDate: new Date(),
          amount: paidAmount,
          receivedById: cashierId,
        },
      });

      // Only cash physically moves through the drawer — best-effort, and
      // silently skipped if the cashier has no session open (SAD Chapter 26:
      // Cash Drawer tracks sessions, it doesn't gate the sale itself).
      if (method === "CASH") {
        await recordDrawerMovement(tx, cashierId, "SALE", paidAmount, sale.invoiceNumber);
      }
    }

    if (input.customerId && dueAmount > 0) {
      await tx.customer.update({
        where: { id: input.customerId },
        data: { outstandingBalance: { increment: dueAmount } },
      });
    }

    return sale.id;
  });

  return getSaleById(saleId);
}

/**
 * PATCH /api/v1/sales/{id}/cancel (API Spec Chapter 34.4) — "Restore
 * inventory, Reverse payment, Maintain cancellation history." Nothing is
 * hard-deleted: inventory/IMEI/customer-balance changes are reversed, the
 * original payment stays on record, and a REFUND payment + isCancelled flag
 * document what happened.
 */
export async function cancelSale(id: string, reason: string | undefined, cancelledById: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: { include: { imeiNumber: true, warranty: true } } },
  });
  if (!sale) throw new NotFoundError("Sale not found.");
  if (sale.isCancelled) throw new ConflictError("Sale is already cancelled.");

  await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      const inventory = await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { increment: item.quantity }, availableQuantity: { increment: item.quantity } },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          productId: item.productId,
          transactionType: "SALES_RETURN",
          quantity: item.quantity,
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

      if (item.warranty) {
        await tx.warranty.update({ where: { id: item.warranty.id }, data: { warrantyStatus: "CANCELLED" } });
      }
    }

    if (sale.paidAmount.greaterThan(0)) {
      await tx.payment.create({
        data: {
          paymentType: "REFUND",
          referenceId: sale.id,
          paymentMethod: "CASH",
          paymentDate: new Date(),
          amount: sale.paidAmount,
          notes: "Sale cancellation refund",
          receivedById: cancelledById,
        },
      });

      await recordDrawerMovement(tx, cancelledById, "REFUND", sale.paidAmount.toNumber(), sale.invoiceNumber);
    }

    if (sale.customerId && sale.dueAmount.greaterThan(0)) {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: { outstandingBalance: { decrement: sale.dueAmount } },
      });
    }

    await tx.sale.update({
      where: { id },
      data: { isCancelled: true, cancelledAt: new Date(), cancelReason: reason ?? null },
    });
  });

  return getSaleById(id);
}
