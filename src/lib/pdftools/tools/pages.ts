import { PDFDocument, degrees, rgb } from "pdf-lib";
import {
  type InputFile,
  type Options,
  type OutputFile,
  type ToolContext,
  ToolError,
  PAGE_SIZES,
  baseName,
  loadPdf,
  num,
  parsePageRanges,
  pdfOut,
  saveOpts,
  str,
  tick,
  visibleSize,
  zipOutputs,
} from "../core";
import {
  copyPagesKeepForms,
  cropToVisibleFraction,
  drawEmbeddedUpright,
  normRotation,
  removeFieldsOnPages,
  transformPageContent,
  visibleBox,
} from "../pdfHelpers";

/** Per-file settings set in the file list (merge / alternate & mix). */
export interface FileSettings {
  pages?: string;
  reverse?: boolean;
}
const fileSettings = (o: Options, id: string): FileSettings => ((o.fileSettings as Record<string, FileSettings>) ?? {})[id] ?? {};

/* ───────────────────────── Merge ───────────────────────── */

export async function merge(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  if (files.length < 2) throw new ToolError("Add at least two PDF files to merge.");
  const out = await PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    ctx.progress(`Adding ${files[i].name}`, i / files.length);
    const src = await loadPdf(files[i].bytes);
    const idx = parsePageRanges(fileSettings(o, files[i].id).pages, src.getPageCount());
    const pages = await copyPagesKeepForms(out, src, idx);
    pages.forEach((p) => out.addPage(p));
    if (o.blankBetween && i < files.length - 1 && out.getPageCount() % 2 === 1) {
      const last = pages[pages.length - 1].getSize();
      out.addPage([last.width, last.height]);
    }
  }
  return [pdfOut(str(o.outputName) || `${baseName(files[0].name)}-merged`, await out.save(saveOpts()))];
}

/* ───────────────────────── Alternate & Mix ───────────────────────── */

export async function alternateMix(files: InputFile[], o: Options): Promise<OutputFile[]> {
  if (files.length < 2) throw new ToolError("Add at least two PDF files to mix.");
  const step = Math.max(1, Math.round(num(o.step, 1)));
  const out = await PDFDocument.create();
  const sources = [] as { doc: PDFDocument; queue: number[] }[];
  for (const f of files) {
    const doc = await loadPdf(f.bytes);
    const s = fileSettings(o, f.id);
    let queue = parsePageRanges(s.pages, doc.getPageCount());
    if (s.reverse) queue = queue.reverse();
    sources.push({ doc, queue });
  }
  while (sources.some((s) => s.queue.length)) {
    for (const s of sources) {
      const take = s.queue.splice(0, step);
      if (!take.length) continue;
      const pages = await copyPagesKeepForms(out, s.doc, take);
      pages.forEach((p) => out.addPage(p));
    }
  }
  return [pdfOut(`${baseName(files[0].name)}-mixed`, await out.save(saveOpts()))];
}

/* ───────────────────────── Organize ───────────────────────── */

/** One entry of the page plan built in the Organize panel. */
export type PlanItem = { file: number; page: number; rotate: number } | { blank: true; width: number; height: number };

export async function organize(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const plan = o.plan as PlanItem[] | undefined;
  if (!plan?.length) throw new ToolError("There are no pages left to save.");
  const docs = await Promise.all(files.map((f) => loadPdf(f.bytes)));
  const out = await PDFDocument.create();
  for (const item of plan) {
    if ("blank" in item) {
      out.addPage([item.width, item.height]);
      continue;
    }
    const src = docs[item.file];
    const [page] = await copyPagesKeepForms(out, src, [item.page]);
    const base = normRotation(src.getPage(item.page));
    page.setRotation(degrees((((base + item.rotate) % 360) + 360) % 360));
    out.addPage(page);
  }
  return [pdfOut(`${baseName(files[0].name)}-organized`, await out.save(saveOpts()))];
}

/* ───────────────────────── Delete / Extract ───────────────────────── */

export async function deletePages(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const f = files[0];
  const doc = await loadPdf(f.bytes);
  const idx = parsePageRanges(str(o.pages) || undefined, doc.getPageCount());
  if (!str(o.pages).trim()) throw new ToolError("Choose the pages to delete.");
  if (idx.length >= doc.getPageCount()) throw new ToolError("You can't delete every page.");
  removeFieldsOnPages(doc, idx);
  for (const i of [...idx].reverse()) doc.removePage(i);
  return [pdfOut(`${baseName(f.name)}`, await doc.save(saveOpts()))];
}

export async function extractPages(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const f = files[0];
  const src = await loadPdf(f.bytes);
  if (!str(o.pages).trim()) throw new ToolError("Choose the pages to extract.");
  const idx = parsePageRanges(str(o.pages), src.getPageCount());
  if (o.separate) {
    const outs: OutputFile[] = [];
    for (const i of idx) {
      const out = await PDFDocument.create();
      (await copyPagesKeepForms(out, src, [i])).forEach((p) => out.addPage(p));
      outs.push(pdfOut(`${baseName(f.name)}-page-${i + 1}`, await out.save(saveOpts())));
    }
    return outs;
  }
  const out = await PDFDocument.create();
  (await copyPagesKeepForms(out, src, idx)).forEach((p) => out.addPage(p));
  return [pdfOut(`${baseName(f.name)}-extracted`, await out.save(saveOpts()))];
}

/* ───────────────────────── Rotate ───────────────────────── */

export async function rotate(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    const doc = await loadPdf(f.bytes);
    const perPage = o.rotations as Record<number, number> | undefined;
    if (perPage && files.length === 1 && Object.keys(perPage).length) {
      for (const [k, v] of Object.entries(perPage)) {
        const p = doc.getPage(Number(k));
        p.setRotation(degrees((((normRotation(p) + v) % 360) + 360) % 360));
      }
    } else {
      const angle = num(o.angle, 90);
      for (const i of parsePageRanges(str(o.pages), doc.getPageCount())) {
        const p = doc.getPage(i);
        p.setRotation(degrees((((normRotation(p) + angle) % 360) + 360) % 360));
      }
    }
    outs.push(pdfOut(baseName(f.name), await doc.save(saveOpts())));
  }
  return outs;
}

/* ───────────────────────── Crop ───────────────────────── */

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export async function crop(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const doc = await loadPdf(f.bytes);
  const pages = parsePageRanges(str(o.pages), doc.getPageCount());
  if (o.mode === "auto") {
    const { detectContentBox } = await import("./render");
    for (let n = 0; n < pages.length; n++) {
      ctx.progress(`Finding margins on page ${pages[n] + 1}`, n / pages.length);
      const r = await detectContentBox(f.bytes, pages[n], num(o.padding, 10));
      if (r) cropToVisibleFraction(doc.getPage(pages[n]), r.x, r.y, r.w, r.h);
    }
  } else {
    const rect = o.crop as CropRect | undefined;
    if (!rect || rect.w <= 0.01 || rect.h <= 0.01) throw new ToolError("Draw the area to keep on the page preview.");
    for (const i of pages) cropToVisibleFraction(doc.getPage(i), rect.x, rect.y, rect.w, rect.h);
  }
  return [pdfOut(`${baseName(f.name)}-cropped`, await doc.save(saveOpts()))];
}

/* ───────────────────────── Flip ───────────────────────── */

export async function flip(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    const doc = await loadPdf(f.bytes);
    for (const i of parsePageRanges(str(o.pages), doc.getPageCount())) {
      const page = doc.getPage(i);
      const box = page.getMediaBox();
      // Flip as the reader sees it: account for the page's own rotation.
      const r = normRotation(page);
      const visualHorizontal = o.direction !== "vertical";
      const userHorizontal = r === 90 || r === 270 ? !visualHorizontal : visualHorizontal;
      const m: [number, number, number, number, number, number] = userHorizontal
        ? [-1, 0, 0, 1, 2 * box.x + box.width, 0]
        : [1, 0, 0, -1, 0, 2 * box.y + box.height];
      transformPageContent(doc, page, m);
    }
    outs.push(pdfOut(`${baseName(f.name)}-flipped`, await doc.save(saveOpts())));
  }
  return outs;
}

/* ───────────────────────── Resize ───────────────────────── */

export async function resize(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (const f of files) {
    const doc = await loadPdf(f.bytes);
    for (const i of parsePageRanges(str(o.pages), doc.getPageCount())) {
      const page = doc.getPage(i);
      const box = visibleBox(page);
      const r = normRotation(page);
      const sideways = r === 90 || r === 270;
      if (o.mode === "margins") {
        // Add margins (given in points) around the page as displayed.
        const pt = (num(o.marginMm, 12.7) * 72) / 25.4;
        page.setMediaBox(box.x - pt, box.y - pt, box.width + 2 * pt, box.height + 2 * pt);
        page.setCropBox(box.x - pt, box.y - pt, box.width + 2 * pt, box.height + 2 * pt);
        continue;
      }
      let [tw, th] = PAGE_SIZES[str(o.size, "A4")] ?? PAGE_SIZES.A4;
      const visW = sideways ? box.height : box.width;
      const visH = sideways ? box.width : box.height;
      const orientation = str(o.orientation, "auto");
      const wantLandscape = orientation === "landscape" || (orientation === "auto" && visW > visH);
      if (wantLandscape !== tw > th) [tw, th] = [th, tw];
      // Target size in user space (un-rotated).
      const [uw, uh] = sideways ? [th, tw] : [tw, th];
      const scale = Math.min(uw / box.width, uh / box.height);
      const dx = (uw - box.width * scale) / 2 - box.x * scale;
      const dy = (uh - box.height * scale) / 2 - box.y * scale;
      transformPageContent(doc, page, [scale, 0, 0, scale, dx, dy]);
      page.setMediaBox(0, 0, uw, uh);
      page.setCropBox(0, 0, uw, uh);
      page.setTrimBox(0, 0, uw, uh);
      page.setBleedBox(0, 0, uw, uh);
      page.setArtBox(0, 0, uw, uh);
    }
    outs.push(pdfOut(`${baseName(f.name)}-resized`, await doc.save(saveOpts())));
  }
  return outs;
}

/* ───────────────────────── N-up ───────────────────────── */

const GRIDS: Record<string, [number, number]> = { "2": [2, 1], "4": [2, 2], "6": [3, 2], "8": [4, 2], "9": [3, 3], "16": [4, 4] };

export async function nup(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const src = await loadPdf(f.bytes);
  const per = str(o.perSheet, "4");
  let [cols, rows] = GRIDS[per] ?? GRIDS["4"];
  const first = visibleSize(src.getPage(0));
  let [sw, sh] = o.sheet === "same" || !o.sheet ? [first.width, first.height] : PAGE_SIZES[str(o.sheet)] ?? PAGE_SIZES.A4;
  // Two-up and other "wide" grids look best on landscape sheets.
  const landscape = o.orientation === "landscape" || (o.orientation !== "portrait" && cols > rows);
  if (landscape !== sw > sh) [sw, sh] = [sh, sw];
  if (!landscape && cols > rows) [cols, rows] = [rows, cols];
  const margin = num(o.margin, 18);
  const cellW = (sw - margin * 2) / cols;
  const cellH = (sh - margin * 2) / rows;
  const out = await PDFDocument.create();
  const perSheet = cols * rows;
  const count = src.getPageCount();
  for (let s = 0; s * perSheet < count; s++) {
    ctx.progress(`Sheet ${s + 1}`, (s * perSheet) / count);
    const sheet = out.addPage([sw, sh]);
    for (let k = 0; k < perSheet; k++) {
      const idx = s * perSheet + k;
      if (idx >= count) break;
      const col = o.order === "columns" ? Math.floor(k / rows) : k % cols;
      const row = o.order === "columns" ? k % rows : Math.floor(k / cols);
      const page = src.getPage(idx);
      const box = visibleBox(page);
      const embedded = await out.embedPage(page, { left: box.x, bottom: box.y, right: box.x + box.width, top: box.y + box.height });
      const r = normRotation(page);
      const vis = r === 90 || r === 270 ? { w: box.height, h: box.width } : { w: box.width, h: box.height };
      const scale = Math.min((cellW - 8) / vis.w, (cellH - 8) / vis.h);
      const x = margin + col * cellW + (cellW - vis.w * scale) / 2;
      const y = sh - margin - (row + 1) * cellH + (cellH - vis.h * scale) / 2;
      drawEmbeddedUpright(sheet, embedded, r, x, y, scale);
      if (o.border) sheet.drawRectangle({ x, y, width: vis.w * scale, height: vis.h * scale, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 0.75 });
    }
    await tick();
  }
  return [pdfOut(`${baseName(f.name)}-${per}up`, await out.save(saveOpts()))];
}

export { zipOutputs };
