import "express";

// Populated by the (not-yet-built) auth middleware once a JWT is verified.
// Declared now so downstream middleware/controllers can rely on the shape.
export interface AuthenticatedUser {
  id: string;
  username: string;
  employeeId: string | null;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      /**
       * Coerced/defaulted query data from `validate()`. Express 5's
       * `req.query` is a live getter re-derived from the URL on every
       * access, so mutating it in place doesn't persist across reads —
       * validated query values must be read from here instead.
       */
      validatedQuery?: Record<string, unknown>;
    }
  }
}

export {};
