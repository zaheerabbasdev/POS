import type { NextConfig } from "next";

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
  /* config options here */
};

export default nextConfig;
