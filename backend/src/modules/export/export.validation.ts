import { z } from "zod";
import { REPORT_REGISTRY } from "./export.registry.js";

const reportTypeValues = Object.keys(REPORT_REGISTRY) as [string, ...string[]];

// POST /api/v1/export/report (API Spec Chapter 51.1). "Supported Formats:
// PDF, Excel, CSV" — mapped to lowercase machine-friendly values.
export const exportReportSchema = z.object({
  reportType: z.enum(reportTypeValues),
  format: z.enum(["pdf", "excel", "csv"]),
  filters: z
    .object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .optional(),
});
