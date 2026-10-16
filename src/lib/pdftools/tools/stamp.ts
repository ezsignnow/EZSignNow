import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFFont,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFPage,
  PDFRef,
  PDFStream,
  StandardFonts,
  concatTransformationMatrix,
  degrees,
  drawObject,
  popGraphicsState,
  pushGraphicsState,
  setGraphicsState,
  setFillingGrayscaleColor,
  rectangle,
  fill,
  rgb,
} from "pdf-lib";
import {
  type InputFile,
  type Options,
  type OutputFile,
  type ToolContext,
  ToolError,
  baseName,
  dataUrlToBytes,
  hexColor,
  loadPdf,
  num,
  parsePageRanges,
  pdfOut,
  saveOpts,
  str,
} from "../core";
import { normRotation, visibleBox, visibleFracToUser } from "../pdfHelpers";

/* ───────────── Writing on a page as the reader sees it ───────────── */

/** Helpers for drawing in "visible" coordinates (points, bottom-left origin of the displayed page). */
export function visibleWriter(page: PDFPage) {
  const box = visibleBox(page);
  const r = normRotation(page);
  const sideways = r === 90 || r === 270;
  const W = sideways ? box.height : box.width;
  const H = sideways ? box.width : box.height;
  const at = (x: number, y: number) => {
    const [ux, uy] = visibleFracToUser(page, x / W, 1 - y / H);
    return { x: ux, y: uy };
  };
  return { W, H, r, at };
}

const FONTS: Record<string, StandardFonts> = {
  Helvetica: StandardFonts.Helvetica,
  "Helvetica-Bold": StandardFonts.HelveticaBold,
  Times: StandardFonts.TimesRoman,
  "Times-Bold": StandardFonts.TimesRomanBold,
  Courier: StandardFonts.Courier,
  "Courier-Bold": StandardFonts.CourierBold,
};
export const FONT_CHOICES = Object.keys(FONTS).map((k) => ({ value: k, label: k.replace("-", " ") }));

function safeText(font: PDFFont, text: string): string {
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

/**
 * Draws a single line of text at one of nine anchor positions.
 * `position` is like "top-left", "bottom-center", "center".
 */
function drawAnchoredText(page: PDFPage, text: string, font: PDFFont, size: number, color: ReturnType<typeof rgb>, position: string, margin: number, opacity = 1) {
  const w = visibleWriter(page);
  const t = safeText(font, text);
  const tw = font.widthOfTextAtSize(t, size);
  const [v, h] = position === "center" ? ["middle", "center"] : position.split("-");
  const x = h === "left" ? margin : h === "right" ? w.W - margin - tw : (w.W - tw) / 2;
  const y = v === "top" ? w.H - margin - size * 0.8 : v === "bottom" ? margin : (w.H - size * 0.7) / 2;
  const p = w.at(x, y);
  page.drawText(t, { x: p.x, y: p.y, size, font, color, rotate: degrees(w.r), opacity });
}

export const POSITION_CHOICES = [
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

const color = (hex: unknown, fb = "#000000") => {
  const c = hexColor(hex, fb);
  return rgb(c.r, c.g, c.b);
};

/** Moves the content pdf-lib just appended to the page so it's drawn first (underneath). */
function sendLastContentToBack(doc: PDFDocument, page: PDFPage) {
  const contents = page.node.Contents();
  if (!(contents instanceof PDFArray) || contents.size() < 2) return;
  const last = contents.get(contents.size() - 1);
  contents.remove(contents.size() - 1);
  contents.insert(0, last);
  void doc;
}

/* ───────────── Watermark ───────────── */

export async function watermark(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    ctx.progress(`Watermarking ${f.name}`);
    const doc = await loadPdf(f.bytes);
    const kind = str(o.kind, "text");
    const opacity = Math.min(1, Math.max(0.02, num(o.opacity, 30) / 100));
    const angle = num(o.rotation, 45);
    const pages = parsePageRanges(str(o.pages), doc.getPageCount());
    const font = await doc.embedFont(FONTS[str(o.font, "Helvetica-Bold")] ?? StandardFonts.HelveticaBold);
    let image: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
    if (kind === "image") {
      const url = str(o.image);
      if (!url) throw new ToolError("Choose an image for the watermark.");
      image = /^data:image\/jpe?g/i.test(url) ? await doc.embedJpg(dataUrlToBytes(url)) : await doc.embedPng(dataUrlToBytes(url));
    }
    const text = safeText(font, str(o.text, "CONFIDENTIAL"));
    if (kind === "text" && !text.trim()) throw new ToolError("Enter the watermark text.");
    for (const i of pages) {
      const page = doc.getPage(i);
      const w = visibleWriter(page);
      const rad = (angle * Math.PI) / 180;
      const place = (cx: number, cy: number) => {
        // Content box (bw × bh) centred on (cx, cy), rotated by `angle`.
        let bw: number, bh: number;
        const size = num(o.fontSize, 60);
        if (image) {
          const scale = num(o.imageScale, 50) / 100;
          bw = (w.W * scale);
          bh = bw * (image.height / image.width);
        } else {
          bw = font.widthOfTextAtSize(text, size);
          bh = size * 0.7;
        }
        const ox = cx - (bw / 2) * Math.cos(rad) + (bh / 2) * Math.sin(rad);
        const oy = cy - (bw / 2) * Math.sin(rad) - (bh / 2) * Math.cos(rad);
        const p = w.at(ox, oy);
        if (image) page.drawImage(image, { x: p.x, y: p.y, width: bw, height: bh, rotate: degrees(w.r + angle), opacity });
        else page.drawText(text, { x: p.x, y: p.y, size, font, color: color(o.color, "#dc2626"), rotate: degrees(w.r + angle), opacity });
      };
      const pos = str(o.position, "center");
      if (pos === "tiled") {
        // Space copies by the watermark's own size so they never overlap.
        const size = num(o.fontSize, 60);
        const len = image ? w.W * (num(o.imageScale, 50) / 100) : font.widthOfTextAtSize(text, size);
        const hgt = image ? len * (image.height / image.width) : size;
        const stepX = Math.max(80, len * Math.abs(Math.cos(rad)) + hgt * Math.abs(Math.sin(rad)) + size);
        const stepY = Math.max(60, len * Math.abs(Math.sin(rad)) * 0.5 + hgt * 3);
        let row = 0;
        for (let y = stepY / 2; y < w.H + stepY; y += stepY, row++) for (let x = (row % 2 ? stepX / 2 : 0); x < w.W + stepX; x += stepX) place(x, y);
      } else {
        const cy = pos === "top" ? w.H * 0.85 : pos === "bottom" ? w.H * 0.15 : w.H / 2;
        place(w.W / 2, cy);
      }
      if (o.layer === "below") sendLastContentToBack(doc, page);
    }
    outs.push(pdfOut(`${baseName(f.name)}-watermarked`, await doc.save(saveOpts())));
  }
  return outs;
}

/* ───────────── Page numbers ───────────── */

export async function pageNumbers(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    const doc = await loadPdf(f.bytes);
    const font = await doc.embedFont(FONTS[str(o.font, "Helvetica")] ?? StandardFonts.Helvetica);
    const pages = parsePageRanges(str(o.pages), doc.getPageCount());
    const start = Math.round(num(o.start, 1));
    const totalShown = pages.length + start - 1;
    const fmt = str(o.format, "{n}") === "custom" ? str(o.custom, "{n}") : str(o.format, "{n}");
    pages.forEach((pi, k) => {
      const n = start + k;
      const label = fmt.replace(/\{n\}/g, String(n)).replace(/\{total\}/g, String(totalShown));
      drawAnchoredText(doc.getPage(pi), label, font, num(o.fontSize, 11), color(o.color), str(o.position, "bottom-center"), num(o.margin, 28));
    });
    outs.push(pdfOut(`${baseName(f.name)}-numbered`, await doc.save(saveOpts())));
  }
  return outs;
}

/* ───────────── Header & footer ───────────── */

export async function headerFooter(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  const header = str(o.header);
  const footer = str(o.footer);
  if (!header.trim() && !footer.trim()) throw new ToolError("Enter header or footer text.");
  for (const f of files) {
    const doc = await loadPdf(f.bytes);
    const font = await doc.embedFont(FONTS[str(o.font, "Helvetica")] ?? StandardFonts.Helvetica);
    const pages = parsePageRanges(str(o.pages), doc.getPageCount());
    const total = doc.getPageCount();
    const date = new Date().toLocaleDateString();
    const fill = (t: string, i: number) =>
      t.replace(/\{page\}/g, String(i + 1)).replace(/\{total\}/g, String(total)).replace(/\{date\}/g, date).replace(/\{filename\}/g, baseName(f.name));
    for (const i of pages) {
      const page = doc.getPage(i);
      if (header.trim()) drawAnchoredText(page, fill(header, i), font, num(o.fontSize, 10), color(o.color, "#334155"), `top-${str(o.headerAlign, "center")}`, num(o.margin, 24));
      if (footer.trim()) drawAnchoredText(page, fill(footer, i), font, num(o.fontSize, 10), color(o.color, "#334155"), `bottom-${str(o.footerAlign, "center")}`, num(o.margin, 24));
    }
    outs.push(pdfOut(baseName(f.name), await doc.save(saveOpts())));
  }
  return outs;
}

/* ───────────── Bates numbering ───────────── */

export async function bates(files: InputFile[], o: Options): Promise<OutputFile[]> {
  let n = Math.round(num(o.start, 1));
  const digits = Math.max(1, Math.round(num(o.digits, 6)));
  const outs: OutputFile[] = [];
  for (const f of files) {
    const doc = await loadPdf(f.bytes);
    const font = await doc.embedFont(FONTS[str(o.font, "Helvetica-Bold")] ?? StandardFonts.HelveticaBold);
    const first = n;
    for (let i = 0; i < doc.getPageCount(); i++) {
      const label = `${str(o.prefix)}${String(n).padStart(digits, "0")}${str(o.suffix)}`;
      drawAnchoredText(doc.getPage(i), label, font, num(o.fontSize, 10), color(o.color), str(o.position, "bottom-right"), num(o.margin, 24));
      n++;
    }
    const range = `${str(o.prefix)}${String(first).padStart(digits, "0")}-${String(n - 1).padStart(digits, "0")}`;
    outs.push(pdfOut(o.renameFiles ? range : baseName(f.name), await doc.save(saveOpts())));
  }
  return outs;
}

/* ───────────── Metadata ───────────── */

export async function readMetadata(bytes: Uint8Array) {
  const doc = await loadPdf(bytes);
  const d = (x?: Date) => (x && !isNaN(x.getTime()) ? new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
  return {
    title: doc.getTitle() ?? "",
    author: doc.getAuthor() ?? "",
    subject: doc.getSubject() ?? "",
    keywords: doc.getKeywords() ?? "",
    creator: doc.getCreator() ?? "",
    producer: doc.getProducer() ?? "",
    created: d(doc.getCreationDate()),
    modified: d(doc.getModificationDate()),
  };
}

export async function editMetadata(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const f = files[0];
  const doc = await loadPdf(f.bytes);
  doc.setTitle(str(o.title), { showInWindowTitleBar: !!str(o.title) });
  doc.setAuthor(str(o.author));
  doc.setSubject(str(o.subject));
  doc.setKeywords(str(o.keywords).split(",").map((k) => k.trim()).filter(Boolean));
  doc.setCreator(str(o.creator));
  doc.setProducer(str(o.producer));
  if (str(o.created)) doc.setCreationDate(new Date(str(o.created)));
  doc.setModificationDate(str(o.modified) ? new Date(str(o.modified)) : new Date());
  return [pdfOut(baseName(f.name), await doc.save(saveOpts()))];
}

/* ───────────── Create bookmarks ───────────── */

export interface BookmarkEntry {
  title: string;
  page: number; // 1-based
  level: number; // 1 = top level
}

export async function createBookmarks(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const f = files[0];
  const entries = ((o.bookmarks as BookmarkEntry[]) ?? []).filter((b) => b.title.trim());
  if (!entries.length) throw new ToolError("Add at least one bookmark.");
  const doc = await loadPdf(f.bytes);
  const total = doc.getPageCount();
  const ctx = doc.context;

  type Node = { entry: BookmarkEntry; ref: PDFRef; children: Node[] };
  const root: Node[] = [];
  const stack: Node[] = [];
  for (const e of entries) {
    if (e.page < 1 || e.page > total) throw new ToolError(`Bookmark “${e.title}” points to page ${e.page}, but the document has ${total} pages.`);
    const node: Node = { entry: e, ref: ctx.nextRef(), children: [] };
    while (stack.length && stack[stack.length - 1].entry.level >= e.level) stack.pop();
    (stack.length ? stack[stack.length - 1].children : root).push(node);
    stack.push(node);
  }
  const outlinesRef = ctx.nextRef();
  const countAll = (nodes: Node[]): number => nodes.reduce((s, n) => s + 1 + countAll(n.children), 0);
  const build = (nodes: Node[], parent: PDFRef) => {
    nodes.forEach((n, i) => {
      const page = doc.getPage(n.entry.page - 1);
      const top = visibleBox(page).y + visibleBox(page).height;
      const dict: Record<string, unknown> = {
        Title: PDFHexString.fromText(n.entry.title),
        Parent: parent,
        Dest: [page.ref, PDFName.of("XYZ"), null, top, null],
      };
      if (i > 0) dict.Prev = nodes[i - 1].ref;
      if (i < nodes.length - 1) dict.Next = nodes[i + 1].ref;
      if (n.children.length) {
        dict.First = n.children[0].ref;
        dict.Last = n.children[n.children.length - 1].ref;
        dict.Count = countAll(n.children);
        build(n.children, n.ref);
      }
      ctx.assign(n.ref, ctx.obj(dict as never));
    });
  };
  build(root, outlinesRef);
  ctx.assign(outlinesRef, ctx.obj({ Type: "Outlines", First: root[0].ref, Last: root[root.length - 1].ref, Count: countAll(root) }));
  doc.catalog.set(PDFName.of("Outlines"), outlinesRef);
  doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
  return [pdfOut(baseName(f.name), await doc.save(saveOpts()))];
}

/* ───────────── Rename ───────────── */

export async function rename(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const pattern = str(o.name).trim();
  if (!pattern) throw new ToolError("Enter the new file name.");
  return Promise.all(
    files.map(async (f, i) => {
      let name = pattern.replace(/\{n\}/g, String(i + 1)).replace(/\{name\}/g, baseName(f.name)).replace(/\{date\}/g, new Date().toISOString().slice(0, 10));
      if (files.length > 1 && !/\{n\}|\{name\}/.test(pattern)) name = `${name}-${i + 1}`;
      let bytes = f.bytes;
      if (o.setTitle) {
        const doc = await loadPdf(f.bytes);
        doc.setTitle(name.replace(/\.pdf$/i, ""));
        bytes = await doc.save(saveOpts());
      }
      return pdfOut(name.replace(/[\\/:*?"<>|]+/g, "_"), bytes);
    }),
  );
}

/* ───────────── Flatten & remove annotations ───────────── */

const MARKUP = new Set(["Text", "FreeText", "Line", "Square", "Circle", "Polygon", "PolyLine", "Highlight", "Underline", "Squiggly", "StrikeOut", "Stamp", "Caret", "Ink", "Popup", "FileAttachment", "Sound", "Redact"]);

function annotSubtype(a: PDFDict): string {
  return a.get(PDFName.of("Subtype"))?.toString().replace("/", "") ?? "";
}

/** Draws an annotation's normal appearance into the page content (PDF spec 12.5.5). */
function bakeAppearance(doc: PDFDocument, page: PDFPage, annot: PDFDict, n: number): boolean {
  const flags = (annot.lookupMaybe(PDFName.of("F"), PDFNumber)?.asNumber() ?? 0);
  if (flags & 2) return true; // hidden: nothing to draw
  const ap = annot.lookupMaybe(PDFName.of("AP"), PDFDict);
  let normal = ap?.get(PDFName.of("N"));
  let stream = normal ? doc.context.lookup(normal) : undefined;
  if (stream instanceof PDFDict && !(stream instanceof PDFStream)) {
    const state = annot.get(PDFName.of("AS"));
    normal = state ? stream.get(state as PDFName) : undefined;
    stream = normal ? doc.context.lookup(normal) : undefined;
  }
  if (!(stream instanceof PDFStream) || !(normal instanceof PDFRef)) return false;
  const rect = annot.lookupMaybe(PDFName.of("Rect"), PDFArray);
  if (!rect) return false;
  const [x1, y1, x2, y2] = [0, 1, 2, 3].map((i) => (rect.lookup(i) as PDFNumber).asNumber());
  const sd = stream.dict;
  sd.set(PDFName.of("Type"), PDFName.of("XObject"));
  sd.set(PDFName.of("Subtype"), PDFName.of("Form"));
  const bboxArr = sd.lookupMaybe(PDFName.of("BBox"), PDFArray);
  const bbox = bboxArr ? [0, 1, 2, 3].map((i) => (bboxArr.lookup(i) as PDFNumber).asNumber()) : [0, 0, x2 - x1, y2 - y1];
  const mArr = sd.lookupMaybe(PDFName.of("Matrix"), PDFArray);
  const m = mArr ? [0, 1, 2, 3, 4, 5].map((i) => (mArr.lookup(i) as PDFNumber).asNumber()) : [1, 0, 0, 1, 0, 0];
  const corners = [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[1]],
    [bbox[0], bbox[3]],
    [bbox[2], bbox[3]],
  ].map(([x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
  const bx1 = Math.min(...corners.map((c) => c[0])), by1 = Math.min(...corners.map((c) => c[1]));
  const bx2 = Math.max(...corners.map((c) => c[0])), by2 = Math.max(...corners.map((c) => c[1]));
  const sx = bx2 - bx1 ? (Math.max(x1, x2) - Math.min(x1, x2)) / (bx2 - bx1) : 1;
  const sy = by2 - by1 ? (Math.max(y1, y2) - Math.min(y1, y2)) / (by2 - by1) : 1;
  const name = page.node.newXObject(`Flat${n}`, normal);
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(sx, 0, 0, sy, Math.min(x1, x2) - bx1 * sx, Math.min(y1, y2) - by1 * sy),
    drawObject(name),
    popGraphicsState(),
  );
  return true;
}

const numArr = (a: PDFDict, key: string): number[] => {
  const arr = a.lookupMaybe(PDFName.of(key), PDFArray);
  return arr ? Array.from({ length: arr.size() }, (_, i) => (arr.lookup(i) as PDFNumber)?.asNumber?.() ?? 0) : [];
};

/** Draws common annotation types that carry no appearance stream. */
function drawWithoutAppearance(page: PDFPage, a: PDFDict): boolean {
  const sub = annotSubtype(a);
  const c = numArr(a, "C");
  const col = c.length === 3 ? rgb(c[0], c[1], c[2]) : c.length === 1 ? rgb(c[0], c[0], c[0]) : rgb(1, 0.85, 0);
  const rect = numArr(a, "Rect");
  const [x1, y1, x2, y2] = rect.length === 4 ? [Math.min(rect[0], rect[2]), Math.min(rect[1], rect[3]), Math.max(rect[0], rect[2]), Math.max(rect[1], rect[3])] : [0, 0, 0, 0];
  const bw = numArr(a, "Border")[2] ?? 1;
  const quads = (() => {
    const q = numArr(a, "QuadPoints");
    const out: { x: number; y: number; w: number; h: number }[] = [];
    for (let i = 0; i + 7 < q.length; i += 8) {
      const xs = [q[i], q[i + 2], q[i + 4], q[i + 6]], ys = [q[i + 1], q[i + 3], q[i + 5], q[i + 7]];
      out.push({ x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) });
    }
    return out.length ? out : rect.length === 4 ? [{ x: x1, y: y1, w: x2 - x1, h: y2 - y1 }] : [];
  })();
  switch (sub) {
    case "Highlight":
      quads.forEach((q) => page.drawRectangle({ ...{ x: q.x, y: q.y, width: q.w, height: q.h }, color: col, opacity: 0.4 }));
      return true;
    case "Underline":
      quads.forEach((q) => page.drawLine({ start: { x: q.x, y: q.y + 1 }, end: { x: q.x + q.w, y: q.y + 1 }, thickness: Math.max(0.8, q.h * 0.07), color: col }));
      return true;
    case "StrikeOut":
      quads.forEach((q) => page.drawLine({ start: { x: q.x, y: q.y + q.h / 2 }, end: { x: q.x + q.w, y: q.y + q.h / 2 }, thickness: Math.max(0.8, q.h * 0.07), color: col }));
      return true;
    case "Square":
      page.drawRectangle({ x: x1 + bw / 2, y: y1 + bw / 2, width: x2 - x1 - bw, height: y2 - y1 - bw, borderColor: col, borderWidth: bw });
      return true;
    case "Circle":
      page.drawEllipse({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, xScale: (x2 - x1 - bw) / 2, yScale: (y2 - y1 - bw) / 2, borderColor: col, borderWidth: bw });
      return true;
    case "Line": {
      const l = numArr(a, "L");
      if (l.length < 4) return false;
      page.drawLine({ start: { x: l[0], y: l[1] }, end: { x: l[2], y: l[3] }, thickness: bw, color: col });
      return true;
    }
    case "Ink": {
      const list = a.lookupMaybe(PDFName.of("InkList"), PDFArray);
      if (!list) return false;
      for (let s = 0; s < list.size(); s++) {
        const path = list.lookup(s);
        if (!(path instanceof PDFArray)) continue;
        const pts = Array.from({ length: path.size() }, (_, i) => (path.lookup(i) as PDFNumber).asNumber());
        for (let i = 2; i + 1 < pts.length; i += 2) page.drawLine({ start: { x: pts[i - 2], y: pts[i - 1] }, end: { x: pts[i], y: pts[i + 1] }, thickness: bw, color: col });
      }
      return true;
    }
    default:
      return false;
  }
}

export async function flatten(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    const doc = await loadPdf(f.bytes);
    const form = doc.getForm();
    try {
      form.flatten({ updateFieldAppearances: true });
    } catch {
      // Some fields have no usable appearance; fall back to baking each widget.
    }
    if (str(o.what, "all") === "all") {
      let n = 0;
      for (const page of doc.getPages()) {
        const annots = page.node.lookup(PDFName.of("Annots"));
        if (!(annots instanceof PDFArray)) continue;
        const keep: unknown[] = [];
        for (let i = 0; i < annots.size(); i++) {
          const a = annots.lookup(i);
          const ref = annots.get(i);
          if (!(a instanceof PDFDict)) continue;
          const sub = annotSubtype(a);
          if (sub === "Link") {
            keep.push(ref);
            continue;
          }
          if (sub === "Popup") continue;
          if (bakeAppearance(doc, page, a, n++)) continue;
          if (sub !== "Widget" && drawWithoutAppearance(page, a)) continue;
          keep.push(ref); // can't draw it faithfully: leave it as an annotation
        }
        page.node.set(PDFName.of("Annots"), doc.context.obj(keep as never));
      }
    }
    outs.push(pdfOut(`${baseName(f.name)}-flattened`, await doc.save(saveOpts())));
  }
  return outs;
}

export async function removeAnnotations(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  const kinds = {
    markup: o.markup !== false,
    links: !!o.links,
    fields: !!o.fields,
  };
  if (!kinds.markup && !kinds.links && !kinds.fields) throw new ToolError("Choose what to remove.");
  for (const f of files) {
    const doc = await loadPdf(f.bytes);
    if (kinds.fields) {
      const form = doc.getForm();
      for (const field of form.getFields()) {
        try {
          form.removeField(field);
        } catch {
          /* ignore */
        }
      }
    }
    for (const page of doc.getPages()) {
      const annots = page.node.lookup(PDFName.of("Annots"));
      if (!(annots instanceof PDFArray)) continue;
      const keep: unknown[] = [];
      for (let i = 0; i < annots.size(); i++) {
        const a = annots.lookup(i);
        if (!(a instanceof PDFDict)) continue;
        const sub = annotSubtype(a);
        const remove = (kinds.markup && MARKUP.has(sub)) || (kinds.links && sub === "Link") || (kinds.fields && sub === "Widget");
        if (!remove) keep.push(annots.get(i));
      }
      if (keep.length) page.node.set(PDFName.of("Annots"), doc.context.obj(keep as never));
      else page.node.delete(PDFName.of("Annots"));
    }
    outs.push(pdfOut(baseName(f.name), await doc.save(saveOpts())));
  }
  return outs;
}

/* ───────────── Grayscale ───────────── */

export async function grayscale(files: InputFile[]): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    const doc = await loadPdf(f.bytes);
    for (const page of doc.getPages()) {
      // A neutral grey layer with the "Saturation" blend mode removes all colour
      // from everything beneath it while keeping text and vectors intact.
      // (pdf-lib only exposes some blend modes, so the graphics state is written directly.)
      const b = page.getMediaBox();
      // Paint white paper first: blank areas are transparent during blending and
      // would otherwise turn grey.
      const paper = doc.context.register(doc.context.stream(`q 1 g ${b.x} ${b.y} ${b.width} ${b.height} re f Q\n`));
      const contents = page.node.get(PDFName.of("Contents"));
      const arr = doc.context.obj([paper]) as PDFArray;
      const existing = contents ? doc.context.lookup(contents) : undefined;
      if (existing instanceof PDFArray) for (let k = 0; k < existing.size(); k++) arr.push(existing.get(k));
      else if (contents) arr.push(contents);
      page.node.set(PDFName.of("Contents"), arr);
      const gs = doc.context.register(doc.context.obj({ Type: "ExtGState", BM: "Saturation" }));
      const name = page.node.newExtGState("GsGray", gs);
      page.pushOperators(
        pushGraphicsState(),
        setGraphicsState(name),
        setFillingGrayscaleColor(0.5),
        rectangle(b.x, b.y, b.width, b.height),
        fill(),
        popGraphicsState(),
      );
    }
    outs.push(pdfOut(`${baseName(f.name)}-grayscale`, await doc.save(saveOpts())));
  }
  return outs;
}

/* ───────────── Repair ───────────── */

export async function repair(files: InputFile[], _o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    try {
      ctx.progress(`Rebuilding ${f.name}`);
      const doc = await PDFDocument.load(f.bytes, { ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false });
      if (doc.getPageCount() === 0) throw new Error("no pages found");
      outs.push(pdfOut(`${baseName(f.name)}-repaired`, await doc.save({ useObjectStreams: false })));
    } catch {
      // Last resort: let PDF.js (a very tolerant reader) draw each page and rebuild from images.
      ctx.progress(`Rebuilding ${f.name} from page images`);
      const { renderPages } = await import("./render");
      const { pdfjsFor } = await import("./render");
      const pdf = await pdfjsFor(f.bytes);
      const out = await PDFDocument.create();
      const all = Array.from({ length: pdf.numPages }, (_, i) => i);
      for await (const r of renderPages(f.bytes, all, 150)) {
        const blob: Blob = await new Promise((res) => r.canvas.toBlob((b) => res(b!), "image/jpeg", 0.9));
        const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
        out.addPage([r.widthPt, r.heightPt]).drawImage(img, { x: 0, y: 0, width: r.widthPt, height: r.heightPt });
      }
      outs.push(pdfOut(`${baseName(f.name)}-repaired`, await out.save(saveOpts())));
    }
  }
  return outs;
}
