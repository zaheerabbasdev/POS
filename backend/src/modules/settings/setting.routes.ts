import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import * as settingController from "./setting.controller.js";
import { updateSettingsSchema } from "./setting.validation.js";

export const settingRouter = Router();

settingRouter.use(authenticate);

// No permission gate on GET — shop name/logo are branding, read by every
// role's sidebar, same reasoning as Dashboard summary having none either.
settingRouter.get("/", settingController.getSettings);
settingRouter.patch(
  "/",
  requirePermission("SETTINGS_MANAGE"),
  validate({ body: updateSettingsSchema }),
  settingController.updateSettings,
);
