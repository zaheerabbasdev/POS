import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { corsOrigins, isDevelopment } from "./config/env.js";
import { logger } from "./common/logger/logger.js";
import { apiRateLimiter } from "./common/middleware/rateLimiter.js";
import { notFoundHandler } from "./common/middleware/notFoundHandler.js";
import { errorHandler } from "./common/middleware/errorHandler.js";
import { healthRouter } from "./routes/health.routes.js";
import { apiRouter } from "./routes/index.js";

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
