import { prisma } from "../../config/prisma.js";
import { cloudinary } from "../../config/cloudinary.js";
import { isCloudinaryConfigured } from "../../config/env.js";
import { uploadProductImage as uploadProductImageToProduct } from "../products/product.service.js";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";

export type UploadType = "product" | "employee" | "customer" | "repair" | "logo";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOGO_SETTING_KEY = "shop_logo";

/**
 * Cloudinary URLs embed the public_id in the path
 * (".../upload/v169.../<folder>/<public_id>.<ext>"). Employee/Customer/
 * Repair/Setting only store the URL (no separate publicId column — unlike
 * ProductImage, which already has one), so deleting the Cloudinary asset
 * later means recovering the public_id from the URL itself.
 */
function extractPublicIdFromUrl(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match?.[1] ?? null;
}

async function destroyCloudinaryAsset(url: string): Promise<void> {
  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Best-effort — a stale Cloudinary asset left behind is a minor cleanup
    // issue, not a reason to fail the request when the DB reference (the
    // part users actually see) has already been cleared.
  }
}

function assertCloudinaryConfigured(): void {
  if (!isCloudinaryConfigured) {
    throw new BadRequestError("Image storage is not configured on this server.");
  }
}

export interface UploadImageResult {
  id: string;
  url: string;
  type: UploadType;
  entityId: string | null;
}

/**
 * POST /api/v1/uploads/image (API Spec Chapter 52.1) — "Upload Types:
 * Product Image, Employee Photo, Customer Attachment, Repair Image, Shop
 * Logo," all following the same Frontend Upload → Backend Validation →
 * Cloudinary Upload → Save URL → Database flow the doc lays out. Product
 * already had its own dedicated endpoint (multi-image, primary-flag aware)
 * from Phase 4 — reused here rather than duplicated.
 */
export async function uploadImage(
  shopId: string,
  type: UploadType,
  file: Express.Multer.File,
  entityId?: string,
): Promise<UploadImageResult> {
  assertCloudinaryConfigured();

  if (type === "product") {
    if (!entityId) throw new BadRequestError("entityId (productId) is required for product images.");
    const image = await uploadProductImageToProduct(shopId, entityId, file);
    return { id: image.id, url: image.imageUrl, type, entityId };
  }

  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    // Multi-tenancy: shop-namespaced folder so one tenant can never overwrite
    // or enumerate another's Cloudinary assets (spec §53).
    folder: `pos/shops/${shopId}/${type}`,
    resource_type: "image",
  });

  if (type === "logo") {
    await prisma.setting.upsert({
      where: { shopId_settingKey: { shopId, settingKey: LOGO_SETTING_KEY } },
      update: { settingValue: result.secure_url },
      create: { shopId, settingKey: LOGO_SETTING_KEY, settingValue: result.secure_url, description: "Shop logo image URL" },
    });
    return { id: `logo:shop`, url: result.secure_url, type, entityId: null };
  }

  if (!entityId) throw new BadRequestError(`entityId is required for ${type} images.`);

  if (type === "employee") {
    const employee = await prisma.employee.findFirst({ where: { id: entityId, shopId } });
    if (!employee) throw new NotFoundError("Employee not found.");
    await prisma.employee.update({ where: { id: entityId }, data: { profileImage: result.secure_url } });
  } else if (type === "customer") {
    const customer = await prisma.customer.findFirst({ where: { id: entityId, shopId } });
    if (!customer) throw new NotFoundError("Customer not found.");
    await prisma.customer.update({ where: { id: entityId }, data: { attachmentUrl: result.secure_url } });
  } else {
    const repair = await prisma.repair.findFirst({ where: { id: entityId, shopId } });
    if (!repair) throw new NotFoundError("Repair not found.");
    await prisma.repair.update({ where: { id: entityId }, data: { imageUrl: result.secure_url } });
  }

  return { id: `${type}:${entityId}`, url: result.secure_url, type, entityId };
}

/**
 * DELETE /api/v1/uploads/image/{id} (API Spec Chapter 52.2) — "Remove
 * Cloudinary file, Remove database reference." `id` is either a real
 * ProductImage UUID (product images keep their own row) or the composite
 * "type:entityId"/"logo:shop" string this module's own upload response
 * returns for the single-field entities.
 */
export async function deleteImage(shopId: string, id: string): Promise<void> {
  assertCloudinaryConfigured();

  if (UUID_PATTERN.test(id)) {
    const image = await prisma.productImage.findFirst({ where: { id, product: { shopId } } });
    if (!image) throw new NotFoundError("Image not found.");
    if (image.publicId) {
      try {
        await cloudinary.uploader.destroy(image.publicId);
      } catch {
        // Same best-effort reasoning as destroyCloudinaryAsset above.
      }
    }
    await prisma.productImage.delete({ where: { id } });
    return;
  }

  const [type, entityId] = id.split(":") as [UploadType | undefined, string | undefined];
  if (!type || !entityId) throw new BadRequestError(`Invalid image id "${id}".`);

  if (type === "logo") {
    const setting = await prisma.setting.findFirst({ where: { shopId, settingKey: LOGO_SETTING_KEY } });
    if (!setting?.settingValue) throw new NotFoundError("Logo image not found.");
    await destroyCloudinaryAsset(setting.settingValue);
    await prisma.setting.update({
      where: { shopId_settingKey: { shopId, settingKey: LOGO_SETTING_KEY } },
      data: { settingValue: null },
    });
    return;
  }

  if (type === "employee") {
    const employee = await prisma.employee.findFirst({ where: { id: entityId, shopId } });
    if (!employee?.profileImage) throw new NotFoundError("Employee photo not found.");
    await destroyCloudinaryAsset(employee.profileImage);
    await prisma.employee.update({ where: { id: entityId }, data: { profileImage: null } });
    return;
  }

  if (type === "customer") {
    const customer = await prisma.customer.findFirst({ where: { id: entityId, shopId } });
    if (!customer?.attachmentUrl) throw new NotFoundError("Customer attachment not found.");
    await destroyCloudinaryAsset(customer.attachmentUrl);
    await prisma.customer.update({ where: { id: entityId }, data: { attachmentUrl: null } });
    return;
  }

  if (type === "repair") {
    const repair = await prisma.repair.findFirst({ where: { id: entityId, shopId } });
    if (!repair?.imageUrl) throw new NotFoundError("Repair image not found.");
    await destroyCloudinaryAsset(repair.imageUrl);
    await prisma.repair.update({ where: { id: entityId }, data: { imageUrl: null } });
    return;
  }

  throw new BadRequestError(`Invalid image id "${id}".`);
}
