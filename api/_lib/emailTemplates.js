/**
 * Email bodies for the signing workflow, shared by the Vercel functions in
 * api/ and the Vite dev middleware in vite.config.ts so they never drift.
 * Every value that comes from a user is HTML-escaped.
 */

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Strips CR/LF so a user-supplied subject can't add mail headers. */
function oneLine(value, max = 200) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

function shell(inner) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="height: 4px; background: linear-gradient(90deg, #8ccd45, #477c13);"></div>
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 28px 40px 20px;">
        <tr>
          <td style="vertical-align: middle;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width: 36px; height: 36px; border-radius: 9px; background: #5ba114; text-align: center; vertical-align: middle; color: #ffffff; font-size: 18px; font-weight: 800; font-family: Arial, sans-serif;">&#10003;</td>
              <td style="padding-left: 10px; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; font-family: Arial, sans-serif;">EZSign<span style="color: #5ba114;">Now</span></td>
            </tr></table>
          </td>
        </tr>
      </table>
      ${inner}
    </div>
  `;
}

/** The link a signer opens. signerId lands them on their own fields. */
export function signingUrl(frontendUrl, documentId, signerId) {
  const base = `${frontendUrl}/document/${encodeURIComponent(documentId)}/view`;
  return signerId ? `${base}?signer=${encodeURIComponent(signerId)}` : base;
}

export function signingEmail({ frontendUrl, documentId, documentTitle, ownerEmail, signer, subject, message }) {
  const signUrl = signingUrl(frontendUrl, documentId, signer.signerId || signer.id);
  const title = escapeHtml(documentTitle);
  const owner = escapeHtml(ownerEmail);
  const note = message ? String(message).slice(0, 2000) : "";

  const html = shell(`
      <div style="background-color: #f7f9f5; padding: 40px;">
        <p style="color: #0f172a; font-size: 16px; margin: 0 0 20px 0; line-height: 1.5;">
          Hello <strong>${escapeHtml(signer.name)}</strong>,
        </p>
        <p style="color: #0f172a; font-size: 16px; margin: 0 0 20px 0; line-height: 1.5;">
          <strong>${owner}</strong> has requested your signature on the document <strong>"${title}"</strong>. Please review and sign it below.
        </p>
        ${note ? `<blockquote style="margin: 0 0 20px 0; padding: 12px 16px; border-left: 3px solid #73c41d; background: #ffffff; color: #334155; font-size: 15px; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(note)}</blockquote>` : ""}
        <div style="margin: 30px 0;">
          <a href="${escapeHtml(signUrl)}" style="background-color: #5ba114; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 15px;">Review and Sign</a>
        </div>
        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
          You can download the document before you sign, or decline to sign with a reason. You don't need an account.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <div>
          <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a; font-weight: 700;">Do Not Share This Email</h4>
          <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.5;">This link is just for you. To keep your data safe, don't forward this email to others.</p>
        </div>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 25px 40px;">
        <tr>
          <td style="font-size: 13px; color: #0f172a; line-height: 1.5;">
            Processed by EZSignNow on behalf of ${owner}
          </td>
          <td align="right" width="100">
            <a href="mailto:${owner}" style="border: 1px solid #5ba114; color: #477c13; padding: 8px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">Contact</a>
          </td>
        </tr>
      </table>
  `);

  const text =
    `Hello ${signer.name},\n\n${ownerEmail} has requested your signature on the document "${documentTitle}".\n\n` +
    (note ? `${note}\n\n` : "") +
    `Review and sign the document here: ${signUrl}\n\nThank you,\nEZSignNow Team`;

  return {
    subject: oneLine(subject) || `Signature Request: ${oneLine(documentTitle)}`,
    text,
    html,
  };
}

export function actionEmail({ documentTitle, actionType, actorName, reason }) {
  const title = escapeHtml(documentTitle);
  const actor = escapeHtml(actorName);
  let subject;
  let heading;
  let badge = "&#10003;";
  let badgeColor = "#73c41d";

  if (actionType === "completed") {
    subject = `Completed: ${oneLine(documentTitle)}`;
    heading = `The document "${title}" has been signed by everyone. Open it to download the signed copy with its audit certificate.`;
  } else if (actionType === "declined") {
    subject = `Declined: ${oneLine(documentTitle)}`;
    heading = `${actor} declined to sign "${title}". Nobody else can sign it now.`;
    badge = "&#10005;";
    badgeColor = "#e11d48";
  } else {
    subject = `Document Signed by ${oneLine(actorName)}`;
    heading = `${actor} has signed the document "${title}".`;
  }

  const html = shell(`
      <div style="background-color: #f7f9f5; padding: 40px; text-align: center;">
        <div style="display: inline-block; background-color: ${badgeColor}; color: white; width: 48px; height: 48px; border-radius: 24px; line-height: 48px; font-size: 24px; font-weight: bold; margin-bottom: 20px;">${badge}</div>
        <h2 style="color: #0f172a; margin: 0 0 15px 0;">Update: ${title}</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.5; margin: 0;">${heading}</p>
        ${reason ? `<p style="color: #334155; font-size: 15px; line-height: 1.5; margin: 20px 0 0 0;"><strong>Their reason:</strong> ${escapeHtml(String(reason).slice(0, 500))}</p>` : ""}
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 25px 40px;">
        <tr>
          <td style="font-size: 13px; color: #0f172a; line-height: 1.5; text-align: center;">
            Processed securely by EZSignNow
          </td>
        </tr>
      </table>
  `);

  return { subject, html };
}
