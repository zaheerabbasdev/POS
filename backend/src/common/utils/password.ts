import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

/** SAD Chapter 40 — Security Architecture: passwords are never stored in plain text. */
export function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export function comparePassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}
