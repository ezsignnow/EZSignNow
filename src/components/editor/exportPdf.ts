import {
  PDFDocument,
  PDFFont,
  PDFName,
  PDFPage,
  PDFString,
  PDFHexString,
  PDFArray,
  PDFRef,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  PDFDropdown,
  PDFOptionList,
  StandardFonts,
  BlendMode,
  LineCapStyle,
  degrees,
  rgb,
} from "pdf-lib";
import type { EditorObject, EditorState, FontFamily, TextObject, EditorPage } from "./types";
import { BASELINE_RATIO, LINE_HEIGHT } from "./types";
import { base64ToBytes, hexToRgb01, toPngDataUrl } from "./geometry";
import { SYMBOL_PATHS } from "./symbols";

type Pt = { x: number; y: number };

/** Inverts a PDF.js viewport transform so page-space points map back to PDF user space. */
function makeMapper(page: EditorPage) {
  const [a, b, c, d, e, f] = page.transform;
  const det = a * d - b * c || 1;
  const toPdf = (x: number, y: number): Pt => ({
    x: (d * (x - e) - c * (y - f)) / det,
    y: (-b * (x - e) + a * (y - f)) / det,
  });
  // Direction of page-space +x in PDF space gives the drawing angle.
  const o = toPdf(0, 0);
  const ux = toPdf(1, 0);
  const angle = Math.round((Math.atan2(ux.y - o.y, ux.x - o.x) * 180) / Math.PI);
  return { toPdf, rotate: degrees(angle) };
}

const color = (hex: string) => {
  const { r, g, b } = hexToRgb01(hex);
  return rgb(r, g, b);
};

const STANDARD: Record<FontFamily, [StandardFonts, StandardFonts, StandardFonts, StandardFonts]> = {
  Helvetica: [StandardFonts.Helvetica, StandardFonts.HelveticaBold, StandardFonts.HelveticaOblique, StandardFonts.HelveticaBoldOblique],
  Times: [StandardFonts.TimesRoman, StandardFonts.TimesRomanBold, StandardFonts.TimesRomanItalic, StandardFonts.TimesRomanBoldItalic],
  Courier: [StandardFonts.Courier, StandardFonts.CourierBold, StandardFonts.CourierOblique, StandardFonts.CourierBoldOblique],
};

/** Replaces characters the standard PDF fonts cannot encode, instead of failing the export. */
function safeText(font: PDFFont, text: string): string {
  try {
    font.encodeText(text);
    return text;
  } catch {
    return [...text]
      .map((ch) => {
        try {
          font.encodeText(ch);
          return ch;
        } catch {
          return "?";
        }
      })
      .join("");
  }
}

function uniqueName(base: string, used: Set<string>): string {
  const clean = base.replace(/\./g, "_").trim() || "Field";
  let name = clean;
  let n = 2;
  while (used.has(name)) name = `${clean}_${n++}`;
  used.add(name);
  return name;
}

export interface ExportResult {
  bytes: Uint8Array;
  /** Characters that could not be written with the built-in PDF fonts. */
  replacedCharacters: boolean;
}

/**
 * Applies every editor change to the source PDF and returns the new file.
 * `sourceBytes` is null when the user started from a blank document.
 */
export async function exportPdf(sourceBytes: Uint8Array | null, state: EditorState): Promise<ExportResult> {
  const doc = sourceBytes
    ? await PDFDocument.load(sourceBytes, { ignoreEncryption: true, updateMetadata: false })
    : await PDFDocument.create();
  let replacedCharacters = false;

  // ── 1. Delete removed source pages (and fields that lived on them) ──
  const originalCount = doc.getPageCount();
  const kept = new Set(state.pages.filter((p) => p.sourceIndex !== null).map((p) => p.sourceIndex as number));
  const form = doc.getForm();
  const removedRefs = new Set<string>();
  for (let i = 0; i < originalCount; i++) if (!kept.has(i)) removedRefs.add(doc.getPage(i).ref.toString());
  if (removedRefs.size) {
    for (const field of form.getFields()) {
      const onRemoved = field.acroField.getWidgets().some((w) => {
        const p = w.P();
        return p instanceof PDFRef && removedRefs.has(p.toString());
      });
      if (onRemoved) {
        try {
          form.removeField(field);
        } catch {
          /* best effort */
        }
      }
    }
  }
  for (let i = originalCount - 1; i >= 0; i--) if (!kept.has(i)) doc.removePage(i);

  // ── 2. Insert blank pages where the user added them ──
  state.pages.forEach((p, i) => {
    if (p.sourceIndex === null) doc.insertPage(i, [p.width, p.height]);
  });

  // ── 3a. Fill in the PDF's own form fields ──
  for (const [name, value] of Object.entries(state.fieldValues ?? {})) {
    try {
      const field = form.getField(name);
      if (field instanceof PDFTextField) field.setText(String(value ?? ""));
      else if (field instanceof PDFCheckBox) {
        if (value) field.check();
        else field.uncheck();
      }
      else if (field instanceof PDFRadioGroup) {
        if (value && field.getOptions().includes(String(value))) field.select(String(value));
      } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
        if (value) field.select(String(value));
      }
    } catch {
      /* field missing or value not allowed: skip */
    }
  }

  // ── 3. Existing form field renames / deletions ──
  for (const edit of state.existingFieldEdits) {
    let field;
    try {
      field = form.getField(edit.name);
    } catch {
      continue;
    }
    if (edit.deleted) {
      try {
        form.removeField(field);
      } catch {
        /* ignore */
      }
    } else if (edit.newName && edit.newName !== edit.name) {
      field.acroField.dict.set(PDFName.of("T"), PDFHexString.fromText(edit.newName.replace(/\./g, "_")));
    }
  }

  // ── 4. Draw new content ──
  const fontCache = new Map<string, PDFFont>();
  const getFont = async (family: FontFamily, bold: boolean, italic: boolean) => {
    const key = `${family}-${bold}-${italic}`;
    let font = fontCache.get(key);
    if (!font) {
      const variants = STANDARD[family];
      font = await doc.embedFont(variants[(bold ? 1 : 0) + (italic ? 2 : 0)]);
      fontCache.set(key, font);
    }
    return font;
  };
  const imageCache = new Map<string, Awaited<ReturnType<PDFDocument["embedPng"]>>>();
  const getImage = async (dataUrl: string) => {
    let img = imageCache.get(dataUrl);
    if (!img) {
      const usable = await toPngDataUrl(dataUrl);
      const bytes = base64ToBytes(usable.split(",")[1] ?? "");
      img = /^data:image\/jpe?g/i.test(usable) ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
      imageCache.set(dataUrl, img);
    }
    return img;
  };

  const usedFieldNames = new Set(form.getFields().map((f) => f.getName()));
  const radioGroups = new Map<string, ReturnType<typeof form.createRadioGroup>>();
  const pageRefs = state.pages.map((_, i) => doc.getPage(i).ref);

  for (let i = 0; i < state.pages.length; i++) {
    const ep = state.pages[i];
    const page = doc.getPage(i);
    page.setRotation(degrees((ep.baseRotation + ep.rotation) % 360));
    const { toPdf, rotate } = makeMapper(ep);
    const objects = state.objects.filter((o) => o.pageId === ep.id);

    // Whiteouts first so new content is drawn on top of them.
    const ordered = [...objects].sort((a, b) => Number(b.kind === "whiteout") - Number(a.kind === "whiteout"));

    for (const obj of ordered) {
      const bl = toPdf(obj.x, obj.y + obj.h); // bottom-left in PDF space
      switch (obj.kind) {
        case "whiteout":
          page.drawRectangle({ x: bl.x, y: bl.y, width: obj.w, height: obj.h, rotate, color: color(obj.color) });
          break;

        case "text":
          replacedCharacters = (await drawText(page, obj, toPdf, rotate, getFont)) || replacedCharacters;
          break;

        case "symbol": {
          const def = SYMBOL_PATHS[obj.symbol];
          if (!def) break;
          const size = Math.min(obj.w, obj.h);
          const o = toPdf(obj.x + (obj.w - size) / 2, obj.y + (obj.h - size) / 2);
          const scale = size / 24;
          page.drawSvgPath(def.path, {
            x: o.x,
            y: o.y,
            scale,
            rotate,
            ...(def.mode === "fill"
              ? { color: color(obj.color) }
              : { borderColor: color(obj.color), borderWidth: (def.strokeWidth ?? 2) * scale, borderLineCap: LineCapStyle.Round }),
          });
          break;
        }

        case "image":
        case "signature": {
          const img = await getImage(obj.dataUrl);
          page.drawImage(img, { x: bl.x, y: bl.y, width: obj.w, height: obj.h, rotate });
          break;
        }

        case "stamp": {
          const font = await getFont("Helvetica", true, false);
          const label = safeText(font, obj.label);
          const c = color(obj.color);
          page.drawRectangle({ x: bl.x, y: bl.y, width: obj.w, height: obj.h, rotate, borderColor: c, borderWidth: 2.5, opacity: 0, borderOpacity: 0.9 });
          const unit = font.widthOfTextAtSize(label, 1) || 1;
          const size = Math.max(6, Math.min(obj.h * 0.55, (obj.w - 12) / unit));
          const textW = unit * size;
          const base = toPdf(obj.x + (obj.w - textW) / 2, obj.y + obj.h / 2 + size * 0.35);
          page.drawText(label, { x: base.x, y: base.y, size, font, color: c, rotate, opacity: 0.9 });
          break;
        }

        case "highlight":
          page.drawRectangle({
            x: bl.x,
            y: bl.y,
            width: obj.w,
            height: obj.h,
            rotate,
            color: color(obj.color),
            opacity: 0.4,
            blendMode: BlendMode.Multiply,
          });
          break;

        case "underline":
        case "strikeout": {
          const yLine = obj.kind === "underline" ? obj.y + obj.h - 1 : obj.y + obj.h / 2;
          const thickness = Math.max(1, Math.min(3, obj.h * 0.08));
          page.drawLine({ start: toPdf(obj.x, yLine), end: toPdf(obj.x + obj.w, yLine), thickness, color: color(obj.color) });
          break;
        }

        case "ink": {
          const c = color(obj.color);
          for (let k = 1; k < obj.points.length; k++) {
            page.drawLine({
              start: toPdf(obj.points[k - 1].x, obj.points[k - 1].y),
              end: toPdf(obj.points[k].x, obj.points[k].y),
              thickness: obj.strokeWidth,
              color: c,
              lineCap: LineCapStyle.Round,
            });
          }
          break;
        }

        case "shape":
          drawShape(page, obj, toPdf, rotate);
          break;

        case "link":
          addLink(doc, page, obj, toPdf, pageRefs);
          break;

        case "comment":
          addComment(doc, page, obj, toPdf);
          break;

        case "field": {
          const name = uniqueName(obj.name, usedFieldNames);
          const opts = {
            x: bl.x,
            y: bl.y,
            width: obj.w,
            height: obj.h,
            rotate,
            borderColor: rgb(0.45, 0.55, 0.75),
            borderWidth: 1,
            backgroundColor: rgb(0.93, 0.96, 1),
          };
          if (obj.fieldType === "text" || obj.fieldType === "multiline") {
            const tf = form.createTextField(name);
            if (obj.fieldType === "multiline") tf.enableMultiline();
            if (obj.required) tf.enableRequired();
            tf.addToPage(page, opts);
          } else if (obj.fieldType === "dropdown") {
            const dd = form.createDropdown(name);
            const options = (obj.options ?? []).filter(Boolean);
            if (options.length) dd.setOptions(options);
            if (obj.required) dd.enableRequired();
            dd.addToPage(page, opts);
          } else if (obj.fieldType === "checkbox") {
            const cb = form.createCheckBox(name);
            if (obj.required) cb.enableRequired();
            cb.addToPage(page, opts);
          } else if (obj.fieldType === "radio") {
            const groupKey = (obj.groupName || "RadioGroup").replace(/\./g, "_");
            let group = radioGroups.get(groupKey);
            if (!group) {
              group = form.createRadioGroup(uniqueName(groupKey, usedFieldNames));
              radioGroups.set(groupKey, group);
            }
            group.addOptionToPage(obj.value || `Option ${group.getOptions().length + 1}`, page, opts);
          } else if (obj.fieldType === "signature") {
            addSignatureField(doc, page, name, obj, toPdf);
          }
          break;
        }
      }
    }
  }

  // ── 5. File attachments ──
  for (const att of state.attachments) {
    await doc.attach(base64ToBytes(att.data), att.name, { mimeType: att.mimeType || "application/octet-stream" });
  }

  const bytes = await doc.save();
  return { bytes, replacedCharacters };
}

async function drawText(
  page: PDFPage,
  obj: TextObject,
  toPdf: (x: number, y: number) => Pt,
  rotate: ReturnType<typeof degrees>,
  getFont: (f: FontFamily, b: boolean, i: boolean) => Promise<PDFFont>,
): Promise<boolean> {
  const font = await getFont(obj.fontFamily, obj.bold, obj.italic);
  let replaced = false;
  obj.text.split("\n").forEach((rawLine, i) => {
    const line = safeText(font, rawLine);
    if (line !== rawLine) replaced = true;
    if (!line) return;
    const base = toPdf(obj.x + 2, obj.y + i * obj.fontSize * LINE_HEIGHT + obj.fontSize * BASELINE_RATIO);
    page.drawText(line, { x: base.x, y: base.y, size: obj.fontSize, font, color: color(obj.color), rotate });
  });
  return replaced;
}

function drawShape(
  page: PDFPage,
  obj: Extract<EditorObject, { kind: "shape" }>,
  toPdf: (x: number, y: number) => Pt,
  rotate: ReturnType<typeof degrees>,
) {
  const stroke = color(obj.stroke);
  const fill = obj.fill ? color(obj.fill) : undefined;
  if (obj.shape === "rect") {
    const bl = toPdf(obj.x, obj.y + obj.h);
    page.drawRectangle({ x: bl.x, y: bl.y, width: obj.w, height: obj.h, rotate, borderColor: stroke, borderWidth: obj.strokeWidth, color: fill });
  } else if (obj.shape === "ellipse") {
    const c = toPdf(obj.x + obj.w / 2, obj.y + obj.h / 2);
    page.drawEllipse({ x: c.x, y: c.y, xScale: obj.w / 2, yScale: obj.h / 2, rotate, borderColor: stroke, borderWidth: obj.strokeWidth, color: fill });
  } else {
    const [s, e] = lineEnds(obj);
    page.drawLine({ start: toPdf(s.x, s.y), end: toPdf(e.x, e.y), thickness: obj.strokeWidth, color: stroke, lineCap: LineCapStyle.Round });
    if (obj.shape === "arrow") {
      for (const p of arrowHead(s, e, obj.strokeWidth)) {
        page.drawLine({ start: toPdf(e.x, e.y), end: toPdf(p.x, p.y), thickness: obj.strokeWidth, color: stroke, lineCap: LineCapStyle.Round });
      }
    }
  }
}

/** Start and end of a line/arrow object in page space. */
export function lineEnds(obj: { x: number; y: number; w: number; h: number; flipX?: boolean; flipY?: boolean }): [Pt, Pt] {
  const x1 = obj.flipX ? obj.x + obj.w : obj.x;
  const x2 = obj.flipX ? obj.x : obj.x + obj.w;
  const y1 = obj.flipY ? obj.y + obj.h : obj.y;
  const y2 = obj.flipY ? obj.y : obj.y + obj.h;
  return [
    { x: x1, y: y1 },
    { x: x2, y: y2 },
  ];
}

/** The two short strokes of an arrow head at `end`. */
export function arrowHead(start: Pt, end: Pt, strokeWidth: number): Pt[] {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const len = Math.max(8, strokeWidth * 4);
  return [-1, 1].map((sgn) => ({
    x: end.x - len * Math.cos(angle + (sgn * Math.PI) / 7),
    y: end.y - len * Math.sin(angle + (sgn * Math.PI) / 7),
  }));
}

function pdfRect(obj: { x: number; y: number; w: number; h: number }, toPdf: (x: number, y: number) => Pt) {
  const pts = [toPdf(obj.x, obj.y), toPdf(obj.x + obj.w, obj.y + obj.h)];
  return [
    Math.min(pts[0].x, pts[1].x),
    Math.min(pts[0].y, pts[1].y),
    Math.max(pts[0].x, pts[1].x),
    Math.max(pts[0].y, pts[1].y),
  ];
}

function addAnnotation(doc: PDFDocument, page: PDFPage, ref: PDFRef) {
  const existing = page.node.lookup(PDFName.of("Annots"));
  if (existing instanceof PDFArray) existing.push(ref);
  else page.node.set(PDFName.of("Annots"), doc.context.obj([ref]));
}

function addLink(
  doc: PDFDocument,
  page: PDFPage,
  obj: Extract<EditorObject, { kind: "link" }>,
  toPdf: (x: number, y: number) => Pt,
  pageRefs: PDFRef[],
) {
  const base = {
    Type: "Annot",
    Subtype: "Link",
    Rect: pdfRect(obj, toPdf),
    Border: [0, 0, 0],
  };
  let dict;
  if (obj.targetPage && pageRefs[obj.targetPage - 1]) {
    dict = doc.context.obj({ ...base, Dest: [pageRefs[obj.targetPage - 1], "Fit"] });
  } else if (obj.url) {
    const url = /^[a-z][a-z0-9+.-]*:/i.test(obj.url) ? obj.url : `https://${obj.url}`;
    dict = doc.context.obj({ ...base, A: { Type: "Action", S: "URI", URI: PDFString.of(url) } });
  } else return;
  addAnnotation(doc, page, doc.context.register(dict));
}

function addComment(
  doc: PDFDocument,
  page: PDFPage,
  obj: Extract<EditorObject, { kind: "comment" }>,
  toPdf: (x: number, y: number) => Pt,
) {
  const { r, g, b } = hexToRgb01(obj.color);
  const dict = doc.context.obj({
    Type: "Annot",
    Subtype: "Text",
    Rect: pdfRect(obj, toPdf),
    Contents: PDFHexString.fromText(obj.text || ""),
    Name: "Comment",
    C: [r, g, b],
    F: 4,
    Open: false,
    M: PDFString.fromDate(new Date()),
  });
  addAnnotation(doc, page, doc.context.register(dict));
}

/** Adds an empty digital-signature (/Sig) form field. pdf-lib has no high-level API for this. */
function addSignatureField(
  doc: PDFDocument,
  page: PDFPage,
  name: string,
  obj: Extract<EditorObject, { kind: "field" }>,
  toPdf: (x: number, y: number) => Pt,
) {
  const widget = doc.context.obj({
    Type: "Annot",
    Subtype: "Widget",
    FT: "Sig",
    T: PDFHexString.fromText(name),
    Rect: pdfRect(obj, toPdf),
    F: 4,
    P: page.ref,
    MK: { BC: [0.45, 0.55, 0.75], BG: [0.93, 0.96, 1] },
    ...(obj.required ? { Ff: 2 } : {}),
  });
  const ref = doc.context.register(widget);
  addAnnotation(doc, page, ref);
  doc.getForm().acroForm.addField(ref);
}
