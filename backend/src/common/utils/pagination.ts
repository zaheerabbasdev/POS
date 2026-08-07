import { z } from "zod";
import type { PaginationMeta } from "../types/api-response.types.js";

// GET /api/v1/products?page=1&limit=20 (API Specification Document, Chapter 18).
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationParams {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/** Turn a validated { page, limit } query into Prisma's { skip, take }. */
export function getPaginationParams(query: PaginationQuery): PaginationParams {
  const { page, limit } = query;
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
