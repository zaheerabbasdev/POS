import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { uploadSingleImage } from "../../common/middleware/upload.js";
import * as uploadController from "./upload.controller.js";
import { imageIdParamSchema, uploadImageBodySchema } from "./upload.validation.js";

export const uploadRouter = Router();

uploadRouter.use(authenticate);

// One endpoint serves five different entities (products, employees,
// customers, repairs, shop settings), each gated by its own *_MANAGE
// permission — requirePermission can't express "check a permission that
// depends on req.body.type," so that check happens inside the controller
// itself (requirePermissionForUploadType) after the body is parsed.
uploadRouter.post(
  "/image",
  uploadSingleImage("image"),
  validate({ body: uploadImageBodySchema }),
  uploadController.requirePermissionForUploadType,
  uploadController.uploadImage,
);
uploadRouter.delete(
  "/image/:id",
  validate({ params: imageIdParamSchema }),
  uploadController.requirePermissionForDelete,
  uploadController.deleteImage,
);
