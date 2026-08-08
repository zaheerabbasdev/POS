import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as auditController from "./audit.controller.js";
import { listAuditLogsQuerySchema } from "./audit.validation.js";

export const auditRouter = Router();

auditRouter.use(authenticate);
auditRouter.use(requirePermission("AUDIT_VIEW"));

auditRouter.get("/", validate({ query: listAuditLogsQuerySchema }), auditController.listAuditLogs);
