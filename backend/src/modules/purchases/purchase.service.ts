import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { generateCode } from "../../common/utils/code.js";
import { PAYMENT_METHOD_INPUT_MAP } from "../../common/utils/paymentMethod.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";

const purchaseListSelect = {
  id: true,
  purchaseNumber: true,
  purchaseDate: true,
  totalAmount: true,
  paymentStatus: true,
  supplier: { select: { id: true, supplierName: true } },
} satisfies Prisma.PurchaseSelect;

type PurchaseListRow = Prisma.PurchaseGetPayload<{ select: typeof purchaseListSelect }>;

function toPurchaseListItem(purchase: PurchaseListRow) {
  return {
    id: purchase.id,
    invoiceNo: purchase.purchaseNumber,
    supplierId: purchase.supplier.id,
    supplier: purchase.supplier.supplierName,
    totalAmount: purchase.totalAmount,
    status: purchase.paymentStatus,
  };
}

const purchaseDetailInclude = {
  supplier: true,
  items: { include: { product: { select: { id: true, sku: true, productName: true } } } },
} satisfies Prisma.PurchaseInclude;

type PurchaseDetailRow = Prisma.PurchaseGetPayload<{ include: typeof purchaseDetailInclude }>;

async function toPurchaseDetailDto(purchase: PurchaseDetailRow) {
  const [imeiNumbers, payments] = await Promise.all([
    prisma.imeiNumber.findMany({
      where: { purchaseId: purchase.id },
      select: { id: true, imeiNumber: true, productId: true, status: true },
    }),
    prisma.payment.findMany({
      where: { paymentType: "PURCHASE_PAYMENT", referenceId: purchase.id },
      orderBy: { paymentDate: "desc" },
    }),
  ]);

  return {
    id: purchase.id,
    invoiceNo: purchase.purchaseNumber,
    purchaseDate: purchase.purchaseDate,
    supplier: {
      id: purchase.supplier.id,
      code: purchase.supplier.supplierCode,
      name: purchase.supplier.supplierName,
      phone: purchase.supplier.phone,
    },
    items: purchase.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      sku: item.product.sku,
      name: item.product.productName,
      quantity: item.quantity,
      purchasePrice: item.purchasePrice,
      discount: item.discount,
      tax: item.tax,
      lineTotal: item.lineTotal,
      imeis: imeiNumbers.filter((imei) => imei.productId === item.productId).map((imei) => imei.imeiNumber),
    })),
    subtotal: purchase.subtotal,
    discount: purchase.discount,
    tax: purchase.tax,
    shippingCost: purchase.shippingCost,
    totalAmount: purchase.totalAmount,
    status: purchase.paymentStatus,
    remarks: purchase.remarks,
    payments: payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.paymentMethod,
      date: p.paymentDate,
      notes: p.notes,
    })),
    createdAt: purchase.createdAt,
  };
}

export interface ListPurchasesInput extends PaginationQuery {
  supplierId?: string;
  status?: "PENDING" | "PARTIAL" | "PAID";
  startDate?: Date;
  endDate?: Date;
}

/** GET /api/v1/purchases (API Spec Chapter 31.1). */
export async function listPurchases(input: ListPurchasesInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.PurchaseWhereInput = {
    ...(input.supplierId ? { supplierId: input.supplierId } : {}),
    ...(input.status ? { paymentStatus: input.status } : {}),
    ...(input.startDate || input.endDate
      ? {
          purchaseDate: {
            ...(input.startDate ? { gte: input.startDate } : {}),
            ...(input.endDate ? { lte: input.endDate } : {}),
          },
        }
      : {}),
  };

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({ where, skip, take, orderBy: { purchaseDate: "desc" }, select: purchaseListSelect }),
    prisma.purchase.count({ where }),
  ]);

  return { data: purchases.map(toPurchaseListItem), pagination: buildPaginationMeta(page, limit, total) };
}

/** GET /api/v1/purchases/{id} (API Spec Chapter 31.2). */
export async function getPurchaseById(id: string) {
  const purchase = await prisma.purchase.findUnique({ where: { id }, include: purchaseDetailInclude });
  if (!purchase) throw new NotFoundError("Purchase not found.");
  return toPurchaseDetailDto(purchase);
}

export interface CreatePurchaseItemInput {
  productId: string;
  quantity: number;
  purchasePrice: number;
  discount?: number;
  tax?: number;
  imeis?: string[];
}

export interface CreatePurchaseInput {
  supplierId: string;
  invoiceNo?: string;
  purchaseDate?: Date;
  items: CreatePurchaseItemInput[];
  discount?: number;
  shippingCost?: number;
  remarks?: string;
  payment?: { method: string; amount: number };
}

/**
 * POST /api/v1/purchases (API Spec Chapter 31.3). Follows the doc's process
 * flow exactly: validate supplier → save purchase → save items → increase
 * inventory → register IMEIs → create payment record — all inside one
 * transaction (SAD Chapter 22 requires this for exactly this kind of
 * multi-step write).
 */
export async function createPurchase(input: CreatePurchaseInput, createdById: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) throw new NotFoundError("Supplier not found.");

  const products = await prisma.product.findMany({
    where: { id: { in: input.items.map((item) => item.productId) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) throw new NotFoundError(`Product ${item.productId} not found.`);
    if (product.tracksImei) {
      if (!item.imeis || item.imeis.length !== item.quantity) {
        throw new BadRequestError(
          `"${product.productName}" tracks IMEI — provide exactly ${item.quantity} IMEI number(s).`,
        );
      }
      const existing = await prisma.imeiNumber.findMany({ where: { imeiNumber: { in: item.imeis } } });
      if (existing.length > 0) {
        throw new ConflictError(`IMEI already registered: ${existing.map((e) => e.imeiNumber).join(", ")}`);
      }
    }
  }

  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.purchasePrice, 0);
  const itemDiscountTotal = input.items.reduce((sum, item) => sum + (item.discount ?? 0), 0);
  const itemTaxTotal = input.items.reduce((sum, item) => sum + (item.tax ?? 0), 0);
  const discount = (input.discount ?? 0) + itemDiscountTotal;
  const shippingCost = input.shippingCost ?? 0;
  const totalAmount = subtotal - discount + itemTaxTotal + shippingCost;
  const paidAmount = input.payment?.amount ?? 0;
  const paymentStatus = paidAmount <= 0 ? "PENDING" : paidAmount >= totalAmount ? "PAID" : "PARTIAL";

  const purchaseId = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        purchaseNumber: input.invoiceNo ?? generateCode("PUR"),
        supplierId: input.supplierId,
        purchaseDate: input.purchaseDate ?? new Date(),
        subtotal,
        discount,
        tax: itemTaxTotal,
        shippingCost,
        totalAmount,
        paymentStatus,
        ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
        createdById,
      },
    });

    for (const item of input.items) {
      const product = productMap.get(item.productId)!;
      const lineTotal = item.quantity * item.purchasePrice - (item.discount ?? 0) + (item.tax ?? 0);

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: item.productId,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          discount: item.discount ?? 0,
          tax: item.tax ?? 0,
          lineTotal,
        },
      });

      const inventory = await tx.inventory.upsert({
        where: { productId: item.productId },
        update: { quantity: { increment: item.quantity }, availableQuantity: { increment: item.quantity } },
        create: {
          productId: item.productId,
          quantity: item.quantity,
          availableQuantity: item.quantity,
          reorderLevel: 0,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          productId: item.productId,
          transactionType: "PURCHASE",
          quantity: item.quantity,
          referenceNumber: purchase.purchaseNumber,
          createdById,
        },
      });

      if (product.tracksImei && item.imeis) {
        await tx.imeiNumber.createMany({
          data: item.imeis.map((imeiNumber) => ({
            productId: item.productId,
            imeiNumber,
            purchaseId: purchase.id,
            status: "AVAILABLE" as const,
          })),
        });
      }
    }

    if (paidAmount > 0) {
      const method = PAYMENT_METHOD_INPUT_MAP[input.payment!.method]!;
      await tx.payment.create({
        data: {
          paymentType: "PURCHASE_PAYMENT",
          referenceId: purchase.id,
          paymentMethod: method,
          paymentDate: new Date(),
          amount: paidAmount,
          receivedById: createdById,
        },
      });
    }

    const dueAmount = totalAmount - paidAmount;
    if (dueAmount > 0) {
      await tx.supplier.update({
        where: { id: input.supplierId },
        data: { outstandingBalance: { increment: dueAmount } },
      });
    }

    return purchase.id;
  });

  return getPurchaseById(purchaseId);
}

export interface UpdatePurchaseInput {
  supplierId?: string;
  purchaseDate?: Date;
  remarks?: string;
}

/** PATCH /api/v1/purchases/{id} (API Spec Chapter 31.4). */
export async function updatePurchase(id: string, input: UpdatePurchaseInput) {
  const existing = await prisma.purchase.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Purchase not found.");

  if (input.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
    if (!supplier) throw new NotFoundError("Supplier not found.");
  }

  await prisma.purchase.update({
    where: { id },
    data: {
      ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
      ...(input.purchaseDate !== undefined ? { purchaseDate: input.purchaseDate } : {}),
      ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
    },
  });

  return getPurchaseById(id);
}

/**
 * DELETE /api/v1/purchases/{id} (API Spec Chapter 31.5) — "Cannot delete
 * completed purchase without reversing stock." Reverses the inventory
 * increase and removes the IMEIs this purchase registered; refuses if any
 * of that stock has already moved (sold IMEIs, or reversal would take
 * available quantity negative) since it can no longer be cleanly undone.
 */
export async function deletePurchase(id: string): Promise<void> {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!purchase) throw new NotFoundError("Purchase not found.");

  const imeiNumbers = await prisma.imeiNumber.findMany({ where: { purchaseId: id } });
  const nonAvailable = imeiNumbers.filter((imei) => imei.status !== "AVAILABLE");
  if (nonAvailable.length > 0) {
    throw new ConflictError(
      `Cannot delete — ${nonAvailable.length} IMEI(s) from this purchase are no longer available (already sold or reserved).`,
    );
  }

  for (const item of purchase.items) {
    const inventory = await prisma.inventory.findUnique({ where: { productId: item.productId } });
    if (inventory && inventory.availableQuantity - item.quantity < 0) {
      throw new ConflictError("Cannot delete — reversing this purchase would take available stock negative.");
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of purchase.items) {
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
          remarks: "Purchase deleted — stock reversed",
        },
      });
    }

    await tx.imeiNumber.deleteMany({ where: { purchaseId: id } });

    const paymentAgg = await tx.payment.aggregate({
      where: { paymentType: "PURCHASE_PAYMENT", referenceId: id },
      _sum: { amount: true },
    });
    const dueAmount = purchase.totalAmount.minus(paymentAgg._sum.amount ?? 0);
    if (dueAmount.greaterThan(0)) {
      await tx.supplier.update({
        where: { id: purchase.supplierId },
        data: { outstandingBalance: { decrement: dueAmount } },
      });
    }

    await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
    await tx.payment.deleteMany({ where: { paymentType: "PURCHASE_PAYMENT", referenceId: id } });
    await tx.purchase.delete({ where: { id } });
  });
}
