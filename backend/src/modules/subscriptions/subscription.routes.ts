import { Router } from "express";
import { validate } from "../../common/middleware/validate.js";
import { authenticate } from "../../common/middleware/authenticate.js";
import * as subscriptionController from "./subscription.controller.js";
import { selectPlanSchema } from "./subscription.validation.js";

export const subscriptionRouter = Router();
subscriptionRouter.use(authenticate);

// Deliberately never gated by requireOperationalAccess — an expired/suspended
// shop must still be able to see and choose a plan to get unblocked.
subscriptionRouter.get("/", subscriptionController.getCurrentSubscription);
subscriptionRouter.get("/plans", subscriptionController.listSelectablePlans);
subscriptionRouter.post("/select-plan", validate({ body: selectPlanSchema }), subscriptionController.selectPlan);
