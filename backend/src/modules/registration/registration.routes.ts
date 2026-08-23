import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authRateLimiter } from "../../common/middleware/rateLimiter.js";
import * as registrationController from "./registration.controller.js";
import { registerShopSchema } from "./registration.validation.js";

export const registrationRouter = Router();

// Public — no `authenticate`. Same rate limiter as /auth/login and
// /auth/forgot-password (credential/account-creation-adjacent endpoints).
registrationRouter.post(
  "/shop",
  authRateLimiter,
  validate({ body: registerShopSchema }),
  registrationController.registerShop,
);
