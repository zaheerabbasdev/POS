import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import { requirePlatformContext } from "../../common/middleware/tenant.js";
import * as shopController from "./shop.controller.js";
import {
  createShopSchema,
  extendTrialSchema,
  listShopsQuerySchema,
  shopIdParamSchema,
  updateShopSchema,
} from "./shop.validation.js";

export const shopRouter = Router();

// Platform Admin only — authenticate, then hard-block any user whose token
// resolves to a real shop (defense-in-depth alongside the PLATFORM_* permission
// checks below), matching requirePlatformContext's own doc comment.
shopRouter.use(authenticate, requirePlatformContext);

shopRouter.get(
  "/",
  requirePermission("PLATFORM_SHOP_VIEW"),
  validate({ query: listShopsQuerySchema }),
  shopController.listShops,
);
shopRouter.get(
  "/:id",
  requirePermission("PLATFORM_SHOP_VIEW"),
  validate({ params: shopIdParamSchema }),
  shopController.getShop,
);
shopRouter.post(
  "/",
  requirePermission("PLATFORM_SHOP_CREATE"),
  validate({ body: createShopSchema }),
  shopController.createShop,
);
shopRouter.patch(
  "/:id",
  requirePermission("PLATFORM_SHOP_UPDATE"),
  validate({ params: shopIdParamSchema, body: updateShopSchema }),
  shopController.updateShop,
);
shopRouter.patch(
  "/:id/suspend",
  requirePermission("PLATFORM_SHOP_SUSPEND"),
  validate({ params: shopIdParamSchema }),
  shopController.suspendShop,
);
shopRouter.patch(
  "/:id/activate",
  requirePermission("PLATFORM_SHOP_ACTIVATE"),
  validate({ params: shopIdParamSchema }),
  shopController.activateShop,
);
shopRouter.post(
  "/:id/extend-trial",
  requirePermission("PLATFORM_TRIAL_EXTEND"),
  validate({ params: shopIdParamSchema, body: extendTrialSchema }),
  shopController.extendTrial,
);
