/**
 * Splits a single "full name" form field into the firstName/lastName pair
 * several DDD tables use (Employee, Customer). Several API Spec request
 * bodies (Create User, Create Customer) only send one "name" field.
 */
export function splitName(fullName: string): { firstName: string; lastName: string | null } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0]!;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return { firstName, lastName };
}
