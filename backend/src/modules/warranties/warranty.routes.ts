import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as warrantyController from "./warranty.controller.js";
import { createWarrantyClaimSchema, listWarrantiesQuerySchema } from "./warranty.validation.js";

export const warrantyRouter = Router();

warrantyRouter.use(authenticate);

warrantyRouter.get(
  "/",
  requirePermission("WARRANTY_VIEW", "WARRANTY_MANAGE"),
  validate({ query: listWarrantiesQuerySchema }),
  warrantyController.listWarranties,
);
warrantyRouter.post(
  "/claim",
  requirePermission("WARRANTY_MANAGE"),
  validate({ body: createWarrantyClaimSchema }),
  warrantyController.createWarrantyClaim,
);
