import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../errors/AppError.js";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed."));
      return;
    }
    cb(null, true);
  },
});

/**
 * Wraps multer's single-file upload so rejections (wrong type, too large)
 * come out as the standard `{success:false,...}` envelope instead of an
 * unhandled multer error. Reusable across modules — SAD Chapter 39 lists
 * product images, employee photos, repair documents, and expense receipts
 * as all going through the same Cloudinary upload flow.
 */
export function uploadSingleImage(fieldName: string) {
  const handler = imageUpload.single(fieldName);
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, (err: unknown) => {
      if (err instanceof Error) {
        next(new BadRequestError(err.message));
        return;
      }
      next();
    });
  };
}
