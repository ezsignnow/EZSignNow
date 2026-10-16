import {
  PDFDocument,
  PDFName,
  StandardFonts,
  TextRenderingMode,
  beginText,
  endText,
  popGraphicsState,
  pushGraphicsState,
  setCharacterSqueeze,
  setFontAndSize,
  setTextMatrix,
  setTextRenderingMode,
  showText,
} from "pdf-lib";
import { type InputFile, type Options, type OutputFile, type ToolContext, ToolError, baseName, loadPdf, num, parsePageRanges, pdfOut, saveOpts, str, tick } from "../core";
import { normRotation, transformPageContent, visibleBox, visibleFracToUser } from "../pdfHelpers";
import { renderPageToCanvas } from "@/lib/pdfjs";
import { pdfjsFor } from "./render";

/* ───────────── Deskew ───────────── */

/** Estimates how far the page content is rotated (degrees, counter-clockwise as seen). */
export function estimateSkew(canvas: HTMLCanvasElement, maxAngle: number): { angle: number; confidence: number } {
  const ctx = canvas.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pts: number[] = [];
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 400000)));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114 < 140) pts.push(x, y);
    }
  }
  if (pts.length < 200) return { angle: 0, confidence: 0 };
  const score = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    const s = Math.sin(a), c = Math.cos(a);
    const bins = new Map<number, number>();
    for (let k = 0; k < pts.length; k += 2) {
      const b = Math.round(pts[k + 1] * c + pts[k] * s);
      bins.set(b, (bins.get(b) ?? 0) + 1);
    }
    let sum = 0;
    for (const v of bins.values()) sum += v * v;
    return sum;
  };
  let best = 0, bestScore = score(0);
  const base = bestScore;
  for (let d = -maxAngle; d <= maxAngle; d += 0.5) {
    const sc = score(d);
    if (sc > bestScore) { best = d; bestScore = sc; }
  }
  for (let d = best - 0.5; d <= best + 0.5; d += 0.05) {
    const sc = score(d);
    if (sc > bestScore) { best = d; bestScore = sc; }
  }
  return { angle: Math.round(best * 100) / 100, confidence: bestScore / base };
}

export async function deskew(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  const maxAngle = Math.min(20, Math.max(1, num(o.maxAngle, 10)));
  for (const f of files) {
    const doc = await loadPdf(f.bytes);
    const pdf = await pdfjsFor(f.bytes);
    const pages = parsePageRanges(str(o.pages), doc.getPageCount());
    let fixed = 0;
    for (const i of pages) {
      ctx.progress(`Checking page ${i + 1}`, pages.indexOf(i) / pages.length);
      const page = await pdf.getPage(i + 1);
      const vp = page.getViewport({ scale: 1 });
      const canvas = await renderPageToCanvas(page, Math.min(2, 1000 / Math.max(vp.width, vp.height)), { annotations: false });
      const { angle, confidence } = estimateSkew(canvas, maxAngle);
      if (Math.abs(angle) < 0.15 || confidence < 1.02) continue;
      const p = doc.getPage(i);
      const box = visibleBox(p);
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      const phi = (-angle * Math.PI) / 180; // rotate back (clockwise for a CCW skew)
      const c = Math.cos(phi), s = Math.sin(phi);
      transformPageContent(doc, p, [c, s, -s, c, cx - cx * c + cy * s, cy - cx * s - cy * c]);
      fixed++;
      await tick();
    }
    ctx.note?.(fixed ? `${f.name}: straightened ${fixed} page${fixed === 1 ? "" : "s"}.` : `${f.name}: no tilted pages were found.`);
    outs.push(pdfOut(`${baseName(f.name)}-deskewed`, await doc.save(saveOpts())));
  }
  return outs;
}

/* ───────────── OCR ───────────── */

export const OCR_LANGUAGES = [
  { value: "eng", label: "English" },
  { value: "spa", label: "Spanish" },
  { value: "fra", label: "French" },
  { value: "deu", label: "German" },
  { value: "ita", label: "Italian" },
  { value: "por", label: "Portuguese" },
  { value: "nld", label: "Dutch" },
  { value: "pol", label: "Polish" },
  { value: "tur", label: "Turkish" },
  { value: "swe", label: "Swedish" },
];

interface OcrWord {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

export async function ocr(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const { createWorker } = await import("tesseract.js");
  const lang = str(o.language, "eng");
  ctx.progress("Loading the text recognition engine (first use downloads ~10 MB)");
  const worker = await createWorker(lang, 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") ctx.progress(`Recognising text… ${Math.round(m.progress * 100)}%`);
    },
  });
  const outs: OutputFile[] = [];
  try {
    for (const f of files) {
      const doc = await loadPdf(f.bytes);
      const pdf = await pdfjsFor(f.bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = parsePageRanges(str(o.pages), doc.getPageCount());
      let words = 0;
      for (const i of pages) {
        const pjs = await pdf.getPage(i + 1);
        if (o.skipText !== false) {
          const tc = await pjs.getTextContent();
          if (tc.items.filter((it) => "str" in it && (it as { str: string }).str.trim()).length > 10) continue;
        }
        ctx.progress(`Reading page ${i + 1}`, pages.indexOf(i) / pages.length);
        const scale = 300 / 72;
        const canvas = await renderPageToCanvas(pjs, scale, { annotations: false });
        const { data } = await worker.recognize(canvas, {}, { blocks: true, text: false });
        const page = doc.getPage(i);
        const fontName = page.node.newFontDictionary("OcrF", font.ref);
        const r = normRotation(page);
        const vis = pjs.getViewport({ scale: 1 });
        const ops = [pushGraphicsState(), beginText(), setTextRenderingMode(TextRenderingMode.Invisible)];
        const list: OcrWord[] = [];
        for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) for (const w of l.words) list.push(w as OcrWord);
        for (const w of list) {
          const text = [...w.text].map((ch) => { try { font.encodeText(ch); return ch; } catch { return ""; } }).join("").trim();
          if (!text || w.confidence < 30) continue;
          const x0 = w.bbox.x0 / scale, y0 = w.bbox.y0 / scale, x1 = w.bbox.x1 / scale, y1 = w.bbox.y1 / scale;
          const size = Math.max(4, (y1 - y0) * 0.9);
          const natural = font.widthOfTextAtSize(text, size) || 1;
          // Baseline at the bottom of the word box, as fractions of the displayed page.
          const [ux, uy] = visibleFracToUser(page, x0 / vis.width, (y1 - (y1 - y0) * 0.15) / vis.height);
          const rad = (r * Math.PI) / 180;
          ops.push(
            setFontAndSize(fontName, size),
            setCharacterSqueeze(Math.max(10, Math.min(500, (100 * (x1 - x0)) / natural))),
            setTextMatrix(Math.cos(rad), Math.sin(rad), -Math.sin(rad), Math.cos(rad), ux, uy),
            showText(font.encodeText(`${text} `)),
          );
          words++;
        }
        ops.push(endText(), popGraphicsState());
        page.pushOperators(...ops);
        void PDFName;
        await tick();
      }
      ctx.note?.(words ? `${f.name}: recognised ${words} words — the text is now searchable and selectable.` : `${f.name}: no new text was added (pages already contain text, or no text was recognised).`);
      outs.push(pdfOut(`${baseName(f.name)}-ocr`, await doc.save(saveOpts())));
    }
  } finally {
    await worker.terminate();
  }
  if (!outs.length) throw new ToolError("Nothing to process.");
  return outs;
}

export { PDFDocument };
