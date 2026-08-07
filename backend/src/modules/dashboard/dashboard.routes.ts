import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import * as dashboardController from "./dashboard.controller.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

// No specific permission gate — the dashboard is the landing page for every
// role; it just summarizes data each role can already see via its own
// module permissions.
dashboardRouter.get("/summary", dashboardController.getSummary);
