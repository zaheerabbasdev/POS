import { randomBytes } from "node:crypto";

/**
 * Short, prefixed, random reference code (e.g. "EMP-A1B2C3D4", "INV-9F3C1A2B").
 * Used everywhere the schema requires a human-facing unique code but the API
 * contract doesn't ask the client to supply one (SKU, employee code,
 * customer/supplier code, purchase/invoice numbers). No sequential counter —
 * collisions are astronomically unlikely and the DB's unique constraint
 * backstops it regardless.
 */
export function generateCode(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}
