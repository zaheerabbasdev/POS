import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import { uploadSingleImage } from "../../common/middleware/upload.js";
import * as productController from "./product.controller.js";
import {
  createProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
} from "./product.validation.js";

export const productRouter = Router();

productRouter.use(authenticate);

productRouter.get(
  "/",
  requirePermission("PRODUCT_VIEW", "PRODUCT_MANAGE"),
  validate({ query: listProductsQuerySchema }),
  productController.listProducts,
);
productRouter.get(
  "/:id",
  requirePermission("PRODUCT_VIEW", "PRODUCT_MANAGE"),
  validate({ params: productIdParamSchema }),
  productController.getProduct,
);
productRouter.post(
  "/",
  requirePermission("PRODUCT_MANAGE"),
  validate({ body: createProductSchema }),
  productController.createProduct,
);
productRouter.patch(
  "/:id",
  requirePermission("PRODUCT_MANAGE"),
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  productController.updateProduct,
);
productRouter.delete(
  "/:id",
  requirePermission("PRODUCT_MANAGE"),
  validate({ params: productIdParamSchema }),
  productController.deleteProduct,
);
productRouter.post(
  "/:id/image",
  requirePermission("PRODUCT_MANAGE"),
  validate({ params: productIdParamSchema }),
  uploadSingleImage("image"),
  productController.uploadProductImage,
);
