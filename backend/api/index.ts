import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../dist/app.js";

// Vercel serverless entry point — separate from src/server.ts, which owns
// the traditional always-running process lifecycle (app.listen(), graceful
// shutdown handlers) used by local dev and non-serverless hosts (Render,
// Railway). Neither of those apply here: Vercel invokes this default export
// once per incoming request instead of keeping a process alive, so there's
// no port to listen on and no shutdown signal to catch.
//
// Imports the already-compiled src/app.js (not app.ts) — vercel.json runs
// `npm run build` before this function is bundled, so this reuses the exact
// same tsc output already verified locally, rather than asking Vercel's own
// esbuild-based function bundler to resolve this project's NodeNext-style
// ".js"-suffixed imports from TypeScript source directly.
//
// createApp() is a pure factory (see src/app.ts) with no side effects of its
// own beyond wiring middleware/routes, so calling it fresh here is cheap and
// safe to do on every cold start.
const app = createApp();

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Express's request handler signature is a structural match for
  // (IncomingMessage, ServerResponse) — which is what VercelRequest/
  // VercelResponse both extend — so the whole existing middleware chain
  // (helmet, cors, auth, every /api/v1 route) runs completely unmodified.
  return app(req, res);
}
