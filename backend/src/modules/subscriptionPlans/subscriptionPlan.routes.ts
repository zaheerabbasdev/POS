import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import { requirePlatformContext } from "../../common/middleware/tenant.js";
import * as subscriptionPlanController from "./subscriptionPlan.controller.js";
import { createPlanSchema, planIdParamSchema, updatePlanSchema } from "./subscriptionPlan.validation.js";

export const subscriptionPlanRouter = Router();

subscriptionPlanRouter.use(authenticate, requirePlatformContext);

subscriptionPlanRouter.get("/", requirePermission("PLATFORM_PLAN_VIEW", "PLATFORM_PLAN_MANAGE"), subscriptionPlanController.listPlans);
subscriptionPlanRouter.post(
  "/",
  requirePermission("PLATFORM_PLAN_MANAGE"),
  validate({ body: createPlanSchema }),
  subscriptionPlanController.createPlan,
);
subscriptionPlanRouter.patch(
  "/:id",
  requirePermission("PLATFORM_PLAN_MANAGE"),
  validate({ params: planIdParamSchema, body: updatePlanSchema }),
  subscriptionPlanController.updatePlan,
);
