import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { authRateLimiter } from "../../common/middleware/rateLimiter.js";
import * as authController from "./auth.controller.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "./auth.validation.js";

export const authRouter = Router();

authRouter.post("/login", authRateLimiter, validate({ body: loginSchema }), authController.login);
authRouter.post("/logout", authenticate, authController.logout);
authRouter.get("/me", authenticate, authController.me);
authRouter.patch(
  "/change-password",
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword,
);
authRouter.post(
  "/forgot-password",
  authRateLimiter,
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword,
);
authRouter.post("/reset-password", authRateLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);
