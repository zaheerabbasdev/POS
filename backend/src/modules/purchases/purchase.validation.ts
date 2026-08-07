import { z } from "zod";
import { paginationQuerySchema } from "../../common/utils/pagination.js";
import { PAYMENT_METHOD_INPUT_VALUES } from "../../common/utils/paymentMethod.js";

// GET /api/v1/purchases (API Spec Chapter 31.1).
export const listPurchasesQuerySchema = paginationQuerySchema.extend({
  supplierId: z.string().uuid().optional(),
  status: z.enum(["PENDING", "PARTIAL", "PAID"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const purchaseIdParamSchema = z.object({
  id: z.string().uuid("Invalid purchase id."),
});

const purchaseItemSchema = z.object({
  productId: z.string().uuid("A valid productId is required."),
  quantity: z.coerce.number().int().positive("Quantity must be greater than zero."),
  purchasePrice: z.coerce.number().nonnegative(),
  discount: z.coerce.number().nonnegative().optional(),
  tax: z.coerce.number().nonnegative().optional(),
  // Required (and length-checked against quantity) for products with
  // tracksImei=true; ignored for accessory-like products.
  imeis: z.array(z.string().trim().min(1)).optional(),
});

// POST /api/v1/purchases (API Spec Chapter 31.3).
export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid("A valid supplierId is required."),
  invoiceNo: z.string().trim().optional(),
  purchaseDate: z.coerce.date().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required."),
  discount: z.coerce.number().nonnegative().optional(),
  shippingCost: z.coerce.number().nonnegative().optional(),
  remarks: z.string().trim().optional(),
  payment: z
    .object({
      method: z.enum(PAYMENT_METHOD_INPUT_VALUES),
      amount: z.coerce.number().positive(),
    })
    .optional(),
});

// PATCH /api/v1/purchases/{id} (API Spec Chapter 31.4). "Payment
// Information" updates go through the Payments module (POST /payments)
// instead of being folded into this endpoint — recording an additional
// payment is a distinct action from editing the purchase record itself.
export const updatePurchaseSchema = z
  .object({
    supplierId: z.string().uuid().optional(),
    purchaseDate: z.coerce.date().optional(),
    remarks: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided." });
