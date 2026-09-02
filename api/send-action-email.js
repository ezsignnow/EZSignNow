import { sendMail } from "./_lib/mailer.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { emails, documentTitle, actionType, actorName } = req.body || {};

    if (!emails || emails.length === 0) {
      return res.status(400).json({ error: "Missing recipients" });
    }

    const title = actionType === "completed" ? `Completed: ${documentTitle}` : `Document Signed by ${actorName}`;

    const heading =
      actionType === "completed"
        ? `The document "${documentTitle}" has been fully executed.`
        : `${actorName} has signed the document "${documentTitle}".`;

    const promises = emails.map((email) =>
      sendMail({
        to: email,
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Top Bar -->
            <div style="background-color: #f1f5f9; padding: 12px; text-align: center; color: #0f172a; font-size: 13px; font-weight: 500;">
              EZSignNow Document Services
            </div>

            <!-- Logo Section -->
            <div style="text-align: center; padding: 30px 0;">
              <h1 style="color: #1e0098; font-size: 32px; margin: 0; font-weight: 800; letter-spacing: -1px;">
                <span style="color: #22c55e;">ez</span>signnow
              </h1>
            </div>

            <!-- Main Content Area -->
            <div style="background-color: #f8fafc; padding: 40px; text-align: center;">
              <div style="display: inline-block; background-color: #22c55e; color: white; width: 48px; height: 48px; border-radius: 24px; line-height: 48px; font-size: 24px; font-weight: bold; margin-bottom: 20px;">✓</div>
              <h2 style="color: #0f172a; margin: 0 0 15px 0;">Update: ${documentTitle}</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.5; margin: 0;">
                ${heading}
              </p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 25px 40px;">
              <tr>
                <td style="font-size: 13px; color: #0f172a; line-height: 1.5; text-align: center;">
                  Processed securely by EZSignNow
                </td>
              </tr>
            </table>
          </div>
        `,
      }),
    );

    await Promise.all(promises);
    res.json({ success: true, message: "Action emails dispatched" });
  } catch (error) {
    console.error("Error sending action email:", error);
    res.status(500).json({ error: error.message });
  }
}
