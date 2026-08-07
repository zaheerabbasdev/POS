import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as userController from "./user.controller.js";
import { createUserSchema, listUsersQuerySchema, updateUserSchema, userIdParamSchema } from "./user.validation.js";

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get(
  "/",
  requirePermission("USER_VIEW", "USER_MANAGE"),
  validate({ query: listUsersQuerySchema }),
  userController.listUsers,
);
userRouter.get(
  "/:id",
  requirePermission("USER_VIEW", "USER_MANAGE"),
  validate({ params: userIdParamSchema }),
  userController.getUser,
);
userRouter.post(
  "/",
  requirePermission("USER_MANAGE"),
  validate({ body: createUserSchema }),
  userController.createUser,
);
userRouter.patch(
  "/:id",
  requirePermission("USER_MANAGE"),
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  userController.updateUser,
);
userRouter.delete(
  "/:id",
  requirePermission("USER_MANAGE"),
  validate({ params: userIdParamSchema }),
  userController.deleteUser,
);
