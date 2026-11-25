/**
 * Email bodies for the signing workflow, shared by the Vercel functions in
 * api/ and the Vite dev middleware in vite.config.ts so they never drift.
 * Every value that comes from a user is HTML-escaped.
 *
 * Layout notes: table-based with inline styles (the only thing mail clients
 * agree on), a bulletproof button, a hidden preheader line for inbox
 * previews, and a plain-text twin for every message.
 */

const BRAND = "#5ba114";
const BRAND_DARK = "#477c13";
const INK = "#0f172a";
const MUTED = "#64748b";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

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

/**
 * Turns a file-style name into something readable:
 * "[REMINDER] Business_explanation_LLC.pdf" -> "Business explanation LLC".
 */
export function prettyTitle(raw) {
  const t = String(raw ?? "")
    .replace(/^\s*\[(?:reminder|resend)\]\s*/i, "")
    .replace(/\.(pdf|docx?|xlsx?|pptx?|png|jpe?g|txt)$/i, "")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t || "Untitled document";
}

/** Older clients flagged reminders by prefixing the title; keep honouring that. */
function isReminderTitle(raw) {
  return /^\s*\[reminder\]/i.test(String(raw ?? ""));
}

function firstName(name) {
  return oneLine(name, 60).split(/\s+/)[0] || "there";
}

/** The link a signer opens. signerId lands them on their own fields. */
export function signingUrl(frontendUrl, documentId, signerId) {
  const base = `${frontendUrl}/document/${encodeURIComponent(documentId)}/view`;
  return signerId ? `${base}?signer=${encodeURIComponent(signerId)}` : base;
}

function button(href, label) {
  const url = escapeHtml(href);
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
      <tr>
        <td align="center" bgcolor="${BRAND}" style="border-radius: 10px; background-color: ${BRAND};">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 15px 38px; font-family: ${FONT}; font-size: 16px; font-weight: 700; line-height: 1; color: #ffffff; text-decoration: none; border-radius: 10px; border: 1px solid ${BRAND_DARK};">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`;
}

function documentCard(title, subline) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #dbe6d0; border-radius: 12px; background-color: #f7faf3; margin: 0 0 24px 0;">
      <tr>
        <td width="56" style="padding: 16px 0 16px 16px; vertical-align: middle;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="40" height="40" align="center" bgcolor="#e4f1d4" style="width: 40px; height: 40px; border-radius: 10px; background-color: #e4f1d4; font-size: 20px; line-height: 40px;">&#128196;</td>
          </tr></table>
        </td>
        <td style="padding: 16px 16px 16px 12px; vertical-align: middle; font-family: ${FONT};">
          <div style="font-size: 16px; font-weight: 700; color: ${INK}; line-height: 1.35; word-break: break-word;">${escapeHtml(title)}</div>
          ${subline ? `<div style="margin-top: 3px; font-size: 13px; color: ${MUTED}; line-height: 1.4;">${subline}</div>` : ""}
        </td>
      </tr>
    </table>`;
}

function shell({ preheader, subjectLine, body, footer }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <title>${escapeHtml(subjectLine)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #eef2ea; -webkit-text-size-adjust: 100%;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; mso-hide: all;">${escapeHtml(preheader)}&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef2ea" style="background-color: #eef2ea;">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 0 4px 16px 4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td width="34" height="34" align="center" bgcolor="${BRAND}" style="width: 34px; height: 34px; border-radius: 9px; background-color: ${BRAND}; color: #ffffff; font-family: Arial, sans-serif; font-size: 18px; font-weight: 800; line-height: 34px;">&#10003;</td>
                <td style="padding-left: 10px; font-family: ${FONT}; font-size: 21px; font-weight: 800; letter-spacing: -0.4px; color: ${INK};">EZSign<span style="color: ${BRAND};">Now</span></td>
              </tr></table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #dfe7d8; overflow: hidden;">
              <div style="height: 5px; background-color: ${BRAND}; background-image: linear-gradient(90deg, #8ccd45, ${BRAND_DARK});"></div>
              <div style="padding: 36px 36px 32px 36px; font-family: ${FONT}; color: ${INK};">
                ${body}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 8px 0 8px; font-family: ${FONT}; font-size: 12px; line-height: 1.6; color: ${MUTED}; text-align: center;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function signingEmail({ frontendUrl, documentId, documentTitle, ownerEmail, ownerName, signer, subject, message, reminder }) {
  const isReminder = reminder === true || isReminderTitle(documentTitle);
  const signUrl = signingUrl(frontendUrl, documentId, signer.signerId || signer.id);
  const title = prettyTitle(documentTitle);
  const senderName = oneLine(ownerName, 80);
  const senderEmail = oneLine(ownerEmail, 200) || "support@ezsignnow.com";
  const sender = senderName || senderEmail;
  const note = message ? String(message).slice(0, 2000) : "";

  const heading = isReminder ? "Your signature is still needed" : "Your signature is needed";
  const preheader = isReminder
    ? `${sender} is waiting for you to sign "${title}". It only takes a minute.`
    : `${sender} sent you "${title}" to review and sign. No account needed.`;

  const intro = isReminder
    ? `This is a friendly reminder that <strong>${escapeHtml(sender)}</strong> is still waiting for you to review and sign the document below.`
    : `<strong>${escapeHtml(sender)}</strong>${senderName ? ` <span style="color: ${MUTED};">(${escapeHtml(senderEmail)})</span>` : ""} has sent you a document to review and sign.`;

  const body = `
    ${isReminder ? `<div style="display: inline-block; margin: 0 0 14px 0; padding: 5px 12px; border-radius: 999px; background-color: #fef3c7; color: #92400e; font-size: 12px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase;">Friendly reminder</div>` : ""}
    <h1 style="margin: 0 0 14px 0; font-size: 26px; line-height: 1.25; font-weight: 800; letter-spacing: -0.4px; color: ${INK};">${heading}</h1>
    <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 1.55;">Hi ${escapeHtml(firstName(signer.name))},</p>
    <p style="margin: 0 0 22px 0; font-size: 16px; line-height: 1.55; color: #334155;">${intro}</p>
    ${documentCard(title, `Sent by ${escapeHtml(sender)}`)}
    ${note ? `<div style="margin: 0 0 24px 0; padding: 14px 16px; border-left: 4px solid #73c41d; background-color: #f7faf3; border-radius: 0 8px 8px 0;"><div style="font-size: 12px; font-weight: 700; color: ${MUTED}; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px;">Message from ${escapeHtml(sender)}</div><div style="font-size: 15px; line-height: 1.55; color: #334155; white-space: pre-wrap;">${escapeHtml(note)}</div></div>` : ""}
    ${button(signUrl, "Review and sign")}
    <p style="margin: 18px 0 0 0; font-size: 12px; line-height: 1.6; color: ${MUTED};">Button not working? Copy this link into your browser:<br><a href="${escapeHtml(signUrl)}" style="color: ${BRAND_DARK}; word-break: break-all;">${escapeHtml(signUrl)}</a></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 0 0; border-top: 1px solid #e8eee3;">
      <tr><td style="padding: 20px 0 0 0; font-size: 14px; line-height: 1.7; color: #334155;">
        <div>&#10003;&nbsp; No account needed &mdash; just open the link</div>
        <div>&#10003;&nbsp; Download a copy before you sign</div>
        <div>&#10003;&nbsp; Not right? You can decline and tell ${escapeHtml(firstName(sender))} why</div>
      </td></tr>
    </table>
    <div style="margin: 24px 0 0 0; padding: 14px 16px; background-color: #f1f5f9; border-radius: 10px; font-size: 13px; line-height: 1.55; color: #475569;">
      <strong style="color: ${INK};">Keep this email private.</strong> The link is personal to you &mdash; please don't forward it. Anyone who has it can sign as you.
    </div>`;

  const footer = `
    Sent by EZSignNow on behalf of ${escapeHtml(sender)}.<br>
    Questions about the document? <a href="mailto:${escapeHtml(senderEmail)}" style="color: ${BRAND_DARK};">Contact ${escapeHtml(sender)}</a><br>
    <span style="color: #94a3b8;">If you weren't expecting this, you can safely ignore it. &middot; <a href="https://www.ezsignnow.com" style="color: #94a3b8;">ezsignnow.com</a></span>`;

  const text =
    `${heading}\n\nHi ${firstName(signer.name)},\n\n` +
    (isReminder
      ? `This is a friendly reminder that ${sender} is still waiting for you to review and sign "${title}".\n\n`
      : `${sender}${senderName ? ` (${senderEmail})` : ""} has sent you "${title}" to review and sign.\n\n`) +
    (note ? `Message from ${sender}:\n${note}\n\n` : "") +
    `Review and sign: ${signUrl}\n\n` +
    `No account is needed. You can download a copy before signing, or decline with a reason.\n` +
    `This link is personal to you - please don't forward this email.\n\n` +
    `Questions? Contact ${sender}: ${senderEmail}\n-- EZSignNow`;

  const defaultSubject = isReminder ? `Reminder: please sign "${title}"` : `Please sign: ${title}`;
  const subjectLine = oneLine(subject) || oneLine(defaultSubject);
  return { subject: subjectLine, text, html: shell({ preheader, subjectLine, body, footer }) };
}

export function actionEmail({ documentTitle, actionType, actorName, reason, documentId, frontendUrl }) {
  const title = prettyTitle(documentTitle);
  const actor = oneLine(actorName, 80) || "A signer";
  const link = documentId && frontendUrl ? signingUrl(frontendUrl, documentId) : "";
  let subject;
  let heading;
  let detail;
  let badge = "&#10003;";
  let badgeBg = "#e4f1d4";
  let badgeFg = BRAND_DARK;
  let cta = "Open document";

  if (actionType === "completed") {
    subject = `Completed: ${title}`;
    heading = "Everyone has signed";
    detail = `All parties have signed <strong>${escapeHtml(title)}</strong>. Open it to download the signed copy together with its audit certificate.`;
    cta = "Download signed copy";
  } else if (actionType === "declined") {
    subject = `Declined: ${title}`;
    heading = "Signing was declined";
    detail = `<strong>${escapeHtml(actor)}</strong> declined to sign <strong>${escapeHtml(title)}</strong>. Nobody else can sign it now.`;
    badge = "&#10005;";
    badgeBg = "#ffe4e6";
    badgeFg = "#be123c";
    cta = "View details";
  } else {
    subject = `${actor} signed: ${title}`;
    heading = "A signature was added";
    detail = `<strong>${escapeHtml(actor)}</strong> has signed <strong>${escapeHtml(title)}</strong>.`;
  }

  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px 0;"><tr>
      <td width="52" height="52" align="center" bgcolor="${badgeBg}" style="width: 52px; height: 52px; border-radius: 26px; background-color: ${badgeBg}; color: ${badgeFg}; font-size: 24px; font-weight: 800; line-height: 52px; font-family: Arial, sans-serif;">${badge}</td>
    </tr></table>
    <h1 style="margin: 0 0 12px 0; font-size: 24px; line-height: 1.25; font-weight: 800; letter-spacing: -0.3px; color: ${INK};">${heading}</h1>
    <p style="margin: 0 0 22px 0; font-size: 16px; line-height: 1.55; color: #334155;">${detail}</p>
    ${documentCard(title, "")}
    ${reason ? `<div style="margin: 0 0 24px 0; padding: 14px 16px; border-left: 4px solid #fb7185; background-color: #fff5f6; border-radius: 0 8px 8px 0;"><div style="font-size: 12px; font-weight: 700; color: ${MUTED}; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px;">Reason given</div><div style="font-size: 15px; line-height: 1.55; color: #334155; white-space: pre-wrap;">${escapeHtml(String(reason).slice(0, 500))}</div></div>` : ""}
    ${link ? button(link, cta) : ""}`;

  const footer = `Sent by EZSignNow &middot; <a href="https://www.ezsignnow.com" style="color: #94a3b8;">ezsignnow.com</a>`;
  const text = `${heading}\n\n${detail.replace(/<[^>]+>/g, "")}\n${reason ? `\nReason given: ${String(reason).slice(0, 500)}\n` : ""}${link ? `\n${cta}: ${link}\n` : ""}\n-- EZSignNow`;
  return { subject: oneLine(subject), text, html: shell({ preheader: detail.replace(/<[^>]+>/g, ""), subjectLine: subject, body, footer }) };
}
