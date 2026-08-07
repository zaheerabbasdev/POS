import "dotenv/config";
import type { Server } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/prisma.js";
import { logger } from "./common/logger/logger.js";

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();

  const server: Server = app.listen(env.PORT, () => {
    logger.info(`Mobile Shop POS API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  registerShutdownHandlers(server);
}

function registerShutdownHandlers(server: Server): void {
  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async (err) => {
      if (err) {
        logger.error({ err }, "Error while closing HTTP server");
      }
      try {
        await disconnectDatabase();
      } finally {
        process.exit(err ? 1 : 0);
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (err) => {
    logger.error({ err }, "Uncaught exception — shutting down");
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
