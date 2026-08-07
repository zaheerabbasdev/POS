import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { ConflictError, NotFoundError } from "../../common/errors/AppError.js";

const productModelSelect = {
  id: true,
  modelName: true,
  releaseYear: true,
  description: true,
  isActive: true,
  createdAt: true,
  brand: { select: { id: true, brandName: true } },
} satisfies Prisma.ProductModelSelect;

type ProductModelRow = Prisma.ProductModelGetPayload<{ select: typeof productModelSelect }>;

function toProductModelDto(model: ProductModelRow) {
  return {
    id: model.id,
    name: model.modelName,
    brandId: model.brand.id,
    brand: model.brand.brandName,
    releaseYear: model.releaseYear,
    description: model.description,
    status: model.isActive ? "active" : ("inactive" as const),
    createdAt: model.createdAt,
  };
}

export interface ListProductModelsInput extends PaginationQuery {
  search?: string;
  brandId?: string;
  status?: "active" | "inactive";
}

/** GET /api/v1/models (API Spec Chapter 25.1). */
export async function listProductModels(input: ListProductModelsInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.ProductModelWhereInput = {
    ...(input.status ? { isActive: input.status === "active" } : {}),
    ...(input.brandId ? { brandId: input.brandId } : {}),
    ...(input.search ? { modelName: { contains: input.search, mode: "insensitive" } } : {}),
  };

  const [models, total] = await Promise.all([
    prisma.productModel.findMany({ where, skip, take, orderBy: { modelName: "asc" }, select: productModelSelect }),
    prisma.productModel.count({ where }),
  ]);

  return { data: models.map(toProductModelDto), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getProductModelById(id: string) {
  const model = await prisma.productModel.findUnique({ where: { id }, select: productModelSelect });
  if (!model) throw new NotFoundError("Product model not found.");
  return toProductModelDto(model);
}

export interface CreateProductModelInput {
  name: string;
  brandId: string;
  releaseYear?: number;
  description?: string;
  status?: "active" | "inactive";
}

/** POST /api/v1/models (API Spec Chapter 25.2) — "Duplicate models under the same brand are not allowed" (SRS Module 5). */
export async function createProductModel(input: CreateProductModelInput) {
  const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
  if (!brand) throw new NotFoundError("Brand not found.");

  const model = await prisma.productModel.create({
    data: {
      modelName: input.name,
      brandId: input.brandId,
      ...(input.releaseYear !== undefined ? { releaseYear: input.releaseYear } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { isActive: input.status === "active" } : {}),
    },
    select: productModelSelect,
  });
  return toProductModelDto(model);
}

export interface UpdateProductModelInput {
  name?: string;
  brandId?: string;
  releaseYear?: number;
  description?: string;
  status?: "active" | "inactive";
}

/** PATCH /api/v1/models/{id} (API Spec Chapter 25.3). */
export async function updateProductModel(id: string, input: UpdateProductModelInput) {
  const existing = await prisma.productModel.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Product model not found.");

  if (input.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: input.brandId } });
    if (!brand) throw new NotFoundError("Brand not found.");
  }

  const model = await prisma.productModel.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { modelName: input.name } : {}),
      ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
      ...(input.releaseYear !== undefined ? { releaseYear: input.releaseYear } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { isActive: input.status === "active" } : {}),
    },
    select: productModelSelect,
  });
  return toProductModelDto(model);
}

/** DELETE /api/v1/models/{id} (API Spec Chapter 25.4) — same "deactivate instead" rule as Brands/Categories. */
export async function deleteProductModel(id: string): Promise<void> {
  const model = await prisma.productModel.findUnique({ where: { id } });
  if (!model) throw new NotFoundError("Product model not found.");

  const productCount = await prisma.product.count({ where: { productModelId: id } });
  if (productCount > 0) {
    throw new ConflictError("Cannot delete a model linked to products. Deactivate it instead.");
  }

  await prisma.productModel.delete({ where: { id } });
}
