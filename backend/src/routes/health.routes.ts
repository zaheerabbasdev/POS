import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { cloudinary } from "../config/cloudinary.js";
import { isCloudinaryConfigured } from "../config/env.js";
import { asyncHandler } from "../common/middleware/asyncHandler.js";
import { HttpStatus } from "../common/constants/httpStatus.js";

// Health check endpoints (SAD Chapter 36 — Monitoring & Health Checks).
// Deliberately outside /api/v1 — infrastructure probes, not business API.
export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.status(HttpStatus.OK).json({
    success: true,
    message: "API server is running.",
    data: { status: "ok", uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() },
  });
});

healthRouter.get(
  "/database",
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(HttpStatus.OK).json({
        success: true,
        message: "Database connection is healthy.",
        data: { status: "ok" },
      });
    } catch (err) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        message: "Database connection failed.",
        code: "SERVER_ERROR",
        data: { status: "error", error: err instanceof Error ? err.message : "Unknown error" },
      });
    }
  }),
);

healthRouter.get(
  "/storage",
  asyncHandler(async (_req, res) => {
    if (!isCloudinaryConfigured) {
      res.status(HttpStatus.OK).json({
        success: true,
        message: "Cloudinary is not configured.",
        data: { status: "not_configured" },
      });
      return;
    }

    try {
      await cloudinary.api.ping();
      res.status(HttpStatus.OK).json({
        success: true,
        message: "Cloudinary connection is healthy.",
        data: { status: "ok" },
      });
    } catch (err) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        message: "Cloudinary connection failed.",
        code: "SERVER_ERROR",
        data: { status: "error", error: err instanceof Error ? err.message : "Unknown error" },
      });
    }
  }),
);
