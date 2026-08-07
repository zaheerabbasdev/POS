import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import * as exportService from "./export.service.js";

export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { reportType: string; format: "csv" | "excel" | "pdf"; filters?: { startDate?: Date; endDate?: Date } };
  const result = await exportService.exportReport(body.reportType, body.format, body.filters ?? {});

  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});
