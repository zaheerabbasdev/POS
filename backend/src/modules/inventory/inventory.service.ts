import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";

type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

const inventorySelect = {
  id: true,
  quantity: true,
  availableQuantity: true,
  reservedQuantity: true,
  reorderLevel: true,
  location: true,
  updatedAt: true,
  product: {
    select: {
      id: true,
      sku: true,
      productName: true,
      brand: { select: { id: true, brandName: true } },
      category: { select: { id: true, categoryName: true } },
    },
  },
} satisfies Prisma.InventorySelect;

type InventoryRow = Prisma.InventoryGetPayload<{ select: typeof inventorySelect }>;

function computeStockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (quantity <= reorderLevel) return "low_stock";
  return "in_stock";
}

function toInventoryDto(inventory: InventoryRow) {
  return {
    productId: inventory.product.id,
    sku: inventory.product.sku,
    name: inventory.product.productName,
    brandId: inventory.product.brand?.id ?? null,
    brand: inventory.product.brand?.brandName ?? null,
    categoryId: inventory.product.category.id,
    category: inventory.product.category.categoryName,
    quantity: inventory.quantity,
    availableQuantity: inventory.availableQuantity,
    reservedQuantity: inventory.reservedQuantity,
    reorderLevel: inventory.reorderLevel,
    stockStatus: computeStockStatus(inventory.quantity, inventory.reorderLevel),
    location: inventory.location,
    updatedAt: inventory.updatedAt,
  };
}

export interface ListInventoryInput extends PaginationQuery {
  productId?: string;
  categoryId?: string;
  brandId?: string;
  stockStatus?: StockStatus;
}

/** GET /api/v1/inventory (API Spec Chapter 38.1). */
export async function listInventory(input: ListInventoryInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.InventoryWhereInput = {
    ...(input.productId ? { productId: input.productId } : {}),
    ...(input.categoryId || input.brandId
      ? {
          product: {
            ...(input.categoryId ? { categoryId: input.categoryId } : {}),
            ...(input.brandId ? { brandId: input.brandId } : {}),
          },
        }
      : {}),
  };

  // Same reasoning as products.service's stockStatus filter — computed
  // from two columns, so it's applied in memory rather than in the query.
  if (!input.stockStatus) {
    const [rows, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        skip,
        take,
        orderBy: { product: { productName: "asc" } },
        select: inventorySelect,
      }),
      prisma.inventory.count({ where }),
    ]);
    return { data: rows.map(toInventoryDto), pagination: buildPaginationMeta(page, limit, total) };
  }

  const all = await prisma.inventory.findMany({
    where,
    orderBy: { product: { productName: "asc" } },
    select: inventorySelect,
  });
  const filtered = all.filter((inv) => computeStockStatus(inv.quantity, inv.reorderLevel) === input.stockStatus);
  const paged = filtered.slice(skip, skip + take);
  return { data: paged.map(toInventoryDto), pagination: buildPaginationMeta(page, limit, filtered.length) };
}

export async function getInventoryByProductId(productId: string) {
  const inventory = await prisma.inventory.findUnique({ where: { productId }, select: inventorySelect });
  if (!inventory) throw new NotFoundError("Inventory record not found for this product.");
  return toInventoryDto(inventory);
}

/** GET /api/v1/inventory/{productId}/history (API Spec Chapter 38.2). */
export async function getStockHistory(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new NotFoundError("Product not found.");

  const transactions = await prisma.inventoryTransaction.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      transactionType: true,
      quantity: true,
      referenceNumber: true,
      remarks: true,
      createdAt: true,
      createdBy: { select: { username: true } },
    },
  });

  return transactions.map((tx) => ({
    id: tx.id,
    type: tx.transactionType,
    quantity: tx.quantity,
    referenceNumber: tx.referenceNumber,
    remarks: tx.remarks,
    performedBy: tx.createdBy?.username ?? null,
    createdAt: tx.createdAt,
  }));
}

export interface CreateAdjustmentInput {
  productId: string;
  type: "increase" | "decrease";
  quantity: number;
  reason: string;
}

/** POST /api/v1/inventory/adjustment (API Spec Chapter 39.1). */
export async function createAdjustment(input: CreateAdjustmentInput, adjustedById: string) {
  const inventory = await prisma.inventory.findUnique({ where: { productId: input.productId } });
  if (!inventory) throw new NotFoundError("Product has no inventory record.");

  const delta = input.type === "increase" ? input.quantity : -input.quantity;
  const newQuantity = inventory.quantity + delta;
  if (newQuantity < 0) {
    throw new BadRequestError("This adjustment would result in negative stock.");
  }

  // Three related writes — SAD Chapter 22 requires stock adjustments to be transactional.
  await prisma.$transaction([
    prisma.inventory.update({
      where: { id: inventory.id },
      data: { quantity: newQuantity, availableQuantity: Math.max(0, inventory.availableQuantity + delta) },
    }),
    prisma.stockAdjustment.create({
      data: {
        inventoryId: inventory.id,
        productId: input.productId,
        previousQuantity: inventory.quantity,
        newQuantity,
        adjustmentReason: input.reason,
        adjustedById,
      },
    }),
    prisma.inventoryTransaction.create({
      data: {
        inventoryId: inventory.id,
        productId: input.productId,
        transactionType: "ADJUSTMENT",
        quantity: delta,
        remarks: input.reason,
        createdById: adjustedById,
      },
    }),
  ]);

  return getInventoryByProductId(input.productId);
}
