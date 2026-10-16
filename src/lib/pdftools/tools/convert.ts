import { PDFDocument } from "pdf-lib";
import {
  type InputFile,
  type Options,
  type OutputFile,
  type ToolContext,
  PAGE_SIZES,
  ToolError,
  baseName,
  num,
  parsePageRanges,
  pdfOut,
  str,
  tick,
} from "../core";
import { canvasToBytes, renderPageToCanvas, pdfjsLib } from "@/lib/pdfjs";
import { pdfjsFor } from "./render";
import { pageLines, paragraphs } from "../textModel";
import { buildDocx, buildPptx, buildXlsx, type Cell, type DocxBlock } from "../office";
import { htmlToTextPdf } from "../htmlLayout";
import { apiUrl } from "@/lib/api";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/* ───────────── PDF → JPG / PNG ───────────── */

export async function pdfToImages(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const pdf = await pdfjsFor(f.bytes);
  const pages = parsePageRanges(str(o.pages), pdf.numPages);
  const png = o.format === "png";
  const dpi = num(o.dpi, 150);
  const outs: OutputFile[] = [];
  for (const i of pages) {
    ctx.progress(`Converting page ${i + 1}`, outs.length / pages.length);
    const canvas = await renderPageToCanvas(await pdf.getPage(i + 1), dpi / 72);
    const bytes = await canvasToBytes(canvas, png ? "image/png" : "image/jpeg", num(o.quality, 85) / 100);
    outs.push({ name: `${baseName(f.name)}-${i + 1}.${png ? "png" : "jpg"}`, mime: png ? "image/png" : "image/jpeg", bytes });
    await tick();
  }
  return outs;
}

/* ───────────── PDF → Text ───────────── */

export async function pdfToText(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    const pdf = await pdfjsFor(f.bytes);
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      ctx.progress(`Reading page ${i}`, i / pdf.numPages);
      const lines = await pageLines(await pdf.getPage(i));
      const text = o.layout === "paragraphs"
        ? paragraphs(lines, (await pdf.getPage(i)).getViewport({ scale: 1 }).width).map((p) => p.text).join("\n\n")
        : lines.map((l) => l.text).join("\n");
      parts.push(o.pageMarkers === false ? text : `--- Page ${i} ---\n${text}`);
    }
    const all = parts.join("\n\n");
    if (!all.replace(/--- Page \d+ ---/g, "").trim()) throw new ToolError(`${f.name} has no selectable text. Run OCR on it first.`);
    outs.push({ name: `${baseName(f.name)}.txt`, mime: "text/plain", bytes: new TextEncoder().encode(all) });
  }
  return outs;
}

/* ───────────── PDF → Word ───────────── */

export async function pdfToWord(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const pdf = await pdfjsFor(f.bytes);
  const blocks: DocxBlock[] = [];
  const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
  const exact = o.mode === "layout";
  let anyText = false;
  for (let i = 1; i <= pdf.numPages; i++) {
    ctx.progress(`Converting page ${i}`, i / pdf.numPages);
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1 });
    if (i > 1) blocks.push({ kind: "pageBreak" });
    if (exact) {
      const canvas = await renderPageToCanvas(page, 2);
      blocks.push({ kind: "image", png: await canvasToBytes(canvas, "image/png"), widthPt: first.width - 72, heightPt: (first.width - 72) * (vp.height / vp.width) });
      continue;
    }
    for (const p of paragraphs(await pageLines(page), vp.width)) {
      anyText = true;
      blocks.push({
        kind: "paragraph",
        style: p.heading === 1 ? "Heading1" : p.heading === 2 ? "Heading2" : undefined,
        align: p.center ? "center" : "left",
        runs: [{ text: p.text, size: p.heading ? undefined : Math.round(Math.min(14, Math.max(8, p.size)) * 2) / 2 }],
      });
    }
  }
  if (!exact && !anyText) throw new ToolError("This PDF has no selectable text (it may be a scan). Run OCR first, or choose “Keep exact layout”.");
  return [{ name: `${baseName(f.name)}.docx`, mime: DOCX, bytes: buildDocx(blocks, { widthPt: first.width, heightPt: first.height, marginPt: exact ? 36 : 54 }) }];
}

/* ───────────── PDF → Excel ───────────── */

function toCell(text: string): Cell {
  const t = text.trim();
  if (/^-?[$€£₹]?\s?\d{1,3}(,\d{3})*(\.\d+)?$|^-?[$€£₹]?\s?\d+(\.\d+)?$/.test(t) && !/^0\d/.test(t)) {
    const n = parseFloat(t.replace(/[$€£₹,\s]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  if (/^\(\d[\d,]*(\.\d+)?\)$/.test(t)) return -parseFloat(t.replace(/[(),]/g, ""));
  return t;
}

export async function pdfToExcel(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const pdf = await pdfjsFor(f.bytes);
  const sheets: { name: string; rows: Cell[][] }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    ctx.progress(`Reading tables on page ${i}`, i / pdf.numPages);
    const lines = await pageLines(await pdf.getPage(i));
    // Column anchors: cluster the start positions of every cell on the page.
    const starts = lines.flatMap((l) => l.pieces.map((p) => p.x)).sort((a, b) => a - b);
    const anchors: number[] = [];
    for (const x of starts) if (!anchors.length || x - anchors[anchors.length - 1] > 12) anchors.push(x);
    const rows: Cell[][] = lines.map((l) => {
      const row: Cell[] = [];
      for (const p of l.pieces) {
        let col = 0;
        for (let k = 0; k < anchors.length; k++) if (anchors[k] <= p.x + 6) col = k;
        while (row[col] !== undefined && row[col] !== null) col++;
        row[col] = toCell(p.text);
      }
      return Array.from({ length: row.length }, (_, k) => row[k] ?? null);
    });
    sheets.push({ name: `Page ${i}`, rows });
  }
  if (o.oneSheet) sheets.splice(0, sheets.length, { name: "Data", rows: sheets.flatMap((s, k) => (k ? [[], ...s.rows] : s.rows)) });
  if (!sheets.some((s) => s.rows.length)) throw new ToolError("No text was found in this PDF. If it's a scan, run OCR first.");
  return [{ name: `${baseName(f.name)}.xlsx`, mime: XLSX, bytes: buildXlsx(sheets) }];
}

/* ───────────── PDF → PowerPoint ───────────── */

export async function pdfToPowerPoint(files: InputFile[], _o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const pdf = await pdfjsFor(f.bytes);
  const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
  const slides: { png: Uint8Array }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    ctx.progress(`Rendering slide ${i}`, i / pdf.numPages);
    const page = await pdf.getPage(i);
    const scale = 1600 / Math.max(page.getViewport({ scale: 1 }).width, page.getViewport({ scale: 1 }).height);
    slides.push({ png: await canvasToBytes(await renderPageToCanvas(page, scale), "image/png") });
    await tick();
  }
  return [{ name: `${baseName(f.name)}.pptx`, mime: PPTX, bytes: buildPptx(slides, first.width, first.height) }];
}

/* ───────────── Extract images ───────────── */

export async function extractImages(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const pdf = await pdfjsFor(f.bytes);
  const minSize = num(o.minSize, 32);
  const png = o.format !== "jpg";
  const outs: OutputFile[] = [];
  const seen = new Set<string>();
  const OPS = pdfjsLib.OPS;
  for (let i = 1; i <= pdf.numPages; i++) {
    ctx.progress(`Looking for images on page ${i}`, i / pdf.numPages);
    const page = await pdf.getPage(i);
    const ops = await page.getOperatorList();
    let k = 0;
    for (let j = 0; j < ops.fnArray.length; j++) {
      const fn = ops.fnArray[j];
      if (fn !== OPS.paintImageXObject && fn !== OPS.paintInlineImageXObject && fn !== OPS.paintImageXObjectRepeat) continue;
      const arg = ops.argsArray[j][0];
      let img: { width: number; height: number; data?: Uint8ClampedArray | Uint8Array; kind?: number; bitmap?: ImageBitmap } | null;
      let key: string;
      if (typeof arg === "string") {
        key = arg;
        if (seen.has(key)) continue;
        const store = arg.startsWith("g_") ? page.commonObjs : page.objs;
        img = await new Promise((res) => {
          try {
            store.get(arg, (v: unknown) => res(v as typeof img));
          } catch {
            res(null);
          }
          setTimeout(() => res(null), 4000);
        });
      } else {
        key = `inline-${i}-${j}`;
        img = arg;
      }
      seen.add(key);
      if (!img || img.width < minSize || img.height < minSize) continue;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const c2 = canvas.getContext("2d")!;
      if (img.bitmap) c2.drawImage(img.bitmap, 0, 0);
      else if (img.data) {
        const rgba = new Uint8ClampedArray(img.width * img.height * 4);
        const d = img.data;
        if (img.kind === 3) rgba.set(d.subarray(0, rgba.length));
        else if (img.kind === 2) for (let p = 0, q = 0; p < rgba.length; p += 4, q += 3) { rgba[p] = d[q]; rgba[p + 1] = d[q + 1]; rgba[p + 2] = d[q + 2]; rgba[p + 3] = 255; }
        else if (img.kind === 1) {
          const rowBytes = Math.ceil(img.width / 8);
          for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
            const bit = (d[y * rowBytes + (x >> 3)] >> (7 - (x & 7))) & 1;
            const p = (y * img.width + x) * 4;
            rgba[p] = rgba[p + 1] = rgba[p + 2] = bit ? 255 : 0;
            rgba[p + 3] = 255;
          }
        } else continue;
        c2.putImageData(new ImageData(rgba, img.width, img.height), 0, 0);
      } else continue;
      k++;
      outs.push({ name: `${baseName(f.name)}-p${i}-${k}.${png ? "png" : "jpg"}`, mime: png ? "image/png" : "image/jpeg", bytes: await canvasToBytes(canvas, png ? "image/png" : "image/jpeg", 0.92) });
    }
  }
  if (!outs.length) throw new ToolError("No images were found in this PDF.");
  return outs;
}

/* ───────────── JPG/images → PDF ───────────── */

/** Reads the EXIF orientation of a JPEG (1 = normal). */
function jpegOrientation(bytes: Uint8Array): number {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 4 < bytes.length) {
    if (bytes[i] !== 0xff) return 1;
    const marker = bytes[i + 1];
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker === 0xe1 && String.fromCharCode(...bytes.subarray(i + 4, i + 8)) === "Exif") {
      const t = i + 10;
      const le = bytes[t] === 0x49;
      const u16 = (o: number) => (le ? bytes[o] | (bytes[o + 1] << 8) : (bytes[o] << 8) | bytes[o + 1]);
      const u32 = (o: number) => (le ? (bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16) | (bytes[o + 3] << 24)) >>> 0 : ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0);
      const ifd = t + u32(t + 4);
      const n = u16(ifd);
      for (let e = 0; e < n; e++) if (u16(ifd + 2 + e * 12) === 0x0112) return u16(ifd + 2 + e * 12 + 8);
      return 1;
    }
    if (marker === 0xda) return 1;
    i += 2 + len;
  }
  return 1;
}

async function imageForPdf(file: InputFile): Promise<{ bytes: Uint8Array; jpg: boolean; w: number; h: number }> {
  const isJpg = /jpe?g/i.test(file.type) || /\.jpe?g$/i.test(file.name);
  const isPng = /png/i.test(file.type) || /\.png$/i.test(file.name);
  if ((isJpg && jpegOrientation(file.bytes) === 1) || isPng) {
    const bmp = await createImageBitmap(new Blob([file.bytes], { type: isJpg ? "image/jpeg" : "image/png" }));
    const r = { bytes: file.bytes, jpg: isJpg, w: bmp.width, h: bmp.height };
    bmp.close();
    return r;
  }
  // Rotated JPEGs, GIF, WebP, BMP…: let the browser decode (applying EXIF rotation) and re-encode.
  const bmp = await createImageBitmap(new Blob([file.bytes], { type: file.type || "image/*" }), { imageOrientation: "from-image" });
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  const jpg = isJpg;
  return { bytes: await canvasToBytes(c, jpg ? "image/jpeg" : "image/png", 0.92), jpg, w: c.width, h: c.height };
}

export async function imagesToPdf(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  if (!files.length) throw new ToolError("Add at least one image.");
  const margin = { none: 0, small: 18, large: 54 }[str(o.margin, "none") as "none" | "small" | "large"] ?? 0;
  const separate = !!o.separate;
  const outs: OutputFile[] = [];
  let doc = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    ctx.progress(`Adding ${files[i].name}`, i / files.length);
    const img = await imageForPdf(files[i]);
    const emb = img.jpg ? await doc.embedJpg(img.bytes) : await doc.embedPng(img.bytes);
    let pw: number, ph: number;
    const size = str(o.pageSize, "fit");
    if (size === "fit") {
      // 1 image pixel = 0.75 pt (96 dpi), keeping huge photos to a sensible size.
      const scale = Math.min(0.75, 1440 / Math.max(img.w, img.h));
      pw = img.w * scale + margin * 2;
      ph = img.h * scale + margin * 2;
    } else {
      [pw, ph] = PAGE_SIZES[size] ?? PAGE_SIZES.A4;
      const orient = str(o.orientation, "auto");
      const land = orient === "landscape" || (orient === "auto" && img.w > img.h);
      if (land !== pw > ph) [pw, ph] = [ph, pw];
    }
    const s = Math.min((pw - margin * 2) / img.w, (ph - margin * 2) / img.h);
    const page = doc.addPage([pw, ph]);
    page.drawImage(emb, { x: (pw - img.w * s) / 2, y: (ph - img.h * s) / 2, width: img.w * s, height: img.h * s });
    if (separate) {
      outs.push(pdfOut(baseName(files[i].name), await doc.save()));
      doc = await PDFDocument.create();
    }
  }
  if (!separate) outs.push(pdfOut(files.length === 1 ? baseName(files[0].name) : "images", await doc.save()));
  return outs;
}

/* ───────────── Word → PDF ───────────── */

export async function wordToPdf(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const mammoth = (await import("mammoth")).default;
  const outs: OutputFile[] = [];
  const [pw, ph] = PAGE_SIZES[str(o.pageSize, "A4")] ?? PAGE_SIZES.A4;
  for (const f of files) {
    if (!/\.docx$/i.test(f.name)) throw new ToolError(`${f.name} isn't a .docx file. Older .doc files must be saved as .docx in Word first.`);
    ctx.progress(`Reading ${f.name}`);
    const { value: html } = await mammoth.convertToHtml(
      { arrayBuffer: f.bytes.slice().buffer },
      { styleMap: ["p[style-name='Title'] => h1.title:fresh", "p[style-name='Subtitle'] => h2:fresh", "p[style-name='Heading 1'] => h1:fresh", "p[style-name='Heading 2'] => h2:fresh", "p[style-name='Heading 3'] => h3:fresh"] },
    );
    ctx.progress(`Laying out ${f.name}`);
    const bytes = await htmlToTextPdf(html, { pageWidth: pw, pageHeight: ph, margin: num(o.margin, 54), family: str(o.font, "Times") === "Helvetica" ? "Helvetica" : "Times", fontSize: num(o.fontSize, 11) });
    outs.push(pdfOut(baseName(f.name), bytes));
  }
  return outs;
}

/* ───────────── HTML → PDF ───────────── */

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(apiUrl(`/api/fetch-url?url=${encodeURIComponent(url)}`));
  if (!res.ok) {
    const msg = await res.json().catch(() => ({ error: res.statusText }));
    throw new ToolError(`Couldn't load that page: ${msg.error ?? res.status}`);
  }
  return res.text();
}

export async function htmlToPdf(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const url = str(o.url).trim();
  let html: string;
  let name: string;
  let base = "";
  if (url) {
    if (!/^https?:\/\//i.test(url)) throw new ToolError("Enter a full web address starting with http:// or https://");
    ctx.progress("Downloading the page");
    html = await fetchHtml(url);
    name = new URL(url).hostname.replace(/^www\./, "");
    base = url;
  } else if (files[0]) {
    html = new TextDecoder().decode(files[0].bytes);
    name = baseName(files[0].name);
  } else if (str(o.html).trim()) {
    html = str(o.html);
    name = "page";
  } else throw new ToolError("Enter a web address, upload an HTML file or paste HTML.");

  const [pw, ph] = PAGE_SIZES[str(o.pageSize, "A4")] ?? PAGE_SIZES.A4;
  const landscape = o.orientation === "landscape";
  const [W, H] = landscape ? [ph, pw] : [pw, ph];

  if (o.mode === "text") {
    return [pdfOut(name, await htmlToTextPdf(html, { pageWidth: W, pageHeight: H, margin: 40, family: "Helvetica", fontSize: 10.5 }))];
  }

  // Exact look: render the page in a hidden frame and capture it.
  ctx.progress("Rendering the page");
  const viewportPx = num(o.viewport, 1100);
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-same-origin");
  frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${viewportPx}px;height:1200px;border:0;background:#fff`;
  const withBase = base ? html.replace(/<head([^>]*)>/i, `<head$1><base href="${base.replace(/"/g, "&quot;")}">`) : html;
  frame.srcdoc = withBase;
  document.body.appendChild(frame);
  try {
    await new Promise<void>((res) => {
      frame.onload = () => res();
      setTimeout(res, 15000);
    });
    await new Promise((r) => setTimeout(r, 800));
    const body = frame.contentDocument?.body;
    if (!body) throw new ToolError("The page couldn't be rendered.");
    const html2canvas = (await import("html2canvas")).default;
    const fullH = Math.max(body.scrollHeight, frame.contentDocument!.documentElement.scrollHeight);
    frame.style.height = `${fullH}px`;
    const canvas = await html2canvas(frame.contentDocument!.documentElement, { useCORS: true, backgroundColor: "#ffffff", width: viewportPx, windowWidth: viewportPx, height: fullH, windowHeight: fullH, scale: 1.5, logging: false });
    const doc = await PDFDocument.create();
    const margin = 24;
    const scale = (W - margin * 2) / canvas.width;
    const sliceH = Math.floor((H - margin * 2) / scale);
    for (let y = 0; y < canvas.height; y += sliceH) {
      ctx.progress(`Building page ${doc.getPageCount() + 1}`, y / canvas.height);
      const h = Math.min(sliceH, canvas.height - y);
      const part = document.createElement("canvas");
      part.width = canvas.width;
      part.height = h;
      part.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      const img = await doc.embedJpg(await canvasToBytes(part, "image/jpeg", 0.88));
      doc.addPage([W, H]).drawImage(img, { x: margin, y: H - margin - h * scale, width: canvas.width * scale, height: h * scale });
    }
    return [pdfOut(name, await doc.save())];
  } finally {
    frame.remove();
  }
}
