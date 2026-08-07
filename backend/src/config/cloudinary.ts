import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";
import { logger } from "../common/logger/logger.js";

// Image storage (BRD/SRS — product images, employee photos, repair &
// expense attachments). Configured eagerly here; actual upload helpers live
// with the modules that need them (e.g. products) once those are built.
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
} else {
  logger.warn(
    "Cloudinary credentials are not set — image upload endpoints will be unavailable until CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are configured.",
  );
}

export { cloudinary };
