import { sendMail } from "./_lib/mailer.js";
import { applyCors, isAllowedOrigin } from "./_lib/cors.js";
import { actionEmail } from "./_lib/emailTemplates.js";

/**
 * Status notices: "signed" (to the sender), "completed" (to every signer,
 * copy recipient and the sender) and "declined" (to the sender, with the
 * signer's reason).
 */
export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { emails, documentTitle, actionType, actorName, reason, documentId } = req.body || {};

    if (!emails || emails.length === 0) {
      return res.status(400).json({ error: "Missing recipients" });
    }

    // Links point back at the public site, not this API host.
    const frontendUrl = isAllowedOrigin(req.headers.origin) ? req.headers.origin : process.env.VITE_FRONTEND_URL || "https://www.ezsignnow.com";
    const { subject, html, text } = actionEmail({ documentTitle, actionType, actorName, reason, documentId, frontendUrl });

    await Promise.all(emails.map((email) => sendMail({ to: email, subject, html, text })));
    res.json({ success: true, message: "Action emails dispatched" });
  } catch (error) {
    console.error("Error sending action email:", error);
    res.status(500).json({ error: error.message });
  }
}
