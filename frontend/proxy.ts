import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Must match backend/src/common/constants/auth.ts AUTH_COOKIE_NAME — the two
// apps are separate projects with no shared package, so this is duplicated
// by hand rather than imported.
const AUTH_COOKIE_NAME = "pos_token";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

/**
 * Route protection (SAD Chapter 30). This only checks whether the auth
 * cookie is *present* — cheap, no DB/JWT-secret access from the frontend.
 * The cookie's validity is enforced for real by the backend on every API
 * call; a stale/expired cookie just means the first API call 401s and the
 * user gets sent back to /login from there.
 *
 * Next.js 16 renamed `middleware.ts`/`middleware()` to `proxy.ts`/`proxy()`.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has(AUTH_COOKIE_NAME);
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
