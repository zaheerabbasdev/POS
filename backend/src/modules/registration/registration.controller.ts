import type { Request, Response } from "express";
import { asyncHandler } from "../../common/middleware/asyncHandler.js";
import { sendSuccess } from "../../common/utils/apiResponse.js";
import { setAuthCookie } from "../../common/utils/authCookie.js";
import { HttpStatus } from "../../common/constants/httpStatus.js";
import * as registrationService from "./registration.service.js";
import type { RegisterShopBody } from "./registration.validation.js";

export const registerShop = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as RegisterShopBody;
  const { token, user, trial } = await registrationService.registerShop(body);
  // Registration doubles as auto-login (spec §59) — same cookie the login
  // endpoint sets, so the new owner lands signed in.
  setAuthCookie(res, token);
  sendSuccess(res, { user, trial }, "Shop registered successfully.", HttpStatus.CREATED);
});
