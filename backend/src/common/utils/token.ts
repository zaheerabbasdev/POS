import { randomBytes, createHash } from "node:crypto";

/** Opaque, single-use tokens (password reset links). Not JWTs — no payload to trust, just a lookup key. */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashResetToken(token) };
}

/** Only the hash is persisted, mirroring how passwords are stored — a leaked DB row can't be replayed. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
