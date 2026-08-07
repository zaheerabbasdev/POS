import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as categoryController from "./category.controller.js";
import {
  categoryIdParamSchema,
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from "./category.validation.js";

export const categoryRouter = Router();

categoryRouter.use(authenticate);

categoryRouter.get(
  "/",
  requirePermission("PRODUCT_VIEW", "PRODUCT_MANAGE"),
  validate({ query: listCategoriesQuerySchema }),
  categoryController.listCategories,
);
categoryRouter.get(
  "/:id",
  requirePermission("PRODUCT_VIEW", "PRODUCT_MANAGE"),
  validate({ params: categoryIdParamSchema }),
  categoryController.getCategory,
);
categoryRouter.post(
  "/",
  requirePermission("PRODUCT_MANAGE"),
  validate({ body: createCategorySchema }),
  categoryController.createCategory,
);
categoryRouter.patch(
  "/:id",
  requirePermission("PRODUCT_MANAGE"),
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  categoryController.updateCategory,
);
categoryRouter.delete(
  "/:id",
  requirePermission("PRODUCT_MANAGE"),
  validate({ params: categoryIdParamSchema }),
  categoryController.deleteCategory,
);
