import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as paymentController from "./payment.controller.js";
import { createPaymentSchema, listPaymentsQuerySchema, referenceIdParamSchema } from "./payment.validation.js";

export const paymentRouter = Router();

paymentRouter.use(authenticate);

paymentRouter.get(
  "/",
  requirePermission("PAYMENT_VIEW", "PAYMENT_MANAGE"),
  validate({ query: listPaymentsQuerySchema }),
  paymentController.listPayments,
);
paymentRouter.post(
  "/",
  requirePermission("PAYMENT_MANAGE"),
  validate({ body: createPaymentSchema }),
  paymentController.createPayment,
);
paymentRouter.get(
  "/history/:id",
  requirePermission("PAYMENT_VIEW", "PAYMENT_MANAGE"),
  validate({ params: referenceIdParamSchema }),
  paymentController.getPaymentHistory,
);
