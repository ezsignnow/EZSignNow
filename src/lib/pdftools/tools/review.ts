import { PDFDocument, rgb } from "pdf-lib";
import { type InputFile, type Options, type OutputFile, type ToolContext, ToolError, baseName, loadPdf, num, parsePageRanges, pdfOut, saveOpts, str, tick } from "../core";
import { canvasToBytes, renderPageToCanvas } from "@/lib/pdfjs";
import { copyPagesKeepForms } from "../pdfHelpers";
import { pdfjsFor } from "./render";
import { type DiffOp, diffSequences, normalizeLine } from "../diff";
import { ReportWriter } from "../reportPdf";
import { pageLines } from "../textModel";

/* ═══════════════════════════ Redact ═══════════════════════════ */

/** An area drawn by the user, as fractions of the displayed page (top-left origin). */
export interface RedactBox {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A text fragment positioned on a page, in points from the page's top-left (baseline y). */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  size: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const REDACT_PRESETS: Record<string, { label: string; pattern: RegExp }> = {
  email: { label: "Email addresses", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  phone: { label: "Phone numbers", pattern: /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/g },
  ssn: { label: "Social Security numbers", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  card: { label: "Card numbers", pattern: /\b(?:\d[ -]?){13,19}\b/g },
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Turns the terms box (one per line) and ticked presets into search patterns. */
export function buildMatchers(terms: string, presets: string[], matchCase: boolean): RegExp[] {
  const out: RegExp[] = [];
  for (const t of terms.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)) out.push(new RegExp(escapeRegex(t), matchCase ? "g" : "gi"));
  for (const p of presets) if (REDACT_PRESETS[p]) out.push(new RegExp(REDACT_PRESETS[p].pattern.source, REDACT_PRESETS[p].pattern.flags));
  return out;
}

/** Finds on-page rectangles covering every match of the patterns, even when a match spans text fragments. */
export function findTextBoxes(items: TextItem[], matchers: RegExp[]): Rect[] {
  const lines: { y: number; size: number; items: TextItem[] }[] = [];
  for (const it of items) {
    if (!it.str) continue;
    const line = lines.find((l) => Math.abs(l.y - it.y) < Math.max(2, Math.min(l.size, it.size) * 0.5));
    if (line) line.items.push(it);
    else lines.push({ y: it.y, size: it.size, items: [it] });
  }
  const boxes: Rect[] = [];
  for (const line of lines) {
    const sorted = [...line.items].sort((a, b) => a.x - b.x);
    let text = "";
    const owner: number[] = [];
    const offset: number[] = [];
    sorted.forEach((it, idx) => {
      const prev = sorted[idx - 1];
      if (prev && it.x - (prev.x + prev.width) > it.size * 0.2 && !/\s$/.test(text) && !/^\s/.test(it.str)) {
        text += " ";
        owner.push(-1);
        offset.push(0);
      }
      for (let k = 0; k < it.str.length; k++) {
        text += it.str[k];
        owner.push(idx);
        offset.push(k);
      }
    });
    for (const re of matchers) {
      re.lastIndex = 0;
      for (const m of text.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`))) {
        if (!m[0].length) continue;
        const spans = new Map<number, [number, number]>();
        for (let k = m.index!; k < m.index! + m[0].length; k++) {
          if (owner[k] < 0) continue;
          const s = spans.get(owner[k]);
          if (s) s[1] = offset[k];
          else spans.set(owner[k], [offset[k], offset[k]]);
        }
        for (const [idx, [from, to]] of spans) {
          const it = sorted[idx];
          const len = it.str.length || 1;
          boxes.push({ x: it.x + it.width * (from / len) - 1.5, y: it.y - it.size * 0.95, w: it.width * ((to + 1 - from) / len) + 3, h: it.size * 1.25 });
        }
      }
    }
  }
  return boxes;
}

export async function redact(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const manual = (o.redactions as RedactBox[] | undefined) ?? [];
  const matchers = buildMatchers(str(o.terms), ["email", "phone", "ssn", "card"].filter((p) => o[`preset_${p}`]), !!o.matchCase);
  if (!manual.length && !matchers.length) throw new ToolError("Draw over the areas to black out, or enter text to find and redact.");

  const src = await loadPdf(f.bytes);
  const view = await pdfjsFor(f.bytes);
  const searchPages = new Set(parsePageRanges(str(o.pages) || undefined, view.numPages));
  const dpi = num(o.dpi, 200);
  const fill = str(o.fill, "black") === "white" ? rgb(1, 1, 1) : rgb(0, 0, 0);
  const fillCss = str(o.fill, "black") === "white" ? "#ffffff" : "#000000";
  const out = await PDFDocument.create();
  let areas = 0;
  let pagesRedacted = 0;

  for (let i = 0; i < view.numPages; i++) {
    ctx.progress(`Checking page ${i + 1} of ${view.numPages}`, i / view.numPages);
    const page = await view.getPage(i + 1);
    const vp = page.getViewport({ scale: 1 });
    const boxes: Rect[] = manual.filter((b) => b.page === i).map((b) => ({ x: b.x * vp.width, y: b.y * vp.height, w: b.w * vp.width, h: b.h * vp.height }));
    if (matchers.length && searchPages.has(i)) {
      const content = await page.getTextContent();
      const items: TextItem[] = [];
      for (const raw of content.items) {
        if (!("str" in raw)) continue;
        const it = raw as { str: string; transform: number[]; width: number };
        const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
        items.push({ str: it.str, x, y, width: it.width, size: Math.hypot(it.transform[2], it.transform[3]) || Math.hypot(it.transform[0], it.transform[1]) || 10 });
      }
      boxes.push(...findTextBoxes(items, matchers));
    }
    if (!boxes.length) {
      const [copied] = await copyPagesKeepForms(out, src, [i]);
      out.addPage(copied);
      continue;
    }
    // The page is redrawn as a picture with the boxes burned in, so the covered text is gone from the file.
    const scale = dpi / 72;
    const canvas = await renderPageToCanvas(page, scale);
    const c2 = canvas.getContext("2d")!;
    c2.fillStyle = fillCss;
    for (const b of boxes) c2.fillRect(b.x * scale, b.y * scale, b.w * scale, b.h * scale);
    const img = await out.embedJpg(await canvasToBytes(canvas, "image/jpeg", 0.9));
    const p = out.addPage([vp.width, vp.height]);
    p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
    void fill;
    areas += boxes.length;
    pagesRedacted++;
    await tick();
  }
  if (!pagesRedacted) throw new ToolError("Nothing matched, so nothing was redacted. Check the spelling, or draw over the area instead.");
  ctx.note?.(`Redacted ${areas} area${areas === 1 ? "" : "s"} on ${pagesRedacted} page${pagesRedacted === 1 ? "" : "s"}. Those pages are now pictures, so their text can't be selected — run OCR afterwards if you need that. Bookmarks and document properties were not carried over.`);
  return [pdfOut(`${baseName(f.name)}-redacted`, await out.save(saveOpts()))];
}

/* ═══════════════════════════ Compare ═══════════════════════════ */

export interface CmpLine {
  text: string;
  page: number;
}

export interface Hunk {
  ops: DiffOp[];
}

/** Groups an edit script into change blocks with a little unchanged context around each. */
export function toHunks(ops: DiffOp[], context = 2): Hunk[] {
  const changed = ops.map((op, i) => (op.type === "equal" ? -1 : i)).filter((i) => i >= 0);
  const hunks: Hunk[] = [];
  let start = -1;
  let end = -1;
  for (const i of changed) {
    const from = Math.max(0, i - context);
    const to = Math.min(ops.length - 1, i + context);
    if (start >= 0 && from <= end + 1) end = Math.max(end, to);
    else {
      if (start >= 0) hunks.push({ ops: ops.slice(start, end + 1) });
      start = from;
      end = to;
    }
  }
  if (start >= 0) hunks.push({ ops: ops.slice(start, end + 1) });
  return hunks;
}

export async function linesOf(file: InputFile, ctx: ToolContext, label: string): Promise<{ lines: CmpLine[]; pages: number }> {
  const pdf = await pdfjsFor(file.bytes);
  const lines: CmpLine[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    ctx.progress(`Reading ${label}, page ${i} of ${pdf.numPages}`, (i / pdf.numPages) * 0.5);
    for (const l of await pageLines(await pdf.getPage(i))) lines.push({ text: l.text, page: i });
  }
  return { lines, pages: pdf.numPages };
}

const MAX_REPORT_LINES = 3000;

export interface TextDiffResult {
  bytes: Uint8Array;
  added: number;
  removed: number;
  unchanged: number;
}

export async function buildTextReport(nameA: string, nameB: string, a: { lines: CmpLine[]; pages: number }, b: { lines: CmpLine[]; pages: number }): Promise<TextDiffResult> {
  const ops = diffSequences(a.lines.map((l) => normalizeLine(l.text)), b.lines.map((l) => normalizeLine(l.text)));
  const added = ops.filter((o) => o.type === "add").length;
  const removed = ops.filter((o) => o.type === "remove").length;
  const unchanged = ops.length - added - removed;

  const w = await ReportWriter.create();
  w.heading("Document comparison", 20);
  w.text(`Original: ${nameA} (${a.pages} page${a.pages === 1 ? "" : "s"})`, { size: 10 });
  w.text(`Revised: ${nameB} (${b.pages} page${b.pages === 1 ? "" : "s"})`, { size: 10, gap: 6 });
  w.rule();
  if (!added && !removed) {
    w.text("No differences found in the text.", { size: 13, bold: true, color: rgb(0.09, 0.55, 0.28), gap: 4 });
    w.text("Formatting, images and layout aren't compared in this mode. Use “Visual” to compare how the pages look.", { size: 10, color: rgb(0.4, 0.43, 0.48) });
    return { bytes: await w.save(), added, removed, unchanged };
  }
  w.text(`${removed} line${removed === 1 ? "" : "s"} removed, ${added} line${added === 1 ? "" : "s"} added, ${unchanged} unchanged.`, { size: 12, bold: true, gap: 4 });
  w.text("Red lines are only in the original; green lines are only in the revised version.", { size: 9, color: rgb(0.4, 0.43, 0.48), gap: 10 });

  let shown = 0;
  for (const h of toHunks(ops)) {
    const first = h.ops.find((o) => o.a !== undefined);
    const firstB = h.ops.find((o) => o.b !== undefined);
    const where = [first?.a !== undefined ? `original p. ${a.lines[first.a].page}` : "", firstB?.b !== undefined ? `revised p. ${b.lines[firstB.b].page}` : ""].filter(Boolean).join("  ·  ");
    w.text(where, { size: 8.5, bold: true, color: rgb(0.4, 0.43, 0.48), gap: 2 });
    for (const op of h.ops) {
      if (op.type !== "equal" && ++shown > MAX_REPORT_LINES) break;
      if (op.type === "remove") w.text(`−  ${op.value}`, { size: 9.5, bg: rgb(1, 0.92, 0.92), bar: rgb(0.86, 0.15, 0.15), color: rgb(0.45, 0.07, 0.07) });
      else if (op.type === "add") w.text(`+  ${op.value}`, { size: 9.5, bg: rgb(0.9, 0.98, 0.92), bar: rgb(0.09, 0.64, 0.29), color: rgb(0.05, 0.3, 0.14) });
      else w.text(`    ${op.value}`, { size: 9, color: rgb(0.5, 0.53, 0.58) });
    }
    w.space(8);
    if (shown > MAX_REPORT_LINES) {
      w.text(`The list was cut off after ${MAX_REPORT_LINES} changed lines.`, { size: 9, bold: true, color: rgb(0.7, 0.3, 0.05) });
      break;
    }
  }
  return { bytes: await w.save(), added, removed, unchanged };
}

/** Marks pixels that differ between two same-sized RGBA images. Returns the number of changed pixels. */
export function diffPixels(a: Uint8ClampedArray, b: Uint8ClampedArray, w: number, h: number, out: Uint8ClampedArray): number {
  const lum = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  const INK = 170;
  const inkA = new Uint8Array(w * h);
  const inkB = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    inkA[p] = lum(a, p * 4) < INK ? 1 : 0;
    inkB[p] = lum(b, p * 4) < INK ? 1 : 0;
  }
  const near = (ink: Uint8Array, x: number, y: number) => {
    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < w && ink[yy * w + xx]) return true;
      }
    }
    return false;
  };
  let changed = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      let r = 255, g = 255, bl = 255;
      if (inkA[p] || inkB[p]) {
        if (inkA[p] && inkB[p]) [r, g, bl] = [105, 110, 120];
        else if (inkA[p] && !near(inkB, x, y)) {
          [r, g, bl] = [220, 38, 38];
          changed++;
        } else if (inkB[p] && !near(inkA, x, y)) {
          [r, g, bl] = [22, 163, 74];
          changed++;
        } else [r, g, bl] = [105, 110, 120];
      }
      out[p * 4] = r;
      out[p * 4 + 1] = g;
      out[p * 4 + 2] = bl;
      out[p * 4 + 3] = 255;
    }
  }
  return changed;
}

async function visualCompare(a: InputFile, b: InputFile, ctx: ToolContext): Promise<OutputFile> {
  const [pa, pb] = [await pdfjsFor(a.bytes), await pdfjsFor(b.bytes)];
  const n = Math.max(pa.numPages, pb.numPages);
  const dpi = 100;
  const out = await PDFDocument.create();
  const font = await out.embedFont("Helvetica-Bold" as never);
  let changedPages = 0;
  for (let i = 1; i <= n; i++) {
    ctx.progress(`Comparing page ${i} of ${n}`, i / n);
    const [ca, cb] = [i <= pa.numPages ? await renderPageToCanvas(await pa.getPage(i), dpi / 72) : null, i <= pb.numPages ? await renderPageToCanvas(await pb.getPage(i), dpi / 72) : null];
    const W = Math.max(ca?.width ?? 1, cb?.width ?? 1);
    const H = Math.max(ca?.height ?? 1, cb?.height ?? 1);
    const read = (c: HTMLCanvasElement | null) => {
      const t = document.createElement("canvas");
      t.width = W;
      t.height = H;
      const g = t.getContext("2d")!;
      g.fillStyle = "#fff";
      g.fillRect(0, 0, W, H);
      if (c) g.drawImage(c, 0, 0);
      return g.getImageData(0, 0, W, H).data;
    };
    const res = document.createElement("canvas");
    res.width = W;
    res.height = H;
    const rg = res.getContext("2d")!;
    const img = rg.createImageData(W, H);
    const changed = diffPixels(read(ca), read(cb), W, H, img.data);
    rg.putImageData(img, 0, 0);
    const pct = (changed / (W * H)) * 100;
    if (changed > W * H * 0.00005) changedPages++;
    const pw = (W * 72) / dpi;
    const ph = (H * 72) / dpi;
    const page = out.addPage([pw, ph]);
    page.drawImage(await out.embedJpg(await canvasToBytes(res, "image/jpeg", 0.88)), { x: 0, y: 0, width: pw, height: ph });
    const label = !ca ? `Page ${i}: only in the revised file` : !cb ? `Page ${i}: only in the original file` : `Page ${i}: ${pct < 0.01 ? "no visible change" : `${pct.toFixed(2)}% of the page changed`}`;
    page.drawRectangle({ x: 0, y: ph - 16, width: pw, height: 16, color: rgb(1, 1, 1), opacity: 0.85 });
    page.drawText(label, { x: 8, y: ph - 12, size: 8.5, font, color: rgb(0.25, 0.28, 0.33) });
    await tick();
  }
  ctx.note?.(`${changedPages} of ${n} page${n === 1 ? "" : "s"} look different. Red = only in the original, green = only in the revised file, grey = unchanged.`);
  if (pa.numPages !== pb.numPages) ctx.note?.(`The files have different page counts (${pa.numPages} and ${pb.numPages}).`);
  return pdfOut(`${baseName(b.name)}-vs-${baseName(a.name)}-visual`, await out.save(saveOpts()));
}

export async function comparePdfs(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  if (files.length !== 2) throw new ToolError("Add exactly two PDFs: the original first, then the revised version.");
  const [a, b] = files;
  if (str(o.mode, "text") === "visual") return [await visualCompare(a, b, ctx)];
  const [la, lb] = [await linesOf(a, ctx, "the original"), await linesOf(b, ctx, "the revised file")];
  if (!la.lines.length && !lb.lines.length) throw new ToolError("Neither file has selectable text. Run OCR on them first, or choose the Visual comparison.");
  if (!la.lines.length || !lb.lines.length) ctx.note?.(`${!la.lines.length ? a.name : b.name} has no selectable text, so everything is reported as different. Run OCR on it, or use the Visual comparison.`);
  const r = await buildTextReport(a.name, b.name, la, lb);
  ctx.note?.(r.added || r.removed ? `${r.removed} line(s) removed, ${r.added} line(s) added.` : "The text is identical.");
  return [pdfOut(`${baseName(b.name)}-vs-${baseName(a.name)}`, r.bytes)];
}
