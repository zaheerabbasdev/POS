import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as salesReturnController from "./salesReturn.controller.js";
import { createSalesReturnSchema, listSalesReturnsQuerySchema } from "./salesReturn.validation.js";

export const salesReturnRouter = Router();

salesReturnRouter.use(authenticate);

salesReturnRouter.get(
  "/",
  requirePermission("SALE_VIEW", "SALE_CANCEL"),
  validate({ query: listSalesReturnsQuerySchema }),
  salesReturnController.listSalesReturns,
);
// SALE_CANCEL doubles as "Cancel or return sales" (see its permission
// description in prisma/seed.ts) — no separate SALE_RETURN code needed.
salesReturnRouter.post(
  "/",
  requirePermission("SALE_CANCEL"),
  validate({ body: createSalesReturnSchema }),
  salesReturnController.createSalesReturn,
);
