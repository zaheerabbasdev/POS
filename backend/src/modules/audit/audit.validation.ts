import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";

// GET /api/v1/audit-logs (DDD Chapter 31).
export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  module: z.string().trim().optional(),
  action: z.string().trim().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
