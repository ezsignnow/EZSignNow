import { sendMail } from "./_lib/mailer.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ error: "Missing email or code" });
    }

    await sendMail({
      from: `EZSignNow Security <${process.env.SMTP_SENDER_EMAIL}>`,
      to: email,
      subject: `Your EZSignNow Verification Code: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">Device Verification</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">You recently attempted to log in from an unrecognized device.</p>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">Your verification code is:</p>
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-radius: 6px; margin: 30px 0;">
            <h1 style="color: #1e0098; font-size: 40px; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #475569; font-size: 14px;">If you did not request this, please secure your account immediately.</p>
        </div>
      `,
    });

    res.json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("Error sending verification code:", error);
    res.status(500).json({ error: error.message });
  }
}
