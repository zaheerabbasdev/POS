import { prisma } from "../../config/prisma.js";
import { cloudinary } from "../../config/cloudinary.js";
import { isCloudinaryConfigured } from "../../config/env.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";
import { generateCode } from "../../common/utils/code.js";
import { checkPlanLimit } from "../../common/services/planLimits.js";

const productListSelect = {
  id: true,
  sku: true,
  productName: true,
  barcode: true,
  purchasePrice: true,
  sellingPrice: true,
  wholesalePrice: true,
  taxPercentage: true,
  warrantyMonths: true,
  description: true,
  isActive: true,
  tracksImei: true,
  createdAt: true,
  updatedAt: true,
  brand: { select: { id: true, brandName: true } },
  category: { select: { id: true, categoryName: true } },
  productModel: { select: { id: true, modelName: true } },
  inventory: { select: { quantity: true, availableQuantity: true, reorderLevel: true } },
} satisfies Prisma.ProductSelect;

type ProductListRow = Prisma.ProductGetPayload<{ select: typeof productListSelect }>;

const productDetailSelect = {
  ...productListSelect,
  images: { select: { id: true, imageUrl: true, isPrimary: true }, orderBy: { isPrimary: "desc" } },
  imeiNumbers: {
    select: { id: true, imeiNumber: true, status: true, warrantyStart: true, warrantyEnd: true },
  },
} satisfies Prisma.ProductSelect;

type ProductDetailRow = Prisma.ProductGetPayload<{ select: typeof productDetailSelect }>;

function toProductListItem(product: ProductListRow) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.productName,
    barcode: product.barcode,
    categoryId: product.category.id,
    category: product.category.categoryName,
    brandId: product.brand?.id ?? null,
    brand: product.brand?.brandName ?? null,
    modelId: product.productModel?.id ?? null,
    model: product.productModel?.modelName ?? null,
    price: product.sellingPrice,
    stock: product.inventory?.quantity ?? 0,
    status: product.isActive ? "active" : ("inactive" as const),
    tracksImei: product.tracksImei,
  };
}

/** Purchase/Sales History (API Spec Chapter 26.2) — one row per purchase/sale this product appeared in. */
async function getProductTransactionHistory(shopId: string, productId: string) {
  // productId is already confirmed to belong to this shop by every caller
  // below (getProductById always looks the product up shop-scoped first);
  // the `purchase`/`sale` relation filters here are defense-in-depth so
  // this helper is never wrong to call on its own.
  const [purchaseItems, saleItems] = await Promise.all([
    prisma.purchaseItem.findMany({
      where: { productId, purchase: { shopId } },
      orderBy: { purchase: { purchaseDate: "desc" } },
      select: {
        quantity: true,
        purchasePrice: true,
        lineTotal: true,
        purchase: { select: { id: true, purchaseNumber: true, purchaseDate: true, supplier: { select: { supplierName: true } } } },
      },
    }),
    prisma.saleItem.findMany({
      where: { productId, sale: { shopId } },
      orderBy: { sale: { saleDate: "desc" } },
      select: {
        quantity: true,
        sellingPrice: true,
        lineTotal: true,
        sale: { select: { id: true, invoiceNumber: true, saleDate: true, isCancelled: true } },
      },
    }),
  ]);

  return {
    purchaseHistory: purchaseItems.map((item) => ({
      purchaseId: item.purchase.id,
      invoiceNo: item.purchase.purchaseNumber,
      date: item.purchase.purchaseDate,
      supplier: item.purchase.supplier.supplierName,
      quantity: item.quantity,
      price: item.purchasePrice,
      lineTotal: item.lineTotal,
    })),
    salesHistory: saleItems.map((item) => ({
      saleId: item.sale.id,
      invoiceNumber: item.sale.invoiceNumber,
      date: item.sale.saleDate,
      isCancelled: item.sale.isCancelled,
      quantity: item.quantity,
      price: item.sellingPrice,
      lineTotal: item.lineTotal,
    })),
  };
}

async function toProductDetailDto(shopId: string, product: ProductDetailRow) {
  const { purchaseHistory, salesHistory } = await getProductTransactionHistory(shopId, product.id);
  return {
    ...toProductListItem(product),
    purchasePrice: product.purchasePrice,
    wholesalePrice: product.wholesalePrice,
    taxPercentage: product.taxPercentage,
    warrantyMonths: product.warrantyMonths,
    description: product.description,
    reorderLevel: product.inventory?.reorderLevel ?? 0,
    availableStock: product.inventory?.availableQuantity ?? 0,
    images: product.images,
    imeiNumbers: product.imeiNumbers,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    purchaseHistory,
    salesHistory,
  };
}

type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

function matchesStockStatus(product: ProductListRow, status: StockStatus): boolean {
  const quantity = product.inventory?.quantity ?? 0;
  const reorderLevel = product.inventory?.reorderLevel ?? 0;
  if (status === "out_of_stock") return quantity <= 0;
  if (status === "low_stock") return quantity > 0 && quantity <= reorderLevel;
  return quantity > reorderLevel;
}

export interface ListProductsInput extends PaginationQuery {
  search?: string;
  categoryId?: string;
  brandId?: string;
  modelId?: string;
  stockStatus?: StockStatus;
  minPrice?: number;
  maxPrice?: number;
  status?: "active" | "inactive";
}

/** GET /api/v1/products (API Spec Chapter 26.1). */
export async function listProducts(shopId: string, input: ListProductsInput) {
  const { skip, take, page, limit } = getPaginationParams(input);

  const where: Prisma.ProductWhereInput = {
    shopId,
    ...(input.status ? { isActive: input.status === "active" } : {}),
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    ...(input.brandId ? { brandId: input.brandId } : {}),
    ...(input.modelId ? { productModelId: input.modelId } : {}),
    ...(input.minPrice !== undefined || input.maxPrice !== undefined
      ? {
          sellingPrice: {
            ...(input.minPrice !== undefined ? { gte: input.minPrice } : {}),
            ...(input.maxPrice !== undefined ? { lte: input.maxPrice } : {}),
          },
        }
      : {}),
    ...(input.search
      ? {
          OR: [
            { productName: { contains: input.search, mode: "insensitive" } },
            { sku: { contains: input.search, mode: "insensitive" } },
            { barcode: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // Stock-status filtering compares two Inventory columns (quantity vs.
  // reorderLevel), which Prisma's query builder can't express directly, so
  // it's applied in memory rather than at the DB level. Fine at catalog
  // scale; revisit with raw SQL if this becomes a hot path on a huge catalog.
  if (!input.stockStatus) {
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take, orderBy: { productName: "asc" }, select: productListSelect }),
      prisma.product.count({ where }),
    ]);
    return { data: products.map(toProductListItem), pagination: buildPaginationMeta(page, limit, total) };
  }

  const allMatching = await prisma.product.findMany({
    where,
    orderBy: { productName: "asc" },
    select: productListSelect,
  });
  const filtered = allMatching.filter((product) => matchesStockStatus(product, input.stockStatus!));
  const paged = filtered.slice(skip, skip + take);
  return { data: paged.map(toProductListItem), pagination: buildPaginationMeta(page, limit, filtered.length) };
}

/**
 * GET /api/v1/products/{id} (API Spec Chapter 26.2). Uses `findFirst` with
 * both `id` and `shopId` in the `where` (not `findUnique({ where: { id } })`)
 * so a valid UUID belonging to another shop 404s exactly like a
 * nonexistent one — never reveals that a record exists in another tenant.
 */
export async function getProductById(shopId: string, id: string) {
  const product = await prisma.product.findFirst({ where: { id, shopId }, select: productDetailSelect });
  if (!product) throw new NotFoundError("Product not found.");
  return await toProductDetailDto(shopId, product);
}

export interface CreateProductInput {
  name: string;
  sku?: string;
  categoryId: string;
  brandId?: string;
  modelId?: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  taxPercentage?: number;
  warrantyMonths?: number;
  barcode?: string;
  description?: string;
  stock?: number;
  reorderLevel?: number;
  status?: "active" | "inactive";
  tracksImei?: boolean;
}

/**
 * POST /api/v1/products (API Spec Chapter 26.3). Also provisions the linked
 * Inventory row (1-to-1, DDD Table 13) from the request's "stock" field —
 * a Product with no Inventory row is a state the rest of the schema doesn't
 * expect (sales, stock adjustments, etc. all key off Inventory).
 */
export async function createProduct(shopId: string, input: CreateProductInput) {
  await checkPlanLimit(shopId, "products");

  const category = await prisma.category.findFirst({ where: { id: input.categoryId, shopId } });
  if (!category) throw new NotFoundError("Category not found.");
  if (input.brandId) {
    const brand = await prisma.brand.findFirst({ where: { id: input.brandId, shopId } });
    if (!brand) throw new NotFoundError("Brand not found.");
  }
  if (input.modelId) {
    const model = await prisma.productModel.findFirst({ where: { id: input.modelId, shopId } });
    if (!model) throw new NotFoundError("Product model not found.");
  }

  const sku = input.sku ?? generateCode("SKU");
  const openingStock = input.stock ?? 0;

  const productId = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        shopId,
        sku,
        productName: input.name,
        categoryId: input.categoryId,
        purchasePrice: input.purchasePrice,
        sellingPrice: input.sellingPrice,
        ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
        ...(input.modelId !== undefined ? { productModelId: input.modelId } : {}),
        ...(input.wholesalePrice !== undefined ? { wholesalePrice: input.wholesalePrice } : {}),
        ...(input.taxPercentage !== undefined ? { taxPercentage: input.taxPercentage } : {}),
        ...(input.warrantyMonths !== undefined ? { warrantyMonths: input.warrantyMonths } : {}),
        ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { isActive: input.status === "active" } : {}),
        ...(input.tracksImei !== undefined ? { tracksImei: input.tracksImei } : {}),
      },
    });

    const inventory = await tx.inventory.create({
      data: {
        shopId,
        productId: created.id,
        quantity: openingStock,
        availableQuantity: openingStock,
        reorderLevel: input.reorderLevel ?? 0,
      },
    });

    if (openingStock > 0) {
      await tx.inventoryTransaction.create({
        data: {
          shopId,
          inventoryId: inventory.id,
          productId: created.id,
          transactionType: "ADJUSTMENT",
          quantity: openingStock,
          remarks: "Opening stock",
        },
      });
    }

    return created.id;
  });

  return getProductById(shopId, productId);
}

export interface UpdateProductInput {
  name?: string;
  categoryId?: string;
  brandId?: string;
  modelId?: string;
  purchasePrice?: number;
  sellingPrice?: number;
  wholesalePrice?: number;
  taxPercentage?: number;
  warrantyMonths?: number;
  barcode?: string;
  description?: string;
  reorderLevel?: number;
  status?: "active" | "inactive";
  tracksImei?: boolean;
}

/** PATCH /api/v1/products/{id} (API Spec Chapter 26.5). */
export async function updateProduct(shopId: string, id: string, input: UpdateProductInput) {
  const existing = await prisma.product.findFirst({ where: { id, shopId } });
  if (!existing) throw new NotFoundError("Product not found.");

  if (input.categoryId) {
    const category = await prisma.category.findFirst({ where: { id: input.categoryId, shopId } });
    if (!category) throw new NotFoundError("Category not found.");
  }
  if (input.brandId) {
    const brand = await prisma.brand.findFirst({ where: { id: input.brandId, shopId } });
    if (!brand) throw new NotFoundError("Brand not found.");
  }
  if (input.modelId) {
    const model = await prisma.productModel.findFirst({ where: { id: input.modelId, shopId } });
    if (!model) throw new NotFoundError("Product model not found.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { productName: input.name } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
        ...(input.modelId !== undefined ? { productModelId: input.modelId } : {}),
        ...(input.purchasePrice !== undefined ? { purchasePrice: input.purchasePrice } : {}),
        ...(input.sellingPrice !== undefined ? { sellingPrice: input.sellingPrice } : {}),
        ...(input.wholesalePrice !== undefined ? { wholesalePrice: input.wholesalePrice } : {}),
        ...(input.taxPercentage !== undefined ? { taxPercentage: input.taxPercentage } : {}),
        ...(input.warrantyMonths !== undefined ? { warrantyMonths: input.warrantyMonths } : {}),
        ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? { isActive: input.status === "active" } : {}),
        ...(input.tracksImei !== undefined ? { tracksImei: input.tracksImei } : {}),
      },
    });

    if (input.reorderLevel !== undefined) {
      await tx.inventory.update({ where: { productId: id }, data: { reorderLevel: input.reorderLevel } });
    }
  });

  return getProductById(shopId, id);
}

/**
 * DELETE /api/v1/products/{id} (API Spec Chapter 26.6) — "Cannot delete
 * product with sales history. Use inactive status." In practice every
 * product created through this API already owns an Inventory row the
 * moment it exists, so a hard delete would almost always hit a foreign-key
 * violation anyway; this always soft-deletes instead of trying to detect
 * the one case where a hard delete might succeed.
 */
export async function deleteProduct(shopId: string, id: string): Promise<void> {
  const product = await prisma.product.findFirst({ where: { id, shopId } });
  if (!product) throw new NotFoundError("Product not found.");
  await prisma.product.update({ where: { id }, data: { isActive: false } });
}

/** POST /api/v1/products/{id}/image (API Spec Chapter 26.4). */
export async function uploadProductImage(shopId: string, id: string, file: Express.Multer.File) {
  if (!isCloudinaryConfigured) {
    throw new BadRequestError("Image storage is not configured on this server.");
  }

  const product = await prisma.product.findFirst({ where: { id, shopId } });
  if (!product) throw new NotFoundError("Product not found.");

  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    // Multi-tenancy: shop-namespaced folder so one tenant can never overwrite
    // or enumerate another's Cloudinary assets (spec §53).
    folder: `pos/shops/${shopId}/products`,
    resource_type: "image",
  });

  const existingImageCount = await prisma.productImage.count({ where: { productId: id } });

  const image = await prisma.productImage.create({
    data: {
      productId: id,
      imageUrl: result.secure_url,
      publicId: result.public_id,
      isPrimary: existingImageCount === 0,
    },
    select: { id: true, imageUrl: true, isPrimary: true },
  });

  return image;
}
