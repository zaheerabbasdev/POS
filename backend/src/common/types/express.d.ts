import "express";

// Populated by common/middleware/authenticate.ts once a JWT is verified.
export interface AuthenticatedUser {
  id: string;
  username: string;
  employeeId: string | null;
  // Multi-tenancy: NULL = Platform Admin (operates above all shops);
  // non-NULL = the shop this user belongs to. Tenant-scoped routes must
  // derive their shopId from here via common/middleware/tenant.ts's
  // getShopId(req) — never from a client-supplied value.
  shopId: string | null;
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
