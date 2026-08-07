import pino from "pino";
import { env, isDevelopment } from "../../config/env.js";

// Structured application logger (SAD Chapter 35 — Logging Architecture).
// Pretty-printed in development, newline-delimited JSON in production so it
// can be shipped to a log aggregator unchanged.
const options: pino.LoggerOptions = { level: env.LOG_LEVEL };

if (isDevelopment) {
  options.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  };
}

export const logger = pino(options);
