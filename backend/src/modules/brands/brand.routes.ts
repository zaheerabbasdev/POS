import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as brandController from "./brand.controller.js";
import { brandIdParamSchema, createBrandSchema, listBrandsQuerySchema, updateBrandSchema } from "./brand.validation.js";

export const brandRouter = Router();

brandRouter.use(authenticate);

brandRouter.get(
  "/",
  requirePermission("PRODUCT_VIEW", "PRODUCT_MANAGE"),
  validate({ query: listBrandsQuerySchema }),
  brandController.listBrands,
);
brandRouter.get(
  "/:id",
  requirePermission("PRODUCT_VIEW", "PRODUCT_MANAGE"),
  validate({ params: brandIdParamSchema }),
  brandController.getBrand,
);
brandRouter.post(
  "/",
  requirePermission("PRODUCT_MANAGE"),
  validate({ body: createBrandSchema }),
  brandController.createBrand,
);
brandRouter.patch(
  "/:id",
  requirePermission("PRODUCT_MANAGE"),
  validate({ params: brandIdParamSchema, body: updateBrandSchema }),
  brandController.updateBrand,
);
brandRouter.delete(
  "/:id",
  requirePermission("PRODUCT_MANAGE"),
  validate({ params: brandIdParamSchema }),
  brandController.deleteBrand,
);
