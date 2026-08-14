import type { NextConfig } from "next";

// When the frontend and backend are deployed as two separate Vercel
// projects, they end up on two different *.vercel.app addresses — and
// *.vercel.app is on the public suffix list, so browsers treat those as two
// completely unrelated websites, not "the same site, different subdomain".
// That means the login cookie the backend sets is a third-party cookie from
// the browser's point of view, and Chrome/Safari increasingly refuse to
// store those at all — login appears to succeed (the API call returns 200)
// but the cookie never actually gets saved, so the very next page load
// looks logged-out and bounces back to /login.
//
// The fix: never let the browser talk to the backend's domain directly.
// Instead, the browser only ever calls this frontend's own domain at
// `/api/*`; this rewrite makes Next's own server quietly forward that
// request to the real backend and relay the response back unchanged. Since
// the browser's connection never leaves this frontend's origin, the
// `Set-Cookie` it receives is a normal first-party cookie for this site.
// Local dev is untouched — NEXT_PUBLIC_API_URL is left unset there, so this
// rewrite doesn't apply and lib/api-client.ts talks to localhost:4000
// directly as before.
const backendUrl = process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
   devIndicators: false,
  // Next's dev server blocks cross-origin requests to dev assets (_next/*)
  // by default — only `localhost` is allowed out of the box. Wildcarded to
  // the whole private-LAN range (not one hardcoded IP) since this file is
  // committed and different developers/reconnects land on different IPs —
  // Next rejects a bare "*" here (anti-DNS-rebinding safeguard), so this is
  // as broad as it gets while still being IP-range-scoped. Verified against
  // the installed Next 16's matchWildcardDomain (per-octet matching) in
  // node_modules/next/dist/server/app-render/csrf-protection.js. Restart
  // `next dev` after changing this — see .../allowedDevOrigins.md for docs.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  ...(backendUrl
    ? {
        async rewrites() {
          return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
        },
      }
    : {}),
  /* config options here */
};

export default nextConfig;
