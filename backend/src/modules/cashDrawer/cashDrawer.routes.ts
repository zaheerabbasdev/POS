import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as cashDrawerController from "./cashDrawer.controller.js";
import {
  cashMovementSchema,
  closeDrawerSchema,
  listDrawersQuerySchema,
  openDrawerSchema,
  summaryQuerySchema,
} from "./cashDrawer.validation.js";

export const cashDrawerRouter = Router();

cashDrawerRouter.use(authenticate);

cashDrawerRouter.get(
  "/",
  requirePermission("CASH_DRAWER_VIEW", "CASH_DRAWER_MANAGE"),
  validate({ query: listDrawersQuerySchema }),
  cashDrawerController.listDrawers,
);
cashDrawerRouter.get(
  "/current",
  requirePermission("CASH_DRAWER_VIEW", "CASH_DRAWER_MANAGE"),
  cashDrawerController.getCurrent,
);
cashDrawerRouter.get(
  "/summary",
  requirePermission("CASH_DRAWER_VIEW", "CASH_DRAWER_MANAGE"),
  validate({ query: summaryQuerySchema }),
  cashDrawerController.getSummary,
);
cashDrawerRouter.post(
  "/open",
  requirePermission("CASH_DRAWER_MANAGE"),
  validate({ body: openDrawerSchema }),
  cashDrawerController.openDrawer,
);
cashDrawerRouter.post(
  "/close",
  requirePermission("CASH_DRAWER_MANAGE"),
  validate({ body: closeDrawerSchema }),
  cashDrawerController.closeDrawer,
);
cashDrawerRouter.post(
  "/cash-in",
  requirePermission("CASH_DRAWER_MANAGE"),
  validate({ body: cashMovementSchema }),
  cashDrawerController.cashIn,
);
cashDrawerRouter.post(
  "/cash-out",
  requirePermission("CASH_DRAWER_MANAGE"),
  validate({ body: cashMovementSchema }),
  cashDrawerController.cashOut,
);
