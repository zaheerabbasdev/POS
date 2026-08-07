import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as exportController from "./export.controller.js";
import { exportReportSchema } from "./export.validation.js";

export const exportRouter = Router();

exportRouter.use(authenticate);
exportRouter.post(
  "/report",
  requirePermission("REPORT_EXPORT"),
  validate({ body: exportReportSchema }),
  exportController.exportReport,
);
