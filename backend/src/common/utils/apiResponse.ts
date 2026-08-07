import type { Response } from "express";
import { HttpStatus } from "../constants/httpStatus.js";
import type { PaginationMeta } from "../types/api-response.types.js";

/** 200/201 — send a single-resource success response. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Operation completed successfully.",
  statusCode: number = HttpStatus.OK,
): Response {
  return res.status(statusCode).json({ success: true, message, data });
}

/** 200 — send a list response with pagination metadata (API spec Chapter 18). */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message = "Operation completed successfully.",
): Response {
  return res.status(HttpStatus.OK).json({ success: true, message, data, pagination });
}

/** 204 — send a success response with no body (e.g. after a delete). */
export function sendNoContent(res: Response): Response {
  return res.status(HttpStatus.NO_CONTENT).send();
}
