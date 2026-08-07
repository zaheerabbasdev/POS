import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as customerController from "./customer.controller.js";
import {
  createCustomerSchema,
  customerIdParamSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
} from "./customer.validation.js";

export const customerRouter = Router();

customerRouter.use(authenticate);

customerRouter.get(
  "/",
  requirePermission("CUSTOMER_VIEW", "CUSTOMER_MANAGE"),
  validate({ query: listCustomersQuerySchema }),
  customerController.listCustomers,
);
customerRouter.get(
  "/:id",
  requirePermission("CUSTOMER_VIEW", "CUSTOMER_MANAGE"),
  validate({ params: customerIdParamSchema }),
  customerController.getCustomer,
);
customerRouter.get(
  "/:id/history",
  requirePermission("CUSTOMER_VIEW", "CUSTOMER_MANAGE"),
  validate({ params: customerIdParamSchema }),
  customerController.getCustomerHistory,
);
customerRouter.post(
  "/",
  requirePermission("CUSTOMER_MANAGE"),
  validate({ body: createCustomerSchema }),
  customerController.createCustomer,
);
customerRouter.patch(
  "/:id",
  requirePermission("CUSTOMER_MANAGE"),
  validate({ params: customerIdParamSchema, body: updateCustomerSchema }),
  customerController.updateCustomer,
);
