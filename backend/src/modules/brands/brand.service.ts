import { prisma } from "../../config/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { buildPaginationMeta, getPaginationParams, type PaginationQuery } from "../../common/utils/pagination.js";
import { ConflictError, NotFoundError } from "../../common/errors/AppError.js";

const brandSelect = {
  id: true,
  brandName: true,
  description: true,
  logoUrl: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.BrandSelect;

type BrandRow = Prisma.BrandGetPayload<{ select: typeof brandSelect }>;

function toBrandDto(brand: BrandRow) {
  return {
    id: brand.id,
    name: brand.brandName,
    description: brand.description,
    logoUrl: brand.logoUrl,
    status: brand.isActive ? "active" : ("inactive" as const),
    createdAt: brand.createdAt,
  };
}

export interface ListBrandsInput extends PaginationQuery {
  search?: string;
  status?: "active" | "inactive";
}

/** GET /api/v1/brands (API Spec Chapter 23.1). */
export async function listBrands(shopId: string, input: ListBrandsInput) {
  const { skip, take, page, limit } = getPaginationParams(input);
  const where: Prisma.BrandWhereInput = {
    shopId,
    ...(input.status ? { isActive: input.status === "active" } : {}),
    ...(input.search ? { brandName: { contains: input.search, mode: "insensitive" } } : {}),
  };

  const [brands, total] = await Promise.all([
    prisma.brand.findMany({ where, skip, take, orderBy: { brandName: "asc" }, select: brandSelect }),
    prisma.brand.count({ where }),
  ]);

  return { data: brands.map(toBrandDto), pagination: buildPaginationMeta(page, limit, total) };
}

export async function getBrandById(shopId: string, id: string) {
  const brand = await prisma.brand.findFirst({ where: { id, shopId }, select: brandSelect });
  if (!brand) throw new NotFoundError("Brand not found.");
  return toBrandDto(brand);
}

export interface CreateBrandInput {
  name: string;
  description?: string;
  logoUrl?: string;
  status?: "active" | "inactive";
}

/** POST /api/v1/brands (API Spec Chapter 23.2) — "Brand names must be unique" (SRS Module 3), scoped per shop. */
export async function createBrand(shopId: string, input: CreateBrandInput) {
  const brand = await prisma.brand.create({
    data: {
      shopId,
      brandName: input.name,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.status !== undefined ? { isActive: input.status === "active" } : {}),
    },
    select: brandSelect,
  });
  return toBrandDto(brand);
}

export interface UpdateBrandInput {
  name?: string;
  description?: string;
  logoUrl?: string;
  status?: "active" | "inactive";
}

/** PATCH /api/v1/brands/{id} (API Spec Chapter 23.3). */
export async function updateBrand(shopId: string, id: string, input: UpdateBrandInput) {
  const existing = await prisma.brand.findFirst({ where: { id, shopId } });
  if (!existing) throw new NotFoundError("Brand not found.");

  const brand = await prisma.brand.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { brandName: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.status !== undefined ? { isActive: input.status === "active" } : {}),
    },
    select: brandSelect,
  });
  return toBrandDto(brand);
}

/**
 * DELETE /api/v1/brands/{id} (API Spec Chapter 23.4) — "Cannot delete brand
 * linked with products. Deactivate instead." Unlike Users, a brand with no
 * products at all is genuinely removed (SRS never asks for brand history).
 */
export async function deleteBrand(shopId: string, id: string): Promise<void> {
  const brand = await prisma.brand.findFirst({ where: { id, shopId } });
  if (!brand) throw new NotFoundError("Brand not found.");

  const productCount = await prisma.product.count({ where: { brandId: id, shopId } });
  if (productCount > 0) {
    throw new ConflictError("Cannot delete a brand linked to products. Deactivate it instead.");
  }

  await prisma.brand.delete({ where: { id } });
}
