import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import { requirePlatformContext } from "../../common/middleware/tenant.js";
import * as platformDashboardController from "./platformDashboard.controller.js";

export const platformDashboardRouter = Router();
platformDashboardRouter.use(authenticate, requirePlatformContext);

platformDashboardRouter.get("/summary", requirePermission("PLATFORM_DASHBOARD_VIEW"), platformDashboardController.getSummary);
