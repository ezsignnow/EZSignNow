const RESEND_API_URL = "https://api.resend.com/emails";

export function senderFrom(name = process.env.SMTP_SENDER_NAME) {
  return `${name} <${process.env.SMTP_SENDER_EMAIL}>`;
}

/**
 * Sends an email via the Resend API. Mirrors the shape the old nodemailer
 * helper exposed ({ to, subject, text, html, from }) so call sites didn't
 * need to change beyond swapping the import.
 */
export async function sendMail({ to, subject, text, html, from }) {
  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: from || senderFrom(),
      to,
      subject,
      text,
      html,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || `Resend API error (${response.status})`);
  }

  return data; // { id: "<resend-message-id>" }
}
