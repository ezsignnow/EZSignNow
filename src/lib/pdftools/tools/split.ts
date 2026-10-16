import { PDFDocument } from "pdf-lib";
import {
  type InputFile,
  type Options,
  type OutputFile,
  type ToolContext,
  ToolError,
  baseName,
  loadPdf,
  num,
  parsePageRanges,
  pdfOut,
  saveOpts,
  str,
  tick,
} from "../core";
import { copyPagesKeepForms, cropToVisibleFraction, normRotation } from "../pdfHelpers";
import { pdfjsFor } from "./render";

/** Builds one output file per group of page indexes. */
async function writeGroups(src: PDFDocument, groups: { pages: number[]; name: string }[], ctx: ToolContext): Promise<OutputFile[]> {
  const outs: OutputFile[] = [];
  for (let g = 0; g < groups.length; g++) {
    ctx.progress(`Writing file ${g + 1} of ${groups.length}`, g / groups.length);
    const out = await PDFDocument.create();
    (await copyPagesKeepForms(out, src, groups[g].pages)).forEach((p) => out.addPage(p));
    outs.push(pdfOut(groups[g].name, await out.save(saveOpts())));
    await tick();
  }
  return outs;
}

const safe = (s: string) => s.replace(/[\\/:*?"<>|\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "part";

/** Splits page indexes 0..total-1 into runs, starting a new run at each index in `starts`. */
function runsFromStarts(total: number, starts: number[]): number[][] {
  const s = [...new Set(starts.filter((i) => i > 0 && i < total))].sort((a, b) => a - b);
  const runs: number[][] = [];
  let begin = 0;
  for (const st of [...s, total]) {
    runs.push(Array.from({ length: st - begin }, (_, k) => begin + k));
    begin = st;
  }
  return runs.filter((r) => r.length);
}

/* ───────────── Split by pages ───────────── */

export async function splitByPages(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const src = await loadPdf(f.bytes);
  const total = src.getPageCount();
  const mode = str(o.mode, "every");
  let starts: number[] = [];
  if (mode === "every") {
    const n = Math.max(1, Math.round(num(o.every, 1)));
    for (let i = n; i < total; i += n) starts.push(i);
  } else if (mode === "after") {
    // "Split after pages 2, 5" → new files start at 3 and 6.
    const after = str(o.splitPoints) || str(o.after);
    if (!after.trim()) throw new ToolError("Enter the pages to split after (for example 2, 5).");
    starts = parsePageRanges(after, total).map((i) => i + 1);
  } else if (mode === "odd") {
    starts = Array.from({ length: total }, (_, i) => i).filter((i) => i % 2 === 1);
  } else if (mode === "even") {
    starts = Array.from({ length: total }, (_, i) => i).filter((i) => i % 2 === 0 && i > 0);
  } else if (mode === "ranges") {
    // Each comma-separated range becomes its own file.
    const parts = str(o.ranges).split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) throw new ToolError("Enter page ranges, for example 1-3, 4-8, 9-.");
    return writeGroups(
      src,
      parts.map((p) => ({ pages: parsePageRanges(p, total), name: `${baseName(f.name)}-pages-${p.replace(/\s+/g, "")}` })),
      ctx,
    );
  }
  const runs = runsFromStarts(total, starts);
  if (runs.length < 2) throw new ToolError("Those settings don't split the document into more than one file.");
  return writeGroups(
    src,
    runs.map((r) => ({ pages: r, name: `${baseName(f.name)}-${r.length === 1 ? r[0] + 1 : `${r[0] + 1}-${r[r.length - 1] + 1}`}` })),
    ctx,
  );
}

/* ───────────── Split by bookmarks ───────────── */

interface OutlineNode {
  title: string;
  dest: unknown;
  items: OutlineNode[];
}

export async function bookmarkPages(bytes: Uint8Array): Promise<{ title: string; page: number; level: number }[]> {
  const doc = await pdfjsFor(bytes);
  const outline = ((await doc.getOutline()) ?? []) as OutlineNode[];
  const result: { title: string; page: number; level: number }[] = [];
  const walk = async (nodes: OutlineNode[], level: number) => {
    for (const n of nodes) {
      try {
        const dest = typeof n.dest === "string" ? await doc.getDestination(n.dest) : (n.dest as unknown[] | null);
        if (dest && dest[0] !== undefined) {
          const ref = dest[0] as { num: number; gen: number } | number;
          const page = typeof ref === "number" ? ref : await doc.getPageIndex(ref);
          result.push({ title: n.title, page, level });
        }
      } catch {
        /* skip unresolvable bookmarks */
      }
      if (n.items?.length) await walk(n.items, level + 1);
    }
  };
  await walk(outline, 1);
  return result;
}

export async function splitByBookmarks(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const marks = await bookmarkPages(f.bytes);
  if (!marks.length) throw new ToolError("This PDF has no bookmarks to split by.");
  const level = Math.max(1, Math.round(num(o.level, 1)));
  const atLevel = marks.filter((m) => m.level <= level).sort((a, b) => a.page - b.page);
  const src = await loadPdf(f.bytes);
  const total = src.getPageCount();
  const startTitles = new Map<number, string>();
  for (const m of atLevel) if (!startTitles.has(m.page)) startTitles.set(m.page, m.title);
  const runs = runsFromStarts(total, [...startTitles.keys()]);
  return writeGroups(
    src,
    runs.map((r, i) => ({ pages: r, name: `${String(i + 1).padStart(2, "0")} ${safe(startTitles.get(r[0]) ?? (r[0] === 0 ? baseName(f.name) : `Part ${i + 1}`))}` })),
    ctx,
  );
}

/* ───────────── Split in half ───────────── */

export async function splitInHalf(files: InputFile[], o: Options): Promise<OutputFile[]> {
  const f = files[0];
  const src = await loadPdf(f.bytes);
  const out = await PDFDocument.create();
  const vertical = str(o.direction, "vertical") === "vertical"; // vertical cut → left/right halves
  const rtl = !!o.rightToLeft;
  const skip = new Set(o.exclude ? parsePageRanges(str(o.exclude), src.getPageCount()) : []);
  for (let i = 0; i < src.getPageCount(); i++) {
    if (skip.has(i)) {
      (await copyPagesKeepForms(out, src, [i])).forEach((p) => out.addPage(p));
      continue;
    }
    const halves: [number, number, number, number][] = vertical
      ? [
          [0, 0, 0.5, 1],
          [0.5, 0, 0.5, 1],
        ]
      : [
          [0, 0, 1, 0.5],
          [0, 0.5, 1, 0.5],
        ];
    if (rtl && vertical) halves.reverse();
    for (const h of halves) {
      const [copy] = await out.copyPages(src, [i]);
      out.addPage(copy);
      cropToVisibleFraction(copy, ...h);
      void normRotation;
    }
  }
  return [pdfOut(`${baseName(f.name)}-split`, await out.save(saveOpts()))];
}

/* ───────────── Split by size ───────────── */

export async function splitBySize(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const src = await loadPdf(f.bytes);
  const limit = num(o.maxMb, 5) * 1024 * 1024;
  if (limit <= 0) throw new ToolError("Enter a size greater than 0.");
  const total = src.getPageCount();
  const sizeOf = async (from: number, to: number) => {
    const d = await PDFDocument.create();
    (await copyPagesKeepForms(d, src, Array.from({ length: to - from }, (_, k) => from + k))).forEach((p) => d.addPage(p));
    return (await d.save(saveOpts())).length;
  };
  const groups: number[][] = [];
  let start = 0;
  while (start < total) {
    ctx.progress(`Measuring pages from ${start + 1}`, start / total);
    // Grow exponentially, then binary-search the largest run under the limit.
    let good = start + 1;
    let step = 1;
    let bad = -1;
    while (good + step <= total) {
      if ((await sizeOf(start, good + step)) <= limit) {
        good += step;
        step *= 2;
      } else {
        bad = good + step;
        break;
      }
    }
    if (bad === -1 && good < total) {
      if ((await sizeOf(start, total)) <= limit) good = total;
      else bad = total;
    }
    if (bad !== -1) {
      let lo = good, hi = bad;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if ((await sizeOf(start, mid)) <= limit) lo = mid;
        else hi = mid;
      }
      good = lo;
    }
    groups.push(Array.from({ length: good - start }, (_, k) => start + k));
    start = good;
    await tick();
  }
  if (groups.length < 2) throw new ToolError("The whole document is already smaller than that size.");
  const outs = await writeGroups(src, groups.map((g, i) => ({ pages: g, name: `${baseName(f.name)}-part-${i + 1}` })), ctx);
  const over = outs.filter((o, i) => o.bytes.length > limit && groups[i].length === 1).map((_, i) => i);
  outs.forEach((o, i) => {
    if (o.bytes.length > limit && groups[i].length === 1) ctx.note?.(`Page ${groups[i][0] + 1} is ${(o.bytes.length / 1048576).toFixed(1)} MB on its own, so its file is over the limit. Compress the PDF first to make it smaller.`);
  });
  void over;
  return outs;
}

/* ───────────── Split by text ───────────── */

export async function splitByText(files: InputFile[], o: Options, ctx: ToolContext): Promise<OutputFile[]> {
  const f = files[0];
  const needle = str(o.text).trim();
  if (!needle) throw new ToolError("Enter the text to look for.");
  const doc = await pdfjsFor(f.bytes);
  const caseSensitive = !!o.matchCase;
  const starts: number[] = [];
  const names = new Map<number, string>();
  for (let i = 0; i < doc.numPages; i++) {
    ctx.progress(`Searching page ${i + 1}`, i / doc.numPages);
    const content = await (await doc.getPage(i + 1)).getTextContent();
    const lines = linesFromItems(content.items as { str: string; transform: number[] }[]);
    const hit = lines.find((l) => (caseSensitive ? l.includes(needle) : l.toLowerCase().includes(needle.toLowerCase())));
    if (hit) {
      const start = o.position === "after" ? i + 1 : i;
      starts.push(start);
      names.set(start, hit);
    }
  }
  if (!starts.length) throw new ToolError(`“${needle}” wasn't found in the document.`);
  const src = await loadPdf(f.bytes);
  const runs = runsFromStarts(src.getPageCount(), starts);
  return writeGroups(
    src,
    runs.map((r, i) => ({ pages: r, name: `${String(i + 1).padStart(2, "0")} ${o.nameFromText && names.get(r[0]) ? safe(names.get(r[0])!) : `${baseName(f.name)}-part-${i + 1}`}` })),
    ctx,
  );
}

/** Joins PDF.js text items into lines (top to bottom). */
export function linesFromItems(items: { str: string; transform: number[]; hasEOL?: boolean }[]): string[] {
  const rows: { y: number; parts: { x: number; s: string }[] }[] = [];
  for (const it of items) {
    if (typeof it.str !== "string") continue;
    const y = it.transform[5];
    const x = it.transform[4];
    let row = rows.find((r) => Math.abs(r.y - y) < 3);
    if (!row) rows.push((row = { y, parts: [] }));
    row.parts.push({ x, s: it.str });
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((r) =>
      r.parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.s)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}
