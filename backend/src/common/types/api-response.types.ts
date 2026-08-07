import type { ErrorDetail } from "../errors/AppError.js";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Standard API response envelope (API Specification Document, Chapters 7 & 18).
export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  pagination?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors?: ErrorDetail[];
}
