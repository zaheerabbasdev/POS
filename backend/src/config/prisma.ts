import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";
import { logger } from "../common/logger/logger.js";

// Prisma Client singleton (SAD Chapter 21 — "Use Prisma Client as a
// singleton"). Prisma 7 requires a driver adapter for SQL providers instead
// of the bundled query engine binary.
const adapter = new PrismaPg({ connectionString: env.DIRECT_DATABASE_URL });

export const prisma = new PrismaClient({ adapter });

export async function connectDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
  logger.info("Database connection established.");
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Database connection closed.");
}
