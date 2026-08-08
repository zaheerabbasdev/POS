import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendPaginated } from "../../common/utils/apiResponse.js";
import * as auditService from "./audit.service.js";
import type { ListAuditLogsInput } from "./audit.service.js";

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { data, pagination } = await auditService.listAuditLogs(req.validatedQuery as unknown as ListAuditLogsInput);
  sendPaginated(res, data, pagination);
});
