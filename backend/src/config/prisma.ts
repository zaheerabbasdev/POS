import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";
import { logger } from "../common/logger/logger.js";

// Prisma Client singleton (SAD Chapter 21 — "Use Prisma Client as a
// singleton"). Prisma 7 requires a driver adapter for SQL providers instead
// of the bundled query engine binary.
const adapter = new PrismaPg({ connectionString: env.DIRECT_DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

const CONNECT_MAX_ATTEMPTS = 15;
const CONNECT_RETRY_DELAY_MS = 1000;

/**
 * Retries on startup because `npm run dev:all` launches `prisma dev` (the
 * local Postgres server) and this app concurrently — the API process can
 * easily win the race and try to connect before Postgres has finished
 * booting. Without this, that's a hard crash ("Server has closed the
 * connection") rather than a few seconds' wait.
 */
export async function connectDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= CONNECT_MAX_ATTEMPTS; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      logger.info("Database connection established.");
      return;
    } catch (err) {
      if (attempt === CONNECT_MAX_ATTEMPTS) throw err;
      logger.warn(`Database not ready yet (attempt ${attempt}/${CONNECT_MAX_ATTEMPTS}) — retrying in ${CONNECT_RETRY_DELAY_MS}ms...`);
      await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_DELAY_MS));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Database connection closed.");
}
