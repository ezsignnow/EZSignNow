import { sendMail } from "./_lib/mailer.js";
import { applyCors, isAllowedOrigin } from "./_lib/cors.js";
import { signingEmail } from "./_lib/emailTemplates.js";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { signatories, documentId, documentTitle, ownerEmail, subject, message } = req.body || {};

    if (!signatories || signatories.length === 0) {
      return res.status(400).json({ error: "Missing signatories" });
    }

    // Link signers back to the site that sent the request (the public domain),
    // not to this API host, which may be an older Vercel copy of the app.
    const FRONTEND_URL = isAllowedOrigin(req.headers.origin)
      ? req.headers.origin
      : process.env.VITE_FRONTEND_URL || "https://www.ezsignnow.com";

    // Each signer gets their own link (?signer=<id>) so they land on their
    // own fields; only the signers whose turn it is are sent here.
    const promises = signatories.map((sig) => {
      const email = signingEmail({
        frontendUrl: FRONTEND_URL,
        documentId,
        documentTitle,
        ownerEmail,
        signer: sig,
        subject,
        message,
      });
      return sendMail({ to: sig.email, ...email });
    });

    await Promise.all(promises);

    res.json({ success: true, message: "Signing emails dispatched" });
  } catch (error) {
    console.error("Error dispatching signing emails:", error);
    res.status(500).json({ error: error.message });
  }
}
