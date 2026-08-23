import { z } from "zod";

export const selectPlanSchema = z.object({
  planId: z.string().uuid("Invalid plan id."),
});
