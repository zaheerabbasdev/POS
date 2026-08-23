# BUG-004 — Vercel production deployment: five sequential failures

**Status:** Fixed and deployed (backend: `pos_backend`, frontend: `pos_frontend`, both on Vercel; database: Neon).
**Date:** 2026-08-14 / 2026-08-15.

## Summary

Deploying this repo's existing Vercel setup (`backend/vercel.json`, `backend/api/index.ts`)
to two fresh Vercel projects surfaced five distinct, unrelated bugs, one at a
time, each only visible once the previous one was fixed. None of these were
present in local dev — all are specific to running compiled/bundled code on
Vercel's build and serverless runtime.

## 1. `helmet` — "This expression is not callable" (build failure)

**Error:**
```
src/app.ts(23,11): error TS2349: This expression is not callable.
  Type 'typeof import(".../helmet/index")' has no call signatures.
```

**Root cause:** `helmet`'s `.d.cts` type declaration file uses an ESM-style
`export {helmet as default}` statement inside a CJS-typed file — a legal but
unusual pattern. Different TypeScript versions (and even the same version on
different machines) resolve the resulting import type inconsistently:
sometimes callable, sometimes not, under this project's strict
`module: nodenext` + `verbatimModuleSyntax` settings.

**First fix attempt (failed):**
```ts
const helmet = (helmetImport as unknown as { default?: typeof helmetImport }).default ?? helmetImport;
```
This looked reasonable and passed locally (typecheck, build, and a real
runtime HTTP test confirming helmet's headers appeared), but **still failed
on Vercel** with the same error at a shifted line number — proving the fix
itself was broken, not stale caching. The flaw: `typeof helmetImport` is
reused inside its own cast, so both branches of the `??` resolve to the same
ambiguous type. Circular, not actually a fix.

**Working fix:**
```ts
const helmet = helmetImport as unknown as (options?: Readonly<HelmetOptions>) => RequestHandler;
```
Casts to an explicit, independent function signature (taken from helmet's
own `.d.cts`) instead of reusing the ambiguous import's own type — immune to
however a given TypeScript version resolves the original import.

**Lesson:** verifying a type-assertion fix requires checking that the
assertion doesn't just repackage the same ambiguous type it's meant to
route around. A green `tsc --noEmit` isn't enough evidence on its own that a
type-level workaround is actually sound — trace the type, don't just trust
that it compiled.

## 2. `express-rate-limit` — the same bug, different package (build failure)

**Error:** identical shape, next file:
```
src/common/middleware/rateLimiter.ts(8,31): error TS2349: This expression is not callable.
  Type 'typeof import(".../express-rate-limit/dist/index")' has no call signatures.
```

**Root cause:** the exact same `.d.cts` `export {x as default}` authoring
pattern as helmet, in a completely unrelated package.

**Fix:** same strategy as the corrected helmet fix — explicit, independent
function type from the package's own declarations:
```ts
const rateLimit = rateLimitImport as unknown as (
  options?: Partial<RateLimitOptions>,
) => RateLimitRequestHandler;
```
Also had to add explicit `Request`/`Response` param types to the `handler`
callbacks (a second, smaller error: `implicitly has an 'any' type`).

**Follow-up:** every other default-imported package in the backend
(`cors`, `cookie-parser`, `morgan`, `multer`, `bcrypt`, `jsonwebtoken`,
`nodemailer`) was checked for the same `.d.cts` pattern — none have it, so
this class of bug shouldn't resurface for those.

## 3. `useSearchParams()` without Suspense (frontend build failure)

**Error:**
```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/login".
Error occurred prerendering page "/login".
```
Then, once fixed, the identical error on `/reset-password`.

**Root cause:** both `login-form.tsx` (reads a `next=` redirect target) and
`reset-password-form.tsx` (reads the reset token) call `useSearchParams()`.
Next.js's App Router requires any component using it to be wrapped in
`<Suspense>` during static prerendering, or `next build` fails outright —
this is a plain, well-known Next.js requirement, unrelated to the two bugs
above.

**Fix:** wrapped both forms in their parent page:
```tsx
<Suspense fallback={null}>
  <LoginForm />
</Suspense>
```
(and identically for `ResetPasswordForm`).

## 4. Login succeeds (200 + token) but never reaches the dashboard

**Symptom:** the login API call returned a real success response with a
token, a toast fired client-side, but the app never navigated to
`/dashboard` — it silently stayed on/returned to `/login`.

**Root cause:** the frontend (`posfrontend-*.vercel.app`) and backend
(`posbackend-*.vercel.app`) are two separate Vercel projects, each on its
own subdomain. `vercel.app` is on the public suffix list, so these count as
two entirely different websites to a browser, not "one site, two
subdomains." The backend's `Set-Cookie` response was therefore a
**third-party cookie** from the browser's point of view — and modern
browsers (Chrome's default third-party-cookie phase-out, Safari's
long-standing ITP) silently refuse to store those, even over HTTPS with
`SameSite=None; Secure` set correctly. The login call itself succeeded; the
cookie just never got saved, so the next page load looked logged-out.

**Fix:** stopped the browser from ever calling the backend's domain
directly. Added a same-origin rewrite in `next.config.ts`:
```ts
async rewrites() {
  return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
}
```
and changed `lib/api-client.ts` to call a relative `/api/v1` base URL from
the browser (instead of the backend's absolute URL) whenever
`NEXT_PUBLIC_API_URL` is set. The browser now only ever talks to the
frontend's own origin; Next's server relays the request to the real backend
behind the scenes and passes the response (`Set-Cookie` included) back
under the frontend's own origin — making the cookie first-party. Local dev
is unaffected: `NEXT_PUBLIC_API_URL` stays unset there, so the rewrite
doesn't apply and `api-client.ts` keeps calling `localhost:4000` directly.

**Verified locally** with `next build` run twice — once with
`NEXT_PUBLIC_API_URL` unset (local dev path) and once with it set to the
real backend URL (production path) — both compiled clean.

## 5. `POST /api/v1/auth/login` → `405 Method Not Allowed` (immediate follow-up to #4)

**Error:** `POST https://posfrontend-*.vercel.app/login?next=%2Fapi%2Fv1%2Fauth%2Flogin 405`

**Root cause:** direct side effect of the fix in #4. `proxy.ts`'s route
guard matched every path except a couple of Next.js internal ones —
including `/api/*`, which it had never needed to care about before (the
browser used to call the backend's domain directly, so `/api/*` never hit
this frontend's own middleware at all). Once #4 routed login calls through
`/api/v1/auth/login` on the frontend's own domain, the guard intercepted
that request too: no cookie yet on a first login attempt, `/api/v1/...` not
in `PUBLIC_PATHS`, so it 307-redirected the `POST` to
`/login?next=/api/v1/auth/login` — preserving the `POST` method into a
plain page route that only accepts `GET`, hence `405`.

**Fix:** excluded `/api` from the middleware's matcher:
```ts
matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
```
`/api/*` is now the backend's concern entirely (enforced for real by the
Express app on every request); the frontend's route guard no longer touches
it.

## Two more (not code bugs, but repeatedly bit us — documented as process notes)

- **Redeploying an old commit re-shows an already-fixed error.** Clicking
  "Redeploy" on an old row in Vercel's Deployments list rebuilds that exact
  old commit — it does not pull the latest push. Confirmed via
  `git log`/`git rev-parse` showing the fix was already on `origin/main`
  while the build log showed an older commit hash. Always check the commit
  hash in the build log against `git log` before assuming a fix "didn't
  work."
- **Neon's own connection-string names don't match this app's env var
  names.** Neon's Quickstart calls its two connection strings `DATABASE_URL`
  (pooled) and `DATABASE_URL_UNPOOLED` (direct) — this app requires
  `DATABASE_URL` (direct, for the Prisma CLI) and `DIRECT_DATABASE_URL`
  (pooled, for the app's own runtime adapter). Pasting Neon's names in
  verbatim leaves `DIRECT_DATABASE_URL` completely missing, which fails
  `env.ts`'s zod validation and calls `process.exit(1)` at cold start —
  surfacing as a confusing generic Vercel error, `Invalid export found in
  module ".../app.js". The default export must be a function or server.`
  (the process died mid-import before any export could be produced, not an
  actual missing-export bug).

## Files touched

- `backend/src/app.ts` (helmet fix)
- `backend/src/common/middleware/rateLimiter.ts` (rate-limit fix)
- `frontend/app/login/page.tsx`, `frontend/app/reset-password/page.tsx` (Suspense)
- `frontend/next.config.ts` (same-origin API rewrite)
- `frontend/lib/api-client.ts` (relative base URL in browser when deployed)
- `frontend/proxy.ts` (matcher excludes `/api`)
