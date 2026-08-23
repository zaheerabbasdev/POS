import type { Response } from "express";
import { AUTH_COOKIE_NAME } from "../constants/auth.js";
import { env, isProduction } from "../../config/env.js";
import { parseDurationMs } from "./duration.js";

/**
 * Sets the `pos_token` httpOnly auth cookie. Shared by `auth.controller.ts`
 * (login) and `registration.controller.ts` (registration doubles as
 * auto-login — spec §59) so the two never drift on cookie attributes.
 */
export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    // "lax" only sends the cookie on same-site requests — fine for local
    // dev (frontend and backend share a hostname, just different ports),
    // but breaks login entirely once frontend (Vercel) and backend (a
    // separate host) are on different domains, since axios's cross-site
    // fetch calls would never carry it. "none" is required for that case,
    // and browsers only honor "none" when the cookie is also Secure
    // (isProduction implies https, so this pairing is always valid).
    sameSite: isProduction ? "none" : "lax",
    maxAge: parseDurationMs(env.JWT_EXPIRES_IN),
    path: "/",
  });
}
