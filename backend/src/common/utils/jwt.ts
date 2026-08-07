import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { parseDurationMs } from "./duration.js";

// JWT payload shape (SAD Chapter 16 — Authentication Architecture):
// "User ID, Username, Employee ID, Role IDs, Issued Time, Expiration Time".
// iat/exp are added automatically by jsonwebtoken.
export interface AuthTokenPayload {
  sub: string;
  username: string;
  employeeId: string | null;
  roleIds: string[];
}

export function signAccessToken(payload: AuthTokenPayload): string {
  // Pass expiresIn as a plain number of seconds — jsonwebtoken's types pin
  // the string form to a narrow `ms`-style template literal union that
  // env.JWT_EXPIRES_IN (a validated but plain `string`) can't satisfy.
  const expiresInSeconds = Math.floor(parseDurationMs(env.JWT_EXPIRES_IN) / 1000);
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: expiresInSeconds });
}

export function verifyAccessToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
