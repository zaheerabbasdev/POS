import "dotenv/config";
import { z } from "zod";

// Prisma 7 no longer loads .env automatically, so every entrypoint that
// needs process.env (server.ts, this file) imports "dotenv/config" first.

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // Prisma CLI datasource (see prisma.config.ts) — proxy URL for local `prisma dev`.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  // Direct TCP URL used by the app's own PrismaPg driver adapter at runtime.
  DIRECT_DATABASE_URL: z.string().min(1, "DIRECT_DATABASE_URL is required."),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters."),
  JWT_EXPIRES_IN: z.string().default("1d"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid environment configuration:");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

export const corsOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

export const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);
