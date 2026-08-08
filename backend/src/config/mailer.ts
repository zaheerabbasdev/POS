import nodemailer from "nodemailer";
import { env, isEmailConfigured } from "./env.js";
import { logger } from "../common/logger/logger.js";

// Transactional email (forgot-password link). Configured eagerly here, same
// pattern as config/cloudinary.ts — if SMTP_* isn't set, the app still
// starts, and callers fall back to logging instead of sending.
const transporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    })
  : null;

if (!isEmailConfigured) {
  logger.warn(
    "SMTP credentials are not set — transactional emails (password reset) will be logged instead of sent until SMTP_HOST/SMTP_USER/SMTP_PASS are configured.",
  );
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Returns true if the email was actually sent (false means SMTP isn't configured — caller should fall back). */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!transporter) return false;

  await transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return true;
}
