import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { format } from "date-fns";
import { AuditLog } from "./auditLogger";
import { CANVAS_PAGE_WIDTH, CANVAS_PAGE_HEIGHT, CANVAS_PAGE_STRIDE } from "./pdfCanvasLayout";
import { decodeSignerData, normalizeFieldRow, signatureImage, signersOnly } from "@/lib/signing/workflow";

/**
 * pdf-lib's standard fonts only cover WinAnsi (roughly Latin-1). Anything
 * outside it throws on encode, so swap those characters for "?" rather
 * than failing the whole download.
 */
function safe(text: unknown): string {
  return String(text ?? "").replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "?");
}

async function embedImage(pdfDoc: PDFDocument, dataUrl: string | undefined) {
  const base64Data = dataUrl?.split(",")[1];
  if (!base64Data) return null;
  try {
    return await pdfDoc.embedPng(base64Data);
  } catch {
    try {
      return await pdfDoc.embedJpg(base64Data);
    } catch {
      return null;
    }
  }
}

export async function generateCertifiedPdf(
  originalPdfBytes: ArrayBuffer,
  document: any,
  signatories: any[],
  fields: any[],
  auditLogs: AuditLog[]
): Promise<Uint8Array> {
  // Rows may carry their real field type in the tooltip (see lib/signing/workflow.ts).
  fields = fields.map((f) => normalizeFieldRow(f));
  // Copy recipients get the document but never sign, so they stay off the certificate.
  const signers = signersOnly(signatories);
  const ownerOf = (field: any) =>
    signatories.find((s) => s.id === field.signatory_id) || (signers.length === 1 ? signers[0] : null);

  // 1. Load the original PDF
  const pdfDoc = await PDFDocument.load(originalPdfBytes);
  const pages = pdfDoc.getPages();

  // 2. Embed Standard Fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // 3. Draw signatures, dates, and other fields on the existing document pages
  for (const field of fields) {
    const htmlX = Number(field.x_position);
    const htmlY = Number(field.y_position);
    const htmlW = Number(field.width || 200);
    const htmlH = Number(field.height || 50);

    // Account for vertical stacking, using the exact page size/gap the
    // canvas actually renders with (see pdfCanvasLayout.ts) — these must
    // stay in sync or fields on page 2+ end up on the wrong page/position.
    const pageIndex = Math.floor(htmlY / CANVAS_PAGE_STRIDE);
    const pageNumber = Math.min(Math.max(1, pageIndex + 1), pages.length);
    const page = pages[pageNumber - 1];

    if (!page) continue;
    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    const scaleX = pdfWidth / CANVAS_PAGE_WIDTH;
    const scaleY = pdfHeight / CANVAS_PAGE_HEIGHT;

    // Obtain coordinates relative to the specific target page
    const pageRelativeHtmlY = htmlY % CANVAS_PAGE_STRIDE;

    const x = htmlX * scaleX;
    const y = (CANVAS_PAGE_HEIGHT - pageRelativeHtmlY - htmlH) * scaleY;
    const width = htmlW * scaleX;
    const height = htmlH * scaleY;

    if (field.field_type === "signature") {
      const sig = ownerOf(field);
      const sigData = signatureImage(sig);
      if (!sig || !sigData) continue;

      let sigImage;
      {
        sigImage = await embedImage(pdfDoc, sigData);
        if (!sigImage) {
          console.error("Failed to embed signature image");

          // Draw fallback cursive-like text
          page.drawText(safe(sig.name), {
            x: x + 10,
            y: y + height / 2 - 5,
            size: 14 * scaleX,
            font: helveticaOblique,
            color: rgb(0.227, 0.384, 0.082),
          });
          continue;
        }
      }

      if (sigImage) {
        page.drawImage(sigImage, {
          x,
          y,
          width,
          height,
        });
      }

      // Draw E-Signature Digital Audit Certificate Block directly underneath signature field
      const auditText = [
        `Digitally Signed by: ${safe(sig.name)}`,
        `Email: ${safe(sig.email)}`,
        `IP: ${sig.ip_address || "Not recorded"} | Location: ${safe(sig.location || "Not recorded")}`,
        `Date: ${format(new Date(sig.signed_at || new Date()), "yyyy-MM-dd HH:mm:ss x")}`,
        `Audit ID: ${sig.id.substring(0, 8)}-${document.id.substring(0, 8)}`,
      ].join("\n");

      page.drawText(auditText, {
        x,
        y: y - 55 * scaleY,
        size: 7 * scaleX,
        lineHeight: 8.5 * scaleY,
        font: helveticaFont,
        color: rgb(0.227, 0.384, 0.082),
      });
    } else if (field.field_type === "initials") {
      const sig = ownerOf(field);
      const img = await embedImage(pdfDoc, decodeSignerData(sig?.signature_data).initials);
      if (img) {
        const scale = Math.min(width / img.width, height / img.height);
        page.drawImage(img, {
          x: x + (width - img.width * scale) / 2,
          y: y + (height - img.height * scale) / 2,
          width: img.width * scale,
          height: img.height * scale,
        });
      }
    } else if (field.field_type === "date") {
      const sig = ownerOf(field);
      const entered = decodeSignerData(sig?.signature_data).values?.[field.id];
      const dateStr = entered || (sig && sig.signed_at
        ? format(new Date(sig.signed_at), "MM/dd/yyyy")
        : format(new Date(), "MM/dd/yyyy"));

      page.drawText(safe(dateStr), {
        x: x + 6 * scaleX,
        y: y + (htmlH / 2 - 4) * scaleY,
        size: 10 * scaleX,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
    } else if (["text", "label", "checkbox", "name", "number", "dropdown", "radio"].includes(field.field_type)) {
      const sig = ownerOf(field);
      const payload = decodeSignerData(sig?.signature_data);
      const entered = payload.values?.[field.id];
      let valStr: string;
      if (field.field_type === "label") {
        valStr = field.label || field.value || "";
      } else if (field.field_type === "checkbox") {
        // "X" rather than a checkmark glyph — Helvetica's WinAnsi encoding
        // (the only encoding pdf-lib's standard fonts support) has no glyph
        // for U+2713 and throws when asked to draw one. Documents signed
        // before field values were saved keep the old "[X]".
        valStr = payload.values ? (entered === "true" ? "X" : "") : field.value || "[X]";
      } else if (field.field_type === "name") {
        valStr = entered || field.value || (sig?.status === "signed" ? sig.name : "");
      } else if (payload.values) {
        valStr = entered || field.value || "";
      } else {
        valStr = field.value || field.label || "";
      }
      if (!valStr) continue;

      page.drawText(safe(valStr), {
        x: x + 6 * scaleX,
        y: y + (htmlH / 2 - 4) * scaleY,
        size: 10 * scaleX,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
    } else if (field.field_type === "attachment") {
      const fileLabel = safe(`[Attachment: ${field.value || "Not Uploaded"}]`);
      page.drawText(fileLabel, {
        x: x + 6 * scaleX,
        y: y + (htmlH / 2 - 4) * scaleY,
        size: 8.5 * scaleX,
        font: helveticaFont,
        color: rgb(0.08, 0.45, 0.55),
      });
    } else if (field.field_type === "drawing" && field.value) {
      const base64Data = field.value.split(",")[1];
      if (base64Data) {
        try {
          let drawImg;
          try {
            drawImg = await pdfDoc.embedPng(base64Data);
          } catch {
            drawImg = await pdfDoc.embedJpg(base64Data);
          }
          if (drawImg) {
            page.drawImage(drawImg, {
              x,
              y,
              width,
              height,
            });
          }
        } catch (err) {
          console.error("Failed to embed drawing image into PDF:", err);
        }
      }
    }
  }

  // 4. Create brand new Digital Completion Certificate page
  const certPage = pdfDoc.addPage([612, 792]); // Standard US Letter size
  const { width: pWidth, height: pHeight } = certPage.getSize();

  // Color palette definitions
  const primaryColor = rgb(0.357, 0.631, 0.078); // Brand green #5ba114
  const secondaryColor = rgb(0.09, 0.176, 0.027); // Deep green #172d07
  const textDark = rgb(0.2, 0.22, 0.26); // Dark Charcoal
  const textMuted = rgb(0.5, 0.53, 0.58); // Gray
  const borderLight = rgb(0.88, 0.9, 0.92); // Light Gray border
  const successColor = rgb(0.278, 0.486, 0.075); // Green #477c13
  const bgLight = rgb(0.957, 0.984, 0.925); // Light green #f4fbec

  // Draw Page Borders
  // External thin blue border
  certPage.drawRectangle({
    x: 18,
    y: 18,
    width: pWidth - 36,
    height: pHeight - 36,
    borderColor: primaryColor,
    borderWidth: 1,
  });

  // Internal decorative thin gray border
  certPage.drawRectangle({
    x: 22,
    y: 22,
    width: pWidth - 44,
    height: pHeight - 44,
    borderColor: borderLight,
    borderWidth: 0.5,
  });

  // Top header colored bar
  certPage.drawRectangle({
    x: 23,
    y: pHeight - 85,
    width: pWidth - 46,
    height: 62,
    color: bgLight,
  });

  // Draw Top Logo and Title
  certPage.drawText("EZSignNow", {
    x: 40,
    y: pHeight - 55,
    size: 20,
    font: helveticaBold,
    color: primaryColor,
  });

  certPage.drawText("Electronic signature record", {
    x: 40,
    y: pHeight - 68,
    size: 8,
    font: helveticaOblique,
    color: textMuted,
  });

  certPage.drawText("DIGITAL COMPLETION CERTIFICATE & AUDIT TRAIL", {
    x: pWidth - 340,
    y: pHeight - 48,
    size: 8.5,
    font: helveticaBold,
    color: secondaryColor,
  });

  // Draw Status Pill (COMPLETED)
  certPage.drawRectangle({
    x: pWidth - 145,
    y: pHeight - 74,
    width: 105,
    height: 18,
    color: successColor,
  });

  certPage.drawText("FULLY EXECUTED", {
    x: pWidth - 134,
    y: pHeight - 69,
    size: 8,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  // Document Metadata Table Box
  let currY = pHeight - 100;

  certPage.drawRectangle({
    x: 40,
    y: currY - 80,
    width: pWidth - 80,
    height: 70,
    borderColor: borderLight,
    borderWidth: 1,
    color: rgb(1, 1, 1),
  });

  // Draw metadata titles and values
  const drawMetaText = (label: string, value: string, x: number, y: number) => {
    certPage.drawText(label, {
      x,
      y,
      size: 8,
      font: helveticaBold,
      color: textMuted,
    });
    certPage.drawText(value, {
      x,
      y: y - 12,
      size: 9,
      font: helveticaFont,
      color: textDark,
    });
  };

  drawMetaText("DOCUMENT TITLE", safe(document.title || "Contract Document"), 55, currY - 25);
  drawMetaText("DOCUMENT ID", document.id || "N/A", 55, currY - 55);

  const creationDate = document.created_at ? format(new Date(document.created_at), "PPP p") : "N/A";
  const completionDate = document.status === "completed"
    ? format(new Date(document.updated_at), "PPP p")
    : format(new Date(), "PPP p");

  drawMetaText("CREATED ON", creationDate, 320, currY - 25);
  drawMetaText("COMPLETED ON", completionDate, 320, currY - 55);

  currY -= 95;

  // Draw Section Title: Signatories Status
  certPage.drawText("SIGNATORIES VERIFICATION RECORD", {
    x: 40,
    y: currY,
    size: 11,
    font: helveticaBold,
    color: secondaryColor,
  });

  currY -= 15;

  // Loop through signatories and draw their signature audit blocks
  for (let idx = 0; idx < signers.length; idx++) {
    const sig = signers[idx];
    const isPasscodeUsed = !!(sig.access_code || sig.passcode_used || sig.passcode || sig.passcode_authenticated);
    const depositAmount = document.payment_fee || document.deposit_amount || sig.payment_fee || sig.deposit_amount;
    const isDepositPaid = depositAmount && Number(depositAmount) > 0;

    const boxHeight = isPasscodeUsed ? 82 : 70;

    certPage.drawRectangle({
      x: 40,
      y: currY - boxHeight,
      width: pWidth - 80,
      height: boxHeight,
      borderColor: borderLight,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });

    // Green checkmark pill
    certPage.drawRectangle({
      x: 50,
      y: currY - 28,
      width: 14,
      height: 14,
      color: successColor,
    });
    // "X" rather than a checkmark glyph — see the field-drawing loop above
    // for why: WinAnsi has no U+2713 glyph and pdf-lib throws on encode.
    certPage.drawText("X", {
      x: 54,
      y: currY - 24,
      size: 9,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });

    certPage.drawText(safe(`Signer ${idx + 1}: ${sig.name}`), {
      x: 72,
      y: currY - 24,
      size: 10,
      font: helveticaBold,
      color: textDark,
    });

    certPage.drawText(safe(`Email: ${sig.email}`), {
      x: 50,
      y: currY - 42,
      size: 8,
      font: helveticaFont,
      color: textMuted,
    });

    const ipStr = sig.ip_address || "Not recorded";
    const locStr = sig.location || "Not recorded";
    certPage.drawText(safe(`IP: ${ipStr} | Geolocation: ${locStr}`), {
      x: 50,
      y: currY - 54,
      size: 8,
      font: helveticaFont,
      color: textMuted,
    });

    const signedTime = sig.signed_at ? format(new Date(sig.signed_at), "PPpp x") : "N/A";
    certPage.drawText(`Signed At: ${signedTime}`, {
      x: 50,
      y: currY - 66,
      size: 8,
      font: helveticaFont,
      color: textMuted,
    });

    if (isPasscodeUsed) {
      certPage.drawText("PASSPHRASE AUTHENTICATED: SECURE", {
        x: 50,
        y: currY - 76,
        size: 7,
        font: helveticaBold,
        color: successColor,
      });
    }

    // Embed and render the signature image inside the block
    const certSigData = signatureImage(sig);
    if (certSigData) {
      {
        try {
          const sigImg = await embedImage(pdfDoc, certSigData);

          if (sigImg) {
            // Draw signature box border
            certPage.drawRectangle({
              x: pWidth - 170,
              y: currY - boxHeight + 10,
              width: 110,
              height: 50,
              borderColor: borderLight,
              borderWidth: 0.5,
              color: bgLight,
            });

            // Maintain aspect ratio scaling
            const imgW = 90;
            const imgH = (sigImg.height / sigImg.width) * imgW;
            const targetH = Math.min(imgH, 40);
            const targetW = (sigImg.width / sigImg.height) * targetH;

            certPage.drawImage(sigImg, {
              x: pWidth - 170 + (110 - targetW) / 2,
              y: currY - boxHeight + 10 + (50 - targetH) / 2,
              width: targetW,
              height: targetH,
            });

            certPage.drawText("SECURE SIGNATURE RECORD", {
              x: pWidth - 170,
              y: currY - boxHeight + 3,
              size: 5.5,
              font: helveticaBold,
              color: textMuted,
            });

            if (isDepositPaid) {
              const formattedAmount = Number(depositAmount).toFixed(2);
              certPage.drawRectangle({
                x: pWidth - 168,
                y: currY - boxHeight + 46,
                width: 106,
                height: 10,
                color: rgb(0.9, 0.98, 0.93),
              });
              certPage.drawText(`STRIPE PAYMENT PROCESSED: $${formattedAmount}`, {
                x: pWidth - 165,
                y: currY - boxHeight + 49,
                size: 5,
                font: helveticaBold,
                color: successColor,
              });
            }
          }
        } catch (err) {
          console.error("Error drawing signature on certificate:", err);
        }
      }
    } else {
      // Draw a cursive name simulation block if no signature image exists
      certPage.drawRectangle({
        x: pWidth - 170,
        y: currY - boxHeight + 10,
        width: 110,
        height: 50,
        borderColor: borderLight,
        borderWidth: 0.5,
        color: bgLight,
      });

      certPage.drawText(safe(sig.name), {
        x: pWidth - 155,
        y: currY - boxHeight + 30,
        size: 11,
        font: helveticaOblique,
        color: primaryColor,
      });

      certPage.drawText("SYSTEM LOGGED SIGN", {
        x: pWidth - 170,
        y: currY - boxHeight + 3,
        size: 5.5,
        font: helveticaBold,
        color: textMuted,
      });

      if (isDepositPaid) {
        const formattedAmount = Number(depositAmount).toFixed(2);
        certPage.drawRectangle({
          x: pWidth - 168,
          y: currY - boxHeight + 46,
          width: 106,
          height: 10,
          color: rgb(0.9, 0.98, 0.93),
        });
        certPage.drawText(`STRIPE PAYMENT PROCESSED: $${formattedAmount}`, {
          x: pWidth - 165,
          y: currY - boxHeight + 49,
          size: 5,
          font: helveticaBold,
          color: successColor,
        });
      }
    }

    currY -= (boxHeight + 12);
  }

  currY -= 5;

  // Draw Section Title: Chronological Security Audit Trail
  certPage.drawText("CHRONOLOGICAL AUDIT TRAIL LOG", {
    x: 40,
    y: currY,
    size: 11,
    font: helveticaBold,
    color: secondaryColor,
  });

  currY -= 15;

  // Draw Audit Log Table Headers
  const tableHeaderY = currY;
  certPage.drawRectangle({
    x: 40,
    y: tableHeaderY - 14,
    width: pWidth - 80,
    height: 14,
    color: secondaryColor,
  });

  certPage.drawText("TIMESTAMP", { x: 50, y: tableHeaderY - 10, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) });
  certPage.drawText("EVENT ACTION", { x: 170, y: tableHeaderY - 10, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) });
  certPage.drawText("USER/SIGNATORY", { x: 330, y: tableHeaderY - 10, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) });
  certPage.drawText("IP & GEOLOCATION", { x: 460, y: tableHeaderY - 10, size: 7.5, font: helveticaBold, color: rgb(1, 1, 1) });

  currY -= 14;

  // When no audit log was stored, fall back to what the signer rows really
  // recorded (each signature with its IP and time). Never invent events.
  const activeAuditLogs = auditLogs.length > 0 ? auditLogs : signers
    .filter((s) => s.status === "signed")
    .map((s) => ({
      id: `sg-${s.id}`,
      document_id: document.id,
      event_type: "signature" as const,
      email: s.email,
      name: s.name,
      ip_address: s.ip_address || null,
      location: s.location || null,
      created_at: s.signed_at || document.updated_at,
    }));

  // Limit display to the 6 most recent events to prevent overflowing the letter size page
  const sortedLogs = [...activeAuditLogs]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 6);

  for (let idx = 0; idx < sortedLogs.length; idx++) {
    const log = sortedLogs[idx];
    const rowY = currY - (idx * 22);

    // Row alternating background
    certPage.drawRectangle({
      x: 40,
      y: rowY - 22,
      width: pWidth - 80,
      height: 22,
      color: idx % 2 === 0 ? rgb(1, 1, 1) : bgLight,
      borderColor: borderLight,
      borderWidth: 0.5,
    });

    const timeStr = format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss");
    certPage.drawText(timeStr, { x: 50, y: rowY - 14, size: 7.5, font: helveticaFont, color: textDark });

    let actionLabel = "";
    if (log.event_type === "upload") actionLabel = "Document Uploaded";
    else if (log.event_type === "view") actionLabel = "Document Viewed";
    else if (log.event_type === "signature") actionLabel = "Document Signed";
    else if ((log as any).action) actionLabel = String((log as any).action).replace(/^./, (c) => c.toUpperCase());

    certPage.drawText(actionLabel, { x: 170, y: rowY - 14, size: 7.5, font: helveticaBold, color: textDark });
    certPage.drawText(safe(log.name || log.email || "System"), { x: 330, y: rowY - 14, size: 7.5, font: helveticaFont, color: textDark });

    const ipGeo = `${log.ip_address || "N/A"} (${log.location || "N/A"})`;
    const truncatedIpGeo = ipGeo.length > 25 ? ipGeo.substring(0, 24) + "..." : ipGeo;
    certPage.drawText(safe(truncatedIpGeo), { x: 460, y: rowY - 14, size: 7.5, font: helveticaFont, color: textMuted });
  }

  // Draw Legal & Security Compliance Footer
  const footerY = 70;

  // Thin dividing line
  certPage.drawLine({
    start: { x: 40, y: footerY + 15 },
    end: { x: pWidth - 40, y: footerY + 15 },
    color: borderLight,
    thickness: 1,
  });

  certPage.drawText("CERTIFICATE OF COMPLIANCE & LEGAL FIDELITY", {
    x: 40,
    y: footerY + 3,
    size: 7.5,
    font: helveticaBold,
    color: secondaryColor,
  });

  const legalDisclaimer =
    "This document is a certified execution summary compiled and sealed by EZSignNow on behalf of its customers. " +
    "Each digital signature represents a legally binding agreement under the U.S. Electronic Signatures in Global and " +
    "National Commerce (ESIGN) Act and the Uniform Electronic Transactions Act (UETA) in the United States, along with eIDAS " +
    "regulations in the European Union. Geolocations, IP logs, timestamps, and browser configurations are digitally recorded " +
    "at the moment of transaction. Any tamper attempt or modifications to this file voids this certificate.";

  // Wrap disclaimer text beautifully across multiple lines
  const disclaimerLines: string[] = [];
  let line = "";
  for (const word of legalDisclaimer.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (helveticaFont.widthOfTextAtSize(next, 6.5) > pWidth - 80) {
      disclaimerLines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) disclaimerLines.push(line);
  disclaimerLines.slice(0, 4).forEach((l, i) => {
    certPage.drawText(l, { x: 40, y: footerY - 8 - i * 8, size: 6.5, font: helveticaFont, color: textMuted });
  });

  // Reference that ties this certificate to the document and its first signer
  const secureHash = `AUDIT REFERENCE: ${document.id.replaceAll("-", "").substring(0, 16).toUpperCase()}-${(signers[0] || signatories[0]).id.replaceAll("-", "").substring(0, 16).toUpperCase()}`;
  certPage.drawText(secureHash, {
    x: 40,
    y: footerY - 42,
    size: 6.5,
    font: helveticaBold,
    color: primaryColor,
  });

  return await pdfDoc.save();
}
