import express, { type Application, type RequestHandler } from "express";
import cors from "cors";
import helmetImport, { type HelmetOptions } from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { corsOrigins, isDevelopment } from "./config/env.js";
import { logger } from "./common/logger/logger.js";
import { apiRateLimiter } from "./common/middleware/rateLimiter.js";
import { notFoundHandler } from "./common/middleware/notFoundHandler.js";
import { errorHandler } from "./common/middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";
import { apiRouter } from "./routes/index.js";

// helmet ships a `.d.cts` declaration file with an ESM-style `export {helmet
// as default}` statement inside a CJS-typed file — a legal but unusual
// authoring pattern that different TypeScript versions have interpreted
// inconsistently under strict NodeNext/verbatimModuleSyntax settings
// (observed: passes under some TS versions, fails with "not callable" under
// others, for the exact same locked dependency version, even on the same
// machine). An earlier attempt to fix this reused `typeof helmetImport` in
// its own cast, which just re-inherits the same broken/ambiguous type — this
// version asserts an explicit, independent function signature instead (taken
// straight from helmet's own .d.cts), so it can't be affected by however a
// given TS version chooses to interpret the original import.
const helmet = helmetImport as unknown as (options?: Readonly<HelmetOptions>) => RequestHandler;

// Express application assembly (SAD Chapter 18 — Request Lifecycle).
// server.ts owns process lifecycle (listen, shutdown); this file only wires
// middleware and routes so it can be imported directly by tests later.
export function createApp(): Application {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use(
    morgan(isDevelopment ? "dev" : "combined", {
      stream: { write: (message) => logger.info(message.trim()) },
    }),
  );

  app.use(apiRateLimiter);

  app.use("/health", healthRouter);
  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
