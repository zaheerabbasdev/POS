import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { ConflictError, NotFoundError } from "../../common/errors/AppError.js";

const categorySelect = {
  id: true,
  categoryName: true,
  description: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.CategorySelect;

type CategoryRow = Prisma.CategoryGetPayload<{ select: typeof categorySelect }>;

function toCategoryDto(category: CategoryRow) {
  return {
    id: category.id,
    name: category.categoryName,
    description: category.description,
    status: category.isActive ? "active" : ("inactive" as const),
    createdAt: category.createdAt,
  };
}

export interface ListCategoriesInput extends PaginationQuery {
  search?: string;
  status?: "active" | "inactive";
}

/** GET /api/v1/categories (API Spec Chapter 24.1). */
export async function listCategories(shopId: string, input: ListCategoriesInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.CategoryWhereInput = {
    shopId,
    ...(input.status ? { isActive: input.status === "active" } : {}),
    ...(input.search ? { categoryName: { contains: input.search, mode: "insensitive" } } : {}),
  };

  const [categories, total] = await Promise.all([
    prisma.category.findMany({ where, skip, take, orderBy: { categoryName: "asc" }, select: categorySelect }),
    prisma.category.count({ where }),
  ]);

  return { data: categories.map(toCategoryDto), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getCategoryById(shopId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, shopId }, select: categorySelect });
  if (!category) throw new NotFoundError("Category not found.");
  return toCategoryDto(category);
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  status?: "active" | "inactive";
}

/** POST /api/v1/categories (API Spec Chapter 24.2). */
export async function createCategory(shopId: string, input: CreateCategoryInput) {
  const category = await prisma.category.create({
    data: {
      shopId,
      categoryName: input.name,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { isActive: input.status === "active" } : {}),
    },
    select: categorySelect,
  });
  return toCategoryDto(category);
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  status?: "active" | "inactive";
}

/** PATCH /api/v1/categories/{id} (API Spec Chapter 24.3). */
export async function updateCategory(shopId: string, id: string, input: UpdateCategoryInput) {
  const existing = await prisma.category.findFirst({ where: { id, shopId } });
  if (!existing) throw new NotFoundError("Category not found.");

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { categoryName: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { isActive: input.status === "active" } : {}),
    },
    select: categorySelect,
  });
  return toCategoryDto(category);
}

/**
 * DELETE /api/v1/categories/{id} (API Spec Chapter 24.4). Every product
 * requires a category (schema is NOT NULL, DDD Table 10), so — mirroring
 * the brand rule the doc states explicitly — a category still in use can't
 * be hard-deleted without orphaning those products; deactivate instead.
 */
export async function deleteCategory(shopId: string, id: string): Promise<void> {
  const category = await prisma.category.findFirst({ where: { id, shopId } });
  if (!category) throw new NotFoundError("Category not found.");

  const productCount = await prisma.product.count({ where: { categoryId: id, shopId } });
  if (productCount > 0) {
    throw new ConflictError("Cannot delete a category linked to products. Deactivate it instead.");
  }

  await prisma.category.delete({ where: { id } });
}
