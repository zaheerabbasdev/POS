import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { requirePermission } from "../../common/middleware/authorize.js";
import { requirePlatformContext } from "../../common/middleware/tenant.js";
import * as platformReportController from "./platformReport.controller.js";

export const platformReportRouter = Router();
platformReportRouter.use(authenticate, requirePlatformContext, requirePermission("PLATFORM_REPORT_VIEW"));

platformReportRouter.get("/shops-performance", platformReportController.getShopsPerformance);
platformReportRouter.get("/subscription-overview", platformReportController.getSubscriptionOverview);
