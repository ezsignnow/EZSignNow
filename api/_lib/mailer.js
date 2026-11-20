import nodemailer from "nodemailer";

let cachedTransporter = null;

/**
 * Returns a singleton nodemailer transporter configured from environment
 * variables. Reused across invocations within the same warm serverless
 * function instance to avoid reconnecting on every request.
 *
 * Zoho requires SSL (not STARTTLS) on port 465 — `secure: true` is
 * mandatory there, unlike port 587 which negotiates TLS after connecting.
 */
export function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  // Without credentials nodemailer silently falls back to localhost and the
  // error ("connect ECONNREFUSED 127.0.0.1:465") hides the real problem.
  const missing = ["SMTP_USER", "SMTP_PASS", "SMTP_SENDER_EMAIL"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Email isn't set up on the server: add ${missing.join(", ")} to the Vercel project's environment variables and redeploy.`
    );
  }

  const port = Number(process.env.SMTP_PORT) || 465;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtppro.zoho.com",
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransporter;
}

export function senderFrom(name = process.env.SMTP_SENDER_NAME) {
  return `"${name}" <${process.env.SMTP_SENDER_EMAIL}>`;
}

/**
 * Sends an email via the Zoho SMTP transporter above. Kept as the same
 * { to, subject, text, html, from } shape used everywhere else in api/,
 * so this can be swapped for another provider again without touching the
 * 5 call sites — see git history for the equivalent Resend-backed version.
 */
export async function sendMail({ to, subject, text, html, from }) {
  const info = await getTransporter().sendMail({
    from: from || senderFrom(),
    to,
    subject,
    text,
    html,
  });

  return { id: info.messageId };
}
